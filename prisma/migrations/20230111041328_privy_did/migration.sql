/*
  Warnings:

  - Added the required column `privyDID` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "privyDID" TEXT NOT NULL,
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
CREATE UNIQUE INDEX "User_privyDID_key" ON "User"("privyDID");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_address_key" ON "User"("address");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
