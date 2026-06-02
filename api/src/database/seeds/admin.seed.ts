import 'reflect-metadata';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { AppDataSource } from '../data-source';

dotenv.config({ path: join(__dirname, '../../../..', '.env') });

async function seed() {
  await AppDataSource.initialize();

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_INITIAL_PASSWORD;

  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD must be set in .env');
    process.exit(1);
  }

  const existing = await AppDataSource.query(
    `SELECT id FROM users WHERE email = $1`,
    [email],
  );

  if (existing.length > 0) {
    console.log(`Admin user ${email} already exists — skipping.`);
    await AppDataSource.destroy();
    return;
  }

  const passwordHash = await argon2.hash(password);

  await AppDataSource.query(
    `INSERT INTO users (email, display_name, password_hash, role)
     VALUES ($1, 'Admin', $2, 'admin')`,
    [email, passwordHash],
  );

  console.log(`Admin user ${email} created successfully.`);
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
