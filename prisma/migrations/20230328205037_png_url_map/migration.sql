/*
  Warnings:

  - Added the required column `pngUrlMap` to the `Trait` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Trait" ADD COLUMN     "pngUrlMap" JSONB NOT NULL,
ALTER COLUMN "pngUrl" DROP NOT NULL;
