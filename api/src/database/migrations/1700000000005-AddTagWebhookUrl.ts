import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTagWebhookUrl1700000000005 implements MigrationInterface {
  name = 'AddTagWebhookUrl1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tags ADD COLUMN webhook_url TEXT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tags DROP COLUMN webhook_url`);
  }
}
