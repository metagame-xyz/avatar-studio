/*
  Warnings:

  - You are about to drop the column `traitCategoryId` on the `Trait` table. All the data in the column will be lost.
  - The primary key for the `TraitCategory` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `TraitCategory` table. All the data in the column will be lost.
  - Added the required column `projectId` to the `Trait` table without a default value. This is not possible if the table is not empty.
  - Added the required column `traitCategoryName` to the `Trait` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trait" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "pngUrl" TEXT NOT NULL,
    "defaultAchieved" BOOLEAN,
    "achievementsRequiredDescription" TEXT,
    "levelLogic" TEXT,
    "levelRequired" INTEGER,
    "projectId" INTEGER NOT NULL,
    "traitCategoryName" TEXT NOT NULL,
    "achievementCategoryId" INTEGER,
    CONSTRAINT "Trait_projectId_traitCategoryName_fkey" FOREIGN KEY ("projectId", "traitCategoryName") REFERENCES "TraitCategory" ("projectId", "name") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trait_achievementCategoryId_fkey" FOREIGN KEY ("achievementCategoryId") REFERENCES "AchievementCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Trait" ("achievementCategoryId", "achievementsRequiredDescription", "defaultAchieved", "id", "levelLogic", "levelRequired", "name", "pngUrl") SELECT "achievementCategoryId", "achievementsRequiredDescription", "defaultAchieved", "id", "levelLogic", "levelRequired", "name", "pngUrl" FROM "Trait";
DROP TABLE "Trait";
ALTER TABLE "new_Trait" RENAME TO "Trait";
CREATE UNIQUE INDEX "Trait_id_key" ON "Trait"("id");
CREATE TABLE "new_TraitCategory" (
    "name" TEXT NOT NULL,
    "zIndex" INTEGER NOT NULL,
    "modifiable" BOOLEAN NOT NULL DEFAULT true,
    "defaultAchieved" BOOLEAN NOT NULL DEFAULT false,
    "projectId" INTEGER NOT NULL,

    PRIMARY KEY ("projectId", "name"),
    CONSTRAINT "TraitCategory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TraitCategory" ("defaultAchieved", "modifiable", "name", "projectId", "zIndex") SELECT "defaultAchieved", "modifiable", "name", "projectId", "zIndex" FROM "TraitCategory";
DROP TABLE "TraitCategory";
ALTER TABLE "new_TraitCategory" RENAME TO "TraitCategory";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
