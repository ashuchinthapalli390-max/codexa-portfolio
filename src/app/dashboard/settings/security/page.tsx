"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Key,
  Smartphone,
  QrCode,
  Copy,
  Check,
  Download,
  RefreshCw,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  X,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  LogOut
} from "lucide-react";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { modalDialogVariants, buttonHoverVariants, errorShakeVariants } from "@/lib/motion";

export default function SecuritySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [remainingBackupCodes, setRemainingBackupCodes] = useState(0);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Active sessions state
  const [revokeAllLoading, setRevokeAllLoading] = useState(false);
  const [revokeFeedback, setRevokeFeedback] = useState<string | null>(null);

  // 2FA Setup Modal state
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [setupStep, setSetupStep] = useState<"qr" | "verify" | "codes">("qr");
  const [setupSecret, setSetupSecret] = useState("");
  const [setupQrDataUrl, setSetupQrDataUrl] = useState("");
  const [setupTotpDigits, setSetupTotpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [setupBackupCodes, setSetupBackupCodes] = useState<string[]>([]);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Disable 2FA Modal state
  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState("");

  // Regenerate Backup Codes Modal state
  const [regenModalOpen, setRegenModalOpen] = useState(false);
  const [regenPassword, setRegenPassword] = useState("");
  const [regenTotp, setRegenTotp] = useState("");
  const [newRegenCodes, setNewRegenCodes] = useState<string[]>([]);
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenError, setRegenError] = useState("");

  // Load 2FA status
  const loadSecurityStatus = () => {
    setLoading(true);
    fetch("/api/settings/security/2fa/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setTwoFactorEnabled(!!data.enabled);
          setVerifiedAt(data.verifiedAt || null);
          setRemainingBackupCodes(data.remainingBackupCodes || 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSecurityStatus();
  }, []);

  // ── 1. Handle Password Update ──────────────────────────────────────────────
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: "error", msg: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordFeedback({ type: "error", msg: "Password must be at least 8 characters long." });
      return;
    }

    setPasswordLoading(true);
    setPasswordFeedback(null);

    try {
      const res = await fetch("/api/settings/security/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordFeedback({ type: "success", msg: "Your password was updated successfully." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordFeedback({ type: "error", msg: data.error || "Failed to update password." });
      }
    } catch {
      setPasswordFeedback({ type: "error", msg: "Network error updating password." });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    if (!confirm("Are you sure you want to log out of all devices? You will be signed out immediately.")) return;
    setRevokeAllLoading(true);
    setRevokeFeedback(null);
    try {
      const res = await fetch("/api/auth/logout-all", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setRevokeFeedback("All sessions revoked. Redirecting to login...");
        setTimeout(() => {
          window.location.href = "/login";
        }, 800);
      } else {
        setRevokeFeedback(data.error || "Failed to revoke sessions.");
      }
    } catch {
      setRevokeFeedback("Network error connecting to security server.");
    } finally {
      setRevokeAllLoading(false);
    }
  };

  // ── 2. Handle 2FA Setup Initiation ─────────────────────────────────────────
  const startTwoFactorSetup = async () => {
    setSetupModalOpen(true);
    setSetupStep("qr");
    setSetupLoading(true);
    setSetupError("");
    setSetupTotpDigits(["", "", "", "", "", ""]);

    try {
      const res = await fetch("/api/settings/security/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setSetupSecret(data.secret);
        setSetupQrDataUrl(data.qrCodeDataUrl);
      } else {
        setSetupError(data.error || "Failed to generate 2FA key.");
      }
    } catch {
      setSetupError("Network error initializing 2FA setup.");
    } finally {
      setSetupLoading(false);
    }
  };

  const handleVerifySetupTotp = async () => {
    const fullOtp = setupTotpDigits.join("");
    if (fullOtp.length !== 6) {
      setSetupError("Please enter the 6-digit code from your authenticator app.");
      return;
    }

    setSetupLoading(true);
    setSetupError("");

    try {
      const res = await fetch("/api/settings/security/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: setupSecret, totpCode: fullOtp }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSetupBackupCodes(data.backupCodes || []);
        setSetupStep("codes");
        setTwoFactorEnabled(true);
        loadSecurityStatus();
      } else {
        setSetupError(data.error || "Invalid code. Please check your authenticator clock.");
      }
    } catch {
      setSetupError("Network error enabling 2FA.");
    } finally {
      setSetupLoading(false);
    }
  };

  // ── 3. Handle Disable 2FA ──────────────────────────────────────────────────
  const handleDisableTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword || !disableCode) {
      setDisableError("Password and verification code are required.");
      return;
    }

    setDisableLoading(true);
    setDisableError("");

    try {
      const payload: any = { password: disablePassword };
      if (disableCode.startsWith("CXA-")) {
        payload.backupCode = disableCode;
      } else {
        payload.totpCode = disableCode;
      }

      const res = await fetch("/api/settings/security/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDisableModalOpen(false);
        setTwoFactorEnabled(false);
        setDisablePassword("");
        setDisableCode("");
        loadSecurityStatus();
      } else {
        setDisableError(data.error || "Failed to disable 2FA.");
      }
    } catch {
      setDisableError("Network error disabling 2FA.");
    } finally {
      setDisableLoading(false);
    }
  };

  // ── 4. Handle Regenerate Backup Codes ──────────────────────────────────────
  const handleRegenerateBackupCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegenLoading(true);
    setRegenError("");

    try {
      const res = await fetch("/api/settings/security/2fa/backup-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: regenPassword, totpCode: regenTotp }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNewRegenCodes(data.backupCodes || []);
        loadSecurityStatus();
      } else {
        setRegenError(data.error || "Failed to regenerate backup codes.");
      }
    } catch {
      setRegenError("Network error regenerating codes.");
    } finally {
      setRegenLoading(false);
    }
  };

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadBackupCodes = (codes: string[]) => {
    const text = `CODEXA AGENCY — TWO-FACTOR BACKUP CODES\nGenerated: ${new Date().toISOString()}\n\nKeep these single-use recovery codes in a secure location.\n\n${codes.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\nEach code can only be used once.`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `codexa-backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <TeamCoreShell
      title="Security & Two-Factor Authentication"
      subtitle="Manage your credentials, authenticator app, and recovery codes."
    >
      <div className="max-w-4xl space-y-8">
        
        {/* ─── 1. SHIELD STATUS OVERVIEW CARD ───────────────────────────────── */}
        <div className="relative rounded-3xl p-6 sm:p-8 bg-[#090909] border border-crimson/25 overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-crimson/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border flex-shrink-0 ${
                twoFactorEnabled
                  ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                  : "bg-deep-red/20 border-crimson/30 text-bright-red"
              }`}>
                {twoFactorEnabled ? <ShieldCheck className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-[#888]">
                  SHIELD STATUS
                </span>
                <h3 className="font-orbitron font-black text-xl sm:text-2xl text-white uppercase">
                  {twoFactorEnabled ? "Two-Factor Protected" : "Standard Protection"}
                </h3>
                <p className="text-xs text-[#AAA] max-w-md leading-relaxed">
                  {twoFactorEnabled
                    ? `Your account requires a 6-digit Authenticator App code or single-use backup code during login and recovery.`
                    : "Add an extra layer of defense by linking Google Authenticator, Microsoft Authenticator, 1Password, or Bitwarden."}
                </p>
              </div>
            </div>

            <div>
              {twoFactorEnabled ? (
                <button
                  onClick={() => setDisableModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#151515] hover:bg-deep-red/30 border border-crimson/40 text-bright-red text-xs font-orbitron font-bold uppercase tracking-wider transition-all"
                >
                  Disable 2FA
                </button>
              ) : (
                <button
                  onClick={startTwoFactorSetup}
                  className="px-6 py-3 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(217,4,41,0.4)] flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Enable 2FA
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── 2. TWO-FACTOR & BACKUP CODES MANAGEMENT ──────────────────────── */}
        {twoFactorEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Authenticator App Info Card */}
            <div className="p-6 rounded-2xl bg-[#090909] border border-crimson/20 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                  <h4 className="font-orbitron font-bold text-sm text-white uppercase">Authenticator App</h4>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-[#888] leading-relaxed">
                TOTP Time-based One-Time Password protocol verified. Works offline with any RFC 6238 authenticator app.
              </p>
              <div className="pt-2 text-[11px] text-[#666] font-mono">
                Linked: {verifiedAt ? new Date(verifiedAt).toLocaleDateString() : "Active"}
              </div>
            </div>

            {/* Single-Use Backup Codes Card */}
            <div className="p-6 rounded-2xl bg-[#090909] border border-crimson/20 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Key className="w-5 h-5 text-bright-red" />
                    <h4 className="font-orbitron font-bold text-sm text-white uppercase">Backup Codes</h4>
                  </div>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                    remainingBackupCodes <= 2
                      ? "text-red-400 bg-red-500/10 border-red-500/30"
                      : "text-white bg-[#151515] border-white/10"
                  }`}>
                    {remainingBackupCodes} of 10 Remaining
                  </span>
                </div>
                <p className="text-xs text-[#888] leading-relaxed">
                  Single-use recovery codes to access your account if you ever lose your phone or authenticator app.
                </p>
              </div>

              <button
                onClick={() => {
                  setRegenModalOpen(true);
                  setNewRegenCodes([]);
                  setRegenPassword("");
                  setRegenTotp("");
                  setRegenError("");
                }}
                className="w-full py-2.5 rounded-xl bg-[#141414] hover:bg-deep-red/20 border border-crimson/30 text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5 text-bright-red" /> Regenerate 10 Codes
              </button>
            </div>

          </div>
        )}

        {/* ─── 3. CHANGE PASSWORD CARD ──────────────────────────────────────── */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#090909] border border-crimson/20 space-y-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Lock className="w-5 h-5 text-bright-red" />
              <h3 className="font-orbitron font-bold text-lg text-white uppercase">Change Account Password</h3>
            </div>
            <p className="text-xs text-[#888] font-light">
              Choose a strong password with at least 8 characters. You will receive an email confirmation upon change.
            </p>
          </div>

          {passwordFeedback && (
            <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
              passwordFeedback.type === "success"
                ? "bg-emerald-950/30 border border-emerald-500/40 text-emerald-400"
                : "bg-deep-red/25 border border-bright-red/60 text-bright-red"
            }`}>
              {passwordFeedback.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{passwordFeedback.msg}</span>
            </div>
          )}

          <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-lg">
            <div>
              <label className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-[#999] block mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-[#121212] border border-crimson/25 focus:border-bright-red text-white text-xs font-mono outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#555] hover:text-white"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-[#999] block mb-1.5">
                New Password (Min 8 Characters)
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-[#121212] border border-crimson/25 focus:border-bright-red text-white text-xs font-mono outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#555] hover:text-white"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-[#999] block mb-1.5">
                Confirm New Password
              </label>
              <input
                type={showNewPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 rounded-xl bg-[#121212] border border-crimson/25 focus:border-bright-red text-white text-xs font-mono outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="px-6 py-3 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg"
            >
              {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save New Password"}
            </button>
          </form>
        </div>

        {/* ─── 4. ACTIVE SESSIONS & DEVICE SECURITY ─────────────────────────── */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#090909] border border-crimson/20 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-orbitron font-bold text-lg text-white uppercase">Active Sessions & Device Security</h3>
              </div>
              <p className="text-xs text-[#888] font-light">
                Manage your persistent authenticated devices. Sessions remain securely active for 30 days unless explicitly revoked.
              </p>
            </div>

            <button
              onClick={handleLogoutAllDevices}
              disabled={revokeAllLoading}
              className="px-5 py-2.5 rounded-xl bg-[#141414] hover:bg-deep-red/30 border border-crimson/40 text-bright-red hover:text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all flex items-center gap-2"
            >
              {revokeAllLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              <span>Log Out All Devices</span>
            </button>
          </div>

          {revokeFeedback && (
            <div className="p-3.5 rounded-xl text-xs flex items-center gap-2 bg-deep-red/25 border border-bright-red/60 text-bright-red">
              <AlertCircle className="w-4 h-4" />
              <span>{revokeFeedback}</span>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-[#0E0E0E] border border-white/5 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-orbitron text-xs font-bold text-white uppercase">Current Browser / Trusted Device</span>
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.2 rounded border border-emerald-500/30">
                  PERSISTENT SESSION
                </span>
              </div>
              <p className="text-[11px] text-[#666] font-mono">
                Lifetime: 30 Days (Rolling Renewal Active) &bull; Verified via HttpOnly Cookie
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ─── MODAL: 2FA ACTIVATION WIZARD ─────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {setupModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              variants={modalDialogVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-lg rounded-3xl bg-[#0B0B0B] border border-crimson/30 p-6 sm:p-8 space-y-6 relative overflow-hidden shadow-[0_0_60px_rgba(217,4,41,0.2)]"
            >
              <button
                onClick={() => setSetupModalOpen(false)}
                className="absolute top-6 right-6 text-[#777] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Step 1: Scan QR Code */}
              {setupStep === "qr" && (
                <div className="space-y-5 text-center">
                  <span className="text-[9px] font-orbitron font-bold tracking-[0.3em] text-bright-red uppercase bg-deep-red/20 px-3 py-1 rounded-full border border-crimson/30">
                    STEP 1 OF 2 &bull; LINK APP
                  </span>
                  <h3 className="font-orbitron font-black text-xl text-white uppercase">
                    Scan Authenticator QR
                  </h3>
                  <p className="text-xs text-[#888] font-light max-w-sm mx-auto">
                    Open Google Authenticator, Microsoft Authenticator, or Bitwarden and scan the QR code below.
                  </p>

                  {setupLoading ? (
                    <div className="h-48 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-bright-red" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {setupQrDataUrl && (
                        <div className="relative inline-block p-3 rounded-2xl bg-white shadow-2xl overflow-hidden">
                          <img src={setupQrDataUrl} alt="2FA QR Code" className="w-48 h-48 mx-auto" />
                          <div className="absolute inset-x-0 h-1 bg-crimson/80 animate-[scanner_2s_ease-in-out_infinite]" />
                        </div>
                      )}

                      {/* Manual Setup Key */}
                      <div className="p-3 rounded-xl bg-[#141414] border border-white/5 flex items-center justify-between gap-3 text-left">
                        <div className="truncate">
                          <span className="text-[9px] font-orbitron text-[#666] uppercase block">Manual Setup Key</span>
                          <span className="font-mono text-xs text-bright-red tracking-wider select-all">{setupSecret}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(setupSecret, setCopiedKey)}
                          className="px-3 py-1.5 rounded-lg bg-[#202020] hover:bg-crimson text-white text-[10px] font-orbitron font-bold uppercase transition-colors flex items-center gap-1.5"
                        >
                          {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedKey ? "COPIED" : "COPY"}
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setSetupStep("verify")}
                    className="w-full py-3.5 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all"
                  >
                    CONTINUE TO VERIFY &rarr;
                  </button>
                </div>
              )}

              {/* Step 2: Verify First 6-Digit Code */}
              {setupStep === "verify" && (
                <div className="space-y-5 text-center">
                  <span className="text-[9px] font-orbitron font-bold tracking-[0.3em] text-bright-red uppercase bg-deep-red/20 px-3 py-1 rounded-full border border-crimson/30">
                    STEP 2 OF 2 &bull; CONFIRM CODE
                  </span>
                  <h3 className="font-orbitron font-black text-xl text-white uppercase">
                    Enter Authenticator Code
                  </h3>
                  <p className="text-xs text-[#888] font-light max-w-sm mx-auto">
                    Enter the 6-digit code currently shown in your authenticator app to activate 2FA.
                  </p>

                  {setupError && (
                    <div className="p-3 rounded-xl bg-deep-red/25 border border-bright-red/60 text-xs text-bright-red flex items-center justify-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{setupError}</span>
                    </div>
                  )}

                  <div className="flex justify-between gap-2 sm:gap-3 my-4">
                    {setupTotpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          const newDigits = [...setupTotpDigits];
                          newDigits[idx] = val;
                          setSetupTotpDigits(newDigits);
                        }}
                        className="flex-1 h-14 text-center font-mono text-xl font-black rounded-xl bg-[#121212] border border-crimson/30 focus:border-bright-red text-white outline-none"
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifySetupTotp}
                    disabled={setupLoading}
                    className="w-full py-4 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    {setupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "ACTIVATE 2FA"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSetupStep("qr")}
                    className="text-[10px] font-orbitron text-[#666] hover:text-white uppercase tracking-wider"
                  >
                    &larr; Back to QR Code
                  </button>
                </div>
              )}

              {/* Step 3: Display 10 Backup Codes */}
              {setupStep === "codes" && (
                <div className="space-y-5 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-orbitron font-black text-xl text-white uppercase">2FA Enabled!</h3>
                    <p className="text-xs text-[#888] font-light mt-1">
                      Save these 10 single-use recovery backup codes in a safe place.
                    </p>
                  </div>

                  {/* 10 Backup codes 2-column grid */}
                  <div className="grid grid-cols-2 gap-2 p-4 rounded-2xl bg-[#060606] border border-white/10 font-mono text-xs text-bright-red font-bold select-all">
                    {setupBackupCodes.map((code, idx) => (
                      <div key={idx} className="p-2 rounded bg-[#111] border border-white/5 text-center">
                        {code}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(setupBackupCodes.join("\n"), setCopiedCodes)}
                      className="flex-1 py-3 rounded-xl bg-[#151515] hover:bg-deep-red/20 border border-crimson/30 text-white text-xs font-orbitron font-bold uppercase transition-colors flex items-center justify-center gap-2"
                    >
                      {copiedCodes ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {copiedCodes ? "Copied" : "Copy Codes"}
                    </button>

                    <button
                      type="button"
                      onClick={() => downloadBackupCodes(setupBackupCodes)}
                      className="flex-1 py-3 rounded-xl bg-[#151515] hover:bg-deep-red/20 border border-crimson/30 text-white text-xs font-orbitron font-bold uppercase transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4 text-bright-red" /> Download .txt
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSetupModalOpen(false)}
                    className="w-full py-3.5 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-black uppercase tracking-wider"
                  >
                    I HAVE SAVED MY CODES &bull; DONE
                  </button>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ─── MODAL: DISABLE 2FA ───────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {disableModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              variants={modalDialogVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-md rounded-3xl bg-[#0B0B0B] border border-crimson/30 p-6 sm:p-8 space-y-5 relative shadow-2xl"
            >
              <button
                onClick={() => setDisableModalOpen(false)}
                className="absolute top-6 right-6 text-[#777] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <h3 className="font-orbitron font-bold text-lg text-white uppercase">Disable 2FA Protection</h3>
                <p className="text-xs text-[#888] font-light mt-1 leading-relaxed">
                  To confirm deactivation, verify your current password and an authenticator or backup code.
                </p>
              </div>

              {disableError && (
                <div className="p-3 rounded-xl bg-deep-red/25 border border-bright-red/60 text-xs text-bright-red">
                  {disableError}
                </div>
              )}

              <form onSubmit={handleDisableTwoFactor} className="space-y-4">
                <div>
                  <label className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-[#999] block mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-3 rounded-xl bg-[#121212] border border-crimson/25 focus:border-bright-red text-white text-xs font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-[#999] block mb-1">
                    6-Digit Code or Backup Code
                  </label>
                  <input
                    type="text"
                    required
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.trim())}
                    placeholder="123456 or CXA-XXXX-XXXX"
                    className="w-full px-4 py-3 rounded-xl bg-[#121212] border border-crimson/25 focus:border-bright-red text-white text-xs font-mono outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={disableLoading}
                  className="w-full py-3.5 rounded-xl bg-red-700 hover:bg-red-600 text-white text-xs font-orbitron font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  {disableLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "CONFIRM & DISABLE 2FA"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ─── MODAL: REGENERATE BACKUP CODES ───────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {regenModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              variants={modalDialogVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-md rounded-3xl bg-[#0B0B0B] border border-crimson/30 p-6 sm:p-8 space-y-5 relative shadow-2xl"
            >
              <button
                onClick={() => setRegenModalOpen(false)}
                className="absolute top-6 right-6 text-[#777] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <h3 className="font-orbitron font-bold text-lg text-white uppercase">Regenerate Backup Codes</h3>
                <p className="text-xs text-[#888] font-light mt-1 leading-relaxed">
                  Generating new backup codes will immediately invalidate all previously issued recovery codes.
                </p>
              </div>

              {regenError && (
                <div className="p-3 rounded-xl bg-deep-red/25 border border-bright-red/60 text-xs text-bright-red">
                  {regenError}
                </div>
              )}

              {newRegenCodes.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#060606] border border-white/10 font-mono text-xs text-bright-red font-bold select-all">
                    {newRegenCodes.map((code, idx) => (
                      <div key={idx} className="p-1.5 rounded bg-[#111] text-center">{code}</div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(newRegenCodes.join("\n"), setCopiedCodes)}
                      className="flex-1 py-2.5 rounded-xl bg-[#151515] border border-crimson/30 text-white text-xs font-orbitron font-bold uppercase"
                    >
                      {copiedCodes ? "Copied" : "Copy Codes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadBackupCodes(newRegenCodes)}
                      className="flex-1 py-2.5 rounded-xl bg-[#151515] border border-crimson/30 text-white text-xs font-orbitron font-bold uppercase"
                    >
                      Download .txt
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setRegenModalOpen(false)}
                    className="w-full py-3 rounded-xl bg-crimson text-white text-xs font-orbitron font-bold uppercase"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegenerateBackupCodes} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-[#999] block mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={regenPassword}
                      onChange={(e) => setRegenPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-4 py-3 rounded-xl bg-[#121212] border border-crimson/25 focus:border-bright-red text-white text-xs font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-[#999] block mb-1">
                      Authenticator 6-Digit Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={regenTotp}
                      onChange={(e) => setRegenTotp(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="w-full px-4 py-3 rounded-xl bg-[#121212] border border-crimson/25 focus:border-bright-red text-white text-xs font-mono outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={regenLoading}
                    className="w-full py-3.5 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    {regenLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "GENERATE NEW SET OF 10 CODES"}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </TeamCoreShell>
  );
}
