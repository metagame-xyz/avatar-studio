/*
  Warnings:

  - You are about to drop the column `privyDID` on the `User` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "address" TEXT,
    "role" TEXT
);
INSERT INTO "new_User" ("address", "email", "emailVerified", "firstName", "id", "image", "lastName", "role") SELECT "address", "email", "emailVerified", "firstName", "id", "image", "lastName", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_address_key" ON "User"("address");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
