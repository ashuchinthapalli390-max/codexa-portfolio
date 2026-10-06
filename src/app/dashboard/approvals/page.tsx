"use client";

import React, { useState, useEffect } from "react";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { useAuth } from "@/context/AuthContext";
import { hasPermission, Permission, getEffectiveRole } from "@/lib/permissions";
import { CheckSquare, Check, X, Clock, AlertCircle, RefreshCw, Filter, Shield, Loader2 } from "lucide-react";

interface ApprovalItem {
  id: string;
  type: string;
  relatedEntityId?: string | null;
  requestedBy: string;
  requestedByName?: string | null;
  requestedAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  decidedBy?: string | null;
  decidedByName?: string | null;
  decidedAt?: string | null;
  reason?: string | null;
  notes?: string | null;
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reasonModalId, setReasonModalId] = useState<string | null>(null);
  const [decisionPending, setDecisionPending] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [decisionReason, setDecisionReason] = useState("");

  const canDecide = hasPermission(user, Permission.DECIDE_APPROVALS);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      let query = "/api/approvals";
      const params = new URLSearchParams();
      if (filterStatus !== "ALL") params.append("status", filterStatus);
      if (filterType !== "ALL") params.append("type", filterType);
      if (params.toString()) query += `?${params.toString()}`;

      const res = await fetch(query);
      const data = await res.json();
      if (data.approvals) setApprovals(data.approvals);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchApprovals();
  }, [user, filterStatus, filterType]);

  const handleDecision = async (id: string, decision: "APPROVED" | "REJECTED", reason?: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason }),
      });
      const data = await res.json();
      if (data.success) {
        setApprovals((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: decision, reason } : a))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
      setReasonModalId(null);
      setDecisionReason("");
    }
  };

  return (
    <TeamCoreShell
      title="Approvals & Governance"
      subtitle="Executive decision workflows & operation requests"
      actions={
        <button
          onClick={fetchApprovals}
          className="p-2 rounded-xl bg-[#141414] hover:bg-deep-red/20 border border-crimson/30 text-[#888] hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      }
    >
      <div className="space-y-6">
        
        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#090909] border border-crimson/20">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-crimson" />
            <span className="text-xs font-orbitron font-bold uppercase text-white">Filter Workflow:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#121212] border border-crimson/20 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Only</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[#121212] border border-crimson/20 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="PROJECT">Projects</option>
              <option value="PROFILE">Profiles</option>
              <option value="STAFF_ACTION">Staff Actions</option>
              <option value="PAYMENT">Payments</option>
            </select>
          </div>
        </div>

        {/* List of Approval Requests */}
        {loading ? (
          <div className="p-12 text-center text-xs text-[#888] flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-crimson" />
            <span>Loading workflows...</span>
          </div>
        ) : approvals.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#090909] border border-white/5 space-y-2">
            <CheckSquare className="w-8 h-8 text-[#555] mx-auto" />
            <h3 className="font-orbitron font-bold text-sm text-white">No Approval Requests</h3>
            <p className="text-xs text-[#777]">All operational items are currently clear or match selected filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {approvals.map((item) => {
              const isPending = item.status === "PENDING";
              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-[#0A0A0A] border border-crimson/20 hover:border-crimson/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-orbitron font-bold uppercase bg-deep-red/20 text-bright-red border border-crimson/30">
                        {item.type}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-orbitron font-bold uppercase ${
                          item.status === "APPROVED"
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : item.status === "REJECTED"
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <p className="font-orbitron font-bold text-sm text-white">
                      Request #{item.id.slice(-6)} &bull; {item.notes || `Approval for ${item.type.toLowerCase()}`}
                    </p>
                    <p className="text-xs text-[#888]">
                      Requested by <strong className="text-white">{item.requestedByName || "Staff"}</strong> on{" "}
                      {new Date(item.requestedAt).toLocaleDateString()}
                    </p>
                    {item.reason && (
                      <p className="text-xs text-bright-red/90 italic">
                        Note: {item.reason} (Decided by {item.decidedByName})
                      </p>
                    )}
                  </div>

                  {canDecide && isPending && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setReasonModalId(item.id);
                          setDecisionPending("APPROVED");
                        }}
                        disabled={actionLoading === item.id}
                        className="px-3.5 py-2 rounded-xl bg-green-600/30 hover:bg-green-600 text-green-300 hover:text-white border border-green-500/40 text-xs font-orbitron font-bold uppercase transition-all flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => {
                          setReasonModalId(item.id);
                          setDecisionPending("REJECTED");
                        }}
                        disabled={actionLoading === item.id}
                        className="px-3.5 py-2 rounded-xl bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 text-xs font-orbitron font-bold uppercase transition-all flex items-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modal for adding notes/reasons */}
        {reasonModalId && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0A0A0A] border border-crimson/40 rounded-3xl p-6 max-w-md w-full space-y-4">
              <h3 className="font-orbitron font-bold text-sm text-white uppercase">
                {decisionPending} Workflow Request
              </h3>
              <p className="text-xs text-[#888]">
                Please enter optional reasoning or operational notes for this decision:
              </p>
              <textarea
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder="Reason or directives..."
                className="w-full h-24 bg-[#121212] border border-crimson/20 rounded-xl p-3 text-xs text-white placeholder-[#555] outline-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setReasonModalId(null)}
                  className="px-4 py-2 rounded-xl bg-[#141414] text-xs font-orbitron text-[#888] uppercase"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDecision(reasonModalId, decisionPending, decisionReason)}
                  className={`px-4 py-2 rounded-xl text-xs font-orbitron font-bold text-white uppercase ${
                    decisionPending === "APPROVED" ? "bg-green-600" : "bg-red-600"
                  }`}
                >
                  Confirm {decisionPending}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TeamCoreShell>
  );
}
