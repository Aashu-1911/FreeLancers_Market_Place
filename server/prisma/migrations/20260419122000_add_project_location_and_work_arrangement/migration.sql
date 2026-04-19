ALTER TABLE "Project"
ADD COLUMN "work_mode" TEXT NOT NULL DEFAULT 'remote',
ADD COLUMN "engagement_type" TEXT NOT NULL DEFAULT 'full_time',
ADD COLUMN "address" TEXT,
ADD COLUMN "area" TEXT;
