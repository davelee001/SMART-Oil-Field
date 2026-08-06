import { Router } from 'express';
import { Prisma, ProjectStatus, RiskLevel, RiskStatus, Role, WorkItemStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@smart-oil-field/database';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

const projectInclude = {
  manager: { select: { id: true, name: true, email: true, role: true } },
  objectives: { orderBy: { createdAt: 'asc' as const } },
  activities: { include: { assignedTo: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'asc' as const } },
  milestones: { orderBy: { dueDate: 'asc' as const } },
  deliverables: { include: { assignedTo: { select: { id: true, name: true, email: true } } }, orderBy: { dueDate: 'asc' as const } },
  risks: { include: { owner: { select: { id: true, name: true, email: true } } }, orderBy: [{ level: 'desc' as const }, { createdAt: 'asc' as const }] },
  assignments: { include: { user: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { createdAt: 'asc' as const } },
};

const projectStatusSchema = z.nativeEnum(ProjectStatus);
const workItemStatusSchema = z.nativeEnum(WorkItemStatus);
const riskLevelSchema = z.nativeEnum(RiskLevel);
const riskStatusSchema = z.nativeEnum(RiskStatus);
const uuidSchema = z.string().uuid();
const optionalDate = z.coerce.date().nullable().optional();

const projectBaseSchema = z.object({
  title: z.string().trim().min(3).max(200),
  code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/).transform((value) => value.toUpperCase()),
  department: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(200),
  managerId: uuidSchema,
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: projectStatusSchema.default(ProjectStatus.PLANNED),
  progress: z.number().int().min(0).max(100).default(0),
  objectives: z.array(z.string().trim().min(3).max(1000)).max(50).default([]),
  assignedStaffIds: z.array(uuidSchema).max(100).default([]),
});
const projectSchema = projectBaseSchema.refine((value) => value.endDate >= value.startDate, {
  message: 'End date must be on or after the start date', path: ['endDate'],
});

const projectUpdateSchema = projectBaseSchema.omit({ objectives: true, assignedStaffIds: true }).partial()
  .refine((value) => !value.startDate || !value.endDate || value.endDate >= value.startDate, {
    message: 'End date must be on or after the start date', path: ['endDate'],
  });

const objectiveSchema = z.object({ description: z.string().trim().min(3).max(1000), isCompleted: z.boolean().default(false) });
const activitySchema = z.object({
  title: z.string().trim().min(2).max(200), description: z.string().trim().max(2000).nullable().optional(),
  startDate: optionalDate, endDate: optionalDate, status: workItemStatusSchema.default(WorkItemStatus.NOT_STARTED),
  progress: z.number().int().min(0).max(100).default(0), assignedToId: uuidSchema.nullable().optional(),
});
const milestoneSchema = z.object({
  title: z.string().trim().min(2).max(200), description: z.string().trim().max(2000).nullable().optional(),
  dueDate: z.coerce.date(), status: workItemStatusSchema.default(WorkItemStatus.NOT_STARTED), completedAt: optionalDate,
});
const deliverableSchema = z.object({
  title: z.string().trim().min(2).max(200), description: z.string().trim().max(2000).nullable().optional(),
  dueDate: z.coerce.date(), status: workItemStatusSchema.default(WorkItemStatus.NOT_STARTED),
  assignedToId: uuidSchema.nullable().optional(), acceptedAt: optionalDate,
});
const riskSchema = z.object({
  title: z.string().trim().min(2).max(200), description: z.string().trim().min(3).max(2000),
  level: riskLevelSchema.default(RiskLevel.MEDIUM), status: riskStatusSchema.default(RiskStatus.OPEN),
  mitigation: z.string().trim().max(2000).nullable().optional(), ownerId: uuidSchema.nullable().optional(), dueDate: optionalDate,
});
const assignmentSchema = z.object({ userId: uuidSchema, role: z.string().trim().max(120).nullable().optional() });

const projectCreatorRoles: Role[] = [Role.ADMINISTRATOR, Role.PROJECT_MANAGER, Role.DEPARTMENT_HEAD];
const canCreateProject = (role: Role) => projectCreatorRoles.includes(role);
const canManageProject = (user: Express.Request['authUser'], project: { managerId: string }) => Boolean(user && (
  user.role === Role.ADMINISTRATOR || user.role === Role.DEPARTMENT_HEAD ||
  (user.role === Role.PROJECT_MANAGER && project.managerId === user.id)
));

type ProjectAccess = { project: { id: string; managerId: string; startDate: Date; endDate: Date } } | { status: 403 | 404; message: string };
const loadProjectForWrite = async (projectId: string, user: Express.Request['authUser']): Promise<ProjectAccess> => {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, managerId: true, startDate: true, endDate: true } });
  if (!project) return { status: 404 as const, message: 'Project not found' };
  if (!canManageProject(user, project)) return { status: 403 as const, message: 'You cannot manage this project' };
  return { project };
};

const audit = (actorId: string, action: string, projectId: string, metadata?: Prisma.InputJsonValue) =>
  prisma.auditLog.create({ data: { actorId, action, entityType: 'Project', entityId: projectId, metadata } });

router.get('/options', async (_req, res, next) => {
  try {
    const [users, departments] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true }, orderBy: { name: 'asc' },
        select: { id: true, name: true, email: true, role: true },
      }),
      prisma.project.findMany({ distinct: ['department'], select: { department: true }, orderBy: { department: 'asc' } }),
    ]);
    return res.json({ users, departments: departments.map((item) => item.department) });
  } catch (error) { return next(error); }
});

router.get('/', async (req, res, next) => {
  try {
    const query = z.object({
      search: z.string().trim().optional(), department: z.string().trim().optional(), status: projectStatusSchema.optional(),
    }).parse(req.query);
    const where: Prisma.ProjectWhereInput = {};
    if (query.department) where.department = query.department;
    if (query.status) where.status = query.status;
    if (query.search) where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { code: { contains: query.search, mode: 'insensitive' } },
      { location: { contains: query.search, mode: 'insensitive' } },
    ];
    const projects = await prisma.project.findMany({ where, include: projectInclude, orderBy: [{ status: 'asc' }, { startDate: 'desc' }] });
    return res.json({ projects });
  } catch (error) { return next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    if (!canCreateProject(req.authUser!.role)) return res.status(403).json({ message: 'Your role cannot create projects' });
    const input = projectSchema.parse(req.body);
    if (req.authUser!.role === Role.PROJECT_MANAGER && input.managerId !== req.authUser!.id) {
      return res.status(403).json({ message: 'Project Managers can only create projects assigned to themselves' });
    }
    const manager = await prisma.user.findFirst({
      where: { id: input.managerId, isActive: true, role: { in: [Role.ADMINISTRATOR, Role.PROJECT_MANAGER, Role.DEPARTMENT_HEAD] } },
    });
    if (!manager) return res.status(400).json({ message: 'Project manager must be an active management user' });
    const assignedStaffIds = [...new Set([...input.assignedStaffIds, input.managerId])];
    const { objectives, assignedStaffIds: _assigned, ...data } = input;
    const project = await prisma.project.create({
      data: {
        ...data,
        objectives: { create: objectives.map((description) => ({ description })) },
        assignments: { create: assignedStaffIds.map((userId) => ({ userId, role: userId === input.managerId ? 'Project Manager' : null })) },
      },
      include: projectInclude,
    });
    await audit(req.authUser!.id, 'PROJECT_CREATED', project.id, { code: project.code });
    return res.status(201).json({ project });
  } catch (error) { return next(error); }
});

router.get('/:projectId', async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.projectId }, include: projectInclude });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    return res.json({ project });
  } catch (error) { return next(error); }
});

router.patch('/:projectId', async (req, res, next) => {
  try {
    const access = await loadProjectForWrite(req.params.projectId, req.authUser);
    if ('status' in access) return res.status(access.status).json({ message: access.message });
    const input = projectUpdateSchema.parse(req.body);
    const startDate = input.startDate || access.project.startDate;
    const endDate = input.endDate || access.project.endDate;
    if (endDate < startDate) return res.status(400).json({ message: 'End date must be on or after the start date' });
    if (req.authUser!.role === Role.PROJECT_MANAGER && input.managerId && input.managerId !== req.authUser!.id) {
      return res.status(403).json({ message: 'Project Managers cannot reassign projects' });
    }
    if (input.managerId) {
      const manager = await prisma.user.findFirst({
        where: { id: input.managerId, isActive: true, role: { in: [Role.ADMINISTRATOR, Role.PROJECT_MANAGER, Role.DEPARTMENT_HEAD] } },
      });
      if (!manager) return res.status(400).json({ message: 'Project manager must be an active management user' });
    }
    const project = await prisma.project.update({ where: { id: req.params.projectId }, data: input, include: projectInclude });
    await audit(req.authUser!.id, 'PROJECT_UPDATED', project.id, input as Prisma.InputJsonValue);
    return res.json({ project });
  } catch (error) { return next(error); }
});

router.delete('/:projectId', async (req, res, next) => {
  try {
    if (req.authUser!.role !== Role.ADMINISTRATOR) return res.status(403).json({ message: 'Only Administrators can delete projects' });
    await prisma.project.delete({ where: { id: req.params.projectId } });
    await audit(req.authUser!.id, 'PROJECT_DELETED', req.params.projectId);
    return res.status(204).send();
  } catch (error) { return next(error); }
});

router.post('/:projectId/objectives', async (req, res, next) => {
  try {
    const access = await loadProjectForWrite(req.params.projectId, req.authUser);
    if ('status' in access) return res.status(access.status).json({ message: access.message });
    const item = await prisma.projectObjective.create({ data: { projectId: req.params.projectId, ...objectiveSchema.parse(req.body) } });
    return res.status(201).json({ objective: item });
  } catch (error) { return next(error); }
});
router.patch('/:projectId/objectives/:itemId', async (req, res, next) => {
  try {
    const access = await loadProjectForWrite(req.params.projectId, req.authUser);
    if ('status' in access) return res.status(access.status).json({ message: access.message });
    const item = await prisma.projectObjective.update({ where: { id: req.params.itemId, projectId: req.params.projectId }, data: objectiveSchema.partial().parse(req.body) });
    return res.json({ objective: item });
  } catch (error) { return next(error); }
});
router.delete('/:projectId/objectives/:itemId', async (req, res, next) => {
  try {
    const access = await loadProjectForWrite(req.params.projectId, req.authUser);
    if ('status' in access) return res.status(access.status).json({ message: access.message });
    await prisma.projectObjective.delete({ where: { id: req.params.itemId, projectId: req.params.projectId } });
    return res.status(204).send();
  } catch (error) { return next(error); }
});

router.post('/:projectId/activities', async (req, res, next) => {
  try {
    const access = await loadProjectForWrite(req.params.projectId, req.authUser);
    if ('status' in access) return res.status(access.status).json({ message: access.message });
    const item = await prisma.projectActivity.create({ data: { projectId: req.params.projectId, ...activitySchema.parse(req.body) }, include: { assignedTo: true } });
    return res.status(201).json({ activity: item });
  } catch (error) { return next(error); }
});
router.patch('/:projectId/activities/:itemId', async (req, res, next) => {
  try {
    const access = await loadProjectForWrite(req.params.projectId, req.authUser);
    if ('status' in access) return res.status(access.status).json({ message: access.message });
    const item = await prisma.projectActivity.update({ where: { id: req.params.itemId, projectId: req.params.projectId }, data: activitySchema.partial().parse(req.body), include: { assignedTo: true } });
    return res.json({ activity: item });
  } catch (error) { return next(error); }
});
router.delete('/:projectId/activities/:itemId', async (req, res, next) => {
  try {
    const access = await loadProjectForWrite(req.params.projectId, req.authUser);
    if ('status' in access) return res.status(access.status).json({ message: access.message });
    await prisma.projectActivity.delete({ where: { id: req.params.itemId, projectId: req.params.projectId } });
    return res.status(204).send();
  } catch (error) { return next(error); }
});

router.post('/:projectId/milestones', async (req, res, next) => {
  try {
    const access = await loadProjectForWrite(req.params.projectId, req.authUser);
    if ('status' in access) return res.status(access.status).json({ message: access.message });
    const item = await prisma.projectMilestone.create({ data: { projectId: req.params.projectId, ...milestoneSchema.parse(req.body) } });
    return res.status(201).json({ milestone: item });
  } catch (error) { return next(error); }
});
router.patch('/:projectId/milestones/:itemId', async (req, res, next) => {
  try {
    const access = await loadProjectForWrite(req.params.projectId, req.authUser);
    if ('status' in access) return res.status(access.status).json({ message: access.message });
    const item = await prisma.projectMilestone.update({ where: { id: req.params.itemId, projectId: req.params.projectId }, data: milestoneSchema.partial().parse(req.body) });
    return res.json({ milestone: item });
  } catch (error) { return next(error); }
});
router.delete('/:projectId/milestones/:itemId', async (req, res, next) => {
  try {
    const access = await loadProjectForWrite(req.params.projectId, req.authUser);
    if ('status' in access) return res.status(access.status).json({ message: access.message });
    await prisma.projectMilestone.delete({ where: { id: req.params.itemId, projectId: req.params.projectId } });
    return res.status(204).send();
  } catch (error) { return next(error); }
});

router.post('/:projectId/deliverables', async (req, res, next) => {
  try {
    const access = await loadProjectForWrite(req.params.projectId, req.authUser);
    if ('status' in access) return res.status(access.status).json({ message: access.message });
    const item = await prisma.projectDeliverable.create({ data: { projectId: req.params.projectId, ...deliverableSchema.parse(req.body) }, include: { assignedTo: true } });
    return res.status(201).json({ deliverable: item });
  } catch (error) { return next(error); }
});
router.patch('/:projectId/deliverables/:itemId', async (req, res, next) => {
  try {
    const access = await loadProjectForWrite(req.params.projectId, req.authUser);
    if ('status' in access) return res.status(access.status).json({ message: access.message });
    const item = await prisma.projectDeliverable.update({ where: { id: req.params.itemId, projectId: req.params.projectId }, data: deliverableSchema.partial().parse(req.body), include: { assignedTo: true } });
    return res.json({ deliverable: item });
  } catch (error) { return next(error); }
});
router.delete('/:projectId/deliverables/:itemId', async (req, res, next) => {
  try {
    const access = await loadProjectForWrite(req.params.projectId, req.authUser);
    if ('status' in access) return res.status(access.status).json({ message: access.message });
    await prisma.projectDeliverable.delete({ where: { id: req.params.itemId, projectId: req.params.projectId } });
    return res.status(204).send();
  } catch (error) { return next(error); }
});

router.post('/:projectId/risks', async (req, res, next) => {
  try {
    const access = await loadProjectForWrite(req.params.projectId, req.authUser);
    if ('status' in access) return res.status(access.status).json({ message: access.message });
    const item = await prisma.projectRisk.create({ data: { projectId: req.params.projectId, ...riskSchema.parse(req.body) }, include: { owner: true } });
    return res.status(201).json({ risk: item });
  } catch (error) { return next(error); }
});
router.patch('/:projectId/risks/:itemId', async (req, res, next) => {
  try {
    const access = await loadProjectForWrite(req.params.projectId, req.authUser);
    if ('status' in access) return res.status(access.status).json({ message: access.message });
    const item = await prisma.projectRisk.update({ where: { id: req.params.itemId, projectId: req.params.projectId }, data: riskSchema.partial().parse(req.body), include: { owner: true } });
    return res.json({ risk: item });
  } catch (error) { return next(error); }
});
router.delete('/:projectId/risks/:itemId', async (req, res, next) => {
  try {
    const access = await loadProjectForWrite(req.params.projectId, req.authUser);
    if ('status' in access) return res.status(access.status).json({ message: access.message });
    await prisma.projectRisk.delete({ where: { id: req.params.itemId, projectId: req.params.projectId } });
    return res.status(204).send();
  } catch (error) { return next(error); }
});

router.post('/:projectId/assignments', async (req, res, next) => {
  try {
    const access = await loadProjectForWrite(req.params.projectId, req.authUser);
    if ('status' in access) return res.status(access.status).json({ message: access.message });
    const item = await prisma.projectAssignment.create({ data: { projectId: req.params.projectId, ...assignmentSchema.parse(req.body) }, include: { user: true } });
    return res.status(201).json({ assignment: item });
  } catch (error) { return next(error); }
});
router.delete('/:projectId/assignments/:userId', async (req, res, next) => {
  try {
    const access = await loadProjectForWrite(req.params.projectId, req.authUser);
    if ('status' in access) return res.status(access.status).json({ message: access.message });
    if (access.project.managerId === req.params.userId) return res.status(400).json({ message: 'The Project Manager cannot be removed from assigned staff' });
    await prisma.projectAssignment.delete({ where: { projectId_userId: { projectId: req.params.projectId, userId: req.params.userId } } });
    return res.status(204).send();
  } catch (error) { return next(error); }
});

export default router;
