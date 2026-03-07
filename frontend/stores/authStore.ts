import { create } from 'zustand';
import type { AuthUser, AuthResponse, TokenResponse, ApiResponse } from '@/lib/types';

const API_BASE = '/api/v1';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  register: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  fetchMe: () => Promise<void>;
  clearAuth: () => void;
  initAuth: () => Promise<void>;
}

async function authFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { headers: extraHeaders, ...rest } = options ?? {};
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });

  const body: ApiResponse<T> = await res.json().catch(() => ({
    success: false,
    data: null,
    error: { code: 'UNKNOWN', message: `Request failed: ${res.status}` },
  }));

  if (!res.ok || !body.success) {
    throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
  }

  return body.data as T;
}

function setAuth(
  set: (partial: Partial<AuthState>) => void,
  authResponse: AuthResponse,
) {
  const { token, user } = authResponse;
  localStorage.setItem('refreshToken', token.refreshToken);
  set({
    user,
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    isAuthenticated: true,
    isLoading: false,
  });
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  register: async (email, password, name) => {
    const data = await authFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    setAuth(set, data);
  },

  login: async (email, password) => {
    const data = await authFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuth(set, data);
  },

  loginWithGoogle: async (idToken) => {
    const data = await authFetch<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
    setAuth(set, data);
  },

  logout: async () => {
    const { refreshToken } = get();
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // ignore logout errors
    }
    get().clearAuth();
  },

  refreshTokens: async () => {
    const rt = get().refreshToken ?? localStorage.getItem('refreshToken');
    if (!rt) return false;

    try {
      const data = await authFetch<TokenResponse>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: rt }),
      });
      localStorage.setItem('refreshToken', data.refreshToken);
      set({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      return true;
    } catch {
      get().clearAuth();
      return false;
    }
  },

  fetchMe: async () => {
    const { accessToken } = get();
    if (!accessToken) return;

    try {
      const user = await authFetch<AuthUser>('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      set({ user, isAuthenticated: true });
    } catch {
      get().clearAuth();
    }
  },

  clearAuth: () => {
    localStorage.removeItem('refreshToken');
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  initAuth: async () => {
    const rt = localStorage.getItem('refreshToken');
    if (!rt) {
      set({ isLoading: false });
      return;
    }

    set({ refreshToken: rt, isLoading: true });
    const ok = await get().refreshTokens();
    if (ok) {
      await get().fetchMe();
    }
    set({ isLoading: false });
  },
}));
