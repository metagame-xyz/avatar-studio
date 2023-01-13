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
    "traitCategoryId" INTEGER NOT NULL,
    "achievementCategoryId" INTEGER,
    CONSTRAINT "Trait_traitCategoryId_fkey" FOREIGN KEY ("traitCategoryId") REFERENCES "TraitCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trait_achievementCategoryId_fkey" FOREIGN KEY ("achievementCategoryId") REFERENCES "AchievementCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Trait" ("achievementCategoryId", "achievementsRequiredDescription", "defaultAchieved", "id", "levelLogic", "levelRequired", "name", "pngUrl", "traitCategoryId") SELECT "achievementCategoryId", "achievementsRequiredDescription", "defaultAchieved", "id", "levelLogic", "levelRequired", "name", "pngUrl", "traitCategoryId" FROM "Trait";
DROP TABLE "Trait";
ALTER TABLE "new_Trait" RENAME TO "Trait";
CREATE UNIQUE INDEX "Trait_id_key" ON "Trait"("id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
