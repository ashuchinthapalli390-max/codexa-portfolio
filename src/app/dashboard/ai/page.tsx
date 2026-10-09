"use client";

import React, { useState, useEffect } from "react";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { useAuth } from "@/context/AuthContext";
import {
  Sparkles,
  Bot,
  ShieldCheck,
  Cpu,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Lock,
  Sliders,
  Check,
  FileCode,
  Terminal,
} from "lucide-react";
import { getEffectiveRole } from "@/lib/permissions";

const ALL_ROLES = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "COO", "EMPLOYEE", "INTERN"];

export default function CodeXaAiSettingsPage() {
  const { user } = useAuth();
  const effectiveRole = user ? getEffectiveRole(user) : "EMPLOYEE";
  const canManage = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "OWNER", "ADMIN"].includes(effectiveRole);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [enabled, setEnabled] = useState(true);
  const [model, setModel] = useState("gemini-flash-latest");
  const [allowedRoles, setAllowedRoles] = useState<string[]>(ALL_ROLES);
  const [instructions, setInstructions] = useState("");
  const [knowledgeSources, setKnowledgeSources] = useState<string[]>([]);
  const [newSource, setNewSource] = useState("");
  const [sanitizeMarkdown, setSanitizeMarkdown] = useState(true);
  const [maxTokens, setMaxTokens] = useState(600);
  const [dailyLimit, setDailyLimit] = useState(100);
  const [hasApiKey, setHasApiKey] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai/settings");
      const data = await res.json();
      if (data.ok && data.config) {
        setEnabled(data.config.enabled ?? true);
        setModel(data.config.model || "gemini-flash-latest");
        setAllowedRoles(data.config.allowedRoles || ALL_ROLES);
        setInstructions(data.config.instructions || "");
        setKnowledgeSources(data.config.knowledgeSources || []);
        setSanitizeMarkdown(data.config.sanitizeMarkdown ?? true);
        setMaxTokens(data.config.maxTokensPerResponse || 600);
        setDailyLimit(data.config.rateLimitPerUserDaily || 100);
        setHasApiKey(Boolean(data.hasApiKey));
      }
    } catch (err: any) {
      console.error("Failed to load AI settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggleRole = (role: string) => {
    if (allowedRoles.includes(role)) {
      setAllowedRoles(allowedRoles.filter((r) => r !== role));
    } else {
      setAllowedRoles([...allowedRoles, role]);
    }
  };

  const handleAddSource = () => {
    if (!newSource.trim()) return;
    setKnowledgeSources([...knowledgeSources, newSource.trim()]);
    setNewSource("");
  };

  const handleRemoveSource = (idx: number) => {
    setKnowledgeSources(knowledgeSources.filter((_, i) => i !== idx));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/admin/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          model,
          allowedRoles,
          instructions,
          knowledgeSources,
          sanitizeMarkdown,
          maxTokensPerResponse: maxTokens,
          rateLimitPerUserDaily: dailyLimit,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setErrorMsg(data.error || "Failed to save AI settings.");
      }
    } catch (err: any) {
      setErrorMsg("Error saving settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <TeamCoreShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1f2228] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-purple-400 mb-1">
              <Bot className="w-4 h-4" />
              <span>INTELLIGENT WORKSPACE CONTROLS</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              CodeXa AI Behavior & Model Controls
              <span className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded font-mono">
                Server-Side Secure
              </span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Configure system prompts, permitted roles, official knowledge sources, rate limits, and markdown formatting rules. Keys are secured server-side and never exposed to clients.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchSettings}
              disabled={loading}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-[#14161a] border border-[#232730] hover:bg-[#1a1d24] text-gray-300 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            {canManage && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white flex items-center gap-2 shadow-lg shadow-red-900/20 transition-all disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save AI Settings
              </button>
            )}
          </div>
        </div>

        {saveSuccess && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>CodeXa AI settings updated successfully! Mobile APK and website assistant will immediately adopt the new instruction layer.</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Security & Status Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0f1115] border border-[#1e222a] rounded-xl p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-400">API Key Storage</div>
              <div className="text-sm font-semibold text-white">
                {hasApiKey ? "Secured in Backend ENV" : "Missing GEMINI_API_KEY"}
              </div>
              <div className="text-[11px] text-gray-500">Zero client exposure</div>
            </div>
          </div>

          <div className="bg-[#0f1115] border border-[#1e222a] rounded-xl p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-400">Active Model Engine</div>
              <div className="text-sm font-semibold text-white font-mono">{model}</div>
              <div className="text-[11px] text-gray-500">Google Gemini Pro / Flash</div>
            </div>
          </div>

          <div className="bg-[#0f1115] border border-[#1e222a] rounded-xl p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-400">Knowledge Grounding</div>
              <div className="text-sm font-semibold text-white">Prisma + Live Core DB</div>
              <div className="text-[11px] text-gray-500">Role-scoped data access</div>
            </div>
          </div>
        </div>

        {/* Form Controls */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* General Switches */}
          <div className="bg-[#0f1115] border border-[#1e222a] rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Sliders className="w-4 h-4 text-red-400" />
              General Activation & Model Settings
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="flex items-center justify-between p-4 bg-[#14171d] border border-[#232732] rounded-xl">
                <div>
                  <div className="text-xs font-semibold text-white">Enable CodeXa AI</div>
                  <div className="text-[11px] text-gray-400">Allow users to chat with the assistant on Mobile and Web</div>
                </div>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-5 h-5 accent-red-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-[#14171d] border border-[#232732] rounded-xl">
                <div>
                  <div className="text-xs font-semibold text-white">Markdown Sanitization (Fix *** Bug)</div>
                  <div className="text-[11px] text-gray-400">Automatically strip redundant asterisks & format artifacts</div>
                </div>
                <input
                  type="checkbox"
                  checked={sanitizeMarkdown}
                  onChange={(e) => setSanitizeMarkdown(e.target.checked)}
                  className="w-5 h-5 accent-red-600 cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Underlying Gemini Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-[#14171d] border border-[#232732] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500"
                >
                  <option value="gemini-flash-latest">Gemini Flash Latest (Fast, Reliable & Recommended)</option>
                  <option value="gemini-3.8-flash">Gemini 3.8 Flash (State-of-the-Art Agency Intelligence)</option>
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (High Efficiency)</option>
                  <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Max Tokens Per Output</label>
                <input
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className="w-full bg-[#14171d] border border-[#232732] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Daily Limit Per User</label>
                <input
                  type="number"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(Number(e.target.value))}
                  className="w-full bg-[#14171d] border border-[#232732] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Permitted Roles */}
          <div className="bg-[#0f1115] border border-[#1e222a] rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-400" />
              Role-Based Access Targeting
            </h2>
            <p className="text-xs text-gray-400">
              Select which user roles have permission to initiate conversations with CodeXa AI.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {ALL_ROLES.map((role) => {
                const isSelected = allowedRoles.includes(role);
                return (
                  <div
                    key={role}
                    onClick={() => handleToggleRole(role)}
                    className={`p-3 rounded-xl border text-xs font-mono font-semibold cursor-pointer flex items-center justify-between transition-all ${
                      isSelected
                        ? "bg-purple-600/10 border-purple-500 text-purple-300"
                        : "bg-[#14171d] border-[#232732] text-gray-400 hover:text-white"
                    }`}
                  >
                    <span>{role}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* System Instructions */}
          <div className="bg-[#0f1115] border border-[#1e222a] rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Agency Guidance & System Prompt Directives
            </h2>
            <p className="text-xs text-gray-400">
              Provide behavioral guidance for CodeXa AI. The prompt is automatically injected with the current user's profile, domain, scheduled classes, and assignment context.
            </p>

            <textarea
              rows={5}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="You are CodeXa AI, an intelligent, professional, and accurate workspace assistant..."
              className="w-full bg-[#14171d] border border-[#232732] rounded-xl p-4 text-xs text-white font-mono outline-none focus:border-red-500"
            />
          </div>

          {/* Knowledge Sources */}
          <div className="bg-[#0f1115] border border-[#1e222a] rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              Approved Agency Knowledge Sources
            </h2>

            <div className="flex gap-2">
              <input
                type="text"
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                placeholder="e.g. CodeXa Security Playbook v2"
                className="flex-1 bg-[#14171d] border border-[#232732] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500"
              />
              <button
                type="button"
                onClick={handleAddSource}
                className="px-4 py-2 bg-[#1a1e27] hover:bg-[#222733] border border-[#282d3b] text-white text-xs font-semibold rounded-xl"
              >
                Add Source
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {knowledgeSources.map((source, idx) => (
                <div
                  key={idx}
                  className="bg-[#14171d] border border-[#232732] px-3 py-1.5 rounded-xl text-xs text-gray-300 flex items-center gap-2"
                >
                  <span>{source}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSource(idx)}
                    className="text-gray-500 hover:text-red-400"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>
      </div>
    </TeamCoreShell>
  );
}
