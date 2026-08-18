import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { OPERATOR_SCOPES, PMS_ROLES } from '@smart-oil-field/shared';
import { prisma } from '@smart-oil-field/database';
import { publicUser, requireRoles } from '../auth';

const router = Router();
router.use(...requireRoles('ADMINISTRATOR'));

const roleSchema = z.enum(PMS_ROLES);
const operatorScopeSchema = z.enum(OPERATOR_SCOPES);
const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  department: z.string().trim().min(2).max(160).nullable().optional(),
  password: z.string().min(12).max(128),
  role: roleSchema,
  operatorScope: operatorScopeSchema.nullable(),
}).superRefine((value, context) => {
  if (value.role !== 'ADMINISTRATOR' && !value.operatorScope) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['operatorScope'], message: 'Non-administrator users require an operator assignment' });
  }
});
const updateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  department: z.string().trim().min(2).max(160).nullable().optional(),
  role: roleSchema.optional(),
  operatorScope: operatorScopeSchema.nullable().optional(),
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

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'User not found' });
    const resultingRole = input.role ?? existing.role;
    const resultingScope = input.operatorScope !== undefined ? input.operatorScope : existing.operatorScope;
    if (resultingRole !== 'ADMINISTRATOR' && !resultingScope) {
      return res.status(400).json({ message: 'Non-administrator users require an operator assignment' });
    }

    const data: Prisma.UserUpdateInput = { ...input };
    if (input.role === 'ADMINISTRATOR') data.operatorScope = null;
    if (input.role !== undefined || input.operatorScope !== undefined || input.isActive !== undefined) data.tokenVersion = { increment: 1 };
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
