import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET env var is required'); })(),
  expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
}));
