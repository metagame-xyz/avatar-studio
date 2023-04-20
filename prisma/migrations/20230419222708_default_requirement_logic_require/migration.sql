/*
  Warnings:

  - Made the column `requirementLogic` on table `Achievement` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Achievement" ALTER COLUMN "requirementLogic" SET NOT NULL;
