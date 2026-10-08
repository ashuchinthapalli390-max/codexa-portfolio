"use client";

import React, { useState, useEffect } from "react";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { useAuth } from "@/context/AuthContext";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  User,
  FileText,
  Building,
  ShieldCheck,
  Send,
  X
} from "lucide-react";
import { getEffectiveRole } from "@/lib/permissions";

interface LeaveRequestItem {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  leaveType: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  createdAt: string;
  user: {
    id: string;
    fullName?: string | null;
    username: string;
    email: string;
    role: string;
    profileMediaUrl?: string | null;
    employmentProfile?: {
      employeeId?: string | null;
      internshipDomain?: string | null;
      internshipStartDate?: string | null;
      internshipEndDate?: string | null;
      mentorName?: string | null;
    } | null;
  };
}

export default function LeaveManagementPage() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Rejection modal state
  const [rejectModalItem, setRejectModalItem] = useState<LeaveRequestItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const role = user ? getEffectiveRole(user) : "INTERN";
  const isLeadership = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN"].includes(role);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/leave");
      const data = await res.json();
      if (data.ok && Array.isArray(data.all)) {
        setLeaves(data.all);
      }
    } catch (e) {
      console.error("Failed to load leave requests", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleApprove = async (leaveId: string) => {
    if (!confirm("Are you sure you want to approve this leave request?")) return;
    setActionLoading(leaveId);
    try {
      const res = await fetch(`/api/admin/leave/${leaveId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Approved via CodeXa Admin Portal" }),
      });
      const data = await res.json();
      if (data.ok) {
        fetchLeaves();
      } else {
        alert(data.error?.message || "Failed to approve leave request.");
      }
    } catch (e: any) {
      alert("Error approving request: " + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModalItem) return;
    if (!rejectReason.trim()) {
      alert("Please enter a rejection reason.");
      return;
    }

    setActionLoading(rejectModalItem.id);
    try {
      const res = await fetch(`/api/admin/leave/${rejectModalItem.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setRejectModalItem(null);
        setRejectReason("");
        fetchLeaves();
      } else {
        alert(data.error?.message || "Failed to reject leave request.");
      }
    } catch (e: any) {
      alert("Error rejecting request: " + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredLeaves = leaves.filter((l) => {
    if (activeTab !== "ALL" && l.status !== activeTab) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (l.user.fullName || l.user.username || "").toLowerCase();
    const domain = (l.user.employmentProfile?.internshipDomain || "").toLowerCase();
    const id = (l.user.employmentProfile?.employeeId || "").toLowerCase();
    return name.includes(q) || domain.includes(q) || id.includes(q) || l.reason.toLowerCase().includes(q);
  });

  const pendingCount = leaves.filter((l) => l.status === "PENDING").length;
  const approvedCount = leaves.filter((l) => l.status === "APPROVED").length;
  const rejectedCount = leaves.filter((l) => l.status === "REJECTED").length;

  return (
    <TeamCoreShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500">
                <Calendar className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white font-orbitron">
                  LEAVE APPROVAL CENTER
                </h1>
                <p className="text-xs text-white/50 tracking-wider font-mono">
                  MANAGE INTERN & TEAM LEAVE APPLICATIONS • REALTIME CORE SYNC
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchLeaves}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-semibold font-mono transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              REFRESH
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/5 relative overflow-hidden">
            <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">PENDING REVIEW</span>
            <div className="text-3xl font-black font-orbitron text-amber-400 mt-2">{pendingCount}</div>
            <div className="text-[11px] text-white/50 mt-1">Awaiting decision</div>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/5 relative overflow-hidden">
            <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">APPROVED</span>
            <div className="text-3xl font-black font-orbitron text-emerald-400 mt-2">{approvedCount}</div>
            <div className="text-[11px] text-white/50 mt-1">Leaves granted</div>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/5 relative overflow-hidden">
            <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">DECLINED</span>
            <div className="text-3xl font-black font-orbitron text-red-400 mt-2">{rejectedCount}</div>
            <div className="text-[11px] text-white/50 mt-1">Rejected with reason</div>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/5 relative overflow-hidden">
            <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">TOTAL LOGGED</span>
            <div className="text-3xl font-black font-orbitron text-white mt-2">{leaves.length}</div>
            <div className="text-[11px] text-white/50 mt-1">All time applications</div>
          </div>
        </div>

        {/* Filter Bar & Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/30 p-2 rounded-2xl border border-white/5">
          <div className="flex items-center gap-1 overflow-x-auto">
            {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                  activeTab === tab
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab} {tab === "PENDING" && pendingCount > 0 ? `(${pendingCount})` : ""}
              </button>
            ))}
          </div>

          <div className="relative min-w-[280px]">
            <Search className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search applicant, ID, domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/80 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-red-500/50"
            />
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="py-20 text-center text-white/50 flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-red-500" />
            <span className="font-mono text-xs">Loading leave requests from CodeXa Core...</span>
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl bg-zinc-900/20">
            <CheckCircle2 className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white font-orbitron">NO LEAVE REQUESTS FOUND</h3>
            <p className="text-xs text-white/40 mt-1 font-mono">
              {activeTab === "PENDING" ? "All pending applications have been reviewed." : "No records matching current filters."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredLeaves.map((item) => {
              const startStr = item.startDate ? item.startDate.split("T")[0] : "";
              const endStr = item.endDate ? item.endDate.split("T")[0] : "";
              const applicantName = item.user.fullName || item.user.username;
              const empId = item.user.employmentProfile?.employeeId || "CXA-INT-2026";
              const domain = item.user.employmentProfile?.internshipDomain || item.user.role;

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  {/* Left: Applicant details */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-base text-white font-orbitron overflow-hidden shrink-0">
                      {item.user.profileMediaUrl ? (
                        <img src={item.user.profileMediaUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        applicantName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white font-orbitron">{applicantName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/5 text-white/60 border border-white/10">
                          {empId}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-red-950/40 text-red-400 border border-red-500/20">
                          {domain}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-white/60 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-white/40" />
                          {startStr} → {endStr}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-white/80">
                          {item.leaveType}
                        </span>
                      </div>

                      <p className="text-xs text-white/70 bg-black/30 p-2.5 rounded-lg border border-white/5 mt-2 max-w-xl">
                        "{item.reason}"
                      </p>

                      {item.reviewNotes && (
                        <p className="text-[11px] text-white/50 italic mt-1">
                          Review notes: {item.reviewNotes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {item.status === "PENDING" ? (
                      isLeadership && (
                        <>
                          <button
                            onClick={() => handleApprove(item.id)}
                            disabled={actionLoading === item.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono transition-all disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            APPROVE
                          </button>
                          <button
                            onClick={() => {
                              setRejectModalItem(item);
                              setRejectReason("");
                            }}
                            disabled={actionLoading === item.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 text-xs font-bold font-mono transition-all disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            DECLINE
                          </button>
                        </>
                      )
                    ) : (
                      <span
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono border ${
                          item.status === "APPROVED"
                            ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/30"
                            : "bg-red-950/40 text-red-400 border-red-500/30"
                        }`}
                      >
                        {item.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rejection Modal */}
        {rejectModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold font-orbitron text-white">DECLINE LEAVE APPLICATION</h3>
                <button
                  onClick={() => setRejectModalItem(null)}
                  className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-white/60">
                Provide a reason for declining leave request for{" "}
                <strong className="text-white">
                  {rejectModalItem.user.fullName || rejectModalItem.user.username}
                </strong>
                . This reason will be dispatched to the applicant.
              </p>

              <textarea
                rows={3}
                placeholder="Reason for decline (e.g., Critical project sprint deadline, Insufficient leave notice)..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-red-500/50"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setRejectModalItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-white/60 hover:text-white"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading === rejectModalItem.id}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-mono transition-all disabled:opacity-50"
                >
                  CONFIRM DECLINE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TeamCoreShell>
  );
}
