import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Role, User } from '@prisma/client';
import { signAccessToken, verifyAccessToken } from '../src/jwt';

const user: User = {
  id: '8bb176b5-1cb1-4dea-93b6-dbb7a9f2349a',
  name: 'Test Administrator',
  email: 'admin@example.com',
  passwordHash: 'not-used-by-token-tests',
  role: Role.ADMINISTRATOR,
  walletAddress: null,
  isActive: true,
  tokenVersion: 3,
  lastLoginAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('JWT access tokens', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-that-is-at-least-sixty-four-characters-long-for-hs256-signing';
    process.env.JWT_ISSUER = 'smart-oil-field-api-test';
    process.env.JWT_AUDIENCE = 'smart-oil-field-services-test';
    process.env.JWT_TTL_MINUTES = '10';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('signs an access token containing identity, role and revocation version', () => {
    const token = signAccessToken(user);
    const claims = verifyAccessToken(token);

    expect(claims.sub).toBe(user.id);
    expect(claims.role).toBe(Role.ADMINISTRATOR);
    expect(claims.ver).toBe(3);
    expect(claims.type).toBe('access');
  });

  it('rejects a token whose signature has been modified', () => {
    const token = signAccessToken(user);
    const tampered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;

    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it('requires a sufficiently strong signing secret', () => {
    process.env.JWT_SECRET = 'too-short';
    expect(() => signAccessToken(user)).toThrow(/at least 64 characters/);
  });
});
