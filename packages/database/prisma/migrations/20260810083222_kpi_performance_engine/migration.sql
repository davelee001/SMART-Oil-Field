-- CreateEnum
CREATE TYPE "ResultsFrameworkStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ResultLevelType" AS ENUM ('IMPACT', 'OUTCOME', 'OUTPUT');

-- CreateEnum
CREATE TYPE "KpiIndicatorStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "KpiDirection" AS ENUM ('INCREASE', 'DECREASE', 'MAINTAIN');

-- CreateEnum
CREATE TYPE "KpiDataType" AS ENUM ('NUMBER', 'PERCENTAGE', 'CURRENCY', 'COUNT', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "KpiFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'AD_HOC');

-- CreateEnum
CREATE TYPE "KpiPeriodStatus" AS ENUM ('OPEN', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "KpiMeasurementStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "KpiSourceType" AS ENUM ('MANUAL', 'TELEMETRY', 'ANALYTICS', 'FINANCE', 'COMPLIANCE', 'SUPPLY_CHAIN');

-- CreateEnum
CREATE TYPE "KpiAggregation" AS ENUM ('VALUE', 'AVERAGE', 'SUM', 'MINIMUM', 'MAXIMUM', 'COUNT');

-- CreateTable
CREATE TABLE "ResultsFramework" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "ResultsFrameworkStatus" NOT NULL DEFAULT 'DRAFT',
    "ownerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResultsFramework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultLevel" (
    "id" UUID NOT NULL,
    "frameworkId" UUID NOT NULL,
    "parentId" UUID,
    "code" TEXT NOT NULL,
    "type" "ResultLevelType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResultLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiIndicator" (
    "id" UUID NOT NULL,
    "frameworkId" UUID NOT NULL,
    "resultLevelId" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "dataType" "KpiDataType" NOT NULL DEFAULT 'NUMBER',
    "direction" "KpiDirection" NOT NULL DEFAULT 'INCREASE',
    "frequency" "KpiFrequency" NOT NULL DEFAULT 'QUARTERLY',
    "baselineValue" DECIMAL(20,4) NOT NULL,
    "baselineDate" TIMESTAMP(3) NOT NULL,
    "finalTargetValue" DECIMAL(20,4) NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "tolerance" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "disaggregation" JSONB,
    "formula" TEXT,
    "sourceDescription" TEXT,
    "status" "KpiIndicatorStatus" NOT NULL DEFAULT 'DRAFT',
    "ownerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiIndicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiReportingPeriod" (
    "id" UUID NOT NULL,
    "frameworkId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "KpiPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" UUID NOT NULL,
    "submittedById" UUID,
    "reviewedById" UUID,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiReportingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiTarget" (
    "id" UUID NOT NULL,
    "indicatorId" UUID NOT NULL,
    "periodId" UUID NOT NULL,
    "targetValue" DECIMAL(20,4) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiMeasurement" (
    "id" UUID NOT NULL,
    "indicatorId" UUID NOT NULL,
    "periodId" UUID NOT NULL,
    "actualValue" DECIMAL(20,4) NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "narrative" TEXT,
    "disaggregation" JSONB,
    "sourceType" "KpiSourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceReference" TEXT,
    "status" "KpiMeasurementStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID NOT NULL,
    "verifiedById" UUID,
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verificationComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiDataSource" (
    "id" UUID NOT NULL,
    "indicatorId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sourceType" "KpiSourceType" NOT NULL,
    "endpoint" TEXT,
    "valuePath" TEXT,
    "aggregation" "KpiAggregation" NOT NULL DEFAULT 'VALUE',
    "configuration" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "lastValue" DECIMAL(20,4),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiDataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiEvidence" (
    "id" UUID NOT NULL,
    "indicatorId" UUID,
    "measurementId" UUID,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "notes" TEXT,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpiEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiWorkflowEvent" (
    "id" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "comment" TEXT,
    "actorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpiWorkflowEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResultsFramework_code_key" ON "ResultsFramework"("code");

-- CreateIndex
CREATE INDEX "ResultsFramework_projectId_status_idx" ON "ResultsFramework"("projectId", "status");

-- CreateIndex
CREATE INDEX "ResultsFramework_ownerId_idx" ON "ResultsFramework"("ownerId");

-- CreateIndex
CREATE INDEX "ResultsFramework_startDate_endDate_idx" ON "ResultsFramework"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "ResultLevel_frameworkId_type_sortOrder_idx" ON "ResultLevel"("frameworkId", "type", "sortOrder");

-- CreateIndex
CREATE INDEX "ResultLevel_parentId_idx" ON "ResultLevel"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "ResultLevel_frameworkId_code_key" ON "ResultLevel"("frameworkId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "KpiIndicator_code_key" ON "KpiIndicator"("code");

-- CreateIndex
CREATE INDEX "KpiIndicator_frameworkId_status_idx" ON "KpiIndicator"("frameworkId", "status");

-- CreateIndex
CREATE INDEX "KpiIndicator_resultLevelId_idx" ON "KpiIndicator"("resultLevelId");

-- CreateIndex
CREATE INDEX "KpiIndicator_ownerId_idx" ON "KpiIndicator"("ownerId");

-- CreateIndex
CREATE INDEX "KpiReportingPeriod_frameworkId_status_idx" ON "KpiReportingPeriod"("frameworkId", "status");

-- CreateIndex
CREATE INDEX "KpiReportingPeriod_startDate_endDate_idx" ON "KpiReportingPeriod"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "KpiReportingPeriod_frameworkId_name_key" ON "KpiReportingPeriod"("frameworkId", "name");

-- CreateIndex
CREATE INDEX "KpiTarget_periodId_idx" ON "KpiTarget"("periodId");

-- CreateIndex
CREATE UNIQUE INDEX "KpiTarget_indicatorId_periodId_key" ON "KpiTarget"("indicatorId", "periodId");

-- CreateIndex
CREATE INDEX "KpiMeasurement_indicatorId_periodId_status_idx" ON "KpiMeasurement"("indicatorId", "periodId", "status");

-- CreateIndex
CREATE INDEX "KpiMeasurement_createdById_idx" ON "KpiMeasurement"("createdById");

-- CreateIndex
CREATE INDEX "KpiMeasurement_measuredAt_idx" ON "KpiMeasurement"("measuredAt");

-- CreateIndex
CREATE INDEX "KpiDataSource_indicatorId_isActive_idx" ON "KpiDataSource"("indicatorId", "isActive");

-- CreateIndex
CREATE INDEX "KpiDataSource_sourceType_idx" ON "KpiDataSource"("sourceType");

-- CreateIndex
CREATE INDEX "KpiEvidence_indicatorId_idx" ON "KpiEvidence"("indicatorId");

-- CreateIndex
CREATE INDEX "KpiEvidence_measurementId_idx" ON "KpiEvidence"("measurementId");

-- CreateIndex
CREATE INDEX "KpiWorkflowEvent_entityType_entityId_createdAt_idx" ON "KpiWorkflowEvent"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "KpiWorkflowEvent_actorId_idx" ON "KpiWorkflowEvent"("actorId");

-- AddForeignKey
ALTER TABLE "ResultsFramework" ADD CONSTRAINT "ResultsFramework_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultsFramework" ADD CONSTRAINT "ResultsFramework_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultLevel" ADD CONSTRAINT "ResultLevel_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "ResultsFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultLevel" ADD CONSTRAINT "ResultLevel_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ResultLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiIndicator" ADD CONSTRAINT "KpiIndicator_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "ResultsFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiIndicator" ADD CONSTRAINT "KpiIndicator_resultLevelId_fkey" FOREIGN KEY ("resultLevelId") REFERENCES "ResultLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiIndicator" ADD CONSTRAINT "KpiIndicator_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiReportingPeriod" ADD CONSTRAINT "KpiReportingPeriod_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "ResultsFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiReportingPeriod" ADD CONSTRAINT "KpiReportingPeriod_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiReportingPeriod" ADD CONSTRAINT "KpiReportingPeriod_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiReportingPeriod" ADD CONSTRAINT "KpiReportingPeriod_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiTarget" ADD CONSTRAINT "KpiTarget_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "KpiIndicator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiTarget" ADD CONSTRAINT "KpiTarget_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "KpiReportingPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiMeasurement" ADD CONSTRAINT "KpiMeasurement_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "KpiIndicator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiMeasurement" ADD CONSTRAINT "KpiMeasurement_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "KpiReportingPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiMeasurement" ADD CONSTRAINT "KpiMeasurement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiMeasurement" ADD CONSTRAINT "KpiMeasurement_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiDataSource" ADD CONSTRAINT "KpiDataSource_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "KpiIndicator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiEvidence" ADD CONSTRAINT "KpiEvidence_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "KpiIndicator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiEvidence" ADD CONSTRAINT "KpiEvidence_measurementId_fkey" FOREIGN KEY ("measurementId") REFERENCES "KpiMeasurement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiEvidence" ADD CONSTRAINT "KpiEvidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiWorkflowEvent" ADD CONSTRAINT "KpiWorkflowEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain integrity checks not expressible in Prisma's schema language.
ALTER TABLE "ResultsFramework" ADD CONSTRAINT "ResultsFramework_dates_check" CHECK ("endDate" >= "startDate");
ALTER TABLE "KpiIndicator" ADD CONSTRAINT "KpiIndicator_weight_check" CHECK ("weight" BETWEEN 1 AND 100);
ALTER TABLE "KpiIndicator" ADD CONSTRAINT "KpiIndicator_tolerance_check" CHECK ("tolerance" >= 0);
ALTER TABLE "KpiIndicator" ADD CONSTRAINT "KpiIndicator_percentage_check" CHECK (
  "dataType" <> 'PERCENTAGE' OR ("baselineValue" BETWEEN 0 AND 100 AND "finalTargetValue" BETWEEN 0 AND 100)
);
ALTER TABLE "KpiReportingPeriod" ADD CONSTRAINT "KpiReportingPeriod_dates_check" CHECK ("endDate" >= "startDate" AND "dueDate" >= "endDate");
ALTER TABLE "KpiReportingPeriod" ADD CONSTRAINT "KpiReportingPeriod_four_eyes_check" CHECK ("reviewedById" IS NULL OR "submittedById" IS NULL OR "reviewedById" <> "submittedById");
ALTER TABLE "KpiMeasurement" ADD CONSTRAINT "KpiMeasurement_four_eyes_check" CHECK ("verifiedById" IS NULL OR "verifiedById" <> "createdById");
ALTER TABLE "KpiMeasurement" ADD CONSTRAINT "KpiMeasurement_verification_check" CHECK (
  "status" NOT IN ('VERIFIED', 'REJECTED') OR ("verifiedById" IS NOT NULL AND "verifiedAt" IS NOT NULL)
);
ALTER TABLE "KpiDataSource" ADD CONSTRAINT "KpiDataSource_operational_type_check" CHECK ("sourceType" IN ('TELEMETRY', 'ANALYTICS'));
ALTER TABLE "KpiDataSource" ADD CONSTRAINT "KpiDataSource_endpoint_check" CHECK (
  "endpoint" IS NULL OR "endpoint" ~ '^/api/(telemetry|analytics|aggregation)(/|\?|$)'
);
ALTER TABLE "KpiEvidence" ADD CONSTRAINT "KpiEvidence_one_parent_check" CHECK (num_nonnulls("indicatorId", "measurementId") = 1);
