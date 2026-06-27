import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class BrowseMediaDto {
  @ApiPropertyOptional({ description: 'Comma-separated tag slugs to include', example: 'beach,summer' })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ description: 'Comma-separated tag slugs to exclude', example: 'draft,wip' })
  @IsOptional()
  @IsString()
  excludeTags?: string;

  @ApiPropertyOptional({ enum: ['and', 'or'], default: 'and' })
  @IsOptional()
  @IsIn(['and', 'or'])
  mode?: 'and' | 'or';

  @ApiPropertyOptional({ enum: ['newest', 'oldest', 'random'], default: 'newest' })
  @IsOptional()
  @IsIn(['newest', 'oldest', 'random'])
  sort?: 'newest' | 'oldest' | 'random';

  @ApiPropertyOptional({ description: 'Seed for deterministic random ordering' })
  @IsOptional()
  @IsString()
  seed?: string;

  @ApiPropertyOptional({ description: 'Only return items with this many tags or fewer', example: 2 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(0)
  maxTags?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
