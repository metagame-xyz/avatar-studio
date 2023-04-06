/*
  Warnings:

  - The primary key for the `OrganizationInvitation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `role` column on the `OrganizationInvitation` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('ADMIN', 'OWNER');

-- AlterTable
ALTER TABLE "OrganizationInvitation" DROP CONSTRAINT "OrganizationInvitation_pkey",
DROP COLUMN "role",
ADD COLUMN     "role" "OrganizationRole" NOT NULL DEFAULT 'ADMIN',
ADD CONSTRAINT "OrganizationInvitation_pkey" PRIMARY KEY ("organizationId", "inviteeAddress", "role");
