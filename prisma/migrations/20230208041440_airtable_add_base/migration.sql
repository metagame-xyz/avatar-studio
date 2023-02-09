-- CreateTable
CREATE TABLE "AirtableProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "baseId" TEXT NOT NULL,
    "baseName" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,

    CONSTRAINT "AirtableProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AirtableProject_id_key" ON "AirtableProject"("id");

-- CreateIndex
CREATE UNIQUE INDEX "AirtableProject_projectId_key" ON "AirtableProject"("projectId");

-- AddForeignKey
ALTER TABLE "AirtableProject" ADD CONSTRAINT "AirtableProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
