import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserLastLoginAt1700000000008 implements MigrationInterface {
  name = 'AddUserLastLoginAt1700000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN last_login_at`);
  }
}
