-- AlterTable
ALTER TABLE "User"
ADD COLUMN "username" TEXT;

-- Backfill existing users with deterministic unique usernames
UPDATE "User"
SET "username" = CONCAT('user', "user_id")
WHERE "username" IS NULL;

-- AlterColumn
ALTER TABLE "User"
ALTER COLUMN "username" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
