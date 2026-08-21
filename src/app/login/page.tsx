"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
  Check
} from "lucide-react";
import { CyberWebOverlay } from "@/components/ui/CyberWebOverlay";
import { errorShakeVariants, digitPopVariants } from "@/lib/motion";

export default function LoginPage() {
  const router = useRouter();

  // Stage: "credentials" | "otp" | "forgot-password"
  const [authStage, setAuthStage] = useState<"credentials" | "otp" | "forgot-password">("credentials");

  // Credential Inputs
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginState, setLoginState] = useState<"idle" | "verifying" | "success" | "denied">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // OTP State
  const [maskedEmail, setMaskedEmail] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpState, setOtpState] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [otpError, setOtpError] = useState("");
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Forgot Password Multi-step state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotStep, setForgotStep] = useState<"email" | "otp-reset" | "done">("email");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotError, setForgotError] = useState("");

  // Countdown timer for OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (authStage === "otp" && countdown > 0) {
      interval = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [authStage, countdown]);

  // Resend cooldown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

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

      if (res.ok && data.success && data.requireOtp) {
        setLoginState("success");
        setMaskedEmail(data.maskedEmail);
        setTargetEmail(data.email);
        setTimeout(() => {
          setAuthStage("otp");
          setCountdown(300);
          setResendCooldown(60);
          setLoginState("idle");
          setOtpDigits(["", "", "", "", "", ""]);
        }, 800);
      } else {
        setLoginState("denied");
        setErrorMessage(data.error || "Access Denied. Invalid credentials.");
      }
    } catch {
      setLoginState("denied");
      setErrorMessage("Network error connecting to CodeXa Security Gateway.");
    }
  };

  // ── Stage 2: OTP Handling ─────────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Paste handling e.g. "583214"
      const pasted = value.replace(/\D/g, "").slice(0, 6);
      if (pasted.length > 0) {
        const newDigits = [...otpDigits];
        for (let i = 0; i < 6; i++) {
          newDigits[i] = pasted[i] || "";
        }
        setOtpDigits(newDigits);
        const nextFocus = Math.min(pasted.length, 5);
        otpInputRefs.current[nextFocus]?.focus();
      }
      return;
    }

    const digit = value.replace(/\D/g, "");
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setOtpError("");

    // Auto-advance focus
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = otpDigits.join("");
    if (fullOtp.length !== 6) {
      setOtpError("Please enter the complete 6-digit code.");
      return;
    }

    setOtpState("verifying");
    setOtpError("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          otp: fullOtp,
          purpose: "LOGIN",
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setOtpState("success");
        setTimeout(() => {
          router.replace(data.redirectUrl || "/dashboard");
        }, 900);
      } else {
        setOtpState("error");
        setOtpError(data.error || "Invalid verification code.");
      }
    } catch {
      setOtpState("error");
      setOtpError("Network error verifying code.");
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setResendCooldown(60);
    setOtpError("");

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, purpose: "LOGIN" }),
      });
      const data = await res.json();
      if (data.success) {
        setCountdown(300);
        setOtpDigits(["", "", "", "", "", ""]);
        otpInputRefs.current[0]?.focus();
      }
    } catch {}
  };

  // ── Forgot Password Flow ──────────────────────────────────────────────────
  const handleForgotSendOtp = async (e: React.FormEvent) => {
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
        setForgotStep("otp-reset");
        setForgotMsg(data.message);
      } else {
        setForgotError(data.error || "Failed to initiate password recovery.");
      }
    } catch {
      setForgotError("Network error.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp || !forgotNewPassword) return;
    setForgotLoading(true);
    setForgotError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail,
          otp: forgotOtp,
          newPassword: forgotNewPassword,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setForgotStep("done");
      } else {
        setForgotError(data.error || "Failed to update password.");
      }
    } catch {
      setForgotError("Network error.");
    } finally {
      setForgotLoading(false);
    }
  };

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
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Glass Login / OTP Container */}
          <div className="relative rounded-3xl bg-[#090909]/90 border border-crimson/30 p-8 sm:p-10 backdrop-blur-2xl shadow-[0_0_50px_rgba(217,4,41,0.15)] overflow-hidden">
            
            {/* Cyber Corner Marks */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-crimson" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-crimson" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-crimson" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-crimson" />

            {/* ─── STAGE 1: CREDENTIALS FORM ─────────────────────────────── */}
            {authStage === "credentials" && (
              <div>
                {/* Header branding */}
                <div className="text-center mb-8">
                  <span className="text-[9px] font-orbitron font-bold tracking-[0.3em] text-bright-red bg-deep-red/20 px-3 py-1 rounded-full border border-crimson/30 uppercase">
                    AUTHENTICATION
                  </span>
                  <h1 className="font-orbitron font-black text-2xl sm:text-3xl text-white tracking-wider uppercase mt-3 mb-1">
                    Secure Access
                  </h1>
                  <p className="text-xs text-[#888] font-light">
                    Enter your CodeXa credentials to initiate authorization.
                  </p>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
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
                        onChange={(e) => { setIdentifier(e.target.value); setErrorMessage(""); }}
                        placeholder="e.g. ashu or ashu@codexa.agency"
                        disabled={loginState === "verifying" || loginState === "success"}
                        className="w-full bg-[#111] border border-crimson/20 focus:border-bright-red rounded-xl pl-10 pr-4 py-3.5 text-xs text-white placeholder-[#444] outline-none transition-all focus:shadow-[0_0_15px_rgba(217,4,41,0.2)] disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-[#999] block mb-2">
                      Password
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#555] group-focus-within:text-bright-red transition-colors">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setErrorMessage(""); }}
                        placeholder="••••••••••••"
                        disabled={loginState === "verifying" || loginState === "success"}
                        className="w-full bg-[#111] border border-crimson/20 focus:border-bright-red rounded-xl pl-10 pr-11 py-3.5 text-xs text-white placeholder-[#444] outline-none transition-all focus:shadow-[0_0_15px_rgba(217,4,41,0.2)] disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#555] hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Forgot Password trigger */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => { setAuthStage("forgot-password"); setForgotStep("email"); setForgotError(""); }}
                      className="text-[11px] font-orbitron text-[#888] hover:text-bright-red transition-colors uppercase tracking-wider"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {/* Login Action Button */}
                  <button
                    type="submit"
                    disabled={loginState === "verifying" || loginState === "success"}
                    className={`w-full py-4 rounded-xl text-xs font-orbitron font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
                      loginState === "verifying"
                        ? "bg-deep-red/60 text-white cursor-wait border border-bright-red/40"
                        : loginState === "success"
                        ? "bg-emerald-600 text-white border border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                        : loginState === "denied"
                        ? "bg-red-700 text-white border border-red-500 animate-shake"
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
                        CREDENTIALS VERIFIED
                      </>
                    ) : loginState === "denied" ? (
                      "ACCESS DENIED"
                    ) : (
                      "LOGIN"
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ─── STAGE 2: OTP VERIFICATION SCREEN ──────────────────────── */}
            {authStage === "otp" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-6">
                  <span className="text-[9px] font-orbitron font-bold tracking-[0.3em] text-bright-red bg-deep-red/20 px-3 py-1 rounded-full border border-crimson/30 uppercase">
                    STAGE 2 OF 2
                  </span>
                  <h2 className="font-orbitron font-black text-2xl text-white tracking-wider uppercase mt-3 mb-1">
                    Verify Your Identity
                  </h2>
                  <p className="text-xs text-[#888] font-light leading-relaxed">
                    We sent a single-use verification code to:
                  </p>
                  <p className="font-mono text-xs text-bright-red font-bold mt-1">
                    {maskedEmail}
                  </p>
                </div>

                {/* Error state */}
                {otpError && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3 rounded-xl bg-deep-red/25 border border-bright-red/60 text-xs text-bright-red flex items-center justify-center gap-2 mb-5"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{otpError}</span>
                  </motion.div>
                )}

                {/* 6-Digit OTP Boxes */}
                <motion.div
                  variants={errorShakeVariants}
                  animate={otpState === "error" ? "shake" : "initial"}
                  className="flex justify-between gap-2 sm:gap-3 my-6"
                >
                  {otpDigits.map((digit, idx) => (
                    <motion.div
                      key={idx}
                      variants={digitPopVariants}
                      animate={digit ? "pop" : "initial"}
                      className="flex-1"
                    >
                      <input
                        ref={(el) => {
                          otpInputRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={6} // Allows paste
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        disabled={otpState === "verifying" || otpState === "success"}
                        className={`w-full h-14 sm:h-16 text-center font-mono text-xl sm:text-2xl font-black rounded-xl bg-[#111] border text-white outline-none transition-all duration-200 ${
                          digit
                            ? "border-bright-red bg-deep-red/10 shadow-[0_0_15px_rgba(217,4,41,0.3)] text-bright-red"
                            : "border-crimson/25 focus:border-bright-red"
                        }`}
                      />
                    </motion.div>
                  ))}
                </motion.div>

                {/* Timer & Resend */}
                <div className="flex items-center justify-between text-xs text-[#777] mb-6">
                  <span className="font-mono text-[11px]">
                    ⏱️ {countdown > 0 ? `${formatCountdown(countdown)} remaining` : "Code Expired"}
                  </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0}
                    className="text-[10px] font-orbitron text-bright-red hover:underline disabled:text-[#555] disabled:no-underline uppercase font-bold"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                  </button>
                </div>

                {/* Verify Button */}
                <button
                  type="button"
                  onClick={() => handleVerifyOtp()}
                  disabled={otpState === "verifying" || otpState === "success" || countdown <= 0}
                  className={`w-full py-4 rounded-xl text-xs font-orbitron font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
                    otpState === "verifying"
                      ? "bg-deep-red/60 text-white cursor-wait"
                      : otpState === "success"
                      ? "bg-emerald-600 text-white border border-emerald-400"
                      : "bg-crimson hover:bg-bright-red text-white border border-bright-red hover:shadow-[0_0_20px_rgba(217,4,41,0.4)] disabled:opacity-50"
                  }`}
                >
                  {otpState === "verifying" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      VERIFYING CODE...
                    </>
                  ) : otpState === "success" ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      IDENTITY VERIFIED
                    </>
                  ) : (
                    "VERIFY OTP & ENTER"
                  )}
                </button>

                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => { setAuthStage("credentials"); setOtpError(""); }}
                    className="text-[10px] font-orbitron text-[#666] hover:text-white uppercase tracking-wider"
                  >
                    &larr; Switch Account
                  </button>
                </div>
              </motion.div>
            )}

            {/* ─── STAGE 3: FORGOT PASSWORD FLOW ─────────────────────────── */}
            {authStage === "forgot-password" && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-6">
                  <span className="text-[9px] font-orbitron font-bold tracking-[0.3em] text-bright-red bg-deep-red/20 px-3 py-1 rounded-full border border-crimson/30 uppercase">
                    RECOVERY GATEWAY
                  </span>
                  <h2 className="font-orbitron font-black text-2xl text-white tracking-wider uppercase mt-3 mb-1">
                    Recover Access
                  </h2>
                </div>

                {forgotError && (
                  <div className="p-3 rounded-xl bg-deep-red/25 border border-bright-red text-xs text-bright-red mb-4">
                    {forgotError}
                  </div>
                )}
                {forgotMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500 text-xs text-emerald-400 mb-4">
                    {forgotMsg}
                  </div>
                )}

                {forgotStep === "email" && (
                  <form onSubmit={handleForgotSendOtp} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">
                        Registered Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="e.g. ashu@codexa.agency"
                        className="w-full bg-[#111] border border-crimson/20 focus:border-bright-red rounded-xl p-3.5 text-xs text-white outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full py-3.5 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider"
                    >
                      {forgotLoading ? "DISPATCHING CODE..." : "SEND RECOVERY OTP"}
                    </button>
                  </form>
                )}

                {forgotStep === "otp-reset" && (
                  <form onSubmit={handleForgotResetSubmit} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">
                        6-Digit Recovery Code
                      </label>
                      <input
                        type="text"
                        required
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value)}
                        placeholder="e.g. 583214"
                        className="w-full bg-[#111] border border-crimson/20 focus:border-bright-red rounded-xl p-3.5 text-xs text-white font-mono outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">
                        New Password (Min. 6 chars)
                      </label>
                      <input
                        type="password"
                        required
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-[#111] border border-crimson/20 focus:border-bright-red rounded-xl p-3.5 text-xs text-white outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full py-3.5 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider"
                    >
                      {forgotLoading ? "UPDATING PASSWORD..." : "UPDATE PASSWORD"}
                    </button>
                  </form>
                )}

                {forgotStep === "done" && (
                  <div className="text-center space-y-4 py-4">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                    <h3 className="font-orbitron font-bold text-base text-white uppercase">Password Updated</h3>
                    <p className="text-xs text-[#888]">
                      Your credentials have been securely updated. Please return to login.
                    </p>
                    <button
                      onClick={() => { setAuthStage("credentials"); setForgotStep("email"); }}
                      className="w-full py-3 rounded-xl bg-crimson text-white text-xs font-orbitron font-bold uppercase"
                    >
                      Return to Login
                    </button>
                  </div>
                )}

                {forgotStep !== "done" && (
                  <div className="text-center mt-4">
                    <button
                      type="button"
                      onClick={() => setAuthStage("credentials")}
                      className="text-[10px] font-orbitron text-[#666] hover:text-white uppercase tracking-wider"
                    >
                      &larr; Cancel and Return to Login
                    </button>
                  </div>
                )}
              </motion.div>
            )}

          </div>
        </motion.div>
      </main>

      {/* Footer System Status */}
      <footer className="relative z-20 py-4 px-6 text-center">
        <span className="text-[10px] font-orbitron text-[#444] tracking-widest uppercase">
          CODEXA ENCRYPTION &bull; 2-STAGE ACCESS GATEWAY
        </span>
      </footer>
    </div>
  );
}
