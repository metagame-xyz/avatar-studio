-- CreateTable
CREATE TABLE "Lock" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,

    CONSTRAINT "Lock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lock_id_key" ON "Lock"("id");
