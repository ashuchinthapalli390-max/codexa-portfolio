"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { useAuth } from "@/context/AuthContext";
import {
  Smartphone,
  Shield,
  Layers,
  Settings,
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Save,
  Users,
  UserCheck,
  Search,
  Lock,
  MessageSquare,
  FileText,
  CreditCard,
  Clock,
  Calendar,
  Download,
  Flame,
  Radio,
  Eye,
  Activity,
  ArrowRight,
  Info,
  ChevronRight,
  X,
  RefreshCw,
  LogOut,
  Laptop,
  Check,
  Ban,
  Share2,
} from "lucide-react";
import { canManageMobile, canViewMobile, getEffectiveRole } from "@/lib/permissions";

type TabId =
  | "overview"
  | "version"
  | "features"
  | "attendance"
  | "messages"
  | "posts"
  | "projects"
  | "notifications"
  | "payments"
  | "documents"
  | "profile"
  | "roles"
  | "users"
  | "security"
  | "announcement"
  | "advanced";

interface TabMeta {
  id: TabId;
  label: string;
  icon: any;
  category?: string;
}

const TABS: TabMeta[] = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "version", label: "App Version", icon: Smartphone },
  { id: "features", label: "Features", icon: Layers },
  { id: "attendance", label: "Attendance", icon: Clock },
  { id: "messages", label: "Messages & DMs", icon: MessageSquare },
  { id: "posts", label: "Team Feed", icon: Share2 },
  { id: "projects", label: "Projects", icon: Layers },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "payments", label: "Payments (₹450)", icon: CreditCard },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "profile", label: "Profile", icon: UserCheck },
  { id: "roles", label: "Role Controls", icon: Users },
  { id: "users", label: "User Overrides", icon: Search },
  { id: "security", label: "Security & Sessions", icon: Shield },
  { id: "announcement", label: "Announcement", icon: Radio },
  { id: "advanced", label: "Advanced & Audit", icon: Settings },
];

const ROLES_LIST = [
  "FOUNDER",
  "CO_FOUNDER",
  "CEO",
  "CTO",
  "HR",
  "COO",
  "EMPLOYEE",
  "INTERN",
];

export default function MobileAppControlCenterPage() {
  const { user } = useAuth();
  const effectiveRole = user ? getEffectiveRole(user) : "EMPLOYEE";
  const isEditor = user && canManageMobile(user);
  const isViewer = user && canViewMobile(user);

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Core config state
  const [initialConfig, setInitialConfig] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [featuresList, setFeaturesList] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [recentAuditLogs, setRecentAuditLogs] = useState<any[]>([]);

  // Role Overrides State
  const [roleOverrides, setRoleOverrides] = useState<Record<string, Record<string, string>>>({});
  const [selectedRole, setSelectedRole] = useState<string>("INTERN");
  const [roleSaving, setRoleSaving] = useState(false);

  // User Overrides State
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedUserOverrides, setSelectedUserOverrides] = useState<Record<string, string>>({});
  const [userOverrideSaving, setUserOverrideSaving] = useState(false);

  // Sessions State
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Dangerous action modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    actionType: string;
    payload?: any;
  }>({
    open: false,
    title: "",
    description: "",
    actionType: "",
  });

  // Check for unsaved changes in main config
  const hasUnsavedChanges = useMemo(() => {
    if (!initialConfig || !config) return false;
    return JSON.stringify(initialConfig) !== JSON.stringify(config);
  }, [initialConfig, config]);

  // Load Main Configuration
  const loadConfigData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/apps/mobile");
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setInitialConfig(data.config);
        setFeaturesList(data.featuresList || []);
        setStats(data.stats || {});
        setRecentAuditLogs(data.recentAuditLogs || []);
      }
    } catch (e) {
      console.error(e);
      setSaveMessage({ type: "error", text: "Unable to load mobile configuration." });
    } finally {
      setLoading(false);
    }
  };

  // Load Role Overrides
  const loadRoleOverrides = async () => {
    try {
      const res = await fetch("/api/admin/apps/mobile/roles");
      const data = await res.json();
      if (data.success && data.roleOverrides) {
        setRoleOverrides(data.roleOverrides);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load Sessions
  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch("/api/admin/apps/mobile/sessions");
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    if (isViewer) {
      loadConfigData();
      loadRoleOverrides();
      loadSessions();
    }
  }, [isViewer]);

  // Search users for user overrides tab
  const handleSearchUsers = async (query: string) => {
    setUserSearchQuery(query);
    setSearchingUsers(true);
    try {
      const res = await fetch(`/api/admin/apps/mobile/users?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) {
        setUserSearchResults(data.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleSelectUser = async (u: any) => {
    setSelectedUser(u);
    try {
      const res = await fetch(`/api/admin/apps/mobile/users?userId=${u.id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedUserOverrides(data.overrides || {});
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save Main Configuration
  const handleSaveConfig = async (overrideData?: any) => {
    if (!isEditor) {
      alert("Only Founder and Co-Founder are authorized to change Mobile App settings.");
      return;
    }

    setSaving(true);
    setSaveMessage(null);
    try {
      const payload = overrideData || config;
      const res = await fetch("/api/admin/apps/mobile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setInitialConfig(data.config);
        setSaveMessage({ type: "success", text: "Mobile configuration updated successfully." });
        setTimeout(() => setSaveMessage(null), 4000);
      } else {
        setSaveMessage({ type: "error", text: data.error || "Unable to save configuration." });
      }
    } catch (e) {
      console.error(e);
      setSaveMessage({ type: "error", text: "Network error saving configuration." });
    } finally {
      setSaving(false);
    }
  };

  // Discard changes
  const handleDiscardChanges = () => {
    setConfig(JSON.parse(JSON.stringify(initialConfig)));
  };

  // Toggle Role Override
  const handleSetRoleOverride = async (role: string, featureKey: string, state: string) => {
    if (!isEditor) return;
    setRoleSaving(true);
    try {
      const res = await fetch("/api/admin/apps/mobile/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, featureKey, state }),
      });
      const data = await res.json();
      if (data.success) {
        setRoleOverrides((prev) => ({
          ...prev,
          [role]: {
            ...(prev[role] || {}),
            [featureKey]: state,
          },
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRoleSaving(false);
    }
  };

  // Toggle User Override
  const handleSetUserOverride = async (userId: string, featureKey: string, state: string) => {
    if (!isEditor) return;
    setUserOverrideSaving(true);
    try {
      const res = await fetch("/api/admin/apps/mobile/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, featureKey, state }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedUserOverrides((prev) => ({
          ...prev,
          [featureKey]: state,
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUserOverrideSaving(false);
    }
  };

  // Session revocation
  const handleRevokeSession = async (sessionId: string) => {
    if (!isEditor) return;
    try {
      const res = await fetch("/api/admin/apps/mobile/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke_one", sessionId }),
      });
      if (res.ok) loadSessions();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!isEditor) return;
    try {
      const res = await fetch("/api/admin/apps/mobile/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke_all_global" }),
      });
      if (res.ok) {
        loadSessions();
        setConfirmModal({ open: false, title: "", description: "", actionType: "" });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Dangerous action modal handler
  const handleExecuteDangerousAction = async () => {
    const { actionType, payload } = confirmModal;
    setConfirmModal((prev) => ({ ...prev, open: false }));

    if (actionType === "TOGGLE_MAINTENANCE") {
      const updated = { ...config, maintenanceEnabled: !config.maintenanceEnabled };
      setConfig(updated);
      await handleSaveConfig(updated);
    } else if (actionType === "TOGGLE_FORCE_UPDATE") {
      const updated = { ...config, forceUpdateEnabled: !config.forceUpdateEnabled };
      setConfig(updated);
      await handleSaveConfig(updated);
    } else if (actionType === "DISABLE_PLATFORM") {
      const updated = { ...config, platformStatus: config.platformStatus === "DISABLED" ? "ACTIVE" : "DISABLED" };
      setConfig(updated);
      await handleSaveConfig(updated);
    } else if (actionType === "REVOKE_ALL_SESSIONS") {
      await handleRevokeAllSessions();
    }
  };

  if (!isViewer) {
    return (
      <TeamCoreShell
        title="CodeXa Mobile App"
        subtitle="Remote Configuration & Feature Control"
      >
        <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-orbitron font-bold text-white uppercase">
            Access Restricted
          </h2>
          <p className="text-sm font-mono text-neutral-400">
            The Mobile App Control Center is strictly accessible only to Founder, Co-Founder, and CTO.
          </p>
          <div className="pt-4">
            <Link
              href="/dashboard"
              className="px-6 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-mono uppercase inline-flex items-center gap-2"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </TeamCoreShell>
    );
  }

  return (
    <TeamCoreShell
      title="CodeXa Mobile App"
      subtitle="Remote Configuration & Feature Control"
    >
      <div className="max-w-7xl mx-auto space-y-6 pb-24">
        {/* TOP STATUS BAR & ACCESS NOTICE */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-crimson/15 border border-crimson/30 flex items-center justify-center text-bright-red">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-orbitron font-bold text-white text-sm">
                  {config?.appName || "CodeXa"} Mobile Remote Engine
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                    config?.platformStatus === "ACTIVE" && !config?.maintenanceEnabled
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : config?.maintenanceEnabled
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse"
                      : "bg-red-500/15 text-red-400 border border-red-500/30"
                  }`}
                >
                  {config?.maintenanceEnabled ? "MAINTENANCE" : config?.platformStatus || "ACTIVE"}
                </span>
                <span className="text-[10px] font-mono text-neutral-500">
                  v{config?.currentVersion || "1.0.0"} (Build {config?.buildNumber || 1})
                </span>
              </div>
              <p className="text-[11px] font-mono text-neutral-400">
                Config Engine: v{config?.configVersion || 1} &bull; Updated by {config?.updatedBy || "System"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {!isEditor && (
              <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Read-Only Mode (CTO Visibility)
              </span>
            )}
            <Link
              href="/dashboard/apps"
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono flex items-center gap-1.5 transition-all"
            >
              <Layers className="w-3.5 h-3.5" /> Apps Center
            </Link>
          </div>
        </div>

        {/* SAVE STATUS MESSAGE */}
        {saveMessage && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between text-xs font-mono transition-all ${
              saveMessage.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                : "bg-red-500/10 border border-red-500/30 text-red-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {saveMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              <span>{saveMessage.text}</span>
            </div>
            <button
              onClick={() => setSaveMessage(null)}
              className="text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* NAVIGATION TABS SELECTOR */}
        <div className="border-b border-neutral-800 pb-2 overflow-x-auto no-scrollbar flex items-center gap-1.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-mono flex items-center gap-2 whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-crimson text-white font-bold shadow-lg shadow-crimson/25"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="py-24 text-center space-y-3 font-mono text-xs text-neutral-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-crimson" />
            <p>Loading Mobile Control Plane...</p>
          </div>
        )}

        {/* TAB CONTENTS */}
        {!loading && config && (
          <div className="space-y-6">
            {/* 1. OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Metrics Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
                  <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">
                      App Status
                    </span>
                    <span
                      className={`text-sm font-orbitron font-bold block ${
                        config.platformStatus === "ACTIVE" ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {config.platformStatus}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">
                      Current Version
                    </span>
                    <span className="text-sm font-orbitron font-bold text-white block">
                      v{config.currentVersion}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">
                      Min Supported
                    </span>
                    <span className="text-sm font-orbitron font-bold text-neutral-300 block">
                      v{config.minVersion}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">
                      Maintenance
                    </span>
                    <span
                      className={`text-sm font-orbitron font-bold block ${
                        config.maintenanceEnabled ? "text-amber-400" : "text-neutral-500"
                      }`}
                    >
                      {config.maintenanceEnabled ? "ON" : "OFF"}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">
                      Force Update
                    </span>
                    <span
                      className={`text-sm font-orbitron font-bold block ${
                        config.forceUpdateEnabled ? "text-red-400" : "text-neutral-500"
                      }`}
                    >
                      {config.forceUpdateEnabled ? "ON" : "OFF"}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">
                      Active Devices
                    </span>
                    <span className="text-sm font-orbitron font-bold text-purple-400 block">
                      {stats.activeSessionsCount || sessions.length} Fleet PCs/Phones
                    </span>
                  </div>
                </div>

                {/* Status Banners & Overview Controls */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Platform Health & Controls */}
                  <div className="lg:col-span-2 rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 backdrop-blur-xl space-y-6">
                    <div className="border-b border-neutral-800 pb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-orbitron font-bold text-white uppercase">
                          System Status & Live Master Switches
                        </h3>
                        <p className="text-xs font-mono text-neutral-400">
                          Instant remote toggles with real-time mobile backend propagation
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-neutral-500">
                        Config Rev #{config.configVersion}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                      {/* Maintenance Mode Card */}
                      <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white flex items-center gap-2">
                            <AlertTriangle
                              className={`w-4 h-4 ${
                                config.maintenanceEnabled ? "text-amber-400" : "text-neutral-500"
                              }`}
                            />
                            Maintenance Mode
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              config.maintenanceEnabled
                                ? "bg-amber-500/15 text-amber-400"
                                : "bg-neutral-800 text-neutral-400"
                            }`}
                          >
                            {config.maintenanceEnabled ? "ACTIVE" : "DISABLED"}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">
                          When enabled, all non-leadership mobile app sessions are blocked with a maintenance message screen.
                        </p>
                        {isEditor && (
                          <button
                            onClick={() =>
                              setConfirmModal({
                                open: true,
                                title: config.maintenanceEnabled
                                  ? "Disable Maintenance Mode?"
                                  : "Enable Mobile App Maintenance Mode?",
                                description: config.maintenanceEnabled
                                  ? "Mobile app users will immediately be allowed back into the mobile workspace."
                                  : "All active intern and employee mobile screens will immediately lock to the maintenance screen.",
                                actionType: "TOGGLE_MAINTENANCE",
                              })
                            }
                            className={`w-full py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                              config.maintenanceEnabled
                                ? "bg-neutral-800 hover:bg-neutral-700 text-white"
                                : "bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 border border-amber-500/30"
                            }`}
                          >
                            {config.maintenanceEnabled ? "Deactivate Maintenance" : "Activate Maintenance"}
                          </button>
                        )}
                      </div>

                      {/* Force Update Card */}
                      <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white flex items-center gap-2">
                            <Flame
                              className={`w-4 h-4 ${
                                config.forceUpdateEnabled ? "text-red-400" : "text-neutral-500"
                              }`}
                            />
                            Force App Update
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              config.forceUpdateEnabled
                                ? "bg-red-500/15 text-red-400"
                                : "bg-neutral-800 text-neutral-400"
                            }`}
                          >
                            {config.forceUpdateEnabled ? "ENFORCED" : "OFF"}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">
                          Blocks mobile clients with version below v{config.minVersion} until updated.
                        </p>
                        {isEditor && (
                          <button
                            onClick={() =>
                              setConfirmModal({
                                open: true,
                                title: config.forceUpdateEnabled
                                  ? "Disable Force Update?"
                                  : "Enable Mandatory App Force Update?",
                                description:
                                  "Requires all mobile app users to update their build before accessing any features.",
                                actionType: "TOGGLE_FORCE_UPDATE",
                              })
                            }
                            className={`w-full py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                              config.forceUpdateEnabled
                                ? "bg-neutral-800 hover:bg-neutral-700 text-white"
                                : "bg-red-600/20 text-red-300 hover:bg-red-600/30 border border-red-500/30"
                            }`}
                          >
                            {config.forceUpdateEnabled ? "Disable Force Update" : "Enforce Update"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick overview of key core flags */}
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-orbitron font-bold text-neutral-300 uppercase tracking-wider">
                        Core Service Availability
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                        <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                          <span className="text-neutral-400">Attendance:</span>
                          <span className={config.attendanceEnabled ? "text-emerald-400 font-bold" : "text-red-400"}>
                            {config.attendanceEnabled ? "ON" : "OFF"}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                          <span className="text-neutral-400">Messages:</span>
                          <span className={config.dmEnabled ? "text-emerald-400 font-bold" : "text-red-400"}>
                            {config.dmEnabled ? "ON" : "OFF"}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                          <span className="text-neutral-400">Posts Feed:</span>
                          <span className={config.postsEnabled ? "text-emerald-400 font-bold" : "text-red-400"}>
                            {config.postsEnabled ? "ON" : "OFF"}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                          <span className="text-neutral-400">Payments:</span>
                          <span className={config.paymentsEnabled ? "text-emerald-400 font-bold" : "text-red-400"}>
                            {config.paymentsEnabled ? "ON" : "OFF"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Precedence Rule Info & Stats */}
                  <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 backdrop-blur-xl space-y-6 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="border-b border-neutral-800 pb-3">
                        <h3 className="text-sm font-orbitron font-bold text-white uppercase">
                          Feature Precedence
                        </h3>
                        <p className="text-[11px] font-mono text-neutral-400">
                          Centralized resolver resolution hierarchy
                        </p>
                      </div>

                      <div className="space-y-2.5 font-mono text-xs">
                        <div className="p-3 rounded-xl bg-crimson/10 border border-crimson/30 flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-crimson text-white text-[10px] font-bold flex items-center justify-center">
                            1
                          </span>
                          <div>
                            <span className="text-white font-bold block">USER Override</span>
                            <span className="text-[10px] text-neutral-400">Highest priority (per user ID)</span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">
                            2
                          </span>
                          <div>
                            <span className="text-white font-bold block">ROLE Override</span>
                            <span className="text-[10px] text-neutral-400">Applies to role (INTERN, EMPLOYEE...)</span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-neutral-800 text-white text-[10px] font-bold flex items-center justify-center">
                            3
                          </span>
                          <div>
                            <span className="text-white font-bold block">GLOBAL Setting</span>
                            <span className="text-[10px] text-neutral-400">Default fallback setting</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-xs font-mono space-y-2">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Active Role Overrides:</span>
                        <span className="text-purple-400 font-bold">{stats.roleOverridesCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Active User Overrides:</span>
                        <span className="text-bright-red font-bold">{stats.userOverridesCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Active Mobile Fleet:</span>
                        <span className="text-emerald-400 font-bold">{sessions.length} devices</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. APP VERSION & DOWNLOAD SETTINGS TAB */}
            {activeTab === "version" && (
              <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-8">
                <div className="border-b border-neutral-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-orbitron font-bold text-white uppercase">
                      App Version, Status & Downloads
                    </h3>
                    <p className="text-xs font-mono text-neutral-400">
                      Configure deployed APK links, target versions, and force-update thresholds
                    </p>
                  </div>
                  {isEditor && (
                    <button
                      onClick={() => handleSaveConfig()}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-crimson/25 transition-all self-start sm:self-auto"
                    >
                      <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Settings"}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
                  <div>
                    <label className="block text-neutral-400 mb-1.5">App Name</label>
                    <input
                      type="text"
                      disabled={!isEditor}
                      value={config.appName || "CodeXa"}
                      onChange={(e) => setConfig({ ...config, appName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1.5">Platform Status</label>
                    <select
                      disabled={!isEditor}
                      value={config.platformStatus || "ACTIVE"}
                      onChange={(e) => setConfig({ ...config, platformStatus: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                    >
                      <option value="ACTIVE">ACTIVE (Operational)</option>
                      <option value="MAINTENANCE">MAINTENANCE (Locked)</option>
                      <option value="DISABLED">DISABLED (Offline)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1.5">Build Number</label>
                    <input
                      type="number"
                      disabled={!isEditor}
                      value={config.buildNumber || 1}
                      onChange={(e) => setConfig({ ...config, buildNumber: parseInt(e.target.value, 10) || 1 })}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1.5">Current App Version</label>
                    <input
                      type="text"
                      disabled={!isEditor}
                      value={config.currentVersion || "1.0.0"}
                      onChange={(e) => setConfig({ ...config, currentVersion: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1.5">Minimum Supported Version</label>
                    <input
                      type="text"
                      disabled={!isEditor}
                      value={config.minVersion || "1.0.0"}
                      onChange={(e) => setConfig({ ...config, minVersion: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                    />
                  </div>

                  <div className="flex items-center gap-6 pt-5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!isEditor}
                        checked={Boolean(config.forceUpdateEnabled)}
                        onChange={(e) => setConfig({ ...config, forceUpdateEnabled: e.target.checked })}
                        className="w-4 h-4 accent-crimson cursor-pointer"
                      />
                      <span className="text-white font-bold">Force Update</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!isEditor}
                        checked={Boolean(config.softUpdateEnabled)}
                        onChange={(e) => setConfig({ ...config, softUpdateEnabled: e.target.checked })}
                        className="w-4 h-4 accent-crimson cursor-pointer"
                      />
                      <span className="text-white font-bold">Soft Update Prompt</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-neutral-800">
                  <h4 className="text-xs font-orbitron font-bold text-white uppercase">
                    Maintenance Mode Configuration
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        disabled={!isEditor}
                        checked={Boolean(config.maintenanceEnabled)}
                        onChange={(e) => setConfig({ ...config, maintenanceEnabled: e.target.checked })}
                        className="w-5 h-5 accent-crimson cursor-pointer"
                      />
                      <span className="text-white font-bold">Enable Maintenance Screen</span>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-neutral-400 mb-1">
                        Client Maintenance Notice Message
                      </label>
                      <input
                        type="text"
                        disabled={!isEditor}
                        value={config.maintenanceMessage || ""}
                        onChange={(e) => setConfig({ ...config, maintenanceMessage: e.target.value })}
                        placeholder="CodeXa is undergoing scheduled maintenance. Please try again shortly."
                        className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                      />
                    </div>
                  </div>
                </div>

                {/* Download URLs */}
                <div className="space-y-4 pt-4 border-t border-neutral-800 font-mono text-xs">
                  <h4 className="text-xs font-orbitron font-bold text-white uppercase">
                    App Distribution & Download URLs
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    If an official URL is empty, the mobile website card will cleanly display &quot;Coming Soon&quot;.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-neutral-400 mb-1">Android APK Direct Download URL</label>
                      <input
                        type="text"
                        disabled={!isEditor}
                        value={config.androidApkUrl || config.downloadUrl || ""}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            androidApkUrl: e.target.value,
                            downloadUrl: e.target.value,
                          })
                        }
                        placeholder="https://assets.codxa-agency.online/downloads/codexa-v1.0.apk (or empty for Coming Soon)"
                        className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                      />
                    </div>

                    <div>
                      <label className="block text-neutral-400 mb-1">Google Play Store URL</label>
                      <input
                        type="text"
                        disabled={!isEditor}
                        value={config.playStoreUrl || ""}
                        onChange={(e) => setConfig({ ...config, playStoreUrl: e.target.value })}
                        placeholder="https://play.google.com/store/apps/details?id=online.codxa.agency"
                        className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                      />
                    </div>

                    <div>
                      <label className="block text-neutral-400 mb-1">Apple iOS App Store URL</label>
                      <input
                        type="text"
                        disabled={!isEditor}
                        value={config.iosStoreUrl || ""}
                        onChange={(e) => setConfig({ ...config, iosStoreUrl: e.target.value })}
                        placeholder="https://apps.apple.com/app/codexa-agency"
                        className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                      />
                    </div>

                    <div>
                      <label className="block text-neutral-400 mb-1">Alternative Enterprise Fleet URL</label>
                      <input
                        type="text"
                        disabled={!isEditor}
                        value={config.altDownloadUrl || ""}
                        onChange={(e) => setConfig({ ...config, altDownloadUrl: e.target.value })}
                        placeholder="https://mdm.codxa-agency.online/fleet-dist"
                        className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. GLOBAL FEATURE CONTROL TAB */}
            {activeTab === "features" && (
              <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
                <div className="border-b border-neutral-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-orbitron font-bold text-white uppercase">
                      Centralized Mobile App Feature Flags
                    </h3>
                    <p className="text-xs font-mono text-neutral-400">
                      Toggle standard mobile functionality globally across all mobile client builds
                    </p>
                  </div>
                  {isEditor && (
                    <button
                      onClick={() => handleSaveConfig()}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-crimson/25 transition-all self-start sm:self-auto"
                    >
                      <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Feature Flags"}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
                  {featuresList.map((item) => {
                    // Map feature key to config field
                    let fieldKey = "";
                    if (item.key === "MOBILE_ATTENDANCE") fieldKey = "attendanceEnabled";
                    else if (item.key === "MOBILE_ATTENDANCE_HISTORY") fieldKey = "allowAttendanceHistory";
                    else if (item.key === "MOBILE_ATTENDANCE_CORRECTION") fieldKey = "allowAttendanceCorrection";
                    else if (item.key === "MOBILE_MESSAGES") fieldKey = "dmEnabled";
                    else if (item.key === "MOBILE_GROUP_MESSAGES") fieldKey = "groupMessagesEnabled";
                    else if (item.key === "MOBILE_PROJECT_CHAT") fieldKey = "projectChatEnabled";
                    else if (item.key === "MOBILE_POSTS") fieldKey = "postsEnabled";
                    else if (item.key === "MOBILE_COMMENTS") fieldKey = "commentsEnabled";
                    else if (item.key === "MOBILE_LIKES") fieldKey = "likesEnabled";
                    else if (item.key === "MOBILE_MEDIA_UPLOAD") fieldKey = "imageUploadEnabled";
                    else if (item.key === "MOBILE_PROJECTS") fieldKey = "projectsEnabled";
                    else if (item.key === "MOBILE_PROJECT_UPDATES") fieldKey = "allowProjectUpdates";
                    else if (item.key === "MOBILE_PUSH_NOTIFICATIONS") fieldKey = "pushEnabled";
                    else if (item.key === "MOBILE_PROFILE") fieldKey = "profileViewingEnabled";
                    else if (item.key === "MOBILE_PROFILE_EDIT") fieldKey = "profileEditingEnabled";
                    else if (item.key === "MOBILE_PFP_UPLOAD") fieldKey = "pfpUploadEnabled";
                    else if (item.key === "MOBILE_LEAVE_REQUESTS") fieldKey = "leaveRequestsEnabled";
                    else if (item.key === "MOBILE_PAYMENTS") fieldKey = "paymentsEnabled";
                    else if (item.key === "MOBILE_DOCUMENTS") fieldKey = "documentsEnabled";
                    else if (item.key === "MOBILE_OFFER_LETTER") fieldKey = "docOfferLetter";

                    const isChecked = fieldKey && config[fieldKey] !== undefined ? Boolean(config[fieldKey]) : true;

                    return (
                      <div
                        key={item.key}
                        className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col justify-between gap-3 hover:border-neutral-700 transition-all"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-white text-xs">{item.label}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 uppercase font-mono">
                              {item.category}
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-500 font-mono block leading-relaxed">
                            {item.description}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-neutral-900">
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {item.key}
                          </span>
                          <input
                            type="checkbox"
                            disabled={!isEditor}
                            checked={isChecked}
                            onChange={(e) => {
                              if (fieldKey) {
                                setConfig({ ...config, [fieldKey]: e.target.checked });
                              }
                            }}
                            className="w-5 h-5 accent-crimson cursor-pointer"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. ATTENDANCE TAB */}
            {activeTab === "attendance" && (
              <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
                <div className="border-b border-neutral-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-orbitron font-bold text-white uppercase">
                      Mobile Attendance Remote Controls
                    </h3>
                    <p className="text-xs font-mono text-neutral-400">
                      Normal check-ins happen in the Mobile App while Website remains the authoritative control center
                    </p>
                  </div>
                  {isEditor && (
                    <button
                      onClick={() => handleSaveConfig()}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-crimson/25 transition-all self-start sm:self-auto"
                    >
                      <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Attendance"}
                    </button>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs font-mono leading-relaxed space-y-1 text-neutral-300">
                  <div className="flex items-center gap-2 text-amber-400 font-bold uppercase mb-1">
                    <Info className="w-4 h-4" /> Server-Enforced Attendance Windows
                  </div>
                  <p className="text-neutral-400 font-sans text-xs">
                    The mobile client cannot invent an attendance window. It will only render the &quot;Mark Present&quot; button when the server confirms an open attendance slot, the user is eligible, and check-in was not already completed today.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">Attendance Feature</span>
                      <span className="text-[10px] text-neutral-500">Master mobile switch</span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.attendanceEnabled)}
                      onChange={(e) => setConfig({ ...config, attendanceEnabled: e.target.checked })}
                      className="w-5 h-5 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">Employee Self Attendance</span>
                      <span className="text-[10px] text-neutral-500">Allow full-time staff</span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.employeeSelfAttendance)}
                      onChange={(e) => setConfig({ ...config, employeeSelfAttendance: e.target.checked })}
                      className="w-5 h-5 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">Intern Self Attendance</span>
                      <span className="text-[10px] text-neutral-500">Allow intern check-in</span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.internSelfAttendance)}
                      onChange={(e) => setConfig({ ...config, internSelfAttendance: e.target.checked })}
                      className="w-5 h-5 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">Attendance History</span>
                      <span className="text-[10px] text-neutral-500">View past days and logs</span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.allowAttendanceHistory)}
                      onChange={(e) => setConfig({ ...config, allowAttendanceHistory: e.target.checked })}
                      className="w-5 h-5 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">Correction Requests</span>
                      <span className="text-[10px] text-neutral-500">Allow submitting tickets</span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.allowAttendanceCorrection)}
                      onChange={(e) => setConfig({ ...config, allowAttendanceCorrection: e.target.checked })}
                      className="w-5 h-5 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">Show Percentage</span>
                      <span className="text-[10px] text-neutral-500">Display monthly % score</span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.showAttendancePercentage)}
                      onChange={(e) => setConfig({ ...config, showAttendancePercentage: e.target.checked })}
                      className="w-5 h-5 accent-crimson cursor-pointer"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 font-mono text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">Require Active Attendance Window</span>
                      <span className="text-[10px] text-neutral-500">
                        Strictly reject mobile check-ins outside leadership-opened windows
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.requireActiveAttendanceWindow)}
                      onChange={(e) => setConfig({ ...config, requireActiveAttendanceWindow: e.target.checked })}
                      className="w-5 h-5 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="pt-2">
                    <label className="block text-neutral-400 mb-1">Default Attendance Window Duration (Minutes)</label>
                    <input
                      type="number"
                      disabled={!isEditor}
                      value={config.defaultAttendanceDuration || 20}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          defaultAttendanceDuration: parseInt(e.target.value, 10) || 20,
                        })
                      }
                      className="w-full sm:w-64 px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. MESSAGES & DM MATRIX TAB */}
            {activeTab === "messages" && (
              <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-8">
                <div className="border-b border-neutral-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-orbitron font-bold text-white uppercase">
                      Mobile Direct Messages & Permission Matrix
                    </h3>
                    <p className="text-xs font-mono text-neutral-400">
                      Configure mobile chat functionality and role-to-role DM authorization rules
                    </p>
                  </div>
                  {isEditor && (
                    <button
                      onClick={() => handleSaveConfig()}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-crimson/25 transition-all self-start sm:self-auto"
                    >
                      <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Messages Config"}
                    </button>
                  )}
                </div>

                {/* Features Switchboard */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-white font-bold">Direct Messages (DMs)</span>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.dmEnabled)}
                      onChange={(e) => setConfig({ ...config, dmEnabled: e.target.checked })}
                      className="w-4 h-4 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-white font-bold">Group Messages</span>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.groupMessagesEnabled)}
                      onChange={(e) => setConfig({ ...config, groupMessagesEnabled: e.target.checked })}
                      className="w-4 h-4 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-white font-bold">Project Team Chat</span>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.projectChatEnabled)}
                      onChange={(e) => setConfig({ ...config, projectChatEnabled: e.target.checked })}
                      className="w-4 h-4 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-white font-bold">File Attachments</span>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.fileAttachmentsEnabled)}
                      onChange={(e) => setConfig({ ...config, fileAttachmentsEnabled: e.target.checked })}
                      className="w-4 h-4 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-white font-bold">Image Attachments</span>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.imageAttachmentsEnabled)}
                      onChange={(e) => setConfig({ ...config, imageAttachmentsEnabled: e.target.checked })}
                      className="w-4 h-4 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-white font-bold">Read Receipts</span>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.readReceiptsEnabled)}
                      onChange={(e) => setConfig({ ...config, readReceiptsEnabled: e.target.checked })}
                      className="w-4 h-4 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-white font-bold">Typing Indicators</span>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.typingIndicatorsEnabled)}
                      onChange={(e) => setConfig({ ...config, typingIndicatorsEnabled: e.target.checked })}
                      className="w-4 h-4 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-white font-bold">Message Deletion</span>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.messageDeleteEnabled)}
                      onChange={(e) => setConfig({ ...config, messageDeleteEnabled: e.target.checked })}
                      className="w-4 h-4 accent-crimson cursor-pointer"
                    />
                  </div>
                </div>

                {/* DM Permission Matrix */}
                <div className="space-y-4 pt-4 border-t border-neutral-800">
                  <h4 className="text-sm font-orbitron font-bold text-white uppercase">
                    Role-to-Role DM Permission Matrix
                  </h4>
                  <p className="text-xs font-mono text-neutral-400">
                    Defines whether a specific organizational role can initiate direct chats with another role
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
                    {Object.entries(config.dmRoleMatrix || {}).map(([key, val]) => (
                      <div
                        key={key}
                        className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between"
                      >
                        <span className="text-neutral-300">{key.replace(/_/g, " ")}</span>
                        <input
                          type="checkbox"
                          disabled={!isEditor}
                          checked={Boolean(val)}
                          onChange={(e) => {
                            const updatedMatrix = { ...config.dmRoleMatrix, [key]: e.target.checked };
                            setConfig({ ...config, dmRoleMatrix: updatedMatrix });
                          }}
                          className="w-4 h-4 accent-crimson cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 6. POSTS TAB */}
            {activeTab === "posts" && (
              <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
                <div className="border-b border-neutral-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-orbitron font-bold text-white uppercase">
                      Feed, Posts & Social Interactions
                    </h3>
                    <p className="text-xs font-mono text-neutral-400">
                      Manage feed viewing, creation permissions, comments, and media uploads
                    </p>
                  </div>
                  {isEditor && (
                    <button
                      onClick={() => handleSaveConfig()}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-crimson/25 transition-all self-start sm:self-auto"
                    >
                      <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Feed Settings"}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold block">Feed Feature</span>
                      <span className="text-[10px] text-neutral-500">View team social feed</span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.postsEnabled)}
                      onChange={(e) => setConfig({ ...config, postsEnabled: e.target.checked })}
                      className="w-5 h-5 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold block">Comments</span>
                      <span className="text-[10px] text-neutral-500">Post discussions</span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.commentsEnabled)}
                      onChange={(e) => setConfig({ ...config, commentsEnabled: e.target.checked })}
                      className="w-5 h-5 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold block">Likes & Reactions</span>
                      <span className="text-[10px] text-neutral-500">Thumbs up & hearts</span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.likesEnabled)}
                      onChange={(e) => setConfig({ ...config, likesEnabled: e.target.checked })}
                      className="w-5 h-5 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold block">Image Upload</span>
                      <span className="text-[10px] text-neutral-500">Attach photos</span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.imageUploadEnabled ?? true)}
                      onChange={(e) => setConfig({ ...config, imageUploadEnabled: e.target.checked })}
                      className="w-5 h-5 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold block">Video Upload</span>
                      <span className="text-[10px] text-neutral-500">Short screen recordings</span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.videoUploadEnabled)}
                      onChange={(e) => setConfig({ ...config, videoUploadEnabled: e.target.checked })}
                      className="w-5 h-5 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold block">Project Updates</span>
                      <span className="text-[10px] text-neutral-500">Link post to projects</span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.projectUpdatesEnabled)}
                      onChange={(e) => setConfig({ ...config, projectUpdatesEnabled: e.target.checked })}
                      className="w-5 h-5 accent-crimson cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 7. PROJECTS TAB */}
            {activeTab === "projects" && (
              <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
                <div className="border-b border-neutral-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-orbitron font-bold text-white uppercase">
                      Mobile Projects Directory
                    </h3>
                    <p className="text-xs font-mono text-neutral-400">
                      Mobile view controls for Agency client builds and internal repositories
                    </p>
                  </div>
                  {isEditor && (
                    <button
                      onClick={() => handleSaveConfig()}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-crimson/25 transition-all self-start sm:self-auto"
                    >
                      <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Projects Settings"}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold block">Show Projects</span>
                      <span className="text-[10px] text-neutral-500">Master projects section</span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.projectsEnabled)}
                      onChange={(e) => setConfig({ ...config, projectsEnabled: e.target.checked })}
                      className="w-5 h-5 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold block">Show Assigned Only</span>
                      <span className="text-[10px] text-neutral-500">Hide unassigned repositories</span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.showAssignedProjectsOnly)}
                      onChange={(e) => setConfig({ ...config, showAssignedProjectsOnly: e.target.checked })}
                      className="w-5 h-5 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold block">Allow Project Updates</span>
                      <span className="text-[10px] text-neutral-500">Milestone logs</span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.allowProjectUpdates)}
                      onChange={(e) => setConfig({ ...config, allowProjectUpdates: e.target.checked })}
                      className="w-5 h-5 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold block">Mobile Project Comments</span>
                      <span className="text-[10px] text-neutral-500">Discussion threads</span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.allowMobileProjectComments)}
                      onChange={(e) => setConfig({ ...config, allowMobileProjectComments: e.target.checked })}
                      className="w-5 h-5 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold block">Show Project Members</span>
                      <span className="text-[10px] text-neutral-500">Collaborator avatars</span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.showProjectMembers)}
                      onChange={(e) => setConfig({ ...config, showProjectMembers: e.target.checked })}
                      className="w-5 h-5 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold block">Show Project Status</span>
                      <span className="text-[10px] text-neutral-500">Live, In Progress tags</span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.showProjectStatus)}
                      onChange={(e) => setConfig({ ...config, showProjectStatus: e.target.checked })}
                      className="w-5 h-5 accent-crimson cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 8. NOTIFICATIONS TAB */}
            {activeTab === "notifications" && (
              <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
                <div className="border-b border-neutral-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-orbitron font-bold text-white uppercase">
                      Push Notifications & Dispatch Categories
                    </h3>
                    <p className="text-xs font-mono text-neutral-400">
                      Manage FCM mobile push delivery categories and background sync alerts
                    </p>
                  </div>
                  {isEditor && (
                    <button
                      onClick={() => handleSaveConfig()}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-crimson/25 transition-all self-start sm:self-auto"
                    >
                      <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Notifications"}
                    </button>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between font-mono text-xs">
                  <div>
                    <span className="font-bold text-white block">Master Push Notifications</span>
                    <span className="text-[10px] text-neutral-500">
                      Global background push delivery switch
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!isEditor}
                    checked={Boolean(config.pushEnabled)}
                    onChange={(e) => setConfig({ ...config, pushEnabled: e.target.checked })}
                    className="w-5 h-5 accent-crimson cursor-pointer"
                  />
                </div>

                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-orbitron font-bold text-white uppercase">
                    Notification Categories Switchboard
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 font-mono text-xs">
                    {[
                      "attendance",
                      "messages",
                      "projects",
                      "hr",
                      "leave",
                      "payments",
                      "documents",
                      "posts",
                      "security",
                      "announcements",
                    ].map((cat) => {
                      const isCatEnabled =
                        config.pushCategories && config.pushCategories[cat] !== undefined
                          ? Boolean(config.pushCategories[cat])
                          : true;
                      return (
                        <div
                          key={cat}
                          className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between"
                        >
                          <span className="text-neutral-300 capitalize">{cat}</span>
                          <input
                            type="checkbox"
                            disabled={!isEditor}
                            checked={isCatEnabled}
                            onChange={(e) => {
                              const updated = {
                                ...(config.pushCategories || {}),
                                [cat]: e.target.checked,
                              };
                              setConfig({ ...config, pushCategories: updated });
                            }}
                            className="w-4 h-4 accent-crimson cursor-pointer"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 9. PAYMENTS TAB */}
            {activeTab === "payments" && (
              <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
                <div className="border-b border-neutral-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-orbitron font-bold text-white uppercase">
                      Mobile Payments & Internship Dues (₹450)
                    </h3>
                    <p className="text-xs font-mono text-neutral-400">
                      Configure mobile invoice status cards and web redirect for automated UPI checkout
                    </p>
                  </div>
                  {isEditor && (
                    <button
                      onClick={() => handleSaveConfig()}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-crimson/25 transition-all self-start sm:self-auto"
                    >
                      <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Payment Config"}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold block">Mobile Payments Feature</span>
                      <span className="text-[10px] text-neutral-500">Show payments menu in mobile app</span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.paymentsEnabled)}
                      onChange={(e) => setConfig({ ...config, paymentsEnabled: e.target.checked })}
                      className="w-5 h-5 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold block">Intern Mandatory Payment Card</span>
                      <span className="text-[10px] text-neutral-500">Display ₹450 onboarding bill to intern</span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.internFeeVisible)}
                      onChange={(e) => setConfig({ ...config, internFeeVisible: e.target.checked })}
                      className="w-5 h-5 accent-crimson cursor-pointer"
                    />
                  </div>
                </div>

                {/* ₹450 Fee Breakdown Showcase Card */}
                <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-orbitron font-bold text-white uppercase">
                        Current Intern Fee Structure
                      </h4>
                      <p className="text-xs font-mono text-neutral-400">
                        Official CodeXa standard onboarding package
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-xl bg-crimson/20 border border-crimson/40 text-bright-red font-orbitron font-bold text-sm">
                      Total: ₹{config.internFeeTotal || 450}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                    <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex justify-between items-center">
                      <span className="text-neutral-400">Mandatory Physical ID Card:</span>
                      <span className="text-white font-bold">₹150</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex justify-between items-center">
                      <span className="text-neutral-400">AI Dev Tools Pack & Suite:</span>
                      <span className="text-white font-bold">₹300</span>
                    </div>
                  </div>

                  <div className="pt-2 font-mono text-xs space-y-1">
                    <label className="text-neutral-400 block mb-1">
                      Web Pay Redirect URL (Mobile &quot;Pay Now&quot; button opens this)
                    </label>
                    <input
                      type="text"
                      disabled={!isEditor}
                      value={config.paymentPortalUrl || "https://codxa-agency.online/dashboard/internship/payment"}
                      onChange={(e) => setConfig({ ...config, paymentPortalUrl: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 10. DOCUMENTS TAB */}
            {activeTab === "documents" && (
              <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
                <div className="border-b border-neutral-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-orbitron font-bold text-white uppercase">
                      Mobile Documents & Certificates
                    </h3>
                    <p className="text-xs font-mono text-neutral-400">
                      Configure visibility of official PDF credentials and letters in mobile client
                    </p>
                  </div>
                  {isEditor && (
                    <button
                      onClick={() => handleSaveConfig()}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-crimson/25 transition-all self-start sm:self-auto"
                    >
                      <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Documents"}
                    </button>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between font-mono text-xs">
                  <div>
                    <span className="font-bold text-white block">Documents Center</span>
                    <span className="text-[10px] text-neutral-500">
                      Master documents module switch
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!isEditor}
                    checked={Boolean(config.documentsEnabled)}
                    onChange={(e) => setConfig({ ...config, documentsEnabled: e.target.checked })}
                    className="w-5 h-5 accent-crimson cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-white font-bold">Offer Letter</span>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.docOfferLetter)}
                      onChange={(e) => setConfig({ ...config, docOfferLetter: e.target.checked })}
                      className="w-4 h-4 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-white font-bold">Physical ID Card</span>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.docIdCard)}
                      onChange={(e) => setConfig({ ...config, docIdCard: e.target.checked })}
                      className="w-4 h-4 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-white font-bold">Staff Payslips</span>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.docPayslips)}
                      onChange={(e) => setConfig({ ...config, docPayslips: e.target.checked })}
                      className="w-4 h-4 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-white font-bold">Internship Certificate</span>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.docInternshipCert)}
                      onChange={(e) => setConfig({ ...config, docInternshipCert: e.target.checked })}
                      className="w-4 h-4 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-white font-bold">Completion Certificate</span>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.docCompletionCert)}
                      onChange={(e) => setConfig({ ...config, docCompletionCert: e.target.checked })}
                      className="w-4 h-4 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-white font-bold">Experience Letter</span>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.docExperienceLetter)}
                      onChange={(e) => setConfig({ ...config, docExperienceLetter: e.target.checked })}
                      className="w-4 h-4 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-white font-bold">Signed NDA</span>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.docNda)}
                      onChange={(e) => setConfig({ ...config, docNda: e.target.checked })}
                      className="w-4 h-4 accent-crimson cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 11. PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
                <div className="border-b border-neutral-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-orbitron font-bold text-white uppercase">
                      Profile Viewing & Editing Restrictions
                    </h3>
                    <p className="text-xs font-mono text-neutral-400">
                      Determine what members can customize from their personal mobile device
                    </p>
                  </div>
                  {isEditor && (
                    <button
                      onClick={() => handleSaveConfig()}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-crimson/25 transition-all self-start sm:self-auto"
                    >
                      <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Profile Settings"}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-white font-bold">Profile Viewing</span>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.profileViewingEnabled)}
                      onChange={(e) => setConfig({ ...config, profileViewingEnabled: e.target.checked })}
                      className="w-4 h-4 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-white font-bold">Profile Details Editing</span>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.profileEditingEnabled)}
                      onChange={(e) => setConfig({ ...config, profileEditingEnabled: e.target.checked })}
                      className="w-4 h-4 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-white font-bold">Avatar / PFP Upload</span>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.pfpUploadEnabled)}
                      onChange={(e) => setConfig({ ...config, pfpUploadEnabled: e.target.checked })}
                      className="w-4 h-4 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-white font-bold">Bio Editing</span>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.bioEditingEnabled)}
                      onChange={(e) => setConfig({ ...config, bioEditingEnabled: e.target.checked })}
                      className="w-4 h-4 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-white font-bold">Skills Editing</span>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.skillsEditingEnabled)}
                      onChange={(e) => setConfig({ ...config, skillsEditingEnabled: e.target.checked })}
                      className="w-4 h-4 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-white font-bold">Social Links Editing</span>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.socialLinksEditingEnabled)}
                      onChange={(e) => setConfig({ ...config, socialLinksEditingEnabled: e.target.checked })}
                      className="w-4 h-4 accent-crimson cursor-pointer"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 font-mono text-xs space-y-2">
                  <div className="flex items-center gap-2 text-red-400 font-bold uppercase">
                    <Lock className="w-4 h-4" /> Strictly Immutable Core Identity Fields
                  </div>
                  <p className="text-neutral-400 font-sans leading-relaxed">
                    Mobile clients are permanently prohibited from editing: Role, Org Role, Employee ID, Intern ID, Salary, Stipend, Joining Date, Internship Dates, and Account Status. These remain exclusive to the Website leadership control plane.
                  </p>
                </div>
              </div>
            )}

            {/* 12. ROLE CONTROLS TAB */}
            {activeTab === "roles" && (
              <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
                <div className="border-b border-neutral-800 pb-4">
                  <h3 className="text-base font-orbitron font-bold text-white uppercase">
                    Role-Based Mobile Feature Overrides
                  </h3>
                  <p className="text-xs font-mono text-neutral-400">
                    Apply targeted feature overrides for specific roles (e.g. Interns vs Employees)
                  </p>
                </div>

                {/* Role Selector Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
                  {ROLES_LIST.map((r) => (
                    <button
                      key={r}
                      onClick={() => setSelectedRole(r)}
                      className={`px-3 py-1.5 rounded-xl transition-all ${
                        selectedRole === r
                          ? "bg-purple-600 text-white font-bold shadow-lg shadow-purple-600/30"
                          : "bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-neutral-300">
                    Currently configuring overrides for role:{" "}
                    <span className="text-purple-400 font-bold">{selectedRole}</span>
                  </span>
                  {roleSaving && <span className="text-crimson animate-pulse">Saving override...</span>}
                </div>

                {/* Role Feature Overrides Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
                  {featuresList.map((item) => {
                    const currentOverride = roleOverrides[selectedRole]?.[item.key] || "DEFAULT";

                    return (
                      <div
                        key={item.key}
                        className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-2"
                      >
                        <div className="truncate">
                          <span className="text-white font-bold block truncate">{item.label}</span>
                          <span className="text-[10px] text-neutral-500 truncate block">{item.key}</span>
                        </div>

                        <select
                          disabled={!isEditor}
                          value={currentOverride}
                          onChange={(e) => handleSetRoleOverride(selectedRole, item.key, e.target.value)}
                          className={`px-2 py-1 rounded-lg text-xs font-mono border focus:outline-none ${
                            currentOverride === "ENABLED"
                              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                              : currentOverride === "DISABLED"
                              ? "bg-red-500/15 border-red-500/40 text-red-400"
                              : "bg-neutral-900 border-neutral-800 text-neutral-400"
                          }`}
                        >
                          <option value="DEFAULT">DEFAULT (Global)</option>
                          <option value="ENABLED">ENABLED</option>
                          <option value="DISABLED">DISABLED</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 13. USER OVERRIDES TAB */}
            {activeTab === "users" && (
              <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
                <div className="border-b border-neutral-800 pb-4">
                  <h3 className="text-base font-orbitron font-bold text-white uppercase">
                    Specific User Feature Overrides
                  </h3>
                  <p className="text-xs font-mono text-neutral-400">
                    Highest precedence: Grant or restrict mobile features for an individual account
                  </p>
                </div>

                {/* User Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-4 top-3 text-neutral-500" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                    placeholder="Search by name, email, employee ID (e.g. CXA-EMP-2026-001) or intern ID (CXA-INT-2026-039)..."
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs focus:outline-none focus:border-crimson"
                  />
                </div>

                {/* Search Results Dropdown/List */}
                {userSearchResults.length > 0 && (
                  <div className="p-2 rounded-2xl bg-neutral-950 border border-neutral-800 max-h-48 overflow-y-auto space-y-1 font-mono text-xs">
                    {userSearchResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleSelectUser(u)}
                        className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all ${
                          selectedUser?.id === u.id
                            ? "bg-crimson/20 border border-crimson/40 text-white"
                            : "hover:bg-neutral-900 text-neutral-300"
                        }`}
                      >
                        <div>
                          <span className="font-bold block">
                            {u.fullName || u.username} (@{u.username})
                          </span>
                          <span className="text-[10px] text-neutral-500">
                            {u.email} &bull; {u.employmentProfile?.employeeId || u.role}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                          {u.role}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected User Overrides Panel */}
                {selectedUser ? (
                  <div className="space-y-4 pt-4 border-t border-neutral-800">
                    <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">
                          Selected Account
                        </span>
                        <span className="font-bold text-white text-sm">
                          {selectedUser.fullName || selectedUser.username}
                        </span>
                        <span className="text-neutral-400 text-xs block">
                          ID: {selectedUser.employeeId || selectedUser.id} &bull; Email: {selectedUser.email}
                        </span>
                      </div>
                      {userOverrideSaving && (
                        <span className="text-crimson animate-pulse">Saving user override...</span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
                      {featuresList.map((item) => {
                        const currentOverride = selectedUserOverrides[item.key] || "DEFAULT";

                        return (
                          <div
                            key={item.key}
                            className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-2"
                          >
                            <div className="truncate">
                              <span className="text-white font-bold block truncate">{item.label}</span>
                              <span className="text-[10px] text-neutral-500 truncate block">{item.key}</span>
                            </div>

                            <select
                              disabled={!isEditor}
                              value={currentOverride}
                              onChange={(e) =>
                                handleSetUserOverride(selectedUser.id, item.key, e.target.value)
                              }
                              className={`px-2 py-1 rounded-lg text-xs font-mono border focus:outline-none ${
                                currentOverride === "ENABLED"
                                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                                  : currentOverride === "DISABLED"
                                  ? "bg-red-500/15 border-red-500/40 text-red-400"
                                  : "bg-neutral-900 border-neutral-800 text-neutral-400"
                              }`}
                            >
                              <option value="DEFAULT">DEFAULT (Inherit)</option>
                              <option value="ENABLED">ENABLED</option>
                              <option value="DISABLED">DISABLED</option>
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs font-mono text-neutral-500 border border-dashed border-neutral-800 rounded-2xl">
                    Search for an intern or employee account above to configure custom feature overrides.
                  </div>
                )}
              </div>
            )}

            {/* 14. SECURITY & SESSIONS TAB */}
            {activeTab === "security" && (
              <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-8">
                <div className="border-b border-neutral-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-orbitron font-bold text-white uppercase">
                      Mobile Security Policies & Device Fleet
                    </h3>
                    <p className="text-xs font-mono text-neutral-400">
                      Hardware bindings, session limits, and cryptographic device authorizations
                    </p>
                  </div>
                  {isEditor && (
                    <button
                      onClick={() => handleSaveConfig()}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-crimson/25 transition-all self-start sm:self-auto"
                    >
                      <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Policies"}
                    </button>
                  )}
                </div>

                {/* Policies Switches */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                    <label className="text-neutral-400 block">Max Hardware Devices Per User</label>
                    <select
                      disabled={!isEditor}
                      value={config.maxDevicesPerUser || 2}
                      onChange={(e) =>
                        setConfig({ ...config, maxDevicesPerUser: parseInt(e.target.value, 10) || 2 })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white"
                    >
                      <option value="1">1 Hardware Device</option>
                      <option value="2">2 Devices (Standard Fleet)</option>
                      <option value="3">3 Devices</option>
                      <option value="5">5 Devices (Leadership)</option>
                    </select>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                    <label className="text-neutral-400 block">Session Expiry (Days)</label>
                    <input
                      type="number"
                      disabled={!isEditor}
                      value={config.sessionExpiryDays || 30}
                      onChange={(e) =>
                        setConfig({ ...config, sessionExpiryDays: parseInt(e.target.value, 10) || 30 })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold block">Allow Multiple Sessions</span>
                      <span className="text-[10px] text-neutral-500">Concurrent logins</span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.multipleSessionsAllowed)}
                      onChange={(e) => setConfig({ ...config, multipleSessionsAllowed: e.target.checked })}
                      className="w-5 h-5 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold block">Block Rooted / Jailbroken</span>
                      <span className="text-[10px] text-neutral-500">Integrity check</span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.blockRootedDevices)}
                      onChange={(e) => setConfig({ ...config, blockRootedDevices: e.target.checked })}
                      className="w-5 h-5 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold block">Screenshot Protection</span>
                      <span className="text-[10px] text-neutral-500">Prevent capture of secure docs</span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.screenshotProtection)}
                      onChange={(e) => setConfig({ ...config, screenshotProtection: e.target.checked })}
                      className="w-5 h-5 accent-crimson cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold block">Require Latest Version</span>
                      <span className="text-[10px] text-neutral-500">Block older app versions</span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditor}
                      checked={Boolean(config.requireLatestVersionLogin)}
                      onChange={(e) => setConfig({ ...config, requireLatestVersionLogin: e.target.checked })}
                      className="w-5 h-5 accent-crimson cursor-pointer"
                    />
                  </div>
                </div>

                {/* Active Mobile Sessions Table */}
                <div className="space-y-4 pt-4 border-t border-neutral-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-orbitron font-bold text-white uppercase">
                        Registered Mobile Devices ({sessions.length})
                      </h4>
                      <p className="text-xs font-mono text-neutral-400">
                        Remotely revoke compromised or departed member device sessions
                      </p>
                    </div>

                    {isEditor && sessions.length > 0 && (
                      <button
                        onClick={() =>
                          setConfirmModal({
                            open: true,
                            title: "Revoke ALL Mobile Device Sessions?",
                            description:
                              "All active phone and tablet logins across the entire company will immediately be logged out.",
                            actionType: "REVOKE_ALL_SESSIONS",
                          })
                        }
                        className="px-3.5 py-1.5 rounded-xl bg-red-600/20 text-red-300 hover:bg-red-600/30 border border-red-500/30 text-xs font-mono uppercase flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Force Logout All Devices
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-neutral-800">
                    <table className="w-full text-left font-mono text-xs">
                      <thead className="bg-neutral-950 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
                        <tr>
                          <th className="p-3">User</th>
                          <th className="p-3">Device Name</th>
                          <th className="p-3">Platform</th>
                          <th className="p-3">Version</th>
                          <th className="p-3">Last Active</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60 bg-neutral-950/40">
                        {sessions.map((s) => (
                          <tr key={s.id} className="hover:bg-neutral-900/40">
                            <td className="p-3 font-bold text-white">
                              {s.user?.fullName || s.user?.username} (@{s.user?.username})
                              <span className="text-[10px] text-neutral-500 block">
                                {s.user?.employmentProfile?.employeeId || s.user?.role}
                              </span>
                            </td>
                            <td className="p-3 text-neutral-300">{s.deviceName || "Mobile Device"}</td>
                            <td className="p-3 text-purple-400">{s.platform || "ANDROID"}</td>
                            <td className="p-3 text-neutral-400">v{s.appVersion || "1.0.0"}</td>
                            <td className="p-3 text-neutral-400">
                              {new Date(s.lastActive).toLocaleDateString()}{" "}
                              {new Date(s.lastActive).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  s.isRevoked
                                    ? "bg-red-500/15 text-red-400"
                                    : "bg-emerald-500/15 text-emerald-400"
                                }`}
                              >
                                {s.isRevoked ? "REVOKED" : "ACTIVE"}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              {!s.isRevoked && isEditor && (
                                <button
                                  onClick={() => handleRevokeSession(s.id)}
                                  className="px-2.5 py-1 rounded bg-red-600/20 text-red-300 hover:bg-red-600/40 text-[10px] font-bold"
                                >
                                  Revoke
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {sessions.length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-neutral-500 font-mono text-xs">
                              No physical mobile devices currently registered in active sessions.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 15. ANNOUNCEMENT TAB */}
            {activeTab === "announcement" && (
              <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
                <div className="border-b border-neutral-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-orbitron font-bold text-white uppercase">
                      Mobile Broadcast Announcement Banner
                    </h3>
                    <p className="text-xs font-mono text-neutral-400">
                      Display high-visibility broadcast notifications directly on the mobile app home screen
                    </p>
                  </div>
                  {isEditor && (
                    <button
                      onClick={() => handleSaveConfig()}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-crimson/25 transition-all self-start sm:self-auto"
                    >
                      <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Publish Announcement"}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Form */}
                  <div className="space-y-4 font-mono text-xs">
                    <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                      <div>
                        <span className="text-white font-bold block">Announcement Banner Active</span>
                        <span className="text-[10px] text-neutral-500">
                          Toggle visibility on mobile dashboard
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        disabled={!isEditor}
                        checked={Boolean(config.announcementEnabled)}
                        onChange={(e) => setConfig({ ...config, announcementEnabled: e.target.checked })}
                        className="w-5 h-5 accent-crimson cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-neutral-400 mb-1">Announcement Title</label>
                      <input
                        type="text"
                        disabled={!isEditor}
                        value={config.announcementTitle || ""}
                        onChange={(e) => setConfig({ ...config, announcementTitle: e.target.value })}
                        placeholder="e.g. CodeXa Internship Update"
                        className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                      />
                    </div>

                    <div>
                      <label className="block text-neutral-400 mb-1">Broadcast Message Body</label>
                      <textarea
                        rows={3}
                        disabled={!isEditor}
                        value={config.announcementMessage || ""}
                        onChange={(e) => setConfig({ ...config, announcementMessage: e.target.value })}
                        placeholder="e.g. Your mandatory service payment is due. Please review your internship fee details."
                        className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-neutral-400 mb-1">Severity / Type</label>
                        <select
                          disabled={!isEditor}
                          value={config.announcementType || "INFO"}
                          onChange={(e) => setConfig({ ...config, announcementType: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                        >
                          <option value="INFO">INFO (Blue/Neutral)</option>
                          <option value="WARNING">WARNING (Amber)</option>
                          <option value="URGENT">URGENT (Crimson)</option>
                          <option value="MAINTENANCE">MAINTENANCE (Purple)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-neutral-400 mb-1">Action Button Label</label>
                        <input
                          type="text"
                          disabled={!isEditor}
                          value={config.announcementActionLabel || ""}
                          onChange={(e) => setConfig({ ...config, announcementActionLabel: e.target.value })}
                          placeholder="e.g. View Payment"
                          className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-neutral-400 mb-1">Action Destination URL / Route</label>
                      <input
                        type="text"
                        disabled={!isEditor}
                        value={config.announcementActionUrl || ""}
                        onChange={(e) => setConfig({ ...config, announcementActionUrl: e.target.value })}
                        placeholder="e.g. /dashboard/internship/payment"
                        className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                      />
                    </div>
                  </div>

                  {/* Live Mobile Client Preview */}
                  <div className="rounded-2xl bg-neutral-950 border border-neutral-800 p-6 space-y-4">
                    <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block">
                      Live Mobile Viewport Preview
                    </span>

                    {config.announcementEnabled ? (
                      <div
                        className={`p-5 rounded-2xl border space-y-3 shadow-xl ${
                          config.announcementType === "URGENT"
                            ? "bg-red-500/10 border-red-500/30 text-red-200"
                            : config.announcementType === "WARNING"
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                            : config.announcementType === "MAINTENANCE"
                            ? "bg-purple-500/10 border-purple-500/30 text-purple-200"
                            : "bg-blue-500/10 border-blue-500/30 text-blue-200"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Radio className="w-4 h-4 animate-pulse" />
                          <h5 className="font-orbitron font-bold text-white text-sm">
                            {config.announcementTitle || "Untitled Announcement"}
                          </h5>
                        </div>
                        <p className="text-xs font-sans text-neutral-300 leading-relaxed">
                          {config.announcementMessage || "No message body written."}
                        </p>
                        {config.announcementActionLabel && (
                          <div className="pt-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold transition-all cursor-pointer">
                              {config.announcementActionLabel} <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-16 text-center text-xs font-mono text-neutral-600 border border-dashed border-neutral-900 rounded-2xl">
                        Announcement banner is currently disabled. Toggle &quot;Announcement Banner Active&quot; to preview live rendering.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 16. ADVANCED & AUDIT LOGS TAB */}
            {activeTab === "advanced" && (
              <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-8">
                <div className="border-b border-neutral-800 pb-4">
                  <h3 className="text-base font-orbitron font-bold text-white uppercase">
                    Advanced Controls & Mobile Audit Logs
                  </h3>
                  <p className="text-xs font-mono text-neutral-400">
                    Cryptographic audit trail of mobile remote configuration modifications
                  </p>
                </div>

                {/* Danger Zone */}
                {isEditor && (
                  <div className="p-6 rounded-2xl bg-red-950/20 border border-red-500/30 space-y-4">
                    <div className="flex items-center gap-2 text-bright-red font-orbitron font-bold text-sm uppercase">
                      <Flame className="w-4 h-4" /> Danger Zone Actions
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                      <button
                        onClick={() =>
                          setConfirmModal({
                            open: true,
                            title: config.maintenanceEnabled ? "Disable Maintenance?" : "Engage Maintenance Mode?",
                            description:
                              "Instantly changes app accessibility across all distributed mobile devices.",
                            actionType: "TOGGLE_MAINTENANCE",
                          })
                        }
                        className="p-3 rounded-xl bg-neutral-900 border border-red-500/30 text-red-300 hover:bg-neutral-800 text-left"
                      >
                        <span className="font-bold block">Toggle Maintenance</span>
                        <span className="text-[10px] text-neutral-500">Currently: {config.maintenanceEnabled ? "ACTIVE" : "OFF"}</span>
                      </button>

                      <button
                        onClick={() =>
                          setConfirmModal({
                            open: true,
                            title: "Disable Entire Mobile Platform?",
                            description:
                              "Shuts down mobile API endpoints for all users except Founder & Co-Founder.",
                            actionType: "DISABLE_PLATFORM",
                          })
                        }
                        className="p-3 rounded-xl bg-neutral-900 border border-red-500/30 text-red-300 hover:bg-neutral-800 text-left"
                      >
                        <span className="font-bold block">Platform Availability</span>
                        <span className="text-[10px] text-neutral-500">Currently: {config.platformStatus}</span>
                      </button>

                      <button
                        onClick={() =>
                          setConfirmModal({
                            open: true,
                            title: "Revoke ALL Mobile Fleet Sessions?",
                            description:
                              "Forces every single employee and intern to re-authenticate on their physical devices.",
                            actionType: "REVOKE_ALL_SESSIONS",
                          })
                        }
                        className="p-3 rounded-xl bg-neutral-900 border border-red-500/30 text-red-300 hover:bg-neutral-800 text-left"
                      >
                        <span className="font-bold block">Force Logout Fleet</span>
                        <span className="text-[10px] text-neutral-500">Revoke all tokens</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Audit Logs Table */}
                <div className="space-y-4">
                  <h4 className="text-xs font-orbitron font-bold text-white uppercase tracking-wider">
                    Recent Mobile Configuration Audit Trail
                  </h4>

                  <div className="overflow-x-auto rounded-2xl border border-neutral-800">
                    <table className="w-full text-left font-mono text-xs">
                      <thead className="bg-neutral-950 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
                        <tr>
                          <th className="p-3">Timestamp</th>
                          <th className="p-3">Actor</th>
                          <th className="p-3">Action</th>
                          <th className="p-3">Details</th>
                          <th className="p-3">IP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60 bg-neutral-950/40">
                        {recentAuditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-neutral-900/40">
                            <td className="p-3 text-neutral-400 whitespace-nowrap">
                              {new Date(log.createdAt).toLocaleDateString()}{" "}
                              {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="p-3 text-white font-bold">{log.actorName || "Admin"}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-crimson">
                                {log.action}
                              </span>
                            </td>
                            <td className="p-3 text-neutral-300 font-sans text-xs max-w-md truncate">
                              {log.details}
                            </td>
                            <td className="p-3 text-neutral-500 text-[10px]">{log.ipAddress || "127.0.0.1"}</td>
                          </tr>
                        ))}
                        {recentAuditLogs.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-neutral-500 font-mono text-xs">
                              No mobile audit records logged yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* FLOATING STICKY SAVE BAR FOR UNSAVED CHANGES */}
        {hasUnsavedChanges && isEditor && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="p-4 rounded-2xl bg-neutral-900 border border-crimson/50 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-mono text-white">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>You have unsaved changes to Mobile App configuration.</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleDiscardChanges}
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono"
                >
                  Discard
                </button>
                <button
                  onClick={() => handleSaveConfig()}
                  disabled={saving}
                  className="px-4 py-1.5 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-crimson/25"
                >
                  <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRMATION MODAL FOR DANGEROUS ACTIONS */}
        {confirmModal.open && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-neutral-900 border border-neutral-800 p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div className="flex items-center gap-2 text-bright-red">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="text-base font-orbitron font-bold text-white uppercase">
                    Confirm Action
                  </h3>
                </div>
                <button
                  onClick={() => setConfirmModal({ open: false, title: "", description: "", actionType: "" })}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <h4 className="font-orbitron font-bold text-white text-sm">{confirmModal.title}</h4>
                <p className="text-xs font-mono text-neutral-400 leading-relaxed font-sans">
                  {confirmModal.description}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setConfirmModal({ open: false, title: "", description: "", actionType: "" })}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDangerousAction}
                  className="px-5 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white font-orbitron font-bold uppercase transition-all shadow-lg shadow-crimson/25"
                >
                  Confirm & Execute
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TeamCoreShell>
  );
}
