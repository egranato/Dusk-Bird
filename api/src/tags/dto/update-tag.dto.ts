import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateTagDto {
  @ApiPropertyOptional({ example: 'Seaside' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;
}
