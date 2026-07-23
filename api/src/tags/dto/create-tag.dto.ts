import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { DISCORD_WEBHOOK_URL_REGEX } from './discord-webhook-url.regex';

export class CreateTagDto {
  @ApiProperty({ example: 'Beach' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description:
      'Discord webhook URL. When set, media tagged with this tag is posted to that channel.',
    example: 'https://discord.com/api/webhooks/123456789012345678/abcDEF-token',
  })
  @IsOptional()
  @IsString()
  @ValidateIf((_, value) => value !== '')
  @Matches(DISCORD_WEBHOOK_URL_REGEX, { message: 'Must be a valid Discord webhook URL' })
  webhookUrl?: string;
}
