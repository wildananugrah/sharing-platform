-- CreateTable
CREATE TABLE "broadcasts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "roomName" TEXT NOT NULL,
    "roomId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'preparing',
    "viewerCount" INTEGER NOT NULL DEFAULT 0,
    "peakViewerCount" INTEGER NOT NULL DEFAULT 0,
    "recordingUrl" TEXT,
    "recordingKey" TEXT,
    "egressId" TEXT,
    "duration" INTEGER,
    "fileSize" BIGINT,
    "broadcasterId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chats" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_viewers" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "watchTime" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "broadcast_viewers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "broadcasts_roomName_key" ON "broadcasts"("roomName");

-- CreateIndex
CREATE INDEX "broadcasts_status_startedAt_idx" ON "broadcasts"("status", "startedAt");

-- CreateIndex
CREATE INDEX "broadcasts_broadcasterId_idx" ON "broadcasts"("broadcasterId");

-- CreateIndex
CREATE INDEX "broadcasts_createdAt_idx" ON "broadcasts"("createdAt");

-- CreateIndex
CREATE INDEX "chats_broadcastId_createdAt_idx" ON "chats"("broadcastId", "createdAt");

-- CreateIndex
CREATE INDEX "chats_userId_idx" ON "chats"("userId");

-- CreateIndex
CREATE INDEX "broadcast_viewers_broadcastId_idx" ON "broadcast_viewers"("broadcastId");

-- CreateIndex
CREATE INDEX "broadcast_viewers_userId_idx" ON "broadcast_viewers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "broadcast_viewers_broadcastId_userId_key" ON "broadcast_viewers"("broadcastId", "userId");

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_broadcasterId_fkey" FOREIGN KEY ("broadcasterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_viewers" ADD CONSTRAINT "broadcast_viewers_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_viewers" ADD CONSTRAINT "broadcast_viewers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
