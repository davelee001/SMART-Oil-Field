import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@smart-oil-field/database';
import { publicUser, regenerateSession, requireAuth } from '../auth';

const router = Router();

const credentialsSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(2).max(100),
});

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  walletAddress: z.string().trim().max(200).nullable().optional(),
});

router.post('/register', async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) return res.status(409).json({ message: 'An account with this email already exists' });

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await bcrypt.hash(input.password, 12),
        role: 'VIEWER',
        lastLoginAt: new Date(),
      },
    });
    await regenerateSession(req, user.id);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const input = credentialsSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !user.isActive || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const updated = await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await regenerateSession(req, updated.id);
    res.json({ user: publicUser(updated) });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie('sof.sid');
    res.status(204).send();
  });
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
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

export default router;
