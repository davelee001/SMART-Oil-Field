import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { OperatorScope, Role, User } from '@prisma/client';

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  auditLog: { create: vi.fn() },
  $queryRaw: vi.fn(),
  $disconnect: vi.fn(),
}));

vi.mock('@smart-oil-field/database', () => ({ prisma: prismaMock }));

import { createApp } from '../src/app';

const baseUser = (): User => ({
  id: 'b66b45b2-d823-4c58-8c2a-c7b627dce9c3',
  name: 'PMS User',
  email: 'user@example.com',
  passwordHash: '',
  role: Role.VIEWER,
  operatorScope: OperatorScope.SPOC,
  walletAddress: null,
  isActive: true,
  tokenVersion: 0,
  lastLoginAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
});

describe('authentication and authorization HTTP integration', () => {
  let user: User;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'integration-secret-that-is-at-least-sixty-four-characters-for-tests';
    process.env.JWT_ISSUER = 'smart-oil-field-api-test';
    process.env.JWT_AUDIENCE = 'smart-oil-field-services-test';
    process.env.JWT_TTL_MINUTES = '10';
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    user = baseUser();
    user.passwordHash = await bcrypt.hash('SecurePassword123!', 4);
    prismaMock.user.findUnique.mockImplementation(async ({ where }: { where: { id?: string; email?: string } }) => {
      if (where.id === user.id || where.email === user.email) return user;
      return null;
    });
    prismaMock.user.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      if (data.lastLoginAt) user = { ...user, lastLoginAt: data.lastLoginAt as Date };
      if (data.tokenVersion) user = { ...user, tokenVersion: user.tokenVersion + 1 };
      return user;
    });
    prismaMock.user.findMany.mockImplementation(async () => [user]);
    prismaMock.auditLog.create.mockResolvedValue({});
  });

  it('logs in, sets a secure HTTP-only cookie and restores the user', async () => {
    const agent = request.agent(createApp());
    const login = await agent.post('/api/auth/login').send({
      email: user.email,
      password: 'SecurePassword123!',
    });

    expect(login.status).toBe(200);
    expect(login.body.accessToken).toEqual(expect.any(String));
    expect(login.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(login.headers['set-cookie'][0]).toContain('SameSite=Lax');

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(user.email);
    expect(me.body.user).not.toHaveProperty('passwordHash');
  });

  it('rejects invalid credentials without revealing account state', async () => {
    const response = await request(createApp()).post('/api/auth/login').send({
      email: user.email,
      password: 'WrongPassword123!',
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid email or password');
  });

  it('denies a Viewer access to administrator user management', async () => {
    const agent = request.agent(createApp());
    await agent.post('/api/auth/login').send({ email: user.email, password: 'SecurePassword123!' });

    const response = await agent.get('/api/admin/users');
    expect(response.status).toBe(403);
  });

  it('allows an Administrator to list users', async () => {
    user = { ...user, role: Role.ADMINISTRATOR };
    const agent = request.agent(createApp());
    await agent.post('/api/auth/login').send({ email: user.email, password: 'SecurePassword123!' });

    const response = await agent.get('/api/admin/users');
    expect(response.status).toBe(200);
    expect(response.body.users).toHaveLength(1);
  });

  it('allows an Administrator to create a Supply Chain Officer', async () => {
    user = { ...user, role: Role.ADMINISTRATOR };
    const createdUser = {
      ...baseUser(),
      id: '08a54892-ad76-49c9-802c-f55dfb839058',
      email: 'supply@example.com',
      name: 'Supply Officer',
      role: Role.SUPPLY_CHAIN_OFFICER,
      operatorScope: OperatorScope.SPOC,
    };
    prismaMock.user.create.mockResolvedValue(createdUser);
    const agent = request.agent(createApp());
    await agent.post('/api/auth/login').send({ email: user.email, password: 'SecurePassword123!' });

    const response = await agent.post('/api/admin/users').send({
      name: createdUser.name,
      email: createdUser.email,
      password: 'TemporaryPassword123!',
      role: Role.SUPPLY_CHAIN_OFFICER,
      operatorScope: OperatorScope.SPOC,
    });

    expect(response.status).toBe(201);
    expect(response.body.user.role).toBe(Role.SUPPLY_CHAIN_OFFICER);
    expect(response.body.user.operatorScope).toBe(OperatorScope.SPOC);
    expect(prismaMock.auditLog.create).toHaveBeenCalledOnce();
  });

  it('limits an operator user to their assigned workspace', async () => {
    const agent = request.agent(createApp());
    await agent.post('/api/auth/login').send({ email: user.email, password: 'SecurePassword123!' });

    expect((await agent.get('/api/operators/spoc')).status).toBe(200);
    expect((await agent.get('/api/operators/dpoc')).status).toBe(403);
    expect((await agent.get('/api/operators/gpoc')).status).toBe(403);
  });

  it('allows an Administrator to access every operator workspace', async () => {
    user = { ...user, role: Role.ADMINISTRATOR, operatorScope: null };
    const agent = request.agent(createApp());
    await agent.post('/api/auth/login').send({ email: user.email, password: 'SecurePassword123!' });

    expect((await agent.get('/api/operators/spoc')).status).toBe(200);
    expect((await agent.get('/api/operators/dpoc')).status).toBe(200);
    expect((await agent.get('/api/operators/gpoc')).status).toBe(200);
  });

  it('invalidates an issued token after the account token version changes', async () => {
    const agent = request.agent(createApp());
    await agent.post('/api/auth/login').send({ email: user.email, password: 'SecurePassword123!' });
    user = { ...user, tokenVersion: user.tokenVersion + 1 };

    const response = await agent.get('/api/auth/me');
    expect(response.status).toBe(401);
  });

  it('rejects a valid token when the account has been disabled', async () => {
    const agent = request.agent(createApp());
    await agent.post('/api/auth/login').send({ email: user.email, password: 'SecurePassword123!' });
    user = { ...user, isActive: false };

    const response = await agent.get('/api/auth/me');
    expect(response.status).toBe(401);
  });
});
