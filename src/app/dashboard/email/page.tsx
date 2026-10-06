"use client";

import React, { useState } from "react";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { useAuth } from "@/context/AuthContext";
import { hasPermission, Permission, getEffectiveRole } from "@/lib/permissions";
import { Mail, Send, CheckCircle2, AlertCircle, Loader2, Sparkles, Shield } from "lucide-react";

export default function EmailDispatchPage() {
  const { user } = useAuth();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<"OPERATIONAL" | "PROJECT" | "HR">("OPERATIONAL");
  const [htmlContent, setHtmlContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSend = hasPermission(user, Permission.SEND_EMAIL);
  const actorRole = user ? getEffectiveRole(user) : "EMPLOYEE";

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!to.trim() || !subject.trim() || !htmlContent.trim()) {
      setError("Please provide recipient, subject, and message content.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.trim(),
          subject: subject.trim(),
          html: htmlContent.replace(/\n/g, "<br/>"),
          category,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to dispatch email.");
        setLoading(false);
        return;
      }

      setSuccess(`Email successfully dispatched to ${to.trim()}. Activity logged to audit stream.`);
      setTo("");
      setSubject("");
      setHtmlContent("");
    } catch (err: any) {
      setError("Network error while dispatching email.");
    } finally {
      setLoading(false);
    }
  };

  if (!canSend) {
    return (
      <TeamCoreShell title="Communications Dispatch">
        <div className="p-12 text-center rounded-2xl bg-[#090909] border border-crimson/20 max-w-md mx-auto space-y-4">
          <AlertCircle className="w-10 h-10 text-bright-red mx-auto" />
          <h2 className="font-orbitron font-bold text-base text-white">ACCESS RESTRICTED</h2>
          <p className="text-xs text-[#888]">
            Your organizational role ({actorRole}) does not possess email dispatching authorization.
          </p>
        </div>
      </TeamCoreShell>
    );
  }

  return (
    <TeamCoreShell
      title="Communications Dispatch"
      subtitle="Authorized email broadcasts & operational notices"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0A0A0A] border border-crimson/30 shadow-[0_0_40px_rgba(217,4,41,0.15)] relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-deep-red/20 border border-crimson/40 flex items-center justify-center text-bright-red">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-orbitron font-bold uppercase tracking-[0.2em] text-bright-red">
                Resend Architecture &bull; Official Dispatch
              </span>
              <h2 className="font-orbitron font-black text-base text-white tracking-wide">
                SEND OPERATIONAL EMAIL
              </h2>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-deep-red/20 border border-crimson/40 flex items-center gap-2.5 text-xs text-bright-red">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-3.5 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center gap-2.5 text-xs text-green-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSend} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-orbitron uppercase text-[#888] tracking-wider mb-1.5">
                  Recipient Email *
                </label>
                <input
                  type="email"
                  required
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="engineer@codxa-agency.online"
                  className="w-full bg-[#121212] border border-crimson/25 focus:border-bright-red rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#555] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-orbitron uppercase text-[#888] tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-[#121212] border border-crimson/25 focus:border-bright-red rounded-xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="OPERATIONAL">Operational Notice</option>
                  <option value="PROJECT">Project / Engineering Directive</option>
                  <option value="HR">People & HR Communication</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-orbitron uppercase text-[#888] tracking-wider mb-1.5">
                Subject Line *
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Next-Generation Sprint Briefing & Task Allocation"
                className="w-full bg-[#121212] border border-crimson/25 focus:border-bright-red rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#555] outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-orbitron uppercase text-[#888] tracking-wider mb-1.5">
                Message Body *
              </label>
              <textarea
                required
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                rows={6}
                placeholder="Enter formal update, operational directives, or feedback..."
                className="w-full bg-[#121212] border border-crimson/25 focus:border-bright-red rounded-xl p-4 text-xs text-white placeholder-[#555] outline-none leading-relaxed"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#666]">
                Sender: <strong className="text-white">{user?.displayName}</strong> ({actorRole})
              </span>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-crimson hover:bg-bright-red disabled:opacity-50 text-xs font-orbitron font-bold text-white uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(217,4,41,0.3)] flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Dispatch Email</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </TeamCoreShell>
  );
}
