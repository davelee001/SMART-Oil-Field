-- CreateEnum
CREATE TYPE "SupplierSector" AS ENUM ('UPSTREAM', 'MIDSTREAM', 'DOWNSTREAM', 'CROSS_SECTOR');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('DRAFT', 'PENDING_QUALIFICATION', 'QUALIFIED', 'SUSPENDED', 'BLACKLISTED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "QualificationStatus" AS ENUM ('NOT_STARTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SupplierContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "PurchaseRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ORDERED', 'PARTIALLY_DELIVERED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'ACCEPTED', 'REJECTED', 'LATE');

-- CreateTable
CREATE TABLE "Supplier" (
    "id" UUID NOT NULL,
    "supplierCode" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradingName" TEXT,
    "registrationNumber" TEXT,
    "taxNumber" TEXT,
    "sector" "SupplierSector" NOT NULL,
    "categories" TEXT[],
    "country" TEXT NOT NULL,
    "address" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "status" "SupplierStatus" NOT NULL DEFAULT 'DRAFT',
    "localContentPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "hseCertification" TEXT,
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierQualification" (
    "id" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "status" "QualificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "technicalScore" INTEGER,
    "financialScore" INTEGER,
    "hseScore" INTEGER,
    "localContentScore" INTEGER,
    "overallScore" DECIMAL(5,2),
    "reviewerId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierQualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierContract" (
    "id" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "projectId" UUID,
    "contractNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "value" DECIMAL(18,2) NOT NULL,
    "status" "SupplierContractStatus" NOT NULL DEFAULT 'DRAFT',
    "renewalLeadDays" INTEGER NOT NULL DEFAULT 90,
    "responsibleOfficerId" UUID NOT NULL,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" UUID NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "supplierId" UUID,
    "contractId" UUID,
    "projectId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requiredBy" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "estimatedAmount" DECIMAL(18,2) NOT NULL,
    "status" "PurchaseRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID NOT NULL,
    "reviewedById" UUID,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierDelivery" (
    "id" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "contractId" UUID,
    "purchaseRequestId" UUID,
    "deliveryNumber" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "actualDate" TIMESTAMP(3),
    "location" TEXT NOT NULL,
    "items" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'SCHEDULED',
    "qualityScore" INTEGER,
    "hseScore" INTEGER,
    "acceptedById" UUID,
    "acceptanceNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPerformanceReview" (
    "id" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "contractId" UUID,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "qualityScore" INTEGER NOT NULL,
    "deliveryScore" INTEGER NOT NULL,
    "hseScore" INTEGER NOT NULL,
    "localContentScore" INTEGER NOT NULL,
    "costScore" INTEGER NOT NULL,
    "overallScore" DECIMAL(5,2) NOT NULL,
    "comments" TEXT,
    "reviewerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierPerformanceReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierEvidence" (
    "id" UUID NOT NULL,
    "supplierId" UUID,
    "qualificationId" UUID,
    "contractId" UUID,
    "purchaseRequestId" UUID,
    "deliveryId" UUID,
    "reviewId" UUID,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "notes" TEXT,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierWorkflowEvent" (
    "id" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "comment" TEXT,
    "actorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierWorkflowEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_supplierCode_key" ON "Supplier"("supplierCode");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_registrationNumber_key" ON "Supplier"("registrationNumber");

-- CreateIndex
CREATE INDEX "Supplier_legalName_idx" ON "Supplier"("legalName");

-- CreateIndex
CREATE INDEX "Supplier_sector_status_idx" ON "Supplier"("sector", "status");

-- CreateIndex
CREATE INDEX "Supplier_createdById_idx" ON "Supplier"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierQualification_reference_key" ON "SupplierQualification"("reference");

-- CreateIndex
CREATE INDEX "SupplierQualification_supplierId_status_idx" ON "SupplierQualification"("supplierId", "status");

-- CreateIndex
CREATE INDEX "SupplierQualification_expiresAt_idx" ON "SupplierQualification"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierContract_contractNumber_key" ON "SupplierContract"("contractNumber");

-- CreateIndex
CREATE INDEX "SupplierContract_supplierId_status_idx" ON "SupplierContract"("supplierId", "status");

-- CreateIndex
CREATE INDEX "SupplierContract_projectId_idx" ON "SupplierContract"("projectId");

-- CreateIndex
CREATE INDEX "SupplierContract_endDate_idx" ON "SupplierContract"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRequest_requestNumber_key" ON "PurchaseRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "PurchaseRequest_supplierId_status_idx" ON "PurchaseRequest"("supplierId", "status");

-- CreateIndex
CREATE INDEX "PurchaseRequest_projectId_idx" ON "PurchaseRequest"("projectId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_createdById_idx" ON "PurchaseRequest"("createdById");

-- CreateIndex
CREATE INDEX "PurchaseRequest_requiredBy_idx" ON "PurchaseRequest"("requiredBy");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierDelivery_deliveryNumber_key" ON "SupplierDelivery"("deliveryNumber");

-- CreateIndex
CREATE INDEX "SupplierDelivery_supplierId_status_idx" ON "SupplierDelivery"("supplierId", "status");

-- CreateIndex
CREATE INDEX "SupplierDelivery_contractId_idx" ON "SupplierDelivery"("contractId");

-- CreateIndex
CREATE INDEX "SupplierDelivery_purchaseRequestId_idx" ON "SupplierDelivery"("purchaseRequestId");

-- CreateIndex
CREATE INDEX "SupplierDelivery_scheduledDate_idx" ON "SupplierDelivery"("scheduledDate");

-- CreateIndex
CREATE INDEX "SupplierPerformanceReview_supplierId_periodEnd_idx" ON "SupplierPerformanceReview"("supplierId", "periodEnd");

-- CreateIndex
CREATE INDEX "SupplierPerformanceReview_contractId_idx" ON "SupplierPerformanceReview"("contractId");

-- CreateIndex
CREATE INDEX "SupplierEvidence_supplierId_idx" ON "SupplierEvidence"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierEvidence_qualificationId_idx" ON "SupplierEvidence"("qualificationId");

-- CreateIndex
CREATE INDEX "SupplierEvidence_contractId_idx" ON "SupplierEvidence"("contractId");

-- CreateIndex
CREATE INDEX "SupplierEvidence_purchaseRequestId_idx" ON "SupplierEvidence"("purchaseRequestId");

-- CreateIndex
CREATE INDEX "SupplierEvidence_deliveryId_idx" ON "SupplierEvidence"("deliveryId");

-- CreateIndex
CREATE INDEX "SupplierEvidence_reviewId_idx" ON "SupplierEvidence"("reviewId");

-- CreateIndex
CREATE INDEX "SupplierWorkflowEvent_entityType_entityId_createdAt_idx" ON "SupplierWorkflowEvent"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "SupplierWorkflowEvent_actorId_idx" ON "SupplierWorkflowEvent"("actorId");

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierQualification" ADD CONSTRAINT "SupplierQualification_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierQualification" ADD CONSTRAINT "SupplierQualification_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierContract" ADD CONSTRAINT "SupplierContract_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierContract" ADD CONSTRAINT "SupplierContract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierContract" ADD CONSTRAINT "SupplierContract_responsibleOfficerId_fkey" FOREIGN KEY ("responsibleOfficerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "SupplierContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDelivery" ADD CONSTRAINT "SupplierDelivery_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDelivery" ADD CONSTRAINT "SupplierDelivery_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "SupplierContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDelivery" ADD CONSTRAINT "SupplierDelivery_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "PurchaseRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDelivery" ADD CONSTRAINT "SupplierDelivery_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPerformanceReview" ADD CONSTRAINT "SupplierPerformanceReview_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPerformanceReview" ADD CONSTRAINT "SupplierPerformanceReview_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "SupplierContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPerformanceReview" ADD CONSTRAINT "SupplierPerformanceReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEvidence" ADD CONSTRAINT "SupplierEvidence_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEvidence" ADD CONSTRAINT "SupplierEvidence_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "SupplierQualification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEvidence" ADD CONSTRAINT "SupplierEvidence_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "SupplierContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEvidence" ADD CONSTRAINT "SupplierEvidence_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "PurchaseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEvidence" ADD CONSTRAINT "SupplierEvidence_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "SupplierDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEvidence" ADD CONSTRAINT "SupplierEvidence_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "SupplierPerformanceReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEvidence" ADD CONSTRAINT "SupplierEvidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierWorkflowEvent" ADD CONSTRAINT "SupplierWorkflowEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain integrity checks not expressible in Prisma's schema language.
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_localContentPercentage_check" CHECK ("localContentPercentage" >= 0 AND "localContentPercentage" <= 100);
ALTER TABLE "SupplierQualification" ADD CONSTRAINT "SupplierQualification_scores_check" CHECK (
  ("technicalScore" IS NULL OR "technicalScore" BETWEEN 0 AND 100) AND
  ("financialScore" IS NULL OR "financialScore" BETWEEN 0 AND 100) AND
  ("hseScore" IS NULL OR "hseScore" BETWEEN 0 AND 100) AND
  ("localContentScore" IS NULL OR "localContentScore" BETWEEN 0 AND 100) AND
  ("overallScore" IS NULL OR "overallScore" BETWEEN 0 AND 100)
);
ALTER TABLE "SupplierContract" ADD CONSTRAINT "SupplierContract_dates_check" CHECK ("endDate" >= "startDate");
ALTER TABLE "SupplierContract" ADD CONSTRAINT "SupplierContract_value_check" CHECK ("value" >= 0);
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_amount_check" CHECK ("estimatedAmount" >= 0);
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_four_eyes_check" CHECK ("reviewedById" IS NULL OR "reviewedById" <> "createdById");
ALTER TABLE "SupplierDelivery" ADD CONSTRAINT "SupplierDelivery_scores_check" CHECK (
  ("qualityScore" IS NULL OR "qualityScore" BETWEEN 0 AND 100) AND
  ("hseScore" IS NULL OR "hseScore" BETWEEN 0 AND 100)
);
ALTER TABLE "SupplierPerformanceReview" ADD CONSTRAINT "SupplierPerformanceReview_period_check" CHECK ("periodEnd" >= "periodStart");
ALTER TABLE "SupplierPerformanceReview" ADD CONSTRAINT "SupplierPerformanceReview_scores_check" CHECK (
  "qualityScore" BETWEEN 0 AND 100 AND "deliveryScore" BETWEEN 0 AND 100 AND
  "hseScore" BETWEEN 0 AND 100 AND "localContentScore" BETWEEN 0 AND 100 AND
  "costScore" BETWEEN 0 AND 100 AND "overallScore" BETWEEN 0 AND 100
);
ALTER TABLE "SupplierEvidence" ADD CONSTRAINT "SupplierEvidence_one_parent_check" CHECK (
  num_nonnulls("supplierId", "qualificationId", "contractId", "purchaseRequestId", "deliveryId", "reviewId") = 1
);
