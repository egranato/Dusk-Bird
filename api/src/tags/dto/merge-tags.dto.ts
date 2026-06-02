import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MergeTagsDto {
  @ApiProperty({ description: 'Tag to merge FROM (will be deleted)' })
  @IsUUID()
  sourceId: string;

  @ApiProperty({ description: 'Tag to merge INTO (kept)' })
  @IsUUID()
  targetId: string;
}
