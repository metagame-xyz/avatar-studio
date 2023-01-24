/*
  Warnings:

  - A unique constraint covering the columns `[testContractAddress]` on the table `Project` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `walletAddress` to the `NftMetadata` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Project" ADD COLUMN "network" TEXT DEFAULT 'ethereum';
ALTER TABLE "Project" ADD COLUMN "testContractAddress" TEXT;
ALTER TABLE "Project" ADD COLUMN "testNetwork" TEXT DEFAULT 'goerli';

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_NftMetadata" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "externalUrl" TEXT NOT NULL,
    "tokenId" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "walletAddress" TEXT NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'goerli',
    "userId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    CONSTRAINT "NftMetadata_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "NftMetadata_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_NftMetadata" ("description", "externalUrl", "id", "image", "name", "projectId", "timestamp", "tokenId", "userId") SELECT "description", "externalUrl", "id", "image", "name", "projectId", "timestamp", "tokenId", "userId" FROM "NftMetadata";
DROP TABLE "NftMetadata";
ALTER TABLE "new_NftMetadata" RENAME TO "NftMetadata";
CREATE UNIQUE INDEX "NftMetadata_id_key" ON "NftMetadata"("id");
CREATE UNIQUE INDEX "NftMetadata_tokenId_projectId_network_timestamp_key" ON "NftMetadata"("tokenId", "projectId", "network", "timestamp");
CREATE UNIQUE INDEX "NftMetadata_walletAddress_projectId_network_timestamp_key" ON "NftMetadata"("walletAddress", "projectId", "network", "timestamp");
CREATE UNIQUE INDEX "NftMetadata_userId_projectId_network_timestamp_key" ON "NftMetadata"("userId", "projectId", "network", "timestamp");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "Project_testContractAddress_key" ON "Project"("testContractAddress");
