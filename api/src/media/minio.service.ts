import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { Readable } from 'stream';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly client: Minio.Client;
  private readonly bucket: string;

  constructor(private config: ConfigService) {
    this.client = new Minio.Client({
      endPoint: config.get<string>('minio.endpoint') ?? 'localhost',
      port: config.get<number>('minio.port') ?? 9000,
      useSSL: config.get<boolean>('minio.useSSL') ?? false,
      accessKey: config.get<string>('minio.accessKey') ?? '',
      secretKey: config.get<string>('minio.secretKey') ?? '',
    });
    this.bucket = config.get<string>('minio.bucket') ?? 'duskbird';
  }

  async onModuleInit() {
    await this.ensureBucket();
  }

  private async ensureBucket() {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
      this.logger.log(`Created bucket: ${this.bucket}`);
    }
  }

  async putObject(
    key: string,
    stream: Readable,
    size: number,
    mimeType: string,
  ): Promise<void> {
    await this.client.putObject(this.bucket, key, stream, size, {
      'Content-Type': mimeType,
    });
  }

  getObject(key: string): Promise<Readable> {
    return this.client.getObject(this.bucket, key);
  }

  async removeObject(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }

  async removeObjects(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.client.removeObjects(this.bucket, keys);
  }
}
