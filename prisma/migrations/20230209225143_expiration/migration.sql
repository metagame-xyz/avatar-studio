/*
  Warnings:

  - Added the required column `accessTokenExpiration` to the `OrganizationAirtableAuth` table without a default value. This is not possible if the table is not empty.
  - Added the required column `refreshTokenExpiration` to the `OrganizationAirtableAuth` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OrganizationAirtableAuth" ADD COLUMN     "accessTokenExpiration" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "refreshTokenExpiration" TIMESTAMP(3) NOT NULL;
