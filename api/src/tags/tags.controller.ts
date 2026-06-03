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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtPayload } from '../common/types/jwt-payload.type';
import { Role } from '../common/types/role.enum';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { MergeTagsDto } from './dto/merge-tags.dto';
import { Tag } from './entities/tag.entity';
import { TagRequest } from './entities/tag-request.entity';
import { TagResponseDto } from './dto/tag-response.dto';

@ApiTags('tags')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('tags')
export class TagsController {
  constructor(private tagsService: TagsService) {}

  @Get()
  @ApiOperation({ summary: 'List all tags with usage count' })
  findAll(): Promise<TagResponseDto[]> {
    return this.tagsService.findAll();
  }

  @Post()
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Create a new tag (admin only)' })
  create(@Body() dto: CreateTagDto, @CurrentUser() user: JwtPayload): Promise<Tag> {
    return this.tagsService.create(dto, user.sub);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Rename a tag (admin only)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTagDto): Promise<Tag> {
    return this.tagsService.update(id, dto);
  }

  @Post('merge')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Merge sourceId into targetId — source is deleted (admin only)' })
  merge(@Body() dto: MergeTagsDto): Promise<void> {
    return this.tagsService.merge(dto);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tag (admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.tagsService.remove(id);
  }

  // ── Tag requests ────────────────────────────────────────────────────────────

  @Post('requests')
  @ApiOperation({ summary: 'Request a new tag to be added by an admin' })
  createRequest(
    @Body() dto: CreateTagDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TagRequest> {
    return this.tagsService.createRequest(dto.name, user.sub);
  }

  @Get('requests')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'List pending tag requests (admin only)' })
  listRequests(): Promise<TagRequest[]> {
    return this.tagsService.listRequests();
  }

  @Post('requests/:id/approve')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Approve a tag request — creates the tag (admin only)' })
  approveRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.tagsService.resolveRequest(id, 'approve', user.sub);
  }

  @Post('requests/:id/deny')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deny a tag request (admin only)' })
  denyRequest(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.tagsService.resolveRequest(id, 'deny', '');
  }
}
