-- AlterTable
ALTER TABLE "Contract"
ADD COLUMN "contract_scope" TEXT NOT NULL DEFAULT 'full_project',
ADD COLUMN "task_description" TEXT;
