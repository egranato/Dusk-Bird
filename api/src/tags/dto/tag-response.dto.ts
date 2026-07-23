import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TagResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  usageCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Only present for admins' })
  webhookUrl?: string | null;
}
