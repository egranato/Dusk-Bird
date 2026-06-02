import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class BulkDownloadDto {
  @ApiPropertyOptional({
    description: 'Tag slugs to filter by (AND logic). Omit to download everything.',
    type: [String],
    example: ['beach', 'summer'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
