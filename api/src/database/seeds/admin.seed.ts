import 'reflect-metadata';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { AppDataSource } from '../data-source';

dotenv.config({ path: join(__dirname, '../../../..', '.env') });

async function seed() {
  await AppDataSource.initialize();

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_INITIAL_PASSWORD;

  if (!username || !password) {
    console.error('ADMIN_USERNAME and ADMIN_INITIAL_PASSWORD must be set in .env');
    process.exit(1);
  }

  const existing = await AppDataSource.query(
    `SELECT id FROM users WHERE username = $1`,
    [username],
  );

  if (existing.length > 0) {
    console.log(`Admin user "${username}" already exists — skipping.`);
    await AppDataSource.destroy();
    return;
  }

  const passwordHash = await argon2.hash(password);

  await AppDataSource.query(
    `INSERT INTO users (username, display_name, password_hash, role)
     VALUES ($1, 'Admin', $2, 'admin')`,
    [username, passwordHash],
  );

  console.log(`Admin user "${username}" created successfully.`);
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
