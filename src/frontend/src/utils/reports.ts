export type FormalReportType = 'PROJECT' | 'QUARTERLY' | 'ANNUAL' | 'FINANCE' | 'COMPLIANCE' | 'SUPPLIER' | 'TRAINING' | 'DEPARTMENT' | 'EXECUTIVE';
export type ReportTemplateStatus = 'DRAFT' | 'SUBMITTED' | 'ACTIVE' | 'REJECTED' | 'RETIRED';
export type FormalReportStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'SIGNED' | 'PUBLISHED' | 'ARCHIVED';
export interface ReportUser { id: string; name: string; email: string; department: string | null; role: string }
export interface ReportProject { id: string; code: string; title: string; department: string; managerId: string }
export interface ReportMetric { category: string; label: string; value: string | number }
export interface ReportSnapshot { generatedAt: string; scope: { projectId: string | null; department: string | null; periodStart: string; periodEnd: string }; metrics: ReportMetric[] }
export interface ReportEvidence { id: string; name: string; url: string; mimeType: string | null; notes: string | null; uploadedBy: ReportUser; createdAt: string }
export interface ReportTemplate { id: string; code: string; name: string; type: FormalReportType; description: string; sections: string[]; allowedRoles: string[]; isSystem: boolean; status: ReportTemplateStatus; version: number; createdBy: ReportUser; submittedBy: ReportUser | null; reviewedBy: ReportUser | null; reviewComment: string | null }
export interface ReportVersion { id: string; version: number; executiveSummary: string; findings: string; recommendations: string; content: { sections: Array<{ title: string; metrics: ReportMetric[] }> }; sourceSnapshot: ReportSnapshot; checksum: string; createdBy: ReportUser; createdAt: string; evidence: ReportEvidence[] }
export interface FormalReport { id: string; reference: string; title: string; type: FormalReportType; template: ReportTemplate; project: ReportProject | null; department: string | null; periodStart: string; periodEnd: string; status: FormalReportStatus; currentVersion: number; ownerId: string; owner: ReportUser; submittedBy: ReportUser | null; reviewedBy: ReportUser | null; signedBy: ReportUser | null; publishedBy: ReportUser | null; submittedAt: string | null; reviewedAt: string | null; signedAt: string | null; publishedAt: string | null; archivedAt: string | null; reviewComment: string | null; versions: ReportVersion[]; evidence: ReportEvidence[] }
export interface ReportEvent { id: string; reportId: string | null; templateId: string | null; action: string; fromStatus: string | null; toStatus: string | null; comment: string | null; actor: ReportUser; createdAt: string }
export interface ReportRegister { templates: ReportTemplate[]; reports: FormalReport[]; events: ReportEvent[] }
export interface ReportOptions { templates: ReportTemplate[]; projects: ReportProject[]; departments: string[] }
export interface ReportSummary { totalReports: number; activeTemplates: number; awaitingReview: number; awaitingSignature: number; published: number; overdueDrafts: number }
