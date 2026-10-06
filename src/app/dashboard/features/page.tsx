"use client";

import React, { useState, useEffect } from "react";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { useAuth } from "@/context/AuthContext";
import {
  Sliders,
  Shield,
  Smartphone,
  Monitor,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Layers,
  Lock
} from "lucide-react";
import { hasPermission, Permission, getEffectiveRole } from "@/lib/permissions";

export default function FeaturesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [flags, setFlags] = useState<any[]>([]);
  const [updatingFlag, setUpdatingFlag] = useState<string | null>(null);

  const canManage = user && hasPermission(user, Permission.MANAGE_PLATFORM_SETTINGS);

  const loadFlags = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/features");
      const data = await res.json();
      if (data.success) {
        setFlags(data.flags || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlags();
  }, []);

  const handleToggle = async (flagKey: string, currentVal: boolean) => {
    setUpdatingFlag(flagKey);
    try {
      const res = await fetch("/api/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagKey, isEnabled: !currentVal }),
      });
      const data = await res.json();
      if (data.success) {
        setFlags((prev) =>
          prev.map((f) => (f.flagKey === flagKey ? { ...f, isEnabled: !currentVal } : f))
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingFlag(null);
    }
  };

  return (
    <TeamCoreShell
      title="Platform Controls & Feature Flags"
      subtitle="Dynamic runtime configuration for Mobile and Desktop ecosystem modules"
      actions={
        <button
          onClick={loadFlags}
          className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      }
    >
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
          <div className="border-b border-neutral-800 pb-4">
            <h3 className="text-base font-orbitron font-bold text-white uppercase">
              Global Ecosystem Feature Flags
            </h3>
            <p className="text-xs font-mono text-neutral-400">
              Remotely activate or deactivate features across Web, Mobile, and Desktop clients without redeploying code
            </p>
          </div>

          <div className="divide-y divide-neutral-800/80">
            {flags.map((flag) => (
              <div
                key={flag.id || flag.flagKey}
                className="py-4 flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-orbitron font-bold text-white">
                      {flag.name || flag.flagKey}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-[10px] font-mono text-neutral-400">
                      {flag.flagKey}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 font-sans">
                    {flag.description || "Controls platform module execution."}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-[10px] font-mono font-bold uppercase ${
                      flag.isEnabled ? "text-emerald-400" : "text-neutral-500"
                    }`}
                  >
                    {flag.isEnabled ? "ACTIVE" : "DISABLED"}
                  </span>
                  {canManage ? (
                    <button
                      disabled={updatingFlag === flag.flagKey}
                      onClick={() => handleToggle(flag.flagKey, flag.isEnabled)}
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                        flag.isEnabled ? "bg-crimson" : "bg-neutral-800"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          flag.isEnabled ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </button>
                  ) : (
                    <Lock className="w-4 h-4 text-neutral-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TeamCoreShell>
  );
}
