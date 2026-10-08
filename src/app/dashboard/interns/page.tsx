"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { useAuth } from "@/context/AuthContext";
import {
  GraduationCap,
  Users,
  Search,
  Filter,
  ShieldAlert,
  UserCheck,
  Plus,
  Eye,
  Calendar,
  X,
  CreditCard,
  Building,
  CheckCircle2,
} from "lucide-react";
import { hasPermission, Permission, getEffectiveRole } from "@/lib/permissions";
import { INTERNSHIP_DOMAINS } from "@/lib/internships/domains";

export default function InternsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("");

  // Intern Detail State
  const [selectedIntern, setSelectedIntern] = useState<any>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

  const canManage = user && hasPermission(user, Permission.MANAGE_INTERNS);

  const formatDate = (val: any): string => {
    if (!val) return "—";
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
    } catch {
      return "—";
    }
  };

  const handleSendReminder = async (userId: string) => {
    setSendingReminder(true);
    try {
      const res = await fetch(`/api/admin/interns/${userId}/payment-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to dispatch reminder.");
      } else {
        alert("Daily ₹450 reminder sent via Resend Email and Web Push!");
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSendingReminder(false);
    }
  };

  const loadInterns = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("type", "INTERN");
      if (selectedStatus) params.append("status", selectedStatus);
      if (selectedDomain) params.append("domain", selectedDomain);
      if (selectedDuration) params.append("duration", selectedDuration);
      if (searchQuery) params.append("search", searchQuery);

      const res = await fetch(`/api/employment?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setProfiles(data.profiles || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInterns();
  }, [selectedStatus, selectedDomain, selectedDuration]);

  const handleDeactivateIntern = async (userId: string, targetStatus: "COMPLETED" | "TERMINATED") => {
    setDeactivating(true);
    try {
      const res = await fetch(`/api/employment/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deactivate", status: targetStatus }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setDeactivateConfirmOpen(false);
        setSelectedIntern(null);
        loadInterns();
      } else {
        alert(data.error || "Failed to update internship status.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <TeamCoreShell
      title="Internship Program"
      subtitle="CodeXa technical interns, domain tracks, mentorship, and graduation status"
      actions={
        canManage ? (
          <Link
            href="/dashboard/accounts?action=create"
            className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-crimson/25 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Provision Intern Account
          </Link>
        ) : null
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* FILTERS & SEARCH */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadInterns()}
              placeholder="Search by intern name, ID, domain, college, reference..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-crimson"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Domain Filter */}
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-crimson"
            >
              <option value="">All Domains ({INTERNSHIP_DOMAINS.length})</option>
              <optgroup label="2 Months Tracks">
                {INTERNSHIP_DOMAINS.filter((d) => d.durationMonths === 2).map((d) => (
                  <option key={d.key} value={d.label}>
                    {d.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="3 Months Tracks (FSD up to 4m)">
                {INTERNSHIP_DOMAINS.filter((d) => d.durationMonths === 3).map((d) => (
                  <option key={d.key} value={d.label}>
                    {d.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="6 Months Tracks">
                {INTERNSHIP_DOMAINS.filter((d) => d.durationMonths === 6).map((d) => (
                  <option key={d.key} value={d.label}>
                    {d.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="9 Months Tracks">
                {INTERNSHIP_DOMAINS.filter((d) => d.durationMonths === 9).map((d) => (
                  <option key={d.key} value={d.label}>
                    {d.label}
                  </option>
                ))}
              </optgroup>
            </select>

            {/* Duration Filter */}
            <select
              value={selectedDuration}
              onChange={(e) => setSelectedDuration(e.target.value)}
              className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-crimson"
            >
              <option value="">All Durations</option>
              <option value="2 Months">2 Months</option>
              <option value="3 Months">3 Months</option>
              <option value="6 Months">6 Months</option>
              <option value="9 Months">9 Months</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-crimson"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Graduated / Completed</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>
        </div>

        {/* INTERNS TABLE */}
        <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 backdrop-blur-xl">
          {profiles.length === 0 ? (
            <div className="py-16 text-center text-xs font-mono text-neutral-500">
              No interns matched the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-neutral-950/80 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
                  <tr>
                    <th className="p-3">Intern ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Domain</th>
                    <th className="p-3">Duration</th>
                    <th className="p-3">Start Date</th>
                    <th className="p-3">End Date</th>
                    <th className="p-3">Designation</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {profiles.map((p) => {
                    const dispDuration = p.internshipDuration || (p.internshipDurationMonths ? `${p.internshipDurationMonths} Months` : "—");
                    const dispDomain = p.internshipDomain || p.department || "—";
                    const dispStart = formatDate(p.internshipStartDate || p.joiningDate);
                    const dispEnd = formatDate(p.internshipEndDate || p.endDate);

                    return (
                      <tr key={p.id} className="hover:bg-neutral-800/30">
                        <td className="p-3 text-emerald-400 font-bold whitespace-nowrap">{p.employeeId}</td>
                        <td className="p-3 font-bold text-white">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center text-xs font-bold text-emerald-400">
                              {p.user?.fullName?.[0] || p.user?.displayName?.[0] || "I"}
                            </div>
                            <div>
                              <div>{p.user?.fullName || p.user?.displayName}</div>
                              <div className="text-[10px] text-neutral-500">@{p.user?.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-neutral-200 font-medium">{dispDomain}</td>
                        <td className="p-3 text-neutral-400 whitespace-nowrap">{dispDuration}</td>
                        <td className="p-3 text-neutral-400 whitespace-nowrap">{dispStart}</td>
                        <td className="p-3 text-neutral-400 whitespace-nowrap">{dispEnd}</td>
                        <td className="p-3 text-neutral-300">{p.designation}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              p.status === "ACTIVE"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : p.status === "COMPLETED"
                                ? "bg-purple-500/15 text-purple-400"
                                : "bg-red-500/15 text-red-400"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedIntern(p)}
                            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[10px] font-mono transition-all"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* INTERN DETAILS DRAWER */}
      {selectedIntern && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl bg-neutral-900 border border-neutral-800 p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedIntern(null)}
              className="absolute top-6 right-6 p-1.5 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-orbitron font-bold text-lg">
                {selectedIntern.user?.fullName?.[0] || selectedIntern.user?.displayName?.[0] || "I"}
              </div>
              <div>
                <h3 className="text-base font-orbitron font-bold text-white">
                  {selectedIntern.user?.fullName || selectedIntern.user?.displayName}
                </h3>
                <p className="text-xs font-mono text-neutral-400">
                  {selectedIntern.employeeId} &bull; {selectedIntern.designation}
                </p>
                {selectedIntern.user?.email && (
                  <p className="text-[11px] font-mono text-neutral-500">
                    {selectedIntern.user.email} &bull; @{selectedIntern.user.username}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 col-span-2">
                <span className="text-neutral-500 block text-[10px] uppercase">Final Offer Domain</span>
                <span className="text-white font-bold text-sm">
                  {selectedIntern.internshipDomain || selectedIntern.department}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-500 block text-[10px] uppercase">Duration</span>
                <span className="text-white font-bold">
                  {selectedIntern.internshipDuration || (selectedIntern.internshipDurationMonths ? `${selectedIntern.internshipDurationMonths} Months` : "—")}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-500 block text-[10px] uppercase">Status</span>
                <span className="text-emerald-400 font-bold">{selectedIntern.status}</span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-500 block text-[10px] uppercase">Start Date</span>
                <span className="text-white">
                  {formatDate(selectedIntern.internshipStartDate || selectedIntern.joiningDate)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-500 block text-[10px] uppercase">End Date</span>
                <span className="text-white">
                  {formatDate(selectedIntern.internshipEndDate || selectedIntern.endDate)}
                </span>
              </div>

              {selectedIntern.college && (
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 col-span-2">
                  <span className="text-neutral-500 block text-[10px] uppercase">College & Location</span>
                  <span className="text-neutral-200">
                    {selectedIntern.college}
                    {selectedIntern.collegeLocation ? ` (${selectedIntern.collegeLocation})` : ""}
                  </span>
                </div>
              )}

              {(selectedIntern.yearOfStudy || selectedIntern.academicBranch) && (
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 col-span-2">
                  <span className="text-neutral-500 block text-[10px] uppercase">Academic Details</span>
                  <span className="text-neutral-300">
                    {[selectedIntern.yearOfStudy, selectedIntern.academicBranch].filter(Boolean).join(" • ")}
                  </span>
                </div>
              )}

              {selectedIntern.referenceNumber && (
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  <span className="text-neutral-500 block text-[10px] uppercase">Reference Number</span>
                  <span className="text-neutral-300">{selectedIntern.referenceNumber}</span>
                </div>
              )}

              {selectedIntern.phone && (
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  <span className="text-neutral-500 block text-[10px] uppercase">Contact Phone</span>
                  <span className="text-neutral-300">{selectedIntern.phone}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 col-span-2 flex items-center justify-between">
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase">Mandatory Service Fee</span>
                  <span className="font-bold text-xs text-white">₹450 (ID Card ₹150 + AI Tools ₹300)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedIntern.user?.internServicePaymentPaid
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {selectedIntern.user?.internServicePaymentPaid ? "PAID" : "PENDING"}
                  </span>
                  {!selectedIntern.user?.internServicePaymentPaid && canManage && (
                    <button
                      onClick={() => handleSendReminder(selectedIntern.userId)}
                      disabled={sendingReminder}
                      className="px-2.5 py-1 rounded-lg bg-crimson hover:bg-bright-red text-white text-[10px] font-bold uppercase transition-all disabled:opacity-50"
                    >
                      {sendingReminder ? "Sending..." : "Send Reminder"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* LIFECYCLE CONTROLS (Complete / Offboard) */}
            {canManage && selectedIntern.status === "ACTIVE" && (
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <span className="text-xs font-mono text-neutral-400 font-bold uppercase block">
                  Internship Lifecycle Actions
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleDeactivateIntern(selectedIntern.userId, "COMPLETED")}
                    className="py-2 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 border border-purple-500/30 text-xs font-orbitron font-bold uppercase transition-all"
                  >
                    Mark Completed (Graduate)
                  </button>
                  <button
                    onClick={() => handleDeactivateIntern(selectedIntern.userId, "TERMINATED")}
                    className="py-2 px-3 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 text-xs font-orbitron font-bold uppercase transition-all"
                  >
                    Terminate Intern
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </TeamCoreShell>
  );
}
