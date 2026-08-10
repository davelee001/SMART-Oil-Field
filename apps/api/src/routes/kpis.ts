import { Router } from 'express';
import {
  KpiAggregation, KpiDataType, KpiDirection, KpiFrequency, KpiIndicatorStatus,
  KpiMeasurementStatus, KpiPeriodStatus, KpiSourceType, Prisma, ResultLevelType,
  ResultsFrameworkStatus, Role,
} from '@prisma/client';
import { prisma } from '@smart-oil-field/database';
import { z } from 'zod';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

const uuid = z.string().uuid();
const optionalId = uuid.nullable().optional();
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const numeric = z.number().finite().min(-9999999999999999).max(9999999999999999);
const safeUrl = z.string().trim().url().max(2000)
  .refine((value) => value.startsWith('https://') || value.startsWith('http://localhost'), 'Use an HTTPS evidence URL');
const sourceEndpoint = z.string().trim().min(2).max(1000)
  .refine((value) => /^\/api\/(telemetry|analytics|aggregation)(\/|\?|$)/.test(value), 'Use an approved telemetry or analytics endpoint');
const userSelect = { id: true, name: true, email: true, role: true };
const projectSelect = { id: true, code: true, title: true, department: true, managerId: true };
const evidenceInclude = { uploadedBy: { select: userSelect } };
const measurementInclude = {
  createdBy: { select: userSelect }, verifiedBy: { select: userSelect },
  evidence: { include: evidenceInclude, orderBy: { createdAt: 'desc' as const } },
};
const indicatorInclude = {
  owner: { select: userSelect }, resultLevel: true, targets: { orderBy: { period: { startDate: 'asc' as const } }, include: { period: true } },
  measurements: { include: measurementInclude, orderBy: { measuredAt: 'desc' as const } }, dataSources: true,
  evidence: { include: evidenceInclude, orderBy: { createdAt: 'desc' as const } },
};
const periodInclude = {
  createdBy: { select: userSelect }, submittedBy: { select: userSelect }, reviewedBy: { select: userSelect },
  targets: { include: { indicator: { select: { id: true, code: true, name: true, direction: true, tolerance: true, weight: true } } } },
  measurements: { include: { indicator: { select: { id: true, code: true, name: true, direction: true, tolerance: true, weight: true } }, ...measurementInclude } },
};
const frameworkInclude = {
  project: { select: projectSelect }, owner: { select: userSelect },
  resultLevels: { orderBy: [{ sortOrder: 'asc' as const }, { code: 'asc' as const }] },
  indicators: { include: indicatorInclude, orderBy: { code: 'asc' as const } },
  periods: { include: periodInclude, orderBy: { startDate: 'desc' as const } },
};

const frameworkBaseSchema = z.object({
  projectId: uuid, code: z.string().trim().min(2).max(50).regex(/^[A-Za-z0-9_./-]+$/).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(3).max(240), description: optionalText(5000), startDate: z.coerce.date(), endDate: z.coerce.date(),
  status: z.nativeEnum(ResultsFrameworkStatus).default(ResultsFrameworkStatus.DRAFT), ownerId: uuid,
});
const frameworkSchema = frameworkBaseSchema.refine((value) => value.endDate >= value.startDate, { message: 'End date must be on or after start date', path: ['endDate'] });
const resultLevelSchema = z.object({
  parentId: optionalId, code: z.string().trim().min(1).max(50).transform((value) => value.toUpperCase()), type: z.nativeEnum(ResultLevelType),
  title: z.string().trim().min(3).max(240), description: optionalText(5000), sortOrder: z.number().int().min(0).max(10000).default(0),
});
const indicatorSchema = z.object({
  frameworkId: uuid, resultLevelId: optionalId, code: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9_./-]+$/).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(3).max(240), description: z.string().trim().min(10).max(5000), unit: z.string().trim().min(1).max(80),
  dataType: z.nativeEnum(KpiDataType).default(KpiDataType.NUMBER), direction: z.nativeEnum(KpiDirection).default(KpiDirection.INCREASE),
  frequency: z.nativeEnum(KpiFrequency).default(KpiFrequency.QUARTERLY), baselineValue: numeric, baselineDate: z.coerce.date(),
  finalTargetValue: numeric, weight: z.number().int().min(1).max(100).default(1), tolerance: z.number().finite().nonnegative().max(9999999999999999).default(0),
  disaggregation: z.array(z.string().trim().min(1).max(100)).max(20).nullable().optional(), formula: optionalText(1000), sourceDescription: optionalText(2000),
  status: z.nativeEnum(KpiIndicatorStatus).default(KpiIndicatorStatus.DRAFT), ownerId: uuid,
});
const periodBaseSchema = z.object({
  frameworkId: uuid, name: z.string().trim().min(2).max(120), startDate: z.coerce.date(), endDate: z.coerce.date(), dueDate: z.coerce.date(),
});
const periodSchema = periodBaseSchema.refine((value) => value.endDate >= value.startDate, { message: 'End date must be on or after start date', path: ['endDate'] })
  .refine((value) => value.dueDate >= value.endDate, { message: 'Due date must be on or after period end', path: ['dueDate'] });
const targetSchema = z.object({ indicatorId: uuid, periodId: uuid, targetValue: numeric, notes: optionalText(2000) });
const measurementSchema = z.object({
  indicatorId: uuid, periodId: uuid, actualValue: numeric, measuredAt: z.coerce.date(), narrative: optionalText(5000),
  disaggregation: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).nullable().optional(),
  sourceType: z.enum([KpiSourceType.MANUAL, KpiSourceType.FINANCE, KpiSourceType.COMPLIANCE, KpiSourceType.SUPPLY_CHAIN]).default(KpiSourceType.MANUAL), sourceReference: optionalText(1000),
}).refine((value) => value.sourceType === KpiSourceType.MANUAL || Boolean(value.sourceReference), { message: 'Integrated measurements require a source reference', path: ['sourceReference'] });
const dataSourceSchema = z.object({
  indicatorId: uuid, name: z.string().trim().min(2).max(200), sourceType: z.enum([KpiSourceType.TELEMETRY, KpiSourceType.ANALYTICS]),
  endpoint: sourceEndpoint, valuePath: z.string().trim().min(1).max(500), aggregation: z.nativeEnum(KpiAggregation).default(KpiAggregation.VALUE),
  configuration: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).nullable().optional(), isActive: z.boolean().default(true),
});
const evidenceSchema = z.object({
  indicatorId: optionalId, measurementId: optionalId, name: z.string().trim().min(2).max(240), url: safeUrl,
  mimeType: optionalText(120), notes: optionalText(2000),
}).refine((value) => [value.indicatorId, value.measurementId].filter(Boolean).length === 1, { message: 'Evidence must be linked to exactly one KPI record', path: ['indicatorId'] });

const managers: Role[] = [Role.ADMINISTRATOR, Role.ME_OFFICER];
const contributors: Role[] = [...managers, Role.PROJECT_MANAGER, Role.DEPARTMENT_HEAD];
const isManager = (role: Role) => managers.includes(role);
const isContributor = (role: Role) => contributors.includes(role);
const workflow = (actorId: string, entityType: string, entityId: string, action: string, fromStatus?: string | null, toStatus?: string | null, comment?: string | null) =>
  prisma.kpiWorkflowEvent.create({ data: { actorId, entityType, entityId, action, fromStatus, toStatus, comment } });
const audit = (actorId: string, action: string, entityType: string, entityId: string, metadata?: Prisma.InputJsonValue) =>
  prisma.auditLog.create({ data: { actorId, action, entityType, entityId, metadata } });
const achievement = (direction: KpiDirection, actual: number, target: number, tolerance = 0) => {
  if (direction === KpiDirection.INCREASE) return target === 0 ? (actual >= 0 ? 100 : 0) : Math.max(0, Math.min(150, actual / target * 100));
  if (direction === KpiDirection.DECREASE) return actual <= target ? 100 : actual === 0 ? 100 : Math.max(0, Math.min(150, target / actual * 100));
  const difference = Math.abs(actual - target);
  if (difference <= tolerance) return 100;
  const denominator = Math.max(Math.abs(target), 1);
  return Math.max(0, 100 - (difference - tolerance) / denominator * 100);
};
const round = (value: number) => Math.round(value * 10) / 10;
const extractPath = (value: unknown, keys: string[]): unknown[] => {
  if (!keys.length) return Array.isArray(value) ? value : [value];
  if (Array.isArray(value)) return value.flatMap((item) => extractPath(item, keys));
  if (!value || typeof value !== 'object') return [];
  return extractPath((value as Record<string, unknown>)[keys[0]], keys.slice(1));
};
const health = (score: number | null) => score == null ? 'NOT_REPORTED' : score >= 90 ? 'ON_TRACK' : score >= 70 ? 'AT_RISK' : 'OFF_TRACK';
const latestVerified = <T extends { status: KpiMeasurementStatus; measuredAt: Date }>(items: T[]) => items.filter((item) => item.status === KpiMeasurementStatus.VERIFIED).sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime())[0];
const indicatorPerformance = (indicator: { direction: KpiDirection; tolerance: Prisma.Decimal; finalTargetValue: Prisma.Decimal; targets: Array<{ periodId: string; targetValue: Prisma.Decimal }>; measurements: Array<{ periodId: string; actualValue: Prisma.Decimal; status: KpiMeasurementStatus; measuredAt: Date }> }, periodId?: string) => {
  const measurements = periodId ? indicator.measurements.filter((item) => item.periodId === periodId) : indicator.measurements;
  const measurement = latestVerified(measurements);
  if (!measurement) return { actual: null, target: periodId ? Number(indicator.targets.find((item) => item.periodId === periodId)?.targetValue ?? indicator.finalTargetValue) : Number(indicator.finalTargetValue), achievement: null, health: 'NOT_REPORTED' };
  const target = periodId ? Number(indicator.targets.find((item) => item.periodId === periodId)?.targetValue ?? indicator.finalTargetValue) : Number(indicator.finalTargetValue);
  const score = round(achievement(indicator.direction, Number(measurement.actualValue), target, Number(indicator.tolerance)));
  return { actual: Number(measurement.actualValue), target, achievement: score, health: health(score) };
};
const canContribute = async (user: { id: string; role: Role }, indicatorId: string) => {
  if (isManager(user.role) || user.role === Role.DEPARTMENT_HEAD) return true;
  const indicator = await prisma.kpiIndicator.findUnique({ where: { id: indicatorId }, include: { framework: { include: { project: { include: { assignments: true } } } } } });
  return Boolean(indicator && (indicator.ownerId === user.id || indicator.framework.ownerId === user.id || indicator.framework.project.managerId === user.id || indicator.framework.project.assignments.some((item) => item.userId === user.id)));
};

router.get('/options', async (_req, res, next) => {
  try {
    const [users, projects, frameworks, indicators, periods] = await Promise.all([
      prisma.user.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: userSelect }),
      prisma.project.findMany({ orderBy: { title: 'asc' }, select: projectSelect }),
      prisma.resultsFramework.findMany({ orderBy: { name: 'asc' }, select: { id: true, code: true, name: true, projectId: true, ownerId: true } }),
      prisma.kpiIndicator.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, name: true, frameworkId: true, status: true } }),
      prisma.kpiReportingPeriod.findMany({ orderBy: { startDate: 'desc' }, select: { id: true, name: true, frameworkId: true, startDate: true, endDate: true, status: true } }),
    ]);
    return res.json({ users, projects, frameworks, indicators, periods });
  } catch (error) { return next(error); }
});

router.get('/overview', async (req, res, next) => {
  try {
    const frameworkId = typeof req.query.frameworkId === 'string' ? req.query.frameworkId : undefined;
    const [frameworks, indicators, periods] = await Promise.all([
      prisma.resultsFramework.findMany({ where: frameworkId ? { id: frameworkId } : undefined }),
      prisma.kpiIndicator.findMany({ where: frameworkId ? { frameworkId } : undefined, include: { targets: true, measurements: true } }),
      prisma.kpiReportingPeriod.findMany({ where: frameworkId ? { frameworkId } : undefined }),
    ]);
    const active = indicators.filter((item) => item.status === KpiIndicatorStatus.ACTIVE);
    const performance = active.map((item) => ({ id: item.id, weight: item.weight, ...indicatorPerformance(item) }));
    const reported = performance.filter((item) => item.achievement != null);
    const totalWeight = reported.reduce((sum, item) => sum + item.weight, 0);
    const portfolioScore = totalWeight ? round(reported.reduce((sum, item) => sum + Math.min(item.achievement!, 100) * item.weight, 0) / totalWeight) : 0;
    return res.json({ summary: {
      frameworks: frameworks.length, activeIndicators: active.length, openPeriods: periods.filter((item) => item.status === KpiPeriodStatus.OPEN).length,
      overduePeriods: periods.filter((item) => item.dueDate < new Date() && !([KpiPeriodStatus.APPROVED, KpiPeriodStatus.CLOSED] as KpiPeriodStatus[]).includes(item.status)).length,
      reportingRate: active.length ? round(reported.length / active.length * 100) : 0, portfolioScore,
      onTrack: performance.filter((item) => item.health === 'ON_TRACK').length, atRisk: performance.filter((item) => item.health === 'AT_RISK').length,
      offTrack: performance.filter((item) => item.health === 'OFF_TRACK').length, notReported: performance.filter((item) => item.health === 'NOT_REPORTED').length,
    } });
  } catch (error) { return next(error); }
});

router.get('/register', async (_req, res, next) => {
  try {
    const [frameworks, events] = await Promise.all([
      prisma.resultsFramework.findMany({ include: frameworkInclude, orderBy: { code: 'asc' } }),
      prisma.kpiWorkflowEvent.findMany({ include: { actor: { select: userSelect } }, orderBy: { createdAt: 'desc' }, take: 300 }),
    ]);
    return res.json({ frameworks: frameworks.map((framework) => ({ ...framework, indicators: framework.indicators.map((indicator) => ({ ...indicator, performance: indicatorPerformance(indicator) })) })), events });
  } catch (error) { return next(error); }
});

router.post('/frameworks', async (req, res, next) => {
  try {
    if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only M&E Officers and Administrators can create results frameworks' });
    const framework = await prisma.resultsFramework.create({ data: frameworkSchema.parse(req.body), include: frameworkInclude });
    await Promise.all([workflow(req.authUser!.id, 'ResultsFramework', framework.id, 'CREATED', null, framework.status), audit(req.authUser!.id, 'RESULTS_FRAMEWORK_CREATED', 'ResultsFramework', framework.id)]);
    return res.status(201).json({ framework });
  } catch (error) { return next(error); }
});

router.patch('/frameworks/:id', async (req, res, next) => {
  try {
    if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only M&E Officers and Administrators can update results frameworks' });
    const current = await prisma.resultsFramework.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'Results framework not found' });
    const input = frameworkBaseSchema.partial().parse(req.body);
    if ((input.endDate ?? current.endDate) < (input.startDate ?? current.startDate)) return res.status(400).json({ message: 'End date must be on or after start date' });
    const framework = await prisma.resultsFramework.update({ where: { id: current.id }, data: input, include: frameworkInclude });
    await workflow(req.authUser!.id, 'ResultsFramework', framework.id, 'UPDATED', current.status, framework.status);
    return res.json({ framework });
  } catch (error) { return next(error); }
});

router.post('/frameworks/:frameworkId/results', async (req, res, next) => {
  try {
    if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only M&E Officers and Administrators can manage result levels' });
    const input = resultLevelSchema.parse(req.body);
    if (input.parentId) {
      const parent = await prisma.resultLevel.findUnique({ where: { id: input.parentId } });
      if (!parent || parent.frameworkId !== req.params.frameworkId) return res.status(400).json({ message: 'Parent result belongs to a different framework' });
    }
    const result = await prisma.resultLevel.create({ data: { ...input, frameworkId: req.params.frameworkId } });
    await workflow(req.authUser!.id, 'ResultLevel', result.id, 'CREATED', null, result.type);
    return res.status(201).json({ result });
  } catch (error) { return next(error); }
});

router.post('/indicators', async (req, res, next) => {
  try {
    if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only M&E Officers and Administrators can define KPIs' });
    const input = indicatorSchema.parse(req.body);
    const framework = await prisma.resultsFramework.findUnique({ where: { id: input.frameworkId } });
    if (!framework) return res.status(400).json({ message: 'Results framework not found' });
    if (input.baselineDate < framework.startDate || input.baselineDate > framework.endDate) return res.status(400).json({ message: 'Baseline date must fall within the results framework' });
    if (input.resultLevelId) {
      const result = await prisma.resultLevel.findUnique({ where: { id: input.resultLevelId } });
      if (!result || result.frameworkId !== input.frameworkId) return res.status(400).json({ message: 'Result level belongs to a different framework' });
    }
    const indicator = await prisma.kpiIndicator.create({ data: { ...input, disaggregation: input.disaggregation ?? Prisma.JsonNull }, include: indicatorInclude });
    await Promise.all([workflow(req.authUser!.id, 'KpiIndicator', indicator.id, 'CREATED', null, indicator.status), audit(req.authUser!.id, 'KPI_INDICATOR_CREATED', 'KpiIndicator', indicator.id)]);
    return res.status(201).json({ indicator });
  } catch (error) { return next(error); }
});

router.patch('/indicators/:id', async (req, res, next) => {
  try {
    if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only M&E Officers and Administrators can update KPIs' });
    const current = await prisma.kpiIndicator.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'KPI not found' });
    const parsed = indicatorSchema.omit({ frameworkId: true }).partial().parse(req.body);
    if (parsed.baselineDate) {
      const framework = await prisma.resultsFramework.findUnique({ where: { id: current.frameworkId } });
      if (!framework || parsed.baselineDate < framework.startDate || parsed.baselineDate > framework.endDate) return res.status(400).json({ message: 'Baseline date must fall within the results framework' });
    }
    const indicator = await prisma.kpiIndicator.update({ where: { id: current.id }, data: { ...parsed, disaggregation: parsed.disaggregation === null ? Prisma.JsonNull : parsed.disaggregation }, include: indicatorInclude });
    await workflow(req.authUser!.id, 'KpiIndicator', indicator.id, 'UPDATED', current.status, indicator.status);
    return res.json({ indicator });
  } catch (error) { return next(error); }
});

router.post('/periods', async (req, res, next) => {
  try {
    if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only M&E Officers and Administrators can open reporting periods' });
    const input = periodSchema.parse(req.body);
    const framework = await prisma.resultsFramework.findUnique({ where: { id: input.frameworkId } });
    if (!framework || input.startDate < framework.startDate || input.endDate > framework.endDate) return res.status(400).json({ message: 'Reporting period must fall within the results framework' });
    const overlap = await prisma.kpiReportingPeriod.findFirst({ where: { frameworkId: input.frameworkId, startDate: { lte: input.endDate }, endDate: { gte: input.startDate } } });
    if (overlap) return res.status(409).json({ message: 'Reporting period overlaps an existing period' });
    const period = await prisma.kpiReportingPeriod.create({ data: { ...input, createdById: req.authUser!.id }, include: periodInclude });
    await Promise.all([workflow(req.authUser!.id, 'KpiReportingPeriod', period.id, 'CREATED', null, period.status), audit(req.authUser!.id, 'KPI_PERIOD_CREATED', 'KpiReportingPeriod', period.id)]);
    return res.status(201).json({ period });
  } catch (error) { return next(error); }
});

router.put('/targets', async (req, res, next) => {
  try {
    if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only M&E Officers and Administrators can set KPI targets' });
    const input = targetSchema.parse(req.body);
    const [indicator, period] = await Promise.all([prisma.kpiIndicator.findUnique({ where: { id: input.indicatorId } }), prisma.kpiReportingPeriod.findUnique({ where: { id: input.periodId } })]);
    if (!indicator || !period || indicator.frameworkId !== period.frameworkId) return res.status(400).json({ message: 'Indicator and reporting period must belong to the same framework' });
    if (indicator.status !== KpiIndicatorStatus.ACTIVE) return res.status(409).json({ message: 'Targets can only be set for active KPIs' });
    if (period.status !== KpiPeriodStatus.OPEN) return res.status(409).json({ message: 'Targets can only be set for open reporting periods' });
    const target = await prisma.kpiTarget.upsert({ where: { indicatorId_periodId: { indicatorId: input.indicatorId, periodId: input.periodId } }, create: input, update: { targetValue: input.targetValue, notes: input.notes } });
    await workflow(req.authUser!.id, 'KpiTarget', target.id, 'SET', null, String(target.targetValue));
    return res.json({ target });
  } catch (error) { return next(error); }
});

router.post('/measurements', async (req, res, next) => {
  try {
    if (!isContributor(req.authUser!.role)) return res.status(403).json({ message: 'Your role cannot report KPI results' });
    const input = measurementSchema.parse(req.body);
    if (!(await canContribute(req.authUser!, input.indicatorId))) return res.status(403).json({ message: 'You are not assigned to this KPI or project' });
    const [indicator, period] = await Promise.all([prisma.kpiIndicator.findUnique({ where: { id: input.indicatorId } }), prisma.kpiReportingPeriod.findUnique({ where: { id: input.periodId } })]);
    if (!indicator || !period || indicator.frameworkId !== period.frameworkId) return res.status(400).json({ message: 'Indicator and reporting period must belong to the same framework' });
    if (indicator.status !== KpiIndicatorStatus.ACTIVE) return res.status(409).json({ message: 'Results can only be reported for active KPIs' });
    if (period.status !== KpiPeriodStatus.OPEN) return res.status(409).json({ message: 'The reporting period is not open' });
    if (input.measuredAt < period.startDate || input.measuredAt > period.endDate) return res.status(400).json({ message: 'Measurement date must fall within the reporting period' });
    const measurement = await prisma.kpiMeasurement.create({ data: { ...input, disaggregation: input.disaggregation ?? Prisma.JsonNull, createdById: req.authUser!.id }, include: measurementInclude });
    await Promise.all([workflow(req.authUser!.id, 'KpiMeasurement', measurement.id, 'CREATED', null, measurement.status), audit(req.authUser!.id, 'KPI_MEASUREMENT_CREATED', 'KpiMeasurement', measurement.id)]);
    return res.status(201).json({ measurement });
  } catch (error) { return next(error); }
});

router.post('/measurements/:id/submit', async (req, res, next) => {
  try {
    const current = await prisma.kpiMeasurement.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'KPI measurement not found' });
    if (!(isManager(req.authUser!.role) || current.createdById === req.authUser!.id)) return res.status(403).json({ message: 'You cannot submit this KPI measurement' });
    if (!([KpiMeasurementStatus.DRAFT, KpiMeasurementStatus.REJECTED] as KpiMeasurementStatus[]).includes(current.status)) return res.status(409).json({ message: 'Only draft or rejected measurements can be submitted' });
    const measurement = await prisma.kpiMeasurement.update({ where: { id: current.id }, data: { status: KpiMeasurementStatus.SUBMITTED, submittedAt: new Date(), verifiedById: null, verifiedAt: null, verificationComment: null }, include: measurementInclude });
    await workflow(req.authUser!.id, 'KpiMeasurement', measurement.id, 'SUBMITTED', current.status, measurement.status);
    return res.json({ measurement });
  } catch (error) { return next(error); }
});

router.post('/measurements/:id/decision', async (req, res, next) => {
  try {
    if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only M&E Officers and Administrators can verify KPI results' });
    const current = await prisma.kpiMeasurement.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'KPI measurement not found' });
    if (current.createdById === req.authUser!.id) return res.status(403).json({ message: 'A reporter cannot verify their own KPI result' });
    if (current.status !== KpiMeasurementStatus.SUBMITTED) return res.status(409).json({ message: 'Only submitted measurements can be verified or rejected' });
    const input = z.object({ status: z.enum([KpiMeasurementStatus.VERIFIED, KpiMeasurementStatus.REJECTED]), comment: optionalText(3000) }).parse(req.body);
    const measurement = await prisma.kpiMeasurement.update({ where: { id: current.id }, data: { status: input.status, verificationComment: input.comment, verifiedById: req.authUser!.id, verifiedAt: new Date() }, include: measurementInclude });
    await Promise.all([workflow(req.authUser!.id, 'KpiMeasurement', measurement.id, 'DECIDED', current.status, measurement.status, input.comment), audit(req.authUser!.id, 'KPI_MEASUREMENT_DECIDED', 'KpiMeasurement', measurement.id)]);
    return res.json({ measurement });
  } catch (error) { return next(error); }
});

router.post('/periods/:id/submit', async (req, res, next) => {
  try {
    if (!isContributor(req.authUser!.role)) return res.status(403).json({ message: 'Your role cannot submit KPI periods' });
    const current = await prisma.kpiReportingPeriod.findUnique({ where: { id: req.params.id }, include: { framework: { include: { project: true, indicators: true } }, measurements: true } });
    if (!current) return res.status(404).json({ message: 'Reporting period not found' });
    if (!(isManager(req.authUser!.role) || req.authUser!.role === Role.DEPARTMENT_HEAD || current.framework.ownerId === req.authUser!.id || current.framework.project.managerId === req.authUser!.id)) return res.status(403).json({ message: 'You cannot submit this reporting period' });
    if (!([KpiPeriodStatus.OPEN, KpiPeriodStatus.REJECTED] as KpiPeriodStatus[]).includes(current.status)) return res.status(409).json({ message: 'Only open or rejected reporting periods can be submitted' });
    const activeIds = current.framework.indicators.filter((item) => item.status === KpiIndicatorStatus.ACTIVE).map((item) => item.id);
    if (!activeIds.length) return res.status(409).json({ message: 'A reporting period cannot be submitted without active KPIs' });
    const verifiedIds = new Set(current.measurements.filter((item) => item.status === KpiMeasurementStatus.VERIFIED).map((item) => item.indicatorId));
    const missing = activeIds.filter((id) => !verifiedIds.has(id));
    if (missing.length) return res.status(409).json({ message: `${missing.length} active KPI(s) do not have a verified result for this period` });
    const period = await prisma.kpiReportingPeriod.update({ where: { id: current.id }, data: { status: KpiPeriodStatus.SUBMITTED, submittedById: req.authUser!.id, submittedAt: new Date(), reviewedById: null, reviewedAt: null, reviewComment: null }, include: periodInclude });
    await workflow(req.authUser!.id, 'KpiReportingPeriod', period.id, 'SUBMITTED', current.status, period.status);
    return res.json({ period });
  } catch (error) { return next(error); }
});

router.post('/periods/:id/decision', async (req, res, next) => {
  try {
    if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only M&E Officers and Administrators can approve KPI periods' });
    const current = await prisma.kpiReportingPeriod.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'Reporting period not found' });
    if (current.submittedById === req.authUser!.id) return res.status(403).json({ message: 'A submitter cannot approve or reject their own reporting period' });
    if (current.status !== KpiPeriodStatus.SUBMITTED) return res.status(409).json({ message: 'Only submitted reporting periods can be decided' });
    const input = z.object({ status: z.enum([KpiPeriodStatus.APPROVED, KpiPeriodStatus.REJECTED]), comment: optionalText(3000) }).parse(req.body);
    const period = await prisma.kpiReportingPeriod.update({ where: { id: current.id }, data: { status: input.status, reviewComment: input.comment, reviewedById: req.authUser!.id, reviewedAt: new Date() }, include: periodInclude });
    await Promise.all([workflow(req.authUser!.id, 'KpiReportingPeriod', period.id, 'DECIDED', current.status, period.status, input.comment), audit(req.authUser!.id, 'KPI_PERIOD_DECIDED', 'KpiReportingPeriod', period.id)]);
    return res.json({ period });
  } catch (error) { return next(error); }
});

router.post('/data-sources', async (req, res, next) => {
  try {
    if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only M&E Officers and Administrators can configure KPI data sources' });
    const input = dataSourceSchema.parse(req.body);
    const indicator = await prisma.kpiIndicator.findUnique({ where: { id: input.indicatorId } });
    if (!indicator || indicator.status !== KpiIndicatorStatus.ACTIVE) return res.status(409).json({ message: 'Operational sources require an active KPI' });
    const source = await prisma.kpiDataSource.create({ data: { ...input, configuration: input.configuration ?? Prisma.JsonNull } });
    await workflow(req.authUser!.id, 'KpiDataSource', source.id, 'CONFIGURED', null, source.sourceType);
    return res.status(201).json({ source });
  } catch (error) { return next(error); }
});

router.post('/data-sources/:id/sync', async (req, res, next) => {
  try {
    if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only M&E Officers and Administrators can synchronize KPI sources' });
    const source = await prisma.kpiDataSource.findUnique({ where: { id: req.params.id }, include: { indicator: true } });
    if (!source || !source.isActive || !source.endpoint || !source.valuePath) return res.status(404).json({ message: 'Active KPI data source not found' });
    const periodId = uuid.parse(req.body?.periodId);
    const period = await prisma.kpiReportingPeriod.findUnique({ where: { id: periodId } });
    if (!period || period.frameworkId !== source.indicator.frameworkId || period.status !== KpiPeriodStatus.OPEN) return res.status(409).json({ message: 'Choose an open reporting period for this KPI framework' });
    const base = new URL(process.env.OPERATIONAL_API_URL || 'http://localhost:8000');
    const url = new URL(source.endpoint, base);
    if (url.origin !== base.origin) return res.status(400).json({ message: 'The data source endpoint must remain on the configured operational API' });
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`Operational source returned HTTP ${response.status}`);
      const payload: unknown = await response.json();
      const values = extractPath(payload, source.valuePath.split('.').filter(Boolean)).map(Number).filter(Number.isFinite);
      if (!values.length) throw new Error('No numeric values were found at the configured value path');
      const actualValue = source.aggregation === KpiAggregation.COUNT ? values.length : source.aggregation === KpiAggregation.SUM ? values.reduce((sum, value) => sum + value, 0) : source.aggregation === KpiAggregation.AVERAGE ? values.reduce((sum, value) => sum + value, 0) / values.length : source.aggregation === KpiAggregation.MINIMUM ? Math.min(...values) : source.aggregation === KpiAggregation.MAXIMUM ? Math.max(...values) : values[values.length - 1];
      const now = new Date();
      const measuredAt = now < period.startDate ? period.startDate : now > period.endDate ? period.endDate : now;
      const measurement = await prisma.kpiMeasurement.create({ data: { indicatorId: source.indicatorId, periodId, actualValue, measuredAt, sourceType: source.sourceType, sourceReference: url.toString(), status: KpiMeasurementStatus.SUBMITTED, submittedAt: new Date(), createdById: req.authUser!.id }, include: measurementInclude });
      await prisma.kpiDataSource.update({ where: { id: source.id }, data: { lastSyncedAt: new Date(), lastValue: actualValue, lastError: null } });
      await Promise.all([workflow(req.authUser!.id, 'KpiDataSource', source.id, 'SYNCED', null, String(actualValue)), audit(req.authUser!.id, 'KPI_SOURCE_SYNCED', 'KpiDataSource', source.id, { periodId, actualValue })]);
      return res.json({ measurement });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : 'KPI source synchronization failed';
      await prisma.kpiDataSource.update({ where: { id: source.id }, data: { lastError: message } });
      return res.status(502).json({ message });
    }
  } catch (error) { return next(error); }
});

router.post('/evidence', async (req, res, next) => {
  try {
    if (!isContributor(req.authUser!.role)) return res.status(403).json({ message: 'Your role cannot attach KPI evidence' });
    const input = evidenceSchema.parse(req.body);
    if (input.indicatorId && !(await canContribute(req.authUser!, input.indicatorId))) return res.status(403).json({ message: 'You cannot attach evidence to this KPI' });
    if (input.measurementId) {
      const measurement = await prisma.kpiMeasurement.findUnique({ where: { id: input.measurementId } });
      if (!measurement || !(await canContribute(req.authUser!, measurement.indicatorId))) return res.status(403).json({ message: 'You cannot attach evidence to this measurement' });
    }
    const evidence = await prisma.kpiEvidence.create({ data: { ...input, uploadedById: req.authUser!.id }, include: evidenceInclude });
    await audit(req.authUser!.id, 'KPI_EVIDENCE_ATTACHED', 'KpiEvidence', evidence.id);
    return res.status(201).json({ evidence });
  } catch (error) { return next(error); }
});

router.get('/reports/performance.csv', async (req, res, next) => {
  try {
    const frameworkId = typeof req.query.frameworkId === 'string' ? req.query.frameworkId : undefined;
    const indicators = await prisma.kpiIndicator.findMany({ where: frameworkId ? { frameworkId } : undefined, include: { framework: { include: { project: true } }, targets: true, measurements: true }, orderBy: { code: 'asc' } });
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = indicators.map((item) => { const performance = indicatorPerformance(item); return [item.framework.project.code, item.framework.code, item.code, item.name, item.unit, item.direction, item.baselineValue, performance.target, performance.actual, performance.achievement, performance.health, item.weight].map(escape).join(','); });
    res.set('Cache-Control', 'private, no-store'); res.type('text/csv').attachment('kpi-performance-register.csv');
    return res.send(['Project,Framework,KPI Code,KPI Name,Unit,Direction,Baseline,Target,Actual,Achievement %,Health,Weight', ...rows].join('\n'));
  } catch (error) { return next(error); }
});

export default router;
