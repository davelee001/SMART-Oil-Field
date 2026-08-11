-- CreateEnum
CREATE TYPE "FormalReportType" AS ENUM ('PROJECT', 'QUARTERLY', 'ANNUAL', 'FINANCE', 'COMPLIANCE', 'SUPPLIER', 'TRAINING', 'DEPARTMENT', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "ReportTemplateStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACTIVE', 'REJECTED', 'RETIRED');

-- CreateEnum
CREATE TYPE "FormalReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'SIGNED', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "FormalReportTemplate" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FormalReportType" NOT NULL,
    "description" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "allowedRoles" "Role"[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "status" "ReportTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" UUID NOT NULL,
    "submittedById" UUID,
    "reviewedById" UUID,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormalReportTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormalReport" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "FormalReportType" NOT NULL,
    "templateId" UUID NOT NULL,
    "projectId" UUID,
    "department" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "FormalReportStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "ownerId" UUID NOT NULL,
    "submittedById" UUID,
    "reviewedById" UUID,
    "signedById" UUID,
    "publishedById" UUID,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "reviewComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormalReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormalReportVersion" (
    "id" UUID NOT NULL,
    "reportId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "executiveSummary" TEXT NOT NULL,
    "findings" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "sourceSnapshot" JSONB NOT NULL,
    "checksum" TEXT NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormalReportVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormalReportEvidence" (
    "id" UUID NOT NULL,
    "reportId" UUID NOT NULL,
    "versionId" UUID,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "notes" TEXT,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormalReportEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormalReportWorkflowEvent" (
    "id" UUID NOT NULL,
    "reportId" UUID,
    "templateId" UUID,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "comment" TEXT,
    "actorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormalReportWorkflowEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FormalReportTemplate_code_key" ON "FormalReportTemplate"("code");

-- CreateIndex
CREATE INDEX "FormalReportTemplate_type_status_idx" ON "FormalReportTemplate"("type", "status");

-- CreateIndex
CREATE INDEX "FormalReportTemplate_createdById_idx" ON "FormalReportTemplate"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "FormalReport_reference_key" ON "FormalReport"("reference");

-- CreateIndex
CREATE INDEX "FormalReport_type_status_idx" ON "FormalReport"("type", "status");

-- CreateIndex
CREATE INDEX "FormalReport_projectId_periodStart_periodEnd_idx" ON "FormalReport"("projectId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "FormalReport_department_periodStart_periodEnd_idx" ON "FormalReport"("department", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "FormalReport_ownerId_idx" ON "FormalReport"("ownerId");

-- CreateIndex
CREATE INDEX "FormalReportVersion_createdById_createdAt_idx" ON "FormalReportVersion"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "FormalReportVersion_checksum_idx" ON "FormalReportVersion"("checksum");

-- CreateIndex
CREATE UNIQUE INDEX "FormalReportVersion_reportId_version_key" ON "FormalReportVersion"("reportId", "version");

-- CreateIndex
CREATE INDEX "FormalReportEvidence_reportId_createdAt_idx" ON "FormalReportEvidence"("reportId", "createdAt");

-- CreateIndex
CREATE INDEX "FormalReportEvidence_versionId_idx" ON "FormalReportEvidence"("versionId");

-- CreateIndex
CREATE INDEX "FormalReportEvidence_uploadedById_idx" ON "FormalReportEvidence"("uploadedById");

-- CreateIndex
CREATE INDEX "FormalReportWorkflowEvent_reportId_createdAt_idx" ON "FormalReportWorkflowEvent"("reportId", "createdAt");

-- CreateIndex
CREATE INDEX "FormalReportWorkflowEvent_templateId_createdAt_idx" ON "FormalReportWorkflowEvent"("templateId", "createdAt");

-- CreateIndex
CREATE INDEX "FormalReportWorkflowEvent_actorId_idx" ON "FormalReportWorkflowEvent"("actorId");

-- AddForeignKey
ALTER TABLE "FormalReportTemplate" ADD CONSTRAINT "FormalReportTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormalReportTemplate" ADD CONSTRAINT "FormalReportTemplate_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormalReportTemplate" ADD CONSTRAINT "FormalReportTemplate_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormalReport" ADD CONSTRAINT "FormalReport_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FormalReportTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormalReport" ADD CONSTRAINT "FormalReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormalReport" ADD CONSTRAINT "FormalReport_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormalReport" ADD CONSTRAINT "FormalReport_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormalReport" ADD CONSTRAINT "FormalReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormalReport" ADD CONSTRAINT "FormalReport_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormalReport" ADD CONSTRAINT "FormalReport_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormalReportVersion" ADD CONSTRAINT "FormalReportVersion_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "FormalReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormalReportVersion" ADD CONSTRAINT "FormalReportVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormalReportEvidence" ADD CONSTRAINT "FormalReportEvidence_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "FormalReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormalReportEvidence" ADD CONSTRAINT "FormalReportEvidence_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "FormalReportVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormalReportEvidence" ADD CONSTRAINT "FormalReportEvidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormalReportWorkflowEvent" ADD CONSTRAINT "FormalReportWorkflowEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Formal reporting integrity controls not expressible in Prisma schema syntax.
ALTER TABLE "FormalReportTemplate" ADD CONSTRAINT "FormalReportTemplate_version_roles_check" CHECK (
  "version" > 0 AND cardinality("allowedRoles") > 0 AND jsonb_typeof("sections") = 'array'
);
ALTER TABLE "FormalReportTemplate" ADD CONSTRAINT "FormalReportTemplate_four_eyes_check" CHECK (
  "isSystem" OR "reviewedById" IS NULL OR ("reviewedById" <> "createdById" AND ("submittedById" IS NULL OR "reviewedById" <> "submittedById"))
);
ALTER TABLE "FormalReportTemplate" ADD CONSTRAINT "FormalReportTemplate_activation_check" CHECK (
  "status" <> 'ACTIVE' OR "isSystem" OR ("reviewedById" IS NOT NULL AND "reviewedAt" IS NOT NULL)
);
ALTER TABLE "FormalReport" ADD CONSTRAINT "FormalReport_dates_version_check" CHECK (
  "periodEnd" >= "periodStart" AND "currentVersion" > 0
);
ALTER TABLE "FormalReport" ADD CONSTRAINT "FormalReport_scope_check" CHECK (
  ("type" <> 'PROJECT' OR "projectId" IS NOT NULL) AND ("type" <> 'DEPARTMENT' OR ("department" IS NOT NULL AND length(trim("department")) > 0))
);
ALTER TABLE "FormalReport" ADD CONSTRAINT "FormalReport_review_separation_check" CHECK (
  "reviewedById" IS NULL OR ("reviewedById" <> "ownerId" AND ("submittedById" IS NULL OR "reviewedById" <> "submittedById"))
);
ALTER TABLE "FormalReport" ADD CONSTRAINT "FormalReport_signature_separation_check" CHECK (
  "signedById" IS NULL OR ("signedById" <> "ownerId" AND ("submittedById" IS NULL OR "signedById" <> "submittedById"))
);
ALTER TABLE "FormalReport" ADD CONSTRAINT "FormalReport_workflow_state_check" CHECK (
  ("status" NOT IN ('SUBMITTED', 'APPROVED', 'REJECTED', 'SIGNED', 'PUBLISHED', 'ARCHIVED') OR ("submittedById" IS NOT NULL AND "submittedAt" IS NOT NULL)) AND
  ("status" NOT IN ('APPROVED', 'REJECTED', 'SIGNED', 'PUBLISHED', 'ARCHIVED') OR ("reviewedById" IS NOT NULL AND "reviewedAt" IS NOT NULL)) AND
  ("status" NOT IN ('SIGNED', 'PUBLISHED', 'ARCHIVED') OR ("signedById" IS NOT NULL AND "signedAt" IS NOT NULL)) AND
  ("status" NOT IN ('PUBLISHED', 'ARCHIVED') OR ("publishedById" IS NOT NULL AND "publishedAt" IS NOT NULL)) AND
  ("status" <> 'ARCHIVED' OR "archivedAt" IS NOT NULL)
);
ALTER TABLE "FormalReportVersion" ADD CONSTRAINT "FormalReportVersion_number_checksum_check" CHECK (
  "version" > 0 AND "checksum" ~ '^[a-f0-9]{64}$'
);
ALTER TABLE "FormalReportWorkflowEvent" ADD CONSTRAINT "FormalReportWorkflowEvent_one_parent_check" CHECK (
  num_nonnulls("reportId", "templateId") = 1
);

CREATE FUNCTION prevent_formal_report_version_update() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Formal report versions are immutable; create a new version instead';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "FormalReportVersion_immutable"
BEFORE UPDATE ON "FormalReportVersion"
FOR EACH ROW EXECUTE FUNCTION prevent_formal_report_version_update();
