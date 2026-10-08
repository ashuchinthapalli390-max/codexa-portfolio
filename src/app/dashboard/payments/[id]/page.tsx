"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  Shield,
  FileCheck,
  Calendar,
  Sparkles,
  Info,
  Bell,
  Send,
  Mail,
  RefreshCw,
  ExternalLink,
  Smartphone,
  Eye,
  Check,
  X,
  MessageSquare,
  Lock,
  User,
  Hash,
  Layers,
  Banknote,
  Search,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getEffectiveRole } from "@/lib/permissions";
import { InternAutomaticPaymentFlow } from "@/components/payments/InternAutomaticPaymentFlow";

interface LineItem {
  item: string;
  amount: number;
  details?: string[];
  subItems?: string[];
}

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, status } = useAuth();
  const paymentId = params.id as string;

  const [payment, setPayment] = useState<any>(null);
  const [reminderLogs, setReminderLogs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [duplicateWarnings, setDuplicateWarnings] = useState<any>({});
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);

  // Review & Exception Action States
  const [processingAction, setProcessingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals State
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  // Cash Action Modals
  const [showCashApproveModal, setShowCashApproveModal] = useState(false);
  const [showCashRejectModal, setShowCashRejectModal] = useState(false);
  const [cashRejectReason, setCashRejectReason] = useState("");

  // Screenshot Zoom Modal
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  // Dispatch Reminder State
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderMessage, setReminderMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchPayment = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/payments/${paymentId}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) {
        throw new Error("Failed to load payment");
      }
      const data = await res.json();
      setPayment(data.payment);
      if (data.reminderLogs) setReminderLogs(data.reminderLogs);
      if (data.auditLogs) setAuditLogs(data.auditLogs);
      if (data.duplicateWarnings) setDuplicateWarnings(data.duplicateWarnings);
      setCanManage(Boolean(data.canManage));
    } catch (err: any) {
      console.error("Error fetching payment:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && paymentId) {
      fetchPayment();
    }
  }, [status, paymentId]);

  // Keyboard Escape listener to safely close any active modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (zoomedImageUrl) {
          setZoomedImageUrl(null);
        } else if (showApproveModal) {
          setShowApproveModal(false);
        } else if (showRejectModal) {
          setShowRejectModal(false);
        } else if (showCashApproveModal) {
          setShowCashApproveModal(false);
        } else if (showCashRejectModal) {
          setShowCashRejectModal(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomedImageUrl, showApproveModal, showRejectModal, showCashApproveModal, showCashRejectModal]);

  // Prevent background scrolling while any modal or lightbox is active
  useEffect(() => {
    const isModalOpen = Boolean(
      zoomedImageUrl ||
      showApproveModal ||
      showRejectModal ||
      showCashApproveModal ||
      showCashRejectModal
    );
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [zoomedImageUrl, showApproveModal, showRejectModal, showCashApproveModal, showCashRejectModal]);

  // Dispatch Reminder
  const handleSendReminder = async () => {
    if (!payment?.id) return;
    try {
      setSendingReminder(true);
      setReminderMessage(null);
      const res = await fetch(`/api/payments/${payment.id}/reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReminderMessage({
          type: "error",
          text: data.error || "Failed to dispatch reminder.",
        });
      } else {
        setReminderMessage({
          type: "success",
          text: "Payment reminder dispatched successfully via Resend Email and Web Push!",
        });
        fetchPayment();
      }
    } catch (err: any) {
      setReminderMessage({
        type: "error",
        text: err.message || "Failed to trigger reminder.",
      });
    } finally {
      setSendingReminder(false);
    }
  };

  // Approve Exception (Founder / Co-Founder)
  const handleApproveException = async () => {
    if (!payment?.id) return;
    try {
      setProcessingAction(true);
      setActionError(null);
      const res = await fetch(`/api/payments/${payment.id}/review/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: selectedAttemptId,
          notes: approvalNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to approve payment exception.");
      }
      setActionSuccess("Payment successfully approved! Intern access cleared and confirmation email sent.");
      setShowApproveModal(false);
      setApprovalNotes("");
      await fetchPayment();
    } catch (err: any) {
      setActionError(err.message || "Approval failed.");
    } finally {
      setProcessingAction(false);
    }
  };

  // Reject Exception (Founder / Co-Founder)
  const handleRejectException = async () => {
    if (!payment?.id || !rejectionReason.trim()) return;
    try {
      setProcessingAction(true);
      setActionError(null);
      const res = await fetch(`/api/payments/${payment.id}/review/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: selectedAttemptId,
          reason: rejectionReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reject payment proof.");
      }
      setActionSuccess("Payment proof rejected. Intern has been notified.");
      setShowRejectModal(false);
      setRejectionReason("");
      await fetchPayment();
    } catch (err: any) {
      setActionError(err.message || "Rejection failed.");
    } finally {
      setProcessingAction(false);
    }
  };

  // Re-run Automated Verification (Founder / Co-Founder)
  const handleRerunVerification = async (attemptId: string) => {
    if (!payment?.id) return;
    try {
      setProcessingAction(true);
      setActionError(null);
      setActionSuccess(null);
      const res = await fetch(`/api/payments/${payment.id}/verification/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to re-run verification.");
      }
      setActionSuccess(`Verification re-run complete: ${data.decision.status}`);
      await fetchPayment();
    } catch (err: any) {
      setActionError(err.message || "Re-verification failed.");
    } finally {
      setProcessingAction(false);
    }
  };

  // Confirm Cash Received (Founder / Co-Founder)
  const handleConfirmCash = async () => {
    if (!payment?.id) return;
    try {
      setProcessingAction(true);
      setActionError(null);
      const res = await fetch(`/api/payments/${payment.id}/cash/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to confirm cash receipt.");
      }
      setActionSuccess("Cash payment confirmed! Intern access cleared and receipt dispatched.");
      setShowCashApproveModal(false);
      await fetchPayment();
    } catch (err: any) {
      setActionError(err.message || "Cash confirmation failed.");
    } finally {
      setProcessingAction(false);
    }
  };

  // Reject Cash (Founder / Co-Founder)
  const handleRejectCash = async () => {
    if (!payment?.id || !cashRejectReason.trim()) return;
    try {
      setProcessingAction(true);
      setActionError(null);
      const res = await fetch(`/api/payments/${payment.id}/cash/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cashRejectReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reject cash payment.");
      }
      setActionSuccess("Cash payment request rejected.");
      setShowCashRejectModal(false);
      setCashRejectReason("");
      await fetchPayment();
    } catch (err: any) {
      setActionError(err.message || "Cash rejection failed.");
    } finally {
      setProcessingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-2 border-bright-red border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-orbitron tracking-widest text-zinc-500 uppercase">
          Loading CodeXa Payment Control Center...
        </p>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="max-w-xl mx-auto p-12 text-center rounded-2xl bg-[#0f0f0f] border border-white/10 space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-lg font-orbitron font-bold text-white">Payment Request Not Found</h2>
        <p className="text-xs text-zinc-400">
          The requested payment reference does not exist or you do not have permission to view it.
        </p>
        <Link
          href="/dashboard/payments"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-bright-red text-white text-xs font-semibold"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Payments
        </Link>
      </div>
    );
  }

  const role = user ? getEffectiveRole(user) : "";
  const isPrivileged = ["FOUNDER", "CO_FOUNDER", "HR", "CEO", "CTO", "COO", "ADMIN"].includes(role);

  // Intern View: Delegate to zero-manual-entry InternAutomaticPaymentFlow
  if (role === "INTERN" || !isPrivileged) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/payments"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Payments</span>
          </Link>
        </div>
        <InternAutomaticPaymentFlow onStatusChange={() => fetchPayment()} />
      </div>
    );
  }

  // Bill Line Items
  const lineItems: LineItem[] = payment.lineItems || [
    { item: "Mandatory Student ID Card", amount: 150 },
    {
      item: "AI Dev Tools Pack (Shared)",
      amount: 300,
      details: ["Nexa AI Access", "ChatGPT Astra", "Anthropic Fabel", "Gemini Pro"],
    },
  ];

  const attempts: any[] = payment.attempts || [];
  const latestAttempt = attempts[0] || null;
  const isApproved = payment.paymentStatus === "APPROVED" || payment.paymentStatus === "SUCCESS";
  const isReviewRequired = payment.paymentStatus === "REVIEW_REQUIRED";
  const isPendingCash = payment.cashStatus === "PENDING_CASH_APPROVAL";
  const isFailed = payment.paymentStatus === "FAILED" || payment.paymentStatus === "REJECTED";

  // WhatsApp Alert URL for Co-Founder B. Sanjay (7075920852)
  const coFounderPhone = "917075920852";
  const waReviewUrl = `https://codxa-agency.online/dashboard/payments/${payment.id}`;
  const detectedTimeStr = latestAttempt?.detectedTime || "N/A";
  const windowStartStr = latestAttempt ? new Date(latestAttempt.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "6:10 PM";
  const windowEndStr = latestAttempt ? new Date(latestAttempt.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "6:15 PM";
  const maskedUtrStr = latestAttempt?.utrNumber || payment.utrNumber || "N/A";

  const waReviewMessage = [
    "CodeXa Payment Verification Required",
    "",
    `Intern: ${payment.userName || "Intern"}`,
    `Intern ID: ${payment.internId || "CXA-INT-2026"}`,
    `Domain: ${payment.domain || "Development"}`,
    "",
    `Amount: ₹450`,
    `Method: ${latestAttempt?.detectedApp || latestAttempt?.selectedMethod || payment.paymentMethod || "UPI"}`,
    `Reference: ${payment.referenceId}`,
    "",
    `Detected UTR: ${maskedUtrStr}`,
    "",
    "Expected Payment Window:",
    `${windowStartStr} – ${windowEndStr}`,
    "",
    `Detected Payment Time: ${detectedTimeStr}`,
    "",
    "Issue:",
    latestAttempt?.verificationReason === "PAYMENT_TIME_OUTSIDE_WINDOW"
      ? "Payment is outside the automatic verification window."
      : "Automated settlement feed reconciliation pending.",
    "",
    "All remaining verification checks passed.",
    "",
    "Review Payment:",
    waReviewUrl,
    "",
    "— CodeXa Payment System",
  ].join("\n");

  const waDirectLink = `https://wa.me/${coFounderPhone}?text=${encodeURIComponent(waReviewMessage)}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* ─── TOP NAVIGATION & METADATA ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <Link
          href="/dashboard/payments"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Live Payment Control Center
        </Link>

        <div className="flex items-center gap-3 text-xs">
          <span className="font-mono text-zinc-500">Ref: {payment.referenceId}</span>
          <span className="text-zinc-600">&bull;</span>
          <span className="text-zinc-400">Created {new Date(payment.createdAt).toLocaleDateString()}</span>
          {!canManage && (
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-white/10 text-[10px] font-semibold flex items-center gap-1">
              <Lock className="w-3 h-3" /> Read-Only ({role})
            </span>
          )}
        </div>
      </div>

      {/* Action Messages */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-2xl bg-crimson/15 border border-crimson/30 text-crimson text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-crimson hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Duplicate Warnings Banner */}
      {(duplicateWarnings.duplicateUtr || duplicateWarnings.duplicateScreenshot) && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <div className="font-bold uppercase tracking-wider text-[11px]">Potential Duplicate Transaction Detected</div>
            <p className="mt-0.5 text-zinc-300">
              {duplicateWarnings.duplicateUtr && (
                <span>This UTR is already attached to another verified bill ({duplicateWarnings.conflictingReference}). </span>
              )}
              {duplicateWarnings.duplicateScreenshot && (
                <span>This screenshot hash matches a previously submitted receipt ({duplicateWarnings.conflictingReference}). </span>
              )}
              Strict duplicate protection triggered.
            </p>
          </div>
        </div>
      )}

      {/* ─── STATUS HERO BANNER ────────────────────────────────────────────── */}
      <div
        className={`p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl ${
          isApproved
            ? "bg-emerald-950/20 border-emerald-500/30"
            : isReviewRequired
            ? "bg-amber-950/20 border-amber-500/40"
            : isPendingCash
            ? "bg-amber-950/20 border-amber-500/30"
            : isFailed
            ? "bg-crimson/10 border-crimson/30"
            : "bg-[#121212] border-white/10"
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-2xl shrink-0 ${
              isApproved
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : isReviewRequired
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                : isPendingCash
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : isFailed
                ? "bg-crimson/20 text-crimson border border-crimson/30"
                : "bg-white/5 text-zinc-400 border border-white/10"
            }`}
          >
            {isApproved ? (
              <CheckCircle2 className="w-7 h-7" />
            ) : isReviewRequired ? (
              <AlertTriangle className="w-7 h-7 animate-pulse text-amber-400" />
            ) : isPendingCash ? (
              <Banknote className="w-7 h-7 text-amber-400" />
            ) : isFailed ? (
              <XCircle className="w-7 h-7 text-crimson" />
            ) : (
              <Clock className="w-7 h-7 text-zinc-400" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-orbitron font-extrabold text-base text-white">
                {isApproved
                  ? "PAYMENT SUCCESSFUL & CLEARED"
                  : isReviewRequired
                  ? "PAYMENT REVIEW REQUIRED"
                  : isPendingCash
                  ? "CASH PAYMENT REQUEST PENDING"
                  : isFailed
                  ? "PAYMENT VERIFICATION FAILED"
                  : "PAYMENT PENDING"}
              </span>

              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  isApproved
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : isReviewRequired
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                    : isPendingCash
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : isFailed
                    ? "bg-crimson/20 text-crimson border border-crimson/30"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {payment.paymentStatus}
              </span>
            </div>

            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              {isApproved && (
                <span>
                  Verified via {payment.verificationSource || "Automated Decision Engine"} on{" "}
                  {new Date(payment.verifiedAt || payment.paidAt).toLocaleString()} by {payment.verifiedByName || "System"}.
                </span>
              )}
              {isReviewRequired && (
                <span>
                  The payment screenshot was automatically detected and processed, but an exception requires confirmation by Founder or Co-Founder.
                </span>
              )}
              {isPendingCash && (
                <span>
                  Intern requested to pay ₹450 physically in cash. Handover must be received and confirmed by Founder or Co-Founder.
                </span>
              )}
              {isFailed && (
                <span>
                  Reason: {payment.rejectionReason || "Verification checks failed."}
                </span>
              )}
              {!isApproved && !isReviewRequired && !isPendingCash && !isFailed && (
                <span>Intern has not yet finalized a verified payment attempt.</span>
              )}
            </p>
          </div>
        </div>

        {/* Quick Review / Cash Action Buttons (Founder / Co-Founder only) */}
        <div className="flex items-center gap-2 shrink-0">
          {isReviewRequired && canManage && (
            <>
              <button
                onClick={() => {
                  setSelectedAttemptId(latestAttempt?.id || null);
                  setShowApproveModal(true);
                }}
                disabled={processingAction}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Approve Exception
              </button>

              <button
                onClick={() => {
                  setSelectedAttemptId(latestAttempt?.id || null);
                  setShowRejectModal(true);
                }}
                disabled={processingAction}
                className="px-4 py-2 rounded-xl bg-crimson/20 hover:bg-crimson text-crimson hover:text-white border border-crimson/30 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <X className="w-4 h-4" /> Reject
              </button>
            </>
          )}

          {isPendingCash && canManage && (
            <>
              <button
                onClick={() => setShowCashApproveModal(true)}
                disabled={processingAction}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Confirm Cash Received
              </button>

              <button
                onClick={() => setShowCashRejectModal(true)}
                disabled={processingAction}
                className="px-4 py-2 rounded-xl bg-crimson/20 hover:bg-crimson text-crimson hover:text-white border border-crimson/30 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <X className="w-4 h-4" /> Reject Cash
              </button>
            </>
          )}

          {/* WhatsApp Alert Button */}
          {isReviewRequired && (
            <a
              href={waDirectLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5"
              title="Alert Co-Founder B. Sanjay on WhatsApp"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              WhatsApp Alert
            </a>
          )}
        </div>
      </div>

      {/* ─── INTERN DETAILS & ITEM BILL ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Intern Details Card */}
        <div className="p-6 rounded-3xl bg-[#0f0f0f] border border-white/10 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <User className="w-4 h-4 text-bright-red" />
            <h3 className="font-orbitron font-bold text-white text-xs tracking-wider uppercase">
              Intern Profile
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[11px] text-zinc-500 block">Intern Name</span>
              <span className="font-bold text-white text-sm">{payment.userName}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[11px] text-zinc-500 block">Intern ID</span>
                <span className="font-mono text-zinc-300 font-semibold">{payment.internId || "Pending"}</span>
              </div>
              <div>
                <span className="text-[11px] text-zinc-500 block">Domain</span>
                <span className="text-white font-medium">{payment.domain || "Development"}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-zinc-500 block">Email Address</span>
              <span className="text-zinc-300 truncate block font-mono text-[11px]">{payment.userEmail}</span>
            </div>

            {payment.user?.employmentProfile?.joiningDate && (
              <div>
                <span className="text-[11px] text-zinc-500 block">Joined</span>
                <span className="text-zinc-400">
                  {new Date(payment.user.employmentProfile.joiningDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bill & Payment Snapshot Card */}
        <div className="p-6 rounded-3xl bg-[#0f0f0f] border border-white/10 space-y-4 md:col-span-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-bright-red" />
              <h3 className="font-orbitron font-bold text-white text-xs tracking-wider uppercase">
                Mandatory Bill Breakdown (Fixed ₹450)
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-white/5">
              Server-Enforced Amount
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {lineItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#141414] border border-white/5">
                <div>
                  <div className="font-medium text-white">{item.item}</div>
                  {item.details && (
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      {item.details.join(" • ")}
                    </div>
                  )}
                </div>
                <div className="font-mono font-bold text-white text-sm">₹{item.amount}</div>
              </div>
            ))}

            <div className="flex items-center justify-between p-3 rounded-xl bg-crimson/10 border border-crimson/30">
              <span className="font-orbitron font-bold text-white text-xs uppercase tracking-wider">
                Total Payable Amount
              </span>
              <span className="font-orbitron font-extrabold text-bright-red text-base">
                ₹{payment.fixedAmount || 450}.00
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── REVIEW REQUIRED SPECIAL EXCEPTION CARD (SECTION 25 & 49) ───────── */}
      {isReviewRequired && latestAttempt && (
        <div className="p-6 sm:p-8 rounded-3xl bg-amber-950/20 border-2 border-amber-500/40 space-y-6 shadow-2xl relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-orbitron font-extrabold text-white text-base flex items-center gap-2">
                  Exception Review Center
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Founder / Co-Founder Action
                  </span>
                </h3>
                <p className="text-xs text-zinc-300 mt-0.5">
                  Issue:{" "}
                  <strong className="text-amber-400">
                    {latestAttempt.verificationReason === "PAYMENT_TIME_OUTSIDE_WINDOW"
                      ? "Payment timestamp outside the 5-minute session window."
                      : "Settlement feed pending live bank credit."}
                  </strong>{" "}
                  All remaining security checks passed.
                </p>
              </div>
            </div>

            {canManage && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedAttemptId(latestAttempt.id);
                    setShowApproveModal(true);
                  }}
                  disabled={processingAction}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Approve Exception
                </button>

                <button
                  onClick={() => {
                    setSelectedAttemptId(latestAttempt.id);
                    setShowRejectModal(true);
                  }}
                  disabled={processingAction}
                  className="px-4 py-2 rounded-xl bg-crimson/20 hover:bg-crimson text-crimson hover:text-white border border-crimson/30 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" /> Reject Exception
                </button>

                <button
                  onClick={() => handleRerunVerification(latestAttempt.id)}
                  disabled={processingAction}
                  className="px-3 py-2 rounded-xl bg-[#222] hover:bg-[#2c2c2c] text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5"
                  title="Re-run OCR and verification engine"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${processingAction ? "animate-spin" : ""}`} />
                  Re-run Check
                </button>
              </div>
            )}
          </div>

          {/* Review Details Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-[#141414] border border-white/5">
              <span className="text-[11px] text-zinc-500 block">Detected Method</span>
              <span className="font-bold text-white mt-1 block">
                {latestAttempt.detectedApp || latestAttempt.selectedMethod}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#141414] border border-white/5">
              <span className="text-[11px] text-zinc-500 block">Detected UTR</span>
              <span className="font-mono font-bold text-white mt-1 block truncate">
                {latestAttempt.utrNumber || latestAttempt.detectedUtr || "N/A"}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#141414] border border-white/5">
              <span className="text-[11px] text-zinc-500 block">Expected Window</span>
              <span className="font-medium text-zinc-300 mt-1 block">
                {windowStartStr} – {windowEndStr}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#141414] border border-white/5">
              <span className="text-[11px] text-zinc-500 block">Detected Time</span>
              <span className="font-bold text-amber-400 mt-1 block">
                {detectedTimeStr}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── PAYMENT ATTEMPTS & FULL VERIFICATION HISTORY (SECTION 42–46, 73–77) ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-bright-red" />
            <h2 className="font-orbitron font-bold text-white text-sm uppercase tracking-wider">
              Payment Attempts &amp; Verification Evidence ({attempts.length})
            </h2>
          </div>
          <span className="text-xs text-zinc-500">
            Immutable attempt records with uploaded receipts
          </span>
        </div>

        {attempts.length === 0 ? (
          <div className="p-8 rounded-3xl bg-[#0f0f0f] border border-white/5 text-center text-zinc-500 text-xs">
            No payment attempts initiated yet.
          </div>
        ) : (
          <div className="space-y-6">
            {attempts.map((att, idx) => {
              const attemptNum = attempts.length - idx;
              const isAttemptSuccess = att.status === "SUCCESS";
              const isAttemptReview = att.status === "REVIEW_REQUIRED";
              const isAttemptFailed = att.status === "FAILED" || att.status === "EXPIRED";
              const checks = att.ocrConfidence?.checks || {
                screenshotReadable: "PASS",
                paymentStatus: "PASS",
                amount: "PASS",
                utr: "PASS",
                duplicateUtr: "PASS",
                duplicateProof: "PASS",
                receiver: "PASS",
                paymentDate: "PASS",
                paymentTime: isAttemptReview ? "REVIEW" : "PASS",
                trustedTransaction: isAttemptReview ? "REVIEW" : "PASS",
              };

              return (
                <div
                  key={att.id}
                  className={`p-6 sm:p-7 rounded-3xl border space-y-6 transition-all ${
                    isAttemptSuccess
                      ? "bg-[#0d140e] border-emerald-500/30"
                      : isAttemptReview
                      ? "bg-[#14120a] border-amber-500/30"
                      : isAttemptFailed
                      ? "bg-[#140b0b] border-crimson/20"
                      : "bg-[#0f0f0f] border-white/10"
                  }`}
                >
                  {/* Attempt Card Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-xl bg-black/60 border border-white/10 text-white font-orbitron font-bold text-xs">
                        Attempt #{attemptNum}
                      </span>

                      <div className="text-xs">
                        <span className="text-white font-semibold">
                          {att.detectedApp || att.selectedMethod || "UPI"}
                        </span>
                        <span className="text-zinc-500 mx-2">&bull;</span>
                        <span className="text-zinc-400">
                          {new Date(att.startedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isAttemptSuccess
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : isAttemptReview
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : "bg-crimson/20 text-crimson border border-crimson/30"
                        }`}
                      >
                        {att.status}
                      </span>

                      {canManage && att.proofImageUrl && (
                        <button
                          onClick={() => handleRerunVerification(att.id)}
                          disabled={processingAction}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold flex items-center gap-1"
                          title="Re-run Verification"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Re-verify
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Attempt Content: Screenshot + Extracted Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left: Uploaded Screenshot Thumbnail */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold uppercase text-zinc-400 tracking-wider block">
                        Uploaded Receipt Evidence
                      </span>

                      {att.proofImageUrl ? (
                        <div
                          onClick={() => setZoomedImageUrl(`/api/payments/${payment.id}/proof/${att.id}`)}
                          className="relative group cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-black max-w-[220px] aspect-[9/16] flex items-center justify-center"
                        >
                          <img
                            src={`/api/payments/${payment.id}/proof/${att.id}`}
                            alt={`Attempt #${attemptNum} Proof`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs gap-1">
                            <Eye className="w-5 h-5" />
                            <span>Click to Zoom</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 rounded-2xl bg-[#141414] border border-dashed border-white/10 text-center text-zinc-500 text-xs">
                          No screenshot uploaded for this session
                        </div>
                      )}
                    </div>

                    {/* Middle: Normalized OCR Extracted Data (Immutable) */}
                    <div className="space-y-3 md:col-span-2">
                      <span className="text-[11px] font-semibold uppercase text-zinc-400 tracking-wider block">
                        Automatically Extracted Transaction Details (Immutable)
                      </span>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                        <div className="p-3 rounded-xl bg-[#141414] border border-white/5">
                          <span className="text-[10px] text-zinc-500 block">Payment App</span>
                          <span className="font-semibold text-white mt-0.5 block">
                            {att.detectedApp || att.selectedMethod || "UPI"}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-[#141414] border border-white/5">
                          <span className="text-[10px] text-zinc-500 block">Detected Status</span>
                          <span className="font-semibold text-emerald-400 mt-0.5 block">
                            {att.detectedStatus || "SUCCESS"}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-[#141414] border border-white/5">
                          <span className="text-[10px] text-zinc-500 block">Detected Amount</span>
                          <span className="font-mono font-bold text-white mt-0.5 block">
                            ₹{att.detectedAmount ? Number(att.detectedAmount) : 450}.00
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-[#141414] border border-white/5">
                          <span className="text-[10px] text-zinc-500 block">UTR / Ref No</span>
                          <span className="font-mono font-bold text-white mt-0.5 block truncate">
                            {att.utrNumber || att.detectedUtr || "Not detected"}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-[#141414] border border-white/5">
                          <span className="text-[10px] text-zinc-500 block">Payee / Receiver</span>
                          <span className="font-medium text-zinc-300 mt-0.5 block truncate">
                            {att.detectedReceiverName || att.receiverSnapshot || "CodeXa Agency"}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-[#141414] border border-white/5">
                          <span className="text-[10px] text-zinc-500 block">Date &amp; Time</span>
                          <span className="font-medium text-zinc-300 mt-0.5 block">
                            {att.detectedDate || "Today"} {att.detectedTime || ""}
                          </span>
                        </div>
                      </div>

                      {/* 10-Check Verification Engine Table (Section 15, 25, 40) */}
                      <div className="space-y-2 pt-2">
                        <span className="text-[11px] font-semibold uppercase text-zinc-400 tracking-wider block">
                          Multi-Factor Verification Checks
                        </span>

                        <div className="overflow-x-auto rounded-xl border border-white/10">
                          <table className="w-full text-left text-xs text-zinc-300">
                            <thead className="bg-[#141414] text-zinc-500 uppercase text-[10px]">
                              <tr>
                                <th className="py-2 px-3">Check</th>
                                <th className="py-2 px-3">Target Condition</th>
                                <th className="py-2 px-3 text-right">Result</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 bg-[#101010]">
                              <tr>
                                <td className="py-2 px-3 font-medium">1. Screenshot Readable</td>
                                <td className="py-2 px-3 text-zinc-500">Clear receipt text</td>
                                <td className="py-2 px-3 text-right">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${checks.screenshotReadable === "PASS" ? "bg-emerald-500/10 text-emerald-400" : "bg-crimson/15 text-crimson"}`}>
                                    {checks.screenshotReadable}
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2 px-3 font-medium">2. Payment Status</td>
                                <td className="py-2 px-3 text-zinc-500">Paid / Successful</td>
                                <td className="py-2 px-3 text-right">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${checks.paymentStatus === "PASS" ? "bg-emerald-500/10 text-emerald-400" : "bg-crimson/15 text-crimson"}`}>
                                    {checks.paymentStatus}
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2 px-3 font-medium">3. Exact Amount</td>
                                <td className="py-2 px-3 text-zinc-500">₹450.00 exact</td>
                                <td className="py-2 px-3 text-right">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${checks.amount === "PASS" ? "bg-emerald-500/10 text-emerald-400" : "bg-crimson/15 text-crimson"}`}>
                                    {checks.amount}
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2 px-3 font-medium">4. UTR Format</td>
                                <td className="py-2 px-3 text-zinc-500">8–24 alphanumeric digits</td>
                                <td className="py-2 px-3 text-right">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${checks.utr === "PASS" ? "bg-emerald-500/10 text-emerald-400" : "bg-crimson/15 text-crimson"}`}>
                                    {checks.utr}
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2 px-3 font-medium">5. UTR Uniqueness</td>
                                <td className="py-2 px-3 text-zinc-500">Not consumed by other bill</td>
                                <td className="py-2 px-3 text-right">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${checks.duplicateUtr === "PASS" ? "bg-emerald-500/10 text-emerald-400" : "bg-crimson/15 text-crimson"}`}>
                                    {checks.duplicateUtr}
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2 px-3 font-medium">6. Duplicate Screenshot</td>
                                <td className="py-2 px-3 text-zinc-500">Unique SHA-256 / pHash</td>
                                <td className="py-2 px-3 text-right">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${checks.duplicateProof === "PASS" ? "bg-emerald-500/10 text-emerald-400" : "bg-crimson/15 text-crimson"}`}>
                                    {checks.duplicateProof}
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2 px-3 font-medium">7. Payee Receiver</td>
                                <td className="py-2 px-3 text-zinc-500">Matches CodeXa Official</td>
                                <td className="py-2 px-3 text-right">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${checks.receiver === "PASS" ? "bg-emerald-500/10 text-emerald-400" : "bg-crimson/15 text-crimson"}`}>
                                    {checks.receiver}
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2 px-3 font-medium">8. Payment Date</td>
                                <td className="py-2 px-3 text-zinc-500">Same calendar date</td>
                                <td className="py-2 px-3 text-right">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${checks.paymentDate === "PASS" ? "bg-emerald-500/10 text-emerald-400" : "bg-crimson/15 text-crimson"}`}>
                                    {checks.paymentDate}
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2 px-3 font-medium">9. 5-Minute Time Window</td>
                                <td className="py-2 px-3 text-zinc-500">Within window (±60s)</td>
                                <td className="py-2 px-3 text-right">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    checks.paymentTime === "PASS"
                                      ? "bg-emerald-500/10 text-emerald-400"
                                      : checks.paymentTime === "REVIEW"
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                      : "bg-crimson/15 text-crimson"
                                  }`}>
                                    {checks.paymentTime}
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2 px-3 font-medium">10. Settlement Feed Match</td>
                                <td className="py-2 px-3 text-zinc-500">Reconciled in bank feed</td>
                                <td className="py-2 px-3 text-right">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    checks.trustedTransaction === "PASS"
                                      ? "bg-emerald-500/10 text-emerald-400"
                                      : checks.trustedTransaction === "REVIEW"
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                      : "bg-crimson/15 text-crimson"
                                  }`}>
                                    {checks.trustedTransaction}
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── CASH PAYMENT AUDIT DETAILS (IF CASH USED) ─────────────────────── */}
      {payment.paymentMethod === "CASH" && (
        <div className="p-6 rounded-3xl bg-[#0f0f0f] border border-white/10 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Banknote className="w-5 h-5 text-amber-400" />
            <h3 className="font-orbitron font-bold text-white text-sm uppercase tracking-wider">
              Cash Payment Handover Record
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-[#141414] border border-white/5">
              <span className="text-[11px] text-zinc-500 block">Cash Status</span>
              <span className="font-bold text-white mt-1 block">{payment.cashStatus || "NONE"}</span>
            </div>

            <div className="p-3 rounded-2xl bg-[#141414] border border-white/5">
              <span className="text-[11px] text-zinc-500 block">Requested At</span>
              <span className="font-medium text-zinc-300 mt-1 block">
                {payment.cashRequestedAt ? new Date(payment.cashRequestedAt).toLocaleString() : "N/A"}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#141414] border border-white/5">
              <span className="text-[11px] text-zinc-500 block">Approved By</span>
              <span className="font-bold text-emerald-400 mt-1 block">
                {payment.cashApprovedByName || "Pending Founder/Co-Founder"}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#141414] border border-white/5">
              <span className="text-[11px] text-zinc-500 block">Confirmed At</span>
              <span className="font-medium text-zinc-300 mt-1 block">
                {payment.cashApprovedAt ? new Date(payment.cashApprovedAt).toLocaleString() : "Pending"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── PAYMENT TIMELINE & AUDIT TRAIL (SECTION 76) ────────────────────── */}
      <div className="p-6 sm:p-7 rounded-3xl bg-[#0f0f0f] border border-white/10 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-bright-red" />
            <h3 className="font-orbitron font-bold text-white text-xs tracking-wider uppercase">
              Full Payment Audit Timeline ({auditLogs.length} Events)
            </h3>
          </div>
          <span className="text-[11px] text-zinc-500">Immutable ledger</span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="text-zinc-500 text-xs py-2">No audit events recorded yet.</div>
        ) : (
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-2xl bg-[#141414] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white">{log.action}</span>
                    {log.actorName && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        by {log.actorName}
                      </span>
                    )}
                  </div>
                  {log.details && (
                    <div className="text-[11px] text-zinc-400 font-mono truncate max-w-xl">
                      {typeof log.details === "string" ? log.details : JSON.stringify(log.details)}
                    </div>
                  )}
                </div>

                <span className="text-[11px] text-zinc-500 font-mono shrink-0">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── MODAL: APPROVE PAYMENT EXCEPTION ──────────────────────────────── */}
      {showApproveModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowApproveModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="max-w-md w-full max-h-[90vh] flex flex-col bg-[#121212] border border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Sticky Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="font-orbitron font-bold text-white text-base">Approve Payment Exception</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                aria-label="Close dialog"
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <p className="text-xs text-zinc-300 leading-relaxed">
                Are you sure you want to approve this ₹450 payment exception for{" "}
                <strong className="text-white">{payment.userName}</strong> ({payment.referenceId})?
                This will atomically mark the payment as <strong>SUCCESS</strong>, clear intern access, and dispatch the confirmation email.
              </p>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Administrative Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Verified transaction timestamp manually; timing exception approved."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#181818] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="p-4 border-t border-white/10 bg-[#0d0d0d] flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveException}
                disabled={processingAction}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)] flex items-center gap-1.5 disabled:opacity-50"
              >
                {processingAction ? "Approving..." : "Confirm Approval"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: REJECT PAYMENT EXCEPTION ──────────────────────────────── */}
      {showRejectModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRejectModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="max-w-md w-full max-h-[90vh] flex flex-col bg-[#121212] border border-crimson/40 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Sticky Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5 text-crimson">
                <XCircle className="w-5 h-5" />
                <h3 className="font-orbitron font-bold text-white text-base">Reject Payment Proof</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                aria-label="Close dialog"
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <p className="text-xs text-zinc-300 leading-relaxed">
                Please provide a clear reason for rejecting this payment for{" "}
                <strong className="text-white">{payment.userName}</strong>. The intern will receive this feedback to retry.
              </p>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Rejection Reason *</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Screenshot unreadable / transaction amount could not be verified."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#181818] border border-white/10 text-xs text-white focus:outline-none focus:border-crimson"
                />
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="p-4 border-t border-white/10 bg-[#0d0d0d] flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectException}
                disabled={processingAction || !rejectionReason.trim()}
                className="px-5 py-2.5 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)] flex items-center gap-1.5 disabled:opacity-50"
              >
                {processingAction ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CONFIRM CASH RECEIVED ─────────────────────────────────── */}
      {showCashApproveModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCashApproveModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="max-w-md w-full max-h-[90vh] flex flex-col bg-[#121212] border border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Sticky Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <Banknote className="w-5 h-5" />
                <h3 className="font-orbitron font-bold text-white text-base">Confirm ₹450 Cash Received?</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCashApproveModal(false)}
                aria-label="Close dialog"
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <p className="text-xs text-zinc-300 leading-relaxed">
                Confirm that you have physically received exact ₹450 cash from{" "}
                <strong className="text-white">{payment.userName}</strong> ({payment.internId || payment.referenceId})?
              </p>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                This will immediately mark the payment as <strong>CASH_RECEIVED</strong>, activate the intern&apos;s workspace, and log this audit action.
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="p-4 border-t border-white/10 bg-[#0d0d0d] flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowCashApproveModal(false)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCash}
                disabled={processingAction}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)] disabled:opacity-50"
              >
                {processingAction ? "Confirming..." : "Confirm Cash Received"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: REJECT CASH REQUEST ──────────────────────────────────── */}
      {showCashRejectModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCashRejectModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="max-w-md w-full max-h-[90vh] flex flex-col bg-[#121212] border border-crimson/40 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Sticky Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5 text-crimson">
                <XCircle className="w-5 h-5" />
                <h3 className="font-orbitron font-bold text-white text-base">Reject Cash Request</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCashRejectModal(false)}
                aria-label="Close dialog"
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <p className="text-xs text-zinc-300 leading-relaxed">
                Please enter the reason for rejecting this cash payment request:
              </p>

              <div>
                <textarea
                  rows={3}
                  placeholder="e.g. Cash not received / Intern opted for UPI instead."
                  value={cashRejectReason}
                  onChange={(e) => setCashRejectReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#181818] border border-white/10 text-xs text-white focus:outline-none focus:border-crimson"
                />
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="p-4 border-t border-white/10 bg-[#0d0d0d] flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowCashRejectModal(false)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectCash}
                disabled={processingAction || !cashRejectReason.trim()}
                className="px-5 py-2.5 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)] disabled:opacity-50"
              >
                {processingAction ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ZOOMED SCREENSHOT LIGHTBOX ────────────────────────────── */}
      {zoomedImageUrl && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setZoomedImageUrl(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div className="relative max-w-4xl w-full max-h-[92vh] flex flex-col items-center justify-center">
            {/* Top Bar with Clear Close Controls */}
            <div className="w-full flex items-center justify-between pb-3 px-2 text-xs text-zinc-400">
              <span>Payment Proof Screenshot (ESC to close)</span>
              <div className="flex items-center gap-2">
                <a
                  href={zoomedImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Full
                </a>
                <button
                  type="button"
                  onClick={() => setZoomedImageUrl(null)}
                  aria-label="Close screenshot preview"
                  className="px-3.5 py-1.5 rounded-xl bg-bright-red hover:bg-bright-red/90 text-white font-bold flex items-center gap-1.5 shadow-lg transition-colors"
                >
                  <X className="w-4 h-4" /> Close
                </button>
              </div>
            </div>

            <div className="relative max-h-[82vh] overflow-hidden rounded-2xl border border-white/20 bg-[#080808] flex items-center justify-center p-2 shadow-2xl">
              <img
                src={zoomedImageUrl}
                alt="Zoomed Payment Proof"
                className="max-h-[80vh] w-auto max-w-full object-contain select-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
