/*
  Warnings:

  - Added the required column `privyDID` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT,
    "email" TEXT,
    "username" TEXT,
    "name" TEXT,
    "address" TEXT,
    "number" TEXT,
    "chainType" TEXT,
    "verifiedAt" DATETIME,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("privyDID") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Account" ("address", "chainType", "email", "id", "name", "number", "subject", "type", "userId", "username", "verifiedAt") SELECT "address", "chainType", "email", "id", "name", "number", "subject", "type", "userId", "username", "verifiedAt" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "privyDID" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "image" TEXT,
    "address" TEXT,
    "role" TEXT
);
INSERT INTO "new_User" ("address", "email", "firstName", "id", "image", "lastName", "role") SELECT "address", "email", "firstName", "id", "image", "lastName", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_privyDID_key" ON "User"("privyDID");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_address_key" ON "User"("address");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
