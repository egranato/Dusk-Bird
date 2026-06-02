import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateTagDto {
  @ApiProperty({ example: 'Seaside' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;
}
