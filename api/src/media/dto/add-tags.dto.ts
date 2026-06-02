import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, MaxLength, MinLength } from 'class-validator';

export class AddTagsDto {
  @ApiProperty({
    description: 'Tag names to apply. Tags that do not exist will be created.',
    type: [String],
    example: ['Beach', 'Summer 2024'],
  })
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(100, { each: true })
  tagNames: string[];
}
