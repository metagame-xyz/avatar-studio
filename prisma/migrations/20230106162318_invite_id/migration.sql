/*
  Warnings:

  - The primary key for the `OrganizationInvitation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `OrganizationInvitation` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OrganizationInvitation" (
    "organizationId" INTEGER NOT NULL,
    "inviteeAddress" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "issuedById" TEXT NOT NULL,

    PRIMARY KEY ("organizationId", "inviteeAddress", "role"),
    CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrganizationInvitation_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_OrganizationInvitation" ("createdAt", "inviteeAddress", "issuedById", "organizationId", "role", "status", "updatedAt") SELECT "createdAt", "inviteeAddress", "issuedById", "organizationId", "role", "status", "updatedAt" FROM "OrganizationInvitation";
DROP TABLE "OrganizationInvitation";
ALTER TABLE "new_OrganizationInvitation" RENAME TO "OrganizationInvitation";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
