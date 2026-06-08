-- CreateEnum
CREATE TYPE "StreamStatus" AS ENUM ('NOT_CONFIGURED', 'READY', 'RECEIVING_SIGNAL', 'OFFLINE');

-- CreateTable
CREATE TABLE "StreamSetting" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ingestServerUrl" TEXT NOT NULL DEFAULT 'rtmp://live.opspilot.dev/live',
    "streamKey" TEXT NOT NULL,
    "streamStatus" "StreamStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "recordingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lowLatencyMode" BOOLEAN NOT NULL DEFAULT false,
    "speakerTestCompleted" BOOLEAN NOT NULL DEFAULT false,
    "networkCheckCompleted" BOOLEAN NOT NULL DEFAULT false,
    "backupStreamEnabled" BOOLEAN NOT NULL DEFAULT false,
    "viewerUrl" TEXT,
    "mobileViewerUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StreamSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StreamSetting_eventId_key" ON "StreamSetting"("eventId");

-- CreateIndex
CREATE INDEX "StreamSetting_streamStatus_idx" ON "StreamSetting"("streamStatus");

-- AddForeignKey
ALTER TABLE "StreamSetting" ADD CONSTRAINT "StreamSetting_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
