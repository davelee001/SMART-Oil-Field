import { PmsRole } from './auth';

export const PROJECT_STATUSES = ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const;
export const WORK_ITEM_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'] as const;
export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const RISK_STATUSES = ['OPEN', 'MITIGATING', 'ACCEPTED', 'CLOSED'] as const;

export type ProjectStatus = typeof PROJECT_STATUSES[number];
export type WorkItemStatus = typeof WORK_ITEM_STATUSES[number];
export type RiskLevel = typeof RISK_LEVELS[number];
export type RiskStatus = typeof RISK_STATUSES[number];

export interface ProjectUser { id: string; name: string; email: string; role?: PmsRole }
export interface ProjectObjective { id: string; description: string; isCompleted: boolean }
export interface ProjectActivity {
    id: string; title: string; description: string | null; status: WorkItemStatus; progress: number;
    startDate: string | null; endDate: string | null; assignedTo: ProjectUser | null;
}
export interface ProjectMilestone {
    id: string; title: string; description: string | null; dueDate: string; status: WorkItemStatus; completedAt: string | null;
}
export interface ProjectDeliverable {
    id: string; title: string; description: string | null; dueDate: string; status: WorkItemStatus;
    assignedTo: ProjectUser | null; acceptedAt: string | null;
}
export interface ProjectRisk {
    id: string; title: string; description: string; level: RiskLevel; status: RiskStatus;
    mitigation: string | null; owner: ProjectUser | null; dueDate: string | null;
}
export interface ProjectAssignment { id: string; role: string | null; user: ProjectUser }

export interface Project {
    id: string;
    title: string;
    code: string;
    department: string;
    location: string;
    managerId: string;
    manager: ProjectUser;
    startDate: string;
    endDate: string;
    status: ProjectStatus;
    progress: number;
    objectives: ProjectObjective[];
    activities: ProjectActivity[];
    milestones: ProjectMilestone[];
    deliverables: ProjectDeliverable[];
    risks: ProjectRisk[];
    assignments: ProjectAssignment[];
    createdAt: string;
    updatedAt: string;
}
