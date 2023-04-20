/*
  Warnings:

  - A unique constraint covering the columns `[achievementCategoryId,name]` on the table `Achievement` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Achievement_achievementCategoryId_name_key" ON "Achievement"("achievementCategoryId", "name");
