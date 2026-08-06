import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { PMS_ROLES } from '@smart-oil-field/shared';
import { prisma } from '@smart-oil-field/database';
import { publicUser, requireRoles } from '../auth';

const router = Router();
router.use(...requireRoles('ADMINISTRATOR'));

const roleSchema = z.enum(PMS_ROLES);
const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128),
  role: roleSchema,
});
const updateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  role: roleSchema.optional(),
  isActive: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one change is required');

router.get('/users', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({ orderBy: [{ isActive: 'desc' }, { name: 'asc' }] });
    return res.json({ users: users.map(publicUser) });
  } catch (error) {
    return next(error);
  }
});

router.post('/users', async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body);
    const { password, ...userData } = input;
    const user = await prisma.user.create({
      data: { ...userData, passwordHash: await bcrypt.hash(password, 12) },
    });
    await prisma.auditLog.create({
      data: { actorId: req.authUser!.id, action: 'USER_CREATED', entityType: 'User', entityId: user.id, metadata: { role: user.role } },
    });
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const input = updateSchema.parse(req.body);
    if (req.params.id === req.authUser!.id && (input.isActive === false || (input.role && input.role !== 'ADMINISTRATOR'))) {
      return res.status(400).json({ message: 'You cannot deactivate or remove your own administrator access' });
    }

    const data: Prisma.UserUpdateInput = { ...input };
    if (input.role !== undefined || input.isActive !== undefined) data.tokenVersion = { increment: 1 };
    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    await prisma.auditLog.create({
      data: { actorId: req.authUser!.id, action: 'USER_ACCESS_UPDATED', entityType: 'User', entityId: user.id, metadata: input },
    });
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

export default router;
