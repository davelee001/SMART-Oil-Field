import { Router } from 'express';
import {
  DeliveryStatus, Prisma, PurchaseRequestStatus, QualificationStatus, Role,
  SupplierContractStatus, SupplierSector, SupplierStatus,
} from '@prisma/client';
import { prisma } from '@smart-oil-field/database';
import { z } from 'zod';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

const uuid = z.string().uuid();
const optionalId = uuid.nullable().optional();
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const money = z.number().finite().nonnegative().max(9999999999999999);
const score = z.number().int().min(0).max(100);
const safeUrl = z.string().trim().url().max(2000)
  .refine((value) => value.startsWith('https://') || value.startsWith('http://localhost'), 'Use an HTTPS evidence URL');
const userSelect = { id: true, name: true, email: true, role: true };
const projectSelect = { id: true, code: true, title: true, department: true, managerId: true };
const evidenceInclude = { uploadedBy: { select: userSelect } };
const supplierInclude = {
  createdBy: { select: userSelect },
  qualifications: { include: { reviewer: { select: userSelect }, evidence: { include: evidenceInclude } }, orderBy: { createdAt: 'desc' as const } },
  performanceReviews: { include: { reviewer: { select: userSelect } }, orderBy: { periodEnd: 'desc' as const } },
  evidence: { include: evidenceInclude, orderBy: { createdAt: 'desc' as const } },
};
const contractInclude = { supplier: true, project: { select: projectSelect }, responsibleOfficer: { select: userSelect }, evidence: { include: evidenceInclude } };
const requestInclude = { supplier: true, contract: true, project: { select: projectSelect }, createdBy: { select: userSelect }, reviewedBy: { select: userSelect }, evidence: { include: evidenceInclude } };
const deliveryInclude = { supplier: true, contract: true, purchaseRequest: true, acceptedBy: { select: userSelect }, evidence: { include: evidenceInclude } };
const reviewInclude = { supplier: true, contract: true, reviewer: { select: userSelect }, evidence: { include: evidenceInclude } };

const supplierSchema = z.object({
  supplierCode: z.string().trim().min(2).max(50).regex(/^[A-Za-z0-9_./-]+$/).transform((value) => value.toUpperCase()),
  legalName: z.string().trim().min(2).max(240), tradingName: optionalText(240), registrationNumber: optionalText(100),
  taxNumber: optionalText(100), sector: z.nativeEnum(SupplierSector),
  categories: z.array(z.string().trim().min(2).max(100)).min(1).max(20), country: z.string().trim().min(2).max(120),
  address: optionalText(500), contactName: z.string().trim().min(2).max(160), contactEmail: z.string().trim().email().max(240),
  contactPhone: optionalText(50), status: z.nativeEnum(SupplierStatus).default(SupplierStatus.DRAFT),
  localContentPercentage: z.number().min(0).max(100).default(0), hseCertification: optionalText(240), notes: optionalText(5000),
});
const supplierUpdateSchema = supplierSchema.omit({ status: true }).partial().extend({
  status: z.enum([SupplierStatus.DRAFT, SupplierStatus.PENDING_QUALIFICATION, SupplierStatus.SUSPENDED, SupplierStatus.BLACKLISTED, SupplierStatus.INACTIVE]).optional(),
});
const qualificationSchema = z.object({
  reference: z.string().trim().min(2).max(80).transform((value) => value.toUpperCase()),
  expiresAt: z.coerce.date().nullable().optional(), notes: optionalText(5000),
});
const qualificationDecisionSchema = z.object({
  status: z.enum([QualificationStatus.APPROVED, QualificationStatus.REJECTED]),
  technicalScore: score, financialScore: score, hseScore: score, localContentScore: score, notes: optionalText(5000),
});
const contractBaseSchema = z.object({
  supplierId: uuid, projectId: optionalId, contractNumber: z.string().trim().min(2).max(100).transform((value) => value.toUpperCase()),
  title: z.string().trim().min(3).max(240), description: optionalText(5000), startDate: z.coerce.date(), endDate: z.coerce.date(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default('USD'), value: money,
  status: z.nativeEnum(SupplierContractStatus).default(SupplierContractStatus.DRAFT), renewalLeadDays: z.number().int().min(1).max(730).default(90),
  responsibleOfficerId: uuid, signedAt: z.coerce.date().nullable().optional(),
});
const contractSchema = contractBaseSchema.refine((value) => value.endDate >= value.startDate, { message: 'End date must be on or after start date', path: ['endDate'] });
const requestSchema = z.object({
  requestNumber: z.string().trim().min(2).max(100).transform((value) => value.toUpperCase()), supplierId: optionalId,
  contractId: optionalId, projectId: optionalId, title: z.string().trim().min(3).max(240),
  description: z.string().trim().min(10).max(5000), requiredBy: z.coerce.date(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default('USD'), estimatedAmount: money,
});
const deliverySchema = z.object({
  supplierId: uuid, contractId: optionalId, purchaseRequestId: optionalId,
  deliveryNumber: z.string().trim().min(2).max(100).transform((value) => value.toUpperCase()),
  scheduledDate: z.coerce.date(), actualDate: z.coerce.date().nullable().optional(), location: z.string().trim().min(2).max(240),
  items: z.string().trim().min(3).max(5000), status: z.nativeEnum(DeliveryStatus).default(DeliveryStatus.SCHEDULED),
  qualityScore: score.nullable().optional(), hseScore: score.nullable().optional(), acceptanceNotes: optionalText(3000),
});
const reviewBaseSchema = z.object({
  supplierId: uuid, contractId: optionalId, periodStart: z.coerce.date(), periodEnd: z.coerce.date(),
  qualityScore: score, deliveryScore: score, hseScore: score, localContentScore: score, costScore: score, comments: optionalText(5000),
});
const reviewSchema = reviewBaseSchema.refine((value) => value.periodEnd >= value.periodStart, { message: 'Period end must be on or after period start', path: ['periodEnd'] });
const evidenceSchema = z.object({
  supplierId: optionalId, qualificationId: optionalId, contractId: optionalId, purchaseRequestId: optionalId, deliveryId: optionalId, reviewId: optionalId,
  name: z.string().trim().min(2).max(240), url: safeUrl, mimeType: optionalText(120), notes: optionalText(2000),
}).refine((value) => [value.supplierId, value.qualificationId, value.contractId, value.purchaseRequestId, value.deliveryId, value.reviewId].filter(Boolean).length === 1,
  { message: 'Evidence must be linked to exactly one supply-chain record', path: ['supplierId'] });

const managers: Role[] = [Role.ADMINISTRATOR, Role.SUPPLY_CHAIN_OFFICER];
const contributors: Role[] = [...managers, Role.PROJECT_MANAGER, Role.DEPARTMENT_HEAD];
const isManager = (role: Role) => managers.includes(role);
const isContributor = (role: Role) => contributors.includes(role);
const workflow = (actorId: string, entityType: string, entityId: string, action: string, fromStatus?: string | null, toStatus?: string | null, comment?: string | null) =>
  prisma.supplierWorkflowEvent.create({ data: { actorId, entityType, entityId, action, fromStatus, toStatus, comment } });
const audit = (actorId: string, action: string, entityType: string, entityId: string, metadata?: Prisma.InputJsonValue) =>
  prisma.auditLog.create({ data: { actorId, action, entityType, entityId, metadata } });
const average = (values: number[]) => Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 100) / 100;
const effectiveQualificationStatus = (item: { status: QualificationStatus; expiresAt: Date | null }) =>
  item.status === QualificationStatus.APPROVED && item.expiresAt && item.expiresAt < new Date() ? QualificationStatus.EXPIRED : item.status;
const effectiveContractStatus = (item: { status: SupplierContractStatus; endDate: Date; renewalLeadDays: number }) => {
  if (item.status !== SupplierContractStatus.ACTIVE) return item.status;
  const daysRemaining = Math.ceil((item.endDate.getTime() - Date.now()) / 86400000);
  return daysRemaining < 0 ? 'EXPIRED' : daysRemaining <= item.renewalLeadDays ? 'EXPIRING' : item.status;
};

router.get('/options', async (_req, res, next) => {
  try {
    const [users, projects, suppliers, contracts, requests] = await Promise.all([
      prisma.user.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: userSelect }),
      prisma.project.findMany({ orderBy: { title: 'asc' }, select: projectSelect }),
      prisma.supplier.findMany({ orderBy: { legalName: 'asc' }, select: { id: true, supplierCode: true, legalName: true, status: true } }),
      prisma.supplierContract.findMany({ orderBy: { contractNumber: 'asc' }, select: { id: true, contractNumber: true, title: true, supplierId: true } }),
      prisma.purchaseRequest.findMany({ orderBy: { requestNumber: 'asc' }, select: { id: true, requestNumber: true, title: true, supplierId: true } }),
    ]);
    return res.json({ users, projects, suppliers, contracts, requests });
  } catch (error) { return next(error); }
});

router.get('/overview', async (_req, res, next) => {
  try {
    const [suppliers, qualifications, contracts, requests, deliveries, reviews] = await Promise.all([
      prisma.supplier.findMany(), prisma.supplierQualification.findMany(), prisma.supplierContract.findMany(),
      prisma.purchaseRequest.findMany(), prisma.supplierDelivery.findMany(), prisma.supplierPerformanceReview.findMany(),
    ]);
    return res.json({ summary: {
      totalSuppliers: suppliers.length,
      qualifiedSuppliers: suppliers.filter((item) => item.status === SupplierStatus.QUALIFIED).length,
      pendingQualifications: qualifications.filter((item) => ([QualificationStatus.NOT_STARTED, QualificationStatus.UNDER_REVIEW] as QualificationStatus[]).includes(effectiveQualificationStatus(item))).length,
      expiringQualifications: qualifications.filter((item) => effectiveQualificationStatus(item) === QualificationStatus.EXPIRED).length,
      activeContracts: contracts.filter((item) => item.status === SupplierContractStatus.ACTIVE).length,
      expiringContracts: contracts.filter((item) => ['EXPIRING', 'EXPIRED'].includes(effectiveContractStatus(item))).length,
      pendingRequests: requests.filter((item) => ([PurchaseRequestStatus.SUBMITTED, PurchaseRequestStatus.APPROVED] as PurchaseRequestStatus[]).includes(item.status)).length,
      lateDeliveries: deliveries.filter((item) => item.status === DeliveryStatus.LATE || (item.scheduledDate < new Date() && !([DeliveryStatus.ACCEPTED, DeliveryStatus.REJECTED] as DeliveryStatus[]).includes(item.status))).length,
      averagePerformance: reviews.length ? average(reviews.map((item) => Number(item.overallScore))) : 0,
      belowStandardSuppliers: new Set(reviews.filter((item) => Number(item.overallScore) < 70).map((item) => item.supplierId)).size,
    } });
  } catch (error) { return next(error); }
});

router.get('/register', async (_req, res, next) => {
  try {
    const [suppliers, contracts, requests, deliveries, reviews, events] = await Promise.all([
      prisma.supplier.findMany({ include: supplierInclude, orderBy: { legalName: 'asc' } }),
      prisma.supplierContract.findMany({ include: contractInclude, orderBy: { endDate: 'asc' } }),
      prisma.purchaseRequest.findMany({ include: requestInclude, orderBy: { createdAt: 'desc' } }),
      prisma.supplierDelivery.findMany({ include: deliveryInclude, orderBy: { scheduledDate: 'desc' } }),
      prisma.supplierPerformanceReview.findMany({ include: reviewInclude, orderBy: { periodEnd: 'desc' } }),
      prisma.supplierWorkflowEvent.findMany({ include: { actor: { select: userSelect } }, orderBy: { createdAt: 'desc' }, take: 200 }),
    ]);
    return res.json({
      suppliers: suppliers.map((item) => ({ ...item, qualifications: item.qualifications.map((qualification) => ({ ...qualification, effectiveStatus: effectiveQualificationStatus(qualification) })), averagePerformance: item.performanceReviews.length ? average(item.performanceReviews.map((review) => Number(review.overallScore))) : null })),
      contracts: contracts.map((item) => ({ ...item, effectiveStatus: effectiveContractStatus(item) })), requests, deliveries, reviews, events,
    });
  } catch (error) { return next(error); }
});

router.post('/suppliers', async (req, res, next) => {
  try {
    if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only Supply Chain Officers and Administrators can register suppliers' });
    const supplier = await prisma.supplier.create({ data: { ...supplierSchema.parse(req.body), createdById: req.authUser!.id }, include: supplierInclude });
    await Promise.all([workflow(req.authUser!.id, 'Supplier', supplier.id, 'CREATED', null, supplier.status), audit(req.authUser!.id, 'SUPPLIER_CREATED', 'Supplier', supplier.id)]);
    return res.status(201).json({ supplier });
  } catch (error) { return next(error); }
});

router.patch('/suppliers/:id', async (req, res, next) => {
  try {
    if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only Supply Chain Officers and Administrators can update suppliers' });
    const current = await prisma.supplier.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'Supplier not found' });
    const supplier = await prisma.supplier.update({ where: { id: current.id }, data: supplierUpdateSchema.parse(req.body), include: supplierInclude });
    await workflow(req.authUser!.id, 'Supplier', supplier.id, 'UPDATED', current.status, supplier.status);
    return res.json({ supplier });
  } catch (error) { return next(error); }
});

router.post('/suppliers/:supplierId/qualifications', async (req, res, next) => {
  try {
    if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only Supply Chain Officers and Administrators can start qualification' });
    const input = qualificationSchema.parse(req.body);
    const qualification = await prisma.supplierQualification.create({ data: { ...input, supplierId: req.params.supplierId, status: QualificationStatus.UNDER_REVIEW, submittedAt: new Date() } });
    await workflow(req.authUser!.id, 'SupplierQualification', qualification.id, 'SUBMITTED', null, qualification.status);
    return res.status(201).json({ qualification });
  } catch (error) { return next(error); }
});

router.post('/qualifications/:id/decision', async (req, res, next) => {
  try {
    if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only Supply Chain Officers and Administrators can decide qualification' });
    const current = await prisma.supplierQualification.findUnique({ where: { id: req.params.id }, include: { supplier: true } });
    if (!current) return res.status(404).json({ message: 'Qualification not found' });
    if (current.supplier.createdById === req.authUser!.id) return res.status(403).json({ message: 'A supplier registrant cannot approve or reject its qualification' });
    const input = qualificationDecisionSchema.parse(req.body);
    const overallScore = average([input.technicalScore, input.financialScore, input.hseScore, input.localContentScore]);
    const qualification = await prisma.supplierQualification.update({ where: { id: current.id }, data: { ...input, overallScore, reviewerId: req.authUser!.id, reviewedAt: new Date() } });
    await prisma.supplier.update({ where: { id: current.supplierId }, data: { status: input.status === QualificationStatus.APPROVED ? SupplierStatus.QUALIFIED : SupplierStatus.PENDING_QUALIFICATION } });
    await Promise.all([workflow(req.authUser!.id, 'SupplierQualification', qualification.id, 'DECIDED', current.status, qualification.status, input.notes), audit(req.authUser!.id, 'SUPPLIER_QUALIFICATION_DECIDED', 'SupplierQualification', qualification.id, { overallScore })]);
    return res.json({ qualification });
  } catch (error) { return next(error); }
});

router.post('/contracts', async (req, res, next) => {
  try {
    if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only Supply Chain Officers and Administrators can manage supplier contracts' });
    const input = contractSchema.parse(req.body);
    const supplier = await prisma.supplier.findUnique({ where: { id: input.supplierId } });
    if (!supplier || supplier.status !== SupplierStatus.QUALIFIED) return res.status(400).json({ message: 'Contracts require a qualified supplier' });
    const contract = await prisma.supplierContract.create({ data: input, include: contractInclude });
    await Promise.all([workflow(req.authUser!.id, 'SupplierContract', contract.id, 'CREATED', null, contract.status), audit(req.authUser!.id, 'SUPPLIER_CONTRACT_CREATED', 'SupplierContract', contract.id)]);
    return res.status(201).json({ contract });
  } catch (error) { return next(error); }
});

router.patch('/contracts/:id', async (req, res, next) => {
  try {
    if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only Supply Chain Officers and Administrators can manage supplier contracts' });
    const current = await prisma.supplierContract.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'Contract not found' });
    const input = contractBaseSchema.partial().parse(req.body);
    if ((input.endDate ?? current.endDate) < (input.startDate ?? current.startDate)) return res.status(400).json({ message: 'End date must be on or after start date' });
    const contract = await prisma.supplierContract.update({ where: { id: current.id }, data: input, include: contractInclude });
    await workflow(req.authUser!.id, 'SupplierContract', contract.id, 'UPDATED', current.status, contract.status);
    return res.json({ contract });
  } catch (error) { return next(error); }
});

router.post('/purchase-requests', async (req, res, next) => {
  try {
    if (!isContributor(req.authUser!.role)) return res.status(403).json({ message: 'Your role cannot create purchase requests' });
    const input = requestSchema.parse(req.body);
    const contract = input.contractId ? await prisma.supplierContract.findUnique({ where: { id: input.contractId } }) : null;
    if (input.contractId && !contract) return res.status(400).json({ message: 'Supplier contract not found' });
    if (contract && input.supplierId && contract.supplierId !== input.supplierId) return res.status(400).json({ message: 'The contract belongs to a different supplier' });
    const request = await prisma.purchaseRequest.create({ data: { ...input, supplierId: input.supplierId ?? contract?.supplierId, createdById: req.authUser!.id }, include: requestInclude });
    await Promise.all([workflow(req.authUser!.id, 'PurchaseRequest', request.id, 'CREATED', null, request.status), audit(req.authUser!.id, 'PURCHASE_REQUEST_CREATED', 'PurchaseRequest', request.id)]);
    return res.status(201).json({ request });
  } catch (error) { return next(error); }
});

router.post('/purchase-requests/:id/submit', async (req, res, next) => {
  try {
    const current = await prisma.purchaseRequest.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'Purchase request not found' });
    if (!(isManager(req.authUser!.role) || current.createdById === req.authUser!.id)) return res.status(403).json({ message: 'You cannot submit this purchase request' });
    if (current.status !== PurchaseRequestStatus.DRAFT) return res.status(409).json({ message: 'Only draft purchase requests can be submitted' });
    const item = await prisma.purchaseRequest.update({ where: { id: current.id }, data: { status: PurchaseRequestStatus.SUBMITTED, submittedAt: new Date() }, include: requestInclude });
    await workflow(req.authUser!.id, 'PurchaseRequest', item.id, 'SUBMITTED', current.status, item.status);
    return res.json({ request: item });
  } catch (error) { return next(error); }
});

router.post('/purchase-requests/:id/decision', async (req, res, next) => {
  try {
    if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only Supply Chain Officers and Administrators can approve purchase requests' });
    const current = await prisma.purchaseRequest.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'Purchase request not found' });
    if (current.createdById === req.authUser!.id) return res.status(403).json({ message: 'A requester cannot approve or reject their own request' });
    if (current.status !== PurchaseRequestStatus.SUBMITTED) return res.status(409).json({ message: 'Only submitted purchase requests can be decided' });
    const input = z.object({ status: z.enum([PurchaseRequestStatus.APPROVED, PurchaseRequestStatus.REJECTED]), comment: optionalText(3000) }).parse(req.body);
    const item = await prisma.purchaseRequest.update({ where: { id: current.id }, data: { status: input.status, reviewComment: input.comment, reviewedById: req.authUser!.id, reviewedAt: new Date() }, include: requestInclude });
    await Promise.all([workflow(req.authUser!.id, 'PurchaseRequest', item.id, 'DECIDED', current.status, item.status, input.comment), audit(req.authUser!.id, 'PURCHASE_REQUEST_DECIDED', 'PurchaseRequest', item.id)]);
    return res.json({ request: item });
  } catch (error) { return next(error); }
});

router.post('/deliveries', async (req, res, next) => {
  try {
    if (!isContributor(req.authUser!.role)) return res.status(403).json({ message: 'Your role cannot record supplier deliveries' });
    const input = deliverySchema.parse(req.body);
    const [contract, purchaseRequest] = await Promise.all([
      input.contractId ? prisma.supplierContract.findUnique({ where: { id: input.contractId } }) : null,
      input.purchaseRequestId ? prisma.purchaseRequest.findUnique({ where: { id: input.purchaseRequestId } }) : null,
    ]);
    if (input.contractId && (!contract || contract.supplierId !== input.supplierId)) return res.status(400).json({ message: 'The contract does not belong to this supplier' });
    if (input.purchaseRequestId && (!purchaseRequest || (purchaseRequest.supplierId && purchaseRequest.supplierId !== input.supplierId))) return res.status(400).json({ message: 'The purchase request does not belong to this supplier' });
    const delivery = await prisma.supplierDelivery.create({ data: input, include: deliveryInclude });
    await Promise.all([workflow(req.authUser!.id, 'SupplierDelivery', delivery.id, 'CREATED', null, delivery.status), audit(req.authUser!.id, 'SUPPLIER_DELIVERY_CREATED', 'SupplierDelivery', delivery.id)]);
    return res.status(201).json({ delivery });
  } catch (error) { return next(error); }
});

router.post('/deliveries/:id/accept', async (req, res, next) => {
  try {
    if (!isContributor(req.authUser!.role)) return res.status(403).json({ message: 'Your role cannot accept supplier deliveries' });
    const current = await prisma.supplierDelivery.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'Delivery not found' });
    const input = z.object({ status: z.enum([DeliveryStatus.ACCEPTED, DeliveryStatus.REJECTED]), qualityScore: score, hseScore: score, notes: optionalText(3000) }).parse(req.body);
    const delivery = await prisma.supplierDelivery.update({ where: { id: current.id }, data: { status: input.status, qualityScore: input.qualityScore, hseScore: input.hseScore, acceptanceNotes: input.notes, actualDate: current.actualDate ?? new Date(), acceptedById: req.authUser!.id }, include: deliveryInclude });
    await workflow(req.authUser!.id, 'SupplierDelivery', delivery.id, 'ACCEPTED_DECISION', current.status, delivery.status, input.notes);
    return res.json({ delivery });
  } catch (error) { return next(error); }
});

router.post('/performance-reviews', async (req, res, next) => {
  try {
    if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only Supply Chain Officers and Administrators can issue performance reviews' });
    const input = reviewSchema.parse(req.body);
    if (input.contractId) {
      const contract = await prisma.supplierContract.findUnique({ where: { id: input.contractId } });
      if (!contract || contract.supplierId !== input.supplierId) return res.status(400).json({ message: 'The contract does not belong to this supplier' });
    }
    const overallScore = average([input.qualityScore, input.deliveryScore, input.hseScore, input.localContentScore, input.costScore]);
    const review = await prisma.supplierPerformanceReview.create({ data: { ...input, overallScore, reviewerId: req.authUser!.id }, include: reviewInclude });
    await Promise.all([workflow(req.authUser!.id, 'SupplierPerformanceReview', review.id, 'CREATED', null, String(overallScore), input.comments), audit(req.authUser!.id, 'SUPPLIER_PERFORMANCE_REVIEWED', 'SupplierPerformanceReview', review.id, { overallScore })]);
    return res.status(201).json({ review });
  } catch (error) { return next(error); }
});

router.post('/evidence', async (req, res, next) => {
  try {
    if (!isContributor(req.authUser!.role)) return res.status(403).json({ message: 'Your role cannot attach supply-chain evidence' });
    const evidence = await prisma.supplierEvidence.create({ data: { ...evidenceSchema.parse(req.body), uploadedById: req.authUser!.id }, include: evidenceInclude });
    await audit(req.authUser!.id, 'SUPPLIER_EVIDENCE_ATTACHED', 'SupplierEvidence', evidence.id);
    return res.status(201).json({ evidence });
  } catch (error) { return next(error); }
});

router.get('/reports/suppliers.csv', async (_req, res, next) => {
  try {
    const suppliers = await prisma.supplier.findMany({ include: { qualifications: true, performanceReviews: true }, orderBy: { supplierCode: 'asc' } });
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = suppliers.map((supplier) => [supplier.supplierCode, supplier.legalName, supplier.sector, supplier.status, supplier.country,
      Number(supplier.localContentPercentage), supplier.qualifications[0] ? effectiveQualificationStatus(supplier.qualifications[0]) : '',
      supplier.performanceReviews.length ? average(supplier.performanceReviews.map((item) => Number(item.overallScore))) : ''].map(escape).join(','));
    res.set('Cache-Control', 'private, no-store');
    res.type('text/csv').attachment('supplier-performance-register.csv');
    return res.send(['Supplier Code,Legal Name,Sector,Status,Country,Local Content %,Qualification,Performance Score', ...rows].join('\n'));
  } catch (error) { return next(error); }
});

export default router;
