"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  Shield,
  Key,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Activity,
  Copy,
  Check,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Sliders,
  Terminal,
  Zap,
  Globe,
  Lock,
  FileText,
  Users,
  Eye,
  Send,
  Trash2,
  AlertOctagon,
} from "lucide-react";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { useAuth } from "@/context/AuthContext";
import { getEffectiveRole, OrgRole } from "@/lib/permissions";

type TabType =
  | "overview"
  | "connections"
  | "tools"
  | "policies"
  | "approvals"
  | "jobs"
  | "activity"
  | "service-accounts"
  | "security";

export default function McpControlCenterPage() {
  const { user } = useAuth();
  const effectiveRole = getEffectiveRole(user as any);

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Data states
  const [clients, setClients] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [serviceAccounts, setServiceAccounts] = useState<any[]>([]);
  const [controls, setControls] = useState<any>({
    isMcpEnabled: true,
    isReadToolsEnabled: true,
    isWriteToolsEnabled: true,
    isBulkActionsEnabled: true,
    isEmailActionsEnabled: true,
    isPaymentActionsEnabled: true,
  });

  // Modals & Drawers
  const [createClientModalOpen, setCreateClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientDesc, setNewClientDesc] = useState("");
  const [newClientType, setNewClientType] = useState("API_KEY");
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  // Search & Filters
  const [toolSearch, setToolSearch] = useState("");
  const [toolCategoryFilter, setToolCategoryFilter] = useState("ALL");
  const [activitySearch, setActivitySearch] = useState("");

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, tRes, aRes, jRes, actRes, saRes, ctrlRes] = await Promise.all([
        fetch("/api/mcp/clients").then((r) => r.json()).catch(() => ({ clients: [] })),
        fetch("/api/mcp/tools").then((r) => r.json()).catch(() => ({ tools: [] })),
        fetch("/api/mcp/approvals").then((r) => r.json()).catch(() => ({ approvals: [] })),
        fetch("/api/mcp/jobs").then((r) => r.json()).catch(() => ({ jobs: [] })),
        fetch("/api/mcp/activity?limit=30").then((r) => r.json()).catch(() => ({ calls: [] })),
        fetch("/api/mcp/service-accounts").then((r) => r.json()).catch(() => ({ serviceAccounts: [] })),
        fetch("/api/mcp/controls").then((r) => r.json()).catch(() => ({ controls: {} })),
      ]);

      if (cRes.clients) setClients(cRes.clients);
      if (tRes.tools) setTools(tRes.tools);
      if (aRes.approvals) setApprovals(aRes.approvals);
      if (jRes.jobs) setJobs(jRes.jobs);
      if (actRes.calls) setActivity(actRes.calls);
      if (saRes.serviceAccounts) setServiceAccounts(saRes.serviceAccounts);
      if (ctrlRes.controls) setControls(ctrlRes.controls);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Handle Create Client
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    try {
      const res = await fetch("/api/mcp/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newClientName,
          description: newClientDesc,
          clientType: newClientType,
          scopes: ["*"],
          allowedTools: ["*"],
        }),
      });
      const data = await res.json();
      if (data.success && data.secretKey) {
        setRevealedSecret(data.secretKey);
        setNewClientName("");
        setNewClientDesc("");
        setCreateClientModalOpen(false);
        loadAllData();
      } else {
        alert(data.error || "Failed to create client");
      }
    } catch {
      alert("Error creating client");
    }
  };

  // Handle Approval Decision
  const handleDecideApproval = async (approvalId: string, decision: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch("/api/mcp/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, decision, executeNow: true }),
      });
      const data = await res.json();
      if (data.success) {
        loadAllData();
      } else {
        alert(data.error || "Failed to process approval");
      }
    } catch {
      alert("Network error processing approval");
    }
  };

  // Handle Kill Switch Toggle
  const handleToggleControl = async (field: string, value: boolean) => {
    try {
      const res = await fetch("/api/mcp/controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (data.success) {
        setControls(data.controls);
      } else {
        alert(data.error || "Failed to update emergency control");
      }
    } catch {
      alert("Error toggling emergency switch");
    }
  };

  // Handle Tool Policy Toggle
  const handleToggleToolPolicy = async (toolName: string, isEnabled: boolean) => {
    try {
      const res = await fetch("/api/mcp/tools", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolName, isEnabled }),
      });
      const data = await res.json();
      if (data.success) {
        setTools((prev) =>
          prev.map((t) => (t.name === toolName ? { ...t, isEnabled } : t))
        );
      }
    } catch {
      alert("Error updating tool policy");
    }
  };

  const filteredTools = tools.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(toolSearch.toLowerCase()) ||
      t.description.toLowerCase().includes(toolSearch.toLowerCase());
    const matchesCat =
      toolCategoryFilter === "ALL" || t.category === toolCategoryFilter;
    return matchesSearch && matchesCat;
  });

  const categories = ["ALL", "users", "employees", "interns", "projects", "attendance", "payments", "documents", "email", "analytics", "feature_flags"];

  return (
    <TeamCoreShell
      title="AI & MCP Connections"
      subtitle="Model Context Protocol Integration Layer, Remote Tool Registry & Agent Automation Core"
      actions={
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadAllData()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1a1a1a] text-xs text-[#aaa] hover:text-white border border-[#222] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setCreateClientModalOpen(true)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-bright-red to-[#cc0028] text-white text-xs font-semibold hover:shadow-[0_0_15px_rgba(255,45,85,0.4)] transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Connection
          </button>
        </div>
      }
    >
      {/* Emergency Alert Banner if any kill switch is active */}
      {(!controls.isMcpEnabled || !controls.isWriteToolsEnabled || !controls.isBulkActionsEnabled) && (
        <div className="mb-6 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 flex items-center justify-between text-yellow-400">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 animate-pulse" />
            <div className="text-xs">
              <span className="font-bold uppercase tracking-wider">Guardrail Alert:</span>{" "}
              {!controls.isMcpEnabled
                ? "MCP Server is globally halted by Founder kill switch."
                : !controls.isWriteToolsEnabled
                ? "Write tools are currently disabled."
                : "Bulk actions are currently locked."}
            </div>
          </div>
          <button
            onClick={() => setActiveTab("security")}
            className="text-xs underline hover:text-white font-medium"
          >
            Configure Kill Switches
          </button>
        </div>
      )}

      {/* Primary Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-[#1f1f1f] pb-3 mb-6 overflow-x-auto">
        {[
          { id: "overview", label: "Overview & Status", icon: Globe },
          { id: "connections", label: `Clients (${clients.length})`, icon: Key },
          { id: "tools", label: `Tools (${tools.length})`, icon: Terminal },
          { id: "policies", label: "Policies & Limits", icon: Sliders },
          {
            id: "approvals",
            label: `Approvals ${approvals.length > 0 ? `(${approvals.length})` : ""}`,
            icon: Shield,
            badge: approvals.length,
          },
          { id: "jobs", label: `Jobs (${jobs.length})`, icon: Cpu },
          { id: "activity", label: "Live Activity", icon: Activity },
          { id: "service-accounts", label: "Service Bots", icon: Users },
          { id: "security", label: "Kill Switches", icon: AlertOctagon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "bg-bright-red/15 text-bright-red border border-bright-red/30 shadow-[0_0_10px_rgba(255,45,85,0.15)]"
                  : "text-[#888] hover:text-white hover:bg-[#121212] border border-transparent"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.badge ? (
                <span className="w-4 h-4 rounded-full bg-bright-red text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: OVERVIEW & STATUS ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#0c0c0c] border border-[#1a1a1a]">
              <div className="flex items-center justify-between text-[#888] text-xs mb-2">
                <span>MCP Server Status</span>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
              </div>
              <div className="text-xl font-bold font-orbitron text-green-400">● ONLINE</div>
              <p className="text-[11px] text-[#666] mt-1">Streamable HTTP (2024-11-05)</p>
            </div>

            <div className="p-4 rounded-xl bg-[#0c0c0c] border border-[#1a1a1a]">
              <div className="text-[#888] text-xs mb-2">Active Clients</div>
              <div className="text-xl font-bold font-orbitron text-white">
                {clients.filter((c) => c.status === "ACTIVE").length}
              </div>
              <p className="text-[11px] text-[#666] mt-1">{clients.length} Total Registered</p>
            </div>

            <div className="p-4 rounded-xl bg-[#0c0c0c] border border-[#1a1a1a]">
              <div className="text-[#888] text-xs mb-2">Pending Approvals</div>
              <div className="text-xl font-bold font-orbitron text-bright-red">
                {approvals.length}
              </div>
              <p className="text-[11px] text-[#666] mt-1">Level 2 & 3 Actions</p>
            </div>

            <div className="p-4 rounded-xl bg-[#0c0c0c] border border-[#1a1a1a]">
              <div className="text-[#888] text-xs mb-2">Enabled Tools</div>
              <div className="text-xl font-bold font-orbitron text-blue-400">
                {tools.filter((t) => t.isEnabled).length} / {tools.length}
              </div>
              <p className="text-[11px] text-[#666] mt-1">Two-Layer RBAC Protected</p>
            </div>
          </div>

          {/* Canonical Endpoint & Instructions Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0e0e0e] to-[#080808] border border-[#1f1f1f]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1a1a1a]">
              <div>
                <h3 className="text-sm font-bold font-orbitron text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-bright-red" />
                  Remote MCP Server Endpoint
                </h3>
                <p className="text-xs text-[#888] mt-1">
                  Connect ChatGPT, Codex, Claude Desktop, Cursor, or CodeXa AI Desktop.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <code className="px-3 py-1.5 rounded-lg bg-[#050505] border border-[#222] text-xs text-bright-red font-mono select-all">
                  https://codxa-agency.online/mcp
                </code>
                <button
                  onClick={() => copyToClipboard("https://codxa-agency.online/mcp", "mcp-url")}
                  className="p-1.5 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#aaa] hover:text-white transition-colors"
                >
                  {copiedKey === "mcp-url" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick Config Snippets */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#080808] border border-[#1a1a1a]">
                <div className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-bright-red" />
                  Claude Desktop (`claude_desktop_config.json`)
                </div>
                <pre className="text-[11px] font-mono text-[#aaa] bg-[#050505] p-3 rounded-lg overflow-x-auto border border-[#161616]">
{`{
  "mcpServers": {
    "codexa": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-everything"],
      "env": {
        "CODEXA_URL": "https://codxa-agency.online/mcp",
        "CODEXA_API_KEY": "cxa_mcp_sk_live_..."
      }
    }
  }
}`}
                </pre>
              </div>

              <div className="p-4 rounded-xl bg-[#080808] border border-[#1a1a1a]">
                <div className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-bright-red" />
                  ChatGPT / Remote Custom MCP Client
                </div>
                <div className="text-xs text-[#888] space-y-2">
                  <p>1. Create an API Key in the <b>Clients</b> tab.</p>
                  <p>2. Set Server URL to: <code className="text-white">https://codxa-agency.online/mcp</code></p>
                  <p>3. Add Header: <code className="text-white">Authorization: Bearer cxa_mcp_sk_live_...</code></p>
                  <p>4. All write actions will trigger the <b>Approvals</b> queue!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: CLIENT CONNECTIONS ── */}
      {activeTab === "connections" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-orbitron text-white">Registered AI Clients & Agents</h3>
            <button
              onClick={() => setCreateClientModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bright-red text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              New Connection
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#1f1f1f] bg-[#0a0a0a]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#121212] text-[#888] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Client Name</th>
                  <th className="p-3">Client ID</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">API Key Prefix</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Last Connected</th>
                  <th className="p-3">Stats</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#161616]">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-[#101010] transition-colors">
                    <td className="p-3 font-semibold text-white">
                      {c.name}
                      {c.description && <div className="text-[11px] text-[#666] font-normal">{c.description}</div>}
                    </td>
                    <td className="p-3 font-mono text-[#aaa]">{c.clientId}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-[#1a1a1a] text-[#888] font-mono text-[10px]">
                        {c.clientType}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[#888]">{c.apiKeyPrefix || "OAuth Session"}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.status === "ACTIVE"
                            ? "bg-green-500/10 text-green-400 border border-green-500/30"
                            : "bg-red-500/10 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3 text-[#777]">
                      {c.lastConnectedAt ? new Date(c.lastConnectedAt).toLocaleString() : "Never"}
                    </td>
                    <td className="p-3 text-[#888]">
                      {c.stats.toolCalls} calls, {c.stats.approvals} approvals
                    </td>
                    <td className="p-3 text-right">
                      {c.status === "ACTIVE" ? (
                        <button
                          onClick={async () => {
                            if (confirm(`Revoke client '${c.name}'?`)) {
                              await fetch(`/api/mcp/clients?clientId=${c.clientId}`, { method: "DELETE" });
                              loadAllData();
                            }
                          }}
                          className="px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[11px]"
                        >
                          Revoke
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#555]">Revoked</span>
                      )}
                    </td>
                  </tr>
                ))}
                {clients.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-[#666]">
                      No MCP clients registered yet. Click &quot;Add Connection&quot; to generate an API key.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: TOOLS REGISTRY ── */}
      {activeTab === "tools" && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-[#666] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search tools by name or description..."
                value={toolSearch}
                onChange={(e) => setToolSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0c0c0c] border border-[#222] text-xs text-white focus:outline-none focus:border-bright-red"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setToolCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    toolCategoryFilter === cat
                      ? "bg-bright-red text-white"
                      : "bg-[#141414] text-[#888] hover:text-white"
                  }`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredTools.map((tool) => (
              <div
                key={tool.name}
                className="p-4 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#2a2a2a] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-bold text-white font-mono">{tool.name}</code>
                      <span className="px-1.5 py-0.5 rounded bg-[#161616] text-[#777] text-[10px] uppercase">
                        {tool.category}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tool.riskLevel === 0
                          ? "bg-green-500/10 text-green-400 border border-green-500/30"
                          : tool.riskLevel === 1
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                          : tool.riskLevel === 2
                          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30"
                          : "bg-red-500/10 text-red-400 border border-red-500/30"
                      }`}
                    >
                      LEVEL {tool.riskLevel}: {tool.riskLevel === 0 ? "READ" : tool.riskLevel === 1 ? "LOW" : tool.riskLevel === 2 ? "SENSITIVE" : "HIGH RISK"}
                    </span>
                  </div>
                  <p className="text-xs text-[#888] line-clamp-2">{tool.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#141414] flex items-center justify-between text-[11px]">
                  <div className="text-[#666]">
                    Scope: <code className="text-[#aaa]">{tool.requiredScope}</code>
                  </div>
                  <button
                    onClick={() => handleToggleToolPolicy(tool.name, !tool.isEnabled)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      tool.isEnabled
                        ? "bg-green-500/10 text-green-400 border border-green-500/30"
                        : "bg-red-500/10 text-red-400 border border-red-500/30"
                    }`}
                  >
                    {tool.isEnabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: APPROVALS QUEUE ── */}
      {activeTab === "approvals" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-orbitron text-white">Pending MCP Approval Requests</h3>
            <span className="text-xs text-[#888]">10-minute expiry window</span>
          </div>

          <div className="space-y-3">
            {approvals.map((appr) => (
              <div
                key={appr.id}
                className="p-5 rounded-xl bg-[#0c0c0c] border border-bright-red/30 shadow-[0_0_15px_rgba(255,45,85,0.05)] flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-bright-red/10 border border-bright-red/30 text-bright-red font-mono text-xs font-bold">
                      {appr.toolName}
                    </span>
                    <span className="text-xs text-[#888]">by {appr.clientName}</span>
                    <span className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 text-[10px] font-bold">
                      Risk Level {appr.riskLevel}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white">{appr.summary}</p>
                  <div className="text-xs text-[#777] flex items-center gap-4">
                    <span>Affected Records: {appr.affectedCount}</span>
                    <span>Expires: {new Date(appr.expiresAt).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDecideApproval(appr.id, "REJECTED")}
                    className="px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] text-xs text-[#aaa] border border-[#2a2a2a] transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleDecideApproval(appr.id, "APPROVED")}
                    className="px-4 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition-all shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                  >
                    Approve & Execute
                  </button>
                </div>
              </div>
            ))}

            {approvals.length === 0 && (
              <div className="p-12 text-center rounded-xl bg-[#0a0a0a] border border-[#161616]">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2 opacity-80" />
                <h4 className="text-sm font-bold text-white">No Pending Approvals</h4>
                <p className="text-xs text-[#666] mt-1">All Level 2 and Level 3 actions have been reviewed.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 5: AUTOMATION JOBS ── */}
      {activeTab === "jobs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-orbitron text-white">Bulk Automation Jobs Queue</h3>
            <span className="text-xs text-[#888]">{jobs.length} Total Jobs</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {jobs.map((j) => (
              <div key={j.id} className="p-4 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-bright-red">{j.jobCode}</span>
                    <span className="text-xs text-white font-semibold">{j.jobType}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      j.status === "COMPLETED"
                        ? "bg-green-500/10 text-green-400"
                        : j.status === "RUNNING"
                        ? "bg-blue-500/10 text-blue-400 animate-pulse"
                        : j.status === "CANCELLED"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-yellow-500/10 text-yellow-400"
                    }`}
                  >
                    {j.status}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-[#161616] h-2 rounded-full overflow-hidden my-3">
                  <div
                    className="bg-bright-red h-full transition-all duration-500"
                    style={{ width: `${j.progressPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-[#777]">
                  <span>
                    Progress: {j.processedCount} / {j.totalCount} ({j.successCount} success, {j.skippedCount} skipped, {j.failedCount} failed)
                  </span>
                  <span>{new Date(j.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {jobs.length === 0 && (
              <div className="p-8 text-center text-[#666] bg-[#0a0a0a] rounded-xl border border-[#161616]">
                No bulk automation jobs executed yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 6: LIVE ACTIVITY ── */}
      {activeTab === "activity" && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold font-orbitron text-white">Real-Time Tool Call Stream</h3>
          <div className="overflow-x-auto rounded-xl border border-[#1f1f1f] bg-[#0a0a0a]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#121212] text-[#888] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Tool</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#161616]">
                {activity.map((act) => (
                  <tr key={act.id} className="hover:bg-[#101010]">
                    <td className="p-3 text-[#777] font-mono text-[11px]">
                      {new Date(act.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="p-3 font-semibold text-white">{act.clientName}</td>
                    <td className="p-3 font-mono text-bright-red">{act.toolName}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          act.status === "SUCCESS"
                            ? "bg-green-500/10 text-green-400"
                            : act.status === "APPROVAL_REQUIRED"
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {act.status}
                      </span>
                    </td>
                    <td className="p-3 text-[#777] font-mono">{act.durationMs}ms</td>
                    <td className="p-3 text-[#aaa] max-w-xs truncate">{act.resultSummary || act.errorMessage || "-"}</td>
                  </tr>
                ))}
                {activity.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#666]">
                      No tool calls recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 7: SERVICE ACCOUNTS ── */}
      {activeTab === "service-accounts" && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold font-orbitron text-white">Automated Bot & Service Accounts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {serviceAccounts.map((sa) => (
              <div key={sa.id} className="p-4 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-xs">{sa.name}</span>
                  <span className="px-2 py-0.5 rounded bg-[#161616] text-[#888] font-mono text-[10px]">
                    Role: {sa.orgRole}
                  </span>
                </div>
                <div className="text-xs text-[#888] mb-2 font-mono">ID: {sa.serviceId}</div>
                <div className="text-[11px] text-[#666]">
                  Key: <code className="text-[#aaa]">{sa.keyPrefix}</code>
                </div>
              </div>
            ))}
            {serviceAccounts.length === 0 && (
              <div className="col-span-2 p-8 text-center text-[#666] bg-[#0a0a0a] rounded-xl border border-[#161616]">
                No service accounts configured.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 8: EMERGENCY KILL SWITCHES ── */}
      {activeTab === "security" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0d0d0d] border border-bright-red/30">
            <h3 className="text-base font-bold font-orbitron text-white flex items-center gap-2 mb-2">
              <AlertOctagon className="w-5 h-5 text-bright-red" />
              Emergency Kill Switches
            </h3>
            <p className="text-xs text-[#888]">
              Founder and Co-Founder can immediately cut off operations across the MCP layer. Changes take effect on the server in zero seconds.
            </p>

            <div className="mt-6 space-y-4">
              {[
                {
                  id: "isMcpEnabled",
                  label: "Master MCP System Switch",
                  desc: "Complete global halt of all MCP tools and connections.",
                },
                {
                  id: "isReadToolsEnabled",
                  label: "Read Tools (Level 0)",
                  desc: "Search, analytics, and record lookups.",
                },
                {
                  id: "isWriteToolsEnabled",
                  label: "Write Tools (Level 1-3)",
                  desc: "Account creation, project drafting, offer letters, approvals.",
                },
                {
                  id: "isBulkActionsEnabled",
                  label: "Bulk Operations Switch",
                  desc: "Mass account generation and bulk emails.",
                },
                {
                  id: "isEmailActionsEnabled",
                  label: "Email Actions Switch",
                  desc: "Automated dispatch via Resend.",
                },
                {
                  id: "isPaymentActionsEnabled",
                  label: "Payment & Payroll Mutations",
                  desc: "Salary adjustments, verification, and disbursement.",
                },
              ].map((sw) => (
                <div
                  key={sw.id}
                  className="p-4 rounded-xl bg-[#080808] border border-[#1a1a1a] flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-white">{sw.label}</div>
                    <div className="text-[11px] text-[#666]">{sw.desc}</div>
                  </div>
                  <button
                    onClick={() => handleToggleControl(sw.id, !controls[sw.id])}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      controls[sw.id]
                        ? "bg-green-600/20 text-green-400 border border-green-500/30"
                        : "bg-red-600 text-white shadow-[0_0_15px_rgba(255,45,85,0.4)]"
                    }`}
                  >
                    {controls[sw.id] ? "ARMED (ON)" : "HALTED (OFF)"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE CONNECTION ── */}
      <AnimatePresence>
        {createClientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-2xl bg-[#0d0d0d] border border-[#222] shadow-2xl text-white"
            >
              <h3 className="text-sm font-bold font-orbitron mb-1">Add MCP Client Connection</h3>
              <p className="text-xs text-[#888] mb-4">
                Register an AI client (ChatGPT, Claude, Cursor) and generate a secure API secret key.
              </p>

              <form onSubmit={handleCreateClient} className="space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider block mb-1">
                    Connection Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ChatGPT — Founder, Codex Agent"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-[#050505] border border-[#222] text-xs text-white focus:outline-none focus:border-bright-red"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider block mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Production developer assistant"
                    value={newClientDesc}
                    onChange={(e) => setNewClientDesc(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-[#050505] border border-[#222] text-xs text-white focus:outline-none focus:border-bright-red"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider block mb-1">
                    Client Type
                  </label>
                  <select
                    value={newClientType}
                    onChange={(e) => setNewClientType(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-[#050505] border border-[#222] text-xs text-white focus:outline-none focus:border-bright-red"
                  >
                    <option value="API_KEY">Bearer API Key (Recommended)</option>
                    <option value="OAUTH">OAuth 2.0 Client</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateClientModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-[#141414] hover:bg-[#1a1a1a] text-xs text-[#aaa]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-bright-red hover:bg-[#cc0028] text-xs font-bold text-white shadow-[0_0_15px_rgba(255,45,85,0.4)]"
                  >
                    Generate Credentials
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: ONE-TIME REVEAL OF SECRET KEY ── */}
      <AnimatePresence>
        {revealedSecret && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg p-6 rounded-2xl bg-[#0d0d0d] border border-bright-red/40 shadow-2xl text-white"
            >
              <div className="flex items-center gap-3 text-bright-red mb-3">
                <Lock className="w-6 h-6 animate-pulse" />
                <h3 className="text-sm font-bold font-orbitron">MCP Client Secret Key Generated</h3>
              </div>

              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs mb-4">
                <b>WARNING:</b> This secret key is shown <b>only once</b>. It is stored as an irreversible SHA-256 hash on CodeXa servers. Copy and store it in your password vault now!
              </div>

              <div className="p-3 rounded-xl bg-[#050505] border border-[#222] flex items-center justify-between gap-3 mb-6">
                <code className="text-xs font-mono text-green-400 break-all select-all">{revealedSecret}</code>
                <button
                  onClick={() => copyToClipboard(revealedSecret, "secret-key")}
                  className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] text-xs font-semibold text-white flex items-center gap-1.5 shrink-0"
                >
                  {copiedKey === "secret-key" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  {copiedKey === "secret-key" ? "Copied" : "Copy"}
                </button>
              </div>

              <button
                onClick={() => setRevealedSecret(null)}
                className="w-full py-2.5 rounded-xl bg-bright-red text-white text-xs font-bold shadow-[0_0_15px_rgba(255,45,85,0.4)]"
              >
                I Have Saved This Secret Key
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </TeamCoreShell>
  );
}
