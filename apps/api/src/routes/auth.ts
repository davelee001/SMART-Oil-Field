import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@smart-oil-field/database';
import { publicUser, requireAuth } from '../auth';
import { clearAccessTokenCookie, jwtConfiguration, setAccessTokenCookie, signAccessToken } from '../jwt';

const router = Router();

const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(254).optional(),
  email: z.string().trim().max(254).optional(),
  password: z.string().min(8).max(128),
}).refine((value) => value.identifier || value.email, { message: 'Username or email is required' });

const credentialsSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128),
});

const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(2).max(100),
});

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  walletAddress: z.string().trim().max(200).nullable().optional(),
});

const authenticationResponse = (user: Parameters<typeof publicUser>[0]) => {
  const accessToken = signAccessToken(user);
  return {
    accessToken,
    tokenType: 'Bearer' as const,
    expiresIn: jwtConfiguration().ttlMinutes * 60,
    user: publicUser(user),
  };
};

router.post('/register', async (req, res, next) => {
  try {
    if (process.env.ALLOW_PUBLIC_REGISTRATION === 'false') {
      return res.status(403).json({ message: 'Public registration is disabled' });
    }
    const input = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) return res.status(409).json({ message: 'An account with this email already exists' });

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await bcrypt.hash(input.password, 12),
        role: 'VIEWER',
        operatorScope: null,
        lastLoginAt: new Date(),
      },
    });
    const response = authenticationResponse(user);
    setAccessTokenCookie(res, response.accessToken);
    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const identifier = (input.identifier || input.email!).toLowerCase();
    const user = await prisma.user.findUnique({
      where: identifier.includes('@') ? { email: identifier } : { username: identifier },
    });
    if (!user || !user.isActive || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const updated = await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const response = authenticationResponse(updated);
    setAccessTokenCookie(res, response.accessToken);
    return res.json(response);
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.authUser!.id },
      data: { tokenVersion: { increment: 1 } },
    });
    clearAccessTokenCookie(res);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.authUser!) });
});

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const input = profileSchema.parse(req.body);
    const duplicate = await prisma.user.findFirst({ where: { email: input.email, NOT: { id: req.authUser!.id } } });
    if (duplicate) return res.status(409).json({ message: 'That email address is already in use' });
    const user = await prisma.user.update({
      where: { id: req.authUser!.id },
      data: { name: input.name, email: input.email, walletAddress: input.walletAddress || null },
    });
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

export default router;
