import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmailToUsername1700000000003 implements MigrationInterface {
  name = 'EmailToUsername1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users RENAME COLUMN email TO username`);
    await queryRunner.query(
      `ALTER TABLE users RENAME CONSTRAINT "UQ_users_email" TO "UQ_users_username"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users RENAME CONSTRAINT "UQ_users_username" TO "UQ_users_email"`,
    );
    await queryRunner.query(`ALTER TABLE users RENAME COLUMN username TO email`);
  }
}
