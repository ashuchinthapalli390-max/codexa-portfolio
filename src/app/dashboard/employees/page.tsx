"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { useAuth } from "@/context/AuthContext";
import {
  Briefcase,
  Users,
  Search,
  Filter,
  ShieldAlert,
  UserCheck,
  UserX,
  Plus,
  Eye,
  Calendar,
  X,
  CreditCard,
  Building,
  GraduationCap
} from "lucide-react";
import { hasPermission, Permission, getEffectiveRole } from "@/lib/permissions";

export default function EmployeesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Member Detail / Offboard Drawer State
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);

  const canManage = user && hasPermission(user, Permission.MANAGE_EMPLOYEES);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("type", "EMPLOYEE");
      if (selectedDept) params.append("department", selectedDept);
      if (selectedStatus) params.append("status", selectedStatus);
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
    loadEmployees();
  }, [selectedDept, selectedStatus]);

  const handleDeactivateMember = async (userId: string) => {
    setDeactivating(true);
    try {
      const res = await fetch(`/api/employment/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deactivate", status: "TERMINATED" }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setDeactivateConfirmOpen(false);
        setSelectedMember(null);
        loadEmployees();
      } else {
        alert(data.error || "Failed to deactivate member.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <TeamCoreShell
      title="Employee Operations"
      subtitle="CodeXa core engineering staff, employment profiles, and lifecycle management"
      actions={
        canManage ? (
          <Link
            href="/dashboard/accounts?action=create"
            className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-crimson/25 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Provision Employee
          </Link>
        ) : null
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* FILTERS & SEARCH */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadEmployees()}
              placeholder="Search by name, ID, or title..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-crimson"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-crimson"
            >
              <option value="">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="AI & Robotics">AI & Robotics</option>
              <option value="Security">Cybersecurity</option>
              <option value="Operations">Operations</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-crimson"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>
        </div>

        {/* EMPLOYEES TABLE */}
        <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 backdrop-blur-xl">
          {profiles.length === 0 ? (
            <div className="py-16 text-center text-xs font-mono text-neutral-500">
              No employees matched the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-neutral-950/80 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
                  <tr>
                    <th className="p-3">Staff Name</th>
                    <th className="p-3">Employee ID</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Designation</th>
                    <th className="p-3">Reporting Lead</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {profiles.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-800/30">
                      <td className="p-3 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center text-xs font-bold text-bright-red">
                            {p.user?.displayName?.[0] || "E"}
                          </div>
                          <div>
                            <div>{p.user?.displayName}</div>
                            <div className="text-[10px] text-neutral-500">@{p.user?.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-emerald-400 font-bold">{p.employeeId}</td>
                      <td className="p-3 text-neutral-300">{p.department}</td>
                      <td className="p-3 text-neutral-400">{p.designation}</td>
                      <td className="p-3 text-neutral-400">{p.reportingTo || "Engineering Lead"}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            p.status === "ACTIVE"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : p.status === "ON_LEAVE"
                              ? "bg-blue-500/15 text-blue-400"
                              : "bg-red-500/15 text-red-400"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedMember(p)}
                          className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[10px] font-mono transition-all"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MEMBER DETAILS / OFFBOARDING DRAWER */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-neutral-900 border border-neutral-800 p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedMember(null)}
              className="absolute top-6 right-6 p-1.5 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-crimson/15 border border-crimson/30 flex items-center justify-center text-bright-red font-orbitron font-bold text-lg">
                {selectedMember.user?.displayName?.[0] || "E"}
              </div>
              <div>
                <h3 className="text-base font-orbitron font-bold text-white">
                  {selectedMember.user?.displayName}
                </h3>
                <p className="text-xs font-mono text-neutral-400">
                  {selectedMember.employeeId} &bull; {selectedMember.designation}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-500 block text-[10px]">Department</span>
                <span className="text-white font-bold">{selectedMember.department}</span>
              </div>
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-500 block text-[10px]">Status</span>
                <span className="text-emerald-400 font-bold">{selectedMember.status}</span>
              </div>
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-500 block text-[10px]">Joining Date</span>
                <span className="text-white">{new Date(selectedMember.joiningDate).toLocaleDateString()}</span>
              </div>
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-500 block text-[10px]">Salary Cycle</span>
                <span className="text-white">{selectedMember.salaryCycle}</span>
              </div>
              {selectedMember.basicSalary && (
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 col-span-2">
                  <span className="text-neutral-500 block text-[10px]">Basic Salary</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    ₹{selectedMember.basicSalary.toLocaleString()} INR
                  </span>
                </div>
              )}
            </div>

            {/* OFFBOARDING / DEACTIVATE ACTION (Section 47 & 52) */}
            {canManage && selectedMember.status !== "TERMINATED" && (
              <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/30 space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono text-red-400 font-bold uppercase">
                  <ShieldAlert className="w-4 h-4 text-bright-red" />
                  Offboarding / Deactivate Member
                </div>
                <p className="text-[11px] text-neutral-400 font-sans">
                  Deactivating this member revokes active web sessions and desktop AI licenses immediately while preserving historical payroll, attendance, and audit records.
                </p>

                {deactivateConfirmOpen ? (
                  <div className="space-y-2 pt-2 border-t border-red-500/20">
                    <p className="text-xs text-white font-bold font-mono">Confirm member deactivation?</p>
                    <div className="flex gap-2">
                      <button
                        disabled={deactivating}
                        onClick={() => handleDeactivateMember(selectedMember.userId)}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase"
                      >
                        {deactivating ? "Deactivating..." : "Yes, Execute Deactivation"}
                      </button>
                      <button
                        onClick={() => setDeactivateConfirmOpen(false)}
                        className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeactivateConfirmOpen(true)}
                    className="w-full py-2 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 text-xs font-orbitron font-bold uppercase tracking-wider transition-all"
                  >
                    Deactivate Member
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </TeamCoreShell>
  );
}
