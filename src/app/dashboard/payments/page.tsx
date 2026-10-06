"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CreditCard,
  QrCode,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Plus,
  RefreshCw,
  ExternalLink,
  Shield,
  FileText,
  User,
  Eye,
  Check,
  X,
  Copy,
  ChevronRight,
  TrendingUp,
  Settings,
  Users,
  Smartphone,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getEffectiveRole, hasPermission, Permission } from "@/lib/permissions";

interface PaymentItem {
  id: string;
  referenceId: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  employeeId: string | null;
  internId: string | null;
  domain: string | null;
  paymentPurpose: string;
  title: string;
  description: string | null;
  lineItems: any;
  fixedAmount: number;
  currency: string;
  paymentStatus: "PENDING_PAYMENT" | "PENDING_VERIFICATION" | "APPROVED" | "REJECTED" | "CANCELLED";
  dueDate: string | null;
  transactionId: string | null;
  utrNumber: string | null;
  paymentDate: string | null;
  paymentTime: string | null;
  upiApp: string | null;
  proofImageUrl: string | null;
  userNote: string | null;
  submittedAt: string | null;
  verifiedBy: string | null;
  verifiedByName: string | null;
  verifiedAt: string | null;
  rejectedBy: string | null;
  rejectedByName: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  adminNotes: string | null;
  createdAt: string;
  paymentAccount?: {
    name: string;
    upiId: string;
    payeeName: string;
  };
  submissions?: any[];
  user?: any;
}

export default function PaymentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, status } = useAuth();

  const [activeTab, setActiveTab] = useState<string>("queue");
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [verificationQueue, setVerificationQueue] = useState<PaymentItem[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [settingsData, setSettingsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [purposeFilter, setPurposeFilter] = useState("ALL");

  // Verification Review Modal State
  const [selectedReviewPayment, setSelectedReviewPayment] = useState<PaymentItem | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewAction, setReviewAction] = useState<"APPROVE" | "REJECT" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [reviewAdminNotes, setReviewAdminNotes] = useState("");
  const [duplicateWarnings, setDuplicateWarnings] = useState<any>({});

  // Single & Bulk Request Creator State
  const [creatorMode, setCreatorMode] = useState<"single" | "bulk">("bulk");
  const [createRole, setCreateRole] = useState("INTERN");
  const [createDomain, setCreateDomain] = useState("ALL");
  const [createSingleUserId, setCreateSingleUserId] = useState("");
  const [createTitle, setCreateTitle] = useState("Internship Service Fee");
  const [createAmount, setCreateAmount] = useState("450");
  const [createPurpose, setCreatePurpose] = useState("INTERNSHIP_FEE");
  const [createDescription, setCreateDescription] = useState(
    "Mandatory ID Card (₹150) + AI Dev Tools Pack (Shared) (₹300)"
  );
  const [createDueDate, setCreateDueDate] = useState("");
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createSuccessMessage, setCreateSuccessMessage] = useState("");

  const effectiveRole = getEffectiveRole(user);
  const canVerify = hasPermission(user, Permission.VERIFY_PAYMENT);
  const canManage = hasPermission(user, Permission.CREATE_PAYMENT_REQUEST);
  const canViewAll = hasPermission(user, Permission.VIEW_ALL_PAYMENTS);
  const canManageSettings = hasPermission(user, Permission.MANAGE_PAYMENT_SETTINGS);
  const isPrivileged = canVerify || canManage || canViewAll;

  const pendingPaymentItem = useMemo(() => {
    return payments.find((p) => p.paymentStatus === "PENDING_PAYMENT");
  }, [payments]);

  const pendingVerificationItem = useMemo(() => {
    return payments.find((p) => p.paymentStatus === "PENDING_VERIFICATION");
  }, [payments]);

  // Set default tab based on role
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    } else if (!isPrivileged) {
      setActiveTab("my-payments");
    } else {
      setActiveTab("queue");
    }
  }, [isPrivileged, searchParams]);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      setError(null);
      if (isPrivileged) {
        // Fetch queue, all payments, and analytics with fresh data
        const [queueRes, allRes, analyticsRes, settingsRes] = await Promise.all([
          fetch(`/api/payments/verification?purpose=${purposeFilter}&q=${encodeURIComponent(searchQuery)}`, {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
          }),
          fetch(
            `/api/payments?status=${statusFilter}&purpose=${purposeFilter}&q=${encodeURIComponent(
              searchQuery
            )}`,
            {
              cache: "no-store",
              headers: { "Cache-Control": "no-cache" },
            }
          ),
          fetch("/api/payments/analytics", {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
          }),
          fetch("/api/payments/settings", {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
          }),
        ]);

        if (queueRes.ok) {
          const qData = await queueRes.json();
          setVerificationQueue(qData.queue || []);
        }

        if (allRes.ok) {
          const aData = await allRes.json();
          setPayments(aData.payments || []);
        } else {
          const errData = await allRes.json().catch(() => ({}));
          setError(errData.error || "Failed to load payment records.");
        }

        if (analyticsRes.ok) {
          const anData = await analyticsRes.json();
          setAnalytics(anData);
        }

        if (settingsRes.ok) {
          const sData = await settingsRes.json();
          setSettingsData(sData);
        }
      } else {
        // Regular user: fetch own payments with filter and search support
        const res = await fetch(
          `/api/payments?status=${statusFilter}&purpose=${purposeFilter}&q=${encodeURIComponent(
            searchQuery
          )}`,
          {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
          }
        );
        if (res.ok) {
          const data = await res.json();
          setPayments(data.payments || []);
        } else {
          const errData = await res.json().catch(() => ({}));
          setError(errData.error || "Failed to load your payment records.");
        }
      }
    } catch (err: any) {
      console.error("Error fetching payment data:", err);
      setError(err?.message || "Network error loading payments.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    const timer = setTimeout(() => {
      fetchData();
    }, 250);
    return () => clearTimeout(timer);
  }, [status, statusFilter, purposeFilter, searchQuery]);

  // Open Review Details Modal for an item
  const openReviewModal = async (item: PaymentItem) => {
    setSelectedReviewPayment(item);
    setReviewAction(null);
    setRejectionReason("");
    setReviewAdminNotes("");
    setDuplicateWarnings({});

    try {
      const res = await fetch(`/api/payments/${item.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedReviewPayment(data.payment);
        setDuplicateWarnings(data.duplicateWarnings || {});
      }
    } catch (err) {
      console.error("Error loading payment detail:", err);
    }
  };

  // Submit Verification Decision
  const handleVerifyDecision = async (action: "APPROVE" | "REJECT") => {
    if (!selectedReviewPayment) return;
    if (action === "REJECT" && !rejectionReason.trim()) {
      alert("Please select or enter a rejection reason.");
      return;
    }

    try {
      setReviewLoading(true);
      const res = await fetch(`/api/payments/${selectedReviewPayment.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          rejectionReason: action === "REJECT" ? rejectionReason : undefined,
          adminNotes: reviewAdminNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to process verification.");
        return;
      }

      setSelectedReviewPayment(null);
      setReviewAction(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Network error while processing verification.");
    } finally {
      setReviewLoading(false);
    }
  };

  // Handle Dry Run for bulk request creation
  const handleDryRun = async () => {
    setSubmittingCreate(true);
    setDryRunResult(null);
    setCreateSuccessMessage("");

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isBulk: true,
          dryRun: true,
          targetRole: createRole,
          domain: createDomain,
          fixedAmount: createAmount,
          title: createTitle,
          description: createDescription,
          paymentPurpose: createPurpose,
          dueDate: createDueDate || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Dry run preview failed.");
        return;
      }
      setDryRunResult(data);
    } catch (err: any) {
      alert(err.message || "Failed to run preview.");
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Handle Execute Request Creation
  const handleExecuteCreate = async () => {
    setSubmittingCreate(true);
    setCreateSuccessMessage("");

    try {
      const isBulk = creatorMode === "bulk";
      const payload: any = {
        isBulk,
        fixedAmount: createAmount,
        title: createTitle,
        description: createDescription,
        paymentPurpose: createPurpose,
        dueDate: createDueDate || undefined,
      };

      if (isBulk) {
        payload.targetRole = createRole;
        payload.domain = createDomain;
      } else {
        payload.userId = createSingleUserId;
      }

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to create payment requests.");
        return;
      }

      setCreateSuccessMessage(
        isBulk
          ? `Successfully created ${data.createdCount} payment requests (Total: ₹${data.totalAmount})`
          : `Successfully created payment request ${data.payment.referenceId}!`
      );
      setDryRunResult(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Error creating payment requests.");
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Export CSV Report
  const handleExportCSV = () => {
    if (payments.length === 0) return;
    const headers = [
      "Reference ID",
      "User Name",
      "User Email",
      "Role",
      "Domain",
      "Purpose",
      "Amount (INR)",
      "Status",
      "Submitted At",
      "Payment Date",
      "UTR Number",
      "UPI App",
      "Verified By",
      "Verified At",
    ];

    const rows = payments.map((p) => [
      `"${p.referenceId}"`,
      `"${p.userName || ""}"`,
      `"${p.userEmail || ""}"`,
      `"${p.userRole || ""}"`,
      `"${p.domain || ""}"`,
      `"${p.paymentPurpose}"`,
      p.fixedAmount,
      `"${p.paymentStatus}"`,
      `"${p.submittedAt ? new Date(p.submittedAt).toLocaleDateString() : ""}"`,
      `"${p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : ""}"`,
      `"${p.utrNumber || ""}"`,
      `"${p.upiApp || ""}"`,
      `"${p.verifiedByName || ""}"`,
      `"${p.verifiedAt ? new Date(p.verifiedAt).toLocaleDateString() : ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `codexa_payments_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case "PENDING_VERIFICATION":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 border border-blue-500/30 text-blue-400">
            <Clock className="w-3.5 h-3.5" /> Pending Verification
          </span>
        );
      case "PENDING_PAYMENT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <CreditCard className="w-3.5 h-3.5" /> Pending Payment
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-crimson/15 border border-crimson/30 text-crimson">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-crimson/20 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-crimson/15 border border-crimson/30 text-bright-red">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-orbitron font-bold text-white tracking-wide">
                Manual UPI Payment & Verification
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                Zero-gateway manual UPI flow with proof screenshot verification and official audit trail
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#141414] hover:bg-[#1a1a1a] border border-white/10 text-xs font-medium text-zinc-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-bright-red" : ""}`} />
            Refresh
          </button>

          {isPrivileged && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-crimson/20 hover:bg-crimson/30 border border-crimson/40 text-xs font-medium text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* ─── PRIVILEGED TABS ────────────────────────────────────────────────── */}
      {isPrivileged && (
        <div className="flex items-center gap-1 border-b border-white/10 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("queue")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all ${
              activeTab === "queue"
                ? "bg-[#181818] text-white border-b-2 border-bright-red font-semibold"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Clock className="w-4 h-4 text-blue-400" />
            Verification Queue
            {verificationQueue.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">
                {verificationQueue.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all ${
              activeTab === "all"
                ? "bg-[#181818] text-white border-b-2 border-bright-red font-semibold"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <CreditCard className="w-4 h-4 text-zinc-300" />
            All Payments
          </button>

          {canManage && (
            <button
              onClick={() => setActiveTab("create")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all ${
                activeTab === "create"
                  ? "bg-[#181818] text-white border-b-2 border-bright-red font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              Create Request
            </button>
          )}

          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all ${
              activeTab === "analytics"
                ? "bg-[#181818] text-white border-b-2 border-bright-red font-semibold"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <TrendingUp className="w-4 h-4 text-amber-400" />
            Analytics & Reports
          </button>

          {canManageSettings && (
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all ${
                activeTab === "settings"
                  ? "bg-[#181818] text-white border-b-2 border-bright-red font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Settings className="w-4 h-4 text-purple-400" />
              UPI Settings
            </button>
          )}
        </div>
      )}

      {/* ─── TAB 1: VERIFICATION QUEUE ────────────────────────────────────── */}
      {isPrivileged && activeTab === "queue" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              Awaiting Verification ({verificationQueue.length})
            </h2>
            <span className="text-xs text-zinc-500">Ordered by earliest submitted</span>
          </div>

          {loading ? (
            <div className="p-12 text-center rounded-2xl bg-[#0f0f0f] border border-white/5 space-y-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-zinc-400">Loading verification queue...</p>
            </div>
          ) : verificationQueue.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#0f0f0f] border border-white/5">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/50 mx-auto mb-3" />
              <p className="text-sm text-zinc-300 font-medium">All Caught Up!</p>
              <p className="text-xs text-zinc-500 mt-1">There are no pending payment verifications at this time.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {verificationQueue.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-[#0f0f0f] border border-white/10 hover:border-blue-500/40 transition-all flex flex-col justify-between space-y-4 shadow-lg group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="font-mono text-xs font-bold text-bright-red bg-crimson/10 px-2.5 py-1 rounded-md border border-crimson/20">
                        {item.referenceId}
                      </span>
                      {getStatusBadge(item.paymentStatus)}
                    </div>

                    <h3 className="font-semibold text-white text-base group-hover:text-bright-red transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{item.description}</p>

                    <div className="mt-4 pt-3 border-t border-white/5 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="text-zinc-500">User:</span>
                        <span className="font-medium">{item.userName || item.userEmail}</span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="text-zinc-500">Role / Domain:</span>
                        <span>{item.userRole} &bull; {item.domain || "General"}</span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="text-zinc-500">Payable Amount:</span>
                        <span className="font-bold text-sm text-emerald-400">₹{item.fixedAmount.toLocaleString()}</span>
                      </div>
                      {item.utrNumber && (
                        <div className="flex items-center justify-between text-zinc-300">
                          <span className="text-zinc-500">UTR / Ref:</span>
                          <span className="font-mono text-zinc-200">{item.utrNumber}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-zinc-500 text-[11px]">
                        <span>Submitted:</span>
                        <span>{item.submittedAt ? new Date(item.submittedAt).toLocaleString() : "Just now"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center gap-2">
                    <button
                      onClick={() => openReviewModal(item)}
                      className="flex-1 py-2 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Review & Decide
                    </button>
                    <Link
                      href={`/dashboard/payments/${item.id}`}
                      className="p-2 rounded-xl bg-[#181818] hover:bg-[#202020] border border-white/10 text-zinc-400 hover:text-white transition-colors"
                      title="View Full Page"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2 / REGULAR USER: PAYMENTS LIST ─────────────────────────── */}
      {(!isPrivileged || activeTab === "all" || activeTab === "my-payments") && (
        <div className="space-y-4">
          {/* Active Payment Action Banner for Interns / Regular Users */}
          {!isPrivileged && pendingPaymentItem && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
                  <CreditCard className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                    <span>Payment Action Required</span>
                    <span className="font-mono text-white bg-black/40 px-2 py-0.5 rounded border border-white/10">
                      {pendingPaymentItem.referenceId}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1">
                    {pendingPaymentItem.title}: <strong className="text-emerald-400 font-mono">₹{pendingPaymentItem.fixedAmount}</strong>
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Mandatory ID Card (₹150) + AI Dev Tools Pack (Shared) (₹300)
                  </p>
                </div>
              </div>
              <Link
                href={`/dashboard/payments/${pendingPaymentItem.id}`}
                className="px-5 py-2.5 rounded-xl bg-bright-red hover:bg-bright-red/90 text-white text-xs font-bold shrink-0 text-center shadow-[0_0_15px_rgba(239,35,60,0.4)] transition-all flex items-center justify-center gap-1.5"
              >
                Pay Now via UPI &rarr;
              </Link>
            </div>
          )}

          {!isPrivileged && pendingVerificationItem && (
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center gap-3 text-xs text-blue-300">
              <Clock className="w-5 h-5 text-blue-400 shrink-0 animate-pulse" />
              <div>
                <strong>Payment Proof Under Manual Verification:</strong> Your payment reference{" "}
                <span className="font-mono font-bold text-white">{pendingVerificationItem.referenceId}</span> (₹
                {pendingVerificationItem.fixedAmount}) has been submitted and is currently queued for manual confirmation by our accounts team.
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-[#0f0f0f] border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex-1 relative min-w-[200px]">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search reference, user name, email, UTR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#161616] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-bright-red/50"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto bg-[#161616] border border-white/10 text-xs text-zinc-300 rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING_PAYMENT">Pending Payment</option>
                <option value="PENDING_VERIFICATION">Pending Verification</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select
                value={purposeFilter}
                onChange={(e) => setPurposeFilter(e.target.value)}
                className="w-full sm:w-auto bg-[#161616] border border-white/10 text-xs text-zinc-300 rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="ALL">All Purposes</option>
                <option value="INTERNSHIP_FEE">Internship Service Fee</option>
                <option value="ID_CARD">ID Card Fee</option>
                <option value="AI_TOOLS">AI Dev Tools</option>
                <option value="REGISTRATION">Registration</option>
                <option value="SERVICE_PAYMENT">Service Payment</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-12 text-center rounded-2xl bg-[#0f0f0f] border border-white/5 space-y-3">
              <div className="w-8 h-8 border-2 border-bright-red border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-zinc-400">Loading payment records...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center rounded-2xl bg-crimson/10 border border-crimson/30 space-y-3">
              <AlertTriangle className="w-8 h-8 text-crimson mx-auto" />
              <p className="text-sm text-white font-semibold">{error}</p>
              <button
                onClick={fetchData}
                className="px-4 py-2 rounded-xl bg-bright-red hover:bg-bright-red/90 text-white text-xs font-semibold"
              >
                Retry Loading
              </button>
            </div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#0f0f0f] border border-white/5">
              <CreditCard className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-300 font-medium">No Payment Records</p>
              <p className="text-xs text-zinc-500 mt-1">
                {isPrivileged ? "No payments match the current filters." : "You have no outstanding payment requests."}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#0f0f0f] border border-white/10 overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-[#141414] text-zinc-400 uppercase text-[11px] tracking-wider border-b border-white/5">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">Reference</th>
                      <th className="py-3.5 px-4 font-semibold">Purpose / Title</th>
                      {isPrivileged && <th className="py-3.5 px-4 font-semibold">User</th>}
                      <th className="py-3.5 px-4 font-semibold">Amount</th>
                      <th className="py-3.5 px-4 font-semibold">Status</th>
                      <th className="py-3.5 px-4 font-semibold">UTR / Date</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-bright-red">
                          {p.referenceId}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-white">{p.title}</div>
                          <div className="text-[11px] text-zinc-500 truncate max-w-xs">{p.description}</div>
                        </td>
                        {isPrivileged && (
                          <td className="py-3 px-4">
                            <div className="text-zinc-200">{p.userName || p.userEmail}</div>
                            <div className="text-[11px] text-zinc-500">{p.userRole} &bull; {p.domain || "General"}</div>
                          </td>
                        )}
                        <td className="py-3 px-4 font-bold text-white">
                          ₹{p.fixedAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(p.paymentStatus)}
                        </td>
                        <td className="py-3 px-4">
                          {p.utrNumber ? (
                            <div className="font-mono text-[11px] text-zinc-300">{p.utrNumber}</div>
                          ) : (
                            <span className="text-zinc-500">-</span>
                          )}
                          <div className="text-[10px] text-zinc-500">
                            {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : new Date(p.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/dashboard/payments/${p.id}`}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                              p.paymentStatus === "PENDING_PAYMENT"
                                ? "bg-bright-red hover:bg-bright-red/90 text-white shadow-[0_0_12px_rgba(239,35,60,0.3)] font-semibold"
                                : p.paymentStatus === "REJECTED"
                                ? "bg-crimson/20 hover:bg-crimson/30 text-crimson border border-crimson/30"
                                : "bg-[#181818] hover:bg-[#222222] text-zinc-300 border border-white/10"
                            }`}
                          >
                            {p.paymentStatus === "PENDING_PAYMENT" ? "Pay Now" : p.paymentStatus === "REJECTED" ? "Resubmit" : "View"}
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: CREATE PAYMENT REQUEST ──────────────────────────────────── */}
      {isPrivileged && canManage && activeTab === "create" && (
        <div className="max-w-3xl mx-auto p-6 rounded-2xl bg-[#0f0f0f] border border-white/10 space-y-6">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-base font-orbitron font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              Issue CodeXa Payment Request
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Create an official manual UPI payment bill. The amount is strictly fixed and cannot be altered by users.
            </p>
          </div>

          {createSuccessMessage && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{createSuccessMessage}</span>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="flex p-1 rounded-xl bg-[#141414] border border-white/10 w-fit">
            <button
              onClick={() => setCreatorMode("bulk")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                creatorMode === "bulk" ? "bg-bright-red text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              Bulk Issue (Interns / Domain)
            </button>
            <button
              onClick={() => setCreatorMode("single")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                creatorMode === "single" ? "bg-bright-red text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              Single User Request
            </button>
          </div>

          <div className="space-y-4">
            {creatorMode === "bulk" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Target Role</label>
                  <select
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value)}
                    className="w-full p-2.5 bg-[#161616] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="INTERN">Engineering Interns (INTERN)</option>
                    <option value="EMPLOYEE">Core Employees (EMPLOYEE)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Domain / Department</label>
                  <select
                    value={createDomain}
                    onChange={(e) => setCreateDomain(e.target.value)}
                    className="w-full p-2.5 bg-[#161616] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="ALL">All Domains</option>
                    <option value="Development">Development</option>
                    <option value="Cybersecurity">Cybersecurity</option>
                    <option value="Design">UI/UX Design</option>
                    <option value="Data Science">Data Science</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Target User ID</label>
                <input
                  type="text"
                  placeholder="e.g. cxa_user_123..."
                  value={createSingleUserId}
                  onChange={(e) => setCreateSingleUserId(e.target.value)}
                  className="w-full p-2.5 bg-[#161616] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Payment Purpose</label>
                <select
                  value={createPurpose}
                  onChange={(e) => setCreatePurpose(e.target.value)}
                  className="w-full p-2.5 bg-[#161616] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="INTERNSHIP_FEE">Internship Service Fee</option>
                  <option value="ID_CARD">Mandatory ID Card Fee</option>
                  <option value="AI_TOOLS">AI Dev Tools Access Pack</option>
                  <option value="REGISTRATION">Registration Fee</option>
                  <option value="SERVICE_PAYMENT">Client Service Payment</option>
                  <option value="OTHER">Other Fixed Fee</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Fixed Amount (₹ INR)</label>
                <input
                  type="number"
                  value={createAmount}
                  onChange={(e) => setCreateAmount(e.target.value)}
                  className="w-full p-2.5 bg-[#161616] border border-white/10 rounded-xl text-xs text-white font-bold focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Bill Title</label>
              <input
                type="text"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                className="w-full p-2.5 bg-[#161616] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description & Line Items</label>
              <textarea
                rows={3}
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                className="w-full p-2.5 bg-[#161616] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Due Date (Optional)</label>
              <input
                type="date"
                value={createDueDate}
                onChange={(e) => setCreateDueDate(e.target.value)}
                className="w-full p-2.5 bg-[#161616] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Dry Run Preview Box */}
          {dryRunResult && (
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs space-y-2">
              <div className="font-semibold text-blue-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-blue-400" />
                Dry-Run Validation Result
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-zinc-300">
                <div>Total Found: <strong>{dryRunResult.totalSubmitted}</strong></div>
                <div>Eligible: <strong className="text-emerald-400">{dryRunResult.eligibleCount}</strong></div>
                <div>Already Assigned: <strong className="text-amber-400">{dryRunResult.skippedCount}</strong></div>
                <div>Total Expected: <strong className="text-white">₹{dryRunResult.totalExpectedAmount}</strong></div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-white/10 flex items-center gap-3">
            {creatorMode === "bulk" && (
              <button
                type="button"
                onClick={handleDryRun}
                disabled={submittingCreate}
                className="px-4 py-2.5 rounded-xl bg-[#181818] hover:bg-[#202020] border border-white/10 text-xs font-semibold text-zinc-300 transition-colors"
              >
                Dry Run Preview
              </button>
            )}

            <button
              type="button"
              onClick={handleExecuteCreate}
              disabled={submittingCreate}
              className="px-6 py-2.5 rounded-xl bg-bright-red hover:bg-bright-red/90 text-xs font-bold text-white transition-all shadow-[0_0_15px_rgba(239,35,60,0.3)] disabled:opacity-50"
            >
              {submittingCreate ? "Processing..." : creatorMode === "bulk" ? "Issue Bulk Requests" : "Create Request"}
            </button>
          </div>
        </div>
      )}

      {/* ─── TAB 4: ANALYTICS & REPORTS ─────────────────────────────────────── */}
      {isPrivileged && activeTab === "analytics" && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#0f0f0f] border border-white/10">
              <span className="text-xs font-medium text-zinc-500">Total Expected</span>
              <div className="text-xl sm:text-2xl font-orbitron font-bold text-white mt-1">
                ₹{analytics.summary.totalExpectedAmount.toLocaleString()}
              </div>
              <span className="text-[11px] text-zinc-400 mt-1 block">
                {analytics.summary.totalRequests} total requests issued
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-[#0f0f0f] border border-white/10">
              <span className="text-xs font-medium text-emerald-500">Collected & Approved</span>
              <div className="text-xl sm:text-2xl font-orbitron font-bold text-emerald-400 mt-1">
                ₹{analytics.summary.totalApprovedAmount.toLocaleString()}
              </div>
              <span className="text-[11px] text-emerald-400/80 mt-1 block">
                {analytics.summary.collectionRatePercent}% collection rate
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-[#0f0f0f] border border-white/10">
              <span className="text-xs font-medium text-blue-400">Under Verification</span>
              <div className="text-xl sm:text-2xl font-orbitron font-bold text-blue-400 mt-1">
                ₹{analytics.summary.totalPendingVerificationAmount.toLocaleString()}
              </div>
              <span className="text-[11px] text-zinc-400 mt-1 block">
                {analytics.summary.pendingVerificationCount} submissions queued
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-[#0f0f0f] border border-white/10">
              <span className="text-xs font-medium text-amber-400">Awaiting User Payment</span>
              <div className="text-xl sm:text-2xl font-orbitron font-bold text-amber-400 mt-1">
                ₹{analytics.summary.totalPendingPaymentAmount.toLocaleString()}
              </div>
              <span className="text-[11px] text-zinc-400 mt-1 block">
                {analytics.summary.pendingPaymentCount} unpaid accounts
              </span>
            </div>
          </div>

          {/* Domain Breakdown */}
          <div className="p-6 rounded-2xl bg-[#0f0f0f] border border-white/10">
            <h3 className="text-sm font-semibold text-white mb-4">Breakdown by Domain</h3>
            <div className="space-y-3">
              {Object.entries(analytics.domainBreakdown || {}).map(([domain, data]: any) => (
                <div key={domain} className="p-3 rounded-xl bg-[#141414] border border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-white">{domain}</span>
                    <span className="text-zinc-500 ml-2">({data.count} users)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-bold">₹{data.approvedAmount.toLocaleString()}</span>
                    <span className="text-zinc-500"> / ₹{data.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 5: UPI SETTINGS & ACCOUNTS ─────────────────────────────────── */}
      {isPrivileged && canManageSettings && activeTab === "settings" && settingsData && (
        <div className="max-w-3xl mx-auto p-6 rounded-2xl bg-[#0f0f0f] border border-white/10 space-y-6">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-base font-orbitron font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-400" />
              Official CodeXa UPI Settings
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Configure the agency&apos;s official receiving UPI ID, display name, and verification policy.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-zinc-400 mb-1">UPI Display Name</label>
              <input
                type="text"
                value={settingsData.settings?.upiDisplayName || "CodeXa Agency"}
                disabled
                className="w-full p-2.5 bg-[#161616] border border-white/10 rounded-xl text-zinc-300"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-400 mb-1">Default UPI ID</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={settingsData.settings?.defaultUpiId || "shaikashu33@fam"}
                  disabled
                  className="w-full p-2.5 bg-[#161616] border border-white/10 rounded-xl font-mono text-zinc-300"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-zinc-400 mb-1">Active Accounts</label>
              <div className="space-y-2">
                {(settingsData.accounts || []).map((acc: any) => (
                  <div key={acc.id} className="p-3 rounded-xl bg-[#141414] border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white">{acc.name}</span>
                      <span className="font-mono text-bright-red ml-2">{acc.upiId}</span>
                    </div>
                    {acc.isDefault && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                        Default
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200">
              <strong className="block mb-1">Manual Verification Policy:</strong>
              No automated payment gateway is active. Every incoming transaction must be confirmed manually by Founder, Co-Founder, or HR before being approved.
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADMIN REVIEW & DECIDE ──────────────────────────────────── */}
      {selectedReviewPayment && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101010] border border-white/15 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-bright-red bg-crimson/10 px-2.5 py-1 rounded-md border border-crimson/20">
                  {selectedReviewPayment.referenceId}
                </span>
                <h3 className="text-base font-orbitron font-bold text-white mt-1.5">
                  Verify Payment Proof
                </h3>
              </div>
              <button
                onClick={() => setSelectedReviewPayment(null)}
                className="p-2 rounded-xl bg-[#1c1c1c] text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Screen View */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
              {/* Left Column: Details */}
              <div className="space-y-4 text-xs">
                {/* Duplicate Warnings Alert */}
                {(duplicateWarnings.duplicateUtr || duplicateWarnings.duplicateScreenshot) && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-400">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      Potential Duplicate Flag
                    </div>
                    {duplicateWarnings.duplicateUtr && (
                      <p>
                        This UTR ({selectedReviewPayment.utrNumber}) has already been submitted for payment{" "}
                        <strong className="underline">{duplicateWarnings.conflictingReference}</strong>.
                      </p>
                    )}
                    {duplicateWarnings.duplicateScreenshot && (
                      <p>Exact identical screenshot hash detected across previous payments.</p>
                    )}
                  </div>
                )}

                <div className="p-4 rounded-xl bg-[#141414] border border-white/5 space-y-2">
                  <span className="text-[11px] font-semibold uppercase text-zinc-500 block">User Information</span>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Name:</span>
                    <span className="font-semibold text-white">{selectedReviewPayment.userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Email:</span>
                    <span className="text-zinc-300">{selectedReviewPayment.userEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Role & Domain:</span>
                    <span className="text-zinc-300">{selectedReviewPayment.userRole} &bull; {selectedReviewPayment.domain}</span>
                  </div>
                  {selectedReviewPayment.internId && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Intern ID:</span>
                      <span className="font-mono text-zinc-300">{selectedReviewPayment.internId}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-[#141414] border border-white/5 space-y-2">
                  <span className="text-[11px] font-semibold uppercase text-zinc-500 block">Transaction Details</span>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Bill Title:</span>
                    <span className="font-medium text-white">{selectedReviewPayment.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Payable Amount:</span>
                    <span className="font-bold text-sm text-emerald-400">₹{selectedReviewPayment.fixedAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">UTR / Ref Number:</span>
                    <span className="font-mono font-semibold text-white bg-black/40 px-2 py-0.5 rounded border border-white/10">
                      {selectedReviewPayment.utrNumber || "NOT PROVIDED"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">UPI App:</span>
                    <span className="text-zinc-300">{selectedReviewPayment.upiApp || "Standard UPI"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Payment Date:</span>
                    <span className="text-zinc-300">
                      {selectedReviewPayment.paymentDate
                        ? new Date(selectedReviewPayment.paymentDate).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                  {selectedReviewPayment.userNote && (
                    <div className="pt-2 border-t border-white/5">
                      <span className="text-zinc-500 block mb-0.5">User Note:</span>
                      <p className="italic text-zinc-300">{selectedReviewPayment.userNote}</p>
                    </div>
                  )}
                </div>

                {reviewAction === "REJECT" && (
                  <div className="p-4 rounded-xl bg-crimson/10 border border-crimson/30 space-y-3">
                    <label className="block font-semibold text-crimson">Select Rejection Reason *</label>
                    <select
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full p-2 bg-[#161616] border border-crimson/40 rounded-xl text-xs text-white"
                    >
                      <option value="">-- Choose Preset Reason --</option>
                      <option value="Payment proof unclear / unreadable">Payment proof unclear / unreadable</option>
                      <option value="Amount mismatch">Amount mismatch (Not matching ₹450)</option>
                      <option value="Unable to verify transaction in bank statement">Unable to verify transaction in bank statement</option>
                      <option value="Duplicate screenshot already submitted">Duplicate screenshot already submitted</option>
                      <option value="Incorrect UTR / transaction ID">Incorrect UTR / transaction ID</option>
                      <option value="Payment not received">Payment not received in CodeXa account</option>
                      <option value="Transferred to wrong UPI account">Transferred to wrong UPI account</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Or enter custom reason..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full p-2 bg-[#161616] border border-white/10 rounded-xl text-xs text-white"
                    />
                  </div>
                )}
              </div>

              {/* Right Column: Screenshot Preview */}
              <div className="space-y-3">
                <span className="text-[11px] font-semibold uppercase text-zinc-400 block">
                  Payment Proof Screenshot
                </span>

                <div className="p-2 rounded-2xl bg-[#080808] border border-white/10 flex items-center justify-center min-h-[300px] max-h-[460px] overflow-hidden">
                  {selectedReviewPayment.proofImageUrl ? (
                    <img
                      src={`/api/payments/${selectedReviewPayment.id}/proof-image`}
                      alt="Payment Proof"
                      className="max-h-[440px] w-auto object-contain rounded-xl hover:scale-105 transition-transform cursor-pointer"
                      onClick={() => window.open(`/api/payments/${selectedReviewPayment.id}/proof-image`, "_blank")}
                    />
                  ) : (
                    <div className="text-zinc-600 text-xs">No screenshot attached</div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
                  <span>Click image to view high-resolution</span>
                  <a
                    href={`/api/payments/${selectedReviewPayment.id}/proof-image`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-bright-red hover:underline flex items-center gap-1"
                  >
                    Open in New Tab <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-5 border-t border-white/10 bg-[#121212] flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedReviewPayment(null)}
                className="px-4 py-2.5 rounded-xl bg-[#1c1c1c] text-zinc-300 text-xs font-semibold hover:bg-[#252525] transition-colors"
              >
                Cancel
              </button>

              <div className="flex items-center gap-3">
                {reviewAction !== "REJECT" ? (
                  <button
                    onClick={() => setReviewAction("REJECT")}
                    disabled={reviewLoading}
                    className="px-4 py-2.5 rounded-xl bg-crimson/20 hover:bg-crimson/30 border border-crimson/40 text-crimson text-xs font-bold transition-colors"
                  >
                    Reject Proof
                  </button>
                ) : (
                  <button
                    onClick={() => handleVerifyDecision("REJECT")}
                    disabled={reviewLoading}
                    className="px-5 py-2.5 rounded-xl bg-crimson hover:bg-crimson/90 text-white text-xs font-bold transition-all shadow-lg"
                  >
                    {reviewLoading ? "Processing..." : "Confirm Rejection"}
                  </button>
                )}

                {reviewAction !== "REJECT" && (
                  <button
                    onClick={() => handleVerifyDecision("APPROVE")}
                    disabled={reviewLoading}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)] flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    {reviewLoading ? "Processing..." : "Approve Payment"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
