"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, X, Shield, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getAllowedRolesToCreate, getRoleDisplayName, OrgRole } from "@/lib/permissions";

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountCreated?: (account: any) => void;
}

export function CreateAccountModal({ isOpen, onClose, onAccountCreated }: CreateAccountModalProps) {
  const { user } = useAuth();
  const allowedRoles = getAllowedRolesToCreate(user);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<OrgRole>(allowedRoles[0] || "EMPLOYEE");
  const [department, setDepartment] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("Codexa123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  if (allowedRoles.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-[#090909] border border-crimson/30 rounded-3xl p-6 max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-bright-red mx-auto" />
          <h3 className="font-orbitron font-bold text-white text-base">UNAUTHORIZED</h3>
          <p className="text-xs text-[#888]">Your organizational role does not possess account provisioning authorization.</p>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-[#141414] hover:bg-[#202020] text-xs font-orbitron text-white uppercase"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!fullName.trim() || !email.trim() || !username.trim()) {
      setError("Please fill out all required fields.");
      return;
    }

    if (temporaryPassword.length < 8) {
      setError("Temporary password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/owner/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          username: username.trim().toLowerCase(),
          role,
          department: department.trim() || undefined,
          temporaryPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to create account.");
        setLoading(false);
        return;
      }

      setSuccessMessage(`Account @${data.account.username} (${role}) provisioned successfully.`);
      if (onAccountCreated) onAccountCreated(data.account);

      setTimeout(() => {
        setFullName("");
        setEmail("");
        setUsername("");
        setDepartment("");
        setTemporaryPassword("Codexa123");
        setSuccessMessage(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError("Network error while provisioning account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-[#0A0A0A] border border-crimson/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(217,4,41,0.2)] relative overflow-hidden"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-[#141414] hover:bg-deep-red/20 text-[#888] hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-deep-red/20 border border-crimson/40 flex items-center justify-center text-bright-red">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-orbitron font-bold uppercase tracking-[0.2em] text-bright-red">
              Internal Identity Provisioning
            </span>
            <h2 className="font-orbitron font-black text-base text-white tracking-wide">
              PROVISION CREW ACCOUNT
            </h2>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-deep-red/20 border border-crimson/40 flex items-center gap-2.5 text-xs text-bright-red">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage ? (
          <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-green-500/30 text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto" />
            <h3 className="font-orbitron font-bold text-sm text-white">{successMessage}</h3>
            <p className="text-xs text-[#888]">Temporary credentials saved. Must Change Password flag is active.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-orbitron uppercase text-[#888] tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-[#121212] border border-crimson/25 focus:border-bright-red rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#555] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-orbitron uppercase text-[#888] tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@codxa-agency.online"
                  className="w-full bg-[#121212] border border-crimson/25 focus:border-bright-red rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#555] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-orbitron uppercase text-[#888] tracking-wider mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="johndoe"
                  className="w-full bg-[#121212] border border-crimson/25 focus:border-bright-red rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#555] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-orbitron uppercase text-[#888] tracking-wider mb-1">
                  Organizational Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as OrgRole)}
                  className="w-full bg-[#121212] border border-crimson/25 focus:border-bright-red rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                >
                  {allowedRoles.map((r) => (
                    <option key={r} value={r} className="bg-[#121212] text-white">
                      {getRoleDisplayName(r)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-orbitron uppercase text-[#888] tracking-wider mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Engineering, AI Labs"
                  className="w-full bg-[#121212] border border-crimson/25 focus:border-bright-red rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#555] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-orbitron uppercase text-[#888] tracking-wider mb-1">
                  Temporary Password *
                </label>
                <input
                  type="text"
                  required
                  value={temporaryPassword}
                  onChange={(e) => setTemporaryPassword(e.target.value)}
                  className="w-full bg-[#121212] border border-crimson/25 focus:border-bright-red rounded-xl px-3.5 py-2 text-xs font-mono text-bright-red placeholder-[#555] outline-none"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#121212] border border-white/5 text-[11px] text-[#777] flex items-center justify-between">
              <span>Account Status: <strong className="text-white">Active</strong></span>
              <span>Must Change Password: <strong className="text-bright-red">Required</strong></span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#141414] hover:bg-[#202020] text-xs font-orbitron text-[#888] hover:text-white uppercase transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-crimson hover:bg-bright-red disabled:opacity-50 text-xs font-orbitron font-bold text-white uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)] flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                <span>Provision Identity</span>
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
