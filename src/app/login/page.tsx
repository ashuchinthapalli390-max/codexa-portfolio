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
import { CyberWebOverlay } from "@/components/ui/CyberWebOverlay";
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

// Cyber Radar & HUD Scanner Visual Component
function CyberRadarHUD() {
  return (
    <div className="relative w-full max-w-[340px] aspect-square mx-auto flex items-center justify-center my-6">
      {/* Outer Glow Ring */}
      <div className="absolute inset-0 rounded-full border border-crimson/20 shadow-[0_0_40px_rgba(217,4,41,0.15)] pointer-events-none" />

      {/* Rotating Outer Dashed Calibrator */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="absolute inset-2 rounded-full border border-dashed border-bright-red/30 pointer-events-none motion-reduce:animate-none"
      />

      {/* Middle Grid Ring */}
      <div className="absolute inset-10 rounded-full border border-crimson/30 pointer-events-none" />

      {/* Inner Ring */}
      <div className="absolute inset-20 rounded-full border border-bright-red/40 bg-deep-red/10 pointer-events-none" />

      {/* Crosshairs */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-gradient-to-r from-transparent via-crimson/50 to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-gradient-to-b from-transparent via-crimson/50 to-transparent pointer-events-none" />

      {/* Sweeping Radar Beam */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 rounded-full pointer-events-none motion-reduce:hidden"
        style={{
          background: "conic-gradient(from 0deg at 50% 50%, rgba(255, 30, 60, 0.35) 0deg, rgba(217, 4, 41, 0.05) 60deg, transparent 90deg)",
        }}
      />

      {/* Radar Blips / Target Nodes */}
      <motion.div
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 right-1/4 w-2 h-2 rounded-full bg-bright-red shadow-[0_0_10px_#FF1E3C]"
      />
      <motion.div
        animate={{ opacity: [0.3, 0.9, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-1/3 left-1/4 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#FFFFFF]"
      />

      {/* Center Core Logo */}
      <div className="relative z-10 w-20 h-20 rounded-2xl bg-[#090909] border border-bright-red/60 p-2 flex items-center justify-center shadow-[0_0_30px_rgba(255,30,60,0.35)] overflow-hidden">
        <Image
          src="/logo.jpeg"
          alt="CodeXa Agency Logo"
          width={64}
          height={64}
          className="w-full h-full object-cover rounded-xl"
          priority
        />
      </div>

      {/* Real-time Telemetry Labels */}
      <div className="absolute top-1 left-2 font-mono text-[9px] text-[#666] tracking-widest uppercase">
        TARGET: CXA-GATEWAY
      </div>
      <div className="absolute bottom-1 right-2 font-mono text-[9px] text-bright-red/80 tracking-widest uppercase">
        CIPHER: AES-256-GCM
      </div>
    </div>
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

      const data = await res.json();

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
            "Your account is not authorized for the CodeXa admin console. Please contact the Founder or Super Admin."
          );
        } else {
          setErrorMessage(data.error || "Authentication token validation failed.");
        }
        setGoogleLoading(false);
      }
    } catch (err) {
      console.error("[Session Handshake Error]", err);
      await signOutFirebase().catch(() => {});
      setErrorMessage("Network error establishing secure session with CodeXa server.");
      setLoginState("denied");
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

  return (
    <div className="relative min-h-screen bg-[#050505] text-white flex flex-col justify-between overflow-x-hidden selection:bg-bright-red selection:text-white">
      {/* Background Cyber Grid & Crimson Atmosphere */}
      <CyberWebOverlay />
      <div className="fixed inset-0 bg-cyber-grid pointer-events-none opacity-40 z-0" />
      <div className="fixed top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#8B0000]/15 rounded-full blur-[200px] pointer-events-none" />
      <div className="fixed bottom-10 right-10 w-[500px] h-[500px] bg-[#FF1E3C]/10 rounded-full blur-[180px] pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-20 px-6 py-6 max-w-7xl mx-auto w-full flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-bright-red/60 p-0.5 bg-[#090909] group-hover:border-bright-red group-hover:shadow-[0_0_15px_rgba(255,30,60,0.4)] transition-all duration-300">
            <Image
              src="/logo.jpeg"
              alt="CodeXa Agency"
              width={36}
              height={36}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <div>
            <span className="font-orbitron font-black text-sm tracking-[0.2em] text-white block">
              CODEXA <span className="text-bright-red text-xs font-normal">GATEWAY</span>
            </span>
            <span className="text-[8px] font-mono text-[#666] tracking-widest uppercase block -mt-0.5">
              Secure Access Channel
            </span>
          </div>
        </Link>

        <Link
          href="/"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0E0E0E] hover:bg-[#161616] border border-crimson/20 hover:border-bright-red/50 text-xs font-orbitron text-[#A5A5A5] hover:text-white transition-all uppercase tracking-wider"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-bright-red" /> Back to Site
        </Link>
      </header>

      {/* Main Split Layout Container */}
      <main className="relative z-20 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* ─── LEFT PANEL: BRAND & CYBER RADAR HUD ─────────────────────────── */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, x: -25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="lg:col-span-5 flex flex-col justify-center text-center lg:text-left space-y-6"
          >
            {/* System Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0E0E0E] border border-bright-red/30 w-fit mx-auto lg:mx-0 shadow-[0_0_15px_rgba(217,4,41,0.15)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-mono text-[10px] font-bold tracking-widest text-[#DDD] uppercase">
                SECURE AUTHENTICATION CHANNEL &bull; ACTIVE
              </span>
            </div>

            {/* Brand Title */}
            <div className="space-y-2">
              <h1 className="font-orbitron font-black text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight leading-tight uppercase">
                CODEXA <span className="text-transparent bg-clip-text bg-gradient-to-r from-bright-red via-crimson to-white">AGENCY</span>
              </h1>
              <p className="font-orbitron text-xs sm:text-sm font-semibold text-bright-red tracking-wider uppercase">
                Where Ideas Become Digital Reality
              </p>
              <p className="text-xs font-mono text-[#888] tracking-widest uppercase pt-1">
                Learn &bull; Build &bull; Deploy &bull; Grow
              </p>
            </div>

            {/* Cyber Radar HUD Scanner */}
            <CyberRadarHUD />

            {/* Security Guarantee Badges */}
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto lg:mx-0 pt-2">
              <div className="p-3 rounded-2xl bg-[#090909]/80 border border-crimson/20 flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-bright-red flex-shrink-0" />
                <div className="text-left">
                  <p className="font-orbitron font-bold text-[10px] text-white uppercase">Zero-Trust</p>
                  <p className="font-mono text-[9px] text-[#666]">Identity Bound</p>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[#090909]/80 border border-crimson/20 flex items-center gap-2.5">
                <Cpu className="w-4 h-4 text-bright-red flex-shrink-0" />
                <div className="text-left">
                  <p className="font-orbitron font-bold text-[10px] text-white uppercase">Firebase OAuth</p>
                  <p className="font-mono text-[9px] text-[#666]">Verified Tokens</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* ─── RIGHT PANEL: AUTHENTICATION FORM ────────────────────────────── */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, x: 25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="lg:col-span-7 w-full max-w-lg mx-auto"
          >
            <div className="relative rounded-3xl bg-[#080808]/95 border border-crimson/30 p-6 sm:p-10 backdrop-blur-2xl shadow-[0_0_60px_rgba(217,4,41,0.2)] overflow-hidden">
              
              {/* Corner Cyber Accents */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-bright-red pointer-events-none" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-bright-red pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-bright-red pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-bright-red pointer-events-none" />

              {/* ── STAGE 1: SIGN IN (GOOGLE & CREDENTIALS) ────────────────── */}
              {authStage === "credentials" && (
                <div className="space-y-6">
                  
                  {/* Header Title */}
                  <div className="text-center space-y-1">
                    <span className="text-[9px] font-orbitron font-bold tracking-[0.3em] text-bright-red bg-deep-red/20 px-3 py-1 rounded-full border border-crimson/30 uppercase">
                      COMMAND PORTAL
                    </span>
                    <h2 className="font-orbitron font-black text-2xl sm:text-3xl text-white tracking-wider uppercase pt-2">
                      SIGN IN TO CODEXA
                    </h2>
                    <p className="text-xs text-[#888] font-light">
                      Single Sign-On for authorized founders, executives & team members.
                    </p>
                  </div>

                  {/* Reconnecting Alert Banner if service is temporarily unavailable */}
                  {status === "temporarily-unavailable" && (
                    <div className="p-3 rounded-2xl bg-[#141414] border border-bright-red/40 flex items-center justify-between text-xs text-[#DDD] shadow-[0_0_15px_rgba(217,4,41,0.15)]">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 text-bright-red animate-spin" />
                        <span>
                          {authErrorMsg || "Security Gateway reconnecting..."}
                          {requestId && <span className="font-mono text-[10px] text-[#888] ml-1.5">[{requestId}]</span>}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => retryConnection()}
                        className="px-2.5 py-1 rounded-lg bg-crimson hover:bg-bright-red text-white text-[10px] font-orbitron font-bold uppercase tracking-wider"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {/* Unauthorized Account Alert (Requirement 10) */}
                  {unauthorizedMessage && (
                    <motion.div
                      variants={errorShakeVariants}
                      animate="shake"
                      className="p-4 rounded-2xl bg-deep-red/30 border border-bright-red/70 text-xs text-bright-red space-y-2 shadow-[0_0_20px_rgba(255,30,60,0.2)]"
                    >
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-bright-red" />
                        <div className="space-y-1">
                          <p className="font-orbitron font-bold uppercase tracking-wider text-white text-[11px]">
                            Access Unauthorized
                          </p>
                          <p className="text-[#DDD] leading-relaxed">
                            {unauthorizedMessage}
                          </p>
                        </div>
                      </div>
                      <div className="text-right pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setUnauthorizedMessage("");
                            signOutFirebase().catch(() => {});
                          }}
                          className="text-[10px] font-orbitron text-bright-red hover:underline uppercase font-bold"
                        >
                          Dismiss & Retry
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* General Error Banner */}
                  {errorMessage && (
                    <motion.div
                      variants={errorShakeVariants}
                      animate="shake"
                      className="p-3.5 rounded-xl bg-deep-red/25 border border-bright-red/60 text-xs text-bright-red flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{errorMessage}</span>
                    </motion.div>
                  )}

                  {/* ── GOOGLE SIGN-IN PRIMARY BUTTON (Requirement 8, 9, 11) ──── */}
                  <div className="space-y-3">
                    <motion.button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={googleLoading || loginState === "verifying" || loginState === "success"}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="w-full py-4 px-5 rounded-2xl bg-[#0F0F0F] hover:bg-[#171717] border border-bright-red/50 hover:border-bright-red text-white text-xs sm:text-sm font-orbitron font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_0_25px_rgba(217,4,41,0.25)] hover:shadow-[0_0_35px_rgba(255,30,60,0.4)] disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      {googleLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin text-bright-red" />
                          <span>CONNECTING GOOGLE AUTH...</span>
                        </>
                      ) : (
                        <>
                          <GoogleGIcon className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" />
                          <span className="text-white group-hover:text-bright-red transition-colors">
                            Continue with Google
                          </span>
                        </>
                      )}
                    </motion.button>
                    <p className="text-[10px] font-mono text-[#666] text-center">
                      Founder permanent mapping &bull; ashuchinthapalli3900@gmail.com
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="relative flex items-center justify-center my-6">
                    <div className="absolute inset-x-0 h-[1px] bg-crimson/20" />
                    <button
                      type="button"
                      onClick={() => setShowCredentialsAccordion(!showCredentialsAccordion)}
                      className="relative z-10 px-4 py-1 rounded-full bg-[#080808] border border-crimson/30 text-[9px] font-orbitron text-[#888] hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1.5"
                    >
                      <span>OR USE CREDENTIALS</span>
                      <span className="text-bright-red">{showCredentialsAccordion ? "▲" : "▼"}</span>
                    </button>
                  </div>

                  {/* ── USERNAME/PASSWORD ACCORDION ───────────────────────────── */}
                  <AnimatePresence>
                    {showCredentialsAccordion && (
                      <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        onSubmit={handleCredentialsSubmit}
                        className="space-y-4 pt-1 overflow-hidden"
                      >
                        {/* Identifier */}
                        <div>
                          <label className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-[#999] block mb-2">
                            Username or Email
                          </label>
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#555] group-focus-within:text-bright-red transition-colors">
                              <User className="w-4 h-4" />
                            </div>
                            <input
                              type="text"
                              required
                              value={identifier}
                              onChange={(e) => setIdentifier(e.target.value)}
                              placeholder="e.g. ashu or ashu@codexa.agency"
                              disabled={loginState === "verifying" || loginState === "success"}
                              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#101010] border border-crimson/25 focus:border-bright-red text-white text-xs font-mono placeholder:text-[#444] outline-none transition-all focus:shadow-[0_0_15px_rgba(217,4,41,0.25)]"
                            />
                          </div>
                        </div>

                        {/* Password */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-[#999]">
                              Password
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setAuthStage("forgot-password");
                                setForgotStep("email");
                                setForgotError("");
                              }}
                              className="text-[10px] font-orbitron text-bright-red hover:underline uppercase tracking-wider"
                            >
                              Forgot Password?
                            </button>
                          </div>
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#555] group-focus-within:text-bright-red transition-colors">
                              <Lock className="w-4 h-4" />
                            </div>
                            <input
                              type={showPassword ? "text" : "password"}
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="••••••••••••"
                              disabled={loginState === "verifying" || loginState === "success"}
                              className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#101010] border border-crimson/25 focus:border-bright-red text-white text-xs font-mono placeholder:text-[#444] outline-none transition-all focus:shadow-[0_0_15px_rgba(217,4,41,0.25)]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#555] hover:text-white"
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Submit Button */}
                        <motion.button
                          type="submit"
                          variants={buttonHoverVariants}
                          whileHover="hover"
                          whileTap="tap"
                          disabled={loginState === "verifying" || loginState === "success"}
                          className={`w-full py-3.5 rounded-xl text-xs font-orbitron font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
                            loginState === "verifying"
                              ? "bg-deep-red/60 text-white cursor-wait border border-bright-red/40"
                              : loginState === "success"
                              ? "bg-emerald-600 text-white border border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                              : loginState === "denied"
                              ? "bg-red-700 text-white border border-red-500"
                              : "bg-crimson hover:bg-bright-red text-white border border-bright-red hover:shadow-[0_0_20px_rgba(217,4,41,0.4)]"
                          }`}
                        >
                          {loginState === "verifying" ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                              VERIFYING CREDENTIALS...
                            </>
                          ) : loginState === "success" ? (
                            <>
                              <Check className="w-4 h-4 text-white" />
                              ACCESS AUTHORIZED
                            </>
                          ) : loginState === "denied" ? (
                            "ACCESS DENIED"
                          ) : (
                            "LOGIN WITH CREDENTIALS"
                          )}
                        </motion.button>
                      </motion.form>
                    )}
                  </AnimatePresence>

                </div>
              )}

              {/* ── STAGE 2: TWO-FACTOR AUTHENTICATION ──────────────────────── */}
              {authStage === "2fa" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-1">
                    <span className="text-[9px] font-orbitron font-bold tracking-[0.3em] text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30 uppercase">
                      2-STEP VERIFICATION
                    </span>
                    <h2 className="font-orbitron font-black text-2xl text-white tracking-wider uppercase pt-2">
                      {twoFactorMethod === "totp" ? "Authenticator App" : "Recovery Key"}
                    </h2>
                    <p className="text-xs text-[#888] font-light leading-relaxed">
                      {twoFactorMethod === "totp"
                        ? "Enter the 6-digit verification code generated by your Authenticator app."
                        : "Enter one of your single-use backup recovery keys."}
                    </p>
                  </div>

                  {twoFactorError && (
                    <motion.div
                      variants={errorShakeVariants}
                      animate="shake"
                      className="p-3 rounded-xl bg-deep-red/25 border border-bright-red/60 text-xs text-bright-red flex items-center justify-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{twoFactorError}</span>
                    </motion.div>
                  )}

                  {twoFactorMethod === "totp" ? (
                    <div>
                      <div className="flex justify-between gap-2 sm:gap-3 my-6">
                        {totpDigits.map((digit, idx) => (
                          <div key={idx} className="flex-1">
                            <input
                              ref={(el) => {
                                totpInputRefs.current[idx] = el;
                              }}
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={digit}
                              onChange={(e) => handleTotpChange(idx, e.target.value)}
                              onKeyDown={(e) => handleTotpKeyDown(idx, e)}
                              disabled={twoFactorState === "verifying" || twoFactorState === "success"}
                              className={`w-full h-14 sm:h-16 text-center font-mono text-xl sm:text-2xl font-black rounded-xl bg-[#111] border text-white outline-none transition-all duration-200 ${
                                digit
                                  ? "border-bright-red bg-deep-red/10 shadow-[0_0_15px_rgba(217,4,41,0.3)] text-bright-red"
                                  : "border-crimson/25 focus:border-bright-red"
                              }`}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setTwoFactorMethod("backup");
                            setTwoFactorError("");
                          }}
                          className="text-xs font-orbitron text-[#888] hover:text-bright-red transition-colors uppercase tracking-wider"
                        >
                          Lost authenticator device? <span className="text-bright-red font-bold underline">Use Backup Key</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="my-6 space-y-4">
                      <div>
                        <label className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-[#999] block mb-2">
                          Backup Recovery Key
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#555] group-focus-within:text-bright-red transition-colors">
                            <Key className="w-4 h-4" />
                          </div>
                          <input
                            type="text"
                            value={backupCodeInput}
                            onChange={(e) => setBackupCodeInput(e.target.value.toUpperCase())}
                            placeholder="CXA-XXXX-XXXX"
                            disabled={twoFactorState === "verifying" || twoFactorState === "success"}
                            className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-[#121212] border border-crimson/25 focus:border-bright-red text-white text-sm font-mono tracking-widest placeholder:text-[#555] outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setTwoFactorMethod("totp");
                            setTwoFactorError("");
                          }}
                          className="text-xs font-orbitron text-bright-red hover:underline uppercase tracking-wider"
                        >
                          &larr; Use Authenticator Code Instead
                        </button>
                      </div>
                    </div>
                  )}

                  <motion.button
                    type="button"
                    onClick={() => handleVerify2FA()}
                    variants={buttonHoverVariants}
                    whileHover="hover"
                    whileTap="tap"
                    disabled={twoFactorState === "verifying" || twoFactorState === "success"}
                    className={`w-full py-4 rounded-xl text-xs font-orbitron font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
                      twoFactorState === "verifying"
                        ? "bg-deep-red/60 text-white cursor-wait"
                        : twoFactorState === "success"
                        ? "bg-emerald-600 text-white border border-emerald-400"
                        : "bg-crimson hover:bg-bright-red text-white border border-bright-red hover:shadow-[0_0_20px_rgba(217,4,41,0.4)]"
                    }`}
                  >
                    {twoFactorState === "verifying" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        VERIFYING 2FA CHALLENGE...
                      </>
                    ) : twoFactorState === "success" ? (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        2FA AUTHORIZED
                      </>
                    ) : (
                      "VERIFY & ENTER COMMAND CENTER"
                    )}
                  </motion.button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => { setAuthStage("credentials"); setTwoFactorError(""); }}
                      className="text-[10px] font-orbitron text-[#666] hover:text-white uppercase tracking-wider"
                    >
                      &larr; Back to Sign In
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── STAGE 3: FORGOT PASSWORD ─────────────────────────────────── */}
              {authStage === "forgot-password" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-1">
                    <span className="text-[9px] font-orbitron font-bold tracking-[0.3em] text-bright-red bg-deep-red/20 px-3 py-1 rounded-full border border-crimson/30 uppercase">
                      ACCOUNT RECOVERY
                    </span>
                    <h2 className="font-orbitron font-black text-2xl text-white tracking-wider uppercase pt-2">
                      Reset Credentials
                    </h2>
                    <div className="flex items-center justify-center gap-2 pt-2 text-[9px] font-orbitron uppercase tracking-widest text-[#555]">
                      <span className={forgotStep === "email" ? "text-bright-red font-bold" : "text-[#777]"}>1. Email</span>
                      <span>&bull;</span>
                      <span className={forgotStep === "otp" ? "text-bright-red font-bold" : "text-[#777]"}>2. OTP</span>
                      <span>&bull;</span>
                      <span className={forgotStep === "new-password" ? "text-bright-red font-bold" : "text-[#777]"}>3. Password</span>
                    </div>
                  </div>

                  {forgotError && (
                    <div className="p-3 rounded-xl bg-deep-red/25 border border-bright-red/60 text-xs text-bright-red flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  {/* Step 1: Email */}
                  {forgotStep === "email" && (
                    <form onSubmit={handleForgotSendEmailOtp} className="space-y-5">
                      <p className="text-xs text-[#888] font-light text-center leading-relaxed">
                        Enter your registered email address to dispatch a 6-digit recovery code.
                      </p>
                      <div>
                        <label className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-[#999] block mb-2">
                          Registered Email
                        </label>
                        <input
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="you@codexa.agency"
                          disabled={forgotLoading}
                          className="w-full px-4 py-3 rounded-xl bg-[#121212] border border-crimson/25 focus:border-bright-red text-white text-xs font-mono outline-none transition-all"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={forgotLoading}
                        className="w-full py-4 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg"
                      >
                        {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "DISPATCH RECOVERY CODE"}
                      </button>
                    </form>
                  )}

                  {/* Step 2: OTP */}
                  {forgotStep === "otp" && (
                    <div className="space-y-4">
                      <p className="text-xs text-[#888] font-light text-center leading-relaxed">
                        Enter the 6-digit code dispatched to <strong className="text-white font-mono">{forgotEmail}</strong>.
                      </p>

                      <div className="flex justify-between gap-2 sm:gap-3 my-4">
                        {forgotOtpDigits.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => {
                              forgotOtpRefs.current[idx] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "");
                              const newDigits = [...forgotOtpDigits];
                              newDigits[idx] = val;
                              setForgotOtpDigits(newDigits);
                              if (val && idx < 5) forgotOtpRefs.current[idx + 1]?.focus();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Backspace" && !forgotOtpDigits[idx] && idx > 0) {
                                forgotOtpRefs.current[idx - 1]?.focus();
                              }
                            }}
                            className="flex-1 h-14 text-center font-mono text-xl font-black rounded-xl bg-[#111] border border-crimson/25 focus:border-bright-red text-white outline-none"
                          />
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-xs text-[#777]">
                        <span className="font-mono text-[11px]">⏱️ {formatCountdown(forgotCountdown)}</span>
                        <button
                          type="button"
                          onClick={handleForgotSendEmailOtp}
                          disabled={forgotResendCooldown > 0}
                          className="text-[10px] font-orbitron text-bright-red hover:underline disabled:text-[#555] uppercase font-bold"
                        >
                          {forgotResendCooldown > 0 ? `Resend in ${forgotResendCooldown}s` : "Resend Code"}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleForgotVerifyOtp()}
                        disabled={forgotLoading}
                        className="w-full py-4 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg"
                      >
                        {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "VERIFY CODE"}
                      </button>
                    </div>
                  )}

                  {/* Step 3: New Password */}
                  {forgotStep === "new-password" && (
                    <form onSubmit={handleForgotSubmitNewPassword} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-[#999] block mb-2">
                          New Password (Min 8 Chars)
                        </label>
                        <div className="relative">
                          <input
                            type={showForgotNewPassword ? "text" : "password"}
                            required
                            value={forgotNewPassword}
                            onChange={(e) => setForgotNewPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full pl-4 pr-10 py-3 rounded-xl bg-[#121212] border border-crimson/25 focus:border-bright-red text-white text-xs font-mono outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#555] hover:text-white"
                          >
                            {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-[#999] block mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type={showForgotNewPassword ? "text" : "password"}
                          required
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full px-4 py-3 rounded-xl bg-[#121212] border border-crimson/25 focus:border-bright-red text-white text-xs font-mono outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={forgotLoading}
                        className="w-full py-4 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg"
                      >
                        {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "UPDATE PASSWORD"}
                      </button>
                    </form>
                  )}

                  {/* Step 4: Done */}
                  {forgotStep === "done" && (
                    <div className="text-center space-y-4 py-4">
                      <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                        <Check className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="font-orbitron font-bold text-base text-white uppercase">Password Reset Complete</h3>
                        <p className="text-xs text-[#888] mt-1">
                          You may now log in with your updated credentials.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthStage("credentials");
                          setPassword("");
                        }}
                        className="w-full py-3.5 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-black uppercase tracking-widest shadow-md"
                      >
                        RETURN TO LOGIN
                      </button>
                    </div>
                  )}

                  {forgotStep !== "done" && (
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthStage("credentials");
                          setForgotError("");
                        }}
                        className="text-[10px] font-orbitron text-[#666] hover:text-white uppercase tracking-wider"
                      >
                        &larr; Cancel Recovery & Return
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

            </div>
          </motion.div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 px-6 py-6 text-center text-[11px] text-[#555] font-mono">
        CodeXa Developer Network &bull; Cryptographically Verified Platform &bull; Founder &bull; ashuchinthapalli3900@gmail.com
      </footer>
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
