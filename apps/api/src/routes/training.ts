import { Router } from 'express';
import {
  CertificationStatus, Prisma, Role, TrainingAssessmentType, TrainingAttendanceStatus,
  TrainingCourseStatus, TrainingDeliveryMode, TrainingEnrollmentStatus, TrainingSessionStatus,
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
const safeUrl = z.string().trim().url().max(2000).refine((value) => value.startsWith('https://') || value.startsWith('http://localhost'), 'Use an HTTPS evidence URL');
const userSelect = { id: true, name: true, email: true, department: true, role: true };
const projectSelect = { id: true, code: true, title: true, department: true, managerId: true };
const evidenceInclude = { uploadedBy: { select: userSelect } };
const enrollmentInclude = {
  user: { select: userSelect }, nominatedBy: { select: userSelect },
  attendance: { include: { recordedBy: { select: userSelect } }, orderBy: { sessionDate: 'asc' as const } },
  assessments: { include: { assessor: { select: userSelect }, evidence: { include: evidenceInclude } }, orderBy: { assessedAt: 'asc' as const } },
  certifications: true, evidence: { include: evidenceInclude, orderBy: { createdAt: 'desc' as const } },
};
const sessionInclude = {
  course: { include: { competencies: { include: { competency: true } } } }, project: { select: projectSelect },
  coordinator: { select: userSelect }, submittedBy: { select: userSelect }, reviewedBy: { select: userSelect },
  enrollments: { include: enrollmentInclude, orderBy: { user: { name: 'asc' as const } } },
  evidence: { include: evidenceInclude, orderBy: { createdAt: 'desc' as const } },
};
const certificationInclude = { user: { select: userSelect }, course: true, competency: true, issuedBy: { select: userSelect }, verifiedBy: { select: userSelect }, evidence: { include: evidenceInclude } };

const competencySchema = z.object({ code: z.string().trim().min(2).max(60).regex(/^[A-Za-z0-9_./-]+$/).transform((value) => value.toUpperCase()), name: z.string().trim().min(2).max(200), category: z.string().trim().min(2).max(120), description: z.string().trim().min(10).max(5000), isActive: z.boolean().default(true) });
const staffCompetencySchema = z.object({ userId: uuid, competencyId: uuid, currentLevel: z.number().int().min(0).max(5), targetLevel: z.number().int().min(1).max(5), notes: optionalText(3000) });
const courseSchema = z.object({
  code: z.string().trim().min(2).max(60).regex(/^[A-Za-z0-9_./-]+$/).transform((value) => value.toUpperCase()), title: z.string().trim().min(3).max(240), category: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(5000), provider: optionalText(240), deliveryMode: z.nativeEnum(TrainingDeliveryMode), durationHours: z.number().positive().max(10000),
  validityMonths: z.number().int().min(1).max(600).nullable().optional(), mandatory: z.boolean().default(false), defaultCost: money.default(0),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default('USD'), status: z.nativeEnum(TrainingCourseStatus).default(TrainingCourseStatus.DRAFT),
});
const requirementSchema = z.object({
  name: z.string().trim().min(3).max(240), role: z.nativeEnum(Role).nullable().optional(), department: optionalText(160), courseId: optionalId, competencyId: optionalId,
  requiredLevel: z.number().int().min(1).max(5).nullable().optional(), dueWithinDays: z.number().int().min(1).max(3650).default(365), renewalMonths: z.number().int().min(1).max(600).nullable().optional(), isActive: z.boolean().default(true), notes: optionalText(3000),
}).refine((value) => value.role || value.department, { message: 'Target a role, department, or both', path: ['role'] })
  .refine((value) => value.courseId || value.competencyId, { message: 'Link a required course, competency, or both', path: ['courseId'] });
const sessionBaseSchema = z.object({
  courseId: uuid, projectId: optionalId, sessionCode: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9_./-]+$/).transform((value) => value.toUpperCase()), title: z.string().trim().min(3).max(240),
  startDate: z.coerce.date(), endDate: z.coerce.date(), location: z.string().trim().min(2).max(240), instructor: z.string().trim().min(2).max(240), capacity: z.number().int().min(1).max(100000),
  plannedCost: money.default(0), actualCost: money.default(0), currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default('USD'), coordinatorId: uuid,
});
const sessionSchema = sessionBaseSchema.refine((value) => value.endDate >= value.startDate, { message: 'End date must be on or after start date', path: ['endDate'] });
const attendanceSchema = z.object({ sessionDate: z.coerce.date(), status: z.nativeEnum(TrainingAttendanceStatus), hours: z.number().finite().min(0).max(24).default(0), notes: optionalText(2000) });
const assessmentSchema = z.object({ type: z.nativeEnum(TrainingAssessmentType), score: z.number().finite().nonnegative(), maximumScore: z.number().positive().max(100000).default(100), assessedAt: z.coerce.date(), notes: optionalText(3000) }).refine((value) => value.score <= value.maximumScore, { message: 'Score cannot exceed maximum score', path: ['score'] });
const certificationSchema = z.object({ userId: uuid, courseId: optionalId, competencyId: optionalId, enrollmentId: optionalId, certificateNumber: z.string().trim().min(2).max(120).transform((value) => value.toUpperCase()), title: z.string().trim().min(3).max(240), issuer: z.string().trim().min(2).max(240), issuedAt: z.coerce.date(), expiresAt: z.coerce.date().nullable().optional(), notes: optionalText(3000) })
  .refine((value) => value.courseId || value.competencyId || value.enrollmentId, { message: 'Link the certification to a course, competency, or enrollment', path: ['courseId'] })
  .refine((value) => !value.expiresAt || value.expiresAt >= value.issuedAt, { message: 'Expiry date must be on or after issue date', path: ['expiresAt'] });
const evidenceSchema = z.object({ staffCompetencyId: optionalId, sessionId: optionalId, enrollmentId: optionalId, assessmentId: optionalId, certificationId: optionalId, name: z.string().trim().min(2).max(240), url: safeUrl, mimeType: optionalText(120), notes: optionalText(2000) })
  .refine((value) => [value.staffCompetencyId, value.sessionId, value.enrollmentId, value.assessmentId, value.certificationId].filter(Boolean).length === 1, { message: 'Evidence must be linked to exactly one training record', path: ['sessionId'] });

const managers: Role[] = [Role.ADMINISTRATOR, Role.DEPARTMENT_HEAD];
const coordinators: Role[] = [...managers, Role.PROJECT_MANAGER];
const isManager = (role: Role) => managers.includes(role);
const isCoordinator = (role: Role) => coordinators.includes(role);
const workflow = (actorId: string, entityType: string, entityId: string, action: string, fromStatus?: string | null, toStatus?: string | null, comment?: string | null) => prisma.trainingWorkflowEvent.create({ data: { actorId, entityType, entityId, action, fromStatus, toStatus, comment } });
const audit = (actorId: string, action: string, entityType: string, entityId: string, metadata?: Prisma.InputJsonValue) => prisma.auditLog.create({ data: { actorId, action, entityType, entityId, metadata } });
const effectiveCertificationStatus = (item: { status: CertificationStatus; expiresAt: Date | null }) => {
  if (item.status === CertificationStatus.REVOKED || !item.expiresAt) return item.status;
  const days = Math.ceil((item.expiresAt.getTime() - Date.now()) / 86400000);
  return days < 0 ? CertificationStatus.EXPIRED : days <= 90 ? CertificationStatus.EXPIRING : item.status;
};
const attendancePercentage = (records: Array<{ status: TrainingAttendanceStatus }>) => {
  if (!records.length) return 0;
  const attended = records.reduce((total, item) => total + (item.status === TrainingAttendanceStatus.PRESENT ? 1 : item.status === TrainingAttendanceStatus.PARTIAL ? 0.5 : 0), 0);
  return Math.round(attended / records.length * 10000) / 100;
};
const canCoordinateSession = (user: { id: string; role: Role }, session: { coordinatorId: string; project: { managerId: string } | null }) => isManager(user.role) || session.coordinatorId === user.id || session.project?.managerId === user.id;

router.get('/options', async (_req, res, next) => {
  try {
    const [users, projects, competencies, courses, sessions, enrollments] = await Promise.all([
      prisma.user.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: userSelect }), prisma.project.findMany({ orderBy: { title: 'asc' }, select: projectSelect }),
      prisma.trainingCompetency.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }), prisma.trainingCourse.findMany({ where: { status: TrainingCourseStatus.ACTIVE }, orderBy: { title: 'asc' } }),
      prisma.trainingSession.findMany({ orderBy: { startDate: 'desc' }, select: { id: true, sessionCode: true, title: true, courseId: true, status: true } }),
      prisma.trainingEnrollment.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, sessionId: true, userId: true, status: true } }),
    ]);
    return res.json({ users, projects, competencies, courses, sessions, enrollments });
  } catch (error) { return next(error); }
});

router.get('/overview', async (_req, res, next) => {
  try {
    const [users, requirements, profiles, certifications, sessions, enrollments, attendance] = await Promise.all([
      prisma.user.findMany({ where: { isActive: true } }), prisma.trainingRequirement.findMany({ where: { isActive: true } }), prisma.staffCompetency.findMany(),
      prisma.staffCertification.findMany(), prisma.trainingSession.findMany(), prisma.trainingEnrollment.findMany(), prisma.trainingAttendance.findMany(),
    ]);
    let applicable = 0; let compliant = 0;
    for (const user of users) for (const requirement of requirements) {
      if ((requirement.role && requirement.role !== user.role) || (requirement.department && requirement.department !== user.department)) continue;
      applicable += 1;
      const competencyMet = !requirement.competencyId || profiles.some((item) => item.userId === user.id && item.competencyId === requirement.competencyId && item.currentLevel >= (requirement.requiredLevel || 1));
      const courseMet = !requirement.courseId || certifications.some((item) => item.userId === user.id && item.courseId === requirement.courseId && ([CertificationStatus.ACTIVE, CertificationStatus.EXPIRING] as CertificationStatus[]).includes(effectiveCertificationStatus(item)) && Boolean(item.verifiedById));
      if (competencyMet && courseMet) compliant += 1;
    }
    const completed = enrollments.filter((item) => item.status === TrainingEnrollmentStatus.COMPLETED);
    return res.json({ summary: {
      activeCourses: await prisma.trainingCourse.count({ where: { status: TrainingCourseStatus.ACTIVE } }), upcomingSessions: sessions.filter((item) => item.startDate > new Date() && ([TrainingSessionStatus.APPROVED, TrainingSessionStatus.SCHEDULED] as TrainingSessionStatus[]).includes(item.status)).length,
      activeParticipants: enrollments.filter((item) => !([TrainingEnrollmentStatus.CANCELLED, TrainingEnrollmentStatus.NO_SHOW] as TrainingEnrollmentStatus[]).includes(item.status)).length,
      completionRate: enrollments.length ? Math.round(completed.length / enrollments.length * 1000) / 10 : 0,
      requirementCompliance: applicable ? Math.round(compliant / applicable * 1000) / 10 : 100, applicableRequirements: applicable, unmetRequirements: applicable - compliant,
      skillsGaps: profiles.filter((item) => item.currentLevel < item.targetLevel).length,
      expiringCertifications: certifications.filter((item) => ([CertificationStatus.EXPIRING, CertificationStatus.EXPIRED] as CertificationStatus[]).includes(effectiveCertificationStatus(item))).length,
      trainingHours: Math.round(attendance.filter((item) => item.status === TrainingAttendanceStatus.PRESENT || item.status === TrainingAttendanceStatus.PARTIAL).reduce((sum, item) => sum + Number(item.hours), 0) * 10) / 10,
      plannedCost: sessions.reduce((sum, item) => sum + Number(item.plannedCost), 0), actualCost: sessions.reduce((sum, item) => sum + Number(item.actualCost), 0),
      averageEffectiveness: completed.filter((item) => item.effectivenessScore != null).length ? Math.round(completed.filter((item) => item.effectivenessScore != null).reduce((sum, item) => sum + item.effectivenessScore!, 0) / completed.filter((item) => item.effectivenessScore != null).length * 10) / 10 : 0,
    } });
  } catch (error) { return next(error); }
});

router.get('/register', async (_req, res, next) => {
  try {
    const [competencies, profiles, courses, requirements, sessions, certifications, events] = await Promise.all([
      prisma.trainingCompetency.findMany({ orderBy: { code: 'asc' } }),
      prisma.staffCompetency.findMany({ include: { user: { select: userSelect }, competency: true, assessedBy: { select: userSelect }, evidence: { include: evidenceInclude } }, orderBy: { user: { name: 'asc' } } }),
      prisma.trainingCourse.findMany({ include: { competencies: { include: { competency: true } } }, orderBy: { code: 'asc' } }),
      prisma.trainingRequirement.findMany({ include: { course: true, competency: true }, orderBy: { name: 'asc' } }),
      prisma.trainingSession.findMany({ include: sessionInclude, orderBy: { startDate: 'desc' } }),
      prisma.staffCertification.findMany({ include: certificationInclude, orderBy: { expiresAt: 'asc' } }),
      prisma.trainingWorkflowEvent.findMany({ include: { actor: { select: userSelect } }, orderBy: { createdAt: 'desc' }, take: 300 }),
    ]);
    return res.json({ competencies, profiles, courses, requirements, sessions, certifications: certifications.map((item) => ({ ...item, effectiveStatus: effectiveCertificationStatus(item) })), events });
  } catch (error) { return next(error); }
});

router.post('/competencies', async (req, res, next) => {
  try { if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only Administrators and Department Heads can manage competencies' }); const competency = await prisma.trainingCompetency.create({ data: competencySchema.parse(req.body) }); await Promise.all([workflow(req.authUser!.id, 'TrainingCompetency', competency.id, 'CREATED', null, 'ACTIVE'), audit(req.authUser!.id, 'TRAINING_COMPETENCY_CREATED', 'TrainingCompetency', competency.id)]); return res.status(201).json({ competency }); } catch (error) { return next(error); }
});

router.put('/staff-competencies', async (req, res, next) => {
  try {
    if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only Administrators and Department Heads can assess staff competencies' });
    const input = staffCompetencySchema.parse(req.body);
    const profile = await prisma.staffCompetency.upsert({ where: { userId_competencyId: { userId: input.userId, competencyId: input.competencyId } }, create: { ...input, assessedById: req.authUser!.id, assessedAt: new Date() }, update: { ...input, assessedById: req.authUser!.id, assessedAt: new Date() }, include: { user: { select: userSelect }, competency: true } });
    await workflow(req.authUser!.id, 'StaffCompetency', profile.id, 'ASSESSED', null, `${profile.currentLevel}/${profile.targetLevel}`); return res.json({ profile });
  } catch (error) { return next(error); }
});

router.post('/courses', async (req, res, next) => {
  try { if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only Administrators and Department Heads can manage courses' }); const course = await prisma.trainingCourse.create({ data: courseSchema.parse(req.body), include: { competencies: true } }); await Promise.all([workflow(req.authUser!.id, 'TrainingCourse', course.id, 'CREATED', null, course.status), audit(req.authUser!.id, 'TRAINING_COURSE_CREATED', 'TrainingCourse', course.id)]); return res.status(201).json({ course }); } catch (error) { return next(error); }
});

router.post('/courses/:courseId/competencies', async (req, res, next) => {
  try { if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only Administrators and Department Heads can map course competencies' }); const input = z.object({ competencyId: uuid, targetLevel: z.number().int().min(1).max(5) }).parse(req.body); const mapping = await prisma.courseCompetency.upsert({ where: { courseId_competencyId: { courseId: req.params.courseId, competencyId: input.competencyId } }, create: { courseId: req.params.courseId, ...input }, update: { targetLevel: input.targetLevel } }); return res.json({ mapping }); } catch (error) { return next(error); }
});

router.post('/requirements', async (req, res, next) => {
  try { if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only Administrators and Department Heads can manage training requirements' }); const requirement = await prisma.trainingRequirement.create({ data: requirementSchema.parse(req.body) }); await workflow(req.authUser!.id, 'TrainingRequirement', requirement.id, 'CREATED', null, 'ACTIVE'); return res.status(201).json({ requirement }); } catch (error) { return next(error); }
});

router.post('/sessions', async (req, res, next) => {
  try {
    if (!isCoordinator(req.authUser!.role)) return res.status(403).json({ message: 'Your role cannot create training sessions' }); const input = sessionSchema.parse(req.body);
    if (!isManager(req.authUser!.role) && input.coordinatorId !== req.authUser!.id) return res.status(403).json({ message: 'Project Managers must coordinate sessions they create' });
    if (input.projectId && req.authUser!.role === Role.PROJECT_MANAGER) { const project = await prisma.project.findUnique({ where: { id: input.projectId } }); if (!project || project.managerId !== req.authUser!.id) return res.status(403).json({ message: 'You can only link sessions to projects you manage' }); }
    const course = await prisma.trainingCourse.findUnique({ where: { id: input.courseId } }); if (!course || course.status !== TrainingCourseStatus.ACTIVE) return res.status(409).json({ message: 'Training sessions require an active course' });
    const session = await prisma.trainingSession.create({ data: input, include: sessionInclude }); await Promise.all([workflow(req.authUser!.id, 'TrainingSession', session.id, 'CREATED', null, session.status), audit(req.authUser!.id, 'TRAINING_SESSION_CREATED', 'TrainingSession', session.id)]); return res.status(201).json({ session });
  } catch (error) { return next(error); }
});

router.post('/sessions/:id/submit', async (req, res, next) => {
  try { const current = await prisma.trainingSession.findUnique({ where: { id: req.params.id }, include: { project: true } }); if (!current) return res.status(404).json({ message: 'Training session not found' }); if (!canCoordinateSession(req.authUser!, current)) return res.status(403).json({ message: 'You cannot submit this session' }); if (current.status !== TrainingSessionStatus.DRAFT) return res.status(409).json({ message: 'Only draft sessions can be submitted' }); const session = await prisma.trainingSession.update({ where: { id: current.id }, data: { status: TrainingSessionStatus.SUBMITTED, submittedById: req.authUser!.id, submittedAt: new Date(), reviewedById: null, reviewedAt: null, reviewComment: null }, include: sessionInclude }); await workflow(req.authUser!.id, 'TrainingSession', session.id, 'SUBMITTED', current.status, session.status); return res.json({ session }); } catch (error) { return next(error); }
});

router.post('/sessions/:id/decision', async (req, res, next) => {
  try { if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only Administrators and Department Heads can approve sessions' }); const current = await prisma.trainingSession.findUnique({ where: { id: req.params.id } }); if (!current) return res.status(404).json({ message: 'Training session not found' }); if (current.submittedById === req.authUser!.id) return res.status(403).json({ message: 'A submitter cannot approve their own training session' }); if (current.status !== TrainingSessionStatus.SUBMITTED) return res.status(409).json({ message: 'Only submitted sessions can be decided' }); const input = z.object({ approved: z.boolean(), comment: optionalText(3000) }).parse(req.body); const status = input.approved ? TrainingSessionStatus.APPROVED : TrainingSessionStatus.DRAFT; const session = await prisma.trainingSession.update({ where: { id: current.id }, data: { status, reviewedById: req.authUser!.id, reviewedAt: new Date(), reviewComment: input.comment }, include: sessionInclude }); await Promise.all([workflow(req.authUser!.id, 'TrainingSession', session.id, input.approved ? 'APPROVED' : 'RETURNED', current.status, status, input.comment), audit(req.authUser!.id, 'TRAINING_SESSION_DECIDED', 'TrainingSession', session.id)]); return res.json({ session }); } catch (error) { return next(error); }
});

router.post('/sessions/:sessionId/enrollments', async (req, res, next) => {
  try { const session = await prisma.trainingSession.findUnique({ where: { id: req.params.sessionId }, include: { project: true, enrollments: true } }); if (!session) return res.status(404).json({ message: 'Training session not found' }); if (!canCoordinateSession(req.authUser!, session)) return res.status(403).json({ message: 'You cannot nominate participants for this session' }); if (!([TrainingSessionStatus.APPROVED, TrainingSessionStatus.SCHEDULED] as TrainingSessionStatus[]).includes(session.status)) return res.status(409).json({ message: 'Participants can only be enrolled in approved or scheduled sessions' }); if (session.enrollments.filter((item) => !([TrainingEnrollmentStatus.CANCELLED, TrainingEnrollmentStatus.NO_SHOW] as TrainingEnrollmentStatus[]).includes(item.status)).length >= session.capacity) return res.status(409).json({ message: 'Training session is at capacity' }); const input = z.object({ userId: uuid }).parse(req.body); const enrollment = await prisma.trainingEnrollment.create({ data: { sessionId: session.id, userId: input.userId, nominatedById: req.authUser!.id, status: TrainingEnrollmentStatus.ENROLLED }, include: enrollmentInclude }); await workflow(req.authUser!.id, 'TrainingEnrollment', enrollment.id, 'ENROLLED', null, enrollment.status); return res.status(201).json({ enrollment }); } catch (error) { return next(error); }
});

router.put('/enrollments/:id/attendance', async (req, res, next) => {
  try { const enrollment = await prisma.trainingEnrollment.findUnique({ where: { id: req.params.id }, include: { session: { include: { project: true } }, attendance: true } }); if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' }); if (!canCoordinateSession(req.authUser!, enrollment.session)) return res.status(403).json({ message: 'You cannot record attendance for this session' }); const input = attendanceSchema.parse(req.body); if (input.sessionDate < enrollment.session.startDate || input.sessionDate > enrollment.session.endDate) return res.status(400).json({ message: 'Attendance date must fall within the training session' }); const record = await prisma.trainingAttendance.upsert({ where: { enrollmentId_sessionDate: { enrollmentId: enrollment.id, sessionDate: input.sessionDate } }, create: { enrollmentId: enrollment.id, ...input, recordedById: req.authUser!.id }, update: { ...input, recordedById: req.authUser!.id } }); const records = [...enrollment.attendance.filter((item) => item.sessionDate.getTime() !== input.sessionDate.getTime()), record]; await prisma.trainingEnrollment.update({ where: { id: enrollment.id }, data: { attendancePercentage: attendancePercentage(records), status: records.some((item) => item.status === TrainingAttendanceStatus.PRESENT) ? TrainingEnrollmentStatus.ATTENDED : enrollment.status } }); return res.json({ attendance: record, attendancePercentage: attendancePercentage(records) }); } catch (error) { return next(error); }
});

router.put('/enrollments/:id/assessments', async (req, res, next) => {
  try { const enrollment = await prisma.trainingEnrollment.findUnique({ where: { id: req.params.id }, include: { session: { include: { project: true } }, assessments: true } }); if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' }); if (!canCoordinateSession(req.authUser!, enrollment.session)) return res.status(403).json({ message: 'You cannot assess this participant' }); const input = assessmentSchema.parse(req.body); const assessment = await prisma.trainingAssessment.upsert({ where: { enrollmentId_type: { enrollmentId: enrollment.id, type: input.type } }, create: { enrollmentId: enrollment.id, ...input, assessorId: req.authUser!.id }, update: { ...input, assessorId: req.authUser!.id } }); const assessments = [...enrollment.assessments.filter((item) => item.type !== input.type), assessment]; const pre = assessments.find((item) => item.type === TrainingAssessmentType.PRE_TRAINING); const latest = assessments.find((item) => item.type === TrainingAssessmentType.FOLLOW_UP) || assessments.find((item) => item.type === TrainingAssessmentType.POST_TRAINING); if (pre && latest) { const prePercent = Number(pre.score) / Number(pre.maximumScore) * 100; const latestPercent = Number(latest.score) / Number(latest.maximumScore) * 100; await prisma.trainingEnrollment.update({ where: { id: enrollment.id }, data: { effectivenessScore: Math.max(0, Math.min(100, Math.round((latestPercent - prePercent + 100) / 2))) } }); } return res.json({ assessment }); } catch (error) { return next(error); }
});

router.post('/enrollments/:id/complete', async (req, res, next) => {
  try { const enrollment = await prisma.trainingEnrollment.findUnique({ where: { id: req.params.id }, include: { session: { include: { project: true } }, assessments: true } }); if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' }); if (!canCoordinateSession(req.authUser!, enrollment.session)) return res.status(403).json({ message: 'You cannot complete this enrollment' }); if (Number(enrollment.attendancePercentage) < 75) return res.status(409).json({ message: 'Completion requires at least 75% attendance' }); if (!enrollment.assessments.some((item) => item.type === TrainingAssessmentType.POST_TRAINING)) return res.status(409).json({ message: 'Completion requires a post-training assessment' }); const item = await prisma.trainingEnrollment.update({ where: { id: enrollment.id }, data: { status: TrainingEnrollmentStatus.COMPLETED, completedAt: new Date() }, include: enrollmentInclude }); await workflow(req.authUser!.id, 'TrainingEnrollment', item.id, 'COMPLETED', enrollment.status, item.status); return res.json({ enrollment: item }); } catch (error) { return next(error); }
});

router.post('/certifications', async (req, res, next) => {
  try {
    if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only Administrators and Department Heads can issue certifications' });
    const input = certificationSchema.parse(req.body);
    if (input.enrollmentId) {
      const enrollment = await prisma.trainingEnrollment.findUnique({ where: { id: input.enrollmentId }, include: { session: { include: { course: true } } } });
      if (!enrollment || enrollment.userId !== input.userId || enrollment.status !== TrainingEnrollmentStatus.COMPLETED) return res.status(409).json({ message: 'Certification enrollment must be completed by the selected staff member' });
      if (input.courseId && enrollment.session.courseId !== input.courseId) return res.status(409).json({ message: 'Certification course must match the completed enrollment course' });
      if (!input.courseId) input.courseId = enrollment.session.courseId;
      if (!input.expiresAt && enrollment.session.course.validityMonths) {
        const expiresAt = new Date(input.issuedAt);
        expiresAt.setUTCMonth(expiresAt.getUTCMonth() + enrollment.session.course.validityMonths);
        input.expiresAt = expiresAt;
      }
    } else if (input.courseId && !input.expiresAt) {
      const course = await prisma.trainingCourse.findUnique({ where: { id: input.courseId } });
      if (course?.validityMonths) {
        const expiresAt = new Date(input.issuedAt);
        expiresAt.setUTCMonth(expiresAt.getUTCMonth() + course.validityMonths);
        input.expiresAt = expiresAt;
      }
    }
    const certification = await prisma.staffCertification.create({ data: { ...input, issuedById: req.authUser!.id }, include: certificationInclude });
    await Promise.all([workflow(req.authUser!.id, 'StaffCertification', certification.id, 'ISSUED', null, certification.status), audit(req.authUser!.id, 'STAFF_CERTIFICATION_ISSUED', 'StaffCertification', certification.id)]);
    return res.status(201).json({ certification });
  } catch (error) { return next(error); }
});

router.post('/certifications/:id/verify', async (req, res, next) => {
  try { if (!isManager(req.authUser!.role)) return res.status(403).json({ message: 'Only Administrators and Department Heads can verify certifications' }); const current = await prisma.staffCertification.findUnique({ where: { id: req.params.id } }); if (!current) return res.status(404).json({ message: 'Certification not found' }); if (current.issuedById === req.authUser!.id) return res.status(403).json({ message: 'A certificate issuer cannot verify their own record' }); const item = await prisma.staffCertification.update({ where: { id: current.id }, data: { verifiedById: req.authUser!.id, verifiedAt: new Date() }, include: certificationInclude }); await workflow(req.authUser!.id, 'StaffCertification', item.id, 'VERIFIED', current.status, item.status); return res.json({ certification: item }); } catch (error) { return next(error); }
});

router.post('/evidence', async (req, res, next) => {
  try { if (!isCoordinator(req.authUser!.role)) return res.status(403).json({ message: 'Your role cannot attach training evidence' }); const evidence = await prisma.trainingEvidence.create({ data: { ...evidenceSchema.parse(req.body), uploadedById: req.authUser!.id }, include: evidenceInclude }); await audit(req.authUser!.id, 'TRAINING_EVIDENCE_ATTACHED', 'TrainingEvidence', evidence.id); return res.status(201).json({ evidence }); } catch (error) { return next(error); }
});

router.get('/reports/compliance.csv', async (_req, res, next) => {
  try { const [users, profiles, certifications] = await Promise.all([prisma.user.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }), prisma.staffCompetency.findMany({ include: { competency: true } }), prisma.staffCertification.findMany({ include: { course: true } })]); const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`; const rows = users.map((user) => { const gaps = profiles.filter((item) => item.userId === user.id && item.currentLevel < item.targetLevel).length; const active = certifications.filter((item) => item.userId === user.id && ([CertificationStatus.ACTIVE, CertificationStatus.EXPIRING] as CertificationStatus[]).includes(effectiveCertificationStatus(item)) && item.verifiedById).length; const expiring = certifications.filter((item) => item.userId === user.id && ([CertificationStatus.EXPIRING, CertificationStatus.EXPIRED] as CertificationStatus[]).includes(effectiveCertificationStatus(item))).length; return [user.name, user.email, user.department, user.role, gaps, active, expiring].map(escape).join(','); }); res.set('Cache-Control', 'private, no-store'); res.type('text/csv').attachment('training-compliance-register.csv'); return res.send(['Staff,Email,Department,Role,Skills Gaps,Verified Certifications,Expiring or Expired', ...rows].join('\n')); } catch (error) { return next(error); }
});

export default router;
