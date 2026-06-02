import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({ example: 'Beach' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;
}
