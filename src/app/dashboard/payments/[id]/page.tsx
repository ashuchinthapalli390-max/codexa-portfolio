"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CreditCard,
  QrCode,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Upload,
  Copy,
  Check,
  ChevronLeft,
  Smartphone,
  ExternalLink,
  Shield,
  FileCheck,
  Calendar,
  Sparkles,
  Info,
  Bell,
  Send,
  Mail,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { hasPermission, Permission, getEffectiveRole } from "@/lib/permissions";

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
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderMessage, setReminderMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  // Proof Form State
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [paymentTime, setPaymentTime] = useState<string>(
    new Date().toTimeString().slice(0, 5)
  );
  const [utrNumber, setUtrNumber] = useState<string>("");
  const [upiApp, setUpiApp] = useState<string>("PhonePe");
  const [userNote, setUserNote] = useState<string>("");
  const [submittingProof, setSubmittingProof] = useState(false);
  const [proofError, setProofError] = useState("");
  const [isResubmitting, setIsResubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (data.reminderLogs) {
        setReminderLogs(data.reminderLogs);
      }
    } catch (err: any) {
      console.error("Error fetching payment:", err);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    if (status === "authenticated" && paymentId) {
      fetchPayment();
    }
  }, [status, paymentId]);

  const handleCopy = (text: string, type: "upi" | "ref") => {
    navigator.clipboard.writeText(text);
    if (type === "upi") {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    } else {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProofError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setProofError("Please select a JPG, PNG, or WebP screenshot.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setProofError("Screenshot size exceeds 10 MB limit.");
      return;
    }

    setScreenshotFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenshotFile) {
      setProofError("Payment screenshot is required.");
      return;
    }

    if (!paymentDate) {
      setProofError("Payment date is required.");
      return;
    }

    try {
      setSubmittingProof(true);
      setProofError("");

      const formData = new FormData();
      formData.append("screenshot", screenshotFile);
      formData.append("paymentDate", paymentDate);
      formData.append("paymentTime", paymentTime);
      formData.append("utrNumber", utrNumber);
      formData.append("upiApp", upiApp);
      formData.append("userNote", userNote);

      const res = await fetch(`/api/payments/${payment.id}/proof`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setProofError(data.error || "Failed to submit payment proof.");
        return;
      }

      setIsResubmitting(false);
      await fetchPayment();
    } catch (err: any) {
      setProofError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmittingProof(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-2 border-bright-red border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-orbitron tracking-widest text-zinc-500 uppercase">
          Loading Official CodeXa Bill...
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

  const upiId = payment.paymentAccount?.upiId || "shaikashu33@fam";
  const payeeName = payment.paymentAccount?.payeeName || "CodeXa Agency";
  const amountStr = payment.fixedAmount.toFixed(2);
  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${amountStr}&cu=INR&tn=${encodeURIComponent(payment.referenceId)}`;

  // Default Line Items if not provided
  const lineItems: LineItem[] = payment.lineItems || [
    { item: "Mandatory ID Card", amount: 150 },
    {
      item: "AI Dev Tools Pack (Shared)",
      amount: 300,
      details: [
        "Nexa AI Access (Included)",
        "ChatGPT Astra (Included)",
        "Anthropic Fabel (Included)",
        "Gemini Pro (Included)",
        "More AI Models (Included)",
      ],
    },
  ];

  const isPendingPayment = payment.paymentStatus === "PENDING_PAYMENT";
  const isPendingVerification = payment.paymentStatus === "PENDING_VERIFICATION";
  const isApproved = payment.paymentStatus === "APPROVED";
  const isRejected = payment.paymentStatus === "REJECTED";
  const role = user ? getEffectiveRole(user) : "";
  const isPrivileged = ["FOUNDER", "CO_FOUNDER", "HR", "CEO", "CTO", "COO", "ADMIN"].includes(role);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* ─── TOP BACK LINK ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/payments"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Payments
        </Link>

        <span className="text-[11px] font-mono text-zinc-500">
          Created: {new Date(payment.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* ─── STATUS BANNER ─────────────────────────────────────────────────── */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
          isApproved
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            : isPendingVerification
            ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
            : isRejected
            ? "bg-crimson/15 border-crimson/30 text-crimson"
            : "bg-amber-500/10 border-amber-500/30 text-amber-300"
        }`}
      >
        <div className="flex items-center gap-3">
          {isApproved ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          ) : isPendingVerification ? (
            <Clock className="w-6 h-6 text-blue-400 shrink-0 animate-pulse" />
          ) : isRejected ? (
            <XCircle className="w-6 h-6 text-crimson shrink-0" />
          ) : (
            <CreditCard className="w-6 h-6 text-amber-400 shrink-0" />
          )}

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider">
              {isApproved
                ? "Payment Verified & Approved"
                : isPendingVerification
                ? "Payment Proof Submitted — Pending Manual Verification"
                : isRejected
                ? "Payment Proof Rejected"
                : "Payment Due — Action Required"}
            </div>
            <p className="text-xs opacity-90 mt-0.5">
              {isApproved
                ? `Verified by CodeXa administration on ${new Date(payment.verifiedAt).toLocaleString()}`
                : isPendingVerification
                ? "Our accounts team is manually verifying your payment against bank records."
                : isRejected
                ? `Reason: ${payment.rejectionReason || "Proof unverified. Please check details and resubmit."}`
                : "Please pay via UPI using the QR code or intent buttons, then upload your transaction screenshot."}
            </p>
          </div>
        </div>

        {isRejected && !isResubmitting && (
          <button
            onClick={() => setIsResubmitting(true)}
            className="px-4 py-2 rounded-xl bg-bright-red hover:bg-bright-red/90 text-white text-xs font-bold shrink-0 shadow-lg"
          >
            Resubmit Proof
          </button>
        )}
      </div>

      {/* ─── MANDATORY PAYMENT REMINDER AUDIT & CONTROLS (ADMIN) ───────────── */}
      {isPrivileged && (
        <div className="p-5 sm:p-6 rounded-3xl bg-[#0f0f0f] border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-bright-red/10 border border-bright-red/30 text-bright-red">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-orbitron font-bold text-white text-sm flex items-center gap-2">
                  Mandatory Service Payment Reminder Automation
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/50 text-zinc-400 border border-white/10">
                    ₹450 Bill
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Daily 9:00 AM IST automation via Resend transactional email &amp; Web Push. Stops automatically once verified.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {!isApproved && (
                <button
                  onClick={handleSendReminder}
                  disabled={sendingReminder}
                  className="px-4 py-2 rounded-xl bg-bright-red hover:bg-bright-red/90 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(239,35,60,0.3)] disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sendingReminder ? "Dispatching..." : "Send Reminder Now"}
                </button>
              )}
            </div>
          </div>

          {/* Reminder Feedback Message */}
          {reminderMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                reminderMessage.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                  : "bg-crimson/15 border border-crimson/30 text-crimson"
              }`}
            >
              {reminderMessage.type === "success" ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{reminderMessage.text}</span>
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-[#141414] border border-white/5">
              <div className="text-[11px] text-zinc-500">Service Fee Status</div>
              <div className="font-bold text-white mt-1">
                {isApproved ? (
                  <span className="text-emerald-400">PAID &bull; CLEARED</span>
                ) : (
                  <span className="text-amber-400">PENDING (₹450)</span>
                )}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#141414] border border-white/5">
              <div className="text-[11px] text-zinc-500">Last Reminder Sent</div>
              <div className="font-medium text-zinc-200 mt-1">
                {payment.lastReminderAt
                  ? new Date(payment.lastReminderAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
                  : "No reminder yet"}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#141414] border border-white/5">
              <div className="text-[11px] text-zinc-500">Total Reminder Count</div>
              <div className="font-bold text-white mt-1">
                {payment.reminderCount || reminderLogs.length || 0} Sent
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#141414] border border-white/5">
              <div className="text-[11px] text-zinc-500">Delivery Channels</div>
              <div className="font-medium text-zinc-300 mt-1 flex items-center gap-2">
                <span>Resend Email</span> &bull; <span>Web Push</span>
              </div>
            </div>
          </div>

          {/* Audit History Logs */}
          {reminderLogs && reminderLogs.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Recent Dispatch Logs
              </div>
              <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full text-left text-[11px] text-zinc-300">
                  <thead className="bg-[#141414] text-zinc-500 uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Date (IST)</th>
                      <th className="py-2 px-3">Source</th>
                      <th className="py-2 px-3">Email Status</th>
                      <th className="py-2 px-3">Web Push</th>
                      <th className="py-2 px-3">Provider ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-[#101010]">
                    {reminderLogs.map((log: any) => (
                      <tr key={log.id}>
                        <td className="py-2 px-3 font-mono text-zinc-400">{log.reminderDate}</td>
                        <td className="py-2 px-3 font-medium text-white">{log.source}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              log.emailStatus === "SENT"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : log.emailStatus === "SKIPPED"
                                ? "bg-zinc-500/10 text-zinc-400"
                                : "bg-crimson/15 text-crimson"
                            }`}
                          >
                            {log.emailStatus}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              log.pushStatus === "SENT"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : log.pushStatus === "UNAVAILABLE"
                                ? "bg-zinc-500/10 text-zinc-400"
                                : "bg-crimson/15 text-crimson"
                            }`}
                          >
                            {log.pushStatus}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[10px] text-zinc-500 truncate max-w-[150px]">
                          {log.emailProviderId || "-"}
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

      {/* ─── OFFICIAL CODEXA SERVICE BILL INVOICE CARD ─────────────────────── */}
      <div className="rounded-3xl bg-[#0d0d0d] border border-crimson/30 shadow-2xl overflow-hidden relative">
        {/* Top Crimson Glow Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-crimson via-bright-red to-deep-red" />

        <div className="p-6 sm:p-8 space-y-6">
          {/* Bill Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-orbitron font-extrabold text-lg text-white tracking-wider">
                  CODEXA AGENCY
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-crimson/20 text-bright-red border border-crimson/30 uppercase">
                  Official Bill
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-orbitron font-bold text-white mt-1">
                {payment.title || "INTERNSHIP SERVICE BILL"}
              </h1>
              <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                <span>Domain:</span>
                <span className="text-white font-semibold">{payment.domain || "Development"}</span>
                <span>&bull;</span>
                <span>Role:</span>
                <span className="text-white">{payment.userRole || "INTERN"}</span>
              </div>
            </div>

            <div className="sm:text-right">
              <span className="text-[11px] text-zinc-500 uppercase tracking-widest block font-medium">
                Payment Reference ID
              </span>
              <button
                onClick={() => handleCopy(payment.referenceId, "ref")}
                className="mt-1 inline-flex items-center gap-1.5 font-mono text-base font-bold text-bright-red hover:underline group"
                title="Click to copy reference"
              >
                <span>{payment.referenceId}</span>
                {copiedRef ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                )}
              </button>
              {payment.dueDate && (
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  Due by: {new Date(payment.dueDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          {/* User Details Snapshot */}
          <div className="p-4 rounded-2xl bg-[#141414] border border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-zinc-500 block text-[11px]">Billed To</span>
              <span className="font-semibold text-white">{payment.userName}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[11px]">Email</span>
              <span className="text-zinc-300 truncate block">{payment.userEmail}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[11px]">CodeXa ID</span>
              <span className="font-mono text-zinc-300">
                {payment.internId || payment.employeeId || "Pending"}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[11px]">Payment Mode</span>
              <span className="text-emerald-400 font-semibold">Manual UPI</span>
            </div>
          </div>

          {/* Itemized Bill Table */}
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#161616] text-zinc-400 uppercase text-[11px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4 font-semibold">Item / Description</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-200">
                {lineItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.01]">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white">{item.item}</div>
                      {(item.details || item.subItems) && (
                        <ul className="mt-1.5 space-y-1 text-[11px] text-zinc-400 pl-2">
                          {(item.details || item.subItems)!.map((sub, sIdx) => (
                            <li key={sIdx} className="flex items-center gap-1.5">
                              <span className="text-bright-red">&bull;</span>
                              <span>{sub}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-white">
                      ₹{item.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#141414] border-t-2 border-crimson/40">
                <tr>
                  <td className="py-4 px-4 font-orbitron font-bold text-sm text-white">
                    TOTAL PAYABLE:
                  </td>
                  <td className="py-4 px-4 text-right font-orbitron font-extrabold text-lg text-bright-red">
                    ₹{payment.fixedAmount.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="p-3.5 rounded-xl bg-[#141414] border border-white/5 text-zinc-400 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-bright-red shrink-0 mt-0.5" />
            <p>
              <strong>Verification Requirement:</strong> Payment screenshot must be uploaded below after completing the transaction. Status will update to <span className="text-emerald-400 font-semibold">Approved</span> only after manual administrator confirmation.
            </p>
          </div>
        </div>
      </div>

      {/* ─── PAY VIA UPI SECTION (Visible if Pending Payment or Resubmitting) ─── */}
      {(isPendingPayment || isResubmitting) && (
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0d0d0d] border border-white/10 space-y-6 shadow-xl">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-lg font-orbitron font-bold text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-bright-red" />
              Pay via UPI
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Scan the official CodeXa QR code with any UPI app or tap a payment button on mobile.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left: Dynamic QR Code */}
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[#141414] border border-white/5 space-y-3">
              <div className="p-3 bg-white rounded-2xl shadow-xl">
                <img
                  src={`/api/payments/qr?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
                    payeeName
                  )}&am=${amountStr}&tn=${encodeURIComponent(payment.referenceId)}`}
                  alt="CodeXa UPI QR Code"
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                />
              </div>

              <div className="text-center">
                <span className="text-[11px] font-semibold uppercase text-zinc-400 tracking-wider">
                  Scan using Any UPI App
                </span>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  PhonePe, Google Pay, Paytm, BHIM, CRED
                </p>
              </div>
            </div>

            {/* Right: UPI Details & Intent Buttons */}
            <div className="space-y-5">
              {/* Official UPI ID Box */}
              <div className="p-4 rounded-2xl bg-[#161616] border border-white/10 space-y-2">
                <span className="text-zinc-500 text-[11px] uppercase tracking-wider font-semibold block">
                  Official CodeXa UPI ID
                </span>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-base font-bold text-white tracking-wide">
                    {upiId}
                  </span>
                  <button
                    onClick={() => handleCopy(upiId, "upi")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222] hover:bg-[#2c2c2c] text-xs font-semibold text-white transition-colors border border-white/10"
                  >
                    {copiedUpi ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Copy UPI ID</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="text-[11px] text-zinc-400">Payee Name: {payeeName}</div>
              </div>

              {/* Mobile Deep Link Buttons */}
              <div className="space-y-2">
                <span className="text-zinc-400 text-xs font-medium block">
                  Or pay directly on mobile:
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href={`phonepe://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amountStr}&cu=INR&tn=${encodeURIComponent(payment.referenceId)}`}
                    className="p-3 rounded-xl bg-[#181818] hover:bg-[#202020] border border-white/10 text-xs font-semibold text-white text-center transition-colors flex items-center justify-center gap-2"
                  >
                    <Smartphone className="w-4 h-4 text-purple-400" />
                    PhonePe
                  </a>
                  <a
                    href={`gpay://upi/pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amountStr}&cu=INR&tn=${encodeURIComponent(payment.referenceId)}`}
                    className="p-3 rounded-xl bg-[#181818] hover:bg-[#202020] border border-white/10 text-xs font-semibold text-white text-center transition-colors flex items-center justify-center gap-2"
                  >
                    <Smartphone className="w-4 h-4 text-blue-400" />
                    Google Pay
                  </a>
                  <a
                    href={`paytmmp://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amountStr}&cu=INR&tn=${encodeURIComponent(payment.referenceId)}`}
                    className="p-3 rounded-xl bg-[#181818] hover:bg-[#202020] border border-white/10 text-xs font-semibold text-white text-center transition-colors flex items-center justify-center gap-2"
                  >
                    <Smartphone className="w-4 h-4 text-cyan-400" />
                    Paytm
                  </a>
                  <a
                    href={upiDeepLink}
                    className="p-3 rounded-xl bg-[#181818] hover:bg-[#202020] border border-white/10 text-xs font-semibold text-white text-center transition-colors flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4 text-bright-red" />
                    Any UPI App
                  </a>
                </div>
              </div>

              <div className="text-[11px] text-zinc-500 italic">
                * Note: Launching a UPI app will NOT automatically mark this payment as completed. You must submit your payment screenshot below.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PAYMENT PROOF SUBMISSION FORM ─────────────────────────────────── */}
      {(isPendingPayment || isResubmitting) && (
        <form
          onSubmit={handleSubmitProof}
          className="p-6 sm:p-8 rounded-3xl bg-[#0d0d0d] border border-white/10 space-y-6 shadow-xl"
        >
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-lg font-orbitron font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-400" />
              Submit Payment Proof
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Upload the screenshot of your successful UPI transfer. Ensure the transaction amount, date, and UTR are visible.
            </p>
          </div>

          {proofError && (
            <div className="p-3.5 rounded-xl bg-crimson/15 border border-crimson/30 text-crimson text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{proofError}</span>
            </div>
          )}

          <div className="space-y-4 text-xs">
            {/* Screenshot Upload Dropzone */}
            <div>
              <label className="block font-medium text-zinc-300 mb-2">
                Payment Screenshot * <span className="text-zinc-500 font-normal">(Max 10 MB, JPG / PNG / WebP)</span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {!previewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 border-2 border-dashed border-white/15 hover:border-bright-red/50 rounded-2xl bg-[#141414] text-center cursor-pointer transition-all hover:bg-[#181818] flex flex-col items-center justify-center space-y-2"
                >
                  <div className="p-3 rounded-full bg-crimson/10 border border-crimson/20 text-bright-red">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="font-semibold text-white">Click or drag screenshot here</span>
                  <span className="text-[11px] text-zinc-500">Supports Camera capture or photo gallery</span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#141414] border border-white/10 flex flex-col sm:flex-row items-center gap-4">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-xl border border-white/10"
                  />
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <div className="font-semibold text-white truncate max-w-xs">
                      {screenshotFile?.name}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {((screenshotFile?.size || 0) / 1024 / 1024).toFixed(2)} MB &bull; {screenshotFile?.type}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshotFile(null);
                        setPreviewUrl(null);
                      }}
                      className="text-xs text-crimson hover:underline"
                    >
                      Remove & Choose Another
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Inputs: UTR, Date, UPI App */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-zinc-300 mb-1.5">
                  Transaction / UTR ID <span className="text-zinc-500">(12-digit UPI Reference)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 428192847291"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  className="w-full p-2.5 bg-[#161616] border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-bright-red/50"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-300 mb-1.5">UPI App Used *</label>
                <select
                  value={upiApp}
                  onChange={(e) => setUpiApp(e.target.value)}
                  className="w-full p-2.5 bg-[#161616] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-bright-red/50"
                >
                  <option value="PhonePe">PhonePe</option>
                  <option value="Google Pay">Google Pay (GPay)</option>
                  <option value="Paytm">Paytm</option>
                  <option value="BHIM UPI">BHIM UPI</option>
                  <option value="CRED">CRED</option>
                  <option value="Amazon Pay">Amazon Pay</option>
                  <option value="Bank NetBanking">Bank IMPS / NetBanking</option>
                  <option value="Other">Other UPI App</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-zinc-300 mb-1.5">Payment Date *</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full p-2.5 bg-[#161616] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-300 mb-1.5">Payment Time (Optional)</label>
                <input
                  type="time"
                  value={paymentTime}
                  onChange={(e) => setPaymentTime(e.target.value)}
                  className="w-full p-2.5 bg-[#161616] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-zinc-300 mb-1.5">Optional Remarks / Note</label>
              <input
                type="text"
                placeholder="Any special transaction note..."
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                className="w-full p-2.5 bg-[#161616] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">
              By submitting, you certify that this screenshot represents a genuine transaction.
            </span>

            <button
              type="submit"
              disabled={submittingProof}
              className="px-6 py-2.5 rounded-xl bg-bright-red hover:bg-bright-red/90 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(239,35,60,0.3)] disabled:opacity-50"
            >
              {submittingProof ? "Submitting..." : "Submit for Verification"}
            </button>
          </div>
        </form>
      )}

      {/* ─── PENDING VERIFICATION REVIEW CARD ──────────────────────────────── */}
      {isPendingVerification && (
        <div className="p-6 rounded-3xl bg-[#0f0f0f] border border-blue-500/30 space-y-4">
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
            <Clock className="w-5 h-5 animate-pulse" />
            Submitted Payment Proof Under Review
          </div>
          <p className="text-xs text-zinc-400">
            Your payment proof was received on{" "}
            <strong>{new Date(payment.submittedAt).toLocaleString()}</strong>.
            CodeXa administrators manually verify all bank credits. You will receive an email once verified.
          </p>

          <div className="p-4 rounded-2xl bg-[#141414] border border-white/5 flex flex-col sm:flex-row items-center gap-4 text-xs">
            {payment.proofImageUrl && (
              <img
                src={`/api/payments/${payment.id}/proof-image`}
                alt="Submitted Proof"
                className="w-24 h-24 object-cover rounded-xl border border-white/10"
              />
            )}
            <div className="space-y-1">
              <div>Reference: <span className="font-mono text-white font-bold">{payment.referenceId}</span></div>
              {payment.utrNumber && <div>UTR: <span className="font-mono text-zinc-300">{payment.utrNumber}</span></div>}
              <div>App: <span className="text-zinc-300">{payment.upiApp || "UPI"}</span></div>
              <div>Status: <span className="text-blue-400 font-semibold">Pending Verification</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ─── APPROVED SEAL CARD ────────────────────────────────────────────── */}
      {isApproved && (
        <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 space-y-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-orbitron font-bold text-white text-base">
                  Official Payment Confirmation
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Verified by {payment.verifiedByName || "Administrator"} on{" "}
                  {new Date(payment.verifiedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              ✓ Verified & Cleared
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
