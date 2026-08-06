import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectStatus, Role, User } from '@prisma/client';

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  project: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  projectObjective: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  projectActivity: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  projectMilestone: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  projectDeliverable: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  projectRisk: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  projectAssignment: { create: vi.fn(), delete: vi.fn() },
  auditLog: { create: vi.fn() },
  $queryRaw: vi.fn(),
  $disconnect: vi.fn(),
}));

vi.mock('@smart-oil-field/database', () => ({ prisma: prismaMock }));

import { createApp } from '../src/app';

const userId = 'ad40cac1-2f86-4a8d-a3c7-372c5cc9fa62';
const otherId = '897c5cfb-237f-4fdb-b909-c51be7f927f4';
const projectId = '6c117f32-9fd0-4f4d-906e-0d4772b6b393';

const makeUser = (role: Role): User => ({
  id: userId, name: 'Project User', email: 'project@example.com', passwordHash: '', role,
  walletAddress: null, isActive: true, tokenVersion: 0, lastLoginAt: null,
  createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
});

const makeProject = (managerId = userId) => ({
  id: projectId, title: 'Well Integrity Improvement', code: 'WI-001', department: 'Operations',
  location: 'Block A', managerId, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'),
  status: ProjectStatus.ACTIVE, progress: 25, createdAt: new Date(), updatedAt: new Date(),
  manager: { id: managerId, name: 'Project Manager', email: 'manager@example.com', role: Role.PROJECT_MANAGER },
  objectives: [], activities: [], milestones: [], deliverables: [], risks: [], assignments: [],
});

describe('project management HTTP integration', () => {
  let user: User;
  let project = makeProject();

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'project-tests-secret-that-is-at-least-sixty-four-characters-long';
    process.env.JWT_ISSUER = 'smart-oil-field-api-test';
    process.env.JWT_AUDIENCE = 'smart-oil-field-services-test';
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    user = makeUser(Role.VIEWER);
    user.passwordHash = await bcrypt.hash('SecurePassword123!', 4);
    project = makeProject();
    prismaMock.user.findUnique.mockImplementation(async ({ where }: { where: { id?: string; email?: string } }) =>
      where.id === user.id || where.email === user.email ? user : null);
    prismaMock.user.findFirst.mockResolvedValue(user);
    prismaMock.user.findMany.mockResolvedValue([user]);
    prismaMock.user.update.mockImplementation(async () => user);
    prismaMock.project.findMany.mockResolvedValue([project]);
    prismaMock.project.findUnique.mockImplementation(async () => project);
    prismaMock.project.create.mockImplementation(async () => project);
    prismaMock.project.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...project, ...data }));
    prismaMock.auditLog.create.mockResolvedValue({});
    prismaMock.projectActivity.create.mockResolvedValue({ id: 'activity-id', projectId, title: 'Inspect wells', status: 'NOT_STARTED' });
  });

  const login = async () => {
    const agent = request.agent(createApp());
    await agent.post('/api/auth/login').send({ email: user.email, password: 'SecurePassword123!' });
    return agent;
  };

  it('allows any authenticated PMS user to read project records', async () => {
    const agent = await login();
    const response = await agent.get('/api/projects');
    expect(response.status).toBe(200);
    expect(response.body.projects[0].code).toBe('WI-001');
  });

  it('prevents a Viewer from creating projects', async () => {
    const agent = await login();
    const response = await agent.post('/api/projects').send({});
    expect(response.status).toBe(403);
  });

  it('allows a Project Manager to create a project assigned to themselves', async () => {
    user = { ...user, role: Role.PROJECT_MANAGER };
    const agent = await login();
    const response = await agent.post('/api/projects').send({
      title: project.title, code: project.code, department: project.department, location: project.location,
      managerId: user.id, startDate: '2026-01-01', endDate: '2026-12-31', objectives: ['Improve integrity'],
    });
    expect(response.status).toBe(201);
    expect(prismaMock.project.create).toHaveBeenCalledOnce();
  });

  it('prevents a Project Manager from assigning a new project to someone else', async () => {
    user = { ...user, role: Role.PROJECT_MANAGER };
    const agent = await login();
    const response = await agent.post('/api/projects').send({
      title: project.title, code: project.code, department: project.department, location: project.location,
      managerId: otherId, startDate: '2026-01-01', endDate: '2026-12-31',
    });
    expect(response.status).toBe(403);
  });

  it('prevents a Project Manager from editing another manager’s project', async () => {
    user = { ...user, role: Role.PROJECT_MANAGER };
    project = makeProject(otherId);
    const agent = await login();
    const response = await agent.patch(`/api/projects/${projectId}`).send({ progress: 50 });
    expect(response.status).toBe(403);
  });

  it('allows a Project Manager to add activities to their project', async () => {
    user = { ...user, role: Role.PROJECT_MANAGER };
    const agent = await login();
    const response = await agent.post(`/api/projects/${projectId}/activities`).send({ title: 'Inspect wells', progress: 0 });
    expect(response.status).toBe(201);
    expect(response.body.activity.title).toBe('Inspect wells');
  });
});
