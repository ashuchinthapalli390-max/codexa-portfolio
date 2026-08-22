"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Shield, RefreshCw, AlertTriangle } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, user, errorMessage, requestId, retryConnection } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      const safeRedirect = pathname ? `?redirect=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${safeRedirect}`);
    }
  }, [status, pathname, router]);

  // Initial loading skeleton
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#070707] flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-[#0D0D0D] border border-crimson/40 flex items-center justify-center shadow-[0_0_25px_rgba(217,4,41,0.2)]">
            <Shield className="w-8 h-8 text-bright-red animate-pulse" />
          </div>
          <div className="absolute -inset-1 rounded-2xl border border-bright-red/30 animate-ping opacity-25 pointer-events-none" />
        </div>
        <div className="text-center space-y-1">
          <p className="font-orbitron text-xs font-bold uppercase tracking-[0.25em] text-white">
            CODEXA SECURE SESSION
          </p>
          <p className="font-mono text-[10px] text-[#666666] uppercase tracking-wider">
            Verifying Device Session...
          </p>
        </div>
      </div>
    );
  }

  // Cold load with temporary service unavailability (don't show login form)
  if (status === "temporarily-unavailable" && !user) {
    return (
      <div className="min-h-screen bg-[#070707] text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-3xl bg-[#090909]/95 border border-crimson/30 text-center space-y-6 shadow-[0_0_50px_rgba(217,4,41,0.15)]">
          <div className="w-14 h-14 rounded-2xl bg-deep-red/20 border border-crimson/40 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7 text-bright-red" />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-orbitron font-bold uppercase tracking-[0.25em] text-bright-red px-3 py-1 rounded-full bg-crimson/15 border border-crimson/30">
              CODEXA SECURITY
            </span>
            <h2 className="font-orbitron font-black text-lg text-white uppercase tracking-wider">
              RESTORING SECURE SESSION...
            </h2>
            <p className="text-xs text-[#888888] leading-relaxed">
              {errorMessage || "Connection to the authentication service is temporarily unavailable. Retrying..."}
            </p>
            {requestId && (
              <p className="text-[10px] font-mono text-[#555555]">
                Diagnostic Ref: {requestId}
              </p>
            )}
          </div>
          <button
            onClick={() => retryConnection()}
            className="w-full py-3 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> RETRY CONNECTION
          </button>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <>
      {status === "temporarily-unavailable" && user && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-deep-red/90 border-b border-bright-red text-white px-4 py-2 flex items-center justify-between text-xs font-mono backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-bright-red animate-ping" />
            <span>CONNECTION INTERRUPTED &bull; RECONNECTING SECURE SESSION...</span>
          </div>
          <button
            onClick={() => retryConnection()}
            className="px-3 py-1 rounded bg-black/40 hover:bg-black/60 text-white font-orbitron text-[10px] font-bold uppercase tracking-wider"
          >
            Retry Now
          </button>
        </div>
      )}
      {children}
    </>
  );
}
