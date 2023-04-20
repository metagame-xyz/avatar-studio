-- CreateEnum
CREATE TYPE "RequirementLogic" AS ENUM ('OR', 'AND');

-- CreateEnum
CREATE TYPE "RequirementAction" AS ENUM ('OWN', 'MINTED', 'CUSTOM_METHOD_CALLED');

-- AlterTable
ALTER TABLE "Achievement" ADD COLUMN     "requirementLogic" "RequirementLogic" DEFAULT 'AND';

-- CreateTable
CREATE TABLE "Requirement" (
    "id" SERIAL NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "action" "RequirementAction" NOT NULL,
    "achievementId" INTEGER NOT NULL,

    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Requirement_id_key" ON "Requirement"("id");

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
