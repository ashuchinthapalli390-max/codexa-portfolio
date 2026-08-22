"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Shield } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      const safeRedirect = pathname ? `?redirect=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${safeRedirect}`);
    }
  }, [status, pathname, router]);

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
            Restoring Workspace Access...
          </p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return <>{children}</>;
}
