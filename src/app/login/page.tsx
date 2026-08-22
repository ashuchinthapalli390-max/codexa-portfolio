"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
  ArrowRight
} from "lucide-react";
import { CyberWebOverlay } from "@/components/ui/CyberWebOverlay";
import { errorShakeVariants, digitPopVariants, modalDialogVariants, buttonHoverVariants } from "@/lib/motion";
import { useAuth } from "@/context/AuthContext";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams?.get("redirect");
  const { user, status, refreshSession } = useAuth();

  // Stage: "credentials" | "2fa" | "forgot-password"
  const [authStage, setAuthStage] = useState<"credentials" | "2fa" | "forgot-password">("credentials");

  // Credential Inputs
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  // ── Stage 1: Verify Credentials ───────────────────────────────────────────
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;

    setLoginState("verifying");
    setErrorMessage("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.requiresTwoFactor) {
          // 2FA is ON -> Transition to 2FA stage
          setLoginState("idle");
          setTwoFactorChallengeId(data.challengeId);
          setTwoFactorMaskedEmail(data.maskedEmail || "");
          setTotpDigits(["", "", "", "", "", ""]);
          setTwoFactorError("");
          setAuthStage("2fa");
        } else {
          // 2FA is OFF -> Instant Access!
          await refreshSession();
          setLoginState("success");
          const safeRedirect =
            redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
              ? redirectParam
              : data.redirectUrl || (data.user?.role === "OWNER" ? "/owner" : "/dashboard");

          setTimeout(() => {
            router.replace(safeRedirect);
          }, 600);
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
        }, 600);
      } else {
        setTwoFactorState("error");
        setTwoFactorError(data.error || "Verification failed.");
      }
    } catch {
      setTwoFactorState("error");
      setTwoFactorError("Network error during verification.");
    }
  };

  // ── Forgot Password Wizard Handlers ───────────────────────────────────────
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

  if (status === "authenticated" && user) {
    return (
      <div className="relative min-h-screen bg-[#070707] text-white flex flex-col justify-between overflow-hidden">
        <CyberWebOverlay />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-crimson/8 rounded-full blur-[160px] pointer-events-none" />

        <header className="relative z-20 px-6 py-6 max-w-7xl mx-auto w-full flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded bg-deep-red/30 border border-crimson/30 group-hover:border-bright-red/50 transition-all duration-300">
              <Shield className="w-5 h-5 text-bright-red" />
            </div>
            <span className="font-orbitron font-black text-sm tracking-[0.2em] text-white">
              CODEXA <span className="text-crimson text-xs font-normal">GATEWAY</span>
            </span>
          </Link>
        </header>

        <main className="relative z-20 flex items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-[#090909]/95 border border-bright-red/50 shadow-[0_0_50px_rgba(217,4,41,0.25)] text-center space-y-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-crimson/20 border border-bright-red flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(217,4,41,0.4)]">
              <CheckCircle2 className="w-8 h-8 text-bright-red" />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-orbitron font-bold uppercase tracking-[0.25em] text-bright-red px-3 py-1 rounded-full bg-crimson/15 border border-crimson/30">
                CODEXA SECURE SESSION
              </span>
              <h2 className="font-orbitron font-black text-xl text-white uppercase tracking-wider">
                SESSION RESTORED
              </h2>
              <p className="text-xs text-[#AAAAAA]">
                Welcome back, <span className="text-white font-semibold">{user.displayName || `@${user.username}`}</span>.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-[#777777]">
              <Loader2 className="w-4 h-4 animate-spin text-bright-red" />
              <span>Redirecting to command center...</span>
            </div>
          </motion.div>
        </main>

        <footer className="relative z-20 px-6 py-6 text-center text-xs text-[#444] font-mono">
          CodeXa Developer Network &bull; Cryptographically Verified Platform
        </footer>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#070707] text-white flex flex-col justify-between overflow-hidden">
      {/* Background Cyber Web & Dark Red Atmosphere */}
      <CyberWebOverlay />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-crimson/8 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-20 px-6 py-6 max-w-7xl mx-auto w-full flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-2 rounded bg-deep-red/30 border border-crimson/30 group-hover:border-bright-red/50 transition-all duration-300">
            <Shield className="w-5 h-5 text-bright-red" />
          </div>
          <span className="font-orbitron font-black text-sm tracking-[0.2em] text-white">
            CODEXA <span className="text-crimson text-xs font-normal">GATEWAY</span>
          </span>
        </Link>

        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-orbitron text-[#A5A5A5] hover:text-white transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Site
        </Link>
      </header>

      {/* Main Container */}
      <main className="relative z-20 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md"
        >
          {/* Glass Container */}
          <div className="relative rounded-3xl bg-[#090909]/95 border border-crimson/30 p-8 sm:p-10 backdrop-blur-2xl shadow-[0_0_50px_rgba(217,4,41,0.15)] overflow-hidden">
            
            {/* Cyber Corner Marks */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-crimson pointer-events-none" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-crimson pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-crimson pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-crimson pointer-events-none" />

            {/* ═══ STAGE 1: CREDENTIALS (NORMAL LOGIN) ═════════════════════ */}
            {authStage === "credentials" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Header branding */}
                <div className="text-center mb-8">
                  <span className="text-[9px] font-orbitron font-bold tracking-[0.3em] text-bright-red bg-deep-red/20 px-3 py-1 rounded-full border border-crimson/30 uppercase">
                    AUTHENTICATION
                  </span>
                  <h1 className="font-orbitron font-black text-2xl sm:text-3xl text-white tracking-wider uppercase mt-3 mb-1">
                    Secure Access
                  </h1>
                  <p className="text-xs text-[#888] font-light">
                    Enter your CodeXa credentials to access your dashboard.
                  </p>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <motion.div
                    variants={errorShakeVariants}
                    animate="shake"
                    className="p-3.5 rounded-xl bg-deep-red/25 border border-bright-red/60 text-xs text-bright-red flex items-center gap-2 mb-6"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}

                <form onSubmit={handleCredentialsSubmit} className="space-y-5">
                  {/* Identifier */}
                  <div>
                    <label className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-[#999] block mb-2">
                      Email or Username
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
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#121212] border border-crimson/25 focus:border-bright-red text-white text-xs font-mono placeholder:text-[#555] outline-none transition-all duration-200 focus:shadow-[0_0_15px_rgba(217,4,41,0.25)]"
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
                        className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#121212] border border-crimson/25 focus:border-bright-red text-white text-xs font-mono placeholder:text-[#555] outline-none transition-all duration-200 focus:shadow-[0_0_15px_rgba(217,4,41,0.25)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#555] hover:text-white"
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
                    className={`w-full py-4 rounded-xl text-xs font-orbitron font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
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
                      "LOGIN"
                    )}
                  </motion.button>
                </form>
              </motion.div>
            )}

            {/* ═══ STAGE 2: TWO-FACTOR AUTHENTICATION (2FA ON) ═══════════════ */}
            {authStage === "2fa" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-6">
                  <span className="text-[9px] font-orbitron font-bold tracking-[0.3em] text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30 uppercase">
                    TWO-FACTOR VERIFICATION
                  </span>
                  <h2 className="font-orbitron font-black text-2xl text-white tracking-wider uppercase mt-3 mb-1">
                    {twoFactorMethod === "totp" ? "Authenticator App" : "Recovery Access"}
                  </h2>
                  <p className="text-xs text-[#888] font-light leading-relaxed">
                    {twoFactorMethod === "totp"
                      ? "Enter the 6-digit code generated by your Authenticator app (Google, Microsoft, 1Password, etc.)."
                      : "Enter one of your single-use backup recovery codes."}
                  </p>
                </div>

                {/* Error Banner */}
                {twoFactorError && (
                  <motion.div
                    variants={errorShakeVariants}
                    animate="shake"
                    className="p-3 rounded-xl bg-deep-red/25 border border-bright-red/60 text-xs text-bright-red flex items-center justify-center gap-2 mb-5"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{twoFactorError}</span>
                  </motion.div>
                )}

                {/* Method 1: 6-Digit TOTP Authenticator Input */}
                {twoFactorMethod === "totp" ? (
                  <div>
                    <motion.div
                      variants={errorShakeVariants}
                      animate={twoFactorState === "error" ? "shake" : "initial"}
                      className="flex justify-between gap-2 sm:gap-3 my-6"
                    >
                      {totpDigits.map((digit, idx) => (
                        <motion.div
                          key={idx}
                          variants={digitPopVariants}
                          animate={digit ? "pop" : "initial"}
                          className="flex-1"
                        >
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
                        </motion.div>
                      ))}
                    </motion.div>

                    <div className="text-center mb-6">
                      <button
                        type="button"
                        onClick={() => {
                          setTwoFactorMethod("backup");
                          setTwoFactorError("");
                        }}
                        className="text-xs font-orbitron text-[#888] hover:text-bright-red transition-colors uppercase tracking-wider"
                      >
                        Can’t access your authenticator? <span className="text-bright-red font-bold underline">Use Backup Code</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Method 2: Single-Use Backup Code Input */
                  <div className="my-6 space-y-4">
                    <div>
                      <label className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-[#999] block mb-2">
                        Backup Recovery Code
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
                        &larr; Use Authenticator App Code Instead
                      </button>
                    </div>
                  </div>
                )}

                {/* Verify Button */}
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
                      VERIFYING CODE...
                    </>
                  ) : twoFactorState === "success" ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      ACCESS AUTHORIZED
                    </>
                  ) : (
                    "VERIFY & ENTER"
                  )}
                </motion.button>

                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => { setAuthStage("credentials"); setTwoFactorError(""); }}
                    className="text-[10px] font-orbitron text-[#666] hover:text-white uppercase tracking-wider"
                  >
                    &larr; Back to Credentials
                  </button>
                </div>
              </motion.div>
            )}

            {/* ═══ STAGE 3: FORGOT PASSWORD (2FA-AWARE RECOVERY) ════════════ */}
            {authStage === "forgot-password" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
              >
                {/* Header branding */}
                <div className="text-center mb-6">
                  <span className="text-[9px] font-orbitron font-bold tracking-[0.3em] text-bright-red bg-deep-red/20 px-3 py-1 rounded-full border border-crimson/30 uppercase">
                    ACCOUNT RECOVERY
                  </span>
                  <h2 className="font-orbitron font-black text-2xl text-white tracking-wider uppercase mt-3 mb-1">
                    Reset Credentials
                  </h2>

                  {/* Step indicators */}
                  <div className="flex items-center justify-center gap-2 mt-4 text-[9px] font-orbitron uppercase tracking-widest text-[#555]">
                    <span className={forgotStep === "email" ? "text-bright-red font-bold" : "text-[#777]"}>1. Email</span>
                    <span>&bull;</span>
                    <span className={forgotStep === "otp" ? "text-bright-red font-bold" : "text-[#777]"}>2. Verify</span>
                    <span>&bull;</span>
                    <span className={forgotStep === "2fa" ? "text-bright-red font-bold" : "text-[#777]"}>3. 2FA</span>
                    <span>&bull;</span>
                    <span className={forgotStep === "new-password" ? "text-bright-red font-bold" : "text-[#777]"}>4. Password</span>
                  </div>
                </div>

                {/* Error Banner */}
                {forgotError && (
                  <div className="p-3 rounded-xl bg-deep-red/25 border border-bright-red/60 text-xs text-bright-red flex items-center gap-2 mb-5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}

                {/* Step 1: Enter Email */}
                {forgotStep === "email" && (
                  <form onSubmit={handleForgotSendEmailOtp} className="space-y-5">
                    <p className="text-xs text-[#888] font-light text-center leading-relaxed">
                      Enter your registered email address to receive a 6-digit recovery code.
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
                      className="w-full py-4 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "DISPATCH RECOVERY CODE"}
                    </button>
                  </form>
                )}

                {/* Step 2: Email OTP Input */}
                {forgotStep === "otp" && (
                  <div>
                    <p className="text-xs text-[#888] font-light text-center leading-relaxed mb-4">
                      Enter the 6-digit code sent to <strong className="text-white font-mono">{forgotEmail}</strong>.
                    </p>

                    <div className="flex justify-between gap-2 sm:gap-3 my-5">
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

                    <div className="flex items-center justify-between text-xs text-[#777] mb-5">
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
                      className="w-full py-4 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "VERIFY CODE"}
                    </button>
                  </div>
                )}

                {/* Step 3: 2FA Verification (If 2FA is active on account) */}
                {forgotStep === "2fa" && (
                  <div className="space-y-5">
                    <p className="text-xs text-emerald-400 font-light text-center leading-relaxed">
                      ✓ Email verified. This account is protected with Two-Factor Authentication. Please verify your second factor.
                    </p>

                    {forgot2FaMethod === "totp" ? (
                      <div>
                        <label className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-[#999] block mb-2">
                          Authenticator App 6-Digit Code
                        </label>
                        <div className="flex justify-between gap-2 my-3">
                          {forgotTotpDigits.map((digit, idx) => (
                            <input
                              key={idx}
                              ref={(el) => {
                                forgotTotpRefs.current[idx] = el;
                              }}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "");
                                const newDigits = [...forgotTotpDigits];
                                newDigits[idx] = val;
                                setForgotTotpDigits(newDigits);
                                if (val && idx < 5) forgotTotpRefs.current[idx + 1]?.focus();
                              }}
                              className="flex-1 h-12 text-center font-mono text-lg font-black rounded-xl bg-[#111] border border-crimson/25 focus:border-bright-red text-white outline-none"
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => setForgot2FaMethod("backup")}
                          className="text-[11px] font-orbitron text-[#888] hover:text-bright-red uppercase"
                        >
                          Use Backup Code Instead
                        </button>
                      </div>
                    ) : (
                      <div>
                        <label className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-[#999] block mb-2">
                          Single-Use Backup Code
                        </label>
                        <input
                          type="text"
                          value={forgotBackupCode}
                          onChange={(e) => setForgotBackupCode(e.target.value.toUpperCase())}
                          placeholder="CXA-XXXX-XXXX"
                          className="w-full px-4 py-3 rounded-xl bg-[#121212] border border-crimson/25 focus:border-bright-red text-white text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setForgot2FaMethod("totp")}
                          className="text-[11px] font-orbitron text-bright-red hover:underline uppercase mt-2 block"
                        >
                          &larr; Use Authenticator App Code
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setForgotStep("new-password")}
                      className="w-full py-4 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-black uppercase tracking-widest transition-all"
                    >
                      PROCEED TO NEW PASSWORD &rarr;
                    </button>
                  </div>
                )}

                {/* Step 4: Set New Password */}
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
                      className="w-full py-4 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "UPDATE PASSWORD"}
                    </button>
                  </form>
                )}

                {/* Step 5: Password Updated Success */}
                {forgotStep === "done" && (
                  <div className="text-center space-y-5 py-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                      <Check className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-orbitron font-bold text-lg text-white uppercase">Password Updated</h3>
                      <p className="text-xs text-[#888] mt-1">
                        Your account password has been updated. You may now log in with your new credentials.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthStage("credentials");
                        setPassword("");
                      }}
                      className="w-full py-3.5 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-black uppercase tracking-widest"
                    >
                      RETURN TO LOGIN
                    </button>
                  </div>
                )}

                {forgotStep !== "done" && (
                  <div className="text-center mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthStage("credentials");
                        setForgotError("");
                      }}
                      className="text-[10px] font-orbitron text-[#666] hover:text-white uppercase tracking-wider"
                    >
                      &larr; Return to Login
                    </button>
                  </div>
                )}
              </motion.div>
            )}

          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 px-6 py-6 text-center text-xs text-[#444] font-mono">
        CodeXa Developer Network &bull; Cryptographically Verified Platform
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070707] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-bright-red animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
