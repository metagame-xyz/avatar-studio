-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_NftMetadata" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "description" TEXT NOT NULL,
    "externalUrl" TEXT,
    "tokenId" INTEGER,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "walletAddress" TEXT NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'goerli',
    "userId" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    CONSTRAINT "NftMetadata_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "NftMetadata_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project" ("slug") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_NftMetadata" ("description", "externalUrl", "id", "image", "name", "network", "projectSlug", "timestamp", "tokenId", "userId", "walletAddress") SELECT "description", "externalUrl", "id", "image", "name", "network", "projectSlug", "timestamp", "tokenId", "userId", "walletAddress" FROM "NftMetadata";
DROP TABLE "NftMetadata";
ALTER TABLE "new_NftMetadata" RENAME TO "NftMetadata";
CREATE UNIQUE INDEX "NftMetadata_id_key" ON "NftMetadata"("id");
CREATE UNIQUE INDEX "NftMetadata_tokenId_projectSlug_network_timestamp_key" ON "NftMetadata"("tokenId", "projectSlug", "network", "timestamp");
CREATE UNIQUE INDEX "NftMetadata_walletAddress_projectSlug_network_timestamp_key" ON "NftMetadata"("walletAddress", "projectSlug", "network", "timestamp");
CREATE UNIQUE INDEX "NftMetadata_userId_projectSlug_network_timestamp_key" ON "NftMetadata"("userId", "projectSlug", "network", "timestamp");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
