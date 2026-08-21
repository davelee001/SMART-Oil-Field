import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest, ApiError, AppUser } from '../utils/auth';

interface AuthContextValue {
    user: AppUser | null;
    loading: boolean;
    login: (identifier: string, password: string) => Promise<AppUser>;
    register: (name: string, email: string, password: string) => Promise<AppUser>;
    logout: () => Promise<void>;
    updateProfile: (input: { name: string; email: string; walletAddress: string | null }) => Promise<AppUser>;
    refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const result = await apiRequest<{ user: AppUser }>('/api/auth/me');
            setUser(result.user);
        } catch (error) {
            if (!(error instanceof ApiError) || error.status !== 401) console.error(error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void refresh(); }, [refresh]);

    const login = async (identifier: string, password: string) => {
        const result = await apiRequest<{ user: AppUser }>('/api/auth/login', {
            method: 'POST', body: JSON.stringify({ identifier, password }),
        });
        setUser(result.user);
        return result.user;
    };

    const register = async (name: string, email: string, password: string) => {
        const result = await apiRequest<{ user: AppUser }>('/api/auth/register', {
            method: 'POST', body: JSON.stringify({ name, email, password }),
        });
        setUser(result.user);
        return result.user;
    };

    const logout = async () => {
        try {
            await apiRequest<void>('/api/auth/logout', { method: 'POST' });
        } finally {
            setUser(null);
        }
    };

    const updateProfile = async (input: { name: string; email: string; walletAddress: string | null }) => {
        const result = await apiRequest<{ user: AppUser }>('/api/auth/me', {
            method: 'PATCH', body: JSON.stringify(input),
        });
        setUser(result.user);
        return result.user;
    };

    const value = useMemo(() => ({ user, loading, login, register, logout, updateProfile, refresh }), [user, loading, refresh]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used inside AuthProvider');
    return context;
};
