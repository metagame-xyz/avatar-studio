/*
  Warnings:

  - A unique constraint covering the columns `[projectId,name]` on the table `AchievementCategory` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "AchievementCategory_projectId_name_key" ON "AchievementCategory"("projectId", "name");
