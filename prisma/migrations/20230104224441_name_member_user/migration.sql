/*
  Warnings:

  - The primary key for the `MembersOfOrganizations` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MembersOfOrganizations" (
    "userId" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',

    PRIMARY KEY ("organizationId", "userId"),
    CONSTRAINT "MembersOfOrganizations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MembersOfOrganizations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MembersOfOrganizations" ("organizationId", "role", "userId") SELECT "organizationId", "role", "userId" FROM "MembersOfOrganizations";
DROP TABLE "MembersOfOrganizations";
ALTER TABLE "new_MembersOfOrganizations" RENAME TO "MembersOfOrganizations";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
