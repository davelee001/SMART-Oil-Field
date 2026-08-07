import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BudgetStatus, FinanceEntryType, FinanceRecordStatus, FinancialPeriodStatus, Prisma, Role, User,
} from '@prisma/client';

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn() },
  project: { findUnique: vi.fn(), findMany: vi.fn() },
  projectBudget: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  budgetCategory: { create: vi.fn(), update: vi.fn() },
  budgetFundingSource: { create: vi.fn() },
  financialReportingPeriod: { create: vi.fn(), update: vi.fn() },
  financeEntry: { create: vi.fn(), update: vi.fn() },
  financeDocument: { create: vi.fn() },
  budgetApproval: { create: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(), $queryRaw: vi.fn(), $disconnect: vi.fn(),
}));

vi.mock('@smart-oil-field/database', () => ({ prisma: prismaMock }));
import { createApp } from '../src/app';

const userId = '8e84ef97-630e-4ca8-8b94-a4e47f78e976';
const otherId = '937374ed-9277-4a46-9514-0b69122d8eb8';
const projectId = '8da1936e-66ac-459f-9173-6e2e2be053be';
const budgetId = 'e659354f-607f-4d54-b756-cc58ea96c63d';
const categoryId = '90a975ad-a6e5-4496-a267-46d16586618f';
const periodId = '8f9ff806-e7ef-4e51-9e55-6af01ea6e25b';

const makeUser = (role: Role): User => ({
  id: userId, name: 'Finance User', email: 'finance@example.com', passwordHash: '', role,
  walletAddress: null, isActive: true, tokenVersion: 0, lastLoginAt: null,
  createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
});
const project = { id: projectId, title: 'Field Rehabilitation', code: 'FR-001', department: 'Operations', managerId: userId };
const category = {
  id: categoryId, budgetId, code: 'CAPEX', name: 'Capital works', description: null,
  proposedAmount: new Prisma.Decimal(100000), approvedAmount: new Prisma.Decimal(0), createdAt: new Date(), updatedAt: new Date(),
};
const period = {
  id: periodId, budgetId, name: 'Q1', startDate: new Date('2026-01-01'), endDate: new Date('2026-03-31'),
  status: FinancialPeriodStatus.OPEN, createdAt: new Date(), updatedAt: new Date(),
};
const makeBudget = (status = BudgetStatus.DRAFT, managerId = userId) => ({
  id: budgetId, projectId, fiscalYear: 2026, title: 'FY2026 Field Rehabilitation', currency: 'USD',
  proposedAmount: new Prisma.Decimal(100000), approvedAmount: new Prisma.Decimal(status === BudgetStatus.APPROVED ? 100000 : 0),
  status, notes: null, createdById: userId, submittedById: status === BudgetStatus.SUBMITTED ? otherId : null,
  reviewedById: null, submittedAt: null, reviewedAt: null, reviewComment: null, createdAt: new Date(), updatedAt: new Date(),
  project: { ...project, managerId }, createdBy: { id: userId, name: 'Finance User', email: 'finance@example.com', role: Role.FINANCE_OFFICER },
  submittedBy: null, reviewedBy: null, categories: [category], fundingSources: [], periods: [period], entries: [], documents: [], approvals: [],
});

describe('budgeting and finance HTTP integration', () => {
  let user: User;
  let budget = makeBudget();

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'finance-tests-secret-that-is-at-least-sixty-four-characters-long';
    process.env.JWT_ISSUER = 'smart-oil-field-api-test';
    process.env.JWT_AUDIENCE = 'smart-oil-field-services-test';
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    user = makeUser(Role.VIEWER);
    user.passwordHash = await bcrypt.hash('SecurePassword123!', 4);
    budget = makeBudget();
    prismaMock.user.findUnique.mockImplementation(async ({ where }: { where: { id?: string; email?: string } }) =>
      where.id === user.id || where.email === user.email ? user : null);
    prismaMock.user.update.mockResolvedValue(user);
    prismaMock.project.findUnique.mockResolvedValue(project);
    prismaMock.project.findMany.mockResolvedValue([project]);
    prismaMock.projectBudget.findUnique.mockImplementation(async () => budget);
    prismaMock.projectBudget.findMany.mockImplementation(async () => [budget]);
    prismaMock.projectBudget.create.mockImplementation(async () => budget);
    prismaMock.projectBudget.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...budget, ...data }));
    prismaMock.budgetCategory.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...category, ...data }));
    prismaMock.budgetApproval.create.mockResolvedValue({});
    prismaMock.auditLog.create.mockResolvedValue({});
    prismaMock.financeEntry.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'df7978ad-0c86-4bf4-a900-651cb1fdb6fa', ...data, status: FinanceRecordStatus.DRAFT,
      category, period, createdBy: { id: user.id, name: user.name, email: user.email, role: user.role }, reviewedBy: null, documents: [],
    }));
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock));
  });

  const login = async () => {
    const agent = request.agent(createApp());
    await agent.post('/api/auth/login').send({ email: user.email, password: 'SecurePassword123!' });
    return agent;
  };

  it('allows an authenticated Viewer to read finance reports', async () => {
    const response = await (await login()).get('/api/finance/budgets');
    expect(response.status).toBe(200);
    expect(response.body.budgets[0].summary.proposedBudget).toBe(100000);
  });

  it('prevents a Viewer from creating an annual project budget', async () => {
    const response = await (await login()).post('/api/finance/budgets').send({});
    expect(response.status).toBe(403);
  });

  it('allows a Project Manager to create a budget for their project', async () => {
    user = { ...user, role: Role.PROJECT_MANAGER };
    const response = await (await login()).post('/api/finance/budgets').send({
      projectId, fiscalYear: 2026, title: 'FY2026 Field Rehabilitation', currency: 'USD', proposedAmount: '100000.00',
    });
    expect(response.status).toBe(201);
    expect(prismaMock.projectBudget.create).toHaveBeenCalledOnce();
  });

  it('prevents a Project Manager from budgeting another manager\'s project', async () => {
    user = { ...user, role: Role.PROJECT_MANAGER };
    prismaMock.project.findUnique.mockResolvedValue({ ...project, managerId: otherId });
    const response = await (await login()).post('/api/finance/budgets').send({
      projectId, fiscalYear: 2026, title: 'FY2026 Field Rehabilitation', proposedAmount: '100000.00',
    });
    expect(response.status).toBe(403);
  });

  it('submits a categorized annual budget into the approval workflow', async () => {
    user = { ...user, role: Role.PROJECT_MANAGER };
    const response = await (await login()).post(`/api/finance/budgets/${budgetId}/submit`);
    expect(response.status).toBe(200);
    expect(prismaMock.budgetApproval.create).toHaveBeenCalledOnce();
    expect(prismaMock.projectBudget.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: BudgetStatus.SUBMITTED }),
    }));
  });

  it('allows a Finance Officer to approve another user\'s submitted budget', async () => {
    user = { ...user, role: Role.FINANCE_OFFICER };
    budget = makeBudget(BudgetStatus.SUBMITTED);
    const response = await (await login()).post(`/api/finance/budgets/${budgetId}/decision`).send({ decision: 'APPROVED' });
    expect(response.status).toBe(200);
    expect(prismaMock.budgetCategory.update).toHaveBeenCalledOnce();
    expect(prismaMock.projectBudget.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: BudgetStatus.APPROVED }),
    }));
  });

  it('enforces four-eyes review for submitted budgets', async () => {
    user = { ...user, role: Role.FINANCE_OFFICER };
    budget = { ...makeBudget(BudgetStatus.SUBMITTED), submittedById: userId };
    const response = await (await login()).post(`/api/finance/budgets/${budgetId}/decision`).send({ decision: 'APPROVED' });
    expect(response.status).toBe(409);
  });

  it('records commitments only against an approved annual budget', async () => {
    user = { ...user, role: Role.FINANCE_OFFICER };
    budget = makeBudget(BudgetStatus.APPROVED);
    const response = await (await login()).post(`/api/finance/budgets/${budgetId}/entries`).send({
      type: FinanceEntryType.COMMITMENT, categoryId, periodId, description: 'Wellhead equipment order',
      reference: 'PO-2026-001', amount: '15000.00', transactionDate: '2026-02-10', counterparty: 'Field Supplies Ltd',
    });
    expect(response.status).toBe(201);
    expect(response.body.entry.type).toBe(FinanceEntryType.COMMITMENT);
  });

  it('blocks approval that would exceed a category allocation', async () => {
    user = { ...user, role: Role.FINANCE_OFFICER };
    budget = {
      ...makeBudget(BudgetStatus.APPROVED),
      entries: [{
        id: 'cfbc6e64-f891-4c41-8b81-b413537e8b78', budgetId, categoryId, category: { ...category, approvedAmount: new Prisma.Decimal(100000) },
        periodId, period, type: FinanceEntryType.COMMITMENT, description: 'Oversized procurement', reference: 'PO-LARGE',
        amount: new Prisma.Decimal(110000), transactionDate: new Date(), counterparty: null,
        status: FinanceRecordStatus.SUBMITTED, sourceCommitmentId: null, createdById: otherId, reviewedById: null,
        submittedAt: new Date(), reviewedAt: null, reviewComment: null, createdAt: new Date(), updatedAt: new Date(),
        createdBy: { id: otherId, name: 'Project Manager', email: 'pm@example.com', role: Role.PROJECT_MANAGER },
        reviewedBy: null, documents: [], realizations: [],
      }],
    };
    const response = await (await login()).post(`/api/finance/budgets/${budgetId}/entries/${budget.entries[0].id}/decision`).send({ decision: 'APPROVED' });
    expect(response.status).toBe(409);
    expect(response.body.message).toContain('category allocation');
  });

  it('rejects insecure supporting-document URLs', async () => {
    user = { ...user, role: Role.FINANCE_OFFICER };
    budget = makeBudget(BudgetStatus.APPROVED);
    const response = await (await login()).post(`/api/finance/budgets/${budgetId}/documents`).send({
      name: 'Supplier invoice', url: 'http://files.example.com/invoice.pdf', mimeType: 'application/pdf',
    });
    expect(response.status).toBe(400);
  });
});
