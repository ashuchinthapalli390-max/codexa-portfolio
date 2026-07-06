"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AccessKey {
  id: string;
  label: string;
  role: string;
  isActive: boolean;
  maxUses: number | null;
  useCount: number;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string | null;
    email: string | null;
    fullName: string | null;
    role: string;
  };
}

interface TeamUser {
  id: string;
  username: string | null;
  email: string | null;
  fullName: string | null;
  role: string;
}

type UIModal = "create" | "reveal" | "revoke" | "regenerate" | null;

const ROLE_COLORS: Record<string, string> = {
  OWNER: "text-[#FF6B35] border-[#FF6B35]/30 bg-[#FF6B35]/5",
  ADMIN: "text-[#9B59B6] border-[#9B59B6]/30 bg-[#9B59B6]/5",
  TEAM_MEMBER: "text-[#4ECDC4] border-[#4ECDC4]/30 bg-[#4ECDC4]/5",
};

function Badge({ role }: { role: string }) {
  const cls = ROLE_COLORS[role] ?? "text-[#A5A5A5] border-[#333] bg-[#111]";
  return (
    <span className={`text-[9px] font-orbitron font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${cls}`}>
      {role.replace("_", " ")}
    </span>
  );
}

export default function AccessKeysPage() {
  const router = useRouter();

  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<UIModal>(null);
  const [selectedKey, setSelectedKey] = useState<AccessKey | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Create form state
  const [form, setForm] = useState({
    userId: "",
    label: "",
    role: "TEAM_MEMBER",
    maxUses: "",
    expiresAt: "",
  });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/owner/access-keys");
      if (res.status === 403) { router.replace("/login"); return; }
      const data = await res.json();
      if (data.success) setKeys(data.keys);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    loadKeys();
    loadUsers();
  }, [loadKeys, loadUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.userId || !form.label.trim()) {
      setFormError("User and label are required.");
      return;
    }
    setFormError("");
    setFormLoading(true);

    try {
      const res = await fetch("/api/owner/access-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: form.userId,
          label: form.label.trim(),
          role: form.role,
          maxUses: form.maxUses ? parseInt(form.maxUses) : null,
          expiresAt: form.expiresAt || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRevealedKey(data.rawKey);
        setModal("reveal");
        setForm({ userId: "", label: "", role: "TEAM_MEMBER", maxUses: "", expiresAt: "" });
        loadKeys();
      } else {
        setFormError(data.error ?? "Failed to create key.");
      }
    } catch {
      setFormError("Network error.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggle = async (key: AccessKey) => {
    try {
      await fetch(`/api/owner/access-keys/${key.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !key.isActive }),
      });
      loadKeys();
    } catch { /* ignore */ }
  };

  const handleRevoke = async () => {
    if (!selectedKey) return;
    try {
      await fetch(`/api/owner/access-keys/${selectedKey.id}`, { method: "DELETE" });
      setModal(null);
      setSelectedKey(null);
      loadKeys();
    } catch { /* ignore */ }
  };

  const handleRegenerate = async () => {
    if (!selectedKey) return;
    try {
      const res = await fetch(`/api/owner/access-keys/${selectedKey.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate: true }),
      });
      const data = await res.json();
      if (data.success && data.rawKey) {
        setRevealedKey(data.rawKey);
        setModal("reveal");
        loadKeys();
      }
    } catch { /* ignore */ }
  };

  const copyKey = () => {
    if (revealedKey) {
      navigator.clipboard.writeText(revealedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const isExpired = (d: string | null) => d ? new Date(d) < new Date() : false;

  return (
    <div className="min-h-screen bg-[#070707] text-[#F7F7F7] antialiased">

      {/* Grid background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(217,4,41,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(217,4,41,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Top glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-[#D90429] opacity-[0.04] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/owner"
                className="text-[10px] font-orbitron text-[#D90429]/60 hover:text-[#D90429] uppercase tracking-widest transition-colors"
              >
                ← Owner
              </Link>
              <span className="text-[#333]">/</span>
              <span className="text-[10px] font-orbitron text-[#A5A5A5] uppercase tracking-widest">Access Keys</span>
            </div>
            <h1 className="font-orbitron text-2xl font-black text-white uppercase tracking-wider">
              Access Key Manager
            </h1>
            <p className="text-xs text-[#A5A5A5] mt-1 font-light">
              Create, revoke, and manage login access keys for all team members.
            </p>
          </div>
          <button
            onClick={() => setModal("create")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-orbitron text-xs font-bold uppercase tracking-widest text-white transition-all"
            style={{
              background: "linear-gradient(90deg, #D90429, #FF4D6D)",
              boxShadow: "0 4px 20px rgba(217,4,41,0.3)",
            }}
          >
            <span className="text-base font-light">+</span> New Access Key
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Keys", value: keys.length },
            { label: "Active", value: keys.filter((k) => k.isActive && !isExpired(k.expiresAt)).length },
            { label: "Revoked / Expired", value: keys.filter((k) => !k.isActive || isExpired(k.expiresAt)).length },
            { label: "Total Uses", value: keys.reduce((sum, k) => sum + k.useCount, 0) },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-[#0B0B0B] border border-[rgba(217,4,41,0.12)] rounded-xl px-5 py-4"
            >
              <div className="text-[9px] font-orbitron text-[#A5A5A5] uppercase tracking-widest mb-1">{stat.label}</div>
              <div className="font-orbitron text-2xl font-black text-white">{loading ? "—" : stat.value}</div>
            </div>
          ))}
        </div>

        {/* Keys Table */}
        <div className="bg-[#0A0A0A] border border-[rgba(217,4,41,0.15)] rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-6 py-3 border-b border-[#111] text-[9px] font-orbitron text-[#555] uppercase tracking-widest">
            <span>Label / User</span>
            <span className="text-center">Role</span>
            <span className="text-center">Status</span>
            <span className="text-center hidden md:block">Uses</span>
            <span className="text-center hidden lg:block">Expires</span>
            <span className="text-right">Actions</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex items-center gap-3 text-[#555]">
                <svg className="w-5 h-5 animate-spin text-[#D90429]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
                </svg>
                <span className="font-orbitron text-sm">Loading keys...</span>
              </div>
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-4xl mb-3">🔑</div>
              <p className="font-orbitron text-sm text-[#555] uppercase tracking-wide">No access keys yet.</p>
              <p className="text-xs text-[#333] mt-1 font-light">Create a key above to grant team login access.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#111]">
              {keys.map((key) => {
                const expired = isExpired(key.expiresAt);
                const status = !key.isActive ? "revoked" : expired ? "expired" : "active";

                return (
                  <div
                    key={key.id}
                    className={`grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-6 py-4 items-center transition-colors ${status === "active" ? "hover:bg-[#0D0D0D]" : "opacity-60"}`}
                  >
                    {/* Label / User */}
                    <div className="min-w-0">
                      <div className="font-orbitron text-sm font-bold text-white truncate">{key.label}</div>
                      <div className="text-[10px] text-[#555] font-light mt-0.5 truncate">
                        {key.user.fullName || key.user.email || key.user.username || key.user.id}
                      </div>
                    </div>

                    {/* Role */}
                    <div className="flex justify-center">
                      <Badge role={key.role} />
                    </div>

                    {/* Status */}
                    <div className="flex justify-center">
                      <span className={`text-[9px] font-orbitron font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                        status === "active"
                          ? "text-[#4ECDC4] border-[#4ECDC4]/30 bg-[#4ECDC4]/5"
                          : status === "expired"
                          ? "text-[#F39C12] border-[#F39C12]/30 bg-[#F39C12]/5"
                          : "text-[#555] border-[#333] bg-[#0A0A0A]"
                      }`}>
                        {status}
                      </span>
                    </div>

                    {/* Uses */}
                    <div className="text-center hidden md:block">
                      <span className="text-xs font-mono text-[#A5A5A5]">
                        {key.useCount}{key.maxUses ? `/${key.maxUses}` : ""}
                      </span>
                    </div>

                    {/* Expires */}
                    <div className="text-center hidden lg:block">
                      <span className={`text-[10px] font-mono ${expired ? "text-[#F39C12]" : "text-[#555]"}`}>
                        {formatDate(key.expiresAt)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Toggle active */}
                      <button
                        onClick={() => handleToggle(key)}
                        title={key.isActive ? "Disable" : "Enable"}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#222] bg-[#111] hover:border-[#D90429]/40 hover:text-[#D90429] text-[#555] transition-all text-xs font-bold"
                      >
                        {key.isActive ? "◼" : "▶"}
                      </button>

                      {/* Regenerate */}
                      <button
                        onClick={() => { setSelectedKey(key); setModal("regenerate"); }}
                        title="Regenerate Key"
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#222] bg-[#111] hover:border-[#9B59B6]/40 hover:text-[#9B59B6] text-[#555] transition-all text-xs"
                      >
                        ↻
                      </button>

                      {/* Revoke */}
                      <button
                        onClick={() => { setSelectedKey(key); setModal("revoke"); }}
                        title="Revoke"
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#222] bg-[#111] hover:border-[#D90429]/60 hover:text-[#D90429] text-[#555] transition-all text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Created date of oldest key */}
        {keys.length > 0 && (
          <p className="text-[10px] text-[#333] font-orbitron text-center mt-4 uppercase tracking-widest">
            🔒 Key hashes stored only — raw keys are never logged or recoverable.
          </p>
        )}
      </div>

      {/* ─── MODAL: Create New Key ─────────────────────────────────── */}
      {modal === "create" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div className="bg-[#090909] border border-[rgba(217,4,41,0.25)] rounded-2xl w-full max-w-md p-7 relative" style={{ boxShadow: "0 0 50px rgba(217,4,41,0.15)" }}>
            <button
              onClick={() => setModal(null)}
              className="absolute right-4 top-4 text-[#555] hover:text-white transition-colors text-lg font-bold"
              aria-label="Close"
            >✕</button>

            <h2 className="font-orbitron text-lg font-bold text-white uppercase tracking-wider mb-1">Create Access Key</h2>
            <p className="text-xs text-[#555] font-light mb-6">The raw key is shown once only after creation.</p>

            {formError && (
              <div className="mb-4 p-3 rounded-lg border border-[rgba(217,4,41,0.3)] bg-[rgba(217,4,41,0.06)] text-xs text-[#D90429] font-orbitron">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              {/* User selector */}
              <div>
                <label className="block text-[10px] font-orbitron tracking-widest text-[#A5A5A5] uppercase mb-2">Assign To (User)</label>
                <select
                  value={form.userId}
                  onChange={(e) => setForm({ ...form, userId: e.target.value })}
                  className="w-full bg-[#111] border border-[rgba(217,4,41,0.2)] rounded-lg px-4 py-3 text-sm text-[#F7F7F7] outline-none focus:border-[rgba(217,4,41,0.5)]"
                  required
                >
                  <option value="">Select a user...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.email || u.username || u.id} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Label */}
              <div>
                <label className="block text-[10px] font-orbitron tracking-widest text-[#A5A5A5] uppercase mb-2">Label</label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="e.g. Ashu Personal Laptop"
                  className="w-full bg-[#111] border border-[rgba(217,4,41,0.2)] rounded-lg px-4 py-3 text-sm text-[#F7F7F7] placeholder-[#333] outline-none focus:border-[rgba(217,4,41,0.5)]"
                  required
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-[10px] font-orbitron tracking-widest text-[#A5A5A5] uppercase mb-2">Role Granted</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full bg-[#111] border border-[rgba(217,4,41,0.2)] rounded-lg px-4 py-3 text-sm text-[#F7F7F7] outline-none focus:border-[rgba(217,4,41,0.5)]"
                >
                  <option value="TEAM_MEMBER">Team Member</option>
                  <option value="ADMIN">Admin (Read-Only)</option>
                  <option value="OWNER">Owner</option>
                </select>
              </div>

              {/* Max uses + expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-orbitron tracking-widest text-[#A5A5A5] uppercase mb-2">Max Uses</label>
                  <input
                    type="number"
                    value={form.maxUses}
                    onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                    placeholder="Unlimited"
                    min="1"
                    className="w-full bg-[#111] border border-[rgba(217,4,41,0.2)] rounded-lg px-4 py-3 text-sm text-[#F7F7F7] placeholder-[#333] outline-none focus:border-[rgba(217,4,41,0.5)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-orbitron tracking-widest text-[#A5A5A5] uppercase mb-2">Expires At</label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                    className="w-full bg-[#111] border border-[rgba(217,4,41,0.2)] rounded-lg px-4 py-3 text-sm text-[#F7F7F7] outline-none focus:border-[rgba(217,4,41,0.5)]"
                    style={{ colorScheme: "dark" }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full rounded-lg py-3 font-orbitron text-xs font-bold uppercase tracking-widest text-white transition-all disabled:opacity-50"
                style={{
                  background: "linear-gradient(90deg, #D90429, #FF4D6D)",
                  boxShadow: "0 4px 20px rgba(217,4,41,0.25)",
                }}
              >
                {formLoading ? "Creating..." : "Generate Access Key"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Reveal Raw Key ────────────────────────────────── */}
      {modal === "reveal" && revealedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-[#090909] border border-[rgba(0,180,80,0.3)] rounded-2xl w-full max-w-md p-7 text-center" style={{ boxShadow: "0 0 50px rgba(0,180,80,0.1)" }}>
            <div className="text-3xl mb-3">🔑</div>
            <h2 className="font-orbitron text-lg font-bold text-white uppercase tracking-wider mb-1">Save Your Key</h2>
            <p className="text-xs text-[#D90429] font-orbitron mb-5">This key will <strong>never</strong> be shown again.</p>

            <div className="bg-[#0D0D0D] border border-[rgba(0,180,80,0.2)] rounded-xl p-4 mb-4 font-mono text-sm text-[#4ECDC4] tracking-wider break-all select-all">
              {revealedKey}
            </div>

            <button
              onClick={copyKey}
              className="w-full rounded-lg py-3 font-orbitron text-xs font-bold uppercase tracking-widest mb-3 transition-all"
              style={{
                background: copied ? "rgba(78,205,196,0.1)" : "linear-gradient(90deg, #1a8a82, #4ECDC4)",
                border: copied ? "1px solid rgba(78,205,196,0.4)" : "none",
                color: copied ? "#4ECDC4" : "#000",
              }}
            >
              {copied ? "✓ Copied!" : "Copy to Clipboard"}
            </button>

            <button
              onClick={() => { setModal(null); setRevealedKey(null); setCopied(false); }}
              className="w-full rounded-lg py-2.5 font-orbitron text-xs font-bold uppercase tracking-widest text-[#555] hover:text-white border border-[#222] hover:border-[#333] transition-all"
            >
              I've Saved It — Close
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL: Confirm Revoke ────────────────────────────────── */}
      {modal === "revoke" && selectedKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setModal(null); setSelectedKey(null); } }}
        >
          <div className="bg-[#090909] border border-[rgba(217,4,41,0.3)] rounded-2xl w-full max-w-sm p-7 text-center" style={{ boxShadow: "0 0 40px rgba(217,4,41,0.15)" }}>
            <div className="text-3xl mb-3">⚠️</div>
            <h2 className="font-orbitron text-base font-bold text-white uppercase tracking-wider mb-2">Revoke Key?</h2>
            <p className="text-xs text-[#A5A5A5] font-light mb-1">
              <span className="text-white font-medium">{selectedKey.label}</span>
            </p>
            <p className="text-xs text-[#555] mb-6">This key will be permanently deactivated. This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setModal(null); setSelectedKey(null); }}
                className="flex-1 py-2.5 rounded-lg font-orbitron text-xs font-bold uppercase tracking-widest text-[#555] border border-[#222] hover:border-[#333] hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                className="flex-1 py-2.5 rounded-lg font-orbitron text-xs font-bold uppercase tracking-widest text-white transition-all"
                style={{ background: "linear-gradient(90deg, #8B0000, #D90429)" }}
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Confirm Regenerate ────────────────────────────── */}
      {modal === "regenerate" && selectedKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setModal(null); setSelectedKey(null); } }}
        >
          <div className="bg-[#090909] border border-[rgba(155,89,182,0.3)] rounded-2xl w-full max-w-sm p-7 text-center" style={{ boxShadow: "0 0 40px rgba(155,89,182,0.1)" }}>
            <div className="text-3xl mb-3">↻</div>
            <h2 className="font-orbitron text-base font-bold text-white uppercase tracking-wider mb-2">Regenerate Key?</h2>
            <p className="text-xs text-[#A5A5A5] font-light mb-1">
              <span className="text-white font-medium">{selectedKey.label}</span>
            </p>
            <p className="text-xs text-[#555] mb-6">The old key will be invalidated immediately. A new key will be generated and shown once.</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setModal(null); setSelectedKey(null); }}
                className="flex-1 py-2.5 rounded-lg font-orbitron text-xs font-bold uppercase tracking-widest text-[#555] border border-[#222] hover:border-[#333] hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerate}
                className="flex-1 py-2.5 rounded-lg font-orbitron text-xs font-bold uppercase tracking-widest text-white transition-all"
                style={{ background: "linear-gradient(90deg, #4a1a8a, #9B59B6)" }}
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
