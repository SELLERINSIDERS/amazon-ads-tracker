-- CreateTable
CREATE TABLE "SafetyLimit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "maxBidChangePct" REAL NOT NULL DEFAULT 50,
    "maxBudgetChangePct" REAL NOT NULL DEFAULT 100,
    "maxDailySpend" REAL,
    "minBidFloor" REAL NOT NULL DEFAULT 0.02,
    "maxBidCeiling" REAL NOT NULL DEFAULT 100,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "actionType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT,
    "beforeState" TEXT,
    "afterState" TEXT,
    "reason" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMsg" TEXT
);

-- CreateIndex
CREATE INDEX "AuditEntry_timestamp_idx" ON "AuditEntry"("timestamp");

-- CreateIndex
CREATE INDEX "AuditEntry_entityType_entityId_idx" ON "AuditEntry"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditEntry_actorType_idx" ON "AuditEntry"("actorType");

-- CreateIndex
CREATE INDEX "AuditEntry_actionType_idx" ON "AuditEntry"("actionType");
