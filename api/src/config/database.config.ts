import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  name: process.env.DB_NAME ?? 'duskbird',
  user: process.env.DB_USER ?? 'duskbird_user',
  password: process.env.DB_PASSWORD ?? '',
}));
