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
    "PHONEPE" | "GPAY" | "PAYTM" | "OTHER_UPI"
  >("PHONEPE");
  const [startingPayment, setStartingPayment] = useState(false);
  const [intentData, setIntentData] = useState<{
    universalUri: string;
    appSpecificUri: string;
    qrPayload: string;
  } | null>(null);

  // 5-Minute Timer State
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [timerExpired, setTimerExpired] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Proof Form State
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [paymentTime, setPaymentTime] = useState(() =>
    new Date().toTimeString().slice(0, 5)
  );
  const [submittingProof, setSubmittingProof] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);

  // Verification & Status Polling
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
        if (["PHONEPE", "GPAY", "PAYTM", "OTHER_UPI"].includes(data.activeAttempt.selectedMethod)) {
          setSelectedMethod(data.activeAttempt.selectedMethod);
        }
        setupTimer(data.activeAttempt.expiresAt);

        if (data.activeAttempt.status === "VERIFYING") {
          setVerifying(true);
        } else if (data.activeAttempt.status === "SUCCESS") {
          setVerificationResult({
            status: "SUCCESS",
            verifiedAt: data.activeAttempt.verifiedAt,
            utrNumber: data.activeAttempt.utrNumber,
          });
        }
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

  // Start Payment Session (creates PaymentAttempt on server)
  const handleStartPayment = async (methodOverride?: "PHONEPE" | "GPAY" | "PAYTM" | "OTHER_UPI") => {
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

      // On mobile, trigger app-specific or universal UPI deep link
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

  // Handle proof submission
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payment) return;

    if (!screenshotFile) {
      setProofError("Please select and upload your payment screenshot.");
      return;
    }

    const cleanUtr = utrNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!cleanUtr || cleanUtr.length < 8) {
      setProofError("Please enter a valid UTR / Transaction ID (minimum 8 characters).");
      return;
    }

    if (!paymentDate || !paymentTime) {
      setProofError("Please select the exact payment date and time.");
      return;
    }

    try {
      setSubmittingProof(true);
      setProofError(null);

      const formData = new FormData();
      formData.append("screenshot", screenshotFile);
      formData.append("utrNumber", cleanUtr);
      formData.append("paymentDate", paymentDate);
      formData.append("paymentTime", paymentTime);
      formData.append("upiApp", selectedMethod);
      if (activeAttempt?.id) {
        formData.append("attemptId", activeAttempt.id);
      }

      const res = await fetch(`/api/payments/${payment.id}/proof`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.status === "EXPIRED" || data.reason === "UPLOAD_EXPIRED") {
          setTimerExpired(true);
          setProofError("Payment proof window expired. Please click 'Try Again' below to start a new 5-minute session.");
        } else {
          setProofError(data.error || "Failed to submit payment proof");
        }
        return;
      }

      if (data.status === "SUCCESS") {
        setVerificationResult(data);
        setInternPaid(true);
        if (onStatusChange) onStatusChange("APPROVED");
      } else if (data.status === "VERIFYING") {
        setVerifying(true);
        startPollingVerification(payment.id);
      } else if (data.status === "FAILED") {
        setVerificationResult({
          status: "FAILED",
          reason: data.reason || "TRANSACTION_NOT_VERIFIED",
          error: data.error,
        });
      }
    } catch (err: any) {
      console.error("Proof submission error:", err);
      setProofError(err.message || "An unexpected error occurred during proof submission");
    } finally {
      setSubmittingProof(false);
    }
  };

  // Poll verification status
  const startPollingVerification = (paymentId: string) => {
    let attemptsCount = 0;
    const interval = setInterval(async () => {
      attemptsCount++;
      try {
        const res = await fetch(`/api/payments/${paymentId}/verification`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "SUCCESS" || data.paymentStatus === "APPROVED") {
            clearInterval(interval);
            setVerifying(false);
            setVerificationResult({
              status: "SUCCESS",
              verifiedAt: data.verifiedAt,
              utrNumber: data.utrNumber,
            });
            setInternPaid(true);
            if (onStatusChange) onStatusChange("APPROVED");
            return;
          }

          if (data.status === "FAILED") {
            clearInterval(interval);
            setVerifying(false);
            setVerificationResult({
              status: "FAILED",
              reason: data.verificationReason || "TRANSACTION_NOT_VERIFIED",
            });
            return;
          }
        }
      } catch (pollErr) {
        console.error("Polling error:", pollErr);
      }

      if (attemptsCount >= 10) {
        clearInterval(interval);
        setVerifying(false);
        setVerificationResult({
          status: "FAILED",
          reason: "TRANSACTION_NOT_VERIFIED",
          error: "Verification pending: Transaction could not be reconciled automatically against settlement feed yet. Please contact admin or try again.",
        });
      }
    }, 3000);
  };

  // Reset / Retry session
  const handleRetry = async () => {
    if (!payment) return;
    try {
      setLoading(true);
      setVerificationResult(null);
      setProofError(null);
      setScreenshotFile(null);
      setPreviewUrl(null);
      setUtrNumber("");
      setTimerExpired(false);

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
        <p className="font-mono text-xs text-zinc-400">Loading secure intern payment gateway...</p>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="p-8 rounded-3xl bg-crimson/10 border border-crimson/20 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-bright-red mx-auto" />
        <h3 className="font-orbitron font-bold text-white text-base">Payment Initialization Error</h3>
        <p className="text-xs text-zinc-400">{error || "Could not retrieve intern billing data"}</p>
        <button
          onClick={loadPaymentData}
          className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  const isCompleted = internPaid || payment.paymentStatus === "APPROVED" || payment.paymentStatus === "SUCCESS" || verificationResult?.status === "SUCCESS";
  const upiId = activeAttempt?.upiIdSnapshot || settings?.upiId || "shaikashu33@fam";
  const receiverName = activeAttempt?.receiverSnapshot || settings?.receiverName || "CodeXa Agency";
  const amountStr = "450.00";

  // App labels
  const appNames: Record<string, string> = {
    PHONEPE: "PhonePe",
    GPAY: "Google Pay",
    PAYTM: "Paytm",
    OTHER_UPI: "Other UPI App",
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* ─── PUSH NOTIFICATION BANNER (OPT-IN CTA) ─────────────────────────── */}
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
              <span className="text-white font-semibold">{payment.domain || "Development"}</span>
              <span>&bull;</span>
              <span>Role:</span>
              <span className="text-white font-semibold">INTERN</span>
              <span>&bull;</span>
              <span>Intern ID:</span>
              <span className="font-mono text-zinc-300">{payment.internId || "CXA-INT-DEV"}</span>
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

        {/* Intern Snapshot Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 my-6 rounded-2xl bg-[#141414] border border-white/5 text-xs">
          <div>
            <span className="text-zinc-500 text-[11px] block">Intern Name</span>
            <span className="font-semibold text-white truncate block">{payment.userName}</span>
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
            <span className="text-zinc-500 text-[11px] block">Current Status</span>
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
                ? "Payment Session Expired"
                : activeAttempt
                ? "Payment Started"
                : "Pending Payment"}
            </span>
          </div>
        </div>

        {/* ─── MANDATORY SERVICE BILL BREAKDOWN ───────────────────────────────── */}
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#111]">
          <div className="p-3.5 bg-[#161616] border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-orbitron font-bold uppercase tracking-wider text-zinc-300">
              Itemized Service Breakdown (Domain: Development)
            </span>
            <span className="text-[11px] font-mono text-zinc-400">Strictly Non-Editable</span>
          </div>

          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-white/5 text-zinc-200">
              <tr className="hover:bg-white/[0.01]">
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-white">1. Mandatory ID Card</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Official CodeXa engineering credential & physical NFC/QR card printing
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
                    <p className="text-zinc-300">Includes complete developer model suite:</p>
                    <ul className="flex flex-wrap gap-2 pt-1">
                      {["Nexa AI Access", "ChatGPT Astra", "Anthropic Fabel", "Gemini Pro", "More models"].map(
                        (tool, idx) => (
                          <li
                            key={idx}
                            className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300 border border-white/5"
                          >
                            &bull; {tool}
                          </li>
                        )
                      )}
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
                    Mandatory Server Enforced
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ─── 2. SUCCESS SCREEN (IF PAYMENT VERIFIED) ───────────────────────── */}
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
              Status: Verified & Completed
            </span>
            <h2 className="text-2xl sm:text-3xl font-orbitron font-black text-white mt-3">
              PAYMENT SUCCESSFUL
            </h2>
            <p className="text-xs text-zinc-300 max-w-md mx-auto mt-1">
              Your mandatory internship fee of <strong>₹450</strong> has been automatically verified against the settlement feed.
            </p>
          </div>

          <div className="max-w-md mx-auto p-4 rounded-2xl bg-[#0a120e] border border-emerald-500/20 text-left text-xs space-y-2 font-mono">
            <div className="flex justify-between py-1 border-b border-emerald-500/10">
              <span className="text-zinc-400">Bill Purpose:</span>
              <span className="text-white font-semibold">Internship Service Bill</span>
            </div>
            <div className="flex justify-between py-1 border-b border-emerald-500/10">
              <span className="text-zinc-400">Total Paid:</span>
              <span className="text-emerald-400 font-bold">₹450.00 INR</span>
            </div>
            <div className="flex justify-between py-1 border-b border-emerald-500/10">
              <span className="text-zinc-400">Payment Reference:</span>
              <span className="text-white">{payment.referenceId}</span>
            </div>
            {verificationResult?.utrNumber && (
              <div className="flex justify-between py-1 border-b border-emerald-500/10">
                <span className="text-zinc-400">Verified UTR:</span>
                <span className="text-white">{verificationResult.utrNumber}</span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span className="text-zinc-400">Verified By:</span>
              <span className="text-emerald-400 font-semibold">Automated Decision Engine</span>
            </div>
          </div>

          {/* Unlocked Services Notification */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-left text-xs text-zinc-300 space-y-2">
            <div className="flex items-center gap-2 font-orbitron font-bold text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <span>Services Unlocked for Your Account:</span>
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
          {/* ─── 3. PAYMENT METHOD SELECTOR & UPI INTENTS ─────────────────────── */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0d0d0d] border border-white/10 space-y-6 shadow-xl">
            <div>
              <h2 className="text-lg font-orbitron font-bold text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-bright-red" />
                Choose Payment Method
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Select your preferred UPI application to pay the mandatory ₹450 fee. Only one method can be selected.
              </p>
            </div>

            {/* Selectable Cards (PhonePe, Google Pay, Paytm, Other UPI) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {settings?.phonePeEnabled !== false && (
                <button
                  type="button"
                  onClick={() => setSelectedMethod("PHONEPE")}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                    selectedMethod === "PHONEPE"
                      ? "bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/30"
                      : "bg-[#141414] border-white/5 hover:border-white/20"
                  }`}
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
                  onClick={() => setSelectedMethod("GPAY")}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                    selectedMethod === "GPAY"
                      ? "bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/30"
                      : "bg-[#141414] border-white/5 hover:border-white/20"
                  }`}
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
                  onClick={() => setSelectedMethod("PAYTM")}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                    selectedMethod === "PAYTM"
                      ? "bg-cyan-950/40 border-cyan-500 ring-2 ring-cyan-500/30"
                      : "bg-[#141414] border-white/5 hover:border-white/20"
                  }`}
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

              {settings?.otherUpiEnabled !== false && (
                <button
                  type="button"
                  onClick={() => setSelectedMethod("OTHER_UPI")}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                    selectedMethod === "OTHER_UPI"
                      ? "bg-rose-950/40 border-bright-red ring-2 ring-bright-red/30"
                      : "bg-[#141414] border-white/5 hover:border-white/20"
                  }`}
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
                    <span className="text-[10px] text-zinc-400">BHIM / CRED / Any</span>
                  </div>
                </button>
              )}
            </div>

            {/* Launch / QR Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-2">
              {/* Left: Dynamic QR for Desktop */}
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[#141414] border border-white/5 space-y-3">
                <div className="p-3 bg-white rounded-2xl shadow-xl">
                  <img
                    src={`/api/payments/qr?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
                      receiverName
                    )}&am=${amountStr}&tn=${encodeURIComponent(payment.referenceId)}`}
                    alt="CodeXa UPI QR Code"
                    className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                  />
                </div>

                <div className="text-center">
                  <span className="text-[11px] font-semibold uppercase text-zinc-300 tracking-wider">
                    Scan using: PhonePe / Google Pay / Paytm / Any UPI App
                  </span>
                  <p className="text-[10px] font-mono text-bright-red mt-0.5">
                    Amount: ₹450 &bull; Ref: {payment.referenceId}
                  </p>
                </div>
              </div>

              {/* Right: UPI Details & Launch Button */}
              <div className="space-y-4">
                {/* Official Receiver Snapshot */}
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
                  <div className="text-[11px] text-zinc-400">Payee Name: {receiverName}</div>
                </div>

                {/* Main Launch Intent Action */}
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={startingPayment}
                    onClick={() => handleStartPayment(selectedMethod)}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-crimson to-bright-red hover:brightness-110 text-white font-orbitron font-bold text-sm tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(217,4,41,0.4)] flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {startingPayment ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Smartphone className="w-4 h-4" />
                    )}
                    <span>
                      {selectedMethod === "PHONEPE"
                        ? "OPEN PHONEPE"
                        : selectedMethod === "GPAY"
                        ? "OPEN GOOGLE PAY"
                        : selectedMethod === "PAYTM"
                        ? "OPEN PAYTM"
                        : "OPEN UPI APP"}
                    </span>
                  </button>

                  <p className="text-[11px] text-zinc-500 text-center">
                    Tapping initiates the 5-minute payment session and opens your chosen UPI app with fixed ₹450.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── 4. FIVE-MINUTE TIMER & ACTIVE SESSION INDICATOR ─────────────── */}
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
                    Payment Proof Window
                  </span>
                  <p className="text-xs text-white font-sans mt-0.5 max-w-md">
                    {timerExpired
                      ? "Payment session expired. Please start a new payment verification attempt."
                      : "Complete the ₹450 payment and upload the payment screenshot within 5 minutes."}
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
                  Authoritative Server Time
                </span>
              </div>
            </motion.div>
          )}

          {/* ─── 5. VERIFYING SCREEN (POLLING) ─────────────────────────────────── */}
          {verifying && (
            <div className="p-8 rounded-3xl bg-[#0f0f0f] border border-amber-500/40 text-center space-y-4">
              <div className="w-14 h-14 border-4 border-amber-500/20 border-t-amber-400 rounded-full animate-spin mx-auto" />
              <div>
                <h3 className="font-orbitron font-bold text-white text-lg">
                  Verifying Payment...
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  We&apos;re checking your transaction details against the official UPI settlement feed.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-mono">
                <span>Polling settlement records</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              </div>
            </div>
          )}

          {/* ─── 6. FAILURE SCREEN (IF VERIFICATION FAILED) ───────────────────── */}
          {verificationResult?.status === "FAILED" && !verifying && (
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
                    (verificationResult.reason === "UTR_NOT_FOUND"
                      ? "Transaction could not be matched in the settlement feed. Please ensure the payment was successfully debited."
                      : verificationResult.reason === "UPLOAD_EXPIRED"
                      ? "Payment was outside the allowed 5-minute verification window."
                      : verificationResult.reason === "UTR_DUPLICATE"
                      ? "UTR has already been used for another payment."
                      : verificationResult.reason === "PROOF_DUPLICATE"
                      ? "This payment screenshot has already been submitted."
                      : "Verification failed. Please retry your payment.")}
                </p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-6 py-2.5 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase transition-all shadow-lg"
                >
                  TRY AGAIN
                </button>
              </div>
            </div>
          )}

          {/* ─── 7. PAYMENT PROOF FORM ─────────────────────────────────────────── */}
          {!verifying && (
            <form
              onSubmit={handleSubmitProof}
              className="p-6 sm:p-8 rounded-3xl bg-[#0d0d0d] border border-white/10 space-y-6 shadow-xl"
            >
              <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-orbitron font-bold text-white flex items-center gap-2">
                    <Upload className="w-5 h-5 text-emerald-400" />
                    I HAVE COMPLETED PAYMENT
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Upload your UPI transaction screenshot and reference details for instant automated verification.
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

              {/* Screenshot Upload Dropzone */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Payment Screenshot *</span>
                  <span className="text-[11px] text-zinc-500">Max 10 MB (JPEG, PNG, WebP)</span>
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
                        className="max-h-48 rounded-xl object-contain border border-white/10"
                      />
                      <span className="text-xs text-zinc-400">Click to change screenshot</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mx-auto text-zinc-400">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-xs text-zinc-300">
                        <span className="font-semibold text-white">Click to upload</span> or drag and drop
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Ensure Amount (₹450), UTR, and timestamp are clearly readable.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Fields: UTR, Date, Time, App */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* UTR / Transaction ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    UTR / Transaction ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. 528910482910"
                    className="w-full px-4 py-3 rounded-xl bg-[#141414] border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-bright-red transition-colors"
                  />
                  <span className="text-[10px] text-zinc-500 block">
                    12-digit UPI reference number from your bank app.
                  </span>
                </div>

                {/* Selected UPI App (Pre-filled) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    UPI App Used *
                  </label>
                  <select
                    value={selectedMethod}
                    onChange={(e) =>
                      setSelectedMethod(
                        e.target.value as "PHONEPE" | "GPAY" | "PAYTM" | "OTHER_UPI"
                      )
                    }
                    className="w-full px-4 py-3 rounded-xl bg-[#141414] border border-white/10 text-white text-sm focus:outline-none focus:border-bright-red transition-colors"
                  >
                    <option value="PHONEPE">PhonePe</option>
                    <option value="GPAY">Google Pay</option>
                    <option value="PAYTM">Paytm</option>
                    <option value="OTHER_UPI">Other UPI App</option>
                  </select>
                  <span className="text-[10px] text-zinc-500 block">
                    Pre-selected from your payment method choice.
                  </span>
                </div>

                {/* Payment Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#141414] border border-white/10 text-white text-sm focus:outline-none focus:border-bright-red transition-colors"
                  />
                </div>

                {/* Payment Time */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    Payment Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={paymentTime}
                    onChange={(e) => setPaymentTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#141414] border border-white/10 text-white text-sm focus:outline-none focus:border-bright-red transition-colors"
                  />
                </div>
              </div>

              {/* Submit Proof Button */}
              <button
                type="submit"
                disabled={submittingProof || timerExpired}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 text-white font-orbitron font-bold text-sm tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingProof ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Proof with Settlement Engine...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>SUBMIT FOR AUTOMATIC VERIFICATION</span>
                  </>
                )}
              </button>

              <div className="p-3.5 rounded-xl bg-[#141414] border border-white/5 text-[11px] text-zinc-400 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
                  <Lock className="w-3.5 h-3.5 text-bright-red" />
                  <span>Security & Integrity Protocol</span>
                </div>
                <p>
                  Automatic verification compares your UTR, amount (₹450), and SHA-256 screenshot fingerprint against authoritative settlement records. No manual admin approval is needed once matched.
                </p>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
