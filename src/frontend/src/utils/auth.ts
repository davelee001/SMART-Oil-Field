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
    id: string;
    name: string;
    email: string;
    role: PmsRole;
    walletAddress: string | null;
    isActive: boolean;
    createdAt: string;
    lastLoginAt: string | null;
}

export class ApiError extends Error {
    constructor(message: string, public status: number) {
        super(message);
    }
}

export const apiRequest = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
    const response = await fetch(path, {
        ...options,
        credentials: 'include',
        headers: {
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...options.headers,
        },
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new ApiError(body.message || 'Request failed', response.status);
    }

export const clearStoredUser = (): void => {
    localStorage.removeItem(STORAGE_KEY);
};
