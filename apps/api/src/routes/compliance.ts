import { Router } from 'express';
import {
  ComplianceObligationStatus, ComplianceRegisterStatus, CorrectiveActionStatus, EscalationLevel,
  InspectionOutcome, InspectionStatus, NonConformitySeverity, NonConformityStatus, PermitStatus,
  Prisma, RegulationType, Role,
} from '@prisma/client';
import { prisma } from '@smart-oil-field/database';
import { z } from 'zod';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

const userSelect = { id: true, name: true, email: true, role: true };
const projectSelect = { id: true, title: true, code: true, department: true, managerId: true };
const evidenceInclude = { uploadedBy: { select: userSelect } };
const obligationInclude = {
  regulation: true, project: { select: projectSelect }, responsibleOfficer: { select: userSelect },
  verifiedBy: { select: userSelect }, evidence: { include: evidenceInclude, orderBy: { createdAt: 'desc' as const } },
};
const permitInclude = {
  regulation: true, project: { select: projectSelect }, responsibleOfficer: { select: userSelect },
  evidence: { include: evidenceInclude, orderBy: { createdAt: 'desc' as const } },
};
const inspectionInclude = {
  regulation: true, project: { select: projectSelect }, responsibleOfficer: { select: userSelect },
  evidence: { include: evidenceInclude, orderBy: { createdAt: 'desc' as const } },
};
const actionInclude = {
  responsibleOfficer: { select: userSelect }, verifiedBy: { select: userSelect },
  evidence: { include: evidenceInclude, orderBy: { createdAt: 'desc' as const } },
};
const nonConformityInclude = {
  obligation: { select: { id: true, reference: true, title: true } },
  inspection: { select: { id: true, reference: true, title: true } },
  project: { select: projectSelect }, responsibleOfficer: { select: userSelect },
  correctiveActions: { include: actionInclude, orderBy: { dueDate: 'asc' as const } },
  evidence: { include: evidenceInclude, orderBy: { createdAt: 'desc' as const } },
};

const uuid = z.string().uuid();
const optionalId = uuid.nullable().optional();
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const safeUrl = z.string().trim().url().max(2000)
  .refine((value) => value.startsWith('https://') || value.startsWith('http://localhost'), 'Use an HTTPS evidence URL');

const regulationSchema = z.object({
  code: z.string().trim().min(2).max(50).regex(/^[A-Za-z0-9_./-]+$/).transform((value) => value.toUpperCase()),
  title: z.string().trim().min(3).max(240), type: z.nativeEnum(RegulationType),
  jurisdiction: z.string().trim().min(2).max(160), regulator: z.string().trim().min(2).max(200),
  description: z.string().trim().min(10).max(5000), effectiveDate: z.coerce.date(),
  reviewDate: z.coerce.date().nullable().optional(), status: z.nativeEnum(ComplianceRegisterStatus).default(ComplianceRegisterStatus.DRAFT),
});
const obligationSchema = z.object({
  regulationId: uuid, projectId: optionalId,
  reference: z.string().trim().min(2).max(80).transform((value) => value.toUpperCase()),
  title: z.string().trim().min(3).max(240), requirement: z.string().trim().min(10).max(5000),
  department: z.string().trim().min(2).max(160), responsibleOfficerId: uuid, dueDate: z.coerce.date(),
  frequency: optionalText(100), weight: z.number().int().min(1).max(100).default(1),
  status: z.nativeEnum(ComplianceObligationStatus).default(ComplianceObligationStatus.NOT_STARTED),
});
const permitBaseSchema = z.object({
  regulationId: optionalId, projectId: optionalId,
  permitNumber: z.string().trim().min(2).max(100).transform((value) => value.toUpperCase()),
  title: z.string().trim().min(3).max(240), permitType: z.string().trim().min(2).max(160),
  issuingAuthority: z.string().trim().min(2).max(200), holder: z.string().trim().min(2).max(200),
  issueDate: z.coerce.date(), expiryDate: z.coerce.date(), status: z.nativeEnum(PermitStatus).default(PermitStatus.DRAFT),
  renewalLeadDays: z.number().int().min(1).max(730).default(90), conditions: optionalText(5000), responsibleOfficerId: uuid,
});
const permitSchema = permitBaseSchema.refine((value) => value.expiryDate >= value.issueDate, { message: 'Expiry date must be on or after issue date', path: ['expiryDate'] });
const inspectionSchema = z.object({
  regulationId: optionalId, projectId: optionalId,
  reference: z.string().trim().min(2).max(80).transform((value) => value.toUpperCase()),
  title: z.string().trim().min(3).max(240), inspector: z.string().trim().min(2).max(200),
  location: z.string().trim().min(2).max(240), scheduledDate: z.coerce.date(), completedDate: z.coerce.date().nullable().optional(),
  status: z.nativeEnum(InspectionStatus).default(InspectionStatus.SCHEDULED),
  outcome: z.nativeEnum(InspectionOutcome).default(InspectionOutcome.NOT_ASSESSED),
  score: z.number().int().min(0).max(100).nullable().optional(), notes: optionalText(5000), responsibleOfficerId: uuid,
});
const nonConformityBaseSchema = z.object({
  obligationId: optionalId, inspectionId: optionalId, projectId: optionalId,
  reference: z.string().trim().min(2).max(80).transform((value) => value.toUpperCase()),
  title: z.string().trim().min(3).max(240), description: z.string().trim().min(10).max(5000),
  severity: z.nativeEnum(NonConformitySeverity).default(NonConformitySeverity.MEDIUM),
  status: z.nativeEnum(NonConformityStatus).default(NonConformityStatus.OPEN),
  detectedAt: z.coerce.date(), dueDate: z.coerce.date(), responsibleOfficerId: uuid, rootCause: optionalText(3000),
});
const nonConformitySchema = nonConformityBaseSchema.refine((value) => value.obligationId || value.inspectionId || value.projectId, {
  message: 'Link the non-conformity to an obligation, inspection, or project', path: ['obligationId'],
}).refine((value) => value.dueDate >= value.detectedAt, {
  message: 'Corrective due date must be on or after detection date', path: ['dueDate'],
});
const actionSchema = z.object({
  title: z.string().trim().min(3).max(240), description: z.string().trim().min(10).max(5000),
  responsibleOfficerId: uuid, dueDate: z.coerce.date(),
  status: z.nativeEnum(CorrectiveActionStatus).default(CorrectiveActionStatus.PLANNED),
  progress: z.number().int().min(0).max(100).default(0), completionNotes: optionalText(3000),
});
const evidenceSchema = z.object({
  obligationId: optionalId, permitId: optionalId, inspectionId: optionalId, nonConformityId: optionalId, correctiveActionId: optionalId,
  name: z.string().trim().min(2).max(240), url: safeUrl, mimeType: optionalText(120), notes: optionalText(2000),
}).refine((value) => [value.obligationId, value.permitId, value.inspectionId, value.nonConformityId, value.correctiveActionId].filter(Boolean).length === 1, {
  message: 'Evidence must be linked to exactly one compliance record', path: ['obligationId'],
});

const managers: Role[] = [Role.ADMINISTRATOR, Role.COMPLIANCE_OFFICER];
const contributors: Role[] = [...managers, Role.DEPARTMENT_HEAD, Role.PROJECT_MANAGER];
const completedObligationStatuses: ComplianceObligationStatus[] = [ComplianceObligationStatus.COMPLIANT, ComplianceObligationStatus.WAIVED];
const inactivePermitStatuses: PermitStatus[] = [PermitStatus.REVOKED, PermitStatus.SUSPENDED];
const urgentPermitStatuses: PermitStatus[] = [PermitStatus.EXPIRING, PermitStatus.EXPIRED];
const completedActionStatuses: CorrectiveActionStatus[] = [CorrectiveActionStatus.COMPLETED, CorrectiveActionStatus.CANCELLED];
const isManager = (role: Role) => managers.includes(role);
const isContributor = (role: Role) => contributors.includes(role);
const requireManager = (role: Role) => isManager(role);
const workflow = (actorId: string, entityType: string, entityId: string, action: string, fromStatus?: string | null, toStatus?: string | null, comment?: string | null) =>
  prisma.complianceWorkflowEvent.create({ data: { actorId, entityType, entityId, action, fromStatus, toStatus, comment } });
const audit = (actorId: string, action: string, entityType: string, entityId: string, metadata?: Prisma.InputJsonValue) =>
  prisma.auditLog.create({ data: { actorId, action, entityType, entityId, metadata } });
const obligationScore = (status: ComplianceObligationStatus) => status === ComplianceObligationStatus.COMPLIANT ? 100 : status === ComplianceObligationStatus.IN_PROGRESS ? 50 : 0;
const effectiveObligationStatus = (item: { status: ComplianceObligationStatus; dueDate: Date }) =>
  item.dueDate < new Date() && !completedObligationStatuses.includes(item.status)
    ? ComplianceObligationStatus.OVERDUE : item.status;
const effectivePermitStatus = (item: { status: PermitStatus; expiryDate: Date; renewalLeadDays: number }) => {
  if (inactivePermitStatuses.includes(item.status)) return item.status;
  const days = Math.ceil((item.expiryDate.getTime() - Date.now()) / 86400000);
  return days < 0 ? PermitStatus.EXPIRED : days <= item.renewalLeadDays ? PermitStatus.EXPIRING : item.status;
};

router.get('/options', async (_req, res, next) => {
  try {
    const [users, projects, regulations, obligations, inspections, nonConformities] = await Promise.all([
      prisma.user.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: userSelect }),
      prisma.project.findMany({ orderBy: { title: 'asc' }, select: projectSelect }),
      prisma.complianceRegulation.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, title: true } }),
      prisma.complianceObligation.findMany({ orderBy: { dueDate: 'asc' }, select: { id: true, reference: true, title: true } }),
      prisma.complianceInspection.findMany({ orderBy: { scheduledDate: 'desc' }, select: { id: true, reference: true, title: true } }),
      prisma.nonConformity.findMany({ where: { status: { not: NonConformityStatus.CLOSED } }, orderBy: { dueDate: 'asc' }, select: { id: true, reference: true, title: true } }),
    ]);
    return res.json({ users, projects, regulations, obligations, inspections, nonConformities });
  } catch (error) { return next(error); }
});

router.get('/overview', async (_req, res, next) => {
  try {
    const [regulations, obligations, permits, inspections, nonConformities, actions] = await Promise.all([
      prisma.complianceRegulation.findMany(), prisma.complianceObligation.findMany(), prisma.compliancePermit.findMany(),
      prisma.complianceInspection.findMany(), prisma.nonConformity.findMany(), prisma.correctiveAction.findMany(),
    ]);
    const scored = obligations.filter((item) => item.status !== ComplianceObligationStatus.WAIVED);
    const totalWeight = scored.reduce((total, item) => total + item.weight, 0);
    const complianceScore = totalWeight ? Math.round(scored.reduce((total, item) => total + obligationScore(effectiveObligationStatus(item)) * item.weight, 0) / totalWeight * 10) / 10 : 0;
    return res.json({ summary: {
      activeRegulations: regulations.filter((item) => item.status === ComplianceRegisterStatus.ACTIVE).length,
      totalObligations: obligations.length,
      compliantObligations: obligations.filter((item) => effectiveObligationStatus(item) === ComplianceObligationStatus.COMPLIANT).length,
      overdueObligations: obligations.filter((item) => effectiveObligationStatus(item) === ComplianceObligationStatus.OVERDUE).length,
      expiringPermits: permits.filter((item) => urgentPermitStatuses.includes(effectivePermitStatus(item))).length,
      scheduledInspections: inspections.filter((item) => item.status === InspectionStatus.SCHEDULED).length,
      openNonConformities: nonConformities.filter((item) => item.status !== NonConformityStatus.CLOSED).length,
      overdueActions: actions.filter((item) => item.dueDate < new Date() && !completedActionStatuses.includes(item.status)).length,
      complianceScore,
    } });
  } catch (error) { return next(error); }
});

router.get('/register', async (_req, res, next) => {
  try {
    const [regulations, obligations, permits, inspections, nonConformities, events] = await Promise.all([
      prisma.complianceRegulation.findMany({ include: { createdBy: { select: userSelect } }, orderBy: { code: 'asc' } }),
      prisma.complianceObligation.findMany({ include: obligationInclude, orderBy: { dueDate: 'asc' } }),
      prisma.compliancePermit.findMany({ include: permitInclude, orderBy: { expiryDate: 'asc' } }),
      prisma.complianceInspection.findMany({ include: inspectionInclude, orderBy: { scheduledDate: 'desc' } }),
      prisma.nonConformity.findMany({ include: nonConformityInclude, orderBy: [{ severity: 'desc' }, { dueDate: 'asc' }] }),
      prisma.complianceWorkflowEvent.findMany({ include: { actor: { select: userSelect } }, orderBy: { createdAt: 'desc' }, take: 200 }),
    ]);
    return res.json({ regulations, obligations: obligations.map((item) => ({ ...item, effectiveStatus: effectiveObligationStatus(item), score: obligationScore(effectiveObligationStatus(item)) })), permits: permits.map((item) => ({ ...item, effectiveStatus: effectivePermitStatus(item) })), inspections, nonConformities, events });
  } catch (error) { return next(error); }
});

router.post('/regulations', async (req, res, next) => {
  try {
    if (!requireManager(req.authUser!.role)) return res.status(403).json({ message: 'Only Compliance Officers and Administrators can manage the regulation register' });
    const item = await prisma.complianceRegulation.create({ data: { ...regulationSchema.parse(req.body), createdById: req.authUser!.id } });
    await Promise.all([workflow(req.authUser!.id, 'ComplianceRegulation', item.id, 'CREATED', null, item.status), audit(req.authUser!.id, 'REGULATION_CREATED', 'ComplianceRegulation', item.id)]);
    return res.status(201).json({ regulation: item });
  } catch (error) { return next(error); }
});
router.patch('/regulations/:id', async (req, res, next) => {
  try {
    if (!requireManager(req.authUser!.role)) return res.status(403).json({ message: 'Only Compliance Officers and Administrators can manage the regulation register' });
    const current = await prisma.complianceRegulation.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'Regulation not found' });
    const input = regulationSchema.partial().parse(req.body);
    const item = await prisma.complianceRegulation.update({ where: { id: current.id }, data: input });
    await workflow(req.authUser!.id, 'ComplianceRegulation', item.id, 'UPDATED', current.status, item.status);
    return res.json({ regulation: item });
  } catch (error) { return next(error); }
});

router.post('/obligations', async (req, res, next) => {
  try {
    if (!isContributor(req.authUser!.role)) return res.status(403).json({ message: 'Your role cannot create compliance obligations' });
    const input = obligationSchema.parse(req.body);
    if (!isManager(req.authUser!.role) && input.responsibleOfficerId !== req.authUser!.id) return res.status(403).json({ message: 'Contributors can only assign obligations to themselves' });
    const item = await prisma.complianceObligation.create({ data: input, include: obligationInclude });
    await Promise.all([workflow(req.authUser!.id, 'ComplianceObligation', item.id, 'CREATED', null, item.status), audit(req.authUser!.id, 'OBLIGATION_CREATED', 'ComplianceObligation', item.id)]);
    return res.status(201).json({ obligation: item });
  } catch (error) { return next(error); }
});
router.patch('/obligations/:id', async (req, res, next) => {
  try {
    const current = await prisma.complianceObligation.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'Obligation not found' });
    if (!(isManager(req.authUser!.role) || current.responsibleOfficerId === req.authUser!.id)) return res.status(403).json({ message: 'You cannot update this obligation' });
    const input = obligationSchema.omit({ regulationId: true }).partial().parse(req.body);
    if (!isManager(req.authUser!.role) && input.status && completedObligationStatuses.includes(input.status)) return res.status(403).json({ message: 'Only compliance reviewers can verify an obligation' });
    const verifying = isManager(req.authUser!.role) && input.status === ComplianceObligationStatus.COMPLIANT;
    const item = await prisma.complianceObligation.update({ where: { id: current.id }, data: {
      ...input, verifiedById: verifying ? req.authUser!.id : undefined, verifiedAt: verifying ? new Date() : undefined,
      completedAt: input.status === ComplianceObligationStatus.COMPLIANT ? new Date() : undefined,
    }, include: obligationInclude });
    await workflow(req.authUser!.id, 'ComplianceObligation', item.id, verifying ? 'VERIFIED' : 'UPDATED', current.status, item.status, item.verificationComment);
    return res.json({ obligation: item });
  } catch (error) { return next(error); }
});

router.post('/permits', async (req, res, next) => {
  try {
    if (!requireManager(req.authUser!.role)) return res.status(403).json({ message: 'Only Compliance Officers and Administrators can manage permits' });
    const item = await prisma.compliancePermit.create({ data: permitSchema.parse(req.body), include: permitInclude });
    await Promise.all([workflow(req.authUser!.id, 'CompliancePermit', item.id, 'CREATED', null, item.status), audit(req.authUser!.id, 'PERMIT_CREATED', 'CompliancePermit', item.id)]);
    return res.status(201).json({ permit: item });
  } catch (error) { return next(error); }
});
router.patch('/permits/:id', async (req, res, next) => {
  try {
    if (!requireManager(req.authUser!.role)) return res.status(403).json({ message: 'Only Compliance Officers and Administrators can manage permits' });
    const current = await prisma.compliancePermit.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'Permit not found' });
    const item = await prisma.compliancePermit.update({ where: { id: current.id }, data: permitBaseSchema.partial().parse(req.body), include: permitInclude });
    await workflow(req.authUser!.id, 'CompliancePermit', item.id, 'UPDATED', current.status, item.status);
    return res.json({ permit: item });
  } catch (error) { return next(error); }
});

router.post('/inspections', async (req, res, next) => {
  try {
    if (!requireManager(req.authUser!.role)) return res.status(403).json({ message: 'Only Compliance Officers and Administrators can schedule inspections' });
    const item = await prisma.complianceInspection.create({ data: inspectionSchema.parse(req.body), include: inspectionInclude });
    await Promise.all([workflow(req.authUser!.id, 'ComplianceInspection', item.id, 'SCHEDULED', null, item.status), audit(req.authUser!.id, 'INSPECTION_CREATED', 'ComplianceInspection', item.id)]);
    return res.status(201).json({ inspection: item });
  } catch (error) { return next(error); }
});
router.patch('/inspections/:id', async (req, res, next) => {
  try {
    if (!requireManager(req.authUser!.role)) return res.status(403).json({ message: 'Only Compliance Officers and Administrators can update inspections' });
    const current = await prisma.complianceInspection.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'Inspection not found' });
    const input = inspectionSchema.partial().parse(req.body);
    if (input.status === InspectionStatus.COMPLETED && input.outcome === InspectionOutcome.NOT_ASSESSED) return res.status(400).json({ message: 'A completed inspection requires an outcome' });
    const item = await prisma.complianceInspection.update({ where: { id: current.id }, data: input, include: inspectionInclude });
    await workflow(req.authUser!.id, 'ComplianceInspection', item.id, 'UPDATED', current.status, item.status);
    return res.json({ inspection: item });
  } catch (error) { return next(error); }
});

router.post('/non-conformities', async (req, res, next) => {
  try {
    if (!isContributor(req.authUser!.role)) return res.status(403).json({ message: 'Your role cannot raise non-conformities' });
    const input = nonConformitySchema.parse(req.body);
    if (!isManager(req.authUser!.role) && input.responsibleOfficerId !== req.authUser!.id) return res.status(403).json({ message: 'Contributors can only assign findings to themselves' });
    const item = await prisma.nonConformity.create({ data: input, include: nonConformityInclude });
    await Promise.all([workflow(req.authUser!.id, 'NonConformity', item.id, 'RAISED', null, item.status), audit(req.authUser!.id, 'NON_CONFORMITY_RAISED', 'NonConformity', item.id, { severity: item.severity })]);
    return res.status(201).json({ nonConformity: item });
  } catch (error) { return next(error); }
});
router.patch('/non-conformities/:id', async (req, res, next) => {
  try {
    const current = await prisma.nonConformity.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'Non-conformity not found' });
    if (!(isManager(req.authUser!.role) || current.responsibleOfficerId === req.authUser!.id)) return res.status(403).json({ message: 'You cannot update this non-conformity' });
    const input = nonConformityBaseSchema.partial().parse(req.body);
    if (!isManager(req.authUser!.role) && input.status === NonConformityStatus.CLOSED) return res.status(403).json({ message: 'Only compliance reviewers can close non-conformities' });
    const item = await prisma.nonConformity.update({ where: { id: current.id }, data: { ...input, closedAt: input.status === NonConformityStatus.CLOSED ? new Date() : undefined }, include: nonConformityInclude });
    await workflow(req.authUser!.id, 'NonConformity', item.id, input.status === NonConformityStatus.CLOSED ? 'CLOSED' : 'UPDATED', current.status, item.status);
    return res.json({ nonConformity: item });
  } catch (error) { return next(error); }
});
router.post('/non-conformities/:id/escalate', async (req, res, next) => {
  try {
    if (!requireManager(req.authUser!.role)) return res.status(403).json({ message: 'Only Compliance Officers and Administrators can escalate findings' });
    const input = z.object({ level: z.nativeEnum(EscalationLevel).refine((value) => value !== EscalationLevel.NONE), comment: z.string().trim().min(3).max(2000) }).parse(req.body);
    const current = await prisma.nonConformity.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'Non-conformity not found' });
    if (current.status === NonConformityStatus.CLOSED) return res.status(409).json({ message: 'Closed non-conformities cannot be escalated' });
    const item = await prisma.nonConformity.update({ where: { id: current.id }, data: { status: NonConformityStatus.ESCALATED, escalationLevel: input.level, escalatedAt: new Date() }, include: nonConformityInclude });
    await Promise.all([workflow(req.authUser!.id, 'NonConformity', item.id, 'ESCALATED', current.status, item.status, input.comment), audit(req.authUser!.id, 'NON_CONFORMITY_ESCALATED', 'NonConformity', item.id, { level: input.level })]);
    return res.json({ nonConformity: item });
  } catch (error) { return next(error); }
});

router.post('/non-conformities/:id/actions', async (req, res, next) => {
  try {
    if (!isContributor(req.authUser!.role)) return res.status(403).json({ message: 'Your role cannot create corrective actions' });
    const finding = await prisma.nonConformity.findUnique({ where: { id: req.params.id } });
    if (!finding) return res.status(404).json({ message: 'Non-conformity not found' });
    const input = actionSchema.parse(req.body);
    if (!isManager(req.authUser!.role) && input.responsibleOfficerId !== req.authUser!.id) return res.status(403).json({ message: 'Contributors can only assign corrective actions to themselves' });
    const item = await prisma.correctiveAction.create({ data: { nonConformityId: finding.id, ...input }, include: actionInclude });
    await Promise.all([workflow(req.authUser!.id, 'CorrectiveAction', item.id, 'CREATED', null, item.status), audit(req.authUser!.id, 'CORRECTIVE_ACTION_CREATED', 'CorrectiveAction', item.id, { nonConformityId: finding.id })]);
    return res.status(201).json({ correctiveAction: item });
  } catch (error) { return next(error); }
});
router.patch('/corrective-actions/:id', async (req, res, next) => {
  try {
    const current = await prisma.correctiveAction.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'Corrective action not found' });
    if (!(isManager(req.authUser!.role) || current.responsibleOfficerId === req.authUser!.id)) return res.status(403).json({ message: 'You cannot update this corrective action' });
    const input = actionSchema.partial().parse(req.body);
    if (!isManager(req.authUser!.role) && input.status === CorrectiveActionStatus.COMPLETED) return res.status(403).json({ message: 'Only compliance reviewers can verify corrective actions' });
    const verifying = isManager(req.authUser!.role) && input.status === CorrectiveActionStatus.COMPLETED;
    const item = await prisma.correctiveAction.update({ where: { id: current.id }, data: {
      ...input, progress: verifying ? 100 : input.progress, verifiedById: verifying ? req.authUser!.id : undefined,
      verifiedAt: verifying ? new Date() : undefined,
    }, include: actionInclude });
    await workflow(req.authUser!.id, 'CorrectiveAction', item.id, verifying ? 'VERIFIED' : 'UPDATED', current.status, item.status);
    return res.json({ correctiveAction: item });
  } catch (error) { return next(error); }
});

router.post('/evidence', async (req, res, next) => {
  try {
    if (!isContributor(req.authUser!.role)) return res.status(403).json({ message: 'Your role cannot attach compliance evidence' });
    const item = await prisma.complianceEvidence.create({ data: { ...evidenceSchema.parse(req.body), uploadedById: req.authUser!.id }, include: evidenceInclude });
    await audit(req.authUser!.id, 'COMPLIANCE_EVIDENCE_ATTACHED', 'ComplianceEvidence', item.id);
    return res.status(201).json({ evidence: item });
  } catch (error) { return next(error); }
});

const csvCell = (value: unknown) => {
  const text = value == null ? '' : String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};
router.get('/reports/register.csv', async (_req, res, next) => {
  try {
    const [obligations, permits, inspections, findings] = await Promise.all([
      prisma.complianceObligation.findMany({ include: { regulation: true, responsibleOfficer: { select: userSelect } }, orderBy: { dueDate: 'asc' } }),
      prisma.compliancePermit.findMany({ include: { responsibleOfficer: { select: userSelect } }, orderBy: { expiryDate: 'asc' } }),
      prisma.complianceInspection.findMany({ include: { responsibleOfficer: { select: userSelect } }, orderBy: { scheduledDate: 'asc' } }),
      prisma.nonConformity.findMany({ include: { responsibleOfficer: { select: userSelect } }, orderBy: { dueDate: 'asc' } }),
    ]);
    const rows: unknown[][] = [['Record Type', 'Reference', 'Title', 'Authority / Regulation', 'Responsible Officer', 'Due / Expiry Date', 'Status', 'Score / Severity']];
    obligations.forEach((item) => rows.push(['Obligation', item.reference, item.title, item.regulation.code, item.responsibleOfficer.name, item.dueDate.toISOString(), effectiveObligationStatus(item), obligationScore(effectiveObligationStatus(item))]));
    permits.forEach((item) => rows.push(['Permit', item.permitNumber, item.title, item.issuingAuthority, item.responsibleOfficer.name, item.expiryDate.toISOString(), effectivePermitStatus(item), '']));
    inspections.forEach((item) => rows.push(['Inspection', item.reference, item.title, item.inspector, item.responsibleOfficer.name, item.scheduledDate.toISOString(), item.status, item.score ?? item.outcome]));
    findings.forEach((item) => rows.push(['Non-conformity', item.reference, item.title, '', item.responsibleOfficer.name, item.dueDate.toISOString(), item.status, item.severity]));
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="compliance-register-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(`\uFEFF${csv}`);
  } catch (error) { return next(error); }
});

export default router;
