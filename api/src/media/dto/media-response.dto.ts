import { ApiProperty } from '@nestjs/swagger';
import { MediaKind, MediaVisibility } from '../entities/media.entity';

export class TagSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;
}

export class MediaResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  uploaderId: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  sizeBytes: number;

  @ApiProperty({ enum: MediaVisibility })
  visibility: MediaVisibility;

  @ApiProperty({ enum: MediaKind })
  kind: MediaKind;

  @ApiProperty({ type: [TagSummaryDto] })
  tags: TagSummaryDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedMediaResponseDto {
  @ApiProperty({ type: [MediaResponseDto] })
  data: MediaResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}
