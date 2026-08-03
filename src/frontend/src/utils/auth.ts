// Mock client-side auth store — replace with real backend auth/session handling.
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
