-- CreateEnum
CREATE TYPE "RegulationType" AS ENUM ('LAW', 'REGULATION', 'POLICY', 'STANDARD', 'GUIDELINE', 'LICENCE_REQUIREMENT');

-- CreateEnum
CREATE TYPE "ComplianceRegisterStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ComplianceObligationStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLIANT', 'NON_COMPLIANT', 'OVERDUE', 'WAIVED');

-- CreateEnum
CREATE TYPE "PermitStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRING', 'EXPIRED', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InspectionOutcome" AS ENUM ('NOT_ASSESSED', 'COMPLIANT', 'PARTIALLY_COMPLIANT', 'NON_COMPLIANT');

-- CreateEnum
CREATE TYPE "NonConformitySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NonConformityStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'ACTION_IN_PROGRESS', 'PENDING_VERIFICATION', 'CLOSED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "CorrectiveActionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'PENDING_VERIFICATION', 'COMPLETED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EscalationLevel" AS ENUM ('NONE', 'DEPARTMENT_HEAD', 'EXECUTIVE', 'REGULATOR');

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "metadata" SET DATA TYPE JSONB;

-- CreateTable
CREATE TABLE "ComplianceRegulation" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "RegulationType" NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "regulator" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "reviewDate" TIMESTAMP(3),
    "status" "ComplianceRegisterStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceRegulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceObligation" (
    "id" UUID NOT NULL,
    "regulationId" UUID NOT NULL,
    "projectId" UUID,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "responsibleOfficerId" UUID NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "frequency" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "status" "ComplianceObligationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "completedAt" TIMESTAMP(3),
    "verifiedById" UUID,
    "verifiedAt" TIMESTAMP(3),
    "verificationComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompliancePermit" (
    "id" UUID NOT NULL,
    "regulationId" UUID,
    "projectId" UUID,
    "permitNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "permitType" TEXT NOT NULL,
    "issuingAuthority" TEXT NOT NULL,
    "holder" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "status" "PermitStatus" NOT NULL DEFAULT 'DRAFT',
    "renewalLeadDays" INTEGER NOT NULL DEFAULT 90,
    "conditions" TEXT,
    "responsibleOfficerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompliancePermit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceInspection" (
    "id" UUID NOT NULL,
    "regulationId" UUID,
    "projectId" UUID,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "inspector" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "status" "InspectionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "outcome" "InspectionOutcome" NOT NULL DEFAULT 'NOT_ASSESSED',
    "score" INTEGER,
    "notes" TEXT,
    "responsibleOfficerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NonConformity" (
    "id" UUID NOT NULL,
    "obligationId" UUID,
    "inspectionId" UUID,
    "projectId" UUID,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "NonConformitySeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "NonConformityStatus" NOT NULL DEFAULT 'OPEN',
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "responsibleOfficerId" UUID NOT NULL,
    "rootCause" TEXT,
    "escalationLevel" "EscalationLevel" NOT NULL DEFAULT 'NONE',
    "escalatedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NonConformity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectiveAction" (
    "id" UUID NOT NULL,
    "nonConformityId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "responsibleOfficerId" UUID NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "CorrectiveActionStatus" NOT NULL DEFAULT 'PLANNED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completionNotes" TEXT,
    "verifiedById" UUID,
    "verifiedAt" TIMESTAMP(3),
    "verificationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorrectiveAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceEvidence" (
    "id" UUID NOT NULL,
    "obligationId" UUID,
    "permitId" UUID,
    "inspectionId" UUID,
    "nonConformityId" UUID,
    "correctiveActionId" UUID,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "notes" TEXT,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceWorkflowEvent" (
    "id" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "comment" TEXT,
    "actorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceWorkflowEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceRegulation_code_key" ON "ComplianceRegulation"("code");

-- CreateIndex
CREATE INDEX "ComplianceRegulation_type_status_idx" ON "ComplianceRegulation"("type", "status");

-- CreateIndex
CREATE INDEX "ComplianceRegulation_reviewDate_idx" ON "ComplianceRegulation"("reviewDate");

-- CreateIndex
CREATE INDEX "ComplianceObligation_department_status_idx" ON "ComplianceObligation"("department", "status");

-- CreateIndex
CREATE INDEX "ComplianceObligation_responsibleOfficerId_dueDate_idx" ON "ComplianceObligation"("responsibleOfficerId", "dueDate");

-- CreateIndex
CREATE INDEX "ComplianceObligation_projectId_idx" ON "ComplianceObligation"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceObligation_regulationId_reference_key" ON "ComplianceObligation"("regulationId", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "CompliancePermit_permitNumber_key" ON "CompliancePermit"("permitNumber");

-- CreateIndex
CREATE INDEX "CompliancePermit_status_expiryDate_idx" ON "CompliancePermit"("status", "expiryDate");

-- CreateIndex
CREATE INDEX "CompliancePermit_responsibleOfficerId_idx" ON "CompliancePermit"("responsibleOfficerId");

-- CreateIndex
CREATE INDEX "CompliancePermit_projectId_idx" ON "CompliancePermit"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceInspection_reference_key" ON "ComplianceInspection"("reference");

-- CreateIndex
CREATE INDEX "ComplianceInspection_status_scheduledDate_idx" ON "ComplianceInspection"("status", "scheduledDate");

-- CreateIndex
CREATE INDEX "ComplianceInspection_responsibleOfficerId_idx" ON "ComplianceInspection"("responsibleOfficerId");

-- CreateIndex
CREATE INDEX "ComplianceInspection_projectId_idx" ON "ComplianceInspection"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "NonConformity_reference_key" ON "NonConformity"("reference");

-- CreateIndex
CREATE INDEX "NonConformity_severity_status_idx" ON "NonConformity"("severity", "status");

-- CreateIndex
CREATE INDEX "NonConformity_responsibleOfficerId_dueDate_idx" ON "NonConformity"("responsibleOfficerId", "dueDate");

-- CreateIndex
CREATE INDEX "NonConformity_projectId_idx" ON "NonConformity"("projectId");

-- CreateIndex
CREATE INDEX "CorrectiveAction_nonConformityId_status_idx" ON "CorrectiveAction"("nonConformityId", "status");

-- CreateIndex
CREATE INDEX "CorrectiveAction_responsibleOfficerId_dueDate_idx" ON "CorrectiveAction"("responsibleOfficerId", "dueDate");

-- CreateIndex
CREATE INDEX "ComplianceEvidence_obligationId_idx" ON "ComplianceEvidence"("obligationId");

-- CreateIndex
CREATE INDEX "ComplianceEvidence_permitId_idx" ON "ComplianceEvidence"("permitId");

-- CreateIndex
CREATE INDEX "ComplianceEvidence_inspectionId_idx" ON "ComplianceEvidence"("inspectionId");

-- CreateIndex
CREATE INDEX "ComplianceEvidence_nonConformityId_idx" ON "ComplianceEvidence"("nonConformityId");

-- CreateIndex
CREATE INDEX "ComplianceEvidence_correctiveActionId_idx" ON "ComplianceEvidence"("correctiveActionId");

-- CreateIndex
CREATE INDEX "ComplianceWorkflowEvent_entityType_entityId_createdAt_idx" ON "ComplianceWorkflowEvent"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "ComplianceWorkflowEvent_actorId_idx" ON "ComplianceWorkflowEvent"("actorId");

-- AddForeignKey
ALTER TABLE "ComplianceRegulation" ADD CONSTRAINT "ComplianceRegulation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceObligation" ADD CONSTRAINT "ComplianceObligation_regulationId_fkey" FOREIGN KEY ("regulationId") REFERENCES "ComplianceRegulation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceObligation" ADD CONSTRAINT "ComplianceObligation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceObligation" ADD CONSTRAINT "ComplianceObligation_responsibleOfficerId_fkey" FOREIGN KEY ("responsibleOfficerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceObligation" ADD CONSTRAINT "ComplianceObligation_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompliancePermit" ADD CONSTRAINT "CompliancePermit_regulationId_fkey" FOREIGN KEY ("regulationId") REFERENCES "ComplianceRegulation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompliancePermit" ADD CONSTRAINT "CompliancePermit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompliancePermit" ADD CONSTRAINT "CompliancePermit_responsibleOfficerId_fkey" FOREIGN KEY ("responsibleOfficerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceInspection" ADD CONSTRAINT "ComplianceInspection_regulationId_fkey" FOREIGN KEY ("regulationId") REFERENCES "ComplianceRegulation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceInspection" ADD CONSTRAINT "ComplianceInspection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceInspection" ADD CONSTRAINT "ComplianceInspection_responsibleOfficerId_fkey" FOREIGN KEY ("responsibleOfficerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformity" ADD CONSTRAINT "NonConformity_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "ComplianceObligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformity" ADD CONSTRAINT "NonConformity_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "ComplianceInspection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformity" ADD CONSTRAINT "NonConformity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformity" ADD CONSTRAINT "NonConformity_responsibleOfficerId_fkey" FOREIGN KEY ("responsibleOfficerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_nonConformityId_fkey" FOREIGN KEY ("nonConformityId") REFERENCES "NonConformity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_responsibleOfficerId_fkey" FOREIGN KEY ("responsibleOfficerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceEvidence" ADD CONSTRAINT "ComplianceEvidence_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "ComplianceObligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceEvidence" ADD CONSTRAINT "ComplianceEvidence_permitId_fkey" FOREIGN KEY ("permitId") REFERENCES "CompliancePermit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceEvidence" ADD CONSTRAINT "ComplianceEvidence_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "ComplianceInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceEvidence" ADD CONSTRAINT "ComplianceEvidence_nonConformityId_fkey" FOREIGN KEY ("nonConformityId") REFERENCES "NonConformity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceEvidence" ADD CONSTRAINT "ComplianceEvidence_correctiveActionId_fkey" FOREIGN KEY ("correctiveActionId") REFERENCES "CorrectiveAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceEvidence" ADD CONSTRAINT "ComplianceEvidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceWorkflowEvent" ADD CONSTRAINT "ComplianceWorkflowEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Database-level compliance invariants
ALTER TABLE "ComplianceObligation" ADD CONSTRAINT "ComplianceObligation_weight_check" CHECK ("weight" BETWEEN 1 AND 100);
ALTER TABLE "CompliancePermit" ADD CONSTRAINT "CompliancePermit_dates_check" CHECK ("expiryDate" >= "issueDate");
ALTER TABLE "CompliancePermit" ADD CONSTRAINT "CompliancePermit_renewal_lead_check" CHECK ("renewalLeadDays" BETWEEN 1 AND 730);
ALTER TABLE "ComplianceInspection" ADD CONSTRAINT "ComplianceInspection_score_check" CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 100);
ALTER TABLE "NonConformity" ADD CONSTRAINT "NonConformity_dates_check" CHECK ("dueDate" >= "detectedAt");
ALTER TABLE "NonConformity" ADD CONSTRAINT "NonConformity_source_check" CHECK (num_nonnulls("obligationId", "inspectionId", "projectId") >= 1);
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_progress_check" CHECK ("progress" BETWEEN 0 AND 100);
ALTER TABLE "ComplianceEvidence" ADD CONSTRAINT "ComplianceEvidence_single_parent_check" CHECK (num_nonnulls("obligationId", "permitId", "inspectionId", "nonConformityId", "correctiveActionId") = 1);
