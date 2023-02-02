/*
  Warnings:

  - You are about to drop the column `organizationId` on the `OrganizationAirtableAuth` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[organizationSlug]` on the table `OrganizationAirtableAuth` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `organizationSlug` to the `OrganizationAirtableAuth` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "OrganizationAirtableAuth" DROP CONSTRAINT "OrganizationAirtableAuth_organizationId_fkey";

-- DropIndex
DROP INDEX "OrganizationAirtableAuth_organizationId_key";

-- AlterTable
ALTER TABLE "OrganizationAirtableAuth" DROP COLUMN "organizationId",
ADD COLUMN     "organizationSlug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationAirtableAuth_organizationSlug_key" ON "OrganizationAirtableAuth"("organizationSlug");

-- AddForeignKey
ALTER TABLE "OrganizationAirtableAuth" ADD CONSTRAINT "OrganizationAirtableAuth_organizationSlug_fkey" FOREIGN KEY ("organizationSlug") REFERENCES "Organization"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
