-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MembersOfProjects" (
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "userId" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,

    PRIMARY KEY ("userId", "projectSlug"),
    CONSTRAINT "MembersOfProjects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MembersOfProjects_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project" ("slug") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MembersOfProjects" ("projectSlug", "role", "userId") SELECT "projectSlug", "role", "userId" FROM "MembersOfProjects";
DROP TABLE "MembersOfProjects";
ALTER TABLE "new_MembersOfProjects" RENAME TO "MembersOfProjects";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
