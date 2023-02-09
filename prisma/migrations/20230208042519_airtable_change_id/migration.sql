/*
  Warnings:

  - The primary key for the `AirtableProject` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `name` on the `AirtableProject` table. All the data in the column will be lost.
  - The `id` column on the `AirtableProject` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "AirtableProject" DROP CONSTRAINT "AirtableProject_pkey",
DROP COLUMN "name",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "AirtableProject_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "AirtableProject_id_key" ON "AirtableProject"("id");
