/*
  Warnings:

  - A unique constraint covering the columns `[projectId,airtableId]` on the table `AchievementCategory` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "AchievementCategory_projectId_airtableId_key" ON "AchievementCategory"("projectId", "airtableId");
