import { registerAs } from '@nestjs/config';

export default registerAs('minio', () => ({
  endpoint: process.env.MINIO_ENDPOINT ?? 'localhost',
  port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ROOT_USER ?? '',
  secretKey: process.env.MINIO_ROOT_PASSWORD ?? '',
  bucket: process.env.MINIO_BUCKET ?? 'duskbird',
}));
