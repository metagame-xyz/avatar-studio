-- AlterTable
ALTER TABLE "Trait" ADD COLUMN     "pngUrlMap" JSONB,
ALTER COLUMN "pngUrl" DROP NOT NULL;
