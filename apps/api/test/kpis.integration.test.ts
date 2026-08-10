import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  KpiAggregation, KpiDataType, KpiDirection, KpiFrequency, KpiIndicatorStatus, KpiMeasurementStatus,
  KpiPeriodStatus, KpiSourceType, ResultsFrameworkStatus, Role, User,
} from '@prisma/client';

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() }, project: { findMany: vi.fn() },
  resultsFramework: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  resultLevel: { findUnique: vi.fn(), create: vi.fn() },
  kpiIndicator: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  kpiReportingPeriod: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  kpiTarget: { upsert: vi.fn() }, kpiMeasurement: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  kpiDataSource: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() }, kpiEvidence: { create: vi.fn() },
  kpiWorkflowEvent: { findMany: vi.fn(), create: vi.fn() }, auditLog: { create: vi.fn() },
  $queryRaw: vi.fn(), $disconnect: vi.fn(),
}));
vi.mock('@smart-oil-field/database', () => ({ prisma: prismaMock }));
import { createApp } from '../src/app';

const userId = 'dff73f65-8808-46e5-a347-9947280baaa4';
const otherId = '6533f167-b17a-4ec9-b35a-cbb1ac99079e';
const projectId = 'cded935f-c715-44eb-92d9-e20f95f83a55';
const frameworkId = '5ba9660b-0190-4f2a-b19a-00cb26d369b4';
const indicatorId = '85e4a9db-0d26-4bbd-b7dc-ecf3bf699f95';
const periodId = 'a104b8d9-0a7c-4965-ae69-e98dc81d1bc3';
const measurementId = '715d9631-dca3-4bd3-b0c9-7aa26428fc62';

const makeUser = (role: Role): User => ({ id: userId, name: 'M&E User', email: 'me@example.com', passwordHash: '', role, walletAddress: null, isActive: true, tokenVersion: 0, lastLoginAt: null, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') });
const project = { id: projectId, code: 'WI-001', title: 'Well Integrity', department: 'Operations', managerId: userId, assignments: [{ userId }] };
const framework = { id: frameworkId, projectId, code: 'RF-001', name: 'Well Integrity Results', description: null, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'), status: ResultsFrameworkStatus.ACTIVE, ownerId: userId, createdAt: new Date(), updatedAt: new Date(), project, owner: { id: userId, name: 'M&E User', email: 'me@example.com', role: Role.ME_OFFICER }, resultLevels: [], indicators: [], periods: [] };
const period = { id: periodId, frameworkId, name: 'Q1 2026', startDate: new Date('2026-01-01'), endDate: new Date('2026-03-31'), dueDate: new Date('2026-04-15'), status: KpiPeriodStatus.OPEN, createdById: otherId, submittedById: null, reviewedById: null, submittedAt: null, reviewedAt: null, reviewComment: null, createdAt: new Date(), updatedAt: new Date() };
const measurement = { id: measurementId, indicatorId, periodId, actualValue: 80, measuredAt: new Date('2026-03-15'), narrative: null, disaggregation: null, sourceType: KpiSourceType.MANUAL, sourceReference: null, status: KpiMeasurementStatus.VERIFIED, createdById: otherId, verifiedById: userId, submittedAt: new Date(), verifiedAt: new Date(), verificationComment: 'Accepted', createdAt: new Date(), updatedAt: new Date(), createdBy: { id: otherId, name: 'Reporter', email: 'reporter@example.com', role: Role.PROJECT_MANAGER }, verifiedBy: { id: userId, name: 'M&E User', email: 'me@example.com', role: Role.ME_OFFICER }, evidence: [] };
const indicator = { id: indicatorId, frameworkId, resultLevelId: null, code: 'KPI-001', name: 'Well integrity completion', description: 'Percentage of planned integrity work completed.', unit: '%', dataType: KpiDataType.PERCENTAGE, direction: KpiDirection.INCREASE, frequency: KpiFrequency.QUARTERLY, baselineValue: 40, baselineDate: new Date('2026-01-01'), finalTargetValue: 100, weight: 10, tolerance: 0, disaggregation: null, formula: null, sourceDescription: 'Project records', status: KpiIndicatorStatus.ACTIVE, ownerId: userId, createdAt: new Date(), updatedAt: new Date(), targets: [{ id: 'target', indicatorId, periodId, targetValue: 100, notes: null, createdAt: new Date(), updatedAt: new Date() }], measurements: [measurement], dataSources: [], evidence: [], framework: { ...framework, project }, owner: framework.owner, resultLevel: null };

describe('KPI and performance HTTP integration', () => {
  let user: User;
  beforeAll(() => { process.env.NODE_ENV = 'test'; process.env.JWT_SECRET = 'kpi-performance-tests-secret-that-is-definitely-at-least-sixty-four-characters-long'; process.env.JWT_ISSUER = 'smart-oil-field-api-test'; process.env.JWT_AUDIENCE = 'smart-oil-field-services-test'; });
  beforeEach(async () => {
    vi.clearAllMocks(); user = makeUser(Role.VIEWER); user.passwordHash = await bcrypt.hash('SecurePassword123!', 4);
    prismaMock.user.findUnique.mockImplementation(async ({ where }: { where: { id?: string; email?: string } }) => where.id === user.id || where.email === user.email ? user : null);
    prismaMock.user.update.mockResolvedValue(user); prismaMock.user.findMany.mockResolvedValue([user]); prismaMock.project.findMany.mockResolvedValue([project]);
    prismaMock.resultsFramework.findMany.mockResolvedValue([framework]); prismaMock.resultsFramework.findUnique.mockResolvedValue(framework); prismaMock.resultsFramework.create.mockResolvedValue(framework); prismaMock.resultsFramework.update.mockResolvedValue(framework);
    prismaMock.kpiIndicator.findMany.mockResolvedValue([indicator]); prismaMock.kpiIndicator.findUnique.mockResolvedValue(indicator); prismaMock.kpiIndicator.create.mockResolvedValue(indicator); prismaMock.kpiIndicator.update.mockResolvedValue(indicator);
    prismaMock.kpiReportingPeriod.findMany.mockResolvedValue([period]); prismaMock.kpiReportingPeriod.findUnique.mockResolvedValue(period); prismaMock.kpiReportingPeriod.create.mockResolvedValue(period); prismaMock.kpiReportingPeriod.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...period, ...data }));
    prismaMock.kpiMeasurement.findUnique.mockResolvedValue(measurement); prismaMock.kpiMeasurement.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...measurement, ...data })); prismaMock.kpiMeasurement.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...measurement, ...data }));
    prismaMock.kpiWorkflowEvent.findMany.mockResolvedValue([]); prismaMock.kpiWorkflowEvent.create.mockResolvedValue({}); prismaMock.auditLog.create.mockResolvedValue({});
  });
  afterEach(() => vi.unstubAllGlobals());
  const login = async () => { const agent = request.agent(createApp()); await agent.post('/api/auth/login').send({ email: user.email, password: 'SecurePassword123!' }); return agent; };

  it('calculates weighted portfolio achievement for authenticated viewers', async () => {
    const response = await (await login()).get('/api/kpis/overview');
    expect(response.status).toBe(200); expect(response.body.summary.portfolioScore).toBe(80); expect(response.body.summary.atRisk).toBe(1);
  });
  it('reports the independent verification workload', async () => {
    prismaMock.kpiIndicator.findMany.mockResolvedValue([{ ...indicator, measurements: [measurement, { ...measurement, id: 'submitted-result', status: KpiMeasurementStatus.SUBMITTED }] }]);
    const response = await (await login()).get('/api/kpis/overview');
    expect(response.status).toBe(200); expect(response.body.summary.pendingVerification).toBe(1);
  });
  it('awards full achievement when a decrease KPI beats its target', async () => {
    prismaMock.kpiIndicator.findMany.mockResolvedValue([{ ...indicator, direction: KpiDirection.DECREASE, finalTargetValue: 10, targets: [], measurements: [{ ...measurement, actualValue: 8 }] }]);
    const response = await (await login()).get('/api/kpis/overview');
    expect(response.status).toBe(200); expect(response.body.summary.portfolioScore).toBe(100); expect(response.body.summary.onTrack).toBe(1);
  });
  it('prevents viewers from creating results frameworks', async () => {
    const response = await (await login()).post('/api/kpis/frameworks').send({}); expect(response.status).toBe(403);
  });
  it('allows M&E Officers to create a results framework', async () => {
    user = { ...user, role: Role.ME_OFFICER };
    const response = await (await login()).post('/api/kpis/frameworks').send({ projectId, code: 'RF-001', name: 'Well Integrity Results', startDate: '2026-01-01', endDate: '2026-12-31', status: 'ACTIVE', ownerId: userId });
    expect(response.status).toBe(201); expect(prismaMock.resultsFramework.create).toHaveBeenCalledOnce();
  });
  it('allows assigned Project Managers to report active KPI results', async () => {
    user = { ...user, role: Role.PROJECT_MANAGER };
    const response = await (await login()).post('/api/kpis/measurements').send({ indicatorId, periodId, actualValue: 75, measuredAt: '2026-03-15' });
    expect(response.status).toBe(201); expect(prismaMock.kpiMeasurement.create).toHaveBeenCalledOnce();
  });
  it('prevents targets from being added to archived KPIs', async () => {
    user = { ...user, role: Role.ME_OFFICER };
    prismaMock.kpiIndicator.findUnique.mockResolvedValue({ ...indicator, status: KpiIndicatorStatus.ARCHIVED });
    const response = await (await login()).put('/api/kpis/targets').send({ indicatorId, periodId, targetValue: 90 });
    expect(response.status).toBe(409); expect(prismaMock.kpiTarget.upsert).not.toHaveBeenCalled();
  });
  it('rejects measurements outside the reporting period', async () => {
    user = { ...user, role: Role.PROJECT_MANAGER };
    const response = await (await login()).post('/api/kpis/measurements').send({ indicatorId, periodId, actualValue: 75, measuredAt: '2026-04-20' });
    expect(response.status).toBe(400);
  });
  it('requires provenance for integrated KPI results', async () => {
    user = { ...user, role: Role.PROJECT_MANAGER };
    const response = await (await login()).post('/api/kpis/measurements').send({ indicatorId, periodId, actualValue: 75, measuredAt: '2026-03-15', sourceType: 'FINANCE' });
    expect(response.status).toBe(400); expect(prismaMock.kpiMeasurement.create).not.toHaveBeenCalled();
  });
  it('prevents reporters from verifying their own KPI result', async () => {
    user = { ...user, role: Role.ME_OFFICER }; prismaMock.kpiMeasurement.findUnique.mockResolvedValue({ ...measurement, status: KpiMeasurementStatus.SUBMITTED, createdById: userId });
    const response = await (await login()).post(`/api/kpis/measurements/${measurementId}/decision`).send({ status: 'VERIFIED' });
    expect(response.status).toBe(403);
  });
  it('allows independent M&E verification of submitted results', async () => {
    user = { ...user, role: Role.ME_OFFICER }; prismaMock.kpiMeasurement.findUnique.mockResolvedValue({ ...measurement, status: KpiMeasurementStatus.SUBMITTED, createdById: otherId });
    const response = await (await login()).post(`/api/kpis/measurements/${measurementId}/decision`).send({ status: 'VERIFIED', comment: 'Evidence confirmed' });
    expect(response.status).toBe(200); expect(prismaMock.kpiMeasurement.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ verifiedById: userId }) }));
  });
  it('prevents reporting-period submitters from approving their own submission', async () => {
    user = { ...user, role: Role.ME_OFFICER }; prismaMock.kpiReportingPeriod.findUnique.mockResolvedValue({ ...period, status: KpiPeriodStatus.SUBMITTED, submittedById: userId });
    const response = await (await login()).post(`/api/kpis/periods/${periodId}/decision`).send({ status: 'APPROVED' }); expect(response.status).toBe(403);
  });
  it('rejects non-allow-listed operational connector endpoints', async () => {
    user = { ...user, role: Role.ME_OFFICER };
    const response = await (await login()).post('/api/kpis/data-sources').send({ indicatorId, name: 'External source', sourceType: 'TELEMETRY', endpoint: 'https://attacker.example/data', valuePath: 'value' });
    expect(response.status).toBe(400); expect(prismaMock.kpiDataSource.create).not.toHaveBeenCalled();
  });
  it('synchronizes allow-listed telemetry into the verification workflow', async () => {
    user = { ...user, role: Role.ME_OFFICER };
    prismaMock.kpiDataSource.findUnique.mockResolvedValue({ id: 'source-id', indicatorId, name: 'Telemetry average', sourceType: KpiSourceType.TELEMETRY, endpoint: '/api/telemetry/stats', valuePath: 'avg_temperature', aggregation: KpiAggregation.VALUE, configuration: null, isActive: true, lastSyncedAt: null, lastValue: null, lastError: null, createdAt: new Date(), updatedAt: new Date(), indicator });
    prismaMock.kpiDataSource.update.mockResolvedValue({});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ avg_temperature: 82.5 }) }));
    const response = await (await login()).post('/api/kpis/data-sources/source-id/sync').send({ periodId });
    expect(response.status).toBe(200);
    expect(prismaMock.kpiMeasurement.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actualValue: 82.5, status: KpiMeasurementStatus.SUBMITTED, sourceType: KpiSourceType.TELEMETRY }) }));
  });
  it('rejects insecure KPI evidence links', async () => {
    user = { ...user, role: Role.ME_OFFICER };
    const response = await (await login()).post('/api/kpis/evidence').send({ indicatorId, name: 'Survey', url: 'http://files.example.com/survey.pdf' }); expect(response.status).toBe(400);
  });
  it('blocks period submission while active KPIs lack verified results', async () => {
    user = { ...user, role: Role.PROJECT_MANAGER };
    prismaMock.kpiReportingPeriod.findUnique.mockResolvedValue({ ...period, framework: { ...framework, project, indicators: [indicator] }, measurements: [] });
    const response = await (await login()).post(`/api/kpis/periods/${periodId}/submit`).send({}); expect(response.status).toBe(409);
  });
  it('exports an authenticated KPI performance register', async () => {
    const response = await (await login()).get('/api/kpis/reports/performance.csv');
    expect(response.status).toBe(200); expect(response.headers['content-type']).toContain('text/csv'); expect(response.headers['cache-control']).toContain('no-store'); expect(response.text).toContain('KPI-001');
  });
});
