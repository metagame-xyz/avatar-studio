/*
  Warnings:

  - The `type` column on the `AchievementCategory` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "AchievementType" AS ENUM ('SPECIFIC_ACHIEVEMENT', 'LEVEL');

-- AlterTable
ALTER TABLE "AchievementCategory" ADD COLUMN     "airtableId" TEXT,
DROP COLUMN "type",
ADD COLUMN     "type" "AchievementType" NOT NULL DEFAULT 'SPECIFIC_ACHIEVEMENT';
