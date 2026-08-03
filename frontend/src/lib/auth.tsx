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
  company: { name: string; slug: string; email: string };
  admin: { name: string; email: string; password: string };
}

interface MeResponse {
  user: User;
}

interface LoginResponse {
  user: User;
  token: string;
}

interface RegisterCompanyResponse {
  user: User;
  company: Company;
  token: string;
}

interface AuthContextValue {
  user: User | null;
  company: Company | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  registerCompany: (payload: RegisterCompanyPayload) => Promise<void>;
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
        setLoading(false);
        return;
      }
      try {
        const res = await apiFetch<MeResponse>("/auth/me");
        if (cancelled) return;
        setUser(res.user);
        setCompany(res.user.company ?? null);
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
    setUser(res.user);
    setCompany(res.user.company ?? null);
  }, []);

  const registerCompany = useCallback(
    async (payload: RegisterCompanyPayload) => {
      const res = await apiFetch<RegisterCompanyResponse>(
        "/auth/register-company",
        {
          method: "POST",
          body: JSON.stringify(payload),
          auth: false,
        }
      );
      setToken(res.token);
      setUser(res.user);
      setCompany(res.company);
    },
    []
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
      value={{ user, company, loading, login, logout, registerCompany }}
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
