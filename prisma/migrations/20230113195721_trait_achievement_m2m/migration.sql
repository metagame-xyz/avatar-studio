/*
  Warnings:

  - You are about to drop the column `traitId` on the `Achievement` table. All the data in the column will be lost.
  - The primary key for the `Trait` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Trait` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "AchievementTrait" (
    "achievementId" INTEGER NOT NULL,
    "traitId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "traitCategoryName" TEXT NOT NULL,
    "traitName" TEXT NOT NULL,

    PRIMARY KEY ("achievementId", "traitId"),
    CONSTRAINT "AchievementTrait_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AchievementTrait_projectId_traitCategoryName_traitName_fkey" FOREIGN KEY ("projectId", "traitCategoryName", "traitName") REFERENCES "Trait" ("projectId", "traitCategoryName", "name") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Achievement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "level" INTEGER,
    "achievementCategoryId" INTEGER NOT NULL,
    CONSTRAINT "Achievement_achievementCategoryId_fkey" FOREIGN KEY ("achievementCategoryId") REFERENCES "AchievementCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Achievement" ("achievementCategoryId", "id", "level", "name") SELECT "achievementCategoryId", "id", "level", "name" FROM "Achievement";
DROP TABLE "Achievement";
ALTER TABLE "new_Achievement" RENAME TO "Achievement";
CREATE UNIQUE INDEX "Achievement_id_key" ON "Achievement"("id");
CREATE TABLE "new_Trait" (
    "name" TEXT NOT NULL,
    "pngUrl" TEXT NOT NULL,
    "defaultAchieved" BOOLEAN,
    "achievementsRequiredDescription" TEXT,
    "levelLogic" TEXT,
    "levelRequired" INTEGER,
    "projectId" INTEGER NOT NULL,
    "traitCategoryName" TEXT NOT NULL,
    "achievementCategoryId" INTEGER,

    PRIMARY KEY ("projectId", "traitCategoryName", "name"),
    CONSTRAINT "Trait_projectId_traitCategoryName_fkey" FOREIGN KEY ("projectId", "traitCategoryName") REFERENCES "TraitCategory" ("projectId", "name") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trait_achievementCategoryId_fkey" FOREIGN KEY ("achievementCategoryId") REFERENCES "AchievementCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Trait" ("achievementCategoryId", "achievementsRequiredDescription", "defaultAchieved", "levelLogic", "levelRequired", "name", "pngUrl", "projectId", "traitCategoryName") SELECT "achievementCategoryId", "achievementsRequiredDescription", "defaultAchieved", "levelLogic", "levelRequired", "name", "pngUrl", "projectId", "traitCategoryName" FROM "Trait";
DROP TABLE "Trait";
ALTER TABLE "new_Trait" RENAME TO "Trait";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
