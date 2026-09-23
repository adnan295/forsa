import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import type { SocialCredential } from "@/lib/social-auth";
import { fetch } from "expo/fetch";

interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin";
  fullName?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  emailVerified?: boolean;
  createdAt?: string;
}

interface VerificationResult {
  requiresVerification: true;
  email: string;
  verificationCode?: string;
  emailFallback?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  socialLogin: (credential: SocialCredential) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<VerificationResult>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerification: (email: string) => Promise<any>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/auth/me", baseUrl);
      const res = await fetch(url.toString(), { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (e) {
    } finally {
      setIsLoading(false);
    }
  }

  async function login(username: string, password: string) {
    const res = await apiRequest("POST", "/api/auth/login", { username, password });
    const data = await res.json();
    setUser(data);
  }

  async function socialLogin(credential: SocialCredential) {
    const res = await apiRequest("POST", "/api/auth/social", credential);
    const data = await res.json();
    setUser(data);
  }

  async function register(username: string, email: string, password: string): Promise<VerificationResult> {
    const res = await apiRequest("POST", "/api/auth/register", {
      username,
      email,
      password,
    });
    const data = await res.json();
    return data as VerificationResult;
  }

  async function verifyEmail(email: string, code: string) {
    const res = await apiRequest("POST", "/api/auth/verify-email", { email, code });
    const data = await res.json();
    setUser(data);
  }

  async function resendVerification(email: string) {
    const res = await apiRequest("POST", "/api/auth/resend-verification", { email });
    const data = await res.json();
    return data;
  }

  async function logout() {
    await apiRequest("POST", "/api/auth/logout");
    setUser(null);
  }

  /** حذف نهائي للحساب من الخادم (مع إبطال ربط Apple) ثم تفريغ الجلسة */
  async function deleteAccount() {
    await apiRequest("DELETE", "/api/auth/delete-account");
    setUser(null);
  }

  async function refreshUser() {
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/auth/me", baseUrl);
      const res = await fetch(url.toString(), { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (e) {}
  }

  const value = useMemo(
    () => ({ user, isLoading, login, socialLogin, register, verifyEmail, resendVerification, logout, deleteAccount, refreshUser }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
