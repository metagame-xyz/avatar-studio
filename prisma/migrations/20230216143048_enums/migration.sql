/*
  Warnings:

  - The `role` column on the `MembersOfOrganizations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `MembersOfProjects` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `OrganizationInvitation` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `levelLogic` column on the `Trait` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "LevelLogic" AS ENUM ('MORE_THAN_OR_EQUAL_TO', 'LESS_THAN_OR_EQUAL_TO');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'REVOKED');

-- AlterTable
ALTER TABLE "MembersOfOrganizations" DROP COLUMN "role",
ADD COLUMN     "role" "OrganizationRole" NOT NULL DEFAULT 'ADMIN';

-- AlterTable
ALTER TABLE "MembersOfProjects" DROP COLUMN "role",
ADD COLUMN     "role" "ProjectRole" NOT NULL DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "OrganizationInvitation" DROP COLUMN "status",
ADD COLUMN     "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Trait" DROP COLUMN "levelLogic",
ADD COLUMN     "levelLogic" "LevelLogic";
