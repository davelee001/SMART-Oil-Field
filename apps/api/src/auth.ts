import { NextFunction, Request, Response } from 'express';
import { User } from '@prisma/client';
import { PmsRole, SessionUser } from '@smart-oil-field/shared';
import { prisma } from '@smart-oil-field/database';

export const publicUser = (user: User): SessionUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role as PmsRole,
  walletAddress: user.walletAddress,
  isActive: user.isActive,
  createdAt: user.createdAt.toISOString(),
  lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
});

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
  if (!user || !user.isActive) {
    req.session.destroy(() => undefined);
    return res.status(401).json({ message: 'Session is no longer valid' });
  }

  req.authUser = user;
  next();
};

export const requireRoles = (...roles: PmsRole[]) => [
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser || !roles.includes(req.authUser.role as PmsRole)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    next();
  },
];

export const regenerateSession = (req: Request, userId: string) =>
  new Promise<void>((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) return reject(error);
      req.session.userId = userId;
      req.session.save((saveError) => (saveError ? reject(saveError) : resolve()));
    });
  });
