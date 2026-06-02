import { ApiProperty } from '@nestjs/swagger';

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
}
