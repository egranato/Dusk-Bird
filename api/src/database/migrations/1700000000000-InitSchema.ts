import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1700000000000 implements MigrationInterface {
  name = 'InitSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "user_role" AS ENUM ('admin', 'user')`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "email"         VARCHAR(255) NOT NULL,
        "display_name"  VARCHAR(100) NOT NULL,
        "password_hash" TEXT NOT NULL,
        "role"          "user_role" NOT NULL DEFAULT 'user',
        "is_active"     BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "media" (
        "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "uploader_id"  UUID NOT NULL,
        "object_key"   TEXT NOT NULL,
        "file_name"    TEXT NOT NULL,
        "mime_type"    VARCHAR(127),
        "size_bytes"   BIGINT NOT NULL DEFAULT 0,
        "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_media_object_key" UNIQUE ("object_key"),
        CONSTRAINT "FK_media_uploader" FOREIGN KEY ("uploader_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tags" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"        VARCHAR(100) NOT NULL,
        "slug"        VARCHAR(100) NOT NULL,
        "created_by"  UUID NOT NULL,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_tags_name" UNIQUE ("name"),
        CONSTRAINT "UQ_tags_slug" UNIQUE ("slug"),
        CONSTRAINT "FK_tags_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "media_tags" (
        "media_id"  UUID NOT NULL,
        "tag_id"    UUID NOT NULL,
        CONSTRAINT "PK_media_tags" PRIMARY KEY ("media_id", "tag_id"),
        CONSTRAINT "FK_media_tags_media" FOREIGN KEY ("media_id")
          REFERENCES "media"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_media_tags_tag" FOREIGN KEY ("tag_id")
          REFERENCES "tags"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_media_uploader" ON "media" ("uploader_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_media_tags_media" ON "media_tags" ("media_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_media_tags_tag" ON "media_tags" ("tag_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_media_tags_tag"`);
    await queryRunner.query(`DROP INDEX "IDX_media_tags_media"`);
    await queryRunner.query(`DROP INDEX "IDX_media_uploader"`);
    await queryRunner.query(`DROP TABLE "media_tags"`);
    await queryRunner.query(`DROP TABLE "tags"`);
    await queryRunner.query(`DROP TABLE "media"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "user_role"`);
  }
}
