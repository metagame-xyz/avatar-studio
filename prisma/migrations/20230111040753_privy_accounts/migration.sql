-- CreateTable
CREATE TABLE "PrivyAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT,
    "email" TEXT,
    "username" TEXT,
    "name" TEXT,
    "address" TEXT,
    "number" TEXT,
    "chainType" TEXT,
    "verifiedAt" DATETIME,
    CONSTRAINT "PrivyAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
