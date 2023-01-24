/*
  Warnings:

  - The primary key for the `MembersOfProjects` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `projectId` on the `MembersOfProjects` table. All the data in the column will be lost.
  - Added the required column `projectSlug` to the `MembersOfProjects` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MembersOfProjects" (
    "role" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectSlug" INTEGER NOT NULL,

    PRIMARY KEY ("userId", "projectSlug"),
    CONSTRAINT "MembersOfProjects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MembersOfProjects_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MembersOfProjects" ("role", "userId") SELECT "role", "userId" FROM "MembersOfProjects";
DROP TABLE "MembersOfProjects";
ALTER TABLE "new_MembersOfProjects" RENAME TO "MembersOfProjects";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
