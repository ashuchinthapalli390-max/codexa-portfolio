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
  Send,
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
import {
  INTERNSHIP_DOMAINS,
  CANONICAL_WORKFORCE_ROLES,
  getDomainDurationLabel,
  getDomainDurationMonths,
} from "@/lib/internships/domains";

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
    | "PENDING_APPROVAL"
    | "REVIEW_REQUIRED"
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
  const [durationFilter, setDurationFilter] = useState("ALL");
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
  const [confirmReceivedChecked, setConfirmReceivedChecked] = useState(false);
  const [duplicateWarnings, setDuplicateWarnings] = useState<any>({});
  const [zoomedProofUrl, setZoomedProofUrl] = useState<string | null>(null);
  const [proofImageError, setProofImageError] = useState(false);
  const [proofImageKey, setProofImageKey] = useState(0);
  const [resendingNotification, setResendingNotification] = useState(false);
  const [resendNotificationSuccess, setResendNotificationSuccess] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  // Keyboard Escape listener to dismiss any active payment modal or lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (zoomedProofUrl) {
          setZoomedProofUrl(null);
        } else if (selectedReviewPayment) {
          setSelectedReviewPayment(null);
        } else if (selectedCashApproveItem) {
          setSelectedCashApproveItem(null);
        } else if (selectedCashRejectItem) {
          setSelectedCashRejectItem(null);
        } else if (selectedCashCardItem) {
          setSelectedCashCardItem(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomedProofUrl, selectedReviewPayment, selectedCashApproveItem, selectedCashRejectItem, selectedCashCardItem]);

  // Lock body scroll when any modal or lightbox is active
  useEffect(() => {
    const isAnyModalOpen = Boolean(
      zoomedProofUrl ||
      selectedReviewPayment ||
      selectedCashApproveItem ||
      selectedCashRejectItem ||
      selectedCashCardItem
    );
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [zoomedProofUrl, selectedReviewPayment, selectedCashApproveItem, selectedCashRejectItem, selectedCashCardItem]);

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
          duration: durationFilter,
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
  }, [status, statusFilter, methodFilter, domainFilter, durationFilter, purposeFilter, searchQuery]);

  // Live short polling (every 7 seconds)
  useEffect(() => {
    if (status !== "authenticated" || !isPrivileged || !isLiveActive) return;
    const interval = setInterval(() => {
      fetchData(false);
    }, 7000);
    return () => clearInterval(interval);
  }, [status, isPrivileged, isLiveActive, statusFilter, methodFilter, domainFilter, durationFilter, purposeFilter, searchQuery]);

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

  const pendingApprovalsList = useMemo(() => {
    return payments.filter(
      (p) =>
        p.paymentStatus === "PENDING_APPROVAL" ||
        p.paymentStatus === "VERIFYING" ||
        p.paymentStatus === "PENDING_VERIFICATION" ||
        (p.submissions &&
          p.submissions.some(
            (s: any) =>
              s.status === "PENDING_APPROVAL" ||
              s.status === "PENDING" ||
              s.status === "PENDING_VERIFICATION"
          ))
    );
  }, [payments]);

  const rejectedList = useMemo(() => {
    return payments.filter(
      (p) =>
        p.paymentStatus === "REJECTED" ||
        p.cashStatus === "CASH_REJECTED" ||
        p.paymentStatus === "FAILED"
    );
  }, [payments]);

  const reviewRequiredList = pendingApprovalsList;

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
    setConfirmReceivedChecked(false);
    setDuplicateWarnings({});
    setProofImageError(false);
    setProofImageKey((k) => k + 1);
    setResendNotificationSuccess(null);
    setZoomScale(1);

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

  // Deep-linking: auto-open payment review modal when redirected from Email or Web Push (?review=... or ?paymentId=...)
  useEffect(() => {
    const reviewId = searchParams.get("review") || searchParams.get("paymentId");
    if (!reviewId || selectedReviewPayment || !isPrivileged) return;

    const matched = payments.find((p) => p.id === reviewId || p.referenceId === reviewId);
    if (matched) {
      openReviewModal(matched);
      setActiveTab("pending-approvals");
    } else if (payments.length > 0) {
      fetch(`/api/payments/${encodeURIComponent(reviewId)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.payment) {
            openReviewModal(data.payment);
            setActiveTab("pending-approvals");
          }
        })
        .catch(() => {});
    }
  }, [searchParams, payments, selectedReviewPayment, isPrivileged]);

  // Resend Payment Approval Notification (Founder / Co-Founder only - Part 6 #31)
  const handleResendNotification = async () => {
    if (!selectedReviewPayment) return;
    try {
      setResendingNotification(true);
      setResendNotificationSuccess(null);
      const res = await fetch(`/api/payments/${selectedReviewPayment.id}/resend-notification`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to resend approval notification.");
      } else {
        setResendNotificationSuccess("Approval notification with screenshot attached was resent successfully to Founder and Co-Founder!");
      }
    } catch (err: any) {
      alert(err.message || "Network error while resending notification.");
    } finally {
      setResendingNotification(false);
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

  // Founder / Co-Founder Approval (Calls /api/payments/[id]/review/approve)
  const handleApproveException = async () => {
    if (!selectedReviewPayment) return;
    if (!confirmReceivedChecked) {
      alert("Please confirm that you have independently checked and confirmed receipt of ₹450 in the official CodeXa receiving account.");
      return;
    }
    try {
      setReviewLoading(true);
      const res = await fetch(`/api/payments/${selectedReviewPayment.id}/review/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: reviewAdminNotes || "Manual receipt confirmation by Founder/Co-Founder",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to approve payment.");
        return;
      }
      alert(`Payment ${selectedReviewPayment.referenceId} approved successfully! Intern benefits unlocked.`);
      setSelectedReviewPayment(null);
      await fetchData(true);
    } catch (err: any) {
      alert(err.message || "Network error approving payment.");
    } finally {
      setReviewLoading(false);
    }
  };

  // Founder / Co-Founder Exception Rejection (Calls /api/payments/[id]/review/reject)
  const handleRejectException = async () => {
    if (!selectedReviewPayment) return;
    if (!rejectionReason.trim()) {
      alert("Please select or enter a rejection reason.");
      return;
    }
    try {
      setReviewLoading(true);
      const res = await fetch(`/api/payments/${selectedReviewPayment.id}/review/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: rejectionReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to reject payment proof.");
        return;
      }
      alert(`Payment proof for ${selectedReviewPayment.referenceId} rejected.`);
      setSelectedReviewPayment(null);
      setReviewAction(null);
      await fetchData(true);
    } catch (err: any) {
      alert(err.message || "Network error rejecting payment.");
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

    if (p.paymentStatus === "PENDING_APPROVAL") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 border border-amber-500/40 text-amber-300 animate-pulse">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          Pending Approval
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
    totalInterns: payments.length,
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
    totalExpectedAmount: payments.reduce((sum, p) => sum + (p.fixedAmount || 0), 0),
    totalCollectedAmount: paidList.reduce((sum, p) => sum + (p.fixedAmount || 0), 0),
    pendingAmount: notPaidList.reduce((sum, p) => sum + (p.fixedAmount || 0), 0),
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
                Real-time monitoring across all {currentMetrics.totalInterns} CodeXa interns with dedicated UPI automation &amp; Cash approval flow
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

      {/* ─── ROLE-SCOPED TABS & RESPONSIVE MOBILE NAVIGATION ────────────────── */}
      {isPrivileged && (
        <div className="space-y-3">
          {/* Mobile Tab Dropdown (Prevents horizontal overflow clipping on phone viewports) */}
          <div className="block md:hidden">
            <label className="text-[10px] font-mono uppercase text-zinc-400 mb-1.5 flex items-center justify-between">
              <span>Payment Control Section</span>
              <span className="text-bright-red font-bold">{activeTab.toUpperCase().replace("-", " ")}</span>
            </label>
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#141414] border border-crimson/30 text-white text-xs font-semibold focus:outline-none focus:border-bright-red transition-all"
            >
              <option value="overview">📊 Overview & Metrics</option>
              <option value="pending-approvals">⏳ Pending Approvals ({pendingApprovalsList.length})</option>
              <option value="all">💳 All Payments ({payments.length})</option>
              <option value="paid">✅ Paid Interns ({paidList.length})</option>
              <option value="not-paid">⏳ Not Paid Roster ({notPaidList.length})</option>
              {canApproveCash && <option value="cash-approvals">💵 Cash Approvals ({cashApprovalsList.length})</option>}
              <option value="rejected">❌ Rejected ({rejectedList.length})</option>
              <option value="history">📜 Audit Logs & History</option>
              <option value="analytics">📈 Analytics & Methods</option>
              {canManage && <option value="create">➕ Create Request</option>}
              {canManageSettings && <option value="settings">⚙️ Payment Settings</option>}
            </select>
          </div>

          {/* Desktop Horizontal Tabs */}
          <div className="hidden md:flex items-center gap-1 border-b border-white/10 overflow-x-auto pb-1 scrollbar-none">
            {/* Overview Tab */}
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium rounded-t-xl transition-all whitespace-nowrap ${
                activeTab === "overview"
                  ? "bg-[#181818] text-white border-b-2 border-bright-red font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <TrendingUp className="w-4 h-4 text-bright-red" />
              Overview
            </button>

            {/* Pending Approvals Tab (Phase 7 #28 & #29) */}
            <button
              onClick={() => setActiveTab("pending-approvals")}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium rounded-t-xl transition-all whitespace-nowrap ${
                activeTab === "pending-approvals"
                  ? "bg-[#181818] text-white border-b-2 border-bright-red font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Clock className="w-4 h-4 text-amber-400" />
              Pending Approvals ({pendingApprovalsList.length})
              {pendingApprovalsList.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  {pendingApprovalsList.length}
                </span>
              )}
            </button>

            {/* All Payments Tab */}
            <button
              onClick={() => setActiveTab("all")}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium rounded-t-xl transition-all whitespace-nowrap ${
                activeTab === "all"
                  ? "bg-[#181818] text-white border-b-2 border-bright-red font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <CreditCard className="w-4 h-4 text-zinc-300" />
              All ({payments.length})
            </button>

            {/* Paid Tab */}
            <button
              onClick={() => setActiveTab("paid")}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium rounded-t-xl transition-all whitespace-nowrap ${
                activeTab === "paid"
                  ? "bg-[#181818] text-white border-b-2 border-bright-red font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Paid ({paidList.length})
            </button>

            {/* Not Paid Tab */}
            <button
              onClick={() => setActiveTab("not-paid")}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium rounded-t-xl transition-all whitespace-nowrap ${
                activeTab === "not-paid"
                  ? "bg-[#181818] text-white border-b-2 border-bright-red font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <XCircle className="w-4 h-4 text-crimson" />
              Not Paid ({notPaidList.length})
            </button>

            {/* Cash Approvals Tab (Founder & Co-Founder) */}
            {canApproveCash && (
              <button
                onClick={() => setActiveTab("cash-approvals")}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium rounded-t-xl transition-all whitespace-nowrap ${
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

            {/* Rejected Tab */}
            <button
              onClick={() => setActiveTab("rejected")}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium rounded-t-xl transition-all whitespace-nowrap ${
                activeTab === "rejected"
                  ? "bg-[#181818] text-white border-b-2 border-bright-red font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <XCircle className="w-4 h-4 text-crimson" />
              Rejected ({rejectedList.length})
            </button>

            {/* Payment History & Audit Timeline Tab */}
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium rounded-t-xl transition-all whitespace-nowrap ${
                activeTab === "history"
                  ? "bg-[#181818] text-white border-b-2 border-bright-red font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <FileText className="w-4 h-4 text-indigo-400" />
              History &amp; Logs
            </button>

            {/* Analytics Tab */}
            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium rounded-t-xl transition-all whitespace-nowrap ${
                activeTab === "analytics"
                  ? "bg-[#181818] text-white border-b-2 border-bright-red font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Smartphone className="w-4 h-4 text-purple-400" />
              Analytics
            </button>

            {/* Payment History & Audit Timeline Tab */}
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium rounded-t-xl transition-all whitespace-nowrap ${
                activeTab === "history"
                  ? "bg-[#181818] text-white border-b-2 border-bright-red font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <FileText className="w-4 h-4 text-indigo-400" />
              History &amp; Logs
            </button>

            {/* Create Request Tab (Founder / Co-Founder) */}
            {canManage && (
              <button
                onClick={() => setActiveTab("create")}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium rounded-t-xl transition-all whitespace-nowrap ${
                  activeTab === "create"
                    ? "bg-[#181818] text-white border-b-2 border-bright-red font-semibold"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                Create Request
              </button>
            )}

            {/* Settings Tab (Founder / Co-Founder) */}
            {canManageSettings && (
              <button
                onClick={() => setActiveTab("settings")}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium rounded-t-xl transition-all whitespace-nowrap ${
                  activeTab === "settings"
                    ? "bg-[#181818] text-white border-b-2 border-bright-red font-semibold"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Settings className="w-4 h-4 text-purple-400" />
                Settings
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: OVERVIEW DASHBOARD ────────────────────────────────────────── */}
      {isPrivileged && activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Action Callout Banners */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {pendingApprovalsList.length > 0 && (
              <div
                onClick={() => setActiveTab("pending-approvals")}
                className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 hover:border-amber-500/60 transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                    <Clock className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Pending Approvals</h4>
                    <p className="text-[11px] text-amber-300/80">{pendingApprovalsList.length} payment screenshot proofs awaiting review</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </div>
            )}

            {canApproveCash && cashApprovalsList.length > 0 && (
              <div
                onClick={() => setActiveTab("cash-approvals")}
                className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-500/60 transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Cash Approvals</h4>
                    <p className="text-[11px] text-emerald-300/80">{cashApprovalsList.length} handovers awaiting approval</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-400" />
              </div>
            )}

            {notPaidList.length > 0 && (
              <div
                onClick={() => setActiveTab("not-paid")}
                className="p-4 rounded-2xl bg-crimson/10 border border-crimson/30 hover:border-crimson/60 transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-crimson/20 text-crimson">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Unpaid Interns</h4>
                    <p className="text-[11px] text-zinc-300">{notPaidList.length} interns pending payment</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-crimson" />
              </div>
            )}
          </div>

          {/* Payment Method Distribution */}
          <div className="p-6 rounded-2xl bg-[#0f0f0f] border border-white/10 space-y-4 shadow-xl">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-bright-red" />
              Live Method Selection Breakdown
            </h3>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

      {/* ─── TAB: REVIEW REQUIRED (EXCEPTION CONSOLE) ────────────────────────── */}
      {isPrivileged && activeTab === "review-required" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111111] p-4 rounded-2xl border border-amber-500/30">
            <div>
              <h2 className="text-sm font-orbitron font-bold text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Payment Review &amp; Exception Console ({reviewRequiredList.length})
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Payments flagged with UTR issues, timeout reviews, or unverified screenshots awaiting Founder/Co-Founder resolution.
              </p>
            </div>
            <div className="text-xs text-amber-300 font-mono bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30 w-fit">
              Founder / Co-Founder Auditable Controls
            </div>
          </div>

          {reviewRequiredList.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#0f0f0f] border border-white/5 space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-base font-orbitron font-bold text-white">All Clear — Zero Review Exceptions</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                No payments currently require manual intervention. All submitted proofs have been automatically resolved or verified.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviewRequiredList.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-[#0e0e0e] border border-amber-500/20 hover:border-amber-500/40 transition-all space-y-3 shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                        {item.referenceId}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1.5">{item.userName || "Intern"}</h4>
                      <p className="text-xs text-zinc-400">{item.userEmail}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                        {item.internId} &bull; {item.domain}
                      </p>
                    </div>
                    {renderStatusBadge(item)}
                  </div>

                  <div className="p-3 rounded-xl bg-[#141414] border border-white/5 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-zinc-500 block text-[10px]">UTR / Ref:</span>
                      <span className="text-white font-bold">{item.utrNumber || "NOT DETECTED"}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-zinc-500 block text-[10px]">Amount:</span>
                      <span className="text-emerald-400 font-bold">₹{item.fixedAmount}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openReviewModal(item)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-bright-red hover:bg-bright-red/90 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md"
                    >
                      <Eye className="w-3.5 h-3.5" /> Inspect Proof &amp; Decide
                    </button>
                    <Link
                      href={`/dashboard/payments/${item.id}`}
                      className="py-2.5 px-3.5 rounded-xl bg-[#1c1c1c] hover:bg-[#252525] text-zinc-300 text-xs font-semibold flex items-center justify-center transition-colors"
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

      {/* ─── TAB: PAYMENT HISTORY & AUDIT LOGS ───────────────────────────────── */}
      {isPrivileged && activeTab === "history" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between bg-[#111111] p-4 rounded-2xl border border-white/10">
            <div>
              <h2 className="text-sm font-orbitron font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Payment Audit Timeline &amp; History
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Authoritative record of verification events, approvals, cash handovers, and exceptions.
              </p>
            </div>
            <button
              onClick={() => fetchData(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181818] text-xs text-zinc-300 hover:text-white border border-white/10"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          <div className="space-y-2.5">
            {payments
              .filter((p) => p.paidAt || p.cashApprovedAt || p.verifiedAt || p.rejectedAt)
              .slice(0, 30)
              .map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-xl bg-[#0f0f0f] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        p.cashStatus === "CASH_RECEIVED"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : p.paymentStatus === "APPROVED"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-crimson/20 text-crimson"
                      }`}
                    >
                      {p.cashStatus === "CASH_RECEIVED" ? (
                        <Banknote className="w-4 h-4" />
                      ) : p.paymentStatus === "APPROVED" ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{p.userName}</span>
                        <span className="font-mono text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded">
                          {p.referenceId}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {p.cashStatus === "CASH_RECEIVED"
                          ? `Cash payment confirmed by ${p.cashApprovedByName || "Founder"}`
                          : p.verificationSource === "ADMIN_EXCEPTION_APPROVAL"
                          ? `Exception approved by ${p.verifiedByName || "Founder"}`
                          : `Auto-verified via settlement feed (${p.paymentMethod || "UPI"})`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-emerald-400 block">₹{p.fixedAmount}</span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {p.paidAt
                        ? new Date(p.paidAt).toLocaleString()
                        : p.verifiedAt
                        ? new Date(p.verifiedAt).toLocaleString()
                        : p.createdAt
                        ? new Date(p.createdAt).toLocaleString()
                        : "N/A"}
                    </span>
                  </div>
                </div>
              ))}
          </div>
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

      {/* ─── TAB: PENDING APPROVALS (PHASE 7 #28, #29, #30) ──────────────────── */}
      {isPrivileged && (activeTab === "pending-approvals" || activeTab === "queue" || activeTab === "review-required") && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111111] p-4 rounded-2xl border border-amber-500/30">
            <div>
              <h2 className="text-sm font-orbitron font-bold text-amber-400 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                Pending Approvals ({pendingApprovalsList.length})
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                UPI payment screenshot proofs submitted by interns. Independently check receipt of ₹450 before approving.
              </p>
            </div>
            <div className="text-xs text-amber-300 font-mono bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30 w-fit">
              Awaiting Review: {pendingApprovalsList.length} Requests
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center rounded-2xl bg-[#0f0f0f] border border-white/5 space-y-3">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-zinc-400">Loading pending approvals...</p>
            </div>
          ) : pendingApprovalsList.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#0f0f0f] border border-white/5 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/50 mx-auto mb-2" />
              <p className="text-sm text-zinc-300 font-medium">All Caught Up!</p>
              <p className="text-xs text-zinc-500">There are no pending screenshot approval requests right now.</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#0f0f0f] border border-white/10 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-[#141414] text-zinc-400 uppercase text-[11px] tracking-wider border-b border-white/5">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">Intern Name</th>
                      <th className="py-3.5 px-4 font-semibold">Intern ID</th>
                      <th className="py-3.5 px-4 font-semibold">Domain</th>
                      <th className="py-3.5 px-4 font-semibold">Amount</th>
                      <th className="py-3.5 px-4 font-semibold">Payment Method</th>
                      <th className="py-3.5 px-4 font-semibold">Payment Reference</th>
                      <th className="py-3.5 px-4 font-semibold">Screenshot</th>
                      <th className="py-3.5 px-4 font-semibold">Submitted At</th>
                      <th className="py-3.5 px-4 font-semibold">Status</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {pendingApprovalsList.map((p) => (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{p.userName}</div>
                          <div className="text-[11px] text-zinc-500">{p.userEmail}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-zinc-300">
                          {p.internId || p.user?.employmentProfile?.employeeId || p.employeeId || "-"}
                        </td>
                        <td className="py-3 px-4 text-zinc-300">
                          {p.domain || p.user?.department || "General"}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-400 font-mono">
                          ₹{(p.fixedAmount || 450).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          {renderMethodBadge(p.paymentMethod)}
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-300">
                          {p.referenceId}
                        </td>
                        <td className="py-3 px-4">
                          {p.proofImageUrl ? (
                            <button
                              type="button"
                              onClick={() => setZoomedProofUrl(`/api/payments/${p.id}/proof-image`)}
                              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[11px] font-semibold border border-white/10 flex items-center gap-1 transition-colors"
                            >
                              <Eye className="w-3 h-3 text-amber-400" /> VIEW
                            </button>
                          ) : (
                            <span className="text-zinc-600 text-[11px]">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-zinc-400 text-[11px]">
                          {p.submittedAt
                            ? new Date(p.submittedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
                            : new Date(p.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                        </td>
                        <td className="py-3 px-4">
                          {renderStatusBadge(p)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => openReviewModal(p)}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-white text-xs font-orbitron font-bold uppercase transition-all shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                          >
                            REVIEW PAYMENT
                          </button>
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

      {/* ─── TAB: REJECTED PAYMENTS ─────────────────────────────────────────── */}
      {isPrivileged && activeTab === "rejected" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111111] p-4 rounded-2xl border border-rose-500/30">
            <div>
              <h2 className="text-sm font-orbitron font-bold text-rose-400 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-400" />
                Rejected Payments ({rejectedList.length})
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Payments where proof was rejected by Founder/Co-Founder. Interns can submit corrected proof against their bill.
              </p>
            </div>
            <div className="text-xs text-rose-300 font-mono bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/30 w-fit">
              Total Rejected: {rejectedList.length}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center rounded-2xl bg-[#0f0f0f] border border-white/5 space-y-3">
              <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-zinc-400">Loading rejected payments...</p>
            </div>
          ) : rejectedList.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#0f0f0f] border border-white/5 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/50 mx-auto mb-2" />
              <p className="text-sm text-zinc-300 font-medium">No Rejected Payments</p>
              <p className="text-xs text-zinc-500">There are no rejected payment records.</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#0f0f0f] border border-white/10 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-[#141414] text-zinc-400 uppercase text-[11px] tracking-wider border-b border-white/5">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">Intern ID & Name</th>
                      <th className="py-3.5 px-4 font-semibold">Domain</th>
                      <th className="py-3.5 px-4 font-semibold">Amount</th>
                      <th className="py-3.5 px-4 font-semibold">Method</th>
                      <th className="py-3.5 px-4 font-semibold">Rejection Reason</th>
                      <th className="py-3.5 px-4 font-semibold">Reviewed By</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rejectedList.map((p) => (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{p.userName}</div>
                          <div className="text-[11px] text-zinc-500">{p.internId || p.employeeId || "-"}</div>
                        </td>
                        <td className="py-3 px-4 text-zinc-300">
                          {p.domain || "General"}
                        </td>
                        <td className="py-3 px-4 font-bold text-white font-mono">
                          ₹{(p.fixedAmount || 450).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          {renderMethodBadge(p.paymentMethod)}
                        </td>
                        <td className="py-3 px-4 text-rose-300 font-medium">
                          {p.rejectionReason || p.cashRejectionReason || "Proof unverified"}
                        </td>
                        <td className="py-3 px-4 text-zinc-400 text-[11px]">
                          {p.rejectedByName || p.verifiedByName || "Management"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => openReviewModal(p)}
                            className="px-3 py-1.5 rounded-xl bg-[#222] hover:bg-[#333] text-zinc-300 text-xs font-semibold border border-white/10"
                          >
                            View
                          </button>
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

              {/* Duration Filter */}
              <select
                value={durationFilter}
                onChange={(e) => setDurationFilter(e.target.value)}
                className="w-full sm:w-auto bg-[#161616] border border-white/10 text-xs text-zinc-300 rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="ALL">All Durations</option>
                <option value="2">2 Months</option>
                <option value="3">3 Months</option>
                <option value="6">6 Months</option>
                <option value="9">9 Months</option>
              </select>

              {/* Domain Filter */}
              <select
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
                className="w-full sm:w-auto bg-[#161616] border border-white/10 text-xs text-zinc-300 rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="ALL">All Domains ({INTERNSHIP_DOMAINS.length})</option>
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
                    {CANONICAL_WORKFORCE_ROLES.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label} ({role.value})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Domain / Department {createDomain !== "ALL" ? `(${getDomainDurationLabel(createDomain)})` : ""}
                  </label>
                  <select
                    value={createDomain}
                    onChange={(e) => setCreateDomain(e.target.value)}
                    className="w-full p-2.5 bg-[#161616] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="ALL">All Domains ({INTERNSHIP_DOMAINS.length})</option>
                    <optgroup label="2 Months Tracks">
                      {INTERNSHIP_DOMAINS.filter((d) => d.durationMonths === 2).map((d) => (
                        <option key={d.key} value={d.label}>
                          {d.label} ({d.durationLabel})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="3 Months Tracks">
                      {INTERNSHIP_DOMAINS.filter((d) => d.durationMonths === 3).map((d) => (
                        <option key={d.key} value={d.label}>
                          {d.label} ({d.durationLabel})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="6 Months Tracks">
                      {INTERNSHIP_DOMAINS.filter((d) => d.durationMonths === 6).map((d) => (
                        <option key={d.key} value={d.label}>
                          {d.label} ({d.durationLabel})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="9 Months Tracks">
                      {INTERNSHIP_DOMAINS.filter((d) => d.durationMonths === 9).map((d) => (
                        <option key={d.key} value={d.label}>
                          {d.label} ({d.durationLabel})
                        </option>
                      ))}
                    </optgroup>
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
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedCashApproveItem(null);
          }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-[#101010] border border-emerald-500/40 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <Banknote className="w-6 h-6" />
                <h3 className="font-orbitron font-bold text-base text-white">
                  Confirm ₹450 Cash Received?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCashApproveItem(null)}
                aria-label="Close dialog"
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="p-4 rounded-xl bg-[#141414] border border-white/5 space-y-2.5">
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

              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 leading-relaxed">
                Confirming will mark this payment as <strong>APPROVED (CASH_RECEIVED)</strong> immediately,
                update the intern roster, and grant full service access.
              </div>
            </div>

            <div className="p-4 border-t border-white/10 bg-[#0d0d0d] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCashApproveItem(null)}
                disabled={cashActionLoading}
                className="px-4 py-2.5 rounded-xl bg-[#1c1c1c] text-zinc-300 text-xs font-semibold hover:bg-[#252525] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCashSubmit}
                disabled={cashActionLoading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(34,197,94,0.3)] disabled:opacity-50 transition-all"
              >
                {cashActionLoading ? "Confirming..." : "Confirm Cash Received"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: REJECT CASH REQUEST (REQUIREMENT 22) ─────────────────────── */}
      {selectedCashRejectItem && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedCashRejectItem(null);
          }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-[#101010] border border-crimson/40 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5 text-crimson">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="font-orbitron font-bold text-base text-white">
                  Reject Cash Payment Request
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCashRejectItem(null)}
                aria-label="Close dialog"
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="p-4 rounded-xl bg-[#141414] border border-white/5 space-y-2">
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
            </div>

            <div className="p-4 border-t border-white/10 bg-[#0d0d0d] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCashRejectItem(null)}
                disabled={cashActionLoading}
                className="px-4 py-2.5 rounded-xl bg-[#1c1c1c] text-zinc-300 text-xs font-semibold hover:bg-[#252525] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectCashSubmit}
                disabled={cashActionLoading}
                className="px-5 py-2.5 rounded-xl bg-crimson hover:bg-crimson/90 text-white text-xs font-bold disabled:opacity-50 transition-all"
              >
                {cashActionLoading ? "Processing..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CASH REQUEST CARD PREVIEW (REQUIREMENT 17) ───────────────── */}
      {selectedCashCardItem && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedCashCardItem(null);
          }}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-[#101010] border border-white/15 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
              <h3 className="font-orbitron font-bold text-sm text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-bright-red" />
                CodeXa Cash Payment Request Card
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCashCardItem(null)}
                aria-label="Close dialog"
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-center p-4 bg-[#080808] overflow-y-auto flex-1">
              <img
                src={`/api/payments/${selectedCashCardItem.id}/cash/card`}
                alt="Cash Payment Request Card"
                className="max-h-[380px] w-auto object-contain rounded-lg"
              />
            </div>

            <div className="p-4 border-t border-white/10 bg-[#0d0d0d] flex items-center justify-between text-xs text-zinc-500 shrink-0">
              <span>Watermarked: PENDING CASH APPROVAL</span>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/payments/${selectedCashCardItem.id}/cash/card`}
                  download={`codexa_cash_card_${selectedCashCardItem.referenceId}.svg`}
                  className="px-3.5 py-2 rounded-xl bg-[#181818] hover:bg-[#222222] text-zinc-300 font-semibold transition-colors"
                >
                  Download SVG
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedCashCardItem(null)}
                  className="px-4 py-2 rounded-xl bg-bright-red hover:bg-bright-red/90 text-white font-semibold transition-colors"
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
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedReviewPayment(null);
          }}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-[#101010] border border-white/15 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Sticky Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#0d0d0d]">
              <div>
                <span className="font-mono text-xs font-bold text-bright-red bg-crimson/10 px-2.5 py-1 rounded-md border border-crimson/20">
                  {selectedReviewPayment.referenceId}
                </span>
                <h3 className="text-base font-orbitron font-bold text-white mt-1.5 flex items-center gap-2">
                  <span>Payment Approval Review</span>
                  {selectedReviewPayment.paymentStatus === "APPROVED" && (
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      Already Approved
                    </span>
                  )}
                  {selectedReviewPayment.paymentStatus === "PENDING_APPROVAL" && (
                    <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 animate-pulse">
                      Pending Founder/Co-Founder Review
                    </span>
                  )}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReviewPayment(null)}
                aria-label="Close dialog"
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto flex-1">
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
                  <span className="text-[11px] font-semibold uppercase text-zinc-500 block">Intern Details</span>
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
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Duration Track:</span>
                    <span className="text-zinc-300">{getDomainDurationLabel(selectedReviewPayment.domain)}</span>
                  </div>
                  {selectedReviewPayment.internId && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Intern ID:</span>
                      <span className="font-mono text-zinc-300">{selectedReviewPayment.internId}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-[#141414] border border-white/5 space-y-2">
                  <span className="text-[11px] font-semibold uppercase text-zinc-500 block">Payment Details</span>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Payable Amount:</span>
                    <span className="font-bold text-sm text-emerald-400">₹{(selectedReviewPayment.fixedAmount || 450).toLocaleString()} Fixed</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Payment Method:</span>
                    <span className="text-white font-medium">{selectedReviewPayment.paymentMethod || selectedReviewPayment.upiApp || "UPI"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Official Receiver:</span>
                    <span className="font-mono text-zinc-300">shaikashu33@fam (CodeXa Agency)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">CodeXa Reference:</span>
                    <span className="font-mono font-semibold text-white bg-black/40 px-2 py-0.5 rounded border border-white/10">
                      {selectedReviewPayment.referenceId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Attempt Started:</span>
                    <span className="text-zinc-400">
                      {new Date(selectedReviewPayment.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Proof Submitted:</span>
                    <span className="text-zinc-300">
                      {selectedReviewPayment.submittedAt
                        ? new Date(selectedReviewPayment.submittedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
                        : "N/A"}
                    </span>
                  </div>
                </div>

                {/* Independent Receipt Confirmation Checkbox (Phase 7 #33) */}
                {selectedReviewPayment.paymentStatus !== "APPROVED" && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmReceivedChecked}
                        onChange={(e) => setConfirmReceivedChecked(e.target.checked)}
                        className="mt-0.5 rounded border-amber-400 text-amber-500 focus:ring-0 w-4 h-4 shrink-0"
                      />
                      <span className="leading-relaxed">
                        <strong>Receipt Confirmation:</strong> Have you independently confirmed receipt of ₹450 in the official CodeXa receiving account?
                      </span>
                    </label>
                  </div>
                )}

                {reviewAction === "REJECT" && (
                  <div className="p-4 rounded-xl bg-crimson/10 border border-crimson/30 space-y-3">
                    <label className="block font-semibold text-crimson text-xs">Select Rejection Reason *</label>
                    <select
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full p-2.5 bg-[#161616] border border-crimson/40 rounded-xl text-xs text-white"
                    >
                      <option value="">-- Choose Standard Reason --</option>
                      <option value="Amount not received">Amount not received</option>
                      <option value="Unable to identify transaction">Unable to identify transaction</option>
                      <option value="Screenshot unclear">Screenshot unclear</option>
                      <option value="Screenshot does not correspond to this payment">Screenshot does not correspond to this payment</option>
                      <option value="Duplicate/previously used payment evidence">Duplicate/previously used payment evidence</option>
                      <option value="Wrong receiver">Wrong receiver</option>
                      <option value="Other">Other</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Or enter custom rejection note..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full p-2.5 bg-[#161616] border border-white/10 rounded-xl text-xs text-white"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <span className="text-[11px] font-semibold uppercase text-zinc-400 block">
                  Payment Proof Screenshot (Evidence)
                </span>

                <div className="p-2 rounded-2xl bg-[#080808] border border-white/10 flex items-center justify-center min-h-[300px] max-h-[460px] overflow-hidden relative group">
                  {selectedReviewPayment.proofImageUrl && !proofImageError ? (
                    <>
                      <img
                        key={proofImageKey}
                        src={`/api/payments/${selectedReviewPayment.id}/proof-image?t=${proofImageKey}`}
                        alt="Payment Proof"
                        className="max-h-[440px] w-auto object-contain rounded-xl hover:scale-105 transition-transform cursor-pointer"
                        onError={() => setProofImageError(true)}
                        onClick={() => {
                          setZoomScale(1);
                          setZoomedProofUrl(`/api/payments/${selectedReviewPayment.id}/proof-image`);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setZoomScale(1);
                          setZoomedProofUrl(`/api/payments/${selectedReviewPayment.id}/proof-image`);
                        }}
                        className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg border border-white/20 opacity-90 group-hover:opacity-100 transition-opacity"
                      >
                        <Eye className="w-3.5 h-3.5" /> Open Lightbox / Zoom
                      </button>
                    </>
                  ) : proofImageError ? (
                    <div className="p-6 text-center space-y-3">
                      <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                      <p className="text-xs text-zinc-300 font-semibold">
                        Payment Screenshot Could Not Be Loaded
                      </p>
                      <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                        Image may be processing or requires secure authorization.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setProofImageError(false);
                            setProofImageKey((k) => k + 1);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium"
                        >
                          Retry Loading
                        </button>
                        <a
                          href={`/api/payments/${selectedReviewPayment.id}/proof-image`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-bright-red hover:bg-bright-red/90 text-white text-xs font-medium inline-flex items-center gap-1"
                        >
                          Open Secure Proof <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="text-zinc-600 text-xs">No screenshot attached</div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
                  <span>Click image to zoom or view in full-screen Lightbox</span>
                  {selectedReviewPayment.proofImageUrl && (
                    <a
                      href={`/api/payments/${selectedReviewPayment.id}/proof-image`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-bright-red hover:underline flex items-center gap-1"
                    >
                      Open in New Tab <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {resendNotificationSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{resendNotificationSuccess}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="p-5 border-t border-white/10 bg-[#121212] flex items-center justify-between gap-3 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedReviewPayment(null)}
                className="px-4 py-2.5 rounded-xl bg-[#1c1c1c] text-zinc-300 text-xs font-semibold hover:bg-[#252525] transition-colors"
              >
                Close
              </button>

              {/* Founder / Co-Founder Controls vs Executive Read-Only */}
              {effectiveRole === "FOUNDER" || effectiveRole === "CO_FOUNDER" ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleResendNotification}
                    disabled={resendingNotification}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    title="Resend notification email with screenshot attachment to Founder and Co-Founder"
                  >
                    <Send className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{resendingNotification ? "Resending..." : "Resend Email"}</span>
                  </button>

                  {reviewAction !== "REJECT" ? (
                    <button
                      type="button"
                      onClick={() => setReviewAction("REJECT")}
                      disabled={reviewLoading}
                      className="px-4 py-2 rounded-xl bg-crimson/20 hover:bg-crimson/30 border border-crimson/40 text-crimson text-xs font-bold transition-colors"
                    >
                      REJECT PAYMENT
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRejectException}
                      disabled={reviewLoading || !rejectionReason.trim()}
                      className="px-5 py-2 rounded-xl bg-crimson hover:bg-crimson/90 text-white text-xs font-bold transition-all shadow-lg disabled:opacity-50"
                    >
                      {reviewLoading ? "Processing..." : "CONFIRM REJECTION"}
                    </button>
                  )}

                  {selectedReviewPayment.paymentStatus !== "APPROVED" && (
                    <button
                      type="button"
                      onClick={handleApproveException}
                      disabled={reviewLoading || !confirmReceivedChecked}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)] flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Check className="w-4 h-4" />
                      {reviewLoading ? "Approving..." : "APPROVE PAYMENT"}
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-xs text-zinc-400 bg-zinc-900 border border-white/5 px-3 py-1.5 rounded-xl">
                  🔒 Executive Read-Only View &bull; Decisions reserved for Founder &amp; Co-Founder
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: HIGH-RESOLUTION SCREENSHOT LIGHTBOX (REQUIREMENT 19) ───── */}
      {zoomedProofUrl && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setZoomedProofUrl(null);
              setZoomScale(1);
            }
          }}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
        >
          {/* Top Bar with Clear Controls */}
          <div className="w-full max-w-4xl flex items-center justify-between pb-3 px-2 text-xs text-zinc-400">
            <span className="font-semibold text-white">Payment Proof Inspection (ESC to close)</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white/10 rounded-xl p-1 gap-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => setZoomScale((s) => Math.max(0.5, s - 0.25))}
                  className="px-2 py-1 hover:bg-white/10 rounded text-xs font-bold text-white"
                  title="Zoom Out"
                >
                  -
                </button>
                <span className="text-[11px] font-mono px-1.5 text-zinc-300">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomScale((s) => Math.min(3, s + 0.25))}
                  className="px-2 py-1 hover:bg-white/10 rounded text-xs font-bold text-white"
                  title="Zoom In"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(1)}
                  className="px-2 py-1 hover:bg-white/10 rounded text-[10px] text-zinc-400 hover:text-white"
                >
                  Reset
                </button>
              </div>

              <a
                href={zoomedProofUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
              </a>

              <button
                type="button"
                onClick={() => {
                  setZoomedProofUrl(null);
                  setZoomScale(1);
                }}
                aria-label="Close screenshot preview"
                className="px-3.5 py-1.5 rounded-xl bg-bright-red hover:bg-bright-red/90 text-white font-bold flex items-center gap-1.5 shadow-lg transition-colors"
              >
                <X className="w-4 h-4" /> Close
              </button>
            </div>
          </div>

          <div className="relative max-w-4xl w-full max-h-[82vh] overflow-auto rounded-2xl border border-white/20 bg-[#080808] flex items-center justify-center p-4 shadow-2xl">
            <img
              src={zoomedProofUrl}
              alt="Zoomed Payment Proof"
              style={{ transform: `scale(${zoomScale})`, transition: "transform 0.15s ease-out" }}
              className="max-h-[76vh] w-auto max-w-full object-contain select-none cursor-zoom-in"
              onClick={() => setZoomScale((s) => (s >= 2 ? 1 : s + 0.5))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
