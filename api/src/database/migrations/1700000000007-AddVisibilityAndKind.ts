import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVisibilityAndKind1700000000007 implements MigrationInterface {
  name = 'AddVisibilityAndKind1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Retroactive: every existing upload becomes private (uploader + admins only).
    await queryRunner.query(
      `ALTER TABLE media ADD COLUMN visibility VARCHAR(10) NOT NULL DEFAULT 'private'`,
    );
    // Safe backfill: every row that exists today is a photo/video.
    await queryRunner.query(`ALTER TABLE media ADD COLUMN kind VARCHAR(10) NOT NULL DEFAULT 'media'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE media DROP COLUMN kind`);
    await queryRunner.query(`ALTER TABLE media DROP COLUMN visibility`);
  }
}
