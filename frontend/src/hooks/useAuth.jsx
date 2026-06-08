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
    const [authError, setAuthError] = useState(null);

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
            
            // AbortController to prevent hanging fetch (Render Free plan takes ~50s to wake up)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 55000); // 55s timeout
            
            const me = await apiClient.me({ signal: controller.signal });
            clearTimeout(timeoutId);
            setUser(me);
            setAuthError(null);
        } catch (e) {
            console.warn('[auth] Clerk refresh failed:', e);
            setUser(null);
            setAuthError(e.name === 'AbortError' 
                ? 'APIサーバーからの応答がありません。起動に時間がかかっている可能性があります。' 
                : 'APIサーバーとの通信でエラーが発生しました。');
        } finally {
            setLoading(false);
        }
    }, [clerkLoaded, isSignedIn, getToken]);

    useEffect(() => {
        if (clerkLoaded) {
            refresh();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clerkLoaded, isSignedIn]);

    // Force release loading block after 60 seconds of inactivity to support spin-up delays
    useEffect(() => {
        if (!clerkLoaded || loading) {
            const timer = setTimeout(() => {
                setLoading(false);
                if (!clerkLoaded) {
                    setAuthError('Clerk（認証システム）の起動に失敗しました。APIキーまたはネットワーク接続を確認してください。');
                }
            }, 60000); // 60s timeout
            return () => clearTimeout(timer);
        }
    }, [clerkLoaded, loading]);

    const logout = useCallback(async () => {
        await signOut();
        apiClient.setToken(null);
        setUser(null);
        setAuthError(null);
    }, [signOut]);

    const decrementTicket = useCallback(() => {
        setUser((u) => (u ? { ...u, ticket_balance: Math.max(0, u.ticket_balance - 1) } : u));
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            loading: !clerkLoaded && loading,
            authError,
            loginWithGoogleIdToken: async () => {},
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
