/*
  Warnings:

  - A unique constraint covering the columns `[projectId,traitCategoryName,name]` on the table `Trait` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Trait_projectId_traitCategoryName_name_key" ON "Trait"("projectId", "traitCategoryName", "name");
