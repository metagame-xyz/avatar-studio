/*
  Warnings:

  - You are about to drop the column `achievementId` on the `Requirement` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Requirement" DROP CONSTRAINT "Requirement_achievementId_fkey";

-- AlterTable
ALTER TABLE "Requirement" DROP COLUMN "achievementId";

-- CreateTable
CREATE TABLE "_AchievementToRequirement" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_AchievementToRequirement_AB_unique" ON "_AchievementToRequirement"("A", "B");

-- CreateIndex
CREATE INDEX "_AchievementToRequirement_B_index" ON "_AchievementToRequirement"("B");

-- AddForeignKey
ALTER TABLE "_AchievementToRequirement" ADD CONSTRAINT "_AchievementToRequirement_A_fkey" FOREIGN KEY ("A") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AchievementToRequirement" ADD CONSTRAINT "_AchievementToRequirement_B_fkey" FOREIGN KEY ("B") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
