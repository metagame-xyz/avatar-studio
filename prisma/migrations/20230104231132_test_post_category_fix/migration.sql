/*
  Warnings:

  - The primary key for the `CategoriesOnPosts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `id` to the `CategoriesOnPosts` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CategoriesOnPosts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "postId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,
    CONSTRAINT "CategoriesOnPosts_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CategoriesOnPosts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CategoriesOnPosts" ("assignedAt", "assignedBy", "categoryId", "postId") SELECT "assignedAt", "assignedBy", "categoryId", "postId" FROM "CategoriesOnPosts";
DROP TABLE "CategoriesOnPosts";
ALTER TABLE "new_CategoriesOnPosts" RENAME TO "CategoriesOnPosts";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
