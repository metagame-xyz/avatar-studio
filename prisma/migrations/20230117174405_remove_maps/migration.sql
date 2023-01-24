/*
  Warnings:

  - You are about to drop the column `defaultAchieved` on the `TraitCategory` table. All the data in the column will be lost.
  - You are about to drop the column `modifiable` on the `TraitCategory` table. All the data in the column will be lost.
  - You are about to drop the column `defaultAchieved` on the `Trait` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TraitCategory" (
    "name" TEXT NOT NULL,
    "zIndex" INTEGER NOT NULL,
    "isModifiable" BOOLEAN NOT NULL DEFAULT true,
    "isDefaultAchieved" BOOLEAN NOT NULL DEFAULT false,
    "projectId" INTEGER NOT NULL,

    PRIMARY KEY ("projectId", "name"),
    CONSTRAINT "TraitCategory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TraitCategory" ("name", "projectId", "zIndex") SELECT "name", "projectId", "zIndex" FROM "TraitCategory";
DROP TABLE "TraitCategory";
ALTER TABLE "new_TraitCategory" RENAME TO "TraitCategory";
CREATE TABLE "new_Trait" (
    "name" TEXT NOT NULL,
    "pngUrl" TEXT NOT NULL,
    "isDefaultAchieved" BOOLEAN,
    "achievementsRequiredDescription" TEXT,
    "levelLogic" TEXT,
    "levelRequired" INTEGER,
    "projectId" INTEGER NOT NULL,
    "traitCategoryName" TEXT NOT NULL,
    "achievementCategoryId" INTEGER,

    PRIMARY KEY ("projectId", "traitCategoryName", "name"),
    CONSTRAINT "Trait_projectId_traitCategoryName_fkey" FOREIGN KEY ("projectId", "traitCategoryName") REFERENCES "TraitCategory" ("projectId", "name") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Trait_achievementCategoryId_fkey" FOREIGN KEY ("achievementCategoryId") REFERENCES "AchievementCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Trait" ("achievementCategoryId", "achievementsRequiredDescription", "levelLogic", "levelRequired", "name", "pngUrl", "projectId", "traitCategoryName") SELECT "achievementCategoryId", "achievementsRequiredDescription", "levelLogic", "levelRequired", "name", "pngUrl", "projectId", "traitCategoryName" FROM "Trait";
DROP TABLE "Trait";
ALTER TABLE "new_Trait" RENAME TO "Trait";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
