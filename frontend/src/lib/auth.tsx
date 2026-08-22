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

type LoginResult = { requiresTwoFactor: true; challenge: string } | { requiresTwoFactor: false; user: User };

interface RegisterCompanyResponse {
  message: string;
  company: Company;
}

interface ImpersonationStash {
  token: string;
  companyName: string;
}

const IMPERSONATION_STASH_KEY = "worksphere_impersonation_stash";

interface AuthContextValue {
  user: User | null;
  company: Company | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  completeTwoFactorLogin: (challenge: string, code: string) => Promise<User>;
  logout: () => Promise<void>;
  registerCompany: (payload: RegisterCompanyPayload) => Promise<RegisterCompanyResponse>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<User>;
  impersonating: string | null;
  impersonateCompany: (companyId: number, companyName: string) => Promise<void>;
  exitImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(IMPERSONATION_STASH_KEY);
      if (raw) setImpersonating((JSON.parse(raw) as ImpersonationStash).companyName);
    } catch {
      // ignore malformed/unavailable storage
    }
  }, []);

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

  const applySession = useCallback((res: LoginResponse) => {
    setToken(res.token);
    const mergedUser = { ...res.user, roles: res.roles, permissions: res.permissions };
    setUser(mergedUser);
    setCompany(mergedUser.company ?? null);
    return mergedUser;
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const res = await apiFetch<LoginResponse | { requires_2fa: true; challenge: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        auth: false,
      });
      if ("requires_2fa" in res) {
        return { requiresTwoFactor: true, challenge: res.challenge };
      }
      return { requiresTwoFactor: false, user: applySession(res) };
    },
    [applySession]
  );

  const completeTwoFactorLogin = useCallback(
    async (challenge: string, code: string) => {
      const res = await apiFetch<LoginResponse>("/auth/login/2fa", {
        method: "POST",
        body: JSON.stringify({ challenge, code }),
        auth: false,
      });
      return applySession(res);
    },
    [applySession]
  );

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
    window.localStorage.removeItem(IMPERSONATION_STASH_KEY);
    setImpersonating(null);
    setToken(null);
    setUser(null);
    setCompany(null);
  }, []);

  const impersonateCompany = useCallback(async (companyId: number, companyName: string) => {
    const currentToken = getToken();
    if (!currentToken) return;

    const res = await apiFetch<LoginResponse>(`/admin/companies/${companyId}/impersonate`, {
      method: "POST",
    });

    const stash: ImpersonationStash = { token: currentToken, companyName };
    window.localStorage.setItem(IMPERSONATION_STASH_KEY, JSON.stringify(stash));
    setImpersonating(companyName);

    setToken(res.token);
    const mergedUser = { ...res.user, roles: res.roles, permissions: res.permissions };
    setUser(mergedUser);
    setCompany(mergedUser.company ?? null);
  }, []);

  const exitImpersonation = useCallback(async () => {
    const raw = window.localStorage.getItem(IMPERSONATION_STASH_KEY);
    if (!raw) return;
    const stash = JSON.parse(raw) as ImpersonationStash;

    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // Ignore — the impersonation token may already be invalid.
    }

    window.localStorage.removeItem(IMPERSONATION_STASH_KEY);
    setImpersonating(null);
    setToken(stash.token);

    const res = await apiFetch<MeResponse>("/auth/me");
    const mergedUser = { ...res.user, roles: res.roles, permissions: res.permissions };
    setUser(mergedUser);
    setCompany(mergedUser.company ?? null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        loading,
        login,
        completeTwoFactorLogin,
        logout,
        registerCompany,
        updateProfile,
        impersonating,
        impersonateCompany,
        exitImpersonation,
      }}
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
