/*
  Warnings:

  - You are about to drop the column `pngUrl` on the `Trait` table. All the data in the column will be lost.
  - Made the column `pngUrlMap` on table `Trait` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Trait" DROP COLUMN "pngUrl",
ALTER COLUMN "pngUrlMap" SET NOT NULL;
