-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('RUNNING', 'STOPPED', 'DONE');

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" UUID NOT NULL,
    "master" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "headers" JSONB NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "nextRow" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "status" "ImportStatus" NOT NULL DEFAULT 'RUNNING',
    "error" TEXT,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportSkippedRow" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "cells" JSONB NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "ImportSkippedRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportJob_master_fingerprint_idx" ON "ImportJob"("master", "fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "ImportSkippedRow_jobId_rowNumber_key" ON "ImportSkippedRow"("jobId", "rowNumber");

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportSkippedRow" ADD CONSTRAINT "ImportSkippedRow_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
