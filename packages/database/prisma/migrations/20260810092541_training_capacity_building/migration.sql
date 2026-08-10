-- CreateEnum
CREATE TYPE "TrainingCourseStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "TrainingDeliveryMode" AS ENUM ('CLASSROOM', 'VIRTUAL', 'BLENDED', 'ON_THE_JOB');

-- CreateEnum
CREATE TYPE "TrainingSessionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TrainingEnrollmentStatus" AS ENUM ('NOMINATED', 'ENROLLED', 'ATTENDED', 'COMPLETED', 'FAILED', 'NO_SHOW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TrainingAttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "TrainingAssessmentType" AS ENUM ('PRE_TRAINING', 'POST_TRAINING', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "CertificationStatus" AS ENUM ('ACTIVE', 'EXPIRING', 'EXPIRED', 'REVOKED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "department" TEXT;

-- CreateTable
CREATE TABLE "TrainingCompetency" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingCompetency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffCompetency" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "competencyId" UUID NOT NULL,
    "currentLevel" INTEGER NOT NULL DEFAULT 0,
    "targetLevel" INTEGER NOT NULL DEFAULT 1,
    "assessedAt" TIMESTAMP(3),
    "assessedById" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffCompetency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingCourse" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "provider" TEXT,
    "deliveryMode" "TrainingDeliveryMode" NOT NULL,
    "durationHours" DECIMAL(8,2) NOT NULL,
    "validityMonths" INTEGER,
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "defaultCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "TrainingCourseStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseCompetency" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "competencyId" UUID NOT NULL,
    "targetLevel" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CourseCompetency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingRequirement" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role",
    "department" TEXT,
    "courseId" UUID,
    "competencyId" UUID,
    "requiredLevel" INTEGER,
    "dueWithinDays" INTEGER NOT NULL DEFAULT 365,
    "renewalMonths" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingSession" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "projectId" UUID,
    "sessionCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "instructor" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "plannedCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "actualCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "TrainingSessionStatus" NOT NULL DEFAULT 'DRAFT',
    "coordinatorId" UUID NOT NULL,
    "submittedById" UUID,
    "reviewedById" UUID,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingEnrollment" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "nominatedById" UUID NOT NULL,
    "status" "TrainingEnrollmentStatus" NOT NULL DEFAULT 'NOMINATED',
    "attendancePercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "feedback" TEXT,
    "effectivenessScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingAttendance" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "status" "TrainingAttendanceStatus" NOT NULL,
    "hours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "recordedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingAssessment" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "type" "TrainingAssessmentType" NOT NULL,
    "score" DECIMAL(8,2) NOT NULL,
    "maximumScore" DECIMAL(8,2) NOT NULL DEFAULT 100,
    "assessedAt" TIMESTAMP(3) NOT NULL,
    "assessorId" UUID NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffCertification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "courseId" UUID,
    "competencyId" UUID,
    "enrollmentId" UUID,
    "certificateNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "status" "CertificationStatus" NOT NULL DEFAULT 'ACTIVE',
    "issuedById" UUID NOT NULL,
    "verifiedById" UUID,
    "verifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingEvidence" (
    "id" UUID NOT NULL,
    "staffCompetencyId" UUID,
    "sessionId" UUID,
    "enrollmentId" UUID,
    "assessmentId" UUID,
    "certificationId" UUID,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "notes" TEXT,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingWorkflowEvent" (
    "id" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "comment" TEXT,
    "actorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingWorkflowEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrainingCompetency_code_key" ON "TrainingCompetency"("code");

-- CreateIndex
CREATE INDEX "TrainingCompetency_category_isActive_idx" ON "TrainingCompetency"("category", "isActive");

-- CreateIndex
CREATE INDEX "StaffCompetency_competencyId_currentLevel_idx" ON "StaffCompetency"("competencyId", "currentLevel");

-- CreateIndex
CREATE INDEX "StaffCompetency_assessedById_idx" ON "StaffCompetency"("assessedById");

-- CreateIndex
CREATE UNIQUE INDEX "StaffCompetency_userId_competencyId_key" ON "StaffCompetency"("userId", "competencyId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingCourse_code_key" ON "TrainingCourse"("code");

-- CreateIndex
CREATE INDEX "TrainingCourse_category_status_idx" ON "TrainingCourse"("category", "status");

-- CreateIndex
CREATE INDEX "TrainingCourse_mandatory_idx" ON "TrainingCourse"("mandatory");

-- CreateIndex
CREATE INDEX "CourseCompetency_competencyId_idx" ON "CourseCompetency"("competencyId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseCompetency_courseId_competencyId_key" ON "CourseCompetency"("courseId", "competencyId");

-- CreateIndex
CREATE INDEX "TrainingRequirement_role_isActive_idx" ON "TrainingRequirement"("role", "isActive");

-- CreateIndex
CREATE INDEX "TrainingRequirement_department_isActive_idx" ON "TrainingRequirement"("department", "isActive");

-- CreateIndex
CREATE INDEX "TrainingRequirement_courseId_idx" ON "TrainingRequirement"("courseId");

-- CreateIndex
CREATE INDEX "TrainingRequirement_competencyId_idx" ON "TrainingRequirement"("competencyId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingSession_sessionCode_key" ON "TrainingSession"("sessionCode");

-- CreateIndex
CREATE INDEX "TrainingSession_courseId_status_idx" ON "TrainingSession"("courseId", "status");

-- CreateIndex
CREATE INDEX "TrainingSession_projectId_idx" ON "TrainingSession"("projectId");

-- CreateIndex
CREATE INDEX "TrainingSession_coordinatorId_idx" ON "TrainingSession"("coordinatorId");

-- CreateIndex
CREATE INDEX "TrainingSession_startDate_endDate_idx" ON "TrainingSession"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "TrainingEnrollment_userId_status_idx" ON "TrainingEnrollment"("userId", "status");

-- CreateIndex
CREATE INDEX "TrainingEnrollment_nominatedById_idx" ON "TrainingEnrollment"("nominatedById");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingEnrollment_sessionId_userId_key" ON "TrainingEnrollment"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "TrainingAttendance_recordedById_idx" ON "TrainingAttendance"("recordedById");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingAttendance_enrollmentId_sessionDate_key" ON "TrainingAttendance"("enrollmentId", "sessionDate");

-- CreateIndex
CREATE INDEX "TrainingAssessment_assessorId_idx" ON "TrainingAssessment"("assessorId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingAssessment_enrollmentId_type_key" ON "TrainingAssessment"("enrollmentId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "StaffCertification_certificateNumber_key" ON "StaffCertification"("certificateNumber");

-- CreateIndex
CREATE INDEX "StaffCertification_userId_status_idx" ON "StaffCertification"("userId", "status");

-- CreateIndex
CREATE INDEX "StaffCertification_expiresAt_idx" ON "StaffCertification"("expiresAt");

-- CreateIndex
CREATE INDEX "StaffCertification_courseId_idx" ON "StaffCertification"("courseId");

-- CreateIndex
CREATE INDEX "StaffCertification_competencyId_idx" ON "StaffCertification"("competencyId");

-- CreateIndex
CREATE INDEX "StaffCertification_issuedById_idx" ON "StaffCertification"("issuedById");

-- CreateIndex
CREATE INDEX "TrainingEvidence_staffCompetencyId_idx" ON "TrainingEvidence"("staffCompetencyId");

-- CreateIndex
CREATE INDEX "TrainingEvidence_sessionId_idx" ON "TrainingEvidence"("sessionId");

-- CreateIndex
CREATE INDEX "TrainingEvidence_enrollmentId_idx" ON "TrainingEvidence"("enrollmentId");

-- CreateIndex
CREATE INDEX "TrainingEvidence_assessmentId_idx" ON "TrainingEvidence"("assessmentId");

-- CreateIndex
CREATE INDEX "TrainingEvidence_certificationId_idx" ON "TrainingEvidence"("certificationId");

-- CreateIndex
CREATE INDEX "TrainingWorkflowEvent_entityType_entityId_createdAt_idx" ON "TrainingWorkflowEvent"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "TrainingWorkflowEvent_actorId_idx" ON "TrainingWorkflowEvent"("actorId");

-- AddForeignKey
ALTER TABLE "StaffCompetency" ADD CONSTRAINT "StaffCompetency_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffCompetency" ADD CONSTRAINT "StaffCompetency_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "TrainingCompetency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffCompetency" ADD CONSTRAINT "StaffCompetency_assessedById_fkey" FOREIGN KEY ("assessedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseCompetency" ADD CONSTRAINT "CourseCompetency_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "TrainingCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseCompetency" ADD CONSTRAINT "CourseCompetency_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "TrainingCompetency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRequirement" ADD CONSTRAINT "TrainingRequirement_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "TrainingCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRequirement" ADD CONSTRAINT "TrainingRequirement_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "TrainingCompetency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "TrainingCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEnrollment" ADD CONSTRAINT "TrainingEnrollment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEnrollment" ADD CONSTRAINT "TrainingEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEnrollment" ADD CONSTRAINT "TrainingEnrollment_nominatedById_fkey" FOREIGN KEY ("nominatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAttendance" ADD CONSTRAINT "TrainingAttendance_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "TrainingEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAttendance" ADD CONSTRAINT "TrainingAttendance_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAssessment" ADD CONSTRAINT "TrainingAssessment_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "TrainingEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAssessment" ADD CONSTRAINT "TrainingAssessment_assessorId_fkey" FOREIGN KEY ("assessorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffCertification" ADD CONSTRAINT "StaffCertification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffCertification" ADD CONSTRAINT "StaffCertification_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "TrainingCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffCertification" ADD CONSTRAINT "StaffCertification_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "TrainingCompetency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffCertification" ADD CONSTRAINT "StaffCertification_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "TrainingEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffCertification" ADD CONSTRAINT "StaffCertification_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffCertification" ADD CONSTRAINT "StaffCertification_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEvidence" ADD CONSTRAINT "TrainingEvidence_staffCompetencyId_fkey" FOREIGN KEY ("staffCompetencyId") REFERENCES "StaffCompetency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEvidence" ADD CONSTRAINT "TrainingEvidence_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEvidence" ADD CONSTRAINT "TrainingEvidence_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "TrainingEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEvidence" ADD CONSTRAINT "TrainingEvidence_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "TrainingAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEvidence" ADD CONSTRAINT "TrainingEvidence_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "StaffCertification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEvidence" ADD CONSTRAINT "TrainingEvidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingWorkflowEvent" ADD CONSTRAINT "TrainingWorkflowEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain integrity checks not expressible in Prisma's schema language.
ALTER TABLE "StaffCompetency" ADD CONSTRAINT "StaffCompetency_levels_check" CHECK (
  "currentLevel" BETWEEN 0 AND 5 AND "targetLevel" BETWEEN 1 AND 5
);
ALTER TABLE "TrainingCourse" ADD CONSTRAINT "TrainingCourse_duration_cost_check" CHECK (
  "durationHours" > 0 AND "defaultCost" >= 0 AND ("validityMonths" IS NULL OR "validityMonths" > 0)
);
ALTER TABLE "CourseCompetency" ADD CONSTRAINT "CourseCompetency_target_level_check" CHECK ("targetLevel" BETWEEN 1 AND 5);
ALTER TABLE "TrainingRequirement" ADD CONSTRAINT "TrainingRequirement_audience_check" CHECK (num_nonnulls("role", "department") >= 1);
ALTER TABLE "TrainingRequirement" ADD CONSTRAINT "TrainingRequirement_subject_check" CHECK (num_nonnulls("courseId", "competencyId") >= 1);
ALTER TABLE "TrainingRequirement" ADD CONSTRAINT "TrainingRequirement_levels_dates_check" CHECK (
  ("requiredLevel" IS NULL OR "requiredLevel" BETWEEN 1 AND 5) AND "dueWithinDays" > 0 AND ("renewalMonths" IS NULL OR "renewalMonths" > 0)
);
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_dates_capacity_cost_check" CHECK (
  "endDate" >= "startDate" AND "capacity" > 0 AND "plannedCost" >= 0 AND "actualCost" >= 0
);
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_four_eyes_check" CHECK (
  "reviewedById" IS NULL OR "submittedById" IS NULL OR "reviewedById" <> "submittedById"
);
ALTER TABLE "TrainingEnrollment" ADD CONSTRAINT "TrainingEnrollment_metrics_check" CHECK (
  "attendancePercentage" BETWEEN 0 AND 100 AND ("effectivenessScore" IS NULL OR "effectivenessScore" BETWEEN 0 AND 100)
);
ALTER TABLE "TrainingAttendance" ADD CONSTRAINT "TrainingAttendance_hours_check" CHECK ("hours" BETWEEN 0 AND 24);
ALTER TABLE "TrainingAssessment" ADD CONSTRAINT "TrainingAssessment_score_check" CHECK (
  "score" >= 0 AND "maximumScore" > 0 AND "score" <= "maximumScore"
);
ALTER TABLE "StaffCertification" ADD CONSTRAINT "StaffCertification_subject_check" CHECK (num_nonnulls("courseId", "competencyId", "enrollmentId") >= 1);
ALTER TABLE "StaffCertification" ADD CONSTRAINT "StaffCertification_dates_check" CHECK ("expiresAt" IS NULL OR "expiresAt" >= "issuedAt");
ALTER TABLE "StaffCertification" ADD CONSTRAINT "StaffCertification_four_eyes_check" CHECK (
  "verifiedById" IS NULL OR "verifiedById" <> "issuedById"
);
ALTER TABLE "TrainingEvidence" ADD CONSTRAINT "TrainingEvidence_one_parent_check" CHECK (
  num_nonnulls("staffCompetencyId", "sessionId", "enrollmentId", "assessmentId", "certificationId") = 1
);
