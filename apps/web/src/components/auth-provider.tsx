'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react';
import { apiRequest } from '@/lib/api-client';
import {
  AUTH_TOKEN_KEY,
  AuthenticatedUser,
  LoginPayload,
  LoginResponse,
} from '@/lib/auth';

type AuthContextValue = {
  user: AuthenticatedUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const authTokenChangeEvent = 'opspilot-auth-token-change';

function getTokenSnapshot() {
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

function getServerTokenSnapshot() {
  return null;
}

function subscribeToTokenChanges(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(authTokenChangeEvent, onStoreChange);

  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(authTokenChangeEvent, onStoreChange);
  };
}

function setStoredToken(token: string) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  window.dispatchEvent(new Event(authTokenChangeEvent));
}

function clearStoredToken() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.dispatchEvent(new Event(authTokenChangeEvent));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const token = useSyncExternalStore(
    subscribeToTokenChanges,
    getTokenSnapshot,
    getServerTokenSnapshot,
  );

  const { data: user = null, isLoading } = useQuery({
    queryKey: ['auth', 'me', token],
    queryFn: () =>
      apiRequest<AuthenticatedUser>('/auth/me', {
        token: token ?? undefined,
      }),
    enabled: Boolean(token),
    retry: false,
  });

  const logout = useCallback(() => {
    clearStoredToken();
    queryClient.removeQueries({ queryKey: ['auth'] });
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    if (!token) {
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ['auth', 'me', token] });
  }, [queryClient, token]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const response = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        auth: false,
        body: JSON.stringify(payload),
      });

      queryClient.setQueryData(
        ['auth', 'me', response.accessToken],
        response.user,
      );
      setStoredToken(response.accessToken);
    },
    [queryClient],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(user && token),
      login,
      logout,
      refreshUser,
    }),
    [isLoading, login, logout, refreshUser, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
