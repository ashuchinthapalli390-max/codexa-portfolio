"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  ArrowUpRight,
  Shield,
  Heart,
  MessageCircle,
  FolderGit2
} from "lucide-react";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { NotificationItem } from "@/lib/data-store";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = () => {
    setLoading(true);
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (data.notifications) setNotifications(data.notifications);
        if (data.unreadCount !== undefined) setUnreadCount(data.unreadCount);
      })
      .finally(() => setLoading(false));
  };

  const handleMarkAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <TeamCoreShell
      title="Notifications"
      subtitle="Activity Signals & Security Alerts"
      actions={
        unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2 rounded-xl bg-[#141414] hover:bg-crimson border border-crimson/30 text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mark All as Read</span>
          </button>
        )
      }
    >
      <div className="max-w-3xl space-y-4">
        {loading ? (
          [1, 2, 3, 4].map((n) => (
            <div key={n} className="h-20 rounded-2xl bg-[#0A0A0A] animate-pulse border border-white/5" />
          ))
        ) : notifications.length === 0 ? (
          <div className="p-16 rounded-3xl bg-[#0A0A0A] border border-white/5 text-center space-y-2">
            <Bell className="w-8 h-8 text-[#555] mx-auto" />
            <h3 className="font-orbitron font-bold text-xs text-[#AAA] uppercase">No Notifications</h3>
            <p className="text-xs text-[#666]">You are completely caught up with all platform events.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 shadow-lg ${
                n.isRead
                  ? "bg-[#090909] border-white/5 text-[#888]"
                  : "bg-[#0E0A0A] border-crimson/35 text-white"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${n.isRead ? "bg-transparent" : "bg-bright-red animate-pulse"}`} />
                  <h4 className="font-orbitron font-bold text-xs text-white">{n.title}</h4>
                </div>
                <p className="text-xs text-[#AAA] pl-4">{n.message}</p>
                <span className="text-[9px] font-mono text-[#666] pl-4 block">
                  {new Date(n.createdAt).toLocaleDateString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              {n.link && (
                <Link
                  href={n.link}
                  className="px-3 py-1.5 rounded-xl bg-[#141414] hover:bg-crimson text-white text-[10px] font-orbitron font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1 self-center"
                >
                  <span>View</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          ))
        )}
      </div>
    </TeamCoreShell>
  );
}
