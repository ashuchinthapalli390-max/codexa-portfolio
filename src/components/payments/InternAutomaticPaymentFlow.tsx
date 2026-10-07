"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Smartphone,
  QrCode,
  Clock,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  Upload,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
  Sparkles,
  Award,
  Cpu,
  CreditCard,
  Lock,
  Eye,
  FileSearch,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PushNotificationBanner } from "@/components/notifications/PushNotificationBanner";

interface PaymentAttempt {
  id: string;
  status: string;
  selectedMethod: string;
  amountSnapshot: number;
  upiIdSnapshot: string;
  receiverSnapshot: string;
  startedAt: string;
  expiresAt: string;
  remainingSeconds: number;
  utrNumber?: string | null;
  detectedUtr?: string | null;
  detectedApp?: string | null;
  detectedDate?: string | null;
  detectedTime?: string | null;
  verificationReason?: string | null;
  verifiedAt?: string | null;
}

interface PaymentData {
  id: string;
  referenceId: string;
  paymentStatus: string;
  fixedAmount: number;
  currency: string;
  title: string;
  description: string;
  domain: string;
  userRole: string;
  userName: string;
  userEmail: string;
  internId: string | null;
  employeeId: string | null;
  lineItems: Array<{ item: string; amount: number; includes?: string[] }>;
  paymentMethod?: string | null;
  cashStatus?: string | null;
  cashRequestedAt?: string | null;
  cashApprovedAt?: string | null;
  cashApprovedByName?: string | null;
  cashRejectionReason?: string | null;
  cashNotes?: string | null;
  paidAt?: string | null;
  verificationSource?: string | null;
}

interface SettingsData {
  receiverName: string;
  upiId: string;
  qrCodeUrl: string | null;
  fixedInternshipAmount: number;
  phonePeEnabled: boolean;
  googlePayEnabled: boolean;
  paytmEnabled: boolean;
  otherUpiEnabled: boolean;
  cashEnabled?: boolean;
  coFounderWhatsApp?: string;
  cashInstructions?: string;
  proofWindowMinutes: number;
  clockToleranceSeconds: number;
  paymentInstructions: string;
}

export function InternAutomaticPaymentFlow({
  onStatusChange,
}: {
  onStatusChange?: (status: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<PaymentAttempt | null>(null);
  const [internPaid, setInternPaid] = useState(false);

  // Flow State
  const [selectedMethod, setSelectedMethod] = useState<
    "PHONEPE" | "GPAY" | "PAYTM" | "FAM" | "AMAZON_PAY" | "BHIM" | "CRED" | "OTHER_UPI" | "CASH"
  >("PHONEPE");
  const [startingPayment, setStartingPayment] = useState(false);
  const [requestingCash, setRequestingCash] = useState(false);
  const [cancellingCash, setCancellingCash] = useState(false);
  const [sharingCard, setSharingCard] = useState(false);
  const [intentData, setIntentData] = useState<{
    universalUri: string;
    appSpecificUri: string;
    qrPayload: string;
  } | null>(null);

  // 5-Minute Timer State
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [timerExpired, setTimerExpired] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Screenshot Upload State (STRICTLY NO MANUAL UTR, DATE, TIME FIELDS)
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [analyzingStep, setAnalyzingStep] = useState<
    "IDLE" | "UPLOADING" | "OCR_ANALYSIS" | "SETTLEMENT_RECONCILING"
  >("IDLE");
  const [proofError, setProofError] = useState<string | null>(null);

  // Verification & Status Outcome
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  // Load intern's payment session
  const loadPaymentData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/payments/me", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load intern payment details");
      }
      const data = await res.json();
      setPayment(data.payment);
      setSettings(data.settings);
      setInternPaid(Boolean(data.internServicePaymentPaid));

      if (data.activeAttempt) {
        setActiveAttempt(data.activeAttempt);
        if (
          ["PHONEPE", "GPAY", "PAYTM", "OTHER_UPI"].includes(
            data.activeAttempt.selectedMethod
          )
        ) {
          setSelectedMethod(data.activeAttempt.selectedMethod);
        }
        setupTimer(data.activeAttempt.expiresAt);

        if (
          ["VERIFYING", "ANALYZING_PROOF"].includes(data.activeAttempt.status)
        ) {
          setVerifying(true);
        } else if (data.activeAttempt.status === "SUCCESS") {
          setVerificationResult({
            status: "SUCCESS",
            verifiedAt: data.activeAttempt.verifiedAt,
            utrNumber: data.activeAttempt.utrNumber,
            paymentApp: data.activeAttempt.detectedApp || data.activeAttempt.selectedMethod,
            amount: 450,
          });
        } else if (data.activeAttempt.status === "FAILED") {
          setVerificationResult({
            status: "FAILED",
            reason: data.activeAttempt.verificationReason,
          });
        }
      }

      if (data.payment?.cashStatus === "PENDING_CASH_APPROVAL") {
        setSelectedMethod("CASH");
      }

      if (onStatusChange) {
        onStatusChange(data.payment?.paymentStatus || "PENDING_PAYMENT");
      }
    } catch (err: any) {
      console.error("Load payment error:", err);
      setError(err.message || "Failed to load payment details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentData();
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Setup client-side countdown synced with authoritative server expiresAt
  const setupTimer = (expiresAtStr: string) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    const updateRemaining = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAtStr).getTime();
      const diffSec = Math.max(0, Math.floor((expiry - now) / 1000));
      setSecondsLeft(diffSec);

      if (diffSec <= 0) {
        setTimerExpired(true);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      } else {
        setTimerExpired(false);
      }
    };

    updateRemaining();
    timerIntervalRef.current = setInterval(updateRemaining, 1000);
  };

  // Start Payment Session (creates PaymentAttempt on server BEFORE opening app)
  const handleStartPayment = async (
    methodOverride?: "PHONEPE" | "GPAY" | "PAYTM" | "FAM" | "AMAZON_PAY" | "BHIM" | "CRED" | "OTHER_UPI"
  ) => {
    if (!payment) return;
    const methodToUse = methodOverride || selectedMethod;
    setSelectedMethod(methodToUse);

    try {
      setStartingPayment(true);
      setProofError(null);
      const res = await fetch(`/api/payments/${payment.id}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedMethod: methodToUse }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate payment session");
      }

      setActiveAttempt(data.attempt);
      setIntentData({
        universalUri: data.universalUri,
        appSpecificUri: data.appSpecificUri,
        qrPayload: data.qrPayload,
      });

      setupTimer(data.expiresAt);

      // On mobile devices, automatically launch the UPI deep link
      if (typeof window !== "undefined" && window.innerWidth <= 768) {
        const link = data.appSpecificUri || data.universalUri;
        window.location.href = link;
      }
    } catch (err: any) {
      console.error("Start payment error:", err);
      setProofError(err.message || "Failed to start payment session");
    } finally {
      setStartingPayment(false);
    }
  };

  // Request Cash Payment (Fixed ₹450, no manual input)
  const handleRequestCashPayment = async () => {
    if (!payment) return;
    try {
      setRequestingCash(true);
      setError(null);
      const res = await fetch(`/api/payments/${payment.id}/cash/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create cash payment request");
      }
      await loadPaymentData();
    } catch (err: any) {
      setError(err.message || "Failed to request cash payment");
    } finally {
      setRequestingCash(false);
    }
  };

  // Cancel Pending Cash Payment Request
  const handleCancelCashRequest = async () => {
    if (!payment) return;
    if (!window.confirm("Are you sure you want to cancel your pending cash payment request?")) return;
    try {
      setCancellingCash(true);
      setError(null);
      const res = await fetch(`/api/payments/${payment.id}/cash/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel cash payment request");
      }
      await loadPaymentData();
    } catch (err: any) {
      setError(err.message || "Failed to cancel cash payment request");
    } finally {
      setCancellingCash(false);
    }
  };

  // Share Cash Request Card via Web Share API or WhatsApp
  const handleShareCashCard = async () => {
    if (!payment) return;
    const cardUrl = `/api/payments/${payment.id}/cash/card`;
    const coFounderPhone = settings?.coFounderWhatsApp || "7075920852";
    const cleanPhone = coFounderPhone.replace(/\D/g, "");
    const intlPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;

    const internName = payment.userName || "Intern";
    const internId = payment.internId || "CXA-INT-2026";
    const domain = payment.domain || "Development";

    const prefilledMessage = [
      "Hello B. Sanjay,",
      "",
      "I have selected Cash Payment for my CodeXa Internship Service Bill.",
      "",
      `Intern Name: ${internName}`,
      `Intern ID: ${internId}`,
      `Email: ${payment.userEmail || ""}`,
      `Domain: ${domain}`,
      "",
      "Payment Amount: ₹450",
      "Payment Method: Cash",
      `Payment Reference: ${payment.referenceId}`,
      "",
      "Status: Pending Cash Approval",
      "",
      "I will hand over the ₹450 cash payment for verification.",
      "",
      "Please confirm the payment in the CodeXa Payment Control Center after receiving the cash.",
      "",
      "— CodeXa Agency Payment System",
    ].join("\n");

    const waUrl = `https://wa.me/${intlPhone}?text=${encodeURIComponent(prefilledMessage)}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        setSharingCard(true);
        const res = await fetch(cardUrl);
        const blob = await res.blob();
        const file = new File([blob], `CodeXa_Cash_Request_${payment.referenceId}.svg`, {
          type: "image/svg+xml",
        });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "CodeXa Cash Payment Request",
            text: prefilledMessage,
            files: [file],
          });
          return;
        }
      } catch (err) {
        console.log("Web Share fallback to direct WhatsApp URL:", err);
      } finally {
        setSharingCard(false);
      }
    }

    // Direct WhatsApp fallback
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  // 100% AUTOMATIC SCREENSHOT SUBMISSION (ZERO MANUAL ENTRY)
  const handleSubmitProof = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!payment) return;

    if (!screenshotFile) {
      setProofError("Please select and upload your transaction receipt screenshot.");
      return;
    }

    try {
      setSubmittingProof(true);
      setProofError(null);
      setAnalyzingStep("UPLOADING");

      const formData = new FormData();
      formData.append("screenshot", screenshotFile);
      if (activeAttempt?.id) {
        formData.append("attemptId", activeAttempt.id);
      }

      // Step progress animation
      const stepTimer1 = setTimeout(() => {
        setAnalyzingStep("OCR_ANALYSIS");
      }, 700);

      const stepTimer2 = setTimeout(() => {
        setAnalyzingStep("SETTLEMENT_RECONCILING");
      }, 2400);

      const res = await fetch(`/api/payments/${payment.id}/proof`, {
        method: "POST",
        body: formData,
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const data = await res.json();

      if (!res.ok) {
        if (data.status === "EXPIRED" || data.reason === "UPLOAD_EXPIRED") {
          setTimerExpired(true);
          setProofError(
            "Payment verification window expired. Please start a new 5-minute session below."
          );
        } else {
          setProofError(data.error || "Automatic payment verification failed.");
        }
        setVerificationResult({
          status: "FAILED",
          reason: data.reason || "PROOF_UNREADABLE",
          error: data.userMessage || data.error,
        });
        return;
      }

      if (data.status === "SUCCESS") {
        setVerificationResult({
          status: "SUCCESS",
          verifiedAt: data.verifiedAt || new Date().toISOString(),
          utrNumber: data.utrNumber,
          amount: data.amount || 450,
          paymentApp: data.paymentApp || selectedMethod,
        });
        setInternPaid(true);
        if (onStatusChange) onStatusChange("APPROVED");
      } else if (data.status === "FAILED") {
        setVerificationResult({
          status: "FAILED",
          reason: data.reason,
          error: data.userMessage || data.error,
        });
      }
    } catch (err: any) {
      console.error("Proof submission error:", err);
      setProofError(
        err.message || "An unexpected error occurred during automatic verification."
      );
    } finally {
      setSubmittingProof(false);
      setAnalyzingStep("IDLE");
    }
  };

  // Reset / Retry session (Creates new attempt, preserves full history)
  const handleRetry = async () => {
    if (!payment) return;
    try {
      setLoading(true);
      setVerificationResult(null);
      setProofError(null);
      setScreenshotFile(null);
      setPreviewUrl(null);
      setTimerExpired(false);
      setAnalyzingStep("IDLE");

      const res = await fetch(`/api/payments/${payment.id}/retry`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to reset session");
      }
      await loadPaymentData();
    } catch (err: any) {
      setProofError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setProofError("Please select a JPEG, PNG, or WEBP image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setProofError("Screenshot file must be under 10 MB.");
      return;
    }

    setScreenshotFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setProofError(null);
  };

  // Format seconds mm:ss
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="p-12 text-center rounded-3xl bg-[#0d0d0d] border border-white/5 space-y-4">
        <div className="w-10 h-10 border-2 border-crimson border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="font-mono text-xs text-zinc-400">
          Loading secure intern payment gateway...
        </p>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="p-8 rounded-3xl bg-crimson/10 border border-crimson/20 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-bright-red mx-auto" />
        <h3 className="font-orbitron font-bold text-white text-base">
          Payment Initialization Error
        </h3>
        <p className="text-xs text-zinc-400">
          {error || "Could not retrieve intern billing data"}
        </p>
        <button
          onClick={loadPaymentData}
          className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  const isCompleted =
    internPaid ||
    payment.paymentStatus === "APPROVED" ||
    payment.paymentStatus === "SUCCESS" ||
    verificationResult?.status === "SUCCESS";

  const upiId = activeAttempt?.upiIdSnapshot || settings?.upiId || "shaikashu33@fam";
  const receiverName =
    activeAttempt?.receiverSnapshot || settings?.receiverName || "CodeXa Agency";
  const amountStr = "450.00";

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* ─── PUSH NOTIFICATION BANNER ────────────────────────────────────────── */}
      <PushNotificationBanner />

      {/* ─── 1. HEADER & OFFICIAL BILL CARD ──────────────────────────────────── */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-[#0c0c0c] border border-white/10 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-crimson/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-orbitron font-extrabold text-lg text-white tracking-wider">
                CODEXA AGENCY
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-crimson/20 text-bright-red border border-crimson/30 uppercase">
                Internship Billing
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-orbitron font-bold text-white mt-1">
              INTERNSHIP SERVICE BILL
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-zinc-400">
              <span>Domain:</span>
              <span className="text-white font-semibold">
                {payment.domain || "Development"}
              </span>
              <span>&bull;</span>
              <span>Role:</span>
              <span className="text-white font-semibold">INTERN</span>
              <span>&bull;</span>
              <span>Intern ID:</span>
              <span className="font-mono text-zinc-300">
                {payment.internId || "CXA-INT-DEV"}
              </span>
            </div>
          </div>

          <div className="sm:text-right">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block">
              Payment Reference
            </span>
            <button
              onClick={() => handleCopy(payment.referenceId, "ref")}
              className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-base font-bold text-bright-red hover:underline group"
              title="Click to copy reference"
            >
              <span>{payment.referenceId}</span>
              {copiedRef ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
              )}
            </button>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              Fixed & Server-Controlled Bill
            </div>
          </div>
        </div>

        {/* Intern Details Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 my-6 rounded-2xl bg-[#141414] border border-white/5 text-xs">
          <div>
            <span className="text-zinc-500 text-[11px] block">Intern Name</span>
            <span className="font-semibold text-white truncate block">
              {payment.userName}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 text-[11px] block">Email</span>
            <span className="text-zinc-300 truncate block">{payment.userEmail}</span>
          </div>
          <div>
            <span className="text-zinc-500 text-[11px] block">Payment Type</span>
            <span className="text-white font-semibold">Mandatory UPI Transfer</span>
          </div>
          <div>
            <span className="text-zinc-500 text-[11px] block">Payment Status</span>
            <span
              className={`font-mono font-bold uppercase ${
                isCompleted
                  ? "text-emerald-400"
                  : verifying
                  ? "text-amber-400"
                  : timerExpired
                  ? "text-rose-400"
                  : "text-bright-red"
              }`}
            >
              {isCompleted
                ? "Payment Successful"
                : verifying
                ? "Verifying Payment"
                : timerExpired
                ? "Session Expired"
                : activeAttempt
                ? "Payment in Progress"
                : "Pending Payment"}
            </span>
          </div>
        </div>

        {/* ─── MANDATORY SERVICE BILL BREAKDOWN (SECTION 1 & 2) ────────────────── */}
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#111]">
          <div className="p-3.5 bg-[#161616] border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-orbitron font-bold uppercase tracking-wider text-zinc-300">
              Itemized Service Breakdown
            </span>
            <span className="text-[11px] font-mono text-zinc-400">Strictly Non-Editable</span>
          </div>

          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-white/5 text-zinc-200">
              <tr className="hover:bg-white/[0.01]">
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-white">1. Mandatory ID Card</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Official CodeXa credential ID & verification issuance
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-white text-sm">
                  ₹150
                </td>
              </tr>

              <tr className="hover:bg-white/[0.01]">
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-white">2. AI Dev Tools Pack (Shared)</div>
                  <div className="text-[11px] text-zinc-400 mt-1 space-y-0.5">
                    <p className="text-zinc-300">Enterprise AI tools suite:</p>
                    <ul className="flex flex-wrap gap-2 pt-1">
                      {[
                        "Nexa AI Access",
                        "ChatGPT Astra",
                        "Anthropic Fabel",
                        "Gemini Pro",
                        "More models",
                      ].map((tool, idx) => (
                        <li
                          key={idx}
                          className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300 border border-white/5"
                        >
                          &bull; {tool}
                        </li>
                      ))}
                    </ul>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-white text-sm">
                  ₹300
                </td>
              </tr>
            </tbody>

            <tfoot className="bg-[#141414] border-t-2 border-crimson/50">
              <tr>
                <td className="py-4 px-4 font-orbitron font-black text-sm text-white">
                  TOTAL PAYABLE:
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="font-orbitron font-black text-2xl text-bright-red tracking-tight">
                    ₹450
                  </span>
                  <span className="block text-[10px] font-mono text-zinc-400 uppercase">
                    Non-Editable Amount
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ─── 2. SUCCESS SCREEN (SECTION 41 & 42) ─────────────────────────────── */}
      {isCompleted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 rounded-3xl bg-gradient-to-b from-emerald-950/40 to-[#0e1713] border border-emerald-500/40 text-center space-y-6 shadow-2xl"
        >
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-xs font-orbitron font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
              Payment Completed
            </span>
            <h2 className="text-2xl sm:text-3xl font-orbitron font-black text-white mt-3">
              PAYMENT SUCCESSFUL
            </h2>
            <div className="text-xl font-orbitron font-bold text-emerald-400 mt-1">
              ₹450 Paid
            </div>
            <p className="text-xs text-zinc-300 max-w-md mx-auto mt-1">
              Your mandatory internship fee has been automatically verified against the settlement feed.
            </p>
          </div>

          {/* Read-Only Summary Table */}
          <div className="max-w-md mx-auto p-5 rounded-2xl bg-[#0a120e] border border-emerald-500/20 text-left text-xs space-y-2.5 font-mono">
            <div className="flex justify-between py-1 border-b border-emerald-500/10">
              <span className="text-zinc-400">Bill Purpose:</span>
              <span className="text-white font-semibold">Internship Service Bill</span>
            </div>
            <div className="flex justify-between py-1 border-b border-emerald-500/10">
              <span className="text-zinc-400">Mandatory ID Card:</span>
              <span className="text-zinc-200">₹150</span>
            </div>
            <div className="flex justify-between py-1 border-b border-emerald-500/10">
              <span className="text-zinc-400">AI Dev Tools Pack:</span>
              <span className="text-zinc-200">₹300</span>
            </div>
            <div className="flex justify-between py-1 border-b border-emerald-500/10">
              <span className="text-zinc-400">Total Paid:</span>
              <span className="text-emerald-400 font-bold">₹450.00 INR</span>
            </div>
            <div className="flex justify-between py-1 border-b border-emerald-500/10">
              <span className="text-zinc-400">Payment Reference:</span>
              <span className="text-white">{payment.referenceId}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-emerald-500/10">
              <span className="text-zinc-400">Payment Method:</span>
              <span className="text-white font-bold">
                {payment.paymentMethod === "CASH" ? "Cash" : (verificationResult?.paymentApp || selectedMethod)}
              </span>
            </div>
            {payment.paymentMethod === "CASH" ? (
              <>
                <div className="flex justify-between py-1 border-b border-emerald-500/10">
                  <span className="text-zinc-400">Confirmation:</span>
                  <span className="text-emerald-400 font-bold">CodeXa Agency (Physical Cash Received)</span>
                </div>
                {payment.paidAt && (
                  <div className="flex justify-between py-1 border-b border-emerald-500/10">
                    <span className="text-zinc-400">Paid At:</span>
                    <span className="text-zinc-200">
                      {new Date(payment.paidAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                {verificationResult?.utrNumber && (
                  <div className="flex justify-between py-1 border-b border-emerald-500/10">
                    <span className="text-zinc-400">Verified UTR:</span>
                    <span className="text-white font-bold">{verificationResult.utrNumber}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-emerald-500/10">
                  <span className="text-zinc-400">Verification Source:</span>
                  <span className="text-emerald-400 font-semibold">
                    CodeXa Automated Bank Feed Reconciler
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-left text-xs text-zinc-300 space-y-2">
            <div className="flex items-center gap-2 font-orbitron font-bold text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <span>Services Unlocked:</span>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
              <li className="flex items-center gap-1.5 text-zinc-200">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mandatory ID Card Processing Active</span>
              </li>
              <li className="flex items-center gap-1.5 text-zinc-200">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>AI Dev Tools Pack Activated</span>
              </li>
            </ul>
          </div>
        </motion.div>
      ) : (
        <>
          {/* ─── 3. PAYMENT METHOD SELECTOR & UPI INTENTS (SECTION 3 & 4) ──────── */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0d0d0d] border border-white/10 space-y-6 shadow-xl">
            <div>
              <h2 className="text-lg font-orbitron font-bold text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-bright-red" />
                Choose UPI App
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Select your preferred UPI app. Amount is fixed to ₹450 and non-editable.
              </p>
            </div>

            {/* Selectable Cards: PhonePe, Google Pay, Paytm, Other UPI, Pay with Cash */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {settings?.phonePeEnabled !== false && (
                <button
                  type="button"
                  disabled={payment.cashStatus === "PENDING_CASH_APPROVAL"}
                  onClick={() => setSelectedMethod("PHONEPE")}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                    selectedMethod === "PHONEPE"
                      ? "bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/30"
                      : "bg-[#141414] border-white/5 hover:border-white/20"
                  } ${payment.cashStatus === "PENDING_CASH_APPROVAL" ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs font-orbitron">
                      Pe
                    </span>
                    {selectedMethod === "PHONEPE" && (
                      <CheckCircle2 className="w-4 h-4 text-purple-400" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs block">PhonePe</span>
                    <span className="text-[10px] text-zinc-400">Direct UPI</span>
                  </div>
                </button>
              )}

              {settings?.googlePayEnabled !== false && (
                <button
                  type="button"
                  disabled={payment.cashStatus === "PENDING_CASH_APPROVAL"}
                  onClick={() => setSelectedMethod("GPAY")}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                    selectedMethod === "GPAY"
                      ? "bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/30"
                      : "bg-[#141414] border-white/5 hover:border-white/20"
                  } ${payment.cashStatus === "PENDING_CASH_APPROVAL" ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs font-orbitron">
                      G
                    </span>
                    {selectedMethod === "GPAY" && (
                      <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs block">Google Pay</span>
                    <span className="text-[10px] text-zinc-400">Tez Protocol</span>
                  </div>
                </button>
              )}

              {settings?.paytmEnabled !== false && (
                <button
                  type="button"
                  disabled={payment.cashStatus === "PENDING_CASH_APPROVAL"}
                  onClick={() => setSelectedMethod("PAYTM")}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                    selectedMethod === "PAYTM"
                      ? "bg-cyan-950/40 border-cyan-500 ring-2 ring-cyan-500/30"
                      : "bg-[#141414] border-white/5 hover:border-white/20"
                  } ${payment.cashStatus === "PENDING_CASH_APPROVAL" ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs font-orbitron">
                      Ptm
                    </span>
                    {selectedMethod === "PAYTM" && (
                      <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs block">Paytm</span>
                    <span className="text-[10px] text-zinc-400">UPI Wallet</span>
                  </div>
                </button>
              )}

              {/* Fam / FamPay */}
              <button
                type="button"
                disabled={payment.cashStatus === "PENDING_CASH_APPROVAL"}
                onClick={() => setSelectedMethod("FAM")}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                  selectedMethod === "FAM"
                    ? "bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30"
                    : "bg-[#141414] border-white/5 hover:border-white/20"
                } ${payment.cashStatus === "PENDING_CASH_APPROVAL" ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs font-orbitron">
                    Fam
                  </span>
                  {selectedMethod === "FAM" && (
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <div>
                  <span className="font-bold text-white text-xs block">Fam / FamPay</span>
                  <span className="text-[10px] text-zinc-400">Gen-Z UPI</span>
                </div>
              </button>

              {/* Amazon Pay */}
              <button
                type="button"
                disabled={payment.cashStatus === "PENDING_CASH_APPROVAL"}
                onClick={() => setSelectedMethod("AMAZON_PAY")}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                  selectedMethod === "AMAZON_PAY"
                    ? "bg-orange-950/40 border-orange-500 ring-2 ring-orange-500/30"
                    : "bg-[#141414] border-white/5 hover:border-white/20"
                } ${payment.cashStatus === "PENDING_CASH_APPROVAL" ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs font-orbitron">
                    Amz
                  </span>
                  {selectedMethod === "AMAZON_PAY" && (
                    <CheckCircle2 className="w-4 h-4 text-orange-400" />
                  )}
                </div>
                <div>
                  <span className="font-bold text-white text-xs block">Amazon Pay</span>
                  <span className="text-[10px] text-zinc-400">Amazon UPI</span>
                </div>
              </button>

              {/* BHIM */}
              <button
                type="button"
                disabled={payment.cashStatus === "PENDING_CASH_APPROVAL"}
                onClick={() => setSelectedMethod("BHIM")}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                  selectedMethod === "BHIM"
                    ? "bg-teal-950/40 border-teal-500 ring-2 ring-teal-500/30"
                    : "bg-[#141414] border-white/5 hover:border-white/20"
                } ${payment.cashStatus === "PENDING_CASH_APPROVAL" ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs font-orbitron">
                    BH
                  </span>
                  {selectedMethod === "BHIM" && (
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                  )}
                </div>
                <div>
                  <span className="font-bold text-white text-xs block">BHIM</span>
                  <span className="text-[10px] text-zinc-400">NPCI Official</span>
                </div>
              </button>

              {/* CRED */}
              <button
                type="button"
                disabled={payment.cashStatus === "PENDING_CASH_APPROVAL"}
                onClick={() => setSelectedMethod("CRED")}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                  selectedMethod === "CRED"
                    ? "bg-zinc-800 border-white/60 ring-2 ring-white/20"
                    : "bg-[#141414] border-white/5 hover:border-white/20"
                } ${payment.cashStatus === "PENDING_CASH_APPROVAL" ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold text-xs font-orbitron">
                    CR
                  </span>
                  {selectedMethod === "CRED" && (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  )}
                </div>
                <div>
                  <span className="font-bold text-white text-xs block">CRED</span>
                  <span className="text-[10px] text-zinc-400">CRED UPI</span>
                </div>
              </button>

              {settings?.otherUpiEnabled !== false && (
                <button
                  type="button"
                  disabled={payment.cashStatus === "PENDING_CASH_APPROVAL"}
                  onClick={() => setSelectedMethod("OTHER_UPI")}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                    selectedMethod === "OTHER_UPI"
                      ? "bg-rose-950/40 border-bright-red ring-2 ring-bright-red/30"
                      : "bg-[#141414] border-white/5 hover:border-white/20"
                  } ${payment.cashStatus === "PENDING_CASH_APPROVAL" ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="w-8 h-8 rounded-xl bg-bright-red/20 text-bright-red flex items-center justify-center font-bold text-xs font-orbitron">
                      UPI
                    </span>
                    {selectedMethod === "OTHER_UPI" && (
                      <CheckCircle2 className="w-4 h-4 text-bright-red" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs block">Other UPI App</span>
                    <span className="text-[10px] text-zinc-400">Any Bank / App</span>
                  </div>
                </button>
              )}

              {settings?.cashEnabled !== false && (
                <button
                  type="button"
                  disabled={Boolean(activeAttempt && !timerExpired)}
                  onClick={() => setSelectedMethod("CASH")}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                    selectedMethod === "CASH" || payment.cashStatus === "PENDING_CASH_APPROVAL"
                      ? "bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30"
                      : "bg-[#141414] border-white/5 hover:border-white/20"
                  } ${activeAttempt && !timerExpired ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs font-orbitron">
                      ₹
                    </span>
                    {(selectedMethod === "CASH" || payment.cashStatus === "PENDING_CASH_APPROVAL") && (
                      <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs block">Pay with Cash</span>
                    <span className="text-[10px] text-zinc-400">
                      {payment.cashStatus === "PENDING_CASH_APPROVAL" ? "Pending Approval" : "Physical Receipt"}
                    </span>
                  </div>
                </button>
              )}
            </div>

            {/* ACTIVE PENDING CASH APPROVAL SCREEN (SECTIONS 13 - 18) */}
            {payment.cashStatus === "PENDING_CASH_APPROVAL" ? (
              <div className="space-y-6 pt-2">
                <div className="p-6 rounded-2xl bg-[#141414] border border-amber-500/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                        <span className="text-xs font-orbitron font-bold uppercase tracking-wider text-amber-400">
                          Waiting for Cash Confirmation
                        </span>
                      </div>
                      <h3 className="text-xl font-orbitron font-bold text-white mt-1">
                        CASH PAYMENT REQUESTED
                      </h3>
                    </div>
                    <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold self-start sm:self-auto">
                      ₹450 Cash Pending
                    </div>
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-[#1a1a1a] border border-white/5">
                      <span className="text-zinc-500 text-[10px] uppercase block">Intern</span>
                      <span className="text-white font-bold truncate block">{payment.userName}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#1a1a1a] border border-white/5">
                      <span className="text-zinc-500 text-[10px] uppercase block">Intern ID</span>
                      <span className="text-blue-400 font-bold block">{payment.internId || "CXA-INT-2026"}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#1a1a1a] border border-white/5">
                      <span className="text-zinc-500 text-[10px] uppercase block">Amount</span>
                      <span className="text-bright-red font-bold block">₹450 (Fixed)</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#1a1a1a] border border-white/5">
                      <span className="text-zinc-500 text-[10px] uppercase block">Method</span>
                      <span className="text-amber-400 font-bold block">Cash</span>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 space-y-1.5">
                    <div className="font-bold flex items-center gap-2 text-amber-300">
                      <Info className="w-4 h-4 shrink-0" />
                      <span>Physical Cash Handover Instructions:</span>
                    </div>
                    <p>
                      Please hand the exact <strong>₹450</strong> cash amount to an authorized CodeXa representative.
                      Your payment will become successful only after physical receipt and confirmation by Founder or Co-Founder.
                    </p>
                  </div>
                </div>

                {/* ─── CONTACT CO-FOUNDER ON WHATSAPP (SECTION 14, 15, 16) ──────── */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0d1f14] to-[#12281b] border border-emerald-500/30 space-y-4 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 tracking-wider block">
                        Official Cash Intake Dispatch
                      </span>
                      <h4 className="text-base font-orbitron font-bold text-white mt-0.5">
                        CONTACT CO-FOUNDER ON WHATSAPP
                      </h4>
                      <p className="text-xs text-zinc-300 mt-0.5">
                        Co-Founder: <strong className="text-white">B. Sanjay</strong> &bull; WhatsApp:{" "}
                        <strong className="text-emerald-400 font-mono">
                          {settings?.coFounderWhatsApp || "7075920852"}
                        </strong>
                      </p>
                    </div>

                    <a
                      href={`https://wa.me/${
                        (settings?.coFounderWhatsApp || "7075920852").replace(/\D/g, "").startsWith("91")
                          ? (settings?.coFounderWhatsApp || "7075920852").replace(/\D/g, "")
                          : `91${(settings?.coFounderWhatsApp || "7075920852").replace(/\D/g, "")}`
                      }?text=${encodeURIComponent(
                        [
                          "Hello B. Sanjay,",
                          "",
                          "I have selected Cash Payment for my CodeXa Internship Service Bill.",
                          "",
                          `Intern Name: ${payment.userName || "Intern"}`,
                          `Intern ID: ${payment.internId || "CXA-INT-2026"}`,
                          `Email: ${payment.userEmail || ""}`,
                          `Domain: ${payment.domain || "Development"}`,
                          "",
                          "Payment Amount: ₹450",
                          "Payment Method: Cash",
                          `Payment Reference: ${payment.referenceId}`,
                          "",
                          "Status: Pending Cash Approval",
                          "",
                          "I will hand over the ₹450 cash payment for verification.",
                          "",
                          "Please confirm the payment in the CodeXa Payment Control Center after receiving the cash.",
                          "",
                          "— CodeXa Agency Payment System",
                        ].join("\n")
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-orbitron font-bold text-xs uppercase tracking-wider transition-all shadow-lg shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>SEND CASH PAYMENT REQUEST</span>
                    </a>
                  </div>
                </div>

                {/* ─── CASH PAYMENT REQUEST CARD (SECTIONS 17 & 18) ─────────────── */}
                <div className="p-6 rounded-2xl bg-[#141414] border border-white/10 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-orbitron font-bold text-white uppercase tracking-wider">
                        Official Cash Payment Request Card
                      </h4>
                      <p className="text-xs text-zinc-400">
                        Generated request pass watermarked with &quot;PENDING CASH APPROVAL&quot;.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleShareCashCard}
                        disabled={sharingCard}
                        className="px-3.5 py-2 rounded-xl bg-[#222] hover:bg-[#2c2c2c] border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-bright-red" />
                        <span>{sharingCard ? "Sharing..." : "Share Request"}</span>
                      </button>
                      <a
                        href={`/api/payments/${payment.id}/cash/card`}
                        download={`CodeXa_Cash_Request_${payment.referenceId}.svg`}
                        className="px-3.5 py-2 rounded-xl bg-[#222] hover:bg-[#2c2c2c] border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
                      >
                        <FileSearch className="w-3.5 h-3.5 text-blue-400" />
                        <span>Download Card</span>
                      </a>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0B0F17] flex justify-center p-2">
                    <img
                      src={`/api/payments/${payment.id}/cash/card`}
                      alt="CodeXa Cash Payment Request Card"
                      className="w-full max-w-2xl rounded-lg shadow-2xl"
                    />
                  </div>
                </div>

                {/* Cash Policy & Cancellation Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#121212] border border-white/5 text-xs">
                  <div className="text-zinc-400 text-[11px] space-y-0.5">
                    <p className="text-zinc-300 font-semibold">Need to switch to instant UPI?</p>
                    <p>You can cancel this cash request at any time before physical receipt is confirmed.</p>
                  </div>

                  <button
                    type="button"
                    disabled={cancellingCash}
                    onClick={handleCancelCashRequest}
                    className="px-4 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 font-mono text-xs font-semibold transition-colors self-start sm:self-auto disabled:opacity-50"
                  >
                    {cancellingCash ? "Cancelling..." : "Cancel Cash Request"}
                  </button>
                </div>
              </div>
            ) : selectedMethod === "CASH" ? (
              /* ─── CASH CONFIRMATION VIEW (SECTION 9) ──────────────────────── */
              <div className="p-6 rounded-2xl bg-[#141414] border border-amber-500/30 space-y-5 pt-2">
                <div className="border-b border-white/10 pb-4">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block">
                    Physical Cash Option
                  </span>
                  <h3 className="text-xl font-orbitron font-bold text-white mt-1">
                    Pay ₹450 in Cash
                  </h3>
                  <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                    You are requesting to pay your mandatory Internship Service Bill in cash.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-zinc-400 text-xs block">Fixed Internship Amount</span>
                    <span className="text-white text-[11px]">Mandatory ID Card (₹150) + AI Tools (₹300)</span>
                  </div>
                  <span className="font-orbitron font-black text-2xl text-bright-red">
                    ₹450
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 space-y-1">
                  <p className="font-bold text-amber-300">Notice on Cash Verification:</p>
                  <p>
                    Cash payment is marked successful only after physical cash is received and confirmed by Founder or Co-Founder in the CodeXa Payment Control Center.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={requestingCash}
                  onClick={handleRequestCashPayment}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 text-black font-orbitron font-black text-sm tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {requestingCash ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  <span>REQUEST CASH PAYMENT</span>
                </button>
              </div>
            ) : (
              /* ─── STANDARD UPI LAUNCH / QR AREA ───────────────────────────── */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-2">
                {/* Left: Dynamic QR for Desktop */}
                <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[#141414] border border-white/5 space-y-3">
                  <div className="p-3 bg-white rounded-2xl shadow-xl">
                    <img
                      src={`/api/payments/qr?pa=${encodeURIComponent(
                        upiId
                      )}&pn=${encodeURIComponent(receiverName)}&am=${amountStr}&tn=${encodeURIComponent(
                        payment.referenceId
                      )}`}
                      alt="CodeXa UPI QR Code"
                      className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                    />
                  </div>

                  <div className="text-center flex flex-col items-center">
                    <span className="text-[11px] font-semibold uppercase text-zinc-300 tracking-wider">
                      Scan with PhonePe / Google Pay / Paytm / Any UPI App
                    </span>
                    <p className="text-[10px] font-mono text-bright-red mt-0.5">
                      Amount: ₹450 &bull; Ref: {payment.referenceId}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const uploadEl = document.getElementById("proof-upload-section");
                        if (uploadEl) {
                          uploadEl.scrollIntoView({ behavior: "smooth" });
                        } else if (!activeAttempt) {
                          handleStartPayment("OTHER_UPI");
                        }
                      }}
                      className="mt-2.5 px-4 py-1.5 rounded-xl bg-bright-red/20 hover:bg-bright-red/30 border border-bright-red/40 text-bright-red hover:text-white text-[11px] font-orbitron font-bold uppercase transition-all shadow-[0_0_12px_rgba(239,35,60,0.2)] flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      IF PAID, VERIFY
                    </button>
                  </div>
                </div>

                {/* Right: UPI Details & Launch Button */}
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#161616] border border-white/10 space-y-2">
                    <span className="text-zinc-500 text-[11px] uppercase tracking-wider font-semibold block">
                      Official Receiver UPI ID
                    </span>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-sm sm:text-base font-bold text-white tracking-wide truncate">
                        {upiId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(upiId, "upi")}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222] hover:bg-[#2c2c2c] text-xs font-semibold text-white transition-colors border border-white/10"
                      >
                        {copiedUpi ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Copy UPI</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Payee Name: {receiverName}
                    </div>
                  </div>

                  {/* Main Launch Intent Action (Section 5) */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={startingPayment}
                      onClick={() => handleStartPayment(selectedMethod as any)}
                      className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-crimson to-bright-red hover:brightness-110 text-white font-orbitron font-bold text-sm tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(217,4,41,0.4)] flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {startingPayment ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Smartphone className="w-4 h-4" />
                      )}
                      <span>PAY ₹450</span>
                    </button>

                    <p className="text-[11px] text-zinc-500 text-center">
                      Tapping initiates the 5-minute payment session and opens your chosen UPI app.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RENDER UPI TIMER & SCREENSHOT SUBMISSION ONLY FOR UPI FLOW */}
          {selectedMethod !== "CASH" && payment.cashStatus !== "PENDING_CASH_APPROVAL" && (
            <>
              {/* ─── 4. FIVE-MINUTE TIMER (SECTION 6) ─────────────────────────────── */}
              {activeAttempt && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-5 sm:p-6 rounded-3xl border ${
                    timerExpired
                      ? "bg-rose-950/20 border-rose-500/40"
                      : "bg-amber-950/20 border-amber-500/40"
                  } flex flex-col sm:flex-row items-center justify-between gap-4`}
                >
                  <div className="flex items-center gap-3.5 text-left w-full sm:w-auto">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        timerExpired
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
                      }`}
                    >
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                        Complete your payment
                      </span>
                      <p className="text-xs text-white font-sans mt-0.5 max-w-md">
                        {timerExpired
                          ? "Payment session expired. Please start a new payment verification attempt."
                          : "Pay ₹450 using the selected UPI app and upload the payment screenshot before this timer expires."}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`font-orbitron font-black text-3xl tracking-wider ${
                        timerExpired ? "text-rose-400" : "text-amber-400"
                      }`}
                    >
                      {timerExpired ? "00:00" : formatTimer(secondsLeft)}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase block">
                      Server Session Window
                    </span>
                  </div>
                </motion.div>
              )}

              {/* ─── 5. LIVE OCR ANALYSIS & VERIFICATION PROCESSING (SECTION 67) ─── */}
              {submittingProof && (
                <div className="p-8 rounded-3xl bg-[#0f0f0f] border border-amber-500/40 text-center space-y-4">
                  <div className="w-14 h-14 border-4 border-amber-500/20 border-t-amber-400 rounded-full animate-spin mx-auto" />
                  <div>
                    <h3 className="font-orbitron font-bold text-white text-lg">
                      {analyzingStep === "UPLOADING"
                        ? "Uploading Screenshot..."
                        : analyzingStep === "OCR_ANALYSIS"
                        ? "Analyzing Payment Screenshot with AI OCR..."
                        : "Reconciling with Bank Settlement Feed..."}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Extracting amount, UTR, timestamp, and reconciling with official accounts.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-mono">
                    <span>
                      {analyzingStep === "OCR_ANALYSIS"
                        ? "Deep Neural Character Recognition"
                        : "Automated Decision Engine Active"}
                    </span>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  </div>
                </div>
              )}

              {/* ─── 6. FAILURE SCREEN (SECTION 38-40) ─────────────────────────────── */}
              {verificationResult?.status === "FAILED" && !submittingProof && (
                <div className="p-6 sm:p-8 rounded-3xl bg-rose-950/30 border border-rose-500/40 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
                    <XCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-orbitron font-bold text-white text-lg">
                      PAYMENT NOT VERIFIED
                    </h3>
                    <p className="text-xs text-rose-200 mt-1 max-w-md mx-auto">
                      {verificationResult.error ||
                        "Payment could not be automatically confirmed. Please make sure the screenshot is clear and shows the completed transaction details."}
                    </p>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="px-6 py-2.5 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase transition-all shadow-lg"
                    >
                      START NEW PAYMENT ATTEMPT
                    </button>
                  </div>
                </div>
              )}

              {/* ─── 7. PURE SCREENSHOT UPLOAD FORM (ZERO MANUAL ENTRY) ──────────── */}
              {!submittingProof && !isCompleted && (
                <form
                  id="proof-upload-section"
                  onSubmit={handleSubmitProof}
                  className="p-6 sm:p-8 rounded-3xl bg-[#0d0d0d] border border-white/10 space-y-6 shadow-xl"
                >
                  <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-orbitron font-bold text-white flex items-center gap-2">
                        <Upload className="w-5 h-5 text-emerald-400" />
                        Payment Screenshot Verification
                      </h2>
                      <p className="text-xs text-zinc-400 mt-1">
                        Upload your UPI receipt. CodeXa automatically extracts and verifies all transaction details.
                      </p>
                    </div>

                    {timerExpired && (
                      <button
                        type="button"
                        onClick={handleRetry}
                        className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-[#222] hover:bg-[#333] border border-white/10 text-xs font-mono text-zinc-300"
                      >
                        Restart 5-Min Window
                      </button>
                    )}
                  </div>

                  {proofError && (
                    <div className="p-3.5 rounded-xl bg-crimson/15 border border-crimson/30 text-crimson text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{proofError}</span>
                    </div>
                  )}

                  {/* Screenshot Upload Dropzone (Section 9 & 10) */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                      <span>Payment Screenshot *</span>
                      <span className="text-[11px] text-zinc-500">
                        Max 10 MB (JPEG, PNG, WebP)
                      </span>
                    </label>

                    <div className="relative border-2 border-dashed border-white/10 hover:border-crimson/50 rounded-2xl p-6 text-center transition-colors bg-[#121212]">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />

                      {previewUrl ? (
                        <div className="flex flex-col items-center gap-3">
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="max-h-56 rounded-xl object-contain border border-white/10"
                          />
                          <span className="text-xs text-zinc-400">
                            Click or drag to replace screenshot
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2 py-4">
                          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-zinc-400">
                            <Upload className="w-6 h-6 text-bright-red" />
                          </div>
                          <div className="text-xs text-zinc-300">
                            <span className="font-semibold text-white">Click to upload</span> or drag and drop
                          </div>
                          <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                            Upload the full transaction screen from PhonePe, Google Pay, Paytm, or your bank UPI app.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Auto Extraction Note */}
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-zinc-400 flex items-center gap-2.5">
                    <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      <strong>Zero Manual Entry:</strong> UTR number, transaction date, time, and amount are automatically extracted and verified by CodeXa.
                    </span>
                  </div>

                  {/* Submit Button (Section 9) */}
                  <div>
                    <button
                      type="submit"
                      disabled={submittingProof || !screenshotFile || timerExpired}
                      className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 text-white font-orbitron font-bold text-sm tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Upload className="w-4 h-4" />
                      <span>UPLOAD PAYMENT SCREENSHOT</span>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
