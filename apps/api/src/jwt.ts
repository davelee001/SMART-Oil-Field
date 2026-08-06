import { Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { User } from '@prisma/client';
import { PmsRole } from '@smart-oil-field/shared';

export const AUTH_COOKIE = 'sof.access_token';

export interface AccessTokenClaims extends JwtPayload {
  sub: string;
  role: PmsRole;
  ver: number;
  type: 'access';
}

const numberFromEnvironment = (name: string, fallback: number) => {
  const parsed = Number(process.env[name] || fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${name} must be a positive number`);
  return parsed;
};

export const jwtConfiguration = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 64) throw new Error('JWT_SECRET must contain at least 64 characters');
  return {
    secret,
    issuer: process.env.JWT_ISSUER || 'smart-oil-field-api',
    audience: process.env.JWT_AUDIENCE || 'smart-oil-field-services',
    ttlMinutes: numberFromEnvironment('JWT_TTL_MINUTES', 480),
  };
};

export const signAccessToken = (user: User) => {
  const config = jwtConfiguration();
  return jwt.sign(
    { role: user.role, ver: user.tokenVersion, type: 'access' },
    config.secret,
    {
      algorithm: 'HS256',
      subject: user.id,
      issuer: config.issuer,
      audience: config.audience,
      expiresIn: config.ttlMinutes * 60,
    },
  );
};

export const verifyAccessToken = (token: string): AccessTokenClaims => {
  const config = jwtConfiguration();
  const payload = jwt.verify(token, config.secret, {
    algorithms: ['HS256'],
    issuer: config.issuer,
    audience: config.audience,
  });
  if (typeof payload === 'string' || !payload.sub || payload.type !== 'access' || typeof payload.ver !== 'number') {
    throw new jwt.JsonWebTokenError('Invalid access token claims');
  }
  return payload as AccessTokenClaims;
};

export const readAccessToken = (req: Request) => {
  const authorization = req.get('authorization');
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7).trim();
  return req.cookies?.[AUTH_COOKIE] as string | undefined;
};

export const setAccessTokenCookie = (res: Response, token: string) => {
  const { ttlMinutes } = jwtConfiguration();
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.JWT_COOKIE_SECURE === 'true',
    sameSite: 'lax',
    path: '/',
    maxAge: ttlMinutes * 60 * 1000,
  });
};

export const clearAccessTokenCookie = (res: Response) => {
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    secure: process.env.JWT_COOKIE_SECURE === 'true',
    sameSite: 'lax',
    path: '/',
  });
};
