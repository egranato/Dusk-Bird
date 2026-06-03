import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTagRequests1700000000004 implements MigrationInterface {
  name = 'AddTagRequests1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE tag_requests (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name         VARCHAR(100) NOT NULL,
        slug         VARCHAR(100) NOT NULL,
        requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status       VARCHAR(10)  NOT NULL DEFAULT 'pending',
        created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_tag_requests_status ON tag_requests(status)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_tag_requests_status`);
    await queryRunner.query(`DROP TABLE tag_requests`);
  }
}
