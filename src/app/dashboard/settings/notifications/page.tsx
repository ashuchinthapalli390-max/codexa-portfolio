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
  Loader2,
  Smartphone,
  Send,
  RefreshCw,
  AlertTriangle,
  Radio,
  CheckCircle2,
  XCircle,
  Database,
  Lock,
} from "lucide-react";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";

interface NotificationPrefs {
  directMessages: boolean;
  projectUpdates: boolean;
  mentions: boolean;
  feedActivity: boolean;
  announcements: boolean;
}

interface PushDiagnosticsData {
  vapidConfigured: boolean;
  vapidSubject: string;
  currentUserDeviceCount: number;
  currentUserSubscriptions: Array<{
    id: string;
    createdAt: string;
    updatedAt: string;
    userAgent: string;
    endpointHost: string;
  }>;
  isAdmin: boolean;
  adminDiagnostics?: {
    totalSubscriptions: number;
    uniqueSubscribedUsersCount: number;
    recentSubscriptions: Array<{
      id: string;
      userName: string | null;
      userEmail: string | null;
      userRole: string | null;
      userAgent: string;
      updatedAt: string;
      createdAt: string;
      endpointHost: string;
    }>;
  };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
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

  // Browser Web Push state
  const [browserPermission, setBrowserPermission] = useState<
    "granted" | "denied" | "default" | "unsupported"
  >("default");
  const [isPushSupported, setIsPushSupported] = useState(true);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [pushActionLoading, setPushActionLoading] = useState(false);
  const [pushStatusMessage, setPushStatusMessage] = useState<string | null>(null);
  const [pushStatusType, setPushStatusType] = useState<"success" | "error" | "info">("info");

  // Test Notification state
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Diagnostics state
  const [diagnostics, setDiagnostics] = useState<PushDiagnosticsData | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);

  // Check browser status and active PushManager subscription
  const checkBrowserPushStatus = async () => {
    if (typeof window === "undefined") return;

    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setBrowserPermission("unsupported");
      setIsPushSupported(false);
      return;
    }

    setIsPushSupported(true);
    setBrowserPermission(Notification.permission);

    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          setPushSubscribed(true);
          setCurrentEndpoint(sub.endpoint);
        } else {
          setPushSubscribed(false);
          setCurrentEndpoint(null);
        }
      } else {
        setPushSubscribed(false);
        setCurrentEndpoint(null);
      }
    } catch (err) {
      console.warn("Could not inspect service worker subscription:", err);
    }
  };

  const loadDiagnostics = async () => {
    try {
      setLoadingDiagnostics(true);
      const res = await fetch("/api/settings/notifications/diagnostics", {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setDiagnostics(data);
      }
    } catch (err) {
      console.error("Failed to fetch push diagnostics:", err);
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  useEffect(() => {
    // 1. Load email preferences
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

    // 2. Check Browser Push Status
    checkBrowserPushStatus();

    // 3. Load Diagnostics
    loadDiagnostics();
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

  // Enable Web Push on current browser
  const handleEnablePush = async () => {
    if (!isPushSupported) return;

    try {
      setPushActionLoading(true);
      setPushStatusMessage(null);

      // User gesture permission request
      const perm = await Notification.requestPermission();
      setBrowserPermission(perm);

      if (perm !== "granted") {
        setPushStatusType("error");
        setPushStatusMessage(
          perm === "denied"
            ? "Notification permission was blocked in your browser. Please allow notifications in site settings."
            : "Permission prompt was dismissed."
        );
        return;
      }

      // Register SW
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      // Get VAPID public key
      const keyRes = await fetch("/api/push/subscribe");
      const { publicKey } = await keyRes.json();

      if (!publicKey) {
        setPushStatusType("error");
        setPushStatusMessage("VAPID public key not configured on server.");
        return;
      }

      // PushManager subscribe
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Save to server
      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });

      if (saveRes.ok) {
        setPushSubscribed(true);
        setCurrentEndpoint(sub.endpoint);
        setPushStatusType("success");
        setPushStatusMessage("Web Push notifications enabled successfully for this device!");
        loadDiagnostics();
      } else {
        const errData = await saveRes.json().catch(() => ({}));
        setPushStatusType("error");
        setPushStatusMessage(errData.error || "Failed to persist push subscription to backend.");
      }
    } catch (err: any) {
      console.error("Enable push error:", err);
      setPushStatusType("error");
      setPushStatusMessage(err.message || "Failed to enable notifications.");
    } finally {
      setPushActionLoading(false);
    }
  };

  // Disable / Unsubscribe Web Push on current browser
  const handleDisablePush = async () => {
    try {
      setPushActionLoading(true);
      setPushStatusMessage(null);

      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          const endpoint = sub.endpoint;
          await sub.unsubscribe();

          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint }),
          });
        }
      }

      setPushSubscribed(false);
      setCurrentEndpoint(null);
      setPushStatusType("info");
      setPushStatusMessage("Web Push notifications disabled for this device.");
      loadDiagnostics();
    } catch (err: any) {
      console.error("Disable push error:", err);
      setPushStatusType("error");
      setPushStatusMessage(err.message || "Failed to unsubscribe push notifications.");
    } finally {
      setPushActionLoading(false);
    }
  };

  // Send Test Notification
  const handleSendTestNotification = async () => {
    try {
      setSendingTest(true);
      setTestResult(null);

      const res = await fetch("/api/settings/notifications/test", {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || "Sent to push service successfully.",
        });
      } else {
        setTestResult({
          success: false,
          message: data.message || data.error || "Delivery failed",
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Delivery failed: ${err.message || "Network error"}`,
      });
    } finally {
      setSendingTest(false);
    }
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
      title="Notification Control Center"
      subtitle="Web Push, Browser Subscriptions & Communications"
    >
      <div className="max-w-4xl space-y-8">
        {/* ─── 1. BROWSER WEB PUSH STATUS & CONTROLS ───────────────────────────── */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#090909] border border-bright-red/30 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-crimson/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-bright-red/20 border border-bright-red/30 text-bright-red shrink-0">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-orbitron font-bold text-base text-white uppercase flex items-center gap-2">
                  <span>Browser Web Push Notifications</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-crimson/20 text-bright-red border border-crimson/30">
                    P0 Core
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Real-time push delivery for payments, attendance, assignments, and critical broadcasts.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                checkBrowserPushStatus();
                loadDiagnostics();
              }}
              disabled={loadingDiagnostics}
              className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-zinc-300 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDiagnostics ? "animate-spin" : ""}`} />
              <span>Refresh Status</span>
            </button>
          </div>

          {/* Status Metrics Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
            {/* Browser Permission */}
            <div className="p-4 rounded-2xl bg-[#121212] border border-white/5 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                Browser Permission
              </span>
              <div className="flex items-center gap-2">
                {browserPermission === "granted" ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-orbitron font-bold text-sm text-emerald-400">
                      Granted
                    </span>
                  </>
                ) : browserPermission === "denied" ? (
                  <>
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="font-orbitron font-bold text-sm text-rose-400">
                      Blocked
                    </span>
                  </>
                ) : browserPermission === "unsupported" ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="font-orbitron font-bold text-sm text-amber-400">
                      Unsupported
                    </span>
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span className="font-orbitron font-bold text-sm text-zinc-300">
                      Not Granted (Default)
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Push Subscription */}
            <div className="p-4 rounded-2xl bg-[#121212] border border-white/5 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                Push Subscription
              </span>
              <div className="flex items-center gap-2">
                {pushSubscribed ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="font-orbitron font-bold text-sm text-emerald-400">
                      Active
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-zinc-600" />
                    <span className="font-orbitron font-bold text-sm text-zinc-400">
                      Not Registered
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Current Device */}
            <div className="p-4 rounded-2xl bg-[#121212] border border-white/5 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                Current Device
              </span>
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="font-orbitron font-bold text-sm text-white">
                  {pushSubscribed ? "Registered" : "Unregistered"}
                </span>
              </div>
            </div>
          </div>

          {/* Status Message Alert */}
          {pushStatusMessage && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-mono flex items-center gap-2.5 relative z-10 ${
                pushStatusType === "success"
                  ? "bg-emerald-950/30 border border-emerald-500/30 text-emerald-300"
                  : pushStatusType === "error"
                  ? "bg-rose-950/30 border border-rose-500/30 text-rose-300"
                  : "bg-zinc-900 border border-white/10 text-zinc-300"
              }`}
            >
              {pushStatusType === "success" ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : pushStatusType === "error" ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <Bell className="w-4 h-4 text-zinc-400 shrink-0" />
              )}
              <span>{pushStatusMessage}</span>
            </div>
          )}

          {/* Action Buttons: Enable, Disable, Send Test */}
          <div className="flex flex-wrap items-center gap-3 pt-2 relative z-10">
            {!pushSubscribed ? (
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={pushActionLoading || !isPushSupported}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-crimson to-bright-red hover:brightness-110 text-white font-orbitron font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)] flex items-center gap-2 disabled:opacity-50"
              >
                {pushActionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
                <span>ENABLE NOTIFICATIONS</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDisablePush}
                disabled={pushActionLoading}
                className="px-5 py-2.5 rounded-xl bg-[#222] hover:bg-[#333] border border-white/10 text-zinc-300 font-orbitron font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {pushActionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
                <span>DISABLE NOTIFICATIONS</span>
              </button>
            )}

            {/* SEND TEST NOTIFICATION BUTTON */}
            <button
              type="button"
              onClick={handleSendTestNotification}
              disabled={sendingTest || !pushSubscribed}
              className={`px-5 py-2.5 rounded-xl font-orbitron font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 border ${
                pushSubscribed
                  ? "bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  : "bg-white/5 text-zinc-500 border-white/5 cursor-not-allowed"
              }`}
              title={
                !pushSubscribed
                  ? "Enable push notifications first to test delivery"
                  : "Send test notification to this browser"
              }
            >
              {sendingTest ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>SEND TEST NOTIFICATION</span>
            </button>
          </div>

          {/* Test Notification Feedback */}
          {testResult && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-mono flex items-center gap-2.5 relative z-10 ${
                testResult.success
                  ? "bg-emerald-950/30 border border-emerald-500/30 text-emerald-300"
                  : "bg-rose-950/30 border border-rose-500/30 text-rose-300"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* ─── 2. ADMIN PUSH DIAGNOSTICS (RESTRICTED TO FOUNDER/LEADERSHIP) ──── */}
        {diagnostics?.isAdmin && diagnostics.adminDiagnostics && (
          <div className="p-6 sm:p-8 rounded-3xl bg-[#090909] border border-amber-500/30 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-orbitron font-bold text-sm text-white uppercase flex items-center gap-2">
                    <span>Admin Push Diagnostics</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                      Executive Only
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Live system metrics, VAPID health, and active device subscription records.
                  </p>
                </div>
              </div>

              <span className="font-mono text-xs text-zinc-500">
                Subject: {diagnostics.vapidSubject}
              </span>
            </div>

            {/* Diagnostic Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-[#141414] border border-white/5">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">
                  Total Subscriptions
                </span>
                <span className="font-orbitron font-black text-xl text-white mt-1 block">
                  {diagnostics.adminDiagnostics.totalSubscriptions}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-[#141414] border border-white/5">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">
                  Subscribed Users
                </span>
                <span className="font-orbitron font-black text-xl text-amber-400 mt-1 block">
                  {diagnostics.adminDiagnostics.uniqueSubscribedUsersCount}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-[#141414] border border-white/5">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">
                  VAPID Status
                </span>
                <span className="font-orbitron font-black text-xs text-emerald-400 mt-2 block">
                  {diagnostics.vapidConfigured ? "HEALTHY & ACTIVE" : "UNCONFIGURED"}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-[#141414] border border-white/5">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">
                  Your Devices
                </span>
                <span className="font-orbitron font-black text-xl text-bright-red mt-1 block">
                  {diagnostics.currentUserDeviceCount}
                </span>
              </div>
            </div>

            {/* Recent Subscriptions Table */}
            <div className="rounded-2xl border border-white/5 overflow-hidden bg-[#111]">
              <div className="p-3 bg-[#161616] border-b border-white/5 flex items-center justify-between text-xs font-orbitron font-bold text-zinc-300 uppercase">
                <span>Recent Registered Devices</span>
                <span className="text-[10px] font-mono text-zinc-500">Last 15 records</span>
              </div>
              <div className="overflow-x-auto max-h-60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#181818] text-zinc-400 font-mono text-[10px] uppercase border-b border-white/5">
                    <tr>
                      <th className="py-2.5 px-4">User</th>
                      <th className="py-2.5 px-4">Role</th>
                      <th className="py-2.5 px-4">Browser / Device</th>
                      <th className="py-2.5 px-4">Push Host</th>
                      <th className="py-2.5 px-4 text-right">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300 font-mono">
                    {diagnostics.adminDiagnostics.recentSubscriptions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-white">{sub.userName || "User"}</div>
                          <div className="text-[10px] text-zinc-500">{sub.userEmail}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-white/5 border border-white/10 uppercase">
                            {sub.userRole || "USER"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 truncate max-w-[200px]" title={sub.userAgent}>
                          {sub.userAgent}
                        </td>
                        <td className="py-2.5 px-4 text-zinc-400">{sub.endpointHost}</td>
                        <td className="py-2.5 px-4 text-right text-zinc-500 text-[11px]">
                          {new Date(sub.updatedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── 3. SECURITY EMAILS LOCKED CARD ──────────────────────────────────── */}
        <div className="p-6 rounded-2xl bg-[#090909] border border-crimson/30 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-deep-red/30 border border-crimson/30 text-bright-red flex-shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-orbitron font-bold text-sm text-white uppercase">
                  Security Transmissions
                </h4>
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

        {/* ─── 4. DYNAMIC COMMUNICATION PREFERENCES (EMAIL) ────────────────────── */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#090909] border border-crimson/20 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div>
              <h3 className="font-orbitron font-bold text-sm text-white uppercase tracking-wider">
                Email Notification Preferences
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Configure your email channels and transactional notification routing.
              </p>
            </div>
            {savingKey && (
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 animate-pulse">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
          </div>

          <div className="space-y-4">
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
                      <h4 className="font-orbitron font-bold text-xs text-white uppercase">
                        {item.label}
                      </h4>
                      <p className="text-xs text-[#777] mt-0.5 leading-relaxed">
                        {item.desc}
                      </p>
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
                      className={`w-4 h-4 rounded-full ${
                        item.enabled ? "bg-white" : "bg-[#666]"
                      }`}
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
