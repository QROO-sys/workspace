-- CreateTable
CREATE TABLE "QrCode" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "label" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "QrCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QrCode_tenantId_type_idx" ON "QrCode"("tenantId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "QrCode_tenantId_type_entityId_key"
ON "QrCode"("tenantId", "type", "entityId");
