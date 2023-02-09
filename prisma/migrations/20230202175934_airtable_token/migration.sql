-- CreateTable
CREATE TABLE "OrganizationAirtableAuth" (
    "id" SERIAL NOT NULL,
    "scope" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "accessGrantedUserId" TEXT NOT NULL,

    CONSTRAINT "OrganizationAirtableAuth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationAirtableAuth_id_key" ON "OrganizationAirtableAuth"("id");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationAirtableAuth_organizationId_key" ON "OrganizationAirtableAuth"("organizationId");

-- AddForeignKey
ALTER TABLE "OrganizationAirtableAuth" ADD CONSTRAINT "OrganizationAirtableAuth_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationAirtableAuth" ADD CONSTRAINT "OrganizationAirtableAuth_accessGrantedUserId_fkey" FOREIGN KEY ("accessGrantedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
