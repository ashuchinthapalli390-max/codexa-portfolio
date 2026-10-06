"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function MandatoryPasswordChangeModal() {
  const { user, refreshSession } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // If user does not require mandatory password change, do not render
  if (!user || !user.mustChangePassword) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword || newPassword.length < 8) {
      setError("Your new password must be at least 8 characters long.");
      return;
    }

    if (newPassword === "Codexa123") {
      setError("Your new password cannot be the temporary default password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/settings/security/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: "Codexa123",
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to update password. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(async () => {
        await refreshSession();
      }, 1000);
    } catch (err: any) {
      setError("Network error while updating password. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[#090909] border border-crimson/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(217,4,41,0.25)] relative overflow-hidden"
      >
        {/* Glowing cyber accents */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-crimson to-transparent" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-crimson/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-deep-red/20 border border-crimson/40 flex items-center justify-center text-bright-red shadow-[0_0_15px_rgba(217,4,41,0.3)]">
            <Lock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-orbitron font-bold uppercase tracking-[0.25em] text-bright-red">
              Security Protocol &bull; First Login
            </span>
            <h2 className="font-orbitron font-black text-lg text-white tracking-wide">
              CREATE PERMANENT PASSWORD
            </h2>
          </div>
        </div>

        <p className="text-xs text-[#888] leading-relaxed mb-6">
          Welcome to the CodeXa Core, <span className="text-white font-semibold">{user.displayName}</span>. You are signed in using an initial temporary password. You must set a permanent secure password before accessing the system.
        </p>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-deep-red/20 border border-crimson/40 flex items-center gap-2.5 text-xs text-bright-red">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-green-500/30 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto animate-bounce" />
            <h3 className="font-orbitron font-bold text-sm text-white">PASSWORD ESTABLISHED</h3>
            <p className="text-xs text-[#888]">Your permanent password is encrypted and saved. Entering workspace...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-orbitron uppercase text-[#888] tracking-widest mb-1.5">
                New Permanent Password (Min. 8 characters)
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  minLength={8}
                  className="w-full bg-[#121212] border border-crimson/25 focus:border-bright-red rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#444] outline-none transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-white"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-orbitron uppercase text-[#888] tracking-widest mb-1.5">
                Confirm Permanent Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  minLength={8}
                  className="w-full bg-[#121212] border border-crimson/25 focus:border-bright-red rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#444] outline-none transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-white"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3 rounded-xl bg-crimson hover:bg-bright-red disabled:opacity-50 text-white font-orbitron font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(217,4,41,0.3)] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Encrypting & Securing...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Establish Secure Password</span>
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
