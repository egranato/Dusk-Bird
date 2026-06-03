import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/types/jwt-payload.type';
import { MediaService } from './media.service';
import { BrowseMediaDto } from './dto/browse-media.dto';
import { BulkDownloadDto } from './dto/bulk-download.dto';
import { AddTagsDto } from './dto/add-tags.dto';
import { Media } from './entities/media.entity';
import { PaginatedMediaResponseDto } from './dto/media-response.dto';

@ApiTags('media')
@ApiBearerAuth()
@Controller('media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload an image or video' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB
      storage: undefined, // use memory storage (buffer)
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ): Promise<Media> {
    return this.mediaService.upload(file, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Browse media with optional tag filtering' })
  browse(@Query() dto: BrowseMediaDto): Promise<PaginatedMediaResponseDto> {
    return this.mediaService.browse(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single media item by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Media> {
    return this.mediaService.findOne(id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download or serve a media file. Add ?thumbnail=true for the grid thumbnail.' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('thumbnail') thumbnail: string,
    @Res() res: Response,
  ): Promise<void> {
    return this.mediaService.download(id, thumbnail === 'true', res);
  }

  @Post('bulk-download')
  @ApiOperation({ summary: 'Bulk download as ZIP, optionally filtered by tags' })
  async bulkDownload(
    @Body() dto: BulkDownloadDto,
    @Res() res: Response,
  ): Promise<void> {
    return this.mediaService.bulkDownload(dto, res);
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
  ): Promise<Media> {
    return this.mediaService.removeTag(id, tagId);
  }
}
