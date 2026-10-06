"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { useAuth } from "@/context/AuthContext";
import {
  CreditCard,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Download,
  Plus,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  ChevronRight,
  Printer,
  X
} from "lucide-react";
import { hasPermission, Permission, getEffectiveRole } from "@/lib/permissions";

export default function PayrollPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>({ totalAmount: 0, paidAmount: 0, pendingAmount: 0, count: 0 });
  const [records, setRecords] = useState<any[]>([]);
  const [isSelfOnly, setIsSelfOnly] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [searchQuery, setSearchQuery] = useState("");

  // Payslip Modal State
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);
  const [currentPayslip, setCurrentPayslip] = useState<any>(null);
  const [loadingPayslip, setLoadingPayslip] = useState(false);

  // Create Payroll Entry Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [newUserId, setNewUserId] = useState("");
  const [newPeriod, setNewPeriod] = useState("October 2026");
  const [newMonth, setNewMonth] = useState("10");
  const [newYear, setNewYear] = useState("2026");
  const [newBasic, setNewBasic] = useState("25000");
  const [newAllowances, setNewAllowances] = useState("0");
  const [newBonus, setNewBonus] = useState("0");
  const [newDeductions, setNewDeductions] = useState("0");
  const [submittingCreate, setSubmittingCreate] = useState(false);

  const canManagePayroll = user && hasPermission(user, Permission.MANAGE_PAYROLL);
  const canVerifyPayments = user && hasPermission(user, Permission.VERIFY_PAYMENTS);
  const canApprovePayments = user && hasPermission(user, Permission.APPROVE_PAYMENTS);

  const loadPayroll = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedMonth) params.append("month", selectedMonth);
      if (selectedYear) params.append("year", selectedYear);

      const res = await fetch(`/api/payroll?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.records || []);
        setSummary(data.summary || {});
        setIsSelfOnly(Boolean(data.isSelfOnly));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayroll();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (canManagePayroll) {
      fetch("/api/owner/accounts")
        .then((r) => r.json())
        .then((d) => {
          if (d.accounts) setAllUsers(d.accounts);
        })
        .catch(() => {});
    }
  }, [canManagePayroll]);

  const handleOpenPayslip = async (payrollId: string) => {
    setLoadingPayslip(true);
    setPayslipModalOpen(true);
    try {
      const res = await fetch(`/api/payroll/${payrollId}/payslip`);
      const data = await res.json();
      if (data.success) {
        setCurrentPayslip(data.payslip);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPayslip(false);
    }
  };

  const handleAction = async (recordId: string, action: "verify" | "approve" | "pay") => {
    try {
      const res = await fetch(`/api/payroll/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        loadPayroll();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserId) return;
    setSubmittingCreate(true);
    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: newUserId,
          period: newPeriod,
          month: parseInt(newMonth, 10),
          year: parseInt(newYear, 10),
          basicAmount: parseFloat(newBasic) || 0,
          allowances: parseFloat(newAllowances) || 0,
          bonus: parseFloat(newBonus) || 0,
          deductions: parseFloat(newDeductions) || 0,
        }),
      });
      if (res.ok) {
        setCreateModalOpen(false);
        loadPayroll();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingCreate(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = r.user?.displayName?.toLowerCase() || "";
    const empId = r.user?.employmentProfile?.employeeId?.toLowerCase() || "";
    return name.includes(q) || empId.includes(q) || r.period?.toLowerCase().includes(q);
  });

  return (
    <TeamCoreShell
      title="Payments & Payroll"
      subtitle="Compensation records, disbursement approvals, and official payslip generation"
      actions={
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/payroll/calendar"
            className="px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs font-mono text-neutral-300 hover:text-white transition-all flex items-center gap-2"
          >
            <Calendar className="w-3.5 h-3.5 text-bright-red" /> Payroll Calendar
          </Link>
          {canManagePayroll && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-crimson/25 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Create Payroll Entry
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1">
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">
              {isSelfOnly ? "My Net Compensation" : "Total Payroll Cycle"}
            </span>
            <span className="text-2xl font-orbitron font-black text-white">
              {isSelfOnly && (!summary.count || summary.totalAmount === 0)
                ? "Not Configured"
                : `₹${(summary.totalAmount || 0).toLocaleString()}`}
            </span>
            <span className="text-[10px] font-mono text-neutral-500 block">
              {isSelfOnly && (!summary.count || summary.totalAmount === 0)
                ? "Pending HR Update"
                : `${summary.count || 0} Entries Tracked`}
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1">
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">
              Disbursed (Paid)
            </span>
            <span className="text-2xl font-orbitron font-black text-emerald-400">
              ₹{summary.paidAmount.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-emerald-500/80 block">Completed Payouts</span>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1">
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">
              Pending / Scheduled
            </span>
            <span className="text-2xl font-orbitron font-black text-amber-400">
              ₹{summary.pendingAmount.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-amber-500/80 block">Under Verification / Approval</span>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1">
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">
              Next Salary Date
            </span>
            <span className="text-lg font-orbitron font-bold text-white block mt-1">
              05 November 2026
            </span>
            <span className="text-[10px] font-mono text-neutral-400 block">Expected Cycle Payout</span>
          </div>
        </div>

        {/* LEDGER TABLE & CONTROLS */}
        <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 backdrop-blur-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-crimson/15 border border-crimson/30 flex items-center justify-center text-bright-red">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-orbitron font-bold text-white uppercase">
                  {isSelfOnly ? "My Payment History" : "Agency Compensation Ledger"}
                </h3>
                <p className="text-xs font-mono text-neutral-400">
                  {isSelfOnly ? "Access monthly statements and downloadable payslips" : "HR verification and leadership approval management"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!isSelfOnly && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search member or ID..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-crimson"
                  />
                </div>
              )}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-crimson"
              >
                <option value="">All Months</option>
                <option value="10">October</option>
                <option value="9">September</option>
                <option value="8">August</option>
              </select>
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-neutral-500">
              No payroll records found for this criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-neutral-950/80 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
                  <tr>
                    {!isSelfOnly && <th className="p-3">Staff Member</th>}
                    <th className="p-3">Period</th>
                    <th className="p-3">Basic / Stipend</th>
                    <th className="p-3">Allowances</th>
                    <th className="p-3">Deductions</th>
                    <th className="p-3 font-bold text-white">Net Pay</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-neutral-800/30">
                      {!isSelfOnly && (
                        <td className="p-3">
                          <div className="font-bold text-white">
                            {r.user?.displayName || "Member"}
                          </div>
                          <div className="text-[10px] text-neutral-500">
                            {r.user?.employmentProfile?.employeeId || r.user?.role}
                          </div>
                        </td>
                      )}
                      <td className="p-3 text-neutral-300 font-medium">{r.period}</td>
                      <td className="p-3 text-neutral-400">₹{r.basicAmount.toLocaleString()}</td>
                      <td className="p-3 text-neutral-400">+₹{r.allowances.toLocaleString()}</td>
                      <td className="p-3 text-red-400/80">-₹{r.deductions.toLocaleString()}</td>
                      <td className="p-3 font-orbitron font-bold text-white">
                        ₹{r.netAmount.toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                            r.status === "PAID"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : r.status === "APPROVED"
                              ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                              : r.status === "VERIFIED"
                              ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* HR Verification Button */}
                          {canVerifyPayments && r.status === "SCHEDULED" && (
                            <button
                              onClick={() => handleAction(r.id, "verify")}
                              className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/40 text-[10px] font-bold uppercase transition-all"
                            >
                              Verify
                            </button>
                          )}

                          {/* Founder Approval Button */}
                          {canApprovePayments && r.status === "VERIFIED" && (
                            <button
                              onClick={() => handleAction(r.id, "approve")}
                              className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/40 text-[10px] font-bold uppercase transition-all"
                            >
                              Approve
                            </button>
                          )}

                          {/* Disburse Button */}
                          {canApprovePayments && (r.status === "APPROVED" || r.status === "VERIFIED") && (
                            <button
                              onClick={() => handleAction(r.id, "pay")}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40 text-[10px] font-bold uppercase transition-all"
                            >
                              Disburse (Pay)
                            </button>
                          )}

                          {/* Download Payslip Button */}
                          <button
                            onClick={() => handleOpenPayslip(r.id)}
                            className="px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white text-[10px] font-mono flex items-center gap-1 transition-all"
                          >
                            <FileText className="w-3 h-3 text-bright-red" /> Payslip
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* OFFICIAL PAYSLIP MODAL */}
      {payslipModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-neutral-900 border border-neutral-800 p-6 sm:p-10 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setPayslipModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            {loadingPayslip ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-crimson border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-mono text-neutral-400 uppercase">Generating Official Payslip...</p>
              </div>
            ) : currentPayslip ? (
              <div id="payslip-document" className="space-y-6 text-white">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-neutral-800 pb-6">
                  <div>
                    <h2 className="text-xl font-orbitron font-black uppercase tracking-wider text-white">
                      CODEXA AGENCY
                    </h2>
                    <p className="text-[11px] font-mono text-neutral-400">
                      Official Monthly Compensation Slip &bull; {currentPayslip.payPeriod}
                    </p>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="text-neutral-500 block text-[10px] uppercase">Slip Reference</span>
                    <span className="text-bright-red font-bold">{currentPayslip.slipNumber}</span>
                  </div>
                </div>

                {/* Employee Info Grid */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-xs font-mono">
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase">Staff Name</span>
                    <span className="font-bold text-white">{currentPayslip.employee.name}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase">Employee / Intern ID</span>
                    <span className="font-bold text-emerald-400">{currentPayslip.employee.employeeId}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase">Department / Role</span>
                    <span>{currentPayslip.employee.department} &bull; {currentPayslip.employee.designation}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase">Disbursement Account</span>
                    <span>{currentPayslip.employee.bankAccountMasked}</span>
                  </div>
                </div>

                {/* Earnings & Deductions Breakdown */}
                <div className="space-y-3 font-mono text-xs">
                  <h4 className="font-orbitron font-bold text-xs uppercase text-neutral-400 tracking-wider">
                    Earnings Breakdown
                  </h4>
                  <div className="divide-y divide-neutral-800 border-y border-neutral-800">
                    <div className="py-2.5 flex justify-between">
                      <span className="text-neutral-400">Basic Salary / Stipend</span>
                      <span>₹{currentPayslip.financials.basicSalaryOrStipend.toLocaleString()}</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-neutral-400">Allowances & Remote Perks</span>
                      <span>+₹{currentPayslip.financials.allowances.toLocaleString()}</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-neutral-400">Performance Bonus</span>
                      <span>+₹{currentPayslip.financials.bonus.toLocaleString()}</span>
                    </div>
                    <div className="py-2.5 flex justify-between text-red-400">
                      <span>Deductions & Adjustments</span>
                      <span>-₹{currentPayslip.financials.deductions.toLocaleString()}</span>
                    </div>
                    <div className="py-3 flex justify-between text-sm font-bold bg-neutral-950/60 px-3 rounded-xl mt-2">
                      <span className="font-orbitron uppercase text-white">Net Take Home Pay</span>
                      <span className="font-orbitron text-emerald-400">₹{currentPayslip.financials.netPay.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Sign-off & Audit */}
                <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800/80 text-[11px] font-mono text-neutral-400 flex items-center justify-between">
                  <div>
                    <span className="block text-neutral-500 text-[10px]">Authorization</span>
                    <span>Verified By: {currentPayslip.disbursement.verifiedBy || "HR Lead"}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-neutral-500 text-[10px]">Status</span>
                    <span className="text-emerald-400 font-bold uppercase">{currentPayslip.disbursement.status}</span>
                  </div>
                </div>

                {/* Print Trigger */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                  <button
                    onClick={() => window.print()}
                    className="px-5 py-2.5 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-crimson/25 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* CREATE PAYROLL ENTRY MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-neutral-900 border border-neutral-800 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <h3 className="text-base font-orbitron font-bold text-white uppercase">
                New Payroll Entry
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1">
                  Staff Member
                </label>
                <select
                  required
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs focus:outline-none focus:border-crimson"
                >
                  <option value="">Select Staff...</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} (@{u.username}) &bull; {u.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Month
                  </label>
                  <select
                    value={newMonth}
                    onChange={(e) => setNewMonth(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs"
                  >
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Year
                  </label>
                  <input
                    type="text"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Basic Salary / Stipend (₹)
                  </label>
                  <input
                    type="number"
                    value={newBasic}
                    onChange={(e) => setNewBasic(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Allowances (₹)
                  </label>
                  <input
                    type="number"
                    value={newAllowances}
                    onChange={(e) => setNewAllowances(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Bonus (₹)
                  </label>
                  <input
                    type="number"
                    value={newBonus}
                    onChange={(e) => setNewBonus(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Deductions (₹)
                  </label>
                  <input
                    type="number"
                    value={newDeductions}
                    onChange={(e) => setNewDeductions(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-xs font-mono text-neutral-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-5 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase transition-all shadow-lg shadow-crimson/25"
                >
                  {submittingCreate ? "Creating..." : "Save Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </TeamCoreShell>
  );
}
