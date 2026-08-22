"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Shield,
  MessageSquare,
  FolderGit2,
  AtSign,
  Share2,
  Megaphone,
  Check,
  Loader2
} from "lucide-react";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";

interface NotificationPrefs {
  directMessages: boolean;
  projectUpdates: boolean;
  mentions: boolean;
  feedActivity: boolean;
  announcements: boolean;
}

export default function NotificationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    directMessages: true,
    projectUpdates: true,
    mentions: true,
    feedActivity: true,
    announcements: true,
  });

  useEffect(() => {
    fetch("/api/settings/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.preferences) {
          setPrefs({
            directMessages: !!data.preferences.directMessages,
            projectUpdates: !!data.preferences.projectUpdates,
            mentions: !!data.preferences.mentions,
            feedActivity: !!data.preferences.feedActivity,
            announcements: !!data.preferences.announcements,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (key: keyof NotificationPrefs) => {
    const newValue = !prefs[key];
    const newPrefs = { ...prefs, [key]: newValue };
    setPrefs(newPrefs);
    setSavingKey(key);

    try {
      await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newValue }),
      });
    } catch {}

    setTimeout(() => setSavingKey(null), 1000);
  };

  const preferenceItems = [
    {
      key: "directMessages" as keyof NotificationPrefs,
      label: "Direct Messages",
      desc: "Receive email alerts when a team member sends you an unread direct message.",
      icon: MessageSquare,
      enabled: prefs.directMessages,
    },
    {
      key: "projectUpdates" as keyof NotificationPrefs,
      label: "Project Assignments & Status",
      desc: "Receive email notifications when you are added to a project or milestones update.",
      icon: FolderGit2,
      enabled: prefs.projectUpdates,
    },
    {
      key: "mentions" as keyof NotificationPrefs,
      label: "Mentions & Replies",
      desc: "Receive email alerts when someone @mentions you in feed comments or discussions.",
      icon: AtSign,
      enabled: prefs.mentions,
    },
    {
      key: "feedActivity" as keyof NotificationPrefs,
      label: "Team Feed Highlights",
      desc: "Receive periodic roundups of new technical posts and code showcases from the team.",
      icon: Share2,
      enabled: prefs.feedActivity,
    },
    {
      key: "announcements" as keyof NotificationPrefs,
      label: "Agency Announcements",
      desc: "Receive official leadership broadcasts and platform maintenance schedules.",
      icon: Megaphone,
      enabled: prefs.announcements,
    },
  ];

  return (
    <TeamCoreShell
      title="Notification Preferences"
      subtitle="Configure your email channels and transactional notification routing."
    >
      <div className="max-w-3xl space-y-6">
        
        {/* Security Emails Locked Card */}
        <div className="p-6 rounded-2xl bg-[#090909] border border-crimson/30 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-deep-red/30 border border-crimson/30 text-bright-red flex-shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-orbitron font-bold text-sm text-white uppercase">Security Transmissions</h4>
                <span className="text-[9px] font-orbitron font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 uppercase">
                  Always Active
                </span>
              </div>
              <p className="text-xs text-[#888] mt-1 leading-relaxed">
                Critical account alerts such as password changes, 2FA status, backup code usage, and recovery codes are permanently enabled for account protection.
              </p>
            </div>
          </div>

          <div className="w-12 h-6 rounded-full bg-emerald-600/30 border border-emerald-500 flex items-center justify-end px-1 cursor-not-allowed opacity-80">
            <div className="w-4 h-4 rounded-full bg-emerald-400" />
          </div>
        </div>

        {/* Dynamic Preference Items */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#090909] border border-crimson/20 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <h3 className="font-orbitron font-bold text-sm text-white uppercase tracking-wider">
              Communication Preferences
            </h3>
            {savingKey && (
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 animate-pulse">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
          </div>

          <div className="space-y-5">
            {preferenceItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#0F0F0F] border border-white/5 hover:border-crimson/20 transition-all"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2 rounded-lg bg-[#181818] text-[#AAA] mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-orbitron font-bold text-xs text-white uppercase">{item.label}</h4>
                      <p className="text-xs text-[#777] mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>

                  {/* Cyber Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggle(item.key)}
                    className={`w-12 h-6 rounded-full border transition-all duration-300 flex items-center px-1 flex-shrink-0 ${
                      item.enabled
                        ? "bg-crimson border-bright-red justify-end shadow-[0_0_12px_rgba(217,4,41,0.4)]"
                        : "bg-[#1C1C1C] border-[#333] justify-start"
                    }`}
                  >
                    <motion.div
                      layout
                      className={`w-4 h-4 rounded-full ${item.enabled ? "bg-white" : "bg-[#666]"}`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </TeamCoreShell>
  );
}
