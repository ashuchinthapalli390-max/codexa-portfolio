"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, CheckCircle2, XCircle, Search, ArrowLeft, ExternalLink, Award, FileCheck, Building } from "lucide-react";

function VerifyContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") || "";
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performVerification = async (verifyCode: string) => {
    if (!verifyCode.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(verifyCode.trim())}`);
      const data = await res.json();
      if (res.ok && data.verified) {
        setResult(data);
      } else {
        setResult(null);
        setError(data.error || "Document not found or invalid verification code.");
      }
    } catch {
      setError("Network error verifying document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      performVerification(initialCode);
    }
  }, [initialCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performVerification(code);
  };

  return (
    <div className="min-h-screen bg-[#060606] text-white selection:bg-crimson selection:text-white">
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-crimson/10 rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        {/* Back Link */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to CodeXa Agency
          </Link>
        </div>

        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-crimson/10 border border-crimson/30 text-bright-red text-xs font-mono uppercase tracking-widest">
            <Shield className="w-3.5 h-3.5" /> Official Verification Authority
          </div>
          <h1 className="text-3xl sm:text-5xl font-orbitron font-black uppercase tracking-wider text-white">
            DOCUMENT & CERTIFICATE <span className="text-transparent bg-clip-text bg-gradient-to-r from-crimson to-bright-red">REGISTRY</span>
          </h1>
          <p className="max-w-xl mx-auto text-sm text-neutral-400 font-sans leading-relaxed">
            Verify the authenticity of official CodeXa Agency Offer Letters, Internship Certificates, Experience Letters, and Issued Credentials.
          </p>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleSubmit} className="mb-10">
          <div className="relative flex items-center max-w-xl mx-auto">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter Verification Code (e.g. CXA-V-7F82A1 or Offer ID)"
              className="w-full pl-5 pr-32 py-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 text-white placeholder-neutral-500 font-mono text-sm focus:outline-none focus:border-crimson focus:ring-1 focus:ring-crimson transition-all shadow-2xl"
            />
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="absolute right-2 px-5 py-2.5 rounded-xl bg-crimson hover:bg-bright-red disabled:opacity-50 text-white font-orbitron text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-crimson/20"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" /> Verify
                </>
              )}
            </button>
          </div>
        </form>

        {/* Verification Result Card */}
        {searched && (
          <div className="max-w-xl mx-auto">
            {result ? (
              <div className="rounded-3xl bg-neutral-900/90 border border-emerald-500/40 p-6 sm:p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(16,185,129,0.15)] space-y-6">
                <div className="flex items-start justify-between border-b border-neutral-800 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono uppercase tracking-widest font-bold">
                        GENUINE & VERIFIED
                      </div>
                      <h2 className="text-lg font-orbitron font-bold text-white mt-1">
                        CodeXa Official Document
                      </h2>
                    </div>
                  </div>
                  <Building className="w-6 h-6 text-neutral-500" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
                    <span className="text-neutral-500 block text-[10px] uppercase">Document ID</span>
                    <span className="text-white font-bold">{result.documentId}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
                    <span className="text-neutral-500 block text-[10px] uppercase">Verification Code</span>
                    <span className="text-bright-red font-bold">{result.verificationCode}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
                    <span className="text-neutral-500 block text-[10px] uppercase">Issued To</span>
                    <span className="text-white font-bold">{result.recipient}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
                    <span className="text-neutral-500 block text-[10px] uppercase">Designation / Role</span>
                    <span className="text-emerald-400 font-bold">{result.role || result.title || "Core Member"}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
                    <span className="text-neutral-500 block text-[10px] uppercase">Department</span>
                    <span className="text-white">{result.department || "Engineering"}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
                    <span className="text-neutral-500 block text-[10px] uppercase">Issue Date</span>
                    <span className="text-white">{new Date(result.issueDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-neutral-300 font-medium font-sans">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-400" /> Issued By CodeXa Agency Executive Board
                  </div>
                  <p className="font-sans leading-relaxed text-neutral-500">
                    This document was cryptographically registered in the CodeXa Agency Ecosystem database and verified authentic by CodeXa Security Infrastructure.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl bg-neutral-900/90 border border-red-500/40 p-8 text-center space-y-4 backdrop-blur-xl shadow-2xl">
                <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto">
                  <XCircle className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-orbitron font-bold text-white">
                  Verification Failed
                </h2>
                <p className="text-xs text-neutral-400 font-sans max-w-sm mx-auto">
                  {error || "The requested code could not be matched with any genuine CodeXa Agency document."}
                </p>
                <p className="text-[11px] font-mono text-neutral-500">
                  Please verify the exact document number or contact <span className="text-white">contact@codxa-agency.online</span>.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#060606] text-white flex items-center justify-center font-mono text-xs uppercase tracking-widest">
          Loading Verification Authority...
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
