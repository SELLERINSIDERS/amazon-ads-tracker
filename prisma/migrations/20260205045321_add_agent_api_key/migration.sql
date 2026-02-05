-- CreateTable
CREATE TABLE "AgentApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME
);

-- CreateTable
CREATE TABLE "AgentHeartbeat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentKeyId" TEXT,
    "status" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentApiKey_key_key" ON "AgentApiKey"("key");

-- CreateIndex
CREATE INDEX "AgentApiKey_key_idx" ON "AgentApiKey"("key");

-- CreateIndex
CREATE INDEX "AgentHeartbeat_timestamp_idx" ON "AgentHeartbeat"("timestamp");
