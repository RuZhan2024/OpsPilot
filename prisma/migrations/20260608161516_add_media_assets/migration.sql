-- CreateEnum
CREATE TYPE "MediaAssetType" AS ENUM ('VIDEO', 'REPLAY', 'SLIDES', 'IMAGE', 'RESOURCE');

-- CreateEnum
CREATE TYPE "MediaAssetSource" AS ENUM ('UPLOADED', 'LIVE_RECORDING', 'REPLAY_EXPORT', 'EXTERNAL_LINK');

-- CreateEnum
CREATE TYPE "MediaAssetStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "eventId" TEXT,
    "createdById" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assetType" "MediaAssetType" NOT NULL,
    "source" "MediaAssetSource" NOT NULL,
    "status" "MediaAssetStatus" NOT NULL DEFAULT 'PROCESSING',
    "durationSeconds" INTEGER,
    "sizeBytes" INTEGER,
    "thumbnailUrl" TEXT,
    "playbackUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaMarker" (
    "id" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "timestampSeconds" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaMarker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaAsset_workspaceId_idx" ON "MediaAsset"("workspaceId");

-- CreateIndex
CREATE INDEX "MediaAsset_eventId_idx" ON "MediaAsset"("eventId");

-- CreateIndex
CREATE INDEX "MediaAsset_createdById_idx" ON "MediaAsset"("createdById");

-- CreateIndex
CREATE INDEX "MediaAsset_assetType_idx" ON "MediaAsset"("assetType");

-- CreateIndex
CREATE INDEX "MediaAsset_source_idx" ON "MediaAsset"("source");

-- CreateIndex
CREATE INDEX "MediaAsset_status_idx" ON "MediaAsset"("status");

-- CreateIndex
CREATE INDEX "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt");

-- CreateIndex
CREATE INDEX "MediaMarker_mediaAssetId_idx" ON "MediaMarker"("mediaAssetId");

-- CreateIndex
CREATE INDEX "MediaMarker_timestampSeconds_idx" ON "MediaMarker"("timestampSeconds");

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaMarker" ADD CONSTRAINT "MediaMarker_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
