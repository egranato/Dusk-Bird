import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddThumbnailKey1700000000002 implements MigrationInterface {
  name = 'AddThumbnailKey1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE media ADD COLUMN thumbnail_key TEXT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE media DROP COLUMN thumbnail_key`);
  }
}
