/**
 * AuthContext - Clerk ログイン状態・ユーザー情報・チケット残高を管理する Provider.
 * Clerkキーの有無により、安全にインナープロバイダーを切り替えます。
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient } from '../api/client';
import { AUTH_STORAGE_KEY, CLERK_PUBLISHABLE_KEY } from '../config';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';

const AuthContext = createContext(null);

// Clerkが有効な場合の認証プロバイダー
function ClerkAuthProvider({ children }) {
    const { getToken, isSignedIn, isLoaded: clerkLoaded, signOut } = useClerkAuth();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        if (!clerkLoaded) return;
        if (!isSignedIn) {
            apiClient.setToken(null);
            setUser(null);
            setLoading(false);
            return;
        }
        try {
            const token = await getToken();
            apiClient.setToken(token);
            const me = await apiClient.me();
            setUser(me);
        } catch (e) {
            console.warn('[auth] Clerk refresh failed:', e);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, [clerkLoaded, isSignedIn, getToken]);

    useEffect(() => {
        if (clerkLoaded) {
            refresh();
        }
    }, [clerkLoaded, isSignedIn, refresh]);

    const logout = useCallback(async () => {
        await signOut();
        apiClient.setToken(null);
        setUser(null);
    }, [signOut]);

    const decrementTicket = useCallback(() => {
        setUser((u) => (u ? { ...u, ticket_balance: Math.max(0, u.ticket_balance - 1) } : u));
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            loading: !clerkLoaded || loading,
            loginWithGoogleIdToken: async () => {}, // Clerk時は不要
            logout,
            refresh,
            decrementTicket,
            isClerkEnabled: true
        }}>
            {children}
        </AuthContext.Provider>
    );
}

// Clerkが無効（開発モード）な場合の認証プロバイダー
function DevAuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        const token = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }
        try {
            apiClient.setToken(token);
            const me = await apiClient.me();
            setUser(me);
        } catch (e) {
            console.warn('[auth] dev refresh failed:', e.status);
            if (e.status === 401) {
                apiClient.setToken(null);
            }
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const loginWithGoogleIdToken = useCallback(async (idToken) => {
        const { token, user: u } = await apiClient.loginWithGoogle(idToken);
        apiClient.setToken(token);
        setUser(u);
        await refresh();
    }, [refresh]);

    const logout = useCallback(() => {
        apiClient.setToken(null);
        setUser(null);
    }, []);

    const decrementTicket = useCallback(() => {
        setUser((u) => (u ? { ...u, ticket_balance: Math.max(0, u.ticket_balance - 1) } : u));
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            loginWithGoogleIdToken,
            logout,
            refresh,
            decrementTicket,
            isClerkEnabled: false
        }}>
            {children}
        </AuthContext.Provider>
    );
}

// 親ラッパー
export function AuthProvider({ children }) {
    const isClerkEnabled = !!CLERK_PUBLISHABLE_KEY;

    if (isClerkEnabled) {
        return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
    } else {
        return <DevAuthProvider>{children}</DevAuthProvider>;
    }
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
