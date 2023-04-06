-- DropForeignKey
ALTER TABLE "MemberAchievements" DROP CONSTRAINT "MemberAchievements_userId_fkey";

-- DropForeignKey
ALTER TABLE "MembersOfProjects" DROP CONSTRAINT "MembersOfProjects_userId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationInvitation" DROP CONSTRAINT "OrganizationInvitation_organizationId_fkey";

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembersOfProjects" ADD CONSTRAINT "MembersOfProjects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberAchievements" ADD CONSTRAINT "MemberAchievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
