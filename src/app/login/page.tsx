/**
 * /login — Unified Two-Step Login Page
 * Step 1: Enter Access Key → verify against DB
 * Step 2: Enter credentials (email or username + password)
 */
"use client";

import React, { useState, useEffect, Suspense } from "react";
import "../globals.css";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Step = "key" | "credentials";
type UIState = "idle" | "loading" | "success" | "error";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const [logoError, setLogoError] = useState(false);

  // Step state
  const [step, setStep] = useState<Step>("key");
  const [uiState, setUiState] = useState<UIState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Step 1 state
  const [accessKey, setAccessKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  // Step 2 state
  const [identifier, setIdentifier] = useState(""); // email or username
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);

  // Check if already authenticated
  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          const role = data.user.role;
          if (role === "OWNER" || role === "ADMIN") {
            router.replace("/owner");
          } else {
            router.replace("/dashboard/profile");
          }
        }
      })
      .catch(() => {});
  }, [router]);

  // ─── Step 1: Verify Access Key ────────────────────────────────────────────
  const handleVerifyKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessKey.trim() || uiState === "loading") return;

    setUiState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/verify-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: accessKey.trim() }),
      });

      if (res.status === 429) {
        setUiState("error");
        setErrorMsg("Too many attempts. Please wait 15 minutes.");
        return;
      }

      const data = await res.json();

      if (res.ok && data.preAuthGranted) {
        setUiState("idle");
        setStep("credentials");
        return;
      }

      setUiState("error");
      setErrorMsg("Access denied. Check your access key and try again.");
    } catch {
      setUiState("error");
      setErrorMsg("Network error. Please try again.");
    }
  };

  // ─── Step 2: Submit Credentials ──────────────────────────────────────────
  const handleSubmitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim() || uiState === "loading") return;

    setUiState("loading");
    setErrorMsg("");

    try {
      // Detect email vs username
      const isEmail = identifier.includes("@");
      const body: Record<string, unknown> = {
        password,
        rememberDevice,
      };
      if (isEmail) {
        body.email = identifier.trim();
      } else {
        body.username = identifier.trim();
      }

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setUiState("success");
        setTimeout(() => {
          const role = data.user.role;
          if (redirect) {
            router.push(redirect);
          } else if (role === "OWNER" || role === "ADMIN") {
            router.push("/owner");
          } else {
            router.push("/dashboard/profile");
          }
        }, 700);
        return;
      }

      setUiState("error");
      setErrorMsg(data.error ?? "Invalid credentials.");
    } catch {
      setUiState("error");
      setErrorMsg("Network error. Please try again.");
    }
  };

  const isKeySubmittable = accessKey.trim() && uiState !== "loading" && uiState !== "success";
  const isCredsSubmittable = identifier.trim() && password.trim() && uiState !== "loading" && uiState !== "success";

  return (
    <div className="min-h-screen bg-[#070707] flex items-center justify-center relative overflow-hidden">

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#D90429] opacity-[0.04] blur-[120px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(217,4,41,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(217,4,41,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-md mx-4">

        {/* Logo */}
        <div className="flex justify-center mb-7">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            {!logoError ? (
              <img
                src="/assets/images/logo.jpeg"
                alt="CodeXa Agency logo"
                className="h-10 w-auto object-contain rounded shadow-[0_0_15px_rgba(217,4,41,0.2)] border border-crimson/20"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="font-orbitron text-lg font-black tracking-[0.25em] text-[#F7F7F7] flex items-center gap-2">
                <span className="text-[#D90429]">⚡</span> CODEXA
              </span>
            )}
          </Link>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className={`flex items-center gap-1.5 ${step === "key" ? "opacity-100" : "opacity-40"}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-orbitron font-bold border ${step === "key" ? "border-[#D90429] bg-[#D90429]/10 text-[#D90429]" : "border-[#D90429] bg-[#D90429] text-white"}`}>
              {step === "key" ? "1" : "✓"}
            </div>
            <span className="text-[9px] font-orbitron uppercase tracking-widest text-[#A5A5A5]">Access Key</span>
          </div>
          <div className="w-8 h-[1px] bg-[#222]" />
          <div className={`flex items-center gap-1.5 ${step === "credentials" ? "opacity-100" : "opacity-40"}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-orbitron font-bold border ${step === "credentials" ? "border-[#D90429] bg-[#D90429]/10 text-[#D90429]" : "border-[#333] bg-[#111] text-[#555]"}`}>
              2
            </div>
            <span className="text-[9px] font-orbitron uppercase tracking-widest text-[#A5A5A5]">Credentials</span>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-[1px]"
          style={{
            background: "linear-gradient(135deg, rgba(217,4,41,0.35), rgba(99,0,15,0.15), rgba(217,4,41,0.35))",
            boxShadow: "0 0 40px rgba(217,4,41,0.12)",
          }}
        >
          <div className="rounded-2xl p-8" style={{ background: "rgba(7,7,7,0.97)", backdropFilter: "blur(24px)" }}>

            {/* Title */}
            <div className="text-center mb-7">
              {step === "key" ? (
                <>
                  <h1 className="font-orbitron text-xl font-bold text-[#F7F7F7] tracking-wide">
                    Enter Access Key
                  </h1>
                  <p className="text-[#A5A5A5] text-xs mt-2 font-light">
                    Your access key was provided by the Owner.
                  </p>
                </>
              ) : (
                <>
                  <div className="inline-flex items-center gap-2 bg-[#0a1a08] border border-[rgba(0,180,80,0.25)] rounded-full px-3 py-1 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#4ECDC4] animate-pulse" />
                    <span className="text-[9px] font-orbitron text-[#4ECDC4] tracking-widest uppercase">Key Verified</span>
                  </div>
                  <h1 className="font-orbitron text-xl font-bold text-[#F7F7F7] tracking-wide">
                    Sign In
                  </h1>
                  <p className="text-[#A5A5A5] text-xs mt-2 font-light">
                    Enter your credentials to access your workspace.
                  </p>
                </>
              )}
            </div>

            {/* Error message */}
            {uiState === "error" && (
              <div className="mb-5 p-3 rounded-lg border border-[rgba(217,4,41,0.3)] bg-[rgba(217,4,41,0.06)] text-xs text-[#D90429] flex items-center gap-2.5 font-orbitron">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success message */}
            {uiState === "success" && (
              <div className="mb-5 p-3 rounded-lg border border-[rgba(0,180,80,0.25)] bg-[rgba(0,180,80,0.05)] text-xs text-[#4ECDC4] flex items-center gap-2.5 font-orbitron">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Access Granted. Loading workspace...</span>
              </div>
            )}

            {/* ─── STEP 1: Access Key form ─── */}
            {step === "key" && (
              <form onSubmit={handleVerifyKey} className="space-y-5" noValidate>
                <div>
                  <label htmlFor="access-key" className="block text-[10px] font-orbitron tracking-widest text-[#A5A5A5] uppercase mb-2">
                    Access Key
                  </label>
                  <div className="relative">
                    <input
                      id="access-key"
                      type={showKey ? "text" : "password"}
                      value={accessKey}
                      onChange={(e) => { setAccessKey(e.target.value); if (uiState === "error") setUiState("idle"); }}
                      placeholder="CXA-XXXX-XXXX-XXXX-XXXX"
                      autoFocus
                      autoComplete="off"
                      disabled={uiState === "loading"}
                      className="w-full bg-[#111111] border border-[rgba(217,4,41,0.25)] rounded-lg px-4 pr-12 py-3 text-[#F7F7F7] text-sm placeholder-[#333333] outline-none transition-all duration-200 focus:border-[rgba(217,4,41,0.6)] focus:shadow-[0_0_0_1px_rgba(217,4,41,0.2)] disabled:opacity-50 font-mono tracking-wider"
                      style={{ borderColor: uiState === "error" ? "rgba(217,4,41,0.6)" : undefined }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#333333] hover:text-[#A5A5A5] transition-colors"
                      aria-label={showKey ? "Hide key" : "Show key"}
                    >
                      {showKey ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <SubmitButton
                  isSubmittable={!!isKeySubmittable}
                  isLoading={uiState === "loading"}
                  label="Verify Access Key"
                  loadingLabel="Verifying..."
                />
              </form>
            )}

            {/* ─── STEP 2: Credentials form ─── */}
            {step === "credentials" && (
              <form onSubmit={handleSubmitCredentials} className="space-y-5" noValidate>
                <div>
                  <label htmlFor="login-identifier" className="block text-[10px] font-orbitron tracking-widest text-[#A5A5A5] uppercase mb-2">
                    Email or Username
                  </label>
                  <input
                    id="login-identifier"
                    type="text"
                    autoFocus
                    autoComplete="username email"
                    value={identifier}
                    onChange={(e) => { setIdentifier(e.target.value); if (uiState === "error") setUiState("idle"); }}
                    placeholder="you@codexa.agency or username"
                    disabled={uiState === "loading" || uiState === "success"}
                    className="w-full bg-[#111111] border border-[rgba(217,4,41,0.25)] rounded-lg px-4 py-3 text-[#F7F7F7] text-sm placeholder-[#333333] outline-none transition-all duration-200 focus:border-[rgba(217,4,41,0.6)] focus:shadow-[0_0_0_1px_rgba(217,4,41,0.2)] disabled:opacity-50"
                    style={{ borderColor: uiState === "error" ? "rgba(217,4,41,0.6)" : undefined }}
                  />
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-[10px] font-orbitron tracking-widest text-[#A5A5A5] uppercase mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (uiState === "error") setUiState("idle"); }}
                      placeholder="••••••••••••"
                      disabled={uiState === "loading" || uiState === "success"}
                      className="w-full bg-[#111111] border border-[rgba(217,4,41,0.25)] rounded-lg pl-4 pr-12 py-3 text-[#F7F7F7] text-sm placeholder-[#333333] outline-none transition-all duration-200 focus:border-[rgba(217,4,41,0.6)] focus:shadow-[0_0_0_1px_rgba(217,4,41,0.2)] disabled:opacity-50"
                      style={{ borderColor: uiState === "error" ? "rgba(217,4,41,0.6)" : undefined }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#333333] hover:text-[#A5A5A5] transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember device */}
                <div className="flex items-center gap-2">
                  <input
                    id="remember-device"
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    disabled={uiState === "loading" || uiState === "success"}
                    className="rounded bg-[#111111] border-[rgba(217,4,41,0.25)] text-[#D90429] outline-none accent-[#D90429] w-4 h-4 cursor-pointer disabled:opacity-50"
                  />
                  <label htmlFor="remember-device" className="text-xs font-orbitron text-[#A5A5A5] select-none cursor-pointer">
                    Trust this device (7 days session)
                  </label>
                </div>

                <SubmitButton
                  isSubmittable={!!isCredsSubmittable}
                  isLoading={uiState === "loading"}
                  label="Authorize Session"
                  loadingLabel="Authenticating..."
                />

                {/* Back to step 1 */}
                <button
                  type="button"
                  onClick={() => { setStep("key"); setUiState("idle"); setErrorMsg(""); setIdentifier(""); setPassword(""); }}
                  className="w-full text-center text-[10px] font-orbitron text-[#444] hover:text-[#A5A5A5] uppercase tracking-widest transition-colors mt-1"
                >
                  ← Change Access Key
                </button>
              </form>
            )}

            {/* Return to site */}
            <div className="mt-8 text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-[10px] font-orbitron tracking-wider text-[#A5A5A5] hover:text-[#D90429] transition-colors uppercase"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Return to Site
              </Link>
            </div>

            {/* Security footer */}
            <div className="relative z-10 mt-6 pt-5 border-t border-[#151515] text-center">
              <p className="text-[10px] text-[#2A2A2A] tracking-wider uppercase font-orbitron">
                🔒 Two-Step · DB Session · Tokenized
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reusable submit button
function SubmitButton({
  isSubmittable,
  isLoading,
  label,
  loadingLabel,
}: {
  isSubmittable: boolean;
  isLoading: boolean;
  label: string;
  loadingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={!isSubmittable}
      className="w-full relative rounded-lg p-[1px] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      style={{
        background: isSubmittable
          ? "linear-gradient(90deg, #D90429, #FF4D6D)"
          : "rgba(217,4,41,0.12)",
        boxShadow: isSubmittable ? "0 4px 20px rgba(217,4,41,0.25)" : "none",
      }}
    >
      <div
        className="rounded-lg py-3 px-4 flex items-center justify-center font-orbitron text-xs tracking-widest uppercase transition-all duration-200"
        style={{
          background: isSubmittable ? "transparent" : "#111111",
          color: isSubmittable ? "#FFFFFF" : "#A5A5A5",
        }}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
            </svg>
            {loadingLabel}
          </div>
        ) : (
          label
        )}
      </div>
    </button>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070707] flex items-center justify-center">
          <div className="flex items-center gap-3 text-[#A5A5A5]">
            <svg className="w-5 h-5 animate-spin text-[#D90429]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
            </svg>
            <span className="font-orbitron text-sm tracking-wider">Loading...</span>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
