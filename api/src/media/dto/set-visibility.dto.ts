import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { MediaVisibility } from '../entities/media.entity';

export class SetVisibilityDto {
  @ApiProperty({ enum: MediaVisibility })
  @IsIn(Object.values(MediaVisibility))
  visibility: MediaVisibility;
}
