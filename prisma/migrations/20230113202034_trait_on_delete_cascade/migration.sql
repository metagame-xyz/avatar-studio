-- RedefineTables
PRAGMA foreign_keys=OFF;
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
    CONSTRAINT "Trait_projectId_traitCategoryName_fkey" FOREIGN KEY ("projectId", "traitCategoryName") REFERENCES "TraitCategory" ("projectId", "name") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Trait_achievementCategoryId_fkey" FOREIGN KEY ("achievementCategoryId") REFERENCES "AchievementCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Trait" ("achievementCategoryId", "achievementsRequiredDescription", "defaultAchieved", "levelLogic", "levelRequired", "name", "pngUrl", "projectId", "traitCategoryName") SELECT "achievementCategoryId", "achievementsRequiredDescription", "defaultAchieved", "levelLogic", "levelRequired", "name", "pngUrl", "projectId", "traitCategoryName" FROM "Trait";
DROP TABLE "Trait";
ALTER TABLE "new_Trait" RENAME TO "Trait";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
