import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  $disconnect: vi.fn(),
}));

vi.mock('@smart-oil-field/database', () => ({ prisma: prismaMock }));

import { createApp } from '../src/app';
import { createAuthenticationRateLimiter, requestContext, validateProductionConfiguration } from '../src/operations';

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
  vi.clearAllMocks();
});

describe('production readiness controls', () => {
  it('separates process liveness from database readiness', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    const app = createApp();
    expect((await request(app).get('/health/live')).body.status).toBe('ok');
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    const ready = await request(app).get('/health/ready');
    expect(ready.status).toBe(200);
    expect(ready.body).toMatchObject({ status: 'ready', database: 'available' });
  });

  it('returns trace identifiers, security headers and no-store API responses', async () => {
    const response = await request(createApp()).get('/api/not-a-route').set('X-Request-Id', 'release-check-123');
    expect(response.status).toBe(404);
    expect(response.headers['x-request-id']).toBe('release-check-123');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.body).toEqual({ message: 'Route not found', requestId: 'release-check-123' });
  });

  it('bounds repeated authentication attempts', async () => {
    const app = express();
    app.set('trust proxy', 1);
    app.use(requestContext);
    app.post('/login', createAuthenticationRateLimiter({ max: 2, windowMs: 60_000 }), (_req, res) => res.sendStatus(204));
    expect((await request(app).post('/login')).status).toBe(204);
    expect((await request(app).post('/login')).status).toBe(204);
    const blocked = await request(app).post('/login');
    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();
  });

  it('rejects an unsafe configuration when production enforcement is enabled', () => {
    process.env.ENFORCE_PRODUCTION_SECURITY = 'true';
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://database.example/pms';
    process.env.FRONTEND_ORIGIN = 'http://pms.example.com';
    process.env.JWT_COOKIE_SECURE = 'false';
    process.env.ALLOW_PUBLIC_REGISTRATION = 'true';
    expect(() => validateProductionConfiguration()).toThrow(/Unsafe production configuration/);
  });

  it('accepts the hardened production configuration contract', () => {
    process.env.ENFORCE_PRODUCTION_SECURITY = 'true';
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://database.example/pms';
    process.env.FRONTEND_ORIGIN = 'https://pms.example.com';
    process.env.JWT_COOKIE_SECURE = 'true';
    process.env.ALLOW_PUBLIC_REGISTRATION = 'false';
    expect(() => validateProductionConfiguration()).not.toThrow();
  });
});

