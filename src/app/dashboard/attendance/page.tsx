"use client";

import React, { useState, useEffect } from "react";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { useAuth } from "@/context/AuthContext";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Square,
  Plus,
  RefreshCw,
  Smartphone,
  Shield,
  FileCheck,
  Check,
  X,
  History
} from "lucide-react";
import { hasPermission, Permission, getEffectiveRole } from "@/lib/permissions";

export default function AttendanceDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [activeWindow, setActiveWindow] = useState<any>(null);
  const [corrections, setCorrections] = useState<any[]>([]);

  // Correction Modal State
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [correctionDate, setCorrectionDate] = useState("");
  const [correctionReasonType, setCorrectionReasonType] = useState("Network issue");
  const [correctionNotes, setCorrectionNotes] = useState("");
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  // Admin Window Open State
  const [windowDuration, setWindowDuration] = useState("30");
  const [managingWindow, setManagingWindow] = useState(false);

  const canManage =
    user &&
    (hasPermission(user, Permission.OPEN_ATTENDANCE_WINDOW) ||
      hasPermission(user, Permission.MANAGE_ATTENDANCE));

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load attendance stats & records
      const recRes = await fetch("/api/attendance/records");
      const recData = await recRes.json();
      if (recData.success) {
        setStats(recData.stats);
        setRecords(recData.records || []);
      }

      // 2. Load attendance windows
      const winRes = await fetch("/api/attendance/windows");
      const winData = await winRes.json();
      if (winData.success) {
        setActiveWindow(winData.activeWindow || null);
      }

      // 3. Load corrections
      const corrRes = await fetch("/api/attendance/corrections");
      const corrData = await corrRes.json();
      if (corrData.success) {
        setCorrections(corrData.corrections || []);
      }
    } catch (e) {
      console.error("Failed to load attendance data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenWindow = async () => {
    setManagingWindow(true);
    try {
      const res = await fetch("/api/attendance/windows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationMinutes: parseInt(windowDuration, 10) }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveWindow(data.window);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setManagingWindow(false);
    }
  };

  const handleUpdateWindow = async (action: string, extendMinutes?: number) => {
    if (!activeWindow) return;
    setManagingWindow(true);
    try {
      const res = await fetch("/api/attendance/windows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeWindow.id,
          action,
          extendMinutes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveWindow(action === "close" || action === "cancel" ? null : data.window);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setManagingWindow(false);
    }
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionDate) return;
    setSubmittingCorrection(true);
    try {
      const fullReason = `${correctionReasonType}${correctionNotes ? `: ${correctionNotes}` : ""}`;
      const res = await fetch("/api/attendance/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: correctionDate,
          reason: fullReason,
          requestedStatus: "PRESENT",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCorrectionModalOpen(false);
        setCorrectionDate("");
        setCorrectionNotes("");
        loadData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingCorrection(false);
    }
  };

  const handleReviewCorrection = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch("/api/attendance/corrections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <TeamCoreShell
      title="Attendance & Operations"
      subtitle="Monthly attendance metrics, session management, and verification compliance"
      actions={
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCorrectionModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-crimson/50 text-xs font-mono text-neutral-300 hover:text-white transition-all flex items-center gap-2"
          >
            <History className="w-3.5 h-3.5 text-bright-red" /> Request Correction
          </button>
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      }
    >
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Banner: Strict Mobile Attendance Rule */}
        <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-crimson/15 border border-crimson/30 flex items-center justify-center text-bright-red shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="text-xs space-y-1">
            <span className="font-orbitron font-bold text-white uppercase tracking-wider">
              Attendance Policy & Mobile Marking
            </span>
            <p className="text-neutral-400 leading-relaxed font-sans">
              Per agency operating rules, live attendance check-ins are performed exclusively via the{" "}
              <span className="text-white font-medium">CodeXa Mobile App</span> during active sessions.
              The web portal provides full attendance analytics, payroll eligibility calculation, and dispute corrections.
            </p>
          </div>
        </div>

        {/* ADMIN WINDOW CONTROLS (Founder, Co-Founder, HR, CTO) */}
        {canManage && (
          <div className="rounded-3xl bg-neutral-900/80 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-orbitron font-bold text-white">
                    Attendance Window Controller
                  </h2>
                  <p className="text-xs font-mono text-neutral-400">
                    Remotely broadcast active check-in windows to the CodeXa Mobile App
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono uppercase tracking-widest ${
                  activeWindow
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                    : "bg-neutral-800 text-neutral-400"
                }`}
              >
                {activeWindow ? "SESSION ACTIVE" : "SESSION CLOSED"}
              </span>
            </div>

            {activeWindow ? (
              <div className="p-5 rounded-2xl bg-neutral-950/80 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 text-xs font-mono">
                  <div className="text-emerald-400 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    LIVE WINDOW OPEN
                  </div>
                  <p className="text-neutral-300">
                    Opened at: {new Date(activeWindow.startTime).toLocaleTimeString()} &bull; Closes:{" "}
                    <span className="text-white font-bold">{new Date(activeWindow.endTime).toLocaleTimeString()}</span>
                  </p>
                  <p className="text-neutral-500 text-[11px]">
                    Eligible: {JSON.stringify(activeWindow.eligibleRoles || ["EMPLOYEE", "INTERN"])}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={managingWindow}
                    onClick={() => handleUpdateWindow("extend", 10)}
                    className="px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-xs font-mono text-white transition-all"
                  >
                    +10 Min
                  </button>
                  <button
                    disabled={managingWindow}
                    onClick={() => handleUpdateWindow("extend", 30)}
                    className="px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-xs font-mono text-white transition-all"
                  >
                    +30 Min
                  </button>
                  <button
                    disabled={managingWindow}
                    onClick={() => handleUpdateWindow("close")}
                    className="px-4 py-2 rounded-xl bg-red-600/20 border border-red-500/40 hover:bg-red-600/40 text-xs font-orbitron font-bold uppercase text-red-300 transition-all flex items-center gap-1.5"
                  >
                    <Square className="w-3.5 h-3.5" /> Close Window
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-950/60 border border-neutral-800">
                <div className="space-y-1">
                  <p className="text-xs font-sans text-neutral-300 font-medium">
                    No active attendance session is currently broadcasting.
                  </p>
                  <p className="text-[11px] font-mono text-neutral-500">
                    Opening a window enables the &quot;Mark Present&quot; button in the mobile app for the chosen duration.
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <select
                    value={windowDuration}
                    onChange={(e) => setWindowDuration(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-crimson"
                  >
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes (Standard)</option>
                    <option value="60">60 Minutes</option>
                    <option value="120">2 Hours</option>
                  </select>
                  <button
                    disabled={managingWindow}
                    onClick={handleOpenWindow}
                    className="px-5 py-2.5 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-crimson/25 transition-all shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" /> Open Attendance Window
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MONTHLY STATS SUMMARY CARDS */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">
                Attendance Rate
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-orbitron font-black text-white">{stats.attendanceRate}%</span>
                <span className="text-[10px] font-mono text-neutral-400">/ 75% req</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold block ${
                  stats.attendanceRate >= 75 ? "text-emerald-400" : "text-bright-red"
                }`}
              >
                {stats.status}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">
                Present
              </span>
              <span className="text-2xl font-orbitron font-black text-emerald-400">{stats.present}</span>
              <span className="text-[10px] font-mono text-neutral-500 block">Days Marked</span>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">
                Absent
              </span>
              <span className="text-2xl font-orbitron font-black text-red-400">{stats.absent}</span>
              <span className="text-[10px] font-mono text-neutral-500 block">Days Unmarked</span>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">
                Late Marks
              </span>
              <span className="text-2xl font-orbitron font-black text-amber-400">{stats.late}</span>
              <span className="text-[10px] font-mono text-neutral-500 block">Window Overflow</span>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">
                Approved Leave
              </span>
              <span className="text-2xl font-orbitron font-black text-blue-400">{stats.leave}</span>
              <span className="text-[10px] font-mono text-neutral-500 block">Excused Absences</span>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">
                Payroll Effect
              </span>
              <span className="text-sm font-orbitron font-bold text-white block mt-1">
                {stats.payrollEffect}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 block">Eligible Cycle</span>
            </div>
          </div>
        )}

        {/* CORRECTION REQUESTS TABLE (HR / Admin Review or Member's own) */}
        {corrections.length > 0 && (
          <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 backdrop-blur-xl space-y-4">
            <h3 className="text-sm font-orbitron font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <History className="w-4 h-4 text-bright-red" />
              Attendance Dispute & Correction Requests
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-neutral-950/80 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
                  <tr>
                    <th className="p-3">Member</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Dispute Reason</th>
                    <th className="p-3">Requested Status</th>
                    <th className="p-3">Status</th>
                    {canManage && <th className="p-3 text-right">Review Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {corrections.map((c) => (
                    <tr key={c.id} className="hover:bg-neutral-800/30">
                      <td className="p-3 font-bold text-white">
                        {c.user?.displayName || "Member"} (@{c.user?.username || "user"})
                      </td>
                      <td className="p-3 text-neutral-300">
                        {new Date(c.date).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-neutral-400 max-w-xs truncate">{c.reason}</td>
                      <td className="p-3 text-emerald-400 font-bold">{c.requestedStatus}</td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                            c.status === "APPROVED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : c.status === "REJECTED"
                              ? "bg-red-500/10 text-red-400 border border-red-500/30"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      {canManage && (
                        <td className="p-3 text-right">
                          {c.status === "PENDING" ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleReviewCorrection(c.id, "APPROVED")}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 text-[10px] font-bold uppercase transition-all"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReviewCorrection(c.id, "REJECTED")}
                                className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/40 text-[10px] font-bold uppercase transition-all"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-neutral-500">Reviewed</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LOG OF ATTENDANCE RECORDS */}
        <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="text-sm font-orbitron font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-bright-red" />
              Recorded Attendance Logs ({records.length})
            </h3>
            <span className="text-[11px] font-mono text-neutral-400">
              Source: Mobile GPS/Session Client
            </span>
          </div>

          {records.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-neutral-500">
              No attendance marks recorded for the selected cycle yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-neutral-950/80 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Source Client</th>
                    <th className="p-3">Adjustment Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-neutral-800/30">
                      <td className="p-3 text-white font-medium">
                        {new Date(r.date).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-neutral-400">
                        {new Date(r.markedAt).toLocaleTimeString()}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.status === "PRESENT"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : r.status === "LATE"
                              ? "bg-amber-500/15 text-amber-400"
                              : r.status === "LEAVE"
                              ? "bg-blue-500/15 text-blue-400"
                              : "bg-red-500/15 text-red-400"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 text-neutral-400">{r.source || "MOBILE"}</td>
                      <td className="p-3 text-neutral-500">{r.editReason || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CORRECTION REQUEST MODAL */}
      {correctionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-neutral-900 border border-neutral-800 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <h3 className="text-base font-orbitron font-bold text-white uppercase">
                Attendance Dispute Request
              </h3>
              <button
                onClick={() => setCorrectionModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCorrection} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1">
                  Missed Session Date
                </label>
                <input
                  type="date"
                  required
                  value={correctionDate}
                  onChange={(e) => setCorrectionDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs focus:outline-none focus:border-crimson"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1">
                  Reason Category
                </label>
                <select
                  value={correctionReasonType}
                  onChange={(e) => setCorrectionReasonType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs focus:outline-none focus:border-crimson"
                >
                  <option value="Network issue">Network / Device connectivity issue</option>
                  <option value="Official work">Assigned to urgent client / official work</option>
                  <option value="Medical reason">Medical reason / Health emergency</option>
                  <option value="Other">Other genuine circumstance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1">
                  Explanation & Details
                </label>
                <textarea
                  rows={3}
                  value={correctionNotes}
                  onChange={(e) => setCorrectionNotes(e.target.value)}
                  placeholder="Provide context for HR review..."
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs focus:outline-none focus:border-crimson"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCorrectionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-xs font-mono text-neutral-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCorrection}
                  className="px-5 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase transition-all shadow-lg shadow-crimson/25"
                >
                  {submittingCorrection ? "Submitting..." : "Submit to HR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </TeamCoreShell>
  );
}
