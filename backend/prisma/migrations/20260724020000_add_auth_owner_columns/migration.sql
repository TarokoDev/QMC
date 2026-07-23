-- Per-user data scoping (migration A: nullable columns; backfilled by seed.ts,
-- then a follow-up migration flips these to NOT NULL). See CLAUDE.md "Environments".

ALTER TABLE "folders" ADD COLUMN "owner_id" TEXT;
CREATE INDEX "folders_owner_id_idx" ON "folders"("owner_id");

ALTER TABLE "master_template" ADD COLUMN "owner_id" TEXT;
CREATE UNIQUE INDEX "master_template_owner_id_key" ON "master_template"("owner_id");

ALTER TABLE "users" ADD COLUMN "auth_user_id" TEXT;
CREATE UNIQUE INDEX "users_auth_user_id_key" ON "users"("auth_user_id");
