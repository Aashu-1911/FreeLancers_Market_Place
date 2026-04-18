-- AlterTable
ALTER TABLE "Project"
ADD COLUMN "tech_stack" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "ProjectSkill" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "skill_id" INTEGER NOT NULL,

    CONSTRAINT "ProjectSkill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSkill_project_id_skill_id_key" ON "ProjectSkill"("project_id", "skill_id");

-- AddForeignKey
ALTER TABLE "ProjectSkill" ADD CONSTRAINT "ProjectSkill_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSkill" ADD CONSTRAINT "ProjectSkill_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "Skill"("skill_id") ON DELETE CASCADE ON UPDATE CASCADE;
