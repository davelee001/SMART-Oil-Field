export const PMS_ROLES = [
  'ADMINISTRATOR',
  'PROJECT_MANAGER',
  'COMPLIANCE_OFFICER',
  'ME_OFFICER',
  'FINANCE_OFFICER',
  'SUPPLY_CHAIN_OFFICER',
  'DEPARTMENT_HEAD',
  'VIEWER',
] as const;

export type PmsRole = (typeof PMS_ROLES)[number];

export const OPERATOR_SCOPES = ['SPOC', 'DPOC', 'GPOC'] as const;
export type OperatorScope = (typeof OPERATOR_SCOPES)[number];

export const OPERATOR_LABELS: Record<OperatorScope, string> = {
  SPOC: 'Sudd Petroleum Operating Company',
  DPOC: 'Dar Petroleum Operating Company',
  GPOC: 'Greater Pioneer Petroleum Operating Company',
};

export const ROLE_LABELS: Record<PmsRole, string> = {
  ADMINISTRATOR: 'Administrator',
  PROJECT_MANAGER: 'Project Manager',
  COMPLIANCE_OFFICER: 'Compliance Officer',
  ME_OFFICER: 'M&E Officer',
  FINANCE_OFFICER: 'Finance Officer',
  SUPPLY_CHAIN_OFFICER: 'Supply Chain Officer',
  DEPARTMENT_HEAD: 'Department Head',
  VIEWER: 'Viewer',
};

export interface SessionUser {
  id: string;
  name: string;
  username: string | null;
  email: string;
  department: string | null;
  role: PmsRole;
  operatorScope: OperatorScope | null;
  walletAddress: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}
