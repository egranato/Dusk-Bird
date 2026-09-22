import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/types/jwt-payload.type';
import { MediaService } from './media.service';
import { BrowseMediaDto } from './dto/browse-media.dto';
import { BulkDownloadDto } from './dto/bulk-download.dto';
import { AddTagsDto } from './dto/add-tags.dto';
import { SetVisibilityDto } from './dto/set-visibility.dto';
import { Media, MediaVisibility } from './entities/media.entity';
import { PaginatedMediaResponseDto } from './dto/media-response.dto';

// A single ceiling covers both media and the Files section — nobody uploads a 20GB
// photo, so there's no benefit to branching the limit by content kind.
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024 * 1024; // 20 GB
const UPLOAD_TMP_DIR = process.env.UPLOAD_TMP_DIR || tmpdir();

@ApiTags('media')
@ApiBearerAuth()
@Controller('media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file. Photos/videos get thumbnails; anything else lands in Files.' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES },
      storage: diskStorage({
        destination: UPLOAD_TMP_DIR,
        filename: (_req, file, cb) => cb(null, `${uuidv4()}${extname(file.originalname)}`),
      }),
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
    @Body('visibility') visibility?: MediaVisibility,
  ): Promise<Media> {
    return this.mediaService.upload(
      file,
      user.sub,
      visibility === MediaVisibility.Public ? MediaVisibility.Public : MediaVisibility.Private,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Browse media with optional tag filtering' })
  browse(@Query() dto: BrowseMediaDto, @CurrentUser() user: JwtPayload): Promise<PaginatedMediaResponseDto> {
    return this.mediaService.browse(dto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single media item by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload): Promise<Media> {
    return this.mediaService.findOne(id, user);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download or serve a media file. Add ?thumbnail=true for the grid thumbnail.' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('thumbnail') thumbnail: string,
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.mediaService.download(id, thumbnail === 'true', req, res, user);
  }

  @Post('bulk-download')
  @ApiOperation({ summary: 'Bulk download as ZIP, optionally filtered by tags' })
  async bulkDownload(
    @Body() dto: BulkDownloadDto,
    @Res() res: Response,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.mediaService.bulkDownload(dto, res, user);
  }

  @Patch(':id/visibility')
  @ApiOperation({ summary: 'Set who can see a media item: uploader + admins only, or everyone (owner or admin)' })
  setVisibility(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetVisibilityDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Media> {
    return this.mediaService.setVisibility(id, dto.visibility, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a media item (owner or admin)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.mediaService.remove(id, user);
  }

  @Post(':id/tags')
  @ApiOperation({ summary: 'Add tags to a media item (creates tags if they do not exist)' })
  addTags(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddTagsDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Media> {
    return this.mediaService.addTags(id, dto.tagNames, user.sub, user.role === 'admin');
  }

  @Delete(':id/tags/:tagId')
  @ApiOperation({ summary: 'Remove a tag from a media item' })
  removeTag(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<Media> {
    return this.mediaService.removeTag(id, tagId, user);
  }
}
