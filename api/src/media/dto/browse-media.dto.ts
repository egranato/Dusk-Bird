import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class BrowseMediaDto {
  @ApiPropertyOptional({ description: 'Comma-separated tag slugs', example: 'beach,summer' })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ enum: ['and', 'or'], default: 'and' })
  @IsOptional()
  @IsIn(['and', 'or'])
  mode?: 'and' | 'or';

  @ApiPropertyOptional({ enum: ['newest', 'random'], default: 'newest' })
  @IsOptional()
  @IsIn(['newest', 'random'])
  sort?: 'newest' | 'random';

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
