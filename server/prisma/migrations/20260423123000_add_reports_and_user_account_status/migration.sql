ALTER TABLE "User"
ADD COLUMN "account_status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN "suspended_reason" TEXT,
ADD COLUMN "suspended_at" TIMESTAMP(3);

CREATE TABLE "Report" (
    "report_id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "reporter_user_id" INTEGER NOT NULL,
    "reported_user_id" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "review_notes" TEXT,
    "reviewed_by_user_id" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("report_id")
);

CREATE UNIQUE INDEX "Report_contract_id_reporter_user_id_key" ON "Report"("contract_id", "reporter_user_id");
CREATE INDEX "Report_reported_user_id_status_idx" ON "Report"("reported_user_id", "status");
CREATE INDEX "Report_status_created_at_idx" ON "Report"("status", "created_at");

ALTER TABLE "Report" ADD CONSTRAINT "Report_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "Contract"("contract_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
