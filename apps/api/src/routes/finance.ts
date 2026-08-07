import { Router } from 'express';
import {
  BudgetStatus, FinanceApprovalAction, FinanceEntryType, FinanceRecordStatus,
  FinancialPeriodStatus, Prisma, Role,
} from '@prisma/client';
import { prisma } from '@smart-oil-field/database';
import { z } from 'zod';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

const userSelect = { id: true, name: true, email: true, role: true };
const budgetInclude = Prisma.validator<Prisma.ProjectBudgetInclude>()({
  project: { select: { id: true, title: true, code: true, department: true, managerId: true } },
  createdBy: { select: userSelect }, submittedBy: { select: userSelect }, reviewedBy: { select: userSelect },
  categories: { orderBy: { code: 'asc' } },
  fundingSources: { orderBy: { name: 'asc' } },
  periods: { orderBy: { startDate: 'asc' } },
  entries: {
    include: {
      category: true, period: true, createdBy: { select: userSelect }, reviewedBy: { select: userSelect },
      documents: true,
      realizations: { where: { type: FinanceEntryType.EXPENDITURE, status: FinanceRecordStatus.APPROVED } },
    },
    orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
  },
  documents: { where: { entryId: null }, include: { uploadedBy: { select: userSelect } }, orderBy: { createdAt: 'desc' } },
  approvals: { include: { actor: { select: userSelect } }, orderBy: { createdAt: 'desc' } },
});

type BudgetPayload = Prisma.ProjectBudgetGetPayload<{ include: typeof budgetInclude }>;
const money = z.union([z.string(), z.number()]).transform(String)
  .refine((value) => /^\d{1,16}(\.\d{1,2})?$/.test(value), 'Use a non-negative monetary amount with at most two decimals');
const uuid = z.string().uuid();
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const currentYear = new Date().getUTCFullYear();

const budgetSchema = z.object({
  projectId: uuid,
  fiscalYear: z.number().int().min(2000).max(2200).default(currentYear),
  title: z.string().trim().min(3).max(200),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default('USD'),
  proposedAmount: money,
  notes: optionalText(3000),
});
const budgetUpdateSchema = budgetSchema.omit({ projectId: true }).partial();
const categorySchema = z.object({
  code: z.string().trim().min(1).max(30).regex(/^[A-Za-z0-9_-]+$/).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(160), description: optionalText(1000),
  proposedAmount: money, approvedAmount: money.optional(),
});
const fundingSchema = z.object({
  name: z.string().trim().min(2).max(160), reference: optionalText(100), amount: money, notes: optionalText(1000),
});
const periodSchema = z.object({
  name: z.string().trim().min(2).max(100), startDate: z.coerce.date(), endDate: z.coerce.date(),
  status: z.nativeEnum(FinancialPeriodStatus).default(FinancialPeriodStatus.OPEN),
}).refine((value) => value.endDate >= value.startDate, { message: 'Period end date must be on or after its start date', path: ['endDate'] });
const entryBaseSchema = z.object({
  categoryId: uuid, periodId: uuid.nullable().optional(), type: z.nativeEnum(FinanceEntryType),
  description: z.string().trim().min(3).max(1000),
  reference: z.string().trim().min(2).max(80).transform((value) => value.toUpperCase()),
  amount: money, transactionDate: z.coerce.date(), counterparty: optionalText(200), sourceCommitmentId: uuid.nullable().optional(),
});
const entrySchema = entryBaseSchema.refine((value) => value.type === FinanceEntryType.EXPENDITURE || !value.sourceCommitmentId, {
  message: 'Only expenditures can realize a commitment', path: ['sourceCommitmentId'],
});
const documentSchema = z.object({
  entryId: uuid.nullable().optional(), name: z.string().trim().min(2).max(200),
  url: z.string().trim().url().max(2000).refine((value) => value.startsWith('https://') || value.startsWith('http://localhost'), 'Use an HTTPS document URL'), mimeType: optionalText(120),
});
const decisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']), comment: z.string().trim().max(2000).nullable().optional(),
  approvedAmount: money.optional(),
  categoryAllocations: z.array(z.object({ categoryId: uuid, approvedAmount: money })).optional(),
});

const budgetCreators: Role[] = [Role.ADMINISTRATOR, Role.FINANCE_OFFICER, Role.PROJECT_MANAGER, Role.DEPARTMENT_HEAD];
const financeReviewers: Role[] = [Role.ADMINISTRATOR, Role.FINANCE_OFFICER];
const isReviewer = (role: Role) => financeReviewers.includes(role);
const canManageProjectFinance = (user: Express.Request['authUser'], project: { managerId: string }) => Boolean(user && (
  user.role === Role.ADMINISTRATOR || user.role === Role.FINANCE_OFFICER || user.role === Role.DEPARTMENT_HEAD ||
  (user.role === Role.PROJECT_MANAGER && project.managerId === user.id)
));
const mutableBudgetStatuses: BudgetStatus[] = [BudgetStatus.DRAFT, BudgetStatus.REJECTED];
const mutableEntryStatuses: FinanceRecordStatus[] = [FinanceRecordStatus.DRAFT, FinanceRecordStatus.REJECTED];
const toNumber = (value: Prisma.Decimal | string | number) => Number(value);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const withSummary = (budget: BudgetPayload) => {
  const approvedExpenditure = sum(budget.entries
    .filter((entry) => entry.type === FinanceEntryType.EXPENDITURE && entry.status === FinanceRecordStatus.APPROVED)
    .map((entry) => toNumber(entry.amount)));
  const outstandingCommitments = sum(budget.entries
    .filter((entry) => entry.type === FinanceEntryType.COMMITMENT && entry.status === FinanceRecordStatus.APPROVED)
    .map((entry) => Math.max(0, toNumber(entry.amount) - sum(entry.realizations.map((item) => toNumber(item.amount))))));
  const approvedAllocation = toNumber(budget.approvedAmount);
  return {
    ...budget,
    summary: {
      proposedBudget: toNumber(budget.proposedAmount), approvedAllocation,
      actualExpenditure: roundMoney(approvedExpenditure), commitments: roundMoney(outstandingCommitments),
      remainingBalance: roundMoney(approvedAllocation - approvedExpenditure - outstandingCommitments),
      variance: roundMoney(approvedAllocation - approvedExpenditure),
      percentageUtilized: approvedAllocation > 0 ? roundMoney((approvedExpenditure / approvedAllocation) * 100) : 0,
    },
  };
};

const loadBudget = (id: string) => prisma.projectBudget.findUnique({ where: { id }, include: budgetInclude });
const audit = (actorId: string, action: string, budgetId: string, metadata?: Prisma.InputJsonValue) =>
  prisma.auditLog.create({ data: { actorId, action, entityType: 'ProjectBudget', entityId: budgetId, metadata } });
const ensureBudgetManager = (budget: BudgetPayload, user: Express.Request['authUser']) => canManageProjectFinance(user, budget.project);

router.get('/options', async (_req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { title: 'asc' }, select: { id: true, title: true, code: true, department: true, managerId: true },
    });
    return res.json({ projects, currencies: ['USD', 'SSP', 'EUR', 'GBP'] });
  } catch (error) { return next(error); }
});

router.get('/budgets', async (req, res, next) => {
  try {
    const query = z.object({
      projectId: uuid.optional(), fiscalYear: z.coerce.number().int().optional(), status: z.nativeEnum(BudgetStatus).optional(),
    }).parse(req.query);
    const budgets = await prisma.projectBudget.findMany({ where: query, include: budgetInclude, orderBy: [{ fiscalYear: 'desc' }, { createdAt: 'desc' }] });
    return res.json({ budgets: budgets.map(withSummary) });
  } catch (error) { return next(error); }
});

router.post('/budgets', async (req, res, next) => {
  try {
    if (!budgetCreators.includes(req.authUser!.role)) return res.status(403).json({ message: 'Your role cannot create project budgets' });
    const input = budgetSchema.parse(req.body);
    const project = await prisma.project.findUnique({ where: { id: input.projectId }, select: { id: true, managerId: true } });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!canManageProjectFinance(req.authUser, project)) return res.status(403).json({ message: 'You cannot create a budget for this project' });
    const budget = await prisma.projectBudget.create({ data: { ...input, createdById: req.authUser!.id }, include: budgetInclude });
    await audit(req.authUser!.id, 'BUDGET_CREATED', budget.id, { fiscalYear: budget.fiscalYear, projectId: budget.projectId });
    return res.status(201).json({ budget: withSummary(budget) });
  } catch (error) { return next(error); }
});

router.get('/budgets/:budgetId', async (req, res, next) => {
  try {
    const budget = await loadBudget(req.params.budgetId);
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    return res.json({ budget: withSummary(budget) });
  } catch (error) { return next(error); }
});

router.patch('/budgets/:budgetId', async (req, res, next) => {
  try {
    const budget = await loadBudget(req.params.budgetId);
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    if (!ensureBudgetManager(budget, req.authUser)) return res.status(403).json({ message: 'You cannot manage this budget' });
    if (!mutableBudgetStatuses.includes(budget.status)) return res.status(409).json({ message: 'Only draft or rejected budgets can be edited' });
    const input = budgetUpdateSchema.parse(req.body);
    const updated = await prisma.projectBudget.update({
      where: { id: budget.id }, data: { ...input, status: BudgetStatus.DRAFT, reviewComment: null }, include: budgetInclude,
    });
    await audit(req.authUser!.id, 'BUDGET_UPDATED', budget.id);
    return res.json({ budget: withSummary(updated) });
  } catch (error) { return next(error); }
});

router.post('/budgets/:budgetId/submit', async (req, res, next) => {
  try {
    const budget = await loadBudget(req.params.budgetId);
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    if (!ensureBudgetManager(budget, req.authUser)) return res.status(403).json({ message: 'You cannot submit this budget' });
    if (!mutableBudgetStatuses.includes(budget.status)) return res.status(409).json({ message: 'Only draft or rejected budgets can be submitted' });
    if (budget.categories.length === 0 || budget.periods.length === 0) return res.status(400).json({ message: 'Add at least one category and reporting period before submission' });
    const categoryTotal = roundMoney(sum(budget.categories.map((category) => toNumber(category.proposedAmount))));
    if (categoryTotal !== roundMoney(toNumber(budget.proposedAmount))) return res.status(400).json({ message: 'Category allocations must equal the proposed annual budget' });
    const fundingTotal = roundMoney(sum(budget.fundingSources.map((source) => toNumber(source.amount))));
    if (budget.fundingSources.length > 0 && fundingTotal !== roundMoney(toNumber(budget.proposedAmount))) {
      return res.status(400).json({ message: 'Funding sources must equal the proposed annual budget' });
    }
    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      await tx.budgetApproval.create({ data: { budgetId: budget.id, actorId: req.authUser!.id, action: FinanceApprovalAction.SUBMITTED } });
      return tx.projectBudget.update({ where: { id: budget.id }, data: {
        status: BudgetStatus.SUBMITTED, submittedById: req.authUser!.id, submittedAt: now, reviewedById: null, reviewedAt: null, reviewComment: null,
      }, include: budgetInclude });
    });
    await audit(req.authUser!.id, 'BUDGET_SUBMITTED', budget.id);
    return res.json({ budget: withSummary(updated) });
  } catch (error) { return next(error); }
});

router.post('/budgets/:budgetId/decision', async (req, res, next) => {
  try {
    if (!isReviewer(req.authUser!.role)) return res.status(403).json({ message: 'Only Finance Officers and Administrators can review budgets' });
    const budget = await loadBudget(req.params.budgetId);
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    if (budget.status !== BudgetStatus.SUBMITTED) return res.status(409).json({ message: 'Only submitted budgets can be reviewed' });
    if (budget.submittedById === req.authUser!.id) return res.status(409).json({ message: 'A budget must be reviewed by someone other than its submitter' });
    const input = decisionSchema.parse(req.body);
    if (input.decision === 'REJECTED' && !input.comment) return res.status(400).json({ message: 'A rejection reason is required' });
    const approvedAmount = input.approvedAmount ?? budget.proposedAmount.toString();
    const allocations = input.categoryAllocations ?? budget.categories.map((category) => ({
      categoryId: category.id, approvedAmount: category.proposedAmount.toString(),
    }));
    if (input.decision === 'APPROVED') {
      if (Number(approvedAmount) > toNumber(budget.proposedAmount)) return res.status(400).json({ message: 'Approved allocation cannot exceed the proposed annual budget' });
      if (allocations.length !== budget.categories.length || allocations.some((item) => !budget.categories.some((category) => category.id === item.categoryId))) {
        return res.status(400).json({ message: 'Provide one allocation for every budget category' });
      }
      const allocationTotal = roundMoney(sum(allocations.map((item) => Number(item.approvedAmount))));
      if (allocationTotal !== roundMoney(Number(approvedAmount))) return res.status(400).json({ message: 'Category approvals must equal the approved annual allocation' });
    }
    const now = new Date();
    const status = input.decision === 'APPROVED' ? BudgetStatus.APPROVED : BudgetStatus.REJECTED;
    const updated = await prisma.$transaction(async (tx) => {
      if (status === BudgetStatus.APPROVED) {
        await Promise.all(allocations.map((item) => tx.budgetCategory.update({ where: { id: item.categoryId }, data: { approvedAmount: item.approvedAmount } })));
      }
      await tx.budgetApproval.create({ data: {
        budgetId: budget.id, actorId: req.authUser!.id,
        action: status === BudgetStatus.APPROVED ? FinanceApprovalAction.APPROVED : FinanceApprovalAction.REJECTED,
        comment: input.comment,
      } });
      return tx.projectBudget.update({ where: { id: budget.id }, data: {
        status, approvedAmount: status === BudgetStatus.APPROVED ? approvedAmount : 0,
        reviewedById: req.authUser!.id, reviewedAt: now, reviewComment: input.comment,
      }, include: budgetInclude });
    });
    await audit(req.authUser!.id, `BUDGET_${input.decision}`, budget.id, { comment: input.comment ?? null });
    return res.json({ budget: withSummary(updated) });
  } catch (error) { return next(error); }
});

router.post('/budgets/:budgetId/categories', async (req, res, next) => {
  try {
    const budget = await loadBudget(req.params.budgetId);
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    if (!ensureBudgetManager(budget, req.authUser)) return res.status(403).json({ message: 'You cannot manage this budget' });
    if (!mutableBudgetStatuses.includes(budget.status)) return res.status(409).json({ message: 'Budget categories are locked after submission' });
    const input = categorySchema.parse(req.body);
    const item = await prisma.budgetCategory.create({ data: { budgetId: budget.id, ...input } });
    await audit(req.authUser!.id, 'BUDGET_CATEGORY_CREATED', budget.id, { categoryId: item.id });
    return res.status(201).json({ category: item });
  } catch (error) { return next(error); }
});

router.delete('/budgets/:budgetId/categories/:categoryId', async (req, res, next) => {
  try {
    const budget = await loadBudget(req.params.budgetId);
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    if (!ensureBudgetManager(budget, req.authUser)) return res.status(403).json({ message: 'You cannot manage this budget' });
    if (!mutableBudgetStatuses.includes(budget.status)) return res.status(409).json({ message: 'Budget categories are locked after submission' });
    await prisma.budgetCategory.delete({ where: { id: req.params.categoryId, budgetId: budget.id } });
    await audit(req.authUser!.id, 'BUDGET_CATEGORY_DELETED', budget.id, { categoryId: req.params.categoryId });
    return res.status(204).send();
  } catch (error) { return next(error); }
});

router.post('/budgets/:budgetId/funding-sources', async (req, res, next) => {
  try {
    const budget = await loadBudget(req.params.budgetId);
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    if (!ensureBudgetManager(budget, req.authUser)) return res.status(403).json({ message: 'You cannot manage this budget' });
    if (!mutableBudgetStatuses.includes(budget.status)) return res.status(409).json({ message: 'Funding sources are locked after submission' });
    const item = await prisma.budgetFundingSource.create({ data: { budgetId: budget.id, ...fundingSchema.parse(req.body) } });
    await audit(req.authUser!.id, 'BUDGET_FUNDING_SOURCE_CREATED', budget.id, { fundingSourceId: item.id });
    return res.status(201).json({ fundingSource: item });
  } catch (error) { return next(error); }
});

router.delete('/budgets/:budgetId/funding-sources/:sourceId', async (req, res, next) => {
  try {
    const budget = await loadBudget(req.params.budgetId);
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    if (!ensureBudgetManager(budget, req.authUser)) return res.status(403).json({ message: 'You cannot manage this budget' });
    if (!mutableBudgetStatuses.includes(budget.status)) return res.status(409).json({ message: 'Funding sources are locked after submission' });
    await prisma.budgetFundingSource.delete({ where: { id: req.params.sourceId, budgetId: budget.id } });
    await audit(req.authUser!.id, 'BUDGET_FUNDING_SOURCE_DELETED', budget.id, { fundingSourceId: req.params.sourceId });
    return res.status(204).send();
  } catch (error) { return next(error); }
});

router.post('/budgets/:budgetId/periods', async (req, res, next) => {
  try {
    const budget = await loadBudget(req.params.budgetId);
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    if (!ensureBudgetManager(budget, req.authUser)) return res.status(403).json({ message: 'You cannot manage this budget' });
    if (!mutableBudgetStatuses.includes(budget.status) && !isReviewer(req.authUser!.role)) return res.status(409).json({ message: 'Only finance reviewers can add periods after submission' });
    const input = periodSchema.parse(req.body);
    if (input.startDate.getUTCFullYear() !== budget.fiscalYear || input.endDate.getUTCFullYear() !== budget.fiscalYear) {
      return res.status(400).json({ message: 'Reporting periods must fall within the budget fiscal year' });
    }
    const item = await prisma.financialReportingPeriod.create({ data: { budgetId: budget.id, ...input } });
    await audit(req.authUser!.id, 'FINANCIAL_PERIOD_CREATED', budget.id, { periodId: item.id });
    return res.status(201).json({ period: item });
  } catch (error) { return next(error); }
});

router.delete('/budgets/:budgetId/periods/:periodId', async (req, res, next) => {
  try {
    const budget = await loadBudget(req.params.budgetId);
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    if (!ensureBudgetManager(budget, req.authUser)) return res.status(403).json({ message: 'You cannot manage this budget' });
    if (!mutableBudgetStatuses.includes(budget.status)) return res.status(409).json({ message: 'Reporting periods are locked after submission' });
    await prisma.financialReportingPeriod.delete({ where: { id: req.params.periodId, budgetId: budget.id } });
    await audit(req.authUser!.id, 'FINANCIAL_PERIOD_DELETED', budget.id, { periodId: req.params.periodId });
    return res.status(204).send();
  } catch (error) { return next(error); }
});

router.patch('/budgets/:budgetId/periods/:periodId', async (req, res, next) => {
  try {
    const budget = await loadBudget(req.params.budgetId);
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    if (!isReviewer(req.authUser!.role)) return res.status(403).json({ message: 'Only Finance Officers and Administrators can close reporting periods' });
    const item = await prisma.financialReportingPeriod.update({
      where: { id: req.params.periodId, budgetId: budget.id }, data: z.object({ status: z.nativeEnum(FinancialPeriodStatus) }).parse(req.body),
    });
    await audit(req.authUser!.id, 'FINANCIAL_PERIOD_STATUS_CHANGED', budget.id, { periodId: item.id, status: item.status });
    return res.json({ period: item });
  } catch (error) { return next(error); }
});

router.post('/budgets/:budgetId/entries', async (req, res, next) => {
  try {
    const budget = await loadBudget(req.params.budgetId);
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    if (!ensureBudgetManager(budget, req.authUser)) return res.status(403).json({ message: 'You cannot record finance activity for this project' });
    if (budget.status !== BudgetStatus.APPROVED) return res.status(409).json({ message: 'Finance entries require an approved budget' });
    const input = entrySchema.parse(req.body);
    const category = budget.categories.find((item) => item.id === input.categoryId);
    if (!category) return res.status(400).json({ message: 'Category does not belong to this budget' });
    if (input.periodId) {
      const period = budget.periods.find((item) => item.id === input.periodId);
      if (!period) return res.status(400).json({ message: 'Reporting period does not belong to this budget' });
      if (period.status === FinancialPeriodStatus.CLOSED) return res.status(409).json({ message: 'The selected reporting period is closed' });
    }
    if (input.sourceCommitmentId) {
      const commitment = budget.entries.find((item) => item.id === input.sourceCommitmentId);
      if (!commitment || commitment.type !== FinanceEntryType.COMMITMENT || commitment.status !== FinanceRecordStatus.APPROVED) {
        return res.status(400).json({ message: 'Source commitment must be an approved commitment in this budget' });
      }
      if (commitment.categoryId !== input.categoryId) return res.status(400).json({ message: 'Expenditure and source commitment must use the same category' });
    }
    const entry = await prisma.financeEntry.create({ data: { budgetId: budget.id, createdById: req.authUser!.id, ...input }, include: {
      category: true, period: true, createdBy: { select: userSelect }, reviewedBy: { select: userSelect }, documents: true,
    } });
    await audit(req.authUser!.id, 'FINANCE_ENTRY_CREATED', budget.id, { entryId: entry.id, type: entry.type });
    return res.status(201).json({ entry });
  } catch (error) { return next(error); }
});

router.patch('/budgets/:budgetId/entries/:entryId', async (req, res, next) => {
  try {
    const budget = await loadBudget(req.params.budgetId);
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    const entry = budget.entries.find((item) => item.id === req.params.entryId);
    if (!entry) return res.status(404).json({ message: 'Finance entry not found' });
    if (!(isReviewer(req.authUser!.role) || entry.createdById === req.authUser!.id)) return res.status(403).json({ message: 'You cannot edit this finance entry' });
    if (!mutableEntryStatuses.includes(entry.status)) return res.status(409).json({ message: 'Only draft or rejected entries can be edited' });
    const input = entryBaseSchema.partial().parse(req.body);
    const updated = await prisma.financeEntry.update({ where: { id: entry.id }, data: { ...input, status: FinanceRecordStatus.DRAFT, reviewComment: null } });
    await audit(req.authUser!.id, 'FINANCE_ENTRY_UPDATED', budget.id, { entryId: entry.id });
    return res.json({ entry: updated });
  } catch (error) { return next(error); }
});

router.post('/budgets/:budgetId/entries/:entryId/submit', async (req, res, next) => {
  try {
    const budget = await loadBudget(req.params.budgetId);
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    const entry = budget.entries.find((item) => item.id === req.params.entryId);
    if (!entry) return res.status(404).json({ message: 'Finance entry not found' });
    if (!(isReviewer(req.authUser!.role) || entry.createdById === req.authUser!.id)) return res.status(403).json({ message: 'You cannot submit this finance entry' });
    if (!mutableEntryStatuses.includes(entry.status)) return res.status(409).json({ message: 'Only draft or rejected entries can be submitted' });
    const updated = await prisma.financeEntry.update({ where: { id: entry.id }, data: {
      status: FinanceRecordStatus.SUBMITTED, submittedAt: new Date(), reviewedById: null, reviewedAt: null, reviewComment: null,
    } });
    await audit(req.authUser!.id, 'FINANCE_ENTRY_SUBMITTED', budget.id, { entryId: entry.id });
    return res.json({ entry: updated });
  } catch (error) { return next(error); }
});

router.post('/budgets/:budgetId/entries/:entryId/decision', async (req, res, next) => {
  try {
    if (!isReviewer(req.authUser!.role)) return res.status(403).json({ message: 'Only Finance Officers and Administrators can review finance entries' });
    const budget = await loadBudget(req.params.budgetId);
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    const entry = budget.entries.find((item) => item.id === req.params.entryId);
    if (!entry) return res.status(404).json({ message: 'Finance entry not found' });
    if (entry.status !== FinanceRecordStatus.SUBMITTED) return res.status(409).json({ message: 'Only submitted entries can be reviewed' });
    if (entry.createdById === req.authUser!.id) return res.status(409).json({ message: 'A finance entry must be reviewed by someone other than its creator' });
    const input = decisionSchema.pick({ decision: true, comment: true }).parse(req.body);
    if (input.decision === 'REJECTED' && !input.comment) return res.status(400).json({ message: 'A rejection reason is required' });
    if (input.decision === 'APPROVED') {
      const categoryAllocation = toNumber(entry.category.approvedAmount);
      const categoryEntries = budget.entries.filter((item) => item.categoryId === entry.categoryId && item.id !== entry.id);
      const approvedSpend = sum(categoryEntries.filter((item) => item.type === FinanceEntryType.EXPENDITURE && item.status === FinanceRecordStatus.APPROVED).map((item) => toNumber(item.amount)));
      const outstanding = sum(categoryEntries.filter((item) => item.type === FinanceEntryType.COMMITMENT && item.status === FinanceRecordStatus.APPROVED).map((item) =>
        Math.max(0, toNumber(item.amount) - sum(item.realizations.map((realization) => toNumber(realization.amount))))));
      let nextEncumbered = approvedSpend + outstanding + toNumber(entry.amount);
      if (entry.type === FinanceEntryType.EXPENDITURE && entry.sourceCommitmentId) {
        const commitment = budget.entries.find((item) => item.id === entry.sourceCommitmentId);
        const remainingCommitment = commitment ? Math.max(0, toNumber(commitment.amount) - sum(commitment.realizations.map((item) => toNumber(item.amount)))) : 0;
        if (toNumber(entry.amount) > remainingCommitment) return res.status(409).json({ message: 'Expenditure exceeds the remaining source commitment' });
        nextEncumbered -= toNumber(entry.amount);
      }
      if (roundMoney(nextEncumbered) > roundMoney(categoryAllocation)) return res.status(409).json({ message: 'Approval would exceed the category allocation' });
    }
    const updated = await prisma.financeEntry.update({ where: { id: entry.id }, data: {
      status: input.decision === 'APPROVED' ? FinanceRecordStatus.APPROVED : FinanceRecordStatus.REJECTED,
      reviewedById: req.authUser!.id, reviewedAt: new Date(), reviewComment: input.comment,
    } });
    await audit(req.authUser!.id, `FINANCE_ENTRY_${input.decision}`, budget.id, { entryId: entry.id, comment: input.comment ?? null });
    return res.json({ entry: updated });
  } catch (error) { return next(error); }
});

router.post('/budgets/:budgetId/documents', async (req, res, next) => {
  try {
    const budget = await loadBudget(req.params.budgetId);
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    if (!ensureBudgetManager(budget, req.authUser)) return res.status(403).json({ message: 'You cannot attach documents to this budget' });
    const input = documentSchema.parse(req.body);
    if (input.entryId && !budget.entries.some((item) => item.id === input.entryId)) return res.status(400).json({ message: 'Finance entry does not belong to this budget' });
    const document = await prisma.financeDocument.create({ data: { budgetId: budget.id, uploadedById: req.authUser!.id, ...input } });
    await audit(req.authUser!.id, 'FINANCE_DOCUMENT_ATTACHED', budget.id, { documentId: document.id, entryId: input.entryId ?? null });
    return res.status(201).json({ document });
  } catch (error) { return next(error); }
});

export default router;
