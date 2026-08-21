"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, getToken, setToken } from "./api";
import type { Company, User } from "./types";

interface RegisterCompanyPayload {
  company_name: string;
  company_slug: string;
  company_email: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
}

interface MeResponse {
  user: User;
  roles: string[];
  permissions: string[];
}

interface UpdateProfilePayload {
  name?: string;
  email?: string;
  current_password?: string;
  new_password?: string;
  new_password_confirmation?: string;
}

interface LoginResponse {
  user: User;
  roles: string[];
  permissions: string[];
  token: string;
}

interface RegisterCompanyResponse {
  message: string;
  company: Company;
}

interface AuthContextValue {
  user: User | null;
  company: Company | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  registerCompany: (payload: RegisterCompanyPayload) => Promise<RegisterCompanyResponse>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<User>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      const token = getToken();
      if (!token) {
        // No localStorage token, but a stale cookie may still be sitting in
        // the browser from an earlier session — middleware.ts only checks
        // cookie *presence*, so an orphaned cookie causes an infinite
        // /login <-> /dashboard redirect loop unless we clear it here too.
        setToken(null);
        setLoading(false);
        return;
      }
      try {
        const res = await apiFetch<MeResponse>("/auth/me");
        if (cancelled) return;
        setToken(token); // re-sync the cookie in case it expired independently of localStorage
        const mergedUser = { ...res.user, roles: res.roles, permissions: res.permissions };
        setUser(mergedUser);
        setCompany(mergedUser.company ?? null);
      } catch {
        if (cancelled) return;
        setToken(null);
        setUser(null);
        setCompany(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      auth: false,
    });
    setToken(res.token);
    const mergedUser = { ...res.user, roles: res.roles, permissions: res.permissions };
    setUser(mergedUser);
    setCompany(mergedUser.company ?? null);
    return mergedUser;
  }, []);

  // New companies start pending admin approval - no token is issued, so
  // there's nothing to log in with yet. The caller shows a "wait for
  // approval" screen with the returned message.
  const registerCompany = useCallback(
    async (payload: RegisterCompanyPayload) => {
      return apiFetch<RegisterCompanyResponse>("/auth/register-company", {
        method: "POST",
        body: JSON.stringify(payload),
        auth: false,
      });
    },
    []
  );

  const updateProfile = useCallback(
    async (payload: UpdateProfilePayload) => {
      const res = await apiFetch<{ user: User }>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const mergedUser = { ...res.user, roles: user?.roles, permissions: user?.permissions, employee: user?.employee };
      setUser(mergedUser);
      setCompany(mergedUser.company ?? null);
      return mergedUser;
    },
    [user]
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // Ignore logout errors — clear local state regardless.
    }
    setToken(null);
    setUser(null);
    setCompany(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, company, loading, login, logout, registerCompany, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
