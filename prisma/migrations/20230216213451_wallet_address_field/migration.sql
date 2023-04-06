/*
  Warnings:

  - Added the required column `walletAddressFieldId` to the `AirtableProject` table without a default value. This is not possible if the table is not empty.
  - Added the required column `walletAddressFieldName` to the `AirtableProject` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AirtableProject" ADD COLUMN     "walletAddressFieldId" TEXT NOT NULL,
ADD COLUMN     "walletAddressFieldName" TEXT NOT NULL;
