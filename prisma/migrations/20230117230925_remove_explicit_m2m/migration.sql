/*
  Warnings:

  - You are about to drop the `AchievementTrait` table. If the table is not empty, all the data it contains will be lost.
  - The primary key for the `Trait` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `id` to the `Trait` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AchievementTrait";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "NftMetadata" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "externalUrl" TEXT NOT NULL,
    "tokenId" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    CONSTRAINT "NftMetadata_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "NftMetadata_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_AchievementToTrait" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_AchievementToTrait_A_fkey" FOREIGN KEY ("A") REFERENCES "Achievement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_AchievementToTrait_B_fkey" FOREIGN KEY ("B") REFERENCES "Trait" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_NftMetadataToTrait" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_NftMetadataToTrait_A_fkey" FOREIGN KEY ("A") REFERENCES "NftMetadata" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_NftMetadataToTrait_B_fkey" FOREIGN KEY ("B") REFERENCES "Trait" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trait" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "pngUrl" TEXT NOT NULL,
    "isDefaultAchieved" BOOLEAN,
    "achievementsRequiredDescription" TEXT,
    "levelLogic" TEXT,
    "levelRequired" INTEGER,
    "projectId" INTEGER NOT NULL,
    "traitCategoryName" TEXT NOT NULL,
    "achievementCategoryId" INTEGER,
    CONSTRAINT "Trait_projectId_traitCategoryName_fkey" FOREIGN KEY ("projectId", "traitCategoryName") REFERENCES "TraitCategory" ("projectId", "name") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Trait_achievementCategoryId_fkey" FOREIGN KEY ("achievementCategoryId") REFERENCES "AchievementCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Trait" ("achievementCategoryId", "achievementsRequiredDescription", "isDefaultAchieved", "levelLogic", "levelRequired", "name", "pngUrl", "projectId", "traitCategoryName") SELECT "achievementCategoryId", "achievementsRequiredDescription", "isDefaultAchieved", "levelLogic", "levelRequired", "name", "pngUrl", "projectId", "traitCategoryName" FROM "Trait";
DROP TABLE "Trait";
ALTER TABLE "new_Trait" RENAME TO "Trait";
CREATE UNIQUE INDEX "Trait_id_key" ON "Trait"("id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "NftMetadata_id_key" ON "NftMetadata"("id");

-- CreateIndex
CREATE UNIQUE INDEX "_AchievementToTrait_AB_unique" ON "_AchievementToTrait"("A", "B");

-- CreateIndex
CREATE INDEX "_AchievementToTrait_B_index" ON "_AchievementToTrait"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_NftMetadataToTrait_AB_unique" ON "_NftMetadataToTrait"("A", "B");

-- CreateIndex
CREATE INDEX "_NftMetadataToTrait_B_index" ON "_NftMetadataToTrait"("B");
