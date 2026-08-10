import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DeliveryStatus, PurchaseRequestStatus, QualificationStatus, Role, SupplierContractStatus,
  SupplierSector, SupplierStatus, User,
} from '@prisma/client';

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  project: { findMany: vi.fn() },
  supplier: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  supplierQualification: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  supplierContract: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  purchaseRequest: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  supplierDelivery: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  supplierPerformanceReview: { findMany: vi.fn(), create: vi.fn() },
  supplierEvidence: { create: vi.fn() },
  supplierWorkflowEvent: { findMany: vi.fn(), create: vi.fn() },
  auditLog: { create: vi.fn() },
  $queryRaw: vi.fn(), $disconnect: vi.fn(),
}));
vi.mock('@smart-oil-field/database', () => ({ prisma: prismaMock }));
import { createApp } from '../src/app';

const userId = 'dff73f65-8808-46e5-a347-9947280baaa4';
const otherId = '6533f167-b17a-4ec9-b35a-cbb1ac99079e';
const supplierId = 'cded935f-c715-44eb-92d9-e20f95f83a55';
const qualificationId = '5ba9660b-0190-4f2a-b19a-00cb26d369b4';
const requestId = '85e4a9db-0d26-4bbd-b7dc-ecf3bf699f95';

const makeUser = (role: Role): User => ({
  id: userId, name: 'Supply User', email: 'supply@example.com', passwordHash: '', role,
  walletAddress: null, isActive: true, tokenVersion: 0, lastLoginAt: null,
  createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
});
const supplier = {
  id: supplierId, supplierCode: 'SUP-001', legalName: 'Petro Services Ltd', tradingName: null,
  registrationNumber: 'REG-001', taxNumber: null, sector: SupplierSector.UPSTREAM, categories: ['Well services'],
  country: 'South Sudan', address: null, contactName: 'Supplier Contact', contactEmail: 'contact@example.com',
  contactPhone: null, status: SupplierStatus.QUALIFIED, localContentPercentage: 60, hseCertification: 'ISO 45001',
  notes: null, createdById: otherId, createdAt: new Date(), updatedAt: new Date(), qualifications: [], performanceReviews: [], evidence: [],
  createdBy: { id: otherId, name: 'Other User', email: 'other@example.com', role: Role.SUPPLY_CHAIN_OFFICER },
};
const qualification = {
  id: qualificationId, supplierId, reference: 'QUAL-001', submittedAt: new Date(), reviewedAt: null, expiresAt: new Date('2027-12-31'),
  status: QualificationStatus.UNDER_REVIEW, technicalScore: null, financialScore: null, hseScore: null,
  localContentScore: null, overallScore: null, reviewerId: null, notes: null, createdAt: new Date(), updatedAt: new Date(), supplier,
};
const purchase = {
  id: requestId, requestNumber: 'PR-001', supplierId, contractId: null, projectId: null, title: 'Wellhead valves',
  description: 'Procure replacement wellhead valves for operations.', requiredBy: new Date('2027-01-01'), currency: 'USD',
  estimatedAmount: 10000, status: PurchaseRequestStatus.SUBMITTED, createdById: otherId, reviewedById: null,
  submittedAt: new Date(), reviewedAt: null, reviewComment: null, createdAt: new Date(), updatedAt: new Date(),
};

describe('supply-chain and supplier-performance HTTP integration', () => {
  let user: User;
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'supply-chain-tests-secret-that-is-at-least-sixty-four-characters-long';
    process.env.JWT_ISSUER = 'smart-oil-field-api-test';
    process.env.JWT_AUDIENCE = 'smart-oil-field-services-test';
  });
  beforeEach(async () => {
    vi.clearAllMocks();
    user = makeUser(Role.VIEWER); user.passwordHash = await bcrypt.hash('SecurePassword123!', 4);
    prismaMock.user.findUnique.mockImplementation(async ({ where }: { where: { id?: string; email?: string } }) => where.id === user.id || where.email === user.email ? user : null);
    prismaMock.user.update.mockResolvedValue(user); prismaMock.user.findMany.mockResolvedValue([user]); prismaMock.project.findMany.mockResolvedValue([]);
    prismaMock.supplier.findMany.mockResolvedValue([supplier]); prismaMock.supplier.findUnique.mockResolvedValue(supplier);
    prismaMock.supplier.create.mockResolvedValue(supplier); prismaMock.supplier.update.mockResolvedValue(supplier);
    prismaMock.supplierQualification.findMany.mockResolvedValue([qualification]); prismaMock.supplierQualification.findUnique.mockResolvedValue(qualification);
    prismaMock.supplierQualification.create.mockResolvedValue(qualification); prismaMock.supplierQualification.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...qualification, ...data }));
    prismaMock.supplierContract.findMany.mockResolvedValue([]); prismaMock.purchaseRequest.findMany.mockResolvedValue([purchase]);
    prismaMock.purchaseRequest.findUnique.mockResolvedValue(purchase); prismaMock.purchaseRequest.create.mockResolvedValue(purchase);
    prismaMock.purchaseRequest.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...purchase, ...data }));
    prismaMock.supplierDelivery.findMany.mockResolvedValue([]); prismaMock.supplierPerformanceReview.findMany.mockResolvedValue([]);
    prismaMock.supplierWorkflowEvent.findMany.mockResolvedValue([]); prismaMock.supplierWorkflowEvent.create.mockResolvedValue({}); prismaMock.auditLog.create.mockResolvedValue({});
  });
  const login = async () => {
    const agent = request.agent(createApp());
    await agent.post('/api/auth/login').send({ email: user.email, password: 'SecurePassword123!' });
    return agent;
  };

  it('allows authenticated viewers to read supplier performance', async () => {
    const response = await (await login()).get('/api/supply-chain/overview');
    expect(response.status).toBe(200); expect(response.body.summary.totalSuppliers).toBe(1);
  });
  it('prevents viewers from registering suppliers', async () => {
    const response = await (await login()).post('/api/supply-chain/suppliers').send({});
    expect(response.status).toBe(403);
  });
  it('allows Supply Chain Officers to register suppliers', async () => {
    user = { ...user, role: Role.SUPPLY_CHAIN_OFFICER };
    const response = await (await login()).post('/api/supply-chain/suppliers').send({
      supplierCode: 'SUP-001', legalName: supplier.legalName, sector: 'UPSTREAM', categories: ['Well services'], country: 'South Sudan',
      contactName: 'Supplier Contact', contactEmail: 'contact@example.com', localContentPercentage: 60,
    });
    expect(response.status).toBe(201); expect(prismaMock.supplier.create).toHaveBeenCalledOnce();
  });
  it('prevents supplier registrants from deciding their own qualification', async () => {
    user = { ...user, role: Role.SUPPLY_CHAIN_OFFICER };
    prismaMock.supplierQualification.findUnique.mockResolvedValue({ ...qualification, supplier: { ...supplier, createdById: userId } });
    const response = await (await login()).post(`/api/supply-chain/qualifications/${qualificationId}/decision`).send({ status: 'APPROVED', technicalScore: 80, financialScore: 80, hseScore: 80, localContentScore: 80 });
    expect(response.status).toBe(403);
  });
  it('calculates and persists the qualification score', async () => {
    user = { ...user, role: Role.ADMINISTRATOR };
    const response = await (await login()).post(`/api/supply-chain/qualifications/${qualificationId}/decision`).send({ status: 'APPROVED', technicalScore: 90, financialScore: 80, hseScore: 70, localContentScore: 60 });
    expect(response.status).toBe(200);
    expect(prismaMock.supplierQualification.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ overallScore: 75 }) }));
  });
  it('lets project managers create procurement requests', async () => {
    user = { ...user, role: Role.PROJECT_MANAGER };
    const response = await (await login()).post('/api/supply-chain/purchase-requests').send({ requestNumber: 'PR-001', supplierId, title: purchase.title, description: purchase.description, requiredBy: '2027-01-01', currency: 'USD', estimatedAmount: 10000 });
    expect(response.status).toBe(201);
  });
  it('prevents requesters from approving their own request', async () => {
    user = { ...user, role: Role.SUPPLY_CHAIN_OFFICER };
    prismaMock.purchaseRequest.findUnique.mockResolvedValue({ ...purchase, createdById: userId });
    const response = await (await login()).post(`/api/supply-chain/purchase-requests/${requestId}/decision`).send({ status: 'APPROVED' });
    expect(response.status).toBe(403);
  });
  it('calculates a five-dimension supplier performance score', async () => {
    user = { ...user, role: Role.SUPPLY_CHAIN_OFFICER };
    prismaMock.supplierPerformanceReview.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'review-id', ...data }));
    const response = await (await login()).post('/api/supply-chain/performance-reviews').send({ supplierId, periodStart: '2026-01-01', periodEnd: '2026-03-31', qualityScore: 90, deliveryScore: 80, hseScore: 70, localContentScore: 60, costScore: 50 });
    expect(response.status).toBe(201);
    expect(prismaMock.supplierPerformanceReview.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ overallScore: 70 }) }));
  });
  it('rejects insecure evidence links', async () => {
    user = { ...user, role: Role.SUPPLY_CHAIN_OFFICER };
    const response = await (await login()).post('/api/supply-chain/evidence').send({ supplierId, name: 'Registration', url: 'http://files.example.com/registration.pdf' });
    expect(response.status).toBe(400);
  });
  it('exports an authenticated supplier CSV register', async () => {
    const response = await (await login()).get('/api/supply-chain/reports/suppliers.csv');
    expect(response.status).toBe(200); expect(response.headers['content-type']).toContain('text/csv'); expect(response.text).toContain('SUP-001');
  });
});
