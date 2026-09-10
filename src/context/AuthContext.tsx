"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
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

export type AuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "temporarily-unavailable";

export interface AuthContextType {
  user: AuthenticatedUser | null;
  status: AuthStatus;
  loading: boolean;
  authenticated: boolean;
  isReconnecting: boolean;
  errorMessage: string | null;
  requestId: string | null;
  refreshSession: () => Promise<AuthenticatedUser | null>;
  retryConnection: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const RETRY_DELAYS = [500, 1500, 3000];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const fetchSession = useCallback(async (retryCount = 0): Promise<AuthenticatedUser | null> => {
    try {
      const res = await fetch("/api/session", {
        cache: "no-store",
        credentials: "include",
        headers: {
          "Cache-Control": "no-store, no-cache",
          Pragma: "no-cache",
        },
      });

      // 1. Positive Authenticated (200)
      if (res.status === 200) {
        const data = await res.json();
        if (data.authenticated && data.user && data.user.isActive) {
          if (!isMountedRef.current) return data.user;
          setUser(data.user);
          setStatus("authenticated");
          setErrorMessage(null);
          setRequestId(null);
          return data.user;
        }
      }

      // 2. Confirmed Unauthenticated (401 - Not signed in)
      if (res.status === 401) {
        if (!isMountedRef.current) return null;
        setUser(null);
        setStatus("unauthenticated");
        setErrorMessage(null);
        setRequestId(null);
        return null;
      }

      // 3. Forbidden / Not Authorized (403)
      if (res.status === 403) {
        if (!isMountedRef.current) return null;
        setUser(null);
        setStatus("unauthenticated");
        setErrorMessage("Account is not authorized for the requested resource.");
        setRequestId(null);
        return null;
      }

      // 4. Server / Database Error (503 = Database unavailable, 500 = Internal server error)
      const data = await res.json().catch(() => ({}));
      const reqId = data?.requestId || null;

      if (!isMountedRef.current) return null;
      setStatus("temporarily-unavailable");

      if (res.status === 503) {
        setErrorMessage(data?.message || "CodeXa database is temporarily unavailable. Retrying...");
      } else if (res.status === 500) {
        setErrorMessage(data?.message || "Authentication server error encountered.");
      } else {
        setErrorMessage(data?.message || "We temporarily couldn't verify your secure session. Retrying...");
      }

      setRequestId(reqId);

      // Trigger limited exponential backoff retry (up to 3 times)
      if (retryCount < RETRY_DELAYS.length) {
        const delay = RETRY_DELAYS[retryCount];
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            fetchSession(retryCount + 1);
          }
        }, delay);
      }

      return null;
    } catch (err: any) {
      console.warn("[AuthContext] Session verification network error:", err?.message);
      if (!isMountedRef.current) return null;

      setStatus("temporarily-unavailable");
      setErrorMessage("Network issue connecting to CodeXa Security Gateway. Please check your connection.");

      if (retryCount < RETRY_DELAYS.length) {
        const delay = RETRY_DELAYS[retryCount];
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            fetchSession(retryCount + 1);
          }
        }, delay);
      }

      return null;
    }
  }, []);

  const refreshSession = useCallback(async (): Promise<AuthenticatedUser | null> => {
    return fetchSession(0);
  }, [fetchSession]);

  const retryConnection = useCallback(async (): Promise<void> => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    await fetchSession(0);
  }, [fetchSession]);

  useEffect(() => {
    fetchSession(0);
  }, [fetchSession]);

  const logout = useCallback(async () => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    setUser(null);
    setStatus("unauthenticated");
    setErrorMessage(null);
    setRequestId(null);
    router.replace("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        loading: status === "loading",
        authenticated: status === "authenticated",
        isReconnecting: status === "temporarily-unavailable",
        errorMessage,
        requestId,
        refreshSession,
        retryConnection,
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
