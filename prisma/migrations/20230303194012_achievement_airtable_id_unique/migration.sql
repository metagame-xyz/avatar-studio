/*
  Warnings:

  - A unique constraint covering the columns `[airtableId]` on the table `Achievement` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Achievement_airtableId_key" ON "Achievement"("airtableId");
