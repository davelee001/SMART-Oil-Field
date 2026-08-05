export const PMS_ROLES = [
    'ADMINISTRATOR',
    'PROJECT_MANAGER',
    'COMPLIANCE_OFFICER',
    'ME_OFFICER',
    'FINANCE_OFFICER',
    'DEPARTMENT_HEAD',
    'VIEWER',
] as const;

export type PmsRole = typeof PMS_ROLES[number];

export const ROLE_LABELS: Record<PmsRole, string> = {
    ADMINISTRATOR: 'Administrator',
    PROJECT_MANAGER: 'Project Manager',
    COMPLIANCE_OFFICER: 'Compliance Officer',
    ME_OFFICER: 'M&E Officer',
    FINANCE_OFFICER: 'Finance Officer',
    DEPARTMENT_HEAD: 'Department Head',
    VIEWER: 'Viewer',
};

export interface AppUser {
    name: string;
    email: string;
    walletAddress: string;
}

const STORAGE_KEY = 'sof_user';

export const getStoredUser = (): AppUser | null => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as AppUser;
    } catch {
        return null;
    }
};

export const storeUser = (user: AppUser): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
};

export const clearStoredUser = (): void => {
    localStorage.removeItem(STORAGE_KEY);
};
