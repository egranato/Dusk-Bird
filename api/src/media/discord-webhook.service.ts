import { Injectable, Logger } from '@nestjs/common';

// Base upload limit that applies to every Discord server regardless of boost level.
export const MAX_DISCORD_UPLOAD_BYTES = 25 * 1024 * 1024;

@Injectable()
export class DiscordWebhookService {
  private readonly logger = new Logger(DiscordWebhookService.name);

  // Uploads the file directly to the webhook so Discord hosts/renders the preview —
  // a plain link would be useless since every media route sits behind our JWT guard.
  async postImage(
    webhookUrl: string,
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    content: string,
  ): Promise<void> {
    try {
      const form = new FormData();
      form.append('content', content);
      form.append(
        'file',
        new Blob([new Uint8Array(buffer)], { type: mimeType || 'application/octet-stream' }),
        fileName,
      );

      const res = await fetch(webhookUrl, { method: 'POST', body: form });
      if (!res.ok) {
        this.logger.warn(`Discord webhook post failed (${res.status}): ${await res.text()}`);
      }
    } catch (err) {
      this.logger.warn(`Discord webhook post error: ${(err as Error).message}`);
    }
  }
}
