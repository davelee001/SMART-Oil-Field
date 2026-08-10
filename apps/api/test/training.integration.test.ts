import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CertificationStatus, Role, TrainingAssessmentType, TrainingAttendanceStatus, TrainingCourseStatus,
  TrainingDeliveryMode, TrainingEnrollmentStatus, TrainingSessionStatus, User,
} from '@prisma/client';

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  project: { findMany: vi.fn(), findUnique: vi.fn() },
  trainingCompetency: { findMany: vi.fn(), create: vi.fn() },
  staffCompetency: { findMany: vi.fn(), upsert: vi.fn() },
  trainingCourse: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), create: vi.fn() },
  courseCompetency: { upsert: vi.fn() }, trainingRequirement: { findMany: vi.fn(), create: vi.fn() },
  trainingSession: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  trainingEnrollment: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  trainingAttendance: { findMany: vi.fn(), upsert: vi.fn() },
  trainingAssessment: { upsert: vi.fn() },
  staffCertification: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  trainingEvidence: { create: vi.fn() },
  trainingWorkflowEvent: { findMany: vi.fn(), create: vi.fn() }, auditLog: { create: vi.fn() },
  $queryRaw: vi.fn(), $disconnect: vi.fn(),
}));
vi.mock('@smart-oil-field/database', () => ({ prisma: prismaMock }));
import { createApp } from '../src/app';

const userId = 'dff73f65-8808-46e5-a347-9947280baaa4';
const otherId = '6533f167-b17a-4ec9-b35a-cbb1ac99079e';
const courseId = 'cded935f-c715-44eb-92d9-e20f95f83a55';
const sessionId = '5ba9660b-0190-4f2a-b19a-00cb26d369b4';
const enrollmentId = '85e4a9db-0d26-4bbd-b7dc-ecf3bf699f95';
const certificationId = 'a104b8d9-0a7c-4965-ae69-e98dc81d1bc3';

const makeUser = (role: Role): User => ({
  id: userId, name: 'Training User', email: 'training@example.com', passwordHash: '', role,
  department: 'Operations', walletAddress: null, isActive: true, tokenVersion: 0, lastLoginAt: null,
  createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
});
const course = {
  id: courseId, code: 'HSE-101', title: 'Operational HSE', category: 'Safety', description: 'Operational health and safety essentials.',
  provider: 'SMART Academy', deliveryMode: TrainingDeliveryMode.CLASSROOM, durationHours: 16, validityMonths: 12,
  mandatory: true, defaultCost: 500, currency: 'USD', status: TrainingCourseStatus.ACTIVE, createdAt: new Date(), updatedAt: new Date(), competencies: [],
};
const session = {
  id: sessionId, courseId, projectId: null, sessionCode: 'TRN-001', title: 'HSE Cohort 1', startDate: new Date('2026-09-01'), endDate: new Date('2026-09-02'),
  location: 'Juba Training Centre', instructor: 'A. Facilitator', capacity: 2, plannedCost: 1000, actualCost: 0, currency: 'USD',
  status: TrainingSessionStatus.APPROVED, coordinatorId: userId, submittedById: otherId, reviewedById: userId,
  submittedAt: new Date(), reviewedAt: new Date(), reviewComment: null, createdAt: new Date(), updatedAt: new Date(), project: null, course, enrollments: [], evidence: [],
};
const enrollment = {
  id: enrollmentId, sessionId, userId: otherId, nominatedById: userId, status: TrainingEnrollmentStatus.ENROLLED,
  attendancePercentage: 0, completedAt: null, feedback: null, effectivenessScore: null, createdAt: new Date(), updatedAt: new Date(),
  session, attendance: [], assessments: [], certifications: [], evidence: [],
};
const certification = {
  id: certificationId, userId: otherId, courseId, competencyId: null, enrollmentId, certificateNumber: 'CERT-001',
  title: course.title, issuer: course.provider!, issuedAt: new Date('2026-09-03'), expiresAt: new Date('2027-09-03'),
  status: CertificationStatus.ACTIVE, issuedById: userId, verifiedById: null, verifiedAt: null, notes: null, createdAt: new Date(), updatedAt: new Date(), evidence: [],
};

describe('training and capacity-building HTTP integration', () => {
  let user: User;
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'training-capacity-tests-secret-that-is-definitely-at-least-sixty-four-characters-long';
    process.env.JWT_ISSUER = 'smart-oil-field-api-test'; process.env.JWT_AUDIENCE = 'smart-oil-field-services-test';
  });
  beforeEach(async () => {
    vi.clearAllMocks(); user = makeUser(Role.VIEWER); user.passwordHash = await bcrypt.hash('SecurePassword123!', 4);
    prismaMock.user.findUnique.mockImplementation(async ({ where }: { where: { id?: string; email?: string } }) => where.id === user.id || where.email === user.email ? user : null);
    prismaMock.user.update.mockResolvedValue(user); prismaMock.user.findMany.mockResolvedValue([user]);
    prismaMock.project.findMany.mockResolvedValue([]); prismaMock.project.findUnique.mockResolvedValue(null);
    prismaMock.trainingCompetency.findMany.mockResolvedValue([]); prismaMock.staffCompetency.findMany.mockResolvedValue([]);
    prismaMock.trainingCourse.findMany.mockResolvedValue([course]); prismaMock.trainingCourse.findUnique.mockResolvedValue(course); prismaMock.trainingCourse.count.mockResolvedValue(1); prismaMock.trainingCourse.create.mockResolvedValue(course);
    prismaMock.trainingRequirement.findMany.mockResolvedValue([]); prismaMock.trainingSession.findMany.mockResolvedValue([session]); prismaMock.trainingSession.findUnique.mockResolvedValue(session);
    prismaMock.trainingSession.create.mockResolvedValue(session); prismaMock.trainingSession.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...session, ...data }));
    prismaMock.trainingEnrollment.findMany.mockResolvedValue([enrollment]); prismaMock.trainingEnrollment.findUnique.mockResolvedValue(enrollment);
    prismaMock.trainingEnrollment.create.mockResolvedValue(enrollment); prismaMock.trainingEnrollment.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...enrollment, ...data }));
    prismaMock.trainingAttendance.findMany.mockResolvedValue([]); prismaMock.trainingAttendance.upsert.mockResolvedValue({ id: 'attendance', enrollmentId, sessionDate: new Date('2026-09-01'), status: TrainingAttendanceStatus.PRESENT, hours: 8 });
    prismaMock.trainingAssessment.upsert.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'assessment', ...data }));
    prismaMock.staffCertification.findMany.mockResolvedValue([certification]); prismaMock.staffCertification.findUnique.mockResolvedValue(certification);
    prismaMock.staffCertification.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...certification, ...data })); prismaMock.staffCertification.update.mockResolvedValue({ ...certification, verifiedById: userId });
    prismaMock.trainingWorkflowEvent.findMany.mockResolvedValue([]); prismaMock.trainingWorkflowEvent.create.mockResolvedValue({}); prismaMock.auditLog.create.mockResolvedValue({}); prismaMock.trainingEvidence.create.mockResolvedValue({ id: 'evidence' });
  });
  const login = async () => { const agent = request.agent(createApp()); await agent.post('/api/auth/login').send({ email: user.email, password: 'SecurePassword123!' }); return agent; };

  it('provides authenticated viewers with portfolio training analytics', async () => {
    const response = await (await login()).get('/api/training/overview');
    expect(response.status).toBe(200); expect(response.body.summary.activeCourses).toBe(1); expect(response.body.summary.requirementCompliance).toBe(100);
  });
  it('prevents viewers from creating courses', async () => {
    const response = await (await login()).post('/api/training/courses').send({});
    expect(response.status).toBe(403); expect(prismaMock.trainingCourse.create).not.toHaveBeenCalled();
  });
  it('allows Department Heads to create governed course records', async () => {
    user = { ...user, role: Role.DEPARTMENT_HEAD };
    const response = await (await login()).post('/api/training/courses').send({ code: course.code, title: course.title, category: course.category, description: course.description, deliveryMode: course.deliveryMode, durationHours: 16, status: course.status });
    expect(response.status).toBe(201); expect(prismaMock.trainingCourse.create).toHaveBeenCalledOnce();
  });
  it('requires Project Managers to coordinate sessions they create', async () => {
    user = { ...user, role: Role.PROJECT_MANAGER };
    const response = await (await login()).post('/api/training/sessions').send({ courseId, sessionCode: 'TRN-002', title: 'HSE Cohort 2', startDate: '2026-09-01', endDate: '2026-09-02', location: 'Juba', instructor: 'Trainer', capacity: 10, coordinatorId: otherId });
    expect(response.status).toBe(403); expect(prismaMock.trainingSession.create).not.toHaveBeenCalled();
  });
  it('enforces four-eyes approval for submitted sessions', async () => {
    user = { ...user, role: Role.DEPARTMENT_HEAD }; prismaMock.trainingSession.findUnique.mockResolvedValue({ ...session, status: TrainingSessionStatus.SUBMITTED, submittedById: userId });
    const response = await (await login()).post(`/api/training/sessions/${sessionId}/decision`).send({ approved: true });
    expect(response.status).toBe(403); expect(prismaMock.trainingSession.update).not.toHaveBeenCalled();
  });
  it('resets review metadata when a returned session is resubmitted', async () => {
    user = { ...user, role: Role.PROJECT_MANAGER }; prismaMock.trainingSession.findUnique.mockResolvedValue({ ...session, status: TrainingSessionStatus.DRAFT, reviewedById: otherId, reviewedAt: new Date(), reviewComment: 'Revise venue' });
    const response = await (await login()).post(`/api/training/sessions/${sessionId}/submit`);
    expect(response.status).toBe(200); expect(prismaMock.trainingSession.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ reviewedById: null, reviewedAt: null, reviewComment: null }) }));
  });
  it('prevents nominations when a session is at capacity', async () => {
    user = { ...user, role: Role.PROJECT_MANAGER }; prismaMock.trainingSession.findUnique.mockResolvedValue({ ...session, capacity: 1, enrollments: [{ ...enrollment, status: TrainingEnrollmentStatus.ENROLLED }] });
    const response = await (await login()).post(`/api/training/sessions/${sessionId}/enrollments`).send({ userId: otherId });
    expect(response.status).toBe(409); expect(prismaMock.trainingEnrollment.create).not.toHaveBeenCalled();
  });
  it('rejects attendance outside the approved session dates', async () => {
    user = { ...user, role: Role.PROJECT_MANAGER };
    const response = await (await login()).put(`/api/training/enrollments/${enrollmentId}/attendance`).send({ sessionDate: '2026-08-01', status: 'PRESENT', hours: 8 });
    expect(response.status).toBe(400); expect(prismaMock.trainingAttendance.upsert).not.toHaveBeenCalled();
  });
  it('counts partial attendance proportionally', async () => {
    user = { ...user, role: Role.PROJECT_MANAGER }; prismaMock.trainingAttendance.upsert.mockResolvedValue({ id: 'attendance', enrollmentId, sessionDate: new Date('2026-09-01'), status: TrainingAttendanceStatus.PARTIAL, hours: 4 });
    const response = await (await login()).put(`/api/training/enrollments/${enrollmentId}/attendance`).send({ sessionDate: '2026-09-01', status: 'PARTIAL', hours: 4 });
    expect(response.status).toBe(200); expect(response.body.attendancePercentage).toBe(50);
  });
  it('requires at least 75 percent attendance before completion', async () => {
    user = { ...user, role: Role.PROJECT_MANAGER }; prismaMock.trainingEnrollment.findUnique.mockResolvedValue({ ...enrollment, attendancePercentage: 50, assessments: [{ type: TrainingAssessmentType.POST_TRAINING }] });
    const response = await (await login()).post(`/api/training/enrollments/${enrollmentId}/complete`);
    expect(response.status).toBe(409); expect(prismaMock.trainingEnrollment.update).not.toHaveBeenCalled();
  });
  it('requires a post-training assessment before completion', async () => {
    user = { ...user, role: Role.PROJECT_MANAGER }; prismaMock.trainingEnrollment.findUnique.mockResolvedValue({ ...enrollment, attendancePercentage: 100, assessments: [] });
    const response = await (await login()).post(`/api/training/enrollments/${enrollmentId}/complete`);
    expect(response.status).toBe(409);
  });
  it('ties certificates to the completed enrollment course and derives expiry', async () => {
    user = { ...user, role: Role.DEPARTMENT_HEAD }; prismaMock.trainingEnrollment.findUnique.mockResolvedValue({ ...enrollment, status: TrainingEnrollmentStatus.COMPLETED, session: { ...session, course } });
    const response = await (await login()).post('/api/training/certifications').send({ userId: otherId, enrollmentId, certificateNumber: 'CERT-002', title: course.title, issuer: course.provider, issuedAt: '2026-09-03' });
    expect(response.status).toBe(201); expect(prismaMock.staffCertification.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ courseId, expiresAt: expect.any(Date) }) }));
  });
  it('prevents certificate issuers from verifying their own records', async () => {
    user = { ...user, role: Role.DEPARTMENT_HEAD }; prismaMock.staffCertification.findUnique.mockResolvedValue({ ...certification, issuedById: userId });
    const response = await (await login()).post(`/api/training/certifications/${certificationId}/verify`);
    expect(response.status).toBe(403); expect(prismaMock.staffCertification.update).not.toHaveBeenCalled();
  });
  it('rejects insecure evidence links', async () => {
    user = { ...user, role: Role.PROJECT_MANAGER };
    const response = await (await login()).post('/api/training/evidence').send({ sessionId, name: 'Attendance register', url: 'http://files.example.com/register.pdf' });
    expect(response.status).toBe(400); expect(prismaMock.trainingEvidence.create).not.toHaveBeenCalled();
  });
  it('exports an authenticated no-store compliance register', async () => {
    const response = await (await login()).get('/api/training/reports/compliance.csv');
    expect(response.status).toBe(200); expect(response.headers['content-type']).toContain('text/csv'); expect(response.headers['cache-control']).toContain('no-store'); expect(response.text).toContain('Training User');
  });
});
