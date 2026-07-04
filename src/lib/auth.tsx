import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, getToken, setToken, clearToken } from './api';
import type { CredentialResponse } from '@react-oauth/google';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  country?: string;
  city?: string;
  xp: number;
  coins: number;
  level: number;
  avatar?: string;
  createdAt?: string;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  signup: (data: {
    name: string;
    email: string;
    password: string;
    country?: string;
    city?: string;
    role?: string;
  }) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credentialResponse: CredentialResponse) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
}

const Ctx = createContext<AuthCtx>(null as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    try {
      const { user } = await api<{ user: User }>('/auth/me');
      setUserState(user);
    } catch {
      clearToken();
      setUserState(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  const signup: AuthCtx['signup'] = async (data) => {
    const res = await api<{ token: string; user: User }>('/auth/signup', { body: data });
    setToken(res.token);
    setUserState(res.user);
  };

  const login: AuthCtx['login'] = async (email, password) => {
    const res = await api<{ token: string; user: User }>('/auth/login', {
      body: { email, password },
    });
    setToken(res.token);
    setUserState(res.user);
  };

  const loginWithGoogle: AuthCtx['loginWithGoogle'] = async (credentialResponse) => {
    const res = await api<{ token: string; user: User }>('/auth/google', {
      body: { credential: credentialResponse.credential },
    });
    setToken(res.token);
    setUserState(res.user);
  };

  const logout = () => {
    api('/auth/logout', { method: 'POST' }).catch(() => {});
    clearToken();
    setUserState(null);
  };

  const refresh = async () => {
    try {
      const { user } = await api<{ user: User }>('/auth/me');
      setUserState(user);
    } catch {
      /* ignore */
    }
  };

  return (
    <Ctx.Provider
      value={{ user, loading, signup, login, loginWithGoogle, logout, refresh, setUser: setUserState }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
