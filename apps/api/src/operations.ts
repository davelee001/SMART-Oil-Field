import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

const positiveInteger = (name: string, fallback: number) => {
  const value = Number(process.env[name] || fallback);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
};

export const runtimeConfiguration = () => ({
  port: positiveInteger('API_PORT', 4000),
  shutdownTimeoutMs: positiveInteger('SHUTDOWN_TIMEOUT_MS', 10_000),
});

export const validateProductionConfiguration = () => {
  if (process.env.ENFORCE_PRODUCTION_SECURITY !== 'true') return;

  const failures: string[] = [];
  const origins = (process.env.FRONTEND_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean);
  if (process.env.NODE_ENV !== 'production') failures.push('NODE_ENV must be production');
  if (!process.env.DATABASE_URL?.startsWith('postgresql://')) failures.push('DATABASE_URL must use PostgreSQL');
  if (!origins.length || origins.some((origin) => !origin.startsWith('https://'))) failures.push('FRONTEND_ORIGIN must contain HTTPS origins only');
  if (process.env.JWT_COOKIE_SECURE !== 'true') failures.push('JWT_COOKIE_SECURE must be true');
  if (process.env.ALLOW_PUBLIC_REGISTRATION !== 'false') failures.push('ALLOW_PUBLIC_REGISTRATION must be false');
  if (failures.length) throw new Error(`Unsafe production configuration: ${failures.join('; ')}`);
};

export const requestContext = (req: Request, res: Response, next: NextFunction) => {
  const supplied = req.get('x-request-id');
  const requestId = supplied && /^[A-Za-z0-9._-]{8,128}$/.test(supplied) ? supplied : randomUUID();
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
  next();
};

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
}

export const createAuthenticationRateLimiter = (options: RateLimitOptions = {}) => {
  const windowMs = options.windowMs ?? positiveInteger('AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000);
  const max = options.max ?? positiveInteger('AUTH_RATE_LIMIT_MAX', 10);
  const attempts = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const existing = attempts.get(key);
    const entry = !existing || existing.resetAt <= now ? { count: 1, resetAt: now + windowMs } : { ...existing, count: existing.count + 1 };
    attempts.set(key, entry);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));
    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ message: 'Too many authentication attempts. Try again later.' });
    }
    if (attempts.size > 10_000) {
      for (const [candidate, value] of attempts) if (value.resetAt <= now) attempts.delete(candidate);
    }
    return next();
  };
};
