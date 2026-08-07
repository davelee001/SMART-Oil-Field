import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ComplianceObligationStatus, ComplianceRegisterStatus, EscalationLevel, NonConformitySeverity,
  NonConformityStatus, RegulationType, Role, User,
} from '@prisma/client';

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  project: { findMany: vi.fn() },
  complianceRegulation: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  complianceObligation: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  compliancePermit: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  complianceInspection: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  nonConformity: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  correctiveAction: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  complianceEvidence: { create: vi.fn() },
  complianceWorkflowEvent: { findMany: vi.fn(), create: vi.fn() },
  auditLog: { create: vi.fn() },
  $queryRaw: vi.fn(), $disconnect: vi.fn(),
}));
vi.mock('@smart-oil-field/database', () => ({ prisma: prismaMock }));
import { createApp } from '../src/app';

const userId = 'dff73f65-8808-46e5-a347-9947280baaa4';
const otherId = '6533f167-b17a-4ec9-b35a-cbb1ac99079e';
const regulationId = 'cded935f-c715-44eb-92d9-e20f95f83a55';
const obligationId = '5ba9660b-0190-4f2a-b19a-00cb26d369b4';
const findingId = '85e4a9db-0d26-4bbd-b7dc-ecf3bf699f95';

const makeUser = (role: Role): User => ({
  id: userId, name: 'Compliance User', email: 'compliance@example.com', passwordHash: '', role,
  walletAddress: null, isActive: true, tokenVersion: 0, lastLoginAt: null,
  createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
});
const regulation = {
  id: regulationId, code: 'PET-REG-01', title: 'Petroleum Operations Regulation', type: RegulationType.REGULATION,
  jurisdiction: 'National', regulator: 'Petroleum Authority', description: 'Controls safe petroleum operations.',
  effectiveDate: new Date('2025-01-01'), reviewDate: null, status: ComplianceRegisterStatus.ACTIVE,
  createdById: userId, createdAt: new Date(), updatedAt: new Date(),
};
const obligation = {
  id: obligationId, regulationId, projectId: null, reference: 'OBL-001', title: 'Submit production return',
  requirement: 'Submit the monthly production return to the authority.', department: 'Operations',
  responsibleOfficerId: userId, dueDate: new Date('2026-12-31'), frequency: 'Monthly', weight: 10,
  status: ComplianceObligationStatus.IN_PROGRESS, completedAt: null, verifiedById: null, verifiedAt: null,
  verificationComment: null, createdAt: new Date(), updatedAt: new Date(), regulation,
  project: null, responsibleOfficer: { id: userId, name: 'Compliance User', email: 'compliance@example.com', role: Role.COMPLIANCE_OFFICER },
  verifiedBy: null, evidence: [],
};
const finding = {
  id: findingId, obligationId, inspectionId: null, projectId: null, reference: 'NC-001', title: 'Late production return',
  description: 'The required production return was submitted after the deadline.', severity: NonConformitySeverity.HIGH,
  status: NonConformityStatus.OPEN, detectedAt: new Date('2026-04-01'), dueDate: new Date('2026-04-30'),
  responsibleOfficerId: userId, rootCause: null, escalationLevel: EscalationLevel.NONE, escalatedAt: null, closedAt: null,
  createdAt: new Date(), updatedAt: new Date(), obligation: { id: obligationId, reference: 'OBL-001', title: obligation.title },
  inspection: null, project: null, responsibleOfficer: obligation.responsibleOfficer, correctiveActions: [], evidence: [],
};

describe('compliance and regulation HTTP integration', () => {
  let user: User;
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'compliance-tests-secret-that-is-at-least-sixty-four-characters-long';
    process.env.JWT_ISSUER = 'smart-oil-field-api-test';
    process.env.JWT_AUDIENCE = 'smart-oil-field-services-test';
  });
  beforeEach(async () => {
    vi.clearAllMocks();
    user = makeUser(Role.VIEWER);
    user.passwordHash = await bcrypt.hash('SecurePassword123!', 4);
    prismaMock.user.findUnique.mockImplementation(async ({ where }: { where: { id?: string; email?: string } }) => where.id === user.id || where.email === user.email ? user : null);
    prismaMock.user.update.mockResolvedValue(user);
    prismaMock.user.findMany.mockResolvedValue([user]); prismaMock.project.findMany.mockResolvedValue([]);
    prismaMock.complianceRegulation.findMany.mockResolvedValue([regulation]); prismaMock.complianceRegulation.findUnique.mockResolvedValue(regulation);
    prismaMock.complianceRegulation.create.mockResolvedValue(regulation); prismaMock.complianceRegulation.update.mockResolvedValue(regulation);
    prismaMock.complianceObligation.findMany.mockResolvedValue([obligation]); prismaMock.complianceObligation.findUnique.mockResolvedValue(obligation);
    prismaMock.complianceObligation.create.mockResolvedValue(obligation); prismaMock.complianceObligation.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...obligation, ...data }));
    prismaMock.compliancePermit.findMany.mockResolvedValue([]); prismaMock.complianceInspection.findMany.mockResolvedValue([]);
    prismaMock.nonConformity.findMany.mockResolvedValue([finding]); prismaMock.nonConformity.findUnique.mockResolvedValue(finding);
    prismaMock.nonConformity.create.mockResolvedValue(finding); prismaMock.nonConformity.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...finding, ...data }));
    prismaMock.correctiveAction.findMany.mockResolvedValue([]); prismaMock.complianceWorkflowEvent.findMany.mockResolvedValue([]);
    prismaMock.complianceWorkflowEvent.create.mockResolvedValue({}); prismaMock.auditLog.create.mockResolvedValue({});
  });
  const login = async () => {
    const agent = request.agent(createApp());
    await agent.post('/api/auth/login').send({ email: user.email, password: 'SecurePassword123!' });
    return agent;
  };

  it('allows authenticated viewers to read the compliance dashboard', async () => {
    const response = await (await login()).get('/api/compliance/overview');
    expect(response.status).toBe(200);
    expect(response.body.summary.totalObligations).toBe(1);
    expect(response.body.summary.complianceScore).toBe(50);
  });
  it('prevents viewers from changing the regulation register', async () => {
    const response = await (await login()).post('/api/compliance/regulations').send({});
    expect(response.status).toBe(403);
  });
  it('allows a Compliance Officer to create a regulation', async () => {
    user = { ...user, role: Role.COMPLIANCE_OFFICER };
    const response = await (await login()).post('/api/compliance/regulations').send({
      code: regulation.code, title: regulation.title, type: regulation.type, jurisdiction: regulation.jurisdiction,
      regulator: regulation.regulator, description: regulation.description, effectiveDate: '2025-01-01', status: 'ACTIVE',
    });
    expect(response.status).toBe(201);
    expect(prismaMock.complianceRegulation.create).toHaveBeenCalledOnce();
  });
  it('lets Department Heads create obligations assigned to themselves', async () => {
    user = { ...user, role: Role.DEPARTMENT_HEAD };
    const response = await (await login()).post('/api/compliance/obligations').send({
      regulationId, reference: 'OBL-001', title: obligation.title, requirement: obligation.requirement,
      department: obligation.department, responsibleOfficerId: userId, dueDate: '2026-12-31', weight: 10,
    });
    expect(response.status).toBe(201);
  });
  it('prevents contributors from assigning obligations to another user', async () => {
    user = { ...user, role: Role.PROJECT_MANAGER };
    const response = await (await login()).post('/api/compliance/obligations').send({
      regulationId, reference: 'OBL-002', title: obligation.title, requirement: obligation.requirement,
      department: obligation.department, responsibleOfficerId: otherId, dueDate: '2026-12-31', weight: 10,
    });
    expect(response.status).toBe(403);
  });
  it('allows a compliance reviewer to verify an obligation', async () => {
    user = { ...user, role: Role.COMPLIANCE_OFFICER };
    const response = await (await login()).patch(`/api/compliance/obligations/${obligationId}`).send({ status: 'COMPLIANT', verificationComment: 'Evidence accepted' });
    expect(response.status).toBe(200);
    expect(prismaMock.complianceObligation.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ verifiedById: userId }) }));
  });
  it('validates permit date order before database access', async () => {
    user = { ...user, role: Role.COMPLIANCE_OFFICER };
    const response = await (await login()).post('/api/compliance/permits').send({
      permitNumber: 'LIC-01', title: 'Operating licence', permitType: 'Operating', issuingAuthority: 'Authority', holder: 'Operator',
      issueDate: '2026-12-31', expiryDate: '2026-01-01', responsibleOfficerId: userId,
    });
    expect(response.status).toBe(400);
  });
  it('allows compliance managers to escalate open findings', async () => {
    user = { ...user, role: Role.COMPLIANCE_OFFICER };
    const response = await (await login()).post(`/api/compliance/non-conformities/${findingId}/escalate`).send({ level: 'EXECUTIVE', comment: 'Material regulatory exposure' });
    expect(response.status).toBe(200);
    expect(prismaMock.nonConformity.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ escalationLevel: EscalationLevel.EXECUTIVE }) }));
  });
  it('prevents contributors from closing their own findings', async () => {
    user = { ...user, role: Role.PROJECT_MANAGER };
    const response = await (await login()).patch(`/api/compliance/non-conformities/${findingId}`).send({ status: 'CLOSED' });
    expect(response.status).toBe(403);
  });
  it('rejects insecure evidence links', async () => {
    user = { ...user, role: Role.COMPLIANCE_OFFICER };
    const response = await (await login()).post('/api/compliance/evidence').send({ obligationId, name: 'Monthly return', url: 'http://files.example.com/return.pdf' });
    expect(response.status).toBe(400);
  });
  it('generates an authenticated regulatory CSV export', async () => {
    const response = await (await login()).get('/api/compliance/reports/register.csv');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.text).toContain('OBL-001');
  });
});
