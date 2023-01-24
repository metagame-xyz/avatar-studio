/*
  Warnings:

  - The primary key for the `AchievementTrait` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AchievementTrait" (
    "achievementId" INTEGER NOT NULL,
    "traitId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "traitCategoryName" TEXT NOT NULL,
    "traitName" TEXT NOT NULL,

    PRIMARY KEY ("projectId", "traitCategoryName", "traitName", "achievementId"),
    CONSTRAINT "AchievementTrait_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AchievementTrait_projectId_traitCategoryName_traitName_fkey" FOREIGN KEY ("projectId", "traitCategoryName", "traitName") REFERENCES "Trait" ("projectId", "traitCategoryName", "name") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AchievementTrait" ("achievementId", "projectId", "traitCategoryName", "traitId", "traitName") SELECT "achievementId", "projectId", "traitCategoryName", "traitId", "traitName" FROM "AchievementTrait";
DROP TABLE "AchievementTrait";
ALTER TABLE "new_AchievementTrait" RENAME TO "AchievementTrait";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
