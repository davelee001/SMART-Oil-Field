import { NextFunction, Request, Response } from 'express';
import { User } from '@prisma/client';
import { PmsRole, SessionUser } from '@smart-oil-field/shared';
import { prisma } from '@smart-oil-field/database';
import { readAccessToken, verifyAccessToken } from './jwt';

export const publicUser = (user: User): SessionUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  department: user.department,
  role: user.role as PmsRole,
  walletAddress: user.walletAddress,
  isActive: user.isActive,
  createdAt: user.createdAt.toISOString(),
  lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
});

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = readAccessToken(req);
    if (!token) return res.status(401).json({ message: 'Authentication required' });

    const claims = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: claims.sub } });
    if (!user || !user.isActive || user.tokenVersion !== claims.ver) {
      return res.status(401).json({ message: 'Authentication is no longer valid' });
    }

    req.authUser = user;
    return next();
  } catch {
    return res.status(401).json({ message: 'Authentication is no longer valid' });
  }
};

export const requireRoles = (...roles: PmsRole[]) => [
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser || !roles.includes(req.authUser.role as PmsRole)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    return next();
  },
];
