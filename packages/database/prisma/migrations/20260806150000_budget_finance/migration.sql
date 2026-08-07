CREATE TYPE "BudgetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CLOSED');
CREATE TYPE "FinancialPeriodStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "FinanceEntryType" AS ENUM ('COMMITMENT', 'EXPENDITURE');
CREATE TYPE "FinanceRecordStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "FinanceApprovalAction" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'CLOSED', 'REOPENED');

CREATE TABLE "ProjectBudget" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "proposedAmount" DECIMAL(18,2) NOT NULL,
    "approvedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "BudgetStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "submittedById" UUID,
    "reviewedById" UUID,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectBudget_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProjectBudget_fiscalYear_check" CHECK ("fiscalYear" BETWEEN 2000 AND 2200),
    CONSTRAINT "ProjectBudget_amount_check" CHECK ("proposedAmount" >= 0 AND "approvedAmount" >= 0)
);

CREATE TABLE "BudgetCategory" (
    "id" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "proposedAmount" DECIMAL(18,2) NOT NULL,
    "approvedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BudgetCategory_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BudgetCategory_amount_check" CHECK ("proposedAmount" >= 0 AND "approvedAmount" >= 0)
);

CREATE TABLE "BudgetFundingSource" (
    "id" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "reference" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BudgetFundingSource_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BudgetFundingSource_amount_check" CHECK ("amount" >= 0)
);

CREATE TABLE "FinancialReportingPeriod" (
    "id" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "FinancialPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinancialReportingPeriod_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FinancialReportingPeriod_date_check" CHECK ("endDate" >= "startDate")
);

CREATE TABLE "FinanceEntry" (
    "id" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "periodId" UUID,
    "type" "FinanceEntryType" NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "counterparty" TEXT,
    "status" "FinanceRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceCommitmentId" UUID,
    "createdById" UUID NOT NULL,
    "reviewedById" UUID,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinanceEntry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FinanceEntry_amount_check" CHECK ("amount" > 0),
    CONSTRAINT "FinanceEntry_commitment_link_check" CHECK ("type" = 'EXPENDITURE' OR "sourceCommitmentId" IS NULL)
);

CREATE TABLE "FinanceDocument" (
    "id" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "entryId" UUID,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BudgetApproval" (
    "id" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "action" "FinanceApprovalAction" NOT NULL,
    "actorId" UUID NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BudgetApproval_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectBudget_projectId_fiscalYear_key" ON "ProjectBudget"("projectId", "fiscalYear");
CREATE INDEX "ProjectBudget_fiscalYear_status_idx" ON "ProjectBudget"("fiscalYear", "status");
CREATE INDEX "ProjectBudget_createdById_idx" ON "ProjectBudget"("createdById");
CREATE UNIQUE INDEX "BudgetCategory_budgetId_code_key" ON "BudgetCategory"("budgetId", "code");
CREATE INDEX "BudgetCategory_budgetId_idx" ON "BudgetCategory"("budgetId");
CREATE INDEX "BudgetFundingSource_budgetId_idx" ON "BudgetFundingSource"("budgetId");
CREATE UNIQUE INDEX "FinancialReportingPeriod_budgetId_name_key" ON "FinancialReportingPeriod"("budgetId", "name");
CREATE INDEX "FinancialReportingPeriod_budgetId_startDate_endDate_idx" ON "FinancialReportingPeriod"("budgetId", "startDate", "endDate");
CREATE UNIQUE INDEX "FinanceEntry_budgetId_reference_key" ON "FinanceEntry"("budgetId", "reference");
CREATE INDEX "FinanceEntry_budgetId_type_status_idx" ON "FinanceEntry"("budgetId", "type", "status");
CREATE INDEX "FinanceEntry_categoryId_idx" ON "FinanceEntry"("categoryId");
CREATE INDEX "FinanceEntry_periodId_idx" ON "FinanceEntry"("periodId");
CREATE INDEX "FinanceEntry_sourceCommitmentId_idx" ON "FinanceEntry"("sourceCommitmentId");
CREATE INDEX "FinanceEntry_createdById_idx" ON "FinanceEntry"("createdById");
CREATE INDEX "FinanceDocument_budgetId_idx" ON "FinanceDocument"("budgetId");
CREATE INDEX "FinanceDocument_entryId_idx" ON "FinanceDocument"("entryId");
CREATE INDEX "BudgetApproval_budgetId_createdAt_idx" ON "BudgetApproval"("budgetId", "createdAt");
CREATE INDEX "BudgetApproval_actorId_idx" ON "BudgetApproval"("actorId");

ALTER TABLE "ProjectBudget" ADD CONSTRAINT "ProjectBudget_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectBudget" ADD CONSTRAINT "ProjectBudget_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectBudget" ADD CONSTRAINT "ProjectBudget_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectBudget" ADD CONSTRAINT "ProjectBudget_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BudgetCategory" ADD CONSTRAINT "BudgetCategory_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "ProjectBudget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BudgetFundingSource" ADD CONSTRAINT "BudgetFundingSource_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "ProjectBudget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialReportingPeriod" ADD CONSTRAINT "FinancialReportingPeriod_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "ProjectBudget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "ProjectBudget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BudgetCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "FinancialReportingPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_sourceCommitmentId_fkey" FOREIGN KEY ("sourceCommitmentId") REFERENCES "FinanceEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinanceDocument" ADD CONSTRAINT "FinanceDocument_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "ProjectBudget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceDocument" ADD CONSTRAINT "FinanceDocument_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "FinanceEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceDocument" ADD CONSTRAINT "FinanceDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BudgetApproval" ADD CONSTRAINT "BudgetApproval_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "ProjectBudget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BudgetApproval" ADD CONSTRAINT "BudgetApproval_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
