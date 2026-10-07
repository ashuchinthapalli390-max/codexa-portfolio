"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { useAuth } from "@/context/AuthContext";
import {
  Smartphone,
  Monitor,
  Download,
  Key,
  Cpu,
  Shield,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RotateCcw,
  Sliders,
  Users,
  Settings,
  Layers,
  Sparkles,
  Lock,
  X,
  ExternalLink
} from "lucide-react";
import { hasPermission, Permission, getEffectiveRole, canManageMobile } from "@/lib/permissions";

export default function AppsCenterPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // User's own license & mobile config
  const [myLicense, setMyLicense] = useState<any>(null);
  const [mobileConfig, setMobileConfig] = useState<any>(null);
  const [myEntitlements, setMyEntitlements] = useState<any[]>([]);

  // Admin tabs & state
  const [adminTab, setAdminTab] = useState<"MY_APPS" | "MOBILE_CONFIG" | "DESKTOP_LICENSES" | "AI_ENTITLEMENTS">("MY_APPS");
  const [allLicenses, setAllLicenses] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // License Generation Modal State
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [deviceLimit, setDeviceLimit] = useState("2");
  const [generatingLicense, setGeneratingLicense] = useState(false);
  const [oneTimeRevealedKey, setOneTimeRevealedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // AI Entitlements Modal State
  const [entitlementUserId, setEntitlementUserId] = useState("");
  const [entitlementModel, setEntitlementModel] = useState("Coding AI");
  const [entitlementDaily, setEntitlementDaily] = useState("200");
  const [entitlementMonthly, setEntitlementMonthly] = useState("5000");

  const canManageMobileApp = user && canManageMobile(user);
  const canManageDesktop = user && hasPermission(user, Permission.MANAGE_DESKTOP_ACCESS);
  const canManageAI = user && hasPermission(user, Permission.MANAGE_AI_ENTITLEMENTS);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Mobile Config
      const mRes = await fetch("/api/apps/mobile-config");
      const mData = await mRes.json();
      if (mData.success) setMobileConfig(mData.config);

      // 2. User's License
      const lRes = await fetch("/api/apps/desktop-licenses");
      const lData = await lRes.json();
      if (lData.success) {
        if (lData.licenses) setAllLicenses(lData.licenses);
        if (lData.license) setMyLicense(lData.license);
      }

      // 3. User's Entitlements
      const eRes = await fetch("/api/apps/ai-entitlements");
      const eData = await eRes.json();
      if (eData.success) setMyEntitlements(eData.entitlements || []);

      // 4. Accounts list if manager
      if (canManageDesktop || canManageAI) {
        const uRes = await fetch("/api/owner/accounts");
        const uData = await uRes.json();
        if (uData.accounts) setAllUsers(uData.accounts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [canManageDesktop, canManageAI]);

  const handleUpdateMobileConfig = async (updates: any) => {
    try {
      const res = await fetch("/api/apps/mobile-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setMobileConfig(data.config);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setGeneratingLicense(true);
    try {
      const res = await fetch("/api/apps/desktop-licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          userId: selectedUserId,
          deviceLimit: parseInt(deviceLimit, 10),
        }),
      });
      const data = await res.json();
      if (data.success && data.oneTimeKey) {
        setOneTimeRevealedKey(data.oneTimeKey);
        loadData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingLicense(false);
    }
  };

  const handleRevokeLicense = async (licenseId: string) => {
    try {
      const res = await fetch("/api/apps/desktop-licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", licenseId }),
      });
      if (res.ok) loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetDevices = async (licenseId: string) => {
    try {
      const res = await fetch("/api/apps/desktop-licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_devices", licenseId }),
      });
      if (res.ok) loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveEntitlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entitlementUserId) return;
    try {
      const res = await fetch("/api/apps/ai-entitlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: entitlementUserId,
          modelName: entitlementModel,
          dailyLimit: parseInt(entitlementDaily, 10),
          monthlyLimit: parseInt(entitlementMonthly, 10),
          enabled: true,
        }),
      });
      if (res.ok) {
        loadData();
        alert(`Entitlement for ${entitlementModel} saved successfully.`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <TeamCoreShell
      title="App Center & Remote Controls"
      subtitle="CodeXa Mobile workspace settings, Desktop AI licensing, and model quotas"
    >
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* TOP TAB SELECTOR */}
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-2 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setAdminTab("MY_APPS")}
            className={`px-4 py-2 rounded-xl transition-all ${
              adminTab === "MY_APPS"
                ? "bg-neutral-800 text-white font-bold"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            My App Access & Status
          </button>
          {canManageMobileApp && (
            <Link
              href="/dashboard/apps/mobile"
              className="px-4 py-2 rounded-xl text-crimson hover:bg-neutral-800 font-bold transition-all flex items-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Mobile App Control Center &rarr;
            </Link>
          )}
          {canManageDesktop && (
            <button
              onClick={() => setAdminTab("DESKTOP_LICENSES")}
              className={`px-4 py-2 rounded-xl transition-all ${
                adminTab === "DESKTOP_LICENSES"
                  ? "bg-neutral-800 text-white font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Desktop Licenses & Devices ({allLicenses.length})
            </button>
          )}
          {canManageAI && (
            <button
              onClick={() => setAdminTab("AI_ENTITLEMENTS")}
              className={`px-4 py-2 rounded-xl transition-all ${
                adminTab === "AI_ENTITLEMENTS"
                  ? "bg-neutral-800 text-white font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              AI Model Entitlements
            </button>
          )}
        </div>

        {/* TAB 1: MY APP ACCESS */}
        {adminTab === "MY_APPS" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CodeXa Mobile Card */}
            <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-6 flex flex-col justify-between shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-crimson/15 border border-crimson/30 flex items-center justify-center text-bright-red">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono uppercase tracking-widest font-bold">
                    Status: {mobileConfig?.platformStatus || "ACTIVE"}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-orbitron font-bold text-white">
                    CodeXa Mobile
                  </h3>
                  <p className="text-xs font-mono text-neutral-400">
                    Daily Workspace for Employees & Interns &bull; Version: {mobileConfig?.currentVersion || "1.0.0"}
                  </p>
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                  Daily workspace for marking attendance, checking direct messages, viewing assigned projects, and accessing documents.
                </p>

                <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Attendance:</span>
                    <span className={mobileConfig?.attendanceEnabled ? "text-emerald-400" : "text-red-400"}>
                      {mobileConfig?.attendanceEnabled ? "Supported" : "Disabled"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Fleet Control Status:</span>
                    <span className="text-purple-400 font-bold">Configuration Ready</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-800 space-y-3">
                {canManageMobileApp && (
                  <Link
                    href="/dashboard/apps/mobile"
                    className="w-full py-3 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-crimson/25 transition-all"
                  >
                    <Smartphone className="w-4 h-4" /> MANAGE MOBILE APP
                  </Link>
                )}

                {mobileConfig?.downloadUrl ? (
                  <a
                    href={mobileConfig.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all border border-neutral-700"
                  >
                    <Download className="w-4 h-4 text-emerald-400" /> Download Mobile APK
                  </a>
                ) : (
                  <div className="w-full py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-500 text-xs font-mono uppercase tracking-wider text-center">
                    Android App: Coming Soon
                  </div>
                )}
              </div>
            </div>

            {/* CodeXa AI Desktop Card */}
            <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-6 flex flex-col justify-between shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Monitor className="w-6 h-6" />
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest font-bold ${
                      myLicense?.status === "ACTIVE"
                        ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                        : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                    }`}
                  >
                    {myLicense ? `License ${myLicense.status}` : "License Not Assigned"}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-orbitron font-bold text-white">
                    CodeXa AI Desktop
                  </h3>
                  <p className="text-xs font-mono text-neutral-400">
                    Platform: Windows x64 &bull; Autonomous Developer Suite
                  </p>
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                  Workstation environment providing token-budgeted AI coding models, deep research agents, and automated software analysis.
                </p>

                <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Key Prefix:</span>
                    <span className="text-purple-400 font-bold">
                      {myLicense?.keyDisplayPrefix || "Contact Leadership"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Allowed Devices:</span>
                    <span className="text-white">{myLicense?.deviceLimit || 2} Active PCs</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-800">
                <a
                  href="/apps"
                  className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-orbitron font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all border border-neutral-700"
                >
                  <Download className="w-4 h-4 text-purple-400" /> Desktop Download & Specifications
                </a>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REMOTE MOBILE APP CONFIGURATION */}
        {adminTab === "MOBILE_CONFIG" && mobileConfig && (
          <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-8">
            <div className="border-b border-neutral-800 pb-4">
              <h3 className="text-base font-orbitron font-bold text-white uppercase">
                Remote Mobile App Feature Toggles
              </h3>
              <p className="text-xs font-mono text-neutral-400">
                Instantly control mobile client availability across the organization
              </p>
            </div>

            {/* Feature Switches Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Mobile Attendance</span>
                  <span className="text-[10px] text-neutral-500">Allow marking in active window</span>
                </div>
                <input
                  type="checkbox"
                  checked={mobileConfig.attendanceEnabled}
                  onChange={(e) => handleUpdateMobileConfig({ attendanceEnabled: e.target.checked })}
                  className="w-5 h-5 accent-crimson cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Direct Messages (DMs)</span>
                  <span className="text-[10px] text-neutral-500">Mobile team messaging</span>
                </div>
                <input
                  type="checkbox"
                  checked={mobileConfig.dmEnabled}
                  onChange={(e) => handleUpdateMobileConfig({ dmEnabled: e.target.checked })}
                  className="w-5 h-5 accent-crimson cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Team Feed & Posts</span>
                  <span className="text-[10px] text-neutral-500">Internal social sharing</span>
                </div>
                <input
                  type="checkbox"
                  checked={mobileConfig.postsEnabled}
                  onChange={(e) => handleUpdateMobileConfig({ postsEnabled: e.target.checked })}
                  className="w-5 h-5 accent-crimson cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Feed Comments</span>
                  <span className="text-[10px] text-neutral-500">Post interactions</span>
                </div>
                <input
                  type="checkbox"
                  checked={mobileConfig.commentsEnabled}
                  onChange={(e) => handleUpdateMobileConfig({ commentsEnabled: e.target.checked })}
                  className="w-5 h-5 accent-crimson cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Push Notifications</span>
                  <span className="text-[10px] text-neutral-500">FCM background delivery</span>
                </div>
                <input
                  type="checkbox"
                  checked={mobileConfig.pushEnabled}
                  onChange={(e) => handleUpdateMobileConfig({ pushEnabled: e.target.checked })}
                  className="w-5 h-5 accent-crimson cursor-pointer"
                />
              </div>
            </div>

            {/* Role-to-Role DM Matrix (Section 19 & 38) */}
            <div className="space-y-4 pt-4 border-t border-neutral-800">
              <h4 className="text-sm font-orbitron font-bold text-white uppercase">
                Role-to-Role DM Permission Matrix
              </h4>
              <p className="text-xs font-mono text-neutral-400">
                Configure which roles are allowed to initiate direct chats in the mobile app
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                {Object.entries(mobileConfig.dmRoleMatrix || {}).map(([key, val]) => (
                  <div
                    key={key}
                    className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between"
                  >
                    <span className="text-neutral-300">{key.replace(/_/g, " ")}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(val)}
                      onChange={(e) => {
                        const updatedMatrix = { ...mobileConfig.dmRoleMatrix, [key]: e.target.checked };
                        handleUpdateMobileConfig({ dmRoleMatrix: updatedMatrix });
                      }}
                      className="w-4 h-4 accent-crimson cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DESKTOP LICENSING & DEVICE MANAGEMENT */}
        {adminTab === "DESKTOP_LICENSES" && (
          <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
              <div>
                <h3 className="text-base font-orbitron font-bold text-white uppercase">
                  CodeXa AI Desktop Licenses
                </h3>
                <p className="text-xs font-mono text-neutral-400">
                  Generate cryptographic CXA-DESK keys and monitor hardware device bindings
                </p>
              </div>

              <button
                onClick={() => {
                  setOneTimeRevealedKey(null);
                  setGenerateModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-crimson/25 transition-all self-start sm:self-auto"
              >
                <Key className="w-3.5 h-3.5" /> Provision New License
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-neutral-950/80 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
                  <tr>
                    <th className="p-3">Staff Member</th>
                    <th className="p-3">License Prefix</th>
                    <th className="p-3">Device Limit</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Issued Date</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {allLicenses.map((lic) => (
                    <tr key={lic.id} className="hover:bg-neutral-800/30">
                      <td className="p-3 font-bold text-white">
                        {lic.user?.displayName || "Member"} (@{lic.user?.username || "user"})
                      </td>
                      <td className="p-3 text-purple-400 font-bold">{lic.keyDisplayPrefix}</td>
                      <td className="p-3 text-neutral-300">{lic.deviceLimit} PCs</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            lic.status === "ACTIVE"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-red-500/15 text-red-400"
                          }`}
                        >
                          {lic.status}
                        </span>
                      </td>
                      <td className="p-3 text-neutral-400">
                        {new Date(lic.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleResetDevices(lic.id)}
                            className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] text-neutral-300 transition-all"
                            title="Reset Active Hardware Activations"
                          >
                            Reset Devices
                          </button>
                          {lic.status === "ACTIVE" && (
                            <button
                              onClick={() => handleRevokeLicense(lic.id)}
                              className="px-2.5 py-1 rounded bg-red-600/20 text-red-300 hover:bg-red-600/40 text-[10px] font-bold transition-all"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: AI MODEL ENTITLEMENTS */}
        {adminTab === "AI_ENTITLEMENTS" && (
          <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
            <div className="border-b border-neutral-800 pb-4">
              <h3 className="text-base font-orbitron font-bold text-white uppercase">
                AI Model Quotas & User Allocations
              </h3>
              <p className="text-xs font-mono text-neutral-400">
                Configure user-specific limits for Coding, Research, and Document AI models
              </p>
            </div>

            <form onSubmit={handleSaveEntitlement} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1">
                  Select User
                </label>
                <select
                  required
                  value={entitlementUserId}
                  onChange={(e) => setEntitlementUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs focus:outline-none focus:border-crimson"
                >
                  <option value="">Choose User...</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} (@{u.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1">
                  Model Family
                </label>
                <select
                  value={entitlementModel}
                  onChange={(e) => setEntitlementModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs"
                >
                  <option value="Coding AI">Coding AI (Core Engineer)</option>
                  <option value="Research Agent">Deep Research Agent</option>
                  <option value="Document AI">Document & Resume AI</option>
                  <option value="Business AI">Executive & Business AI</option>
                  <option value="Architecture AI">System Architecture AI</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1">
                  Daily Requests
                </label>
                <input
                  type="number"
                  value={entitlementDaily}
                  onChange={(e) => setEntitlementDaily(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all shadow-lg shadow-crimson/25"
                >
                  Save Quota
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* GENERATE LICENSE MODAL (WITH ONE-TIME REVEAL) */}
      {generateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-neutral-900 border border-neutral-800 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <h3 className="text-base font-orbitron font-bold text-white uppercase">
                Provision Desktop License
              </h3>
              <button
                onClick={() => setGenerateModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {oneTimeRevealedKey ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-sans leading-relaxed">
                  <span className="font-bold block text-white font-orbitron uppercase mb-1">
                    One-Time Activation Key Reveal
                  </span>
                  Please copy this key immediately and share it securely with the member. For security, only the cryptographic hash is saved in our database and the plaintext key will never be shown again.
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-sm text-center font-bold text-white flex items-center justify-between">
                  <span className="tracking-widest text-bright-red">{oneTimeRevealedKey}</span>
                  <button
                    onClick={() => copyToClipboard(oneTimeRevealedKey)}
                    className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  onClick={() => setGenerateModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs uppercase"
                >
                  Done & Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleGenerateLicense} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Assignee Member
                  </label>
                  <select
                    required
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs focus:outline-none focus:border-crimson"
                  >
                    <option value="">Select Member...</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName} (@{u.username})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Maximum Device Limit
                  </label>
                  <select
                    value={deviceLimit}
                    onChange={(e) => setDeviceLimit(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs"
                  >
                    <option value="1">1 Hardware Device</option>
                    <option value="2">2 Hardware Devices (Standard)</option>
                    <option value="3">3 Hardware Devices</option>
                    <option value="5">5 Hardware Devices (Leadership)</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setGenerateModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-neutral-800 text-xs font-mono text-neutral-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generatingLicense}
                    className="px-5 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase transition-all shadow-lg shadow-crimson/25"
                  >
                    {generatingLicense ? "Generating..." : "Generate Key"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </TeamCoreShell>
  );
}
