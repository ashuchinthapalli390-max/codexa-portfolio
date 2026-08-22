"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface AuthenticatedUser {
  id: string;
  username: string | null;
  email: string | null;
  displayName: string;
  role: "OWNER" | "ADMIN" | "TEAM_MEMBER" | string;
  isActive: boolean;
  mediaUrl?: string | null;
  leadershipPosition?: string | null;
  primaryRole?: string | null;
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextType {
  user: AuthenticatedUser | null;
  status: AuthStatus;
  loading: boolean;
  authenticated: boolean;
  refreshSession: () => Promise<AuthenticatedUser | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refreshSession = useCallback(async (): Promise<AuthenticatedUser | null> => {
    try {
      const res = await fetch("/api/session", {
        cache: "no-store",
        credentials: "include",
        headers: {
          "Cache-Control": "no-store, no-cache",
          Pragma: "no-cache",
        },
      });

      if (!res.ok) {
        setUser(null);
        setStatus("unauthenticated");
        return null;
      }

      const data = await res.json();
      if (data.authenticated && data.user && data.user.isActive) {
        setUser(data.user);
        setStatus("authenticated");
        return data.user;
      } else {
        setUser(null);
        setStatus("unauthenticated");
        return null;
      }
    } catch (err) {
      console.error("[AuthContext] Session fetch error:", err);
      setUser(null);
      setStatus("unauthenticated");
      return null;
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    setUser(null);
    setStatus("unauthenticated");
    router.replace("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        loading: status === "loading",
        authenticated: status === "authenticated",
        refreshSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
