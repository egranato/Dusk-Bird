import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContentHash1700000000001 implements MigrationInterface {
  name = 'AddContentHash1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE media ADD COLUMN content_hash VARCHAR(64)`,
    );
    // Partial unique index — allows multiple NULLs (existing rows) but
    // enforces uniqueness among rows that do have a hash.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_media_content_hash"
       ON media (content_hash)
       WHERE content_hash IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_media_content_hash"`);
    await queryRunner.query(`ALTER TABLE media DROP COLUMN content_hash`);
  }
}
