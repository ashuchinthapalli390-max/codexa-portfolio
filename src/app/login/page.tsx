"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Lock, 
  User, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  RefreshCw,
  X,
  KeyRound,
  Check,
  Smartphone,
  Key,
  ArrowRight,
  Terminal,
  Activity,
  Radio,
  Cpu
} from "lucide-react";
import dynamic from "next/dynamic";
import { OtpInput } from "@/components/auth/OtpInput";
import type { AuthMood } from "@/components/auth/LoginScene";

// WebGL scene is client-only and code-split so the form paints instantly.
const LoginScene = dynamic(() => import("@/components/auth/LoginScene"), { ssr: false });
import { errorShakeVariants, digitPopVariants, modalDialogVariants, buttonHoverVariants } from "@/lib/motion";
import { useAuth } from "@/context/AuthContext";
import { signInWithGoogle, handleRedirectResult, signOutFirebase } from "@/lib/firebase-client";

// Official Google 4-Color Branding SVG
function GoogleGIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams?.get("redirect");
  const { user, status, refreshSession, retryConnection, errorMessage: authErrorMsg, requestId } = useAuth();

  // Stage: "credentials" | "2fa" | "forgot-password"
  const [authStage, setAuthStage] = useState<"credentials" | "2fa" | "forgot-password">("credentials");

  // Google Sign-In state
  const [googleLoading, setGoogleLoading] = useState(false);
  const [unauthorizedMessage, setUnauthorizedMessage] = useState("");

  // Credential Inputs
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showCredentialsAccordion, setShowCredentialsAccordion] = useState(false);
  const [loginState, setLoginState] = useState<"idle" | "verifying" | "success" | "denied">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // 2FA Challenge State
  const [twoFactorMethod, setTwoFactorMethod] = useState<"totp" | "backup">("totp");
  const [twoFactorChallengeId, setTwoFactorChallengeId] = useState("");
  const [twoFactorMaskedEmail, setTwoFactorMaskedEmail] = useState("");
  const [totpDigits, setTotpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [backupCodeInput, setBackupCodeInput] = useState("");
  const [twoFactorState, setTwoFactorState] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [twoFactorError, setTwoFactorError] = useState("");
  const totpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Forgot Password Multi-step Wizard
  const [forgotStep, setForgotStep] = useState<"email" | "otp" | "2fa" | "new-password" | "done">("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtpDigits, setForgotOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [forgotChallengeId, setForgotChallengeId] = useState("");
  const [forgotResetToken, setForgotResetToken] = useState("");
  const [forgotTotpDigits, setForgotTotpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [forgotBackupCode, setForgotBackupCode] = useState("");
  const [forgot2FaMethod, setForgot2FaMethod] = useState<"totp" | "backup">("totp");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotCountdown, setForgotCountdown] = useState(300);
  const [forgotResendCooldown, setForgotResendCooldown] = useState(0);
  const forgotOtpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const forgotTotpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Check if user is returning from a signInWithRedirect flow
  useEffect(() => {
    handleRedirectResult()
      .then(async (result) => {
        if (result?.idToken) {
          setGoogleLoading(true);
          await processFirebaseToken(result.idToken);
        }
      })
      .catch((err) => {
        console.warn("[Firebase Redirect Error]", err);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Forgot Password Countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (authStage === "forgot-password" && forgotStep === "otp" && forgotCountdown > 0) {
      interval = setInterval(() => setForgotCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [authStage, forgotStep, forgotCountdown]);

  // Resend cooldown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (forgotResendCooldown > 0) {
      interval = setInterval(() => setForgotResendCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [forgotResendCooldown]);

  // Check if session already exists
  useEffect(() => {
    if (status === "authenticated" && user) {
      const safeRedirect =
        redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
          ? redirectParam
          : user.role === "OWNER"
          ? "/owner"
          : "/dashboard";

      const timer = setTimeout(() => {
        router.replace(safeRedirect);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [status, user, redirectParam, router]);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // ── Google Sign-In Flow with Firebase ───────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMessage("");
    setUnauthorizedMessage("");
    setLoginState("idle");

    try {
      const { idToken } = await signInWithGoogle();
      await processFirebaseToken(idToken);
    } catch (err: any) {
      if (err.message === "REDIRECT_INITIATED") {
        // Redirect triggered, browser navigates away
        return;
      }
      console.error("[Google Sign-In Error]", err);
      if (err.code === "auth/popup-closed-by-user") {
        setErrorMessage("Google authentication was cancelled.");
      } else {
        setErrorMessage(err.message || "Failed to authenticate via Google.");
      }
      setGoogleLoading(false);
    }
  };

  const processFirebaseToken = async (idToken: string) => {
    try {
      const res = await fetch("/api/auth/firebase-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      let data: any;
      try {
        data = await res.json();
      } catch {
        await signOutFirebase().catch(() => {});
        setErrorMessage("Server communication error during session handshake. Please try again or sign in with credentials below.");
        setLoginState("idle");
        setGoogleLoading(false);
        return;
      }

      if (res.ok && data.success && data.authorized) {
        await refreshSession();
        setLoginState("success");
        const safeRedirect =
          redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
            ? redirectParam
            : data.redirectUrl || (data.user?.role === "OWNER" ? "/owner" : "/dashboard");

        setTimeout(() => {
          router.replace(safeRedirect);
        }, 500);
      } else {
        // Sign out client-side Firebase session so bad auth is purged
        await signOutFirebase().catch(() => {});
        setLoginState("denied");

        if (res.status === 403 || !data.authorized) {
          setUnauthorizedMessage(
            data.error ||
            "Authentication failed. Please check your account or contact the Founder."
          );
        } else {
          setErrorMessage(data.error || "Authentication token validation failed.");
        }
        setGoogleLoading(false);
      }
    } catch (err) {
      console.error("[Session Handshake Error]", err);
      await signOutFirebase().catch(() => {});
      setErrorMessage("Network error establishing secure session with CodeXa server. Please try again or sign in with credentials below.");
      setLoginState("idle");
      setGoogleLoading(false);
    }
  };

  // ── Stage 1: Verify Credentials ───────────────────────────────────────────
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;

    setLoginState("verifying");
    setErrorMessage("");
    setUnauthorizedMessage("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.requiresTwoFactor) {
          setLoginState("idle");
          setTwoFactorChallengeId(data.challengeId);
          setTwoFactorMaskedEmail(data.maskedEmail || "");
          setTotpDigits(["", "", "", "", "", ""]);
          setTwoFactorError("");
          setAuthStage("2fa");
        } else {
          await refreshSession();
          setLoginState("success");
          const safeRedirect =
            redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
              ? redirectParam
              : data.redirectUrl || (data.user?.role === "OWNER" ? "/owner" : "/dashboard");

          setTimeout(() => {
            router.replace(safeRedirect);
          }, 500);
        }
      } else {
        setLoginState("denied");
        setErrorMessage(data.error || "Access Denied. Invalid credentials.");
      }
    } catch {
      setLoginState("denied");
      setErrorMessage("Network error connecting to CodeXa Security Gateway.");
    }
  };

  // ── Stage 2: 2FA Verification (TOTP or Backup Code) ───────────────────────
  const handleTotpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, "").slice(0, 6);
      if (pasted.length > 0) {
        const newDigits = [...totpDigits];
        for (let i = 0; i < 6; i++) {
          newDigits[i] = pasted[i] || "";
        }
        setTotpDigits(newDigits);
        const nextFocus = Math.min(pasted.length, 5);
        totpInputRefs.current[nextFocus]?.focus();
      }
      return;
    }

    const digit = value.replace(/\D/g, "");
    const newDigits = [...totpDigits];
    newDigits[index] = digit;
    setTotpDigits(newDigits);
    setTwoFactorError("");

    if (digit && index < 5) {
      totpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleTotpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !totpDigits[index] && index > 0) {
      totpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify2FA = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setTwoFactorState("verifying");
    setTwoFactorError("");

    const payload: any = { challengeId: twoFactorChallengeId };

    if (twoFactorMethod === "totp") {
      const fullOtp = totpDigits.join("");
      if (fullOtp.length !== 6) {
        setTwoFactorState("error");
        setTwoFactorError("Please enter the complete 6-digit authenticator code.");
        return;
      }
      payload.totpCode = fullOtp;
    } else {
      if (!backupCodeInput.trim()) {
        setTwoFactorState("error");
        setTwoFactorError("Please enter a valid backup code.");
        return;
      }
      payload.backupCode = backupCodeInput.trim();
    }

    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        await refreshSession();
        setTwoFactorState("success");
        const safeRedirect =
          redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
            ? redirectParam
            : data.redirectUrl || (data.user?.role === "OWNER" ? "/owner" : "/dashboard");

        setTimeout(() => {
          router.replace(safeRedirect);
        }, 500);
      } else {
        setTwoFactorState("error");
        setTwoFactorError(data.error || "Verification failed.");
      }
    } catch {
      setTwoFactorState("error");
      setTwoFactorError("Network error during verification.");
    }
  };

  // ── Stage 3: Forgot Password Handlers ─────────────────────────────────────
  const handleForgotSendEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setForgotError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setForgotStep("otp");
        setForgotCountdown(300);
        setForgotResendCooldown(60);
      } else {
        setForgotError(data.error || "Failed to dispatch recovery code.");
      }
    } catch {
      setForgotError("Network error.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = forgotOtpDigits.join("");
    if (fullOtp.length !== 6) {
      setForgotError("Please enter the complete 6-digit code.");
      return;
    }

    setForgotLoading(true);
    setForgotError("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail,
          otp: fullOtp,
          purpose: "PASSWORD_RESET",
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.requiresTwoFactor) {
          setForgotChallengeId(data.challengeId);
          setForgotStep("2fa");
        } else {
          setForgotResetToken(data.resetToken);
          setForgotStep("new-password");
        }
      } else {
        setForgotError(data.error || "Invalid or expired recovery code.");
      }
    } catch {
      setForgotError("Network error.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotSubmitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotNewPassword || forgotNewPassword.length < 8) {
      setForgotError("Password must be at least 8 characters long.");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Passwords do not match.");
      return;
    }

    setForgotLoading(true);
    setForgotError("");

    const payload: any = {
      newPassword: forgotNewPassword,
    };

    if (forgotResetToken) {
      payload.resetToken = forgotResetToken;
    } else if (forgotChallengeId) {
      payload.challengeId = forgotChallengeId;
      if (forgot2FaMethod === "totp") {
        payload.totpCode = forgotTotpDigits.join("");
      } else {
        payload.backupCode = forgotBackupCode.trim();
      }
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setForgotStep("done");
      } else {
        setForgotError(data.error || "Failed to reset password.");
      }
    } catch {
      setForgotError("Network error.");
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Auto-submit once all 6 digits are entered ──────────────────────────────
  useEffect(() => {
    if (authStage === "2fa" && twoFactorMethod === "totp" && twoFactorState === "idle" && totpDigits.every((d) => d)) {
      handleVerify2FA();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totpDigits]);

  useEffect(() => {
    if (authStage === "forgot-password" && forgotStep === "otp" && !forgotLoading && !forgotError && forgotOtpDigits.every((d) => d)) {
      handleForgotVerifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forgotOtpDigits]);

  // ── 3D scene mood follows the auth state ───────────────────────────────────
  const mood: AuthMood =
    loginState === "success" || twoFactorState === "success" || status === "authenticated"
      ? "success"
      : loginState === "verifying" || googleLoading || twoFactorState === "verifying" || forgotLoading
      ? "verifying"
      : loginState === "denied" || twoFactorState === "error" || !!unauthorizedMessage || !!errorMessage || !!forgotError
      ? "error"
      : "idle";

  const moodLine = {
    idle: "Awaiting identity",
    verifying: "Verifying secure session…",
    success: "Access granted — opening workspace",
    error: "Verification failed — try again",
  }[mood];

  const stageIndex = authStage === "credentials" ? 0 : authStage === "2fa" ? 1 : 0;
  const forgotSteps = forgotChallengeId
    ? (["email", "otp", "2fa", "new-password"] as const)
    : (["email", "otp", "new-password"] as const);
  const forgotLabels: Record<string, string> = { email: "Email", otp: "Code", "2fa": "2-step", "new-password": "Password" };
  const forgotIdx = forgotStep === "done" ? forgotSteps.length : (forgotSteps as readonly string[]).indexOf(forgotStep);

  const inputCls =
    "w-full rounded-2xl bg-white/[0.03] border border-white/10 focus:border-bright-red focus:shadow-[0_0_0_4px_rgba(217,4,41,0.15)] text-white text-sm placeholder:text-white/25 outline-none transition-all disabled:opacity-60";
  const labelCls = "block mb-2 text-xs font-semibold text-white/60";
  const primaryBtn =
    "relative w-full overflow-hidden py-3.5 rounded-2xl text-sm font-semibold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 disabled:cursor-not-allowed";
  const flip = {
    initial: { opacity: 0, rotateY: -25, x: 40, filter: "blur(6px)" },
    animate: { opacity: 1, rotateY: 0, x: 0, filter: "blur(0px)" },
    exit: { opacity: 0, rotateY: 25, x: -40, filter: "blur(6px)" },
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  };

  return (
    <div className="relative min-h-screen bg-[#050505] text-white overflow-x-hidden selection:bg-bright-red selection:text-white">
      <div className="grid lg:min-h-screen lg:grid-cols-[1.15fr_1fr]">
        {/* ═══ LEFT: interactive 3D security core ═══ */}
        <section className="relative h-[38vh] min-h-[280px] lg:h-auto overflow-hidden border-b lg:border-b-0 lg:border-r border-white/[0.06]">
          <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_50%,rgba(217,4,41,0.18),transparent_70%)]" />
          <div className="absolute inset-0">
            <LoginScene mood={mood} />
          </div>
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/40" />

          {/* brand bar */}
          <div className="absolute top-0 inset-x-0 p-5 sm:p-8 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <Image src="/logo.jpeg" alt="CodeXa Agency" width={36} height={36} className="w-9 h-9 rounded-xl object-cover ring-1 ring-white/10 group-hover:ring-bright-red/60 transition" />
              <span className="font-orbitron font-black text-sm tracking-[0.18em]">
                CODEXA<span className="text-bright-red">.</span>
              </span>
            </Link>
            <Link href="/" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-white/10 bg-black/30 backdrop-blur-md text-xs text-white/70 hover:text-white hover:border-white/30 transition">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to site
            </Link>
          </div>

          {/* headline (desktop) */}
          <div className="hidden lg:block absolute bottom-0 inset-x-0 p-10 xl:p-14">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-black/40 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${mood === "error" ? "bg-bright-red" : mood === "success" ? "bg-emerald-400" : mood === "verifying" ? "bg-amber-300" : "bg-emerald-400"}`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${mood === "error" ? "bg-bright-red" : mood === "verifying" ? "bg-amber-300" : "bg-emerald-500"}`} />
                </span>
                <AnimatePresence mode="wait">
                  <motion.span key={moodLine} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/80">
                    {moodLine}
                  </motion.span>
                </AnimatePresence>
              </div>
              <h1 className="mt-6 font-orbitron font-black uppercase text-4xl xl:text-5xl leading-[0.95] tracking-tight">
                Secure access to <br />
                <span className="text-transparent [-webkit-text-stroke:1.5px_#FF1E3C]">your workspace</span>
              </h1>
              <p className="mt-4 max-w-md text-white/55">One CodeXa account for the web portal, mobile app and AI desktop — protected by verified sessions and 2-step verification.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  { i: Shield, t: "Zero-trust sessions" },
                  { i: KeyRound, t: "2-step verification" },
                  { i: Cpu, t: "Google SSO" },
                ].map((c) => (
                  <span key={c.t} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-xs text-white/70">
                    <c.i className="w-3.5 h-3.5 text-bright-red" /> {c.t}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ═══ RIGHT: authentication card ═══ */}
        <section className="relative flex items-start lg:items-center justify-center px-4 sm:px-8 pt-2 pb-12 lg:py-16">
          <div className="w-full max-w-[440px]">
            {/* progress stepper */}
            {authStage !== "forgot-password" && (
              <ol className="mb-8 flex items-center gap-2" aria-label="Sign-in progress">
                {["Sign in", "Verify", "Workspace"].map((s, i) => {
                  const done = i < stageIndex || mood === "success";
                  const on = i === stageIndex && mood !== "success";
                  return (
                    <li key={s} className="flex-1 flex items-center gap-2">
                      <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold transition-colors ${done ? "bg-emerald-500 text-white" : on ? "bg-crimson text-white shadow-[0_0_14px_rgba(217,4,41,0.6)]" : "bg-white/[0.06] text-white/40"}`}>
                        {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                      </span>
                      <span className={`text-xs ${on ? "text-white" : "text-white/40"}`}>{s}</span>
                      {i < 2 && <span className={`flex-1 h-px ${done ? "bg-emerald-500/60" : "bg-white/10"}`} />}
                    </li>
                  );
                })}
              </ol>
            )}

            <div style={{ perspective: 1400 }}>
              <AnimatePresence mode="wait">
                {/* ── STAGE 1: SIGN IN ── */}
                {authStage === "credentials" && (
                  <motion.div key="credentials" {...flip} className="space-y-6">
                    <div>
                      <h2 className="font-orbitron font-black text-2xl sm:text-3xl tracking-tight">Welcome back</h2>
                      <p className="mt-2 text-sm text-white/50">Sign in to the CodeXa workspace — leadership, team members and interns.</p>
                    </div>

                    {status === "temporarily-unavailable" && (
                      <div className="p-3 rounded-2xl bg-white/[0.03] border border-amber-400/30 flex items-center justify-between gap-3 text-xs text-white/80">
                        <span className="flex items-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                          {authErrorMsg || "Security gateway reconnecting…"}
                          {requestId && <span className="font-mono text-[10px] text-white/40">[{requestId}]</span>}
                        </span>
                        <button type="button" onClick={() => retryConnection()} className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold">
                          Retry
                        </button>
                      </div>
                    )}

                    <AnimatePresence>
                      {unauthorizedMessage && (
                        <motion.div variants={errorShakeVariants} animate="shake" initial={{ opacity: 0 }} exit={{ opacity: 0 }} className="p-4 rounded-2xl bg-crimson/10 border border-bright-red/50 text-sm">
                          <div className="flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 mt-0.5 text-bright-red shrink-0" />
                            <div>
                              <p className="font-semibold text-white">Access not authorized</p>
                              <p className="mt-1 text-white/70 text-xs leading-relaxed">{unauthorizedMessage}</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setUnauthorizedMessage("");
                                  signOutFirebase().catch(() => {});
                                }}
                                className="mt-2 text-xs font-semibold text-bright-red hover:text-white"
                              >
                                Dismiss & try again
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                      {errorMessage && (
                        <motion.div variants={errorShakeVariants} animate="shake" initial={{ opacity: 0 }} exit={{ opacity: 0 }} className="p-3.5 rounded-2xl bg-crimson/10 border border-bright-red/50 text-xs text-white/85 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-bright-red shrink-0" />
                          <span>{errorMessage}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Google */}
                    <motion.button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={googleLoading || loginState === "verifying" || loginState === "success"}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="group relative w-full overflow-hidden py-3.5 px-5 rounded-2xl bg-white text-[#111] text-sm font-semibold flex items-center justify-center gap-3 shadow-[0_10px_40px_-12px_rgba(255,255,255,0.35)] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/10 to-transparent group-hover:translate-x-full transition-transform duration-700" />
                      {googleLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin text-crimson" /> Connecting to Google…
                        </>
                      ) : (
                        <>
                          <GoogleGIcon className="w-5 h-5" /> Continue with Google
                        </>
                      )}
                    </motion.button>

                    {/* divider / credentials toggle */}
                    <div className="relative flex items-center justify-center">
                      <div className="absolute inset-x-0 h-px bg-white/10" />
                      <button
                        type="button"
                        onClick={() => setShowCredentialsAccordion(!showCredentialsAccordion)}
                        className="relative px-4 py-1.5 rounded-full bg-[#050505] border border-white/10 text-xs text-white/55 hover:text-white transition flex items-center gap-1.5"
                        aria-expanded={showCredentialsAccordion}
                      >
                        or use username & password
                        <motion.span animate={{ rotate: showCredentialsAccordion ? 180 : 0 }} className="text-bright-red">▾</motion.span>
                      </button>
                    </div>

                    <AnimatePresence initial={false}>
                      {showCredentialsAccordion && (
                        <motion.form
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                          onSubmit={handleCredentialsSubmit}
                          className="space-y-4 overflow-hidden"
                        >
                          <div className="pt-1">
                            <label htmlFor="cx-identifier" className={labelCls}>Username or email</label>
                            <div className="relative group">
                              <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-bright-red transition-colors" />
                              <input
                                id="cx-identifier"
                                type="text"
                                required
                                autoComplete="username"
                                value={identifier}
                                onChange={(e) => {
                                  setIdentifier(e.target.value);
                                  if (loginState === "denied") setLoginState("idle");
                                  if (errorMessage) setErrorMessage("");
                                }}
                                placeholder="e.g. ashu or ashu@codexa.agency"
                                disabled={loginState === "verifying" || loginState === "success"}
                                className={`${inputCls} pl-11 pr-4 py-3.5`}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label htmlFor="cx-password" className="text-xs font-semibold text-white/60">Password</label>
                              <button
                                type="button"
                                onClick={() => {
                                  setAuthStage("forgot-password");
                                  setForgotStep("email");
                                  setForgotError("");
                                }}
                                className="text-xs text-bright-red hover:text-white"
                              >
                                Forgot password?
                              </button>
                            </div>
                            <div className="relative group">
                              <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-bright-red transition-colors" />
                              <input
                                id="cx-password"
                                type={showPassword ? "text" : "password"}
                                required
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => {
                                  setPassword(e.target.value);
                                  if (loginState === "denied") setLoginState("idle");
                                  if (errorMessage) setErrorMessage("");
                                }}
                                placeholder="••••••••••"
                                disabled={loginState === "verifying" || loginState === "success"}
                                className={`${inputCls} pl-11 pr-11 py-3.5`}
                              />
                              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white" aria-label={showPassword ? "Hide password" : "Show password"}>
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <motion.button
                            type="submit"
                            whileTap={{ scale: 0.98 }}
                            disabled={loginState === "verifying" || loginState === "success"}
                            className={`${primaryBtn} ${
                              loginState === "success"
                                ? "bg-emerald-600 text-white shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                                : loginState === "denied"
                                ? "bg-red-700 text-white"
                                : "bg-crimson hover:bg-bright-red text-white shadow-[0_10px_40px_-12px_rgba(217,4,41,0.7)]"
                            }`}
                          >
                            {loginState === "verifying" && <motion.span className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent" animate={{ x: ["-150%", "350%"] }} transition={{ duration: 1, repeat: Infinity }} />}
                            {loginState === "verifying" ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
                              </>
                            ) : loginState === "success" ? (
                              <>
                                <Check className="w-4 h-4" /> Access granted
                              </>
                            ) : loginState === "denied" ? (
                              "Access denied — try again"
                            ) : (
                              <>
                                Sign in <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </motion.button>
                        </motion.form>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* ── STAGE 2: TWO-FACTOR ── */}
                {authStage === "2fa" && (
                  <motion.div key="2fa" {...flip} className="space-y-6">
                    <div className="text-center">
                      <motion.div
                        initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 220, damping: 14 }}
                        className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center border ${twoFactorState === "success" ? "bg-emerald-500/15 border-emerald-400" : "bg-crimson/15 border-bright-red/50"}`}
                      >
                        {twoFactorState === "success" ? <Check className="w-7 h-7 text-emerald-300" /> : twoFactorMethod === "totp" ? <Smartphone className="w-7 h-7 text-bright-red" /> : <Key className="w-7 h-7 text-bright-red" />}
                      </motion.div>
                      <h2 className="mt-5 font-orbitron font-black text-2xl tracking-tight">{twoFactorMethod === "totp" ? "Enter your code" : "Use a backup key"}</h2>
                      <p className="mt-2 text-sm text-white/50 leading-relaxed">
                        {twoFactorMethod === "totp" ? "Open your authenticator app and enter the 6-digit code." : "Enter one of your single-use recovery keys."}
                        {twoFactorMaskedEmail && <span className="block mt-1 font-mono text-xs text-white/40">{twoFactorMaskedEmail}</span>}
                      </p>
                    </div>

                    <AnimatePresence>
                      {twoFactorError && (
                        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-3 rounded-2xl bg-crimson/10 border border-bright-red/50 text-xs text-white/85 flex items-center justify-center gap-2">
                          <AlertCircle className="w-4 h-4 text-bright-red" /> {twoFactorError}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {twoFactorMethod === "totp" ? (
                      <OtpInput
                        value={totpDigits}
                        onChange={(d) => {
                          setTotpDigits(d);
                          if (twoFactorState === "error") setTwoFactorState("idle");
                          if (twoFactorError) setTwoFactorError("");
                        }}
                        status={twoFactorState}
                        label="Authenticator code"
                      />
                    ) : (
                      <div>
                        <label htmlFor="cx-backup" className={labelCls}>Backup recovery key</label>
                        <div className="relative group">
                          <Key className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-bright-red" />
                          <input
                            id="cx-backup"
                            type="text"
                            value={backupCodeInput}
                            onChange={(e) => setBackupCodeInput(e.target.value.toUpperCase())}
                            placeholder="CXA-XXXX-XXXX"
                            disabled={twoFactorState === "verifying" || twoFactorState === "success"}
                            className={`${inputCls} pl-11 pr-4 py-3.5 font-mono tracking-widest`}
                          />
                        </div>
                      </div>
                    )}

                    <motion.button
                      type="button"
                      onClick={() => handleVerify2FA()}
                      whileTap={{ scale: 0.98 }}
                      disabled={twoFactorState === "verifying" || twoFactorState === "success"}
                      className={`${primaryBtn} ${twoFactorState === "success" ? "bg-emerald-600 text-white" : "bg-crimson hover:bg-bright-red text-white shadow-[0_10px_40px_-12px_rgba(217,4,41,0.7)]"}`}
                    >
                      {twoFactorState === "verifying" ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Verifying code…
                        </>
                      ) : twoFactorState === "success" ? (
                        <>
                          <Check className="w-4 h-4" /> Verified — opening workspace
                        </>
                      ) : (
                        <>
                          Verify & continue <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </motion.button>

                    <div className="flex items-center justify-between text-xs">
                      <button type="button" onClick={() => { setAuthStage("credentials"); setTwoFactorError(""); setTwoFactorState("idle"); }} className="inline-flex items-center gap-1 text-white/50 hover:text-white">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTwoFactorMethod(twoFactorMethod === "totp" ? "backup" : "totp");
                          setTwoFactorError("");
                          setTwoFactorState("idle");
                        }}
                        className="text-bright-red hover:text-white"
                      >
                        {twoFactorMethod === "totp" ? "Lost your device? Use a backup key" : "Use authenticator code instead"}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── STAGE 3: FORGOT PASSWORD ── */}
                {authStage === "forgot-password" && (
                  <motion.div key="forgot" {...flip} className="space-y-6">
                    <div>
                      <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-bright-red">Account recovery</span>
                      <h2 className="mt-2 font-orbitron font-black text-2xl tracking-tight">Reset your password</h2>
                    </div>

                    {/* recovery stepper */}
                    <ol className="flex items-center gap-2">
                      {forgotSteps.map((s, i) => {
                        const done = i < forgotIdx;
                        const on = i === forgotIdx;
                        return (
                          <li key={s} className="flex-1 flex flex-col gap-1.5">
                            <span className="h-1 rounded-full bg-white/10 overflow-hidden">
                              <motion.span className="block h-full bg-bright-red" initial={false} animate={{ width: done ? "100%" : on ? "50%" : "0%" }} transition={{ duration: 0.5 }} />
                            </span>
                            <span className={`text-[11px] ${on ? "text-white" : done ? "text-white/60" : "text-white/30"}`}>{forgotLabels[s]}</span>
                          </li>
                        );
                      })}
                    </ol>

                    <AnimatePresence>
                      {forgotError && (
                        <motion.div variants={errorShakeVariants} animate="shake" initial={{ opacity: 0 }} exit={{ opacity: 0 }} className="p-3 rounded-2xl bg-crimson/10 border border-bright-red/50 text-xs text-white/85 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-bright-red shrink-0" /> {forgotError}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence mode="wait">
                      {forgotStep === "email" && (
                        <motion.form key="f-email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleForgotSendEmailOtp} className="space-y-4">
                          <p className="text-sm text-white/50">Enter your registered email and we&apos;ll send a 6-digit recovery code.</p>
                          <div>
                            <label htmlFor="cx-forgot-email" className={labelCls}>Registered email</label>
                            <input id="cx-forgot-email" type="email" required autoComplete="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@codexa.agency" disabled={forgotLoading} className={`${inputCls} px-4 py-3.5`} />
                          </div>
                          <button type="submit" disabled={forgotLoading} className={`${primaryBtn} bg-crimson hover:bg-bright-red text-white`}>
                            {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send recovery code <ArrowRight className="w-4 h-4" /></>}
                          </button>
                        </motion.form>
                      )}

                      {forgotStep === "otp" && (
                        <motion.div key="f-otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                          <p className="text-sm text-white/50">
                            Code sent to <strong className="text-white font-mono">{forgotEmail}</strong>
                          </p>
                          <OtpInput
                            value={forgotOtpDigits}
                            onChange={(d) => {
                              setForgotOtpDigits(d);
                              if (forgotError) setForgotError("");
                            }}
                            status={forgotLoading ? "verifying" : forgotError ? "error" : "idle"}
                            label="Recovery code"
                          />
                          <div className="flex items-center justify-between text-xs">
                            <span className={`font-mono ${forgotCountdown < 60 ? "text-amber-300" : "text-white/50"}`}>Expires in {formatCountdown(forgotCountdown)}</span>
                            <button type="button" onClick={handleForgotSendEmailOtp} disabled={forgotResendCooldown > 0 || forgotLoading} className="font-semibold text-bright-red hover:text-white disabled:text-white/30">
                              {forgotResendCooldown > 0 ? `Resend in ${forgotResendCooldown}s` : "Resend code"}
                            </button>
                          </div>
                          <button type="button" onClick={() => handleForgotVerifyOtp()} disabled={forgotLoading} className={`${primaryBtn} bg-crimson hover:bg-bright-red text-white`}>
                            {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify code"}
                          </button>
                        </motion.div>
                      )}

                      {forgotStep === "2fa" && (
                        <motion.div key="f-2fa" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                          <p className="text-sm text-white/50">This account uses 2-step verification. Confirm with your authenticator code or a backup key to continue.</p>
                          {forgot2FaMethod === "totp" ? (
                            <OtpInput value={forgotTotpDigits} onChange={(d) => { setForgotTotpDigits(d); if (forgotError) setForgotError(""); }} label="Authenticator code" />
                          ) : (
                            <input type="text" value={forgotBackupCode} onChange={(e) => setForgotBackupCode(e.target.value.toUpperCase())} placeholder="CXA-XXXX-XXXX" className={`${inputCls} px-4 py-3.5 font-mono tracking-widest`} aria-label="Backup recovery key" />
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const ok = forgot2FaMethod === "totp" ? forgotTotpDigits.every((d) => d) : !!forgotBackupCode.trim();
                              if (!ok) {
                                setForgotError(forgot2FaMethod === "totp" ? "Enter the complete 6-digit code." : "Enter a backup key.");
                                return;
                              }
                              setForgotError("");
                              setForgotStep("new-password");
                            }}
                            className={`${primaryBtn} bg-crimson hover:bg-bright-red text-white`}
                          >
                            Continue <ArrowRight className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => setForgot2FaMethod(forgot2FaMethod === "totp" ? "backup" : "totp")} className="w-full text-xs text-bright-red hover:text-white">
                            {forgot2FaMethod === "totp" ? "Use a backup key instead" : "Use authenticator code instead"}
                          </button>
                        </motion.div>
                      )}

                      {forgotStep === "new-password" && (
                        <motion.form key="f-pass" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleForgotSubmitNewPassword} className="space-y-4">
                          <div>
                            <label htmlFor="cx-new-pass" className={labelCls}>New password (min 8 characters)</label>
                            <div className="relative">
                              <input id="cx-new-pass" type={showForgotNewPassword ? "text" : "password"} required autoComplete="new-password" value={forgotNewPassword} onChange={(e) => setForgotNewPassword(e.target.value)} placeholder="••••••••••" className={`${inputCls} pl-4 pr-11 py-3.5`} />
                              <button type="button" onClick={() => setShowForgotNewPassword(!showForgotNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white" aria-label={showForgotNewPassword ? "Hide password" : "Show password"}>
                                {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            {/* strength meter */}
                            <div className="mt-2 grid grid-cols-4 gap-1">
                              {[8, 10, 12, 14].map((n, i) => (
                                <span key={n} className={`h-1 rounded-full transition-colors ${forgotNewPassword.length >= n ? (i < 1 ? "bg-amber-400" : "bg-emerald-400") : "bg-white/10"}`} />
                              ))}
                            </div>
                          </div>
                          <div>
                            <label htmlFor="cx-confirm-pass" className={labelCls}>Confirm new password</label>
                            <input id="cx-confirm-pass" type={showForgotNewPassword ? "text" : "password"} required autoComplete="new-password" value={forgotConfirmPassword} onChange={(e) => setForgotConfirmPassword(e.target.value)} placeholder="••••••••••" className={`${inputCls} px-4 py-3.5 ${forgotConfirmPassword && forgotConfirmPassword !== forgotNewPassword ? "!border-bright-red" : ""}`} />
                          </div>
                          <button type="submit" disabled={forgotLoading} className={`${primaryBtn} bg-crimson hover:bg-bright-red text-white`}>
                            {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update password"}
                          </button>
                        </motion.form>
                      )}

                      {forgotStep === "done" && (
                        <motion.div key="f-done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4 space-y-4">
                          <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 14 }} className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-400 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.35)]">
                            <Check className="w-8 h-8 text-emerald-300" />
                          </motion.div>
                          <div>
                            <h3 className="font-semibold text-lg">Password updated</h3>
                            <p className="mt-1 text-sm text-white/50">You can now sign in with your new password.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAuthStage("credentials");
                              setShowCredentialsAccordion(true);
                              setPassword("");
                            }}
                            className={`${primaryBtn} bg-crimson hover:bg-bright-red text-white`}
                          >
                            Back to sign in
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {forgotStep !== "done" && (
                      <button type="button" onClick={() => { setAuthStage("credentials"); setForgotError(""); }} className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white">
                        <ArrowLeft className="w-3.5 h-3.5" /> Cancel and return to sign in
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <p className="mt-10 text-center text-xs text-white/30">
              Protected by encrypted sessions · <Link href="/payment-policy" className="hover:text-white/60">Policies</Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-bright-red animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
