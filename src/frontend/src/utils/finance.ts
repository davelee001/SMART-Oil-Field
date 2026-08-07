export const BUDGET_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CLOSED'] as const;
export const FINANCE_ENTRY_TYPES = ['COMMITMENT', 'EXPENDITURE'] as const;
export const FINANCE_RECORD_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;

export type BudgetStatus = typeof BUDGET_STATUSES[number];
export type FinanceEntryType = typeof FINANCE_ENTRY_TYPES[number];
export type FinanceRecordStatus = typeof FINANCE_RECORD_STATUSES[number];

export interface FinanceUser { id: string; name: string; email: string; role: string }
export interface FinanceProject { id: string; title: string; code: string; department: string; managerId: string }
export interface BudgetCategory {
    id: string; code: string; name: string; description: string | null; proposedAmount: string; approvedAmount: string;
}
export interface BudgetFundingSource { id: string; name: string; reference: string | null; amount: string; notes: string | null }
export interface FinancialReportingPeriod {
    id: string; name: string; startDate: string; endDate: string; status: 'OPEN' | 'CLOSED';
}
export interface FinanceDocument { id: string; entryId: string | null; name: string; url: string; mimeType: string | null; createdAt: string }
export interface FinanceEntry {
    id: string; categoryId: string; category: BudgetCategory; periodId: string | null; period: FinancialReportingPeriod | null;
    type: FinanceEntryType; description: string; reference: string; amount: string; transactionDate: string;
    counterparty: string | null; status: FinanceRecordStatus; sourceCommitmentId: string | null;
    createdById: string; createdBy: FinanceUser; reviewedBy: FinanceUser | null; reviewComment: string | null;
    documents: FinanceDocument[];
}
export interface BudgetApproval {
    id: string; action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CLOSED' | 'REOPENED';
    actor: FinanceUser; comment: string | null; createdAt: string;
}
export interface BudgetSummary {
    proposedBudget: number; approvedAllocation: number; actualExpenditure: number; commitments: number;
    remainingBalance: number; variance: number; percentageUtilized: number;
}
export interface ProjectBudget {
    id: string; projectId: string; project: FinanceProject; fiscalYear: number; title: string; currency: string;
    proposedAmount: string; approvedAmount: string; status: BudgetStatus; notes: string | null;
    createdById: string; submittedById: string | null; reviewedById: string | null;
    submittedAt: string | null; reviewedAt: string | null; reviewComment: string | null;
    categories: BudgetCategory[]; fundingSources: BudgetFundingSource[]; periods: FinancialReportingPeriod[];
    entries: FinanceEntry[]; documents: FinanceDocument[]; approvals: BudgetApproval[]; summary: BudgetSummary;
    createdAt: string; updatedAt: string;
}
