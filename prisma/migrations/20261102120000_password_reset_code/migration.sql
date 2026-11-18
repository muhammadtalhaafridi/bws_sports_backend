-- AlterTable
ALTER TABLE "users" ADD COLUMN "reset_attempts" INTEGER NOT NULL DEFAULT 0;

-- Old link tokens do not work with the new 6-digit code flow.
UPDATE "users" SET "reset_token" = NULL, "reset_token_expiry" = NULL;
