"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Bell,
  Banknote,
  Share2,
  ArrowUpRight,
  CheckCheck,
  MessageCircle,
  FileCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getEffectiveRole,
  hasPermission,
  Permission,
  canApproveCashPayment,
  canRejectCashPayment,
  canManagePaymentSettings,
} from "@/lib/permissions";
import { PushNotificationBanner } from "@/components/notifications/PushNotificationBanner";
import { InternAutomaticPaymentFlow } from "@/components/payments/InternAutomaticPaymentFlow";
import { FounderPaymentSettingsTab } from "@/components/payments/FounderPaymentSettingsTab";

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
  paymentStatus:
    | "PENDING_PAYMENT"
    | "PAYMENT_STARTED"
    | "PENDING_VERIFICATION"
    | "VERIFYING"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLED"
    | "FAILED"
    | "EXPIRED"
    | "SUCCESS";
  dueDate: string | null;
  transactionId: string | null;
  utrNumber: string | null;
  paymentDate: string | null;
  paymentTime: string | null;
  upiApp: string | null;
  paymentMethod: string | null;
  cashStatus: string | null;
  cashRequestedAt: string | null;
  cashApprovedAt: string | null;
  cashApprovedByName: string | null;
  cashRejectionReason: string | null;
  cashNotes: string | null;
  verificationSource: string | null;
  paidAt: string | null;
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

interface LiveMetrics {
  totalInterns: number;
  paidCount: number;
  notPaidCount: number;
  pendingPaymentCount: number;
  upiVerifyingCount: number;
  cashPendingCount: number;
  successfulCount: number;
  failedCount: number;
  expiredCount: number;
  totalExpectedAmount: number;
  totalCollectedAmount: number;
  pendingAmount: number;
  byMethod?: Record<string, number>;
}

export default function PaymentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, status } = useAuth();

  const [activeTab, setActiveTab] = useState<string>("all");
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [verificationQueue, setVerificationQueue] = useState<PaymentItem[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [settingsData, setSettingsData] = useState<any>(null);
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live polling controls
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [domainFilter, setDomainFilter] = useState("ALL");
  const [purposeFilter, setPurposeFilter] = useState("ALL");
  const [remindingId, setRemindingId] = useState<string | null>(null);

  // Cash Action Modals
  const [selectedCashApproveItem, setSelectedCashApproveItem] = useState<PaymentItem | null>(null);
  const [selectedCashRejectItem, setSelectedCashRejectItem] = useState<PaymentItem | null>(null);
  const [cashRejectReason, setCashRejectReason] = useState("Cash not received");
  const [cashRejectCustomNote, setCashRejectCustomNote] = useState("");
  const [cashActionLoading, setCashActionLoading] = useState(false);
  const [selectedCashCardItem, setSelectedCashCardItem] = useState<PaymentItem | null>(null);

  // Verification Review Modal State (Existing OCR/Proof inspection)
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
  const canManageSettings = canManagePaymentSettings(user);
  const canApproveCash = canApproveCashPayment(user);
  const isPrivileged = canVerify || canManage || canViewAll;

  // Set default tab based on role
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    } else if (!isPrivileged) {
      setActiveTab("my-payments");
    } else {
      setActiveTab("all");
    }
  }, [isPrivileged, searchParams]);

  const fetchData = async (isManual = true) => {
    try {
      if (isManual) setRefreshing(true);
      setError(null);

      if (isPrivileged) {
        const queryParams = new URLSearchParams({
          status: statusFilter,
          method: methodFilter,
          domain: domainFilter,
          purpose: purposeFilter,
          q: searchQuery,
          limit: "200",
        });

        const [queueRes, allRes, analyticsRes, settingsRes] = await Promise.all([
          fetch(`/api/payments/verification?purpose=${purposeFilter}&q=${encodeURIComponent(searchQuery)}`, {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
          }),
          fetch(`/api/payments?${queryParams.toString()}`, {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
          }),
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
          if (aData.metrics) {
            setMetrics(aData.metrics);
          }
          if (aData.serverTime) {
            setLastUpdated(new Date(aData.serverTime).toLocaleTimeString());
          } else {
            setLastUpdated(new Date().toLocaleTimeString());
          }
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
        // Regular user: fetch own payments
        const res = await fetch(
          `/api/payments?status=${statusFilter}&purpose=${purposeFilter}&q=${encodeURIComponent(searchQuery)}`,
          {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
          }
        );
        if (res.ok) {
          const data = await res.json();
          setPayments(data.payments || []);
          setLastUpdated(new Date().toLocaleTimeString());
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
      if (isManual) setRefreshing(false);
    }
  };

  // Initial and reactive fetch on filter change
  useEffect(() => {
    if (status !== "authenticated") return;
    const timer = setTimeout(() => {
      fetchData(true);
    }, 200);
    return () => clearTimeout(timer);
  }, [status, statusFilter, methodFilter, domainFilter, purposeFilter, searchQuery]);

  // Live short polling (every 7 seconds)
  useEffect(() => {
    if (status !== "authenticated" || !isPrivileged || !isLiveActive) return;
    const interval = setInterval(() => {
      fetchData(false);
    }, 7000);
    return () => clearInterval(interval);
  }, [status, isPrivileged, isLiveActive, statusFilter, methodFilter, domainFilter, purposeFilter, searchQuery]);

  // Filtered views computed from payments
  const cashApprovalsList = useMemo(() => {
    return payments.filter(
      (p) =>
        p.cashStatus === "PENDING_CASH_APPROVAL" ||
        (p.paymentMethod === "CASH" &&
          p.paymentStatus !== "APPROVED" &&
          p.paymentStatus !== "SUCCESS" &&
          p.cashStatus !== "CASH_REJECTED" &&
          p.cashStatus !== "CASH_CANCELLED")
    );
  }, [payments]);

  const notPaidList = useMemo(() => {
    return payments.filter(
      (p) =>
        p.paymentStatus !== "APPROVED" &&
        p.paymentStatus !== "SUCCESS" &&
        p.cashStatus !== "CASH_RECEIVED"
    );
  }, [payments]);

  const paidList = useMemo(() => {
    return payments.filter(
      (p) =>
        p.paymentStatus === "APPROVED" ||
        p.paymentStatus === "SUCCESS" ||
        p.cashStatus === "CASH_RECEIVED"
    );
  }, [payments]);

  // Trigger individual payment reminder
  const handleTriggerTableReminder = async (e: React.MouseEvent, paymentId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setRemindingId(paymentId);
    try {
      const res = await fetch(`/api/payments/${paymentId}/reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Reminder failed: ${data.error || "Error dispatching reminder"}`);
      } else {
        alert("Reminder dispatched successfully via Resend Email and Web Push!");
        fetchData(false);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setRemindingId(null);
    }
  };

  // Cash Action: Confirm Cash Received (Founder / Co-Founder only)
  const handleConfirmCashSubmit = async () => {
    if (!selectedCashApproveItem) return;
    try {
      setCashActionLoading(true);
      const res = await fetch(`/api/payments/${selectedCashApproveItem.id}/cash/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to confirm cash receipt.");
      } else {
        alert(`Cash payment of ₹450 for ${selectedCashApproveItem.userName} confirmed successfully!`);
        setSelectedCashApproveItem(null);
        await fetchData(true);
      }
    } catch (err: any) {
      alert(err.message || "Network error confirming cash payment.");
    } finally {
      setCashActionLoading(false);
    }
  };

  // Cash Action: Reject Cash Request (Founder / Co-Founder only)
  const handleRejectCashSubmit = async () => {
    if (!selectedCashRejectItem) return;
    const finalReason = cashRejectCustomNote.trim() || cashRejectReason.trim();
    if (!finalReason) {
      alert("Please provide a rejection reason.");
      return;
    }
    try {
      setCashActionLoading(true);
      const res = await fetch(`/api/payments/${selectedCashRejectItem.id}/cash/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: finalReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to reject cash request.");
      } else {
        alert(`Cash request for ${selectedCashRejectItem.userName} rejected.`);
        setSelectedCashRejectItem(null);
        setCashRejectCustomNote("");
        await fetchData(true);
      }
    } catch (err: any) {
      alert(err.message || "Network error rejecting cash payment.");
    } finally {
      setCashActionLoading(false);
    }
  };

  // Open Review Details Modal for an item (existing OCR inspection)
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
      await fetchData(true);
    } catch (err: any) {
      alert(err.message || "Network error while processing verification.");
    } finally {
      setReviewLoading(false);
    }
  };

  const handleAdminOverride = async (action: "DISPUTE" | "RETRY_VERIFY" | "INVALIDATE") => {
    if (!selectedReviewPayment) return;
    const confirmMsg =
      action === "INVALIDATE"
        ? "Are you sure you want to invalidate this payment and revoke intern access?"
        : action === "DISPUTE"
        ? "Mark this payment as disputed?"
        : "Re-run automatic verification against settlement feed?";
    if (!confirm(confirmMsg)) return;

    try {
      setReviewLoading(true);
      const res = await fetch(`/api/admin/payments/${selectedReviewPayment.id}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: reviewAdminNotes || "Admin action from review console",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Override operation failed");
      } else {
        alert(data.message || "Operation completed successfully");
        setSelectedReviewPayment(null);
        fetchData(true);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
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
      await fetchData(true);
    } catch (err: any) {
      alert(err.message || "Error creating payment requests.");
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Export Comprehensive CSV Report
  const handleExportCSV = () => {
    if (payments.length === 0) return;
    const headers = [
      "Reference ID",
      "Intern ID",
      "User Name",
      "User Email",
      "Role",
      "Domain",
      "Purpose",
      "Amount (INR)",
      "Payment Method",
      "Payment Status",
      "Cash Status",
      "UTR Number",
      "Verification Source",
      "Submitted / Requested At",
      "Payment Date",
      "Paid At",
      "Verified / Approved By",
    ];

    const rows = payments.map((p) => [
      `"${p.referenceId}"`,
      `"${p.internId || p.user?.employmentProfile?.employeeId || p.employeeId || ""}"`,
      `"${p.userName || ""}"`,
      `"${p.userEmail || ""}"`,
      `"${p.userRole || ""}"`,
      `"${p.domain || ""}"`,
      `"${p.paymentPurpose}"`,
      p.fixedAmount,
      `"${p.paymentMethod || "NOT_SELECTED"}"`,
      `"${p.paymentStatus}"`,
      `"${p.cashStatus || "NONE"}"`,
      `"${p.utrNumber || ""}"`,
      `"${p.verificationSource || ""}"`,
      `"${p.cashRequestedAt ? new Date(p.cashRequestedAt).toLocaleString() : p.submittedAt ? new Date(p.submittedAt).toLocaleString() : ""}"`,
      `"${p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : ""}"`,
      `"${p.paidAt ? new Date(p.paidAt).toLocaleString() : ""}"`,
      `"${p.cashApprovedByName || p.verifiedByName || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `codexa_payment_control_center_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Badges Helpers
  const renderMethodBadge = (method: string | null) => {
    switch (method) {
      case "PHONEPE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/15 border border-purple-500/30 text-purple-300">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> PhonePe
          </span>
        );
      case "GOOGLE_PAY":
      case "GPAY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 border border-blue-500/30 text-blue-300">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Google Pay
          </span>
        );
      case "PAYTM":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/15 border border-sky-500/30 text-sky-300">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Paytm
          </span>
        );
      case "OTHER_UPI":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Other UPI
          </span>
        );
      case "CASH":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
            <Banknote className="w-3 h-3 text-emerald-400" /> Pay with Cash
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-white/5">
            Not Selected
          </span>
        );
    }
  };

  const renderStatusBadge = (p: PaymentItem) => {
    if (p.paymentStatus === "APPROVED" || p.paymentStatus === "SUCCESS" || p.cashStatus === "CASH_RECEIVED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {p.cashStatus === "CASH_RECEIVED" ? "Cash Received" : "Paid & Approved"}
        </span>
      );
    }

    if (p.cashStatus === "PENDING_CASH_APPROVAL") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 border border-amber-500/40 text-amber-300 animate-pulse">
          <Banknote className="w-3.5 h-3.5 text-amber-400" />
          Cash Pending Approval
        </span>
      );
    }

    if (p.paymentStatus === "PENDING_VERIFICATION" || p.paymentStatus === "VERIFYING") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 border border-blue-500/30 text-blue-400">
          <Clock className="w-3.5 h-3.5" /> UPI Verifying
        </span>
      );
    }

    if (p.paymentStatus === "PENDING_PAYMENT" || p.paymentStatus === "PAYMENT_STARTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400">
          <CreditCard className="w-3.5 h-3.5" /> Pending Payment
        </span>
      );
    }

    if (p.cashStatus === "CASH_REJECTED" || p.paymentStatus === "REJECTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-crimson/15 border border-crimson/30 text-crimson">
          <XCircle className="w-3.5 h-3.5" /> Rejected
        </span>
      );
    }

    if (p.cashStatus === "CASH_CANCELLED" || p.paymentStatus === "CANCELLED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400">
          <X className="w-3.5 h-3.5" /> Cancelled
        </span>
      );
    }

    if (p.paymentStatus === "FAILED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-400">
          <AlertTriangle className="w-3.5 h-3.5" /> Failed
        </span>
      );
    }

    if (p.paymentStatus === "EXPIRED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400">
          <Clock className="w-3.5 h-3.5" /> Expired
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400">
        {p.paymentStatus}
      </span>
    );
  };

  // Dedicated Intern Flow View
  if (effectiveRole === "INTERN") {
    return (
      <div className="space-y-6">
        <InternAutomaticPaymentFlow onStatusChange={() => fetchData(true)} />
      </div>
    );
  }

  // Active metrics with fallback calculations from current DB sync
  const currentMetrics: LiveMetrics = metrics || {
    totalInterns: 39,
    paidCount: paidList.length,
    notPaidCount: notPaidList.length,
    pendingPaymentCount: payments.filter((p) => p.paymentStatus === "PENDING_PAYMENT").length,
    upiVerifyingCount: payments.filter(
      (p) => p.paymentStatus === "PENDING_VERIFICATION" || p.paymentStatus === "VERIFYING"
    ).length,
    cashPendingCount: cashApprovalsList.length,
    successfulCount: paidList.length,
    failedCount: payments.filter((p) => p.paymentStatus === "FAILED").length,
    expiredCount: payments.filter((p) => p.paymentStatus === "EXPIRED").length,
    totalExpectedAmount: 39 * 450,
    totalCollectedAmount: paidList.length * 450,
    pendingAmount: notPaidList.length * 450,
  };

  return (
    <div className="space-y-6">
      {/* ─── LIVE CONTROL CENTER HEADER ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-crimson/20 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-crimson/15 border border-crimson/30 text-bright-red">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-orbitron font-bold text-white tracking-wide">
                  Live Payment Control Center
                </h1>
                {/* Live Stream Pulse Badge */}
                <button
                  type="button"
                  onClick={() => setIsLiveActive(!isLiveActive)}
                  title={isLiveActive ? "Click to pause 7s live auto-refresh" : "Click to resume 7s live stream"}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-[#141414] border border-white/10 hover:border-white/20 transition-colors"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isLiveActive
                        ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                        : "bg-zinc-500"
                    }`}
                  />
                  <span className={isLiveActive ? "text-emerald-400 font-semibold" : "text-zinc-500"}>
                    {isLiveActive ? "Live Stream (7s)" : "Paused"}
                  </span>
                </button>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                Real-time monitoring across all 39 CodeXa interns with dedicated UPI automation &amp; Cash approval flow
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {lastUpdated && (
            <span className="text-[11px] font-mono text-zinc-400 bg-[#121212] px-3 py-1.5 rounded-xl border border-white/5">
              Last updated: <strong className="text-white">{lastUpdated}</strong>
            </span>
          )}

          <button
            onClick={() => fetchData(true)}
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

      {/* ─── 12 SUMMARY CARDS GRID (REQUIREMENT 4) ──────────────────────────── */}
      {isPrivileged && (
        <div className="space-y-3">
          {/* Row 1: Intern Counts & Pipeline */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#0f0f0f] border border-white/10 hover:border-white/20 transition-all">
              <span className="text-[10px] font-mono uppercase text-zinc-400 block">Total Interns</span>
              <span className="text-xl font-orbitron font-bold text-white mt-0.5 block">
                {currentMetrics.totalInterns}
              </span>
              <span className="text-[10px] text-zinc-500">Active synced roster</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0f0f0f] border border-emerald-500/20 bg-emerald-950/5 hover:border-emerald-500/40 transition-all">
              <span className="text-[10px] font-mono uppercase text-emerald-400 block">Paid Interns</span>
              <span className="text-xl font-orbitron font-bold text-emerald-400 mt-0.5 block">
                {currentMetrics.paidCount}
              </span>
              <span className="text-[10px] text-emerald-500/80">Reconciled & cleared</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0f0f0f] border border-crimson/20 bg-crimson/5 hover:border-crimson/40 transition-all">
              <span className="text-[10px] font-mono uppercase text-crimson block">Not Paid</span>
              <span className="text-xl font-orbitron font-bold text-crimson mt-0.5 block">
                {currentMetrics.notPaidCount}
              </span>
              <span className="text-[10px] text-zinc-500">Action pending</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0f0f0f] border border-amber-500/20 bg-amber-950/5 hover:border-amber-500/40 transition-all">
              <span className="text-[10px] font-mono uppercase text-amber-400 block">Pending Payment</span>
              <span className="text-xl font-orbitron font-bold text-amber-400 mt-0.5 block">
                {currentMetrics.pendingPaymentCount}
              </span>
              <span className="text-[10px] text-zinc-500">Bill unstarted</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0f0f0f] border border-blue-500/20 bg-blue-950/5 hover:border-blue-500/40 transition-all">
              <span className="text-[10px] font-mono uppercase text-blue-400 block">UPI Verifying</span>
              <span className="text-xl font-orbitron font-bold text-blue-400 mt-0.5 block">
                {currentMetrics.upiVerifyingCount}
              </span>
              <span className="text-[10px] text-zinc-500">Screenshot in review</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0f0f0f] border border-amber-500/30 bg-amber-500/10 hover:border-amber-500/60 transition-all shadow-[0_0_15px_rgba(245,158,11,0.1)]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-amber-300 font-bold block">
                  Cash Pending
                </span>
                {currentMetrics.cashPendingCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                )}
              </div>
              <span className="text-xl font-orbitron font-bold text-amber-400 mt-0.5 block">
                {currentMetrics.cashPendingCount}
              </span>
              <span className="text-[10px] text-amber-300/80">Physical handover</span>
            </div>
          </div>

          {/* Row 2: Status Lifecycle & Financials */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#0f0f0f] border border-white/10">
              <span className="text-[10px] font-mono uppercase text-emerald-400 block">Successful</span>
              <span className="text-xl font-orbitron font-bold text-emerald-400 mt-0.5 block">
                {currentMetrics.successfulCount}
              </span>
              <span className="text-[10px] text-zinc-500">100% verified</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0f0f0f] border border-white/10">
              <span className="text-[10px] font-mono uppercase text-rose-400 block">Failed</span>
              <span className="text-xl font-orbitron font-bold text-rose-400 mt-0.5 block">
                {currentMetrics.failedCount}
              </span>
              <span className="text-[10px] text-zinc-500">OCR rejected</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0f0f0f] border border-white/10">
              <span className="text-[10px] font-mono uppercase text-zinc-400 block">Expired</span>
              <span className="text-xl font-orbitron font-bold text-zinc-300 mt-0.5 block">
                {currentMetrics.expiredCount}
              </span>
              <span className="text-[10px] text-zinc-500">Session timed out</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0f0f0f] border border-white/10">
              <span className="text-[10px] font-mono uppercase text-zinc-400 block">Total Expected</span>
              <span className="text-base sm:text-lg font-orbitron font-bold text-white mt-0.5 block">
                ₹{currentMetrics.totalExpectedAmount.toLocaleString()}
              </span>
              <span className="text-[10px] text-zinc-500">39 &times; ₹450 mandatory</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0f0f0f] border border-emerald-500/30 bg-emerald-950/10">
              <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">
                Total Collected
              </span>
              <span className="text-base sm:text-lg font-orbitron font-bold text-emerald-400 mt-0.5 block">
                ₹{currentMetrics.totalCollectedAmount.toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-500/80">Reconciled in bank/cash</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0f0f0f] border border-amber-500/20 bg-amber-950/10">
              <span className="text-[10px] font-mono uppercase text-amber-400 block">Pending Amount</span>
              <span className="text-base sm:text-lg font-orbitron font-bold text-amber-400 mt-0.5 block">
                ₹{currentMetrics.pendingAmount.toLocaleString()}
              </span>
              <span className="text-[10px] text-zinc-500">Awaiting collection</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── ROLE-SCOPED TABS (FOUNDER/CO-FOUNDER vs CEO/CTO/HR) ─────────────── */}
      {isPrivileged && (
        <div className="flex items-center gap-1 border-b border-white/10 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all whitespace-nowrap ${
              activeTab === "all"
                ? "bg-[#181818] text-white border-b-2 border-bright-red font-semibold"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <CreditCard className="w-4 h-4 text-zinc-300" />
            All Payments ({payments.length})
          </button>

          {/* Cash Approvals Tab (ONLY Founder & Co-Founder) */}
          {canApproveCash && (
            <button
              onClick={() => setActiveTab("cash-approvals")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all whitespace-nowrap ${
                activeTab === "cash-approvals"
                  ? "bg-[#181818] text-white border-b-2 border-bright-red font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Banknote className="w-4 h-4 text-amber-400" />
              Cash Approvals
              {cashApprovalsList.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  {cashApprovalsList.length}
                </span>
              )}
            </button>
          )}

          {/* UPI Verification Queue (Founder & Co-Founder) */}
          {canApproveCash && (
            <button
              onClick={() => setActiveTab("queue")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all whitespace-nowrap ${
                activeTab === "queue"
                  ? "bg-[#181818] text-white border-b-2 border-bright-red font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Clock className="w-4 h-4 text-blue-400" />
              UPI Queue
              {verificationQueue.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">
                  {verificationQueue.length}
                </span>
              )}
            </button>
          )}

          {/* Not Paid Roster Tab (All Roles) */}
          <button
            onClick={() => setActiveTab("not-paid")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all whitespace-nowrap ${
              activeTab === "not-paid"
                ? "bg-[#181818] text-white border-b-2 border-bright-red font-semibold"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <XCircle className="w-4 h-4 text-crimson" />
            Not Paid Roster ({notPaidList.length})
          </button>

          {/* Paid Interns Tab (All Roles) */}
          <button
            onClick={() => setActiveTab("paid")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all whitespace-nowrap ${
              activeTab === "paid"
                ? "bg-[#181818] text-white border-b-2 border-bright-red font-semibold"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Paid ({paidList.length})
          </button>

          {/* Analytics & Reports (All Privileged Roles) */}
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all whitespace-nowrap ${
              activeTab === "analytics"
                ? "bg-[#181818] text-white border-b-2 border-bright-red font-semibold"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <TrendingUp className="w-4 h-4 text-amber-400" />
            Analytics &amp; Methods
          </button>

          {/* Create Request (Only Founder / Co-Founder) */}
          {canManage && (
            <button
              onClick={() => setActiveTab("create")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all whitespace-nowrap ${
                activeTab === "create"
                  ? "bg-[#181818] text-white border-b-2 border-bright-red font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              Create Request
            </button>
          )}

          {/* Settings Tab (Only Founder / Co-Founder) */}
          {canManageSettings && (
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all whitespace-nowrap ${
                activeTab === "settings"
                  ? "bg-[#181818] text-white border-b-2 border-bright-red font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Settings className="w-4 h-4 text-purple-400" />
              Payment Settings
            </button>
          )}
        </div>
      )}

      {/* ─── TAB: CASH APPROVAL QUEUE (FOUNDER / CO-FOUNDER) ────────────────── */}
      {isPrivileged && canApproveCash && activeTab === "cash-approvals" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111111] p-4 rounded-2xl border border-amber-500/30">
            <div>
              <h2 className="text-sm font-orbitron font-bold text-amber-400 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-amber-400" />
                Cash Payment Approval Queue ({cashApprovalsList.length})
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Physical cash handovers awaiting Founder or Co-Founder verification. No automatic approval.
              </p>
            </div>
            <div className="text-xs text-amber-300 font-mono bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30 w-fit">
              Co-Founder Contact: B. Sanjay (917075920852)
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center rounded-2xl bg-[#0f0f0f] border border-white/5 space-y-3">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-zinc-400">Loading pending cash requests...</p>
            </div>
          ) : cashApprovalsList.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#0f0f0f] border border-white/5 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/60 mx-auto mb-2" />
              <p className="text-sm text-zinc-200 font-medium">No Pending Cash Requests</p>
              <p className="text-xs text-zinc-500">
                All physical cash handovers have been reviewed and reconciled.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cashApprovalsList.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-[#0f0f0f] border border-amber-500/30 hover:border-amber-500/60 transition-all flex flex-col justify-between space-y-4 shadow-xl relative"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/30">
                        {item.referenceId}
                      </span>
                      {renderStatusBadge(item)}
                    </div>

                    <h3 className="font-semibold text-white text-base">
                      {item.userName || "CodeXa Intern"}
                    </h3>
                    <p className="text-xs text-zinc-400 truncate">{item.userEmail}</p>

                    <div className="mt-4 pt-3 border-t border-white/5 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="text-zinc-500">Intern ID:</span>
                        <span className="font-mono text-white font-semibold">
                          {item.internId || item.user?.employmentProfile?.employeeId || "Pending ID"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="text-zinc-500">Domain:</span>
                        <span className="text-zinc-200">{item.domain || "Development"}</span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="text-zinc-500">Payable Amount:</span>
                        <span className="font-bold text-sm text-emerald-400 font-mono">
                          ₹{item.fixedAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-500 text-[11px]">
                        <span>Requested At:</span>
                        <span>
                          {item.cashRequestedAt
                            ? new Date(item.cashRequestedAt).toLocaleString()
                            : new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/5 space-y-2">
                    {/* Share / WhatsApp & Card Links */}
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/917075920852?text=${encodeURIComponent(
                          `Hello B. Sanjay,\nCash verification for intern: ${item.userName} (${item.internId || item.referenceId})\nAmount: ₹450\nRef: ${item.referenceId}`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Sanjay B.
                      </a>
                      <button
                        type="button"
                        onClick={() => setSelectedCashCardItem(item)}
                        className="py-1.5 px-3 rounded-xl bg-[#181818] hover:bg-[#222222] border border-white/10 text-zinc-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" /> Card
                      </button>
                    </div>

                    {/* Operational Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedCashApproveItem(item)}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)] flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" /> Confirm ₹450 Received
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCashRejectItem(item);
                          setCashRejectReason("Cash not received");
                          setCashRejectCustomNote("");
                        }}
                        className="py-2 px-3 rounded-xl bg-crimson/20 hover:bg-crimson/30 border border-crimson/40 text-crimson text-xs font-bold transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: UPI VERIFICATION QUEUE (FOUNDER / CO-FOUNDER) ──────────────── */}
      {isPrivileged && canApproveCash && activeTab === "queue" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              Awaiting UPI Verification ({verificationQueue.length})
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
              <p className="text-xs text-zinc-500 mt-1">There are no pending UPI screenshot verifications at this time.</p>
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
                      {renderStatusBadge(item)}
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
                      <Eye className="w-3.5 h-3.5" /> Review &amp; Decide
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

      {/* ─── TAB: NOT PAID ROSTER (REQUIREMENT 35-36) ────────────────────────── */}
      {isPrivileged && activeTab === "not-paid" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111111] p-4 rounded-2xl border border-crimson/30">
            <div>
              <h2 className="text-sm font-orbitron font-bold text-crimson flex items-center gap-2">
                <XCircle className="w-5 h-5 text-crimson" />
                Unpaid Interns Roster ({notPaidList.length} of {currentMetrics.totalInterns})
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Every eligible intern with pending or unfulfilled mandatory ₹450 service fee.
              </p>
            </div>
            <div className="text-xs text-crimson font-mono bg-crimson/10 px-3 py-1.5 rounded-xl border border-crimson/30 w-fit">
              Outstanding Total: ₹{(notPaidList.length * 450).toLocaleString()}
            </div>
          </div>

          <div className="rounded-2xl bg-[#0f0f0f] border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-[#141414] text-zinc-400 uppercase text-[11px] tracking-wider border-b border-white/5">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Intern ID</th>
                    <th className="py-3.5 px-4 font-semibold">Intern Name &amp; Email</th>
                    <th className="py-3.5 px-4 font-semibold">Domain</th>
                    <th className="py-3.5 px-4 font-semibold">Bill Amount</th>
                    <th className="py-3.5 px-4 font-semibold">Method Selected</th>
                    <th className="py-3.5 px-4 font-semibold">Current Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {notPaidList.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-white">
                        {p.internId || p.user?.employmentProfile?.employeeId || p.employeeId || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{p.userName}</div>
                        <div className="text-[11px] text-zinc-500">{p.userEmail}</div>
                      </td>
                      <td className="py-3 px-4 text-zinc-300">
                        {p.domain || p.user?.department || "General"}
                      </td>
                      <td className="py-3 px-4 font-bold text-white font-mono">
                        ₹{p.fixedAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        {renderMethodBadge(p.paymentMethod)}
                      </td>
                      <td className="py-3 px-4">
                        {renderStatusBadge(p)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => handleTriggerTableReminder(e, p.id)}
                            disabled={remindingId === p.id}
                            title="Send ₹450 Reminder via Resend & Push"
                            className="px-2.5 py-1.5 rounded-xl bg-bright-red/10 hover:bg-bright-red/20 border border-bright-red/30 text-bright-red text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                            <Bell className="w-3 h-3" />
                            {remindingId === p.id ? "Sending..." : "Remind"}
                          </button>
                          <Link
                            href={`/dashboard/payments/${p.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs bg-[#181818] hover:bg-[#222222] text-zinc-300 border border-white/10"
                          >
                            View <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: PAID INTERNS ───────────────────────────────────────────────── */}
      {isPrivileged && activeTab === "paid" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111111] p-4 rounded-2xl border border-emerald-500/30">
            <div>
              <h2 className="text-sm font-orbitron font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Cleared &amp; Paid Interns ({paidList.length} of {currentMetrics.totalInterns})
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                All interns who have completed payment through verified UPI or confirmed Cash receipt.
              </p>
            </div>
            <div className="text-xs text-emerald-300 font-mono bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30 w-fit">
              Total Collected: ₹{(paidList.length * 450).toLocaleString()}
            </div>
          </div>

          <div className="rounded-2xl bg-[#0f0f0f] border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-[#141414] text-zinc-400 uppercase text-[11px] tracking-wider border-b border-white/5">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Reference</th>
                    <th className="py-3.5 px-4 font-semibold">Intern ID &amp; Name</th>
                    <th className="py-3.5 px-4 font-semibold">Domain</th>
                    <th className="py-3.5 px-4 font-semibold">Amount</th>
                    <th className="py-3.5 px-4 font-semibold">Method</th>
                    <th className="py-3.5 px-4 font-semibold">UTR / Verification</th>
                    <th className="py-3.5 px-4 font-semibold">Paid At</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paidList.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-emerald-400">
                        {p.referenceId}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{p.userName}</div>
                        <div className="text-[11px] text-zinc-500">
                          {p.internId || p.user?.employmentProfile?.employeeId || p.employeeId || "-"}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-zinc-300">
                        {p.domain || p.user?.department || "General"}
                      </td>
                      <td className="py-3 px-4 font-bold text-white font-mono">
                        ₹{p.fixedAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        {renderMethodBadge(p.paymentMethod)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-[11px] text-zinc-300">
                          {p.paymentMethod === "CASH" ? "Cash Received" : p.utrNumber || "Verified"}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {p.verificationSource === "MANUAL_CASH_RECEIPT"
                            ? "Founder Confirmed"
                            : p.verificationSource || "Automated OCR"}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-zinc-400 text-[11px]">
                        {p.paidAt
                          ? new Date(p.paidAt).toLocaleDateString()
                          : p.verifiedAt
                          ? new Date(p.verifiedAt).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/dashboard/payments/${p.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs bg-[#181818] hover:bg-[#222222] text-zinc-300 border border-white/10"
                        >
                          View <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: ALL PAYMENTS MASTER VIEW ──────────────────────────────────── */}
      {isPrivileged && activeTab === "all" && (
        <div className="space-y-4">
          <PushNotificationBanner />

          {/* Filter Bar with Method, Status, Domain, Search */}
          <div className="p-4 rounded-2xl bg-[#0f0f0f] border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex-1 relative min-w-[200px]">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search reference, intern ID, name, email, UTR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#161616] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-bright-red/50"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Method Filter */}
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="w-full sm:w-auto bg-[#161616] border border-white/10 text-xs text-zinc-300 rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="ALL">All Methods</option>
                <option value="PHONEPE">PhonePe</option>
                <option value="GOOGLE_PAY">Google Pay</option>
                <option value="PAYTM">Paytm</option>
                <option value="OTHER_UPI">Other UPI</option>
                <option value="CASH">Pay with Cash</option>
                <option value="NOT_SELECTED">Not Selected</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto bg-[#161616] border border-white/10 text-xs text-zinc-300 rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PAID">Paid / Cleared</option>
                <option value="NOT_PAID">Not Paid</option>
                <option value="PENDING">Pending Payment</option>
                <option value="UPI_VERIFYING">UPI Verifying</option>
                <option value="CASH_PENDING">Cash Pending Approval</option>
                <option value="FAILED">Failed</option>
                <option value="EXPIRED">Expired</option>
              </select>

              {/* Domain Filter */}
              <select
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
                className="w-full sm:w-auto bg-[#161616] border border-white/10 text-xs text-zinc-300 rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="ALL">All Domains</option>
                <option value="Full-Stack Development with AI">Full-Stack Dev</option>
                <option value="Cybersecurity">Cybersecurity</option>
                <option value="AI & Machine Learning">AI &amp; ML</option>
                <option value="Cloud Computing & DevOps">Cloud &amp; DevOps</option>
                <option value="Data Science & Business Analytics">Data Science</option>
                <option value="UI/UX Design">UI/UX Design</option>
              </select>
            </div>
          </div>

          {/* Master Table */}
          {loading ? (
            <div className="p-12 text-center rounded-2xl bg-[#0f0f0f] border border-white/5 space-y-3">
              <div className="w-8 h-8 border-2 border-bright-red border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-zinc-400">Loading live payment records...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center rounded-2xl bg-crimson/10 border border-crimson/30 space-y-3">
              <AlertTriangle className="w-8 h-8 text-crimson mx-auto" />
              <p className="text-sm text-white font-semibold">{error}</p>
              <button
                onClick={() => fetchData(true)}
                className="px-4 py-2 rounded-xl bg-bright-red hover:bg-bright-red/90 text-white text-xs font-semibold"
              >
                Retry Loading
              </button>
            </div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#0f0f0f] border border-white/5">
              <CreditCard className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-300 font-medium">No Payment Records Match Filters</p>
              <p className="text-xs text-zinc-500 mt-1">Try resetting the status or method filters above.</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#0f0f0f] border border-white/10 overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-[#141414] text-zinc-400 uppercase text-[11px] tracking-wider border-b border-white/5">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">Reference</th>
                      <th className="py-3.5 px-4 font-semibold">Intern ID &amp; User</th>
                      <th className="py-3.5 px-4 font-semibold">Domain</th>
                      <th className="py-3.5 px-4 font-semibold">Amount</th>
                      <th className="py-3.5 px-4 font-semibold">Method</th>
                      <th className="py-3.5 px-4 font-semibold">Status</th>
                      <th className="py-3.5 px-4 font-semibold">UTR / Cash Approval</th>
                      <th className="py-3.5 px-4 font-semibold">Date</th>
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
                          <div className="font-medium text-white">{p.userName || p.userEmail}</div>
                          <div className="text-[11px] font-mono text-zinc-400">
                            {p.internId || p.user?.employmentProfile?.employeeId || p.employeeId || "-"}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-zinc-300">
                          {p.domain || p.user?.department || "General"}
                        </td>
                        <td className="py-3 px-4 font-bold text-white font-mono">
                          ₹{p.fixedAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          {renderMethodBadge(p.paymentMethod)}
                        </td>
                        <td className="py-3 px-4">
                          {renderStatusBadge(p)}
                        </td>
                        <td className="py-3 px-4">
                          {p.paymentMethod === "CASH" ? (
                            <div className="text-[11px]">
                              {p.cashStatus === "CASH_RECEIVED" ? (
                                <span className="text-emerald-400 font-semibold">
                                  ✓ Confirmed ({p.cashApprovedByName || "Founder"})
                                </span>
                              ) : p.cashStatus === "PENDING_CASH_APPROVAL" ? (
                                <span className="text-amber-400 font-semibold">Pending Receipt</span>
                              ) : p.cashStatus === "CASH_REJECTED" ? (
                                <span className="text-crimson font-semibold">Rejected</span>
                              ) : (
                                <span className="text-zinc-500">-</span>
                              )}
                            </div>
                          ) : p.utrNumber ? (
                            <div className="font-mono text-[11px] text-zinc-200">
                              {p.utrNumber}
                            </div>
                          ) : (
                            <span className="text-zinc-500">-</span>
                          )}
                          <div className="text-[10px] text-zinc-500">
                            {p.verificationSource === "MANUAL_CASH_RECEIPT"
                              ? "Cash Receipt"
                              : p.verificationSource || "UPI Flow"}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-zinc-400">
                          {p.paidAt
                            ? new Date(p.paidAt).toLocaleDateString()
                            : p.paymentDate
                            ? new Date(p.paymentDate).toLocaleDateString()
                            : new Date(p.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Quick Action for Cash Pending on Founder/Co-Founder */}
                            {canApproveCash && p.cashStatus === "PENDING_CASH_APPROVAL" && (
                              <button
                                onClick={() => setSelectedCashApproveItem(p)}
                                title="Confirm Cash Received"
                                className="px-2 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-[11px] font-bold border border-emerald-500/40"
                              >
                                Confirm
                              </button>
                            )}

                            {isPrivileged &&
                              p.paymentStatus === "PENDING_PAYMENT" &&
                              p.cashStatus !== "PENDING_CASH_APPROVAL" && (
                                <button
                                  onClick={(e) => handleTriggerTableReminder(e, p.id)}
                                  disabled={remindingId === p.id}
                                  title="Send ₹450 Reminder via Resend & Push"
                                  className="px-2.5 py-1 rounded-lg bg-bright-red/10 hover:bg-bright-red/20 border border-bright-red/30 text-bright-red text-[11px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                                >
                                  <Bell className="w-3 h-3" />
                                  {remindingId === p.id ? "..." : "Remind"}
                                </button>
                              )}

                            <Link
                              href={`/dashboard/payments/${p.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[#181818] hover:bg-[#222222] text-zinc-300 border border-white/10"
                            >
                              View <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
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

      {/* ─── TAB: CREATE PAYMENT REQUEST (FOUNDER / CO-FOUNDER) ─────────────── */}
      {isPrivileged && canManage && activeTab === "create" && (
        <div className="max-w-3xl mx-auto p-6 rounded-2xl bg-[#0f0f0f] border border-white/10 space-y-6">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-base font-orbitron font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              Issue CodeXa Payment Request
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Create an official mandatory service fee bill. The ₹450 fee cannot be altered by interns.
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
                    <option value="Full-Stack Development with AI">Full-Stack Development</option>
                    <option value="Cybersecurity">Cybersecurity</option>
                    <option value="AI & Machine Learning">AI &amp; Machine Learning</option>
                    <option value="Cloud Computing & DevOps">Cloud &amp; DevOps</option>
                    <option value="Data Science & Business Analytics">Data Science</option>
                    <option value="UI/UX Design">UI/UX Design</option>
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
                  <option value="INTERNSHIP_FEE">Internship Service Fee (Mandatory ₹450)</option>
                  <option value="ID_CARD">Mandatory ID Card Fee (₹150)</option>
                  <option value="AI_TOOLS">AI Dev Tools Access Pack (₹300)</option>
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
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description &amp; Line Items</label>
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

      {/* ─── TAB: ANALYTICS & PAYMENT METHODS ───────────────────────────────── */}
      {isPrivileged && activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Method Breakdown (Requirement 26) */}
          <div className="p-6 rounded-2xl bg-[#0f0f0f] border border-white/10 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-orbitron font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-bright-red" />
                  Payment Methods Distribution &amp; Adoption
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Breakdown across PhonePe, Google Pay, Paytm, Other UPI, and Pay with Cash
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-4 rounded-xl bg-[#141414] border border-purple-500/20">
                <span className="text-[11px] font-semibold text-purple-400 block">PhonePe</span>
                <span className="text-xl font-orbitron font-bold text-white mt-1 block">
                  {currentMetrics.byMethod?.PHONEPE || 0}
                </span>
                <span className="text-[10px] text-zinc-500">Auto UPI</span>
              </div>

              <div className="p-4 rounded-xl bg-[#141414] border border-blue-500/20">
                <span className="text-[11px] font-semibold text-blue-400 block">Google Pay</span>
                <span className="text-xl font-orbitron font-bold text-white mt-1 block">
                  {currentMetrics.byMethod?.GOOGLE_PAY || 0}
                </span>
                <span className="text-[10px] text-zinc-500">Auto UPI</span>
              </div>

              <div className="p-4 rounded-xl bg-[#141414] border border-sky-500/20">
                <span className="text-[11px] font-semibold text-sky-400 block">Paytm</span>
                <span className="text-xl font-orbitron font-bold text-white mt-1 block">
                  {currentMetrics.byMethod?.PAYTM || 0}
                </span>
                <span className="text-[10px] text-zinc-500">Auto UPI</span>
              </div>

              <div className="p-4 rounded-xl bg-[#141414] border border-indigo-500/20">
                <span className="text-[11px] font-semibold text-indigo-400 block">Other UPI</span>
                <span className="text-xl font-orbitron font-bold text-white mt-1 block">
                  {currentMetrics.byMethod?.OTHER_UPI || 0}
                </span>
                <span className="text-[10px] text-zinc-500">Auto UPI</span>
              </div>

              <div className="p-4 rounded-xl bg-[#141414] border border-emerald-500/30 bg-emerald-950/10">
                <span className="text-[11px] font-semibold text-emerald-400 block">Pay with Cash</span>
                <span className="text-xl font-orbitron font-bold text-emerald-400 mt-1 block">
                  {currentMetrics.byMethod?.CASH || 0}
                </span>
                <span className="text-[10px] text-emerald-500/80">Physical approval</span>
              </div>

              <div className="p-4 rounded-xl bg-[#141414] border border-white/5">
                <span className="text-[11px] font-semibold text-zinc-400 block">Not Selected</span>
                <span className="text-xl font-orbitron font-bold text-zinc-300 mt-1 block">
                  {currentMetrics.byMethod?.NOT_SELECTED || 0}
                </span>
                <span className="text-[10px] text-zinc-500">Bill unstarted</span>
              </div>
            </div>
          </div>

          {/* Domain Breakdown */}
          {analytics && (
            <div className="p-6 rounded-2xl bg-[#0f0f0f] border border-white/10 space-y-4 shadow-xl">
              <h3 className="text-sm font-semibold text-white">Collection Breakdown by Internship Domain</h3>
              <div className="space-y-3">
                {Object.entries(analytics.domainBreakdown || {}).map(([domain, data]: any) => (
                  <div
                    key={domain}
                    className="p-3.5 rounded-xl bg-[#141414] border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-white">{domain}</span>
                      <span className="text-zinc-500 ml-2">({data.count} interns)</span>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-400 font-bold font-mono">
                        ₹{data.approvedAmount.toLocaleString()}
                      </span>
                      <span className="text-zinc-500"> / ₹{data.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: PAYMENT SETTINGS (FOUNDER / CO-FOUNDER) ────────────────────── */}
      {isPrivileged && canManageSettings && activeTab === "settings" && (
        <FounderPaymentSettingsTab />
      )}

      {/* ─── MODAL: CONFIRM CASH RECEIVED (REQUIREMENT 20) ───────────────────── */}
      {selectedCashApproveItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101010] border border-emerald-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <Banknote className="w-6 h-6" />
                <h3 className="font-orbitron font-bold text-base text-white">
                  Confirm ₹450 Cash Received?
                </h3>
              </div>
              <button
                onClick={() => setSelectedCashApproveItem(null)}
                className="p-1.5 rounded-lg bg-[#1c1c1c] text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#141414] border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Intern Name:</span>
                <span className="font-semibold text-white">{selectedCashApproveItem.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Intern ID:</span>
                <span className="font-mono text-zinc-300">
                  {selectedCashApproveItem.internId ||
                    selectedCashApproveItem.user?.employmentProfile?.employeeId ||
                    "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Reference:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {selectedCashApproveItem.referenceId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Cash Amount:</span>
                <span className="font-bold text-sm text-emerald-400">₹450 Fixed</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
              Confirming will mark this payment as <strong>APPROVED (CASH_RECEIVED)</strong> immediately,
              update the intern roster, and grant full service access.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedCashApproveItem(null)}
                disabled={cashActionLoading}
                className="px-4 py-2 rounded-xl bg-[#1c1c1c] text-zinc-300 text-xs font-semibold hover:bg-[#252525]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCashSubmit}
                disabled={cashActionLoading}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(34,197,94,0.3)] disabled:opacity-50"
              >
                {cashActionLoading ? "Confirming..." : "Confirm Cash Received"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: REJECT CASH REQUEST (REQUIREMENT 22) ─────────────────────── */}
      {selectedCashRejectItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101010] border border-crimson/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5 text-crimson">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="font-orbitron font-bold text-base text-white">
                  Reject Cash Payment Request
                </h3>
              </div>
              <button
                onClick={() => setSelectedCashRejectItem(null)}
                className="p-1.5 rounded-lg bg-[#1c1c1c] text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#141414] border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Intern:</span>
                <span className="font-semibold text-white">{selectedCashRejectItem.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Reference:</span>
                <span className="font-mono text-zinc-300">{selectedCashRejectItem.referenceId}</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-zinc-300">
                Select Rejection Reason *
              </label>
              <select
                value={cashRejectReason}
                onChange={(e) => setCashRejectReason(e.target.value)}
                className="w-full p-2.5 bg-[#161616] border border-white/10 rounded-xl text-xs text-white"
              >
                <option value="Cash not received">Cash not received</option>
                <option value="Incorrect request">Incorrect request</option>
                <option value="Duplicate request">Duplicate request</option>
                <option value="User cancelled">User cancelled</option>
                <option value="Other">Other</option>
              </select>

              <input
                type="text"
                placeholder="Custom reason note (optional)..."
                value={cashRejectCustomNote}
                onChange={(e) => setCashRejectCustomNote(e.target.value)}
                className="w-full p-2.5 bg-[#161616] border border-white/10 rounded-xl text-xs text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedCashRejectItem(null)}
                disabled={cashActionLoading}
                className="px-4 py-2 rounded-xl bg-[#1c1c1c] text-zinc-300 text-xs font-semibold hover:bg-[#252525]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectCashSubmit}
                disabled={cashActionLoading}
                className="px-5 py-2 rounded-xl bg-crimson hover:bg-crimson/90 text-white text-xs font-bold disabled:opacity-50"
              >
                {cashActionLoading ? "Processing..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CASH REQUEST CARD PREVIEW (REQUIREMENT 17) ───────────────── */}
      {selectedCashCardItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101010] border border-white/15 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-orbitron font-bold text-sm text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-bright-red" />
                CodeXa Cash Payment Request Card
              </h3>
              <button
                onClick={() => setSelectedCashCardItem(null)}
                className="p-1.5 rounded-lg bg-[#1c1c1c] text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-center p-2 rounded-xl bg-[#080808] border border-white/5 overflow-hidden">
              <img
                src={`/api/payments/${selectedCashCardItem.id}/cash/card`}
                alt="Cash Payment Request Card"
                className="max-h-[380px] w-auto object-contain rounded-lg"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
              <span>Watermarked: PENDING CASH APPROVAL</span>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/payments/${selectedCashCardItem.id}/cash/card`}
                  download={`codexa_cash_card_${selectedCashCardItem.referenceId}.svg`}
                  className="px-3 py-1.5 rounded-xl bg-[#181818] hover:bg-[#222222] text-zinc-300 font-semibold"
                >
                  Download SVG
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedCashCardItem(null)}
                  className="px-4 py-1.5 rounded-xl bg-bright-red text-white font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADMIN REVIEW & DECIDE (EXISTING OCR AUDIT) ───────────────── */}
      {selectedReviewPayment && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101010] border border-white/15 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
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

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
              <div className="space-y-4 text-xs">
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
                    <span className="text-zinc-500">Role &amp; Domain:</span>
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

            <div className="p-5 border-t border-white/10 bg-[#121212] flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedReviewPayment(null)}
                className="px-4 py-2.5 rounded-xl bg-[#1c1c1c] text-zinc-300 text-xs font-semibold hover:bg-[#252525] transition-colors"
              >
                Cancel
              </button>

              {/* Automatic OCR Decision Flow Banner */}
              {selectedReviewPayment &&
              (selectedReviewPayment.fixedAmount === 450 ||
                selectedReviewPayment.paymentPurpose.includes("INTERN") ||
                selectedReviewPayment.userRole === "INTERN") ? (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono">
                    🤖 100% Automated Decision Flow (Manual Approve Disabled)
                  </span>
                  {(effectiveRole === "FOUNDER" || effectiveRole === "CO_FOUNDER") && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAdminOverride("RETRY_VERIFY")}
                        disabled={reviewLoading}
                        className="px-3 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-mono"
                      >
                        Retry Auto-Verification
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdminOverride("INVALIDATE")}
                        disabled={reviewLoading}
                        className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-mono"
                      >
                        Invalidate
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
