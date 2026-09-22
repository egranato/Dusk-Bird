import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveTagWebhookUrl1700000000006 implements MigrationInterface {
  name = 'RemoveTagWebhookUrl1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tags DROP COLUMN webhook_url`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tags ADD COLUMN webhook_url TEXT NULL`);
  }
}
