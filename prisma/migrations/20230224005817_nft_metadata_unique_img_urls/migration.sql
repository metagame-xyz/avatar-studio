/*
  Warnings:

  - A unique constraint covering the columns `[image]` on the table `NftMetadata` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "NftMetadata_image_key" ON "NftMetadata"("image");
