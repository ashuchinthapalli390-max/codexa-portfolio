"use client";

import React, { useState, useEffect } from "react";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { useAuth } from "@/context/AuthContext";
import {
  FileText,
  Award,
  Shield,
  Download,
  Plus,
  Search,
  ExternalLink,
  Printer,
  X,
  FileCheck,
  Building,
  CheckCircle2,
  Lock
} from "lucide-react";
import { hasPermission, Permission, getEffectiveRole } from "@/lib/permissions";

export default function DocumentsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [offerLetters, setOfferLetters] = useState<any[]>([]);
  const [selectedOfferLetter, setSelectedOfferLetter] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"ALL" | "OFFER_LETTERS" | "CERTIFICATES" | "POLICIES">("ALL");

  // Offer Letter Generation Modal State
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [targetUserId, setTargetUserId] = useState("");
  const [offerRole, setOfferRole] = useState("Core Engineer");
  const [offerDept, setOfferDept] = useState("Engineering");
  const [offerDuration, setOfferDuration] = useState("3 Months");
  const [offerJoiningDate, setOfferJoiningDate] = useState("2026-10-06");
  const [offerSalaryOrStipend, setOfferSalaryOrStipend] = useState("");
  const [generatingOffer, setGeneratingOffer] = useState(false);

  const canGenerate = user && hasPermission(user, Permission.GENERATE_OFFER_LETTERS);
  const canManageDocs = user && hasPermission(user, Permission.MANAGE_DOCUMENTS);

  const loadData = async () => {
    setLoading(true);
    try {
      const [docRes, offerRes] = await Promise.all([
        fetch("/api/documents"),
        fetch("/api/offer-letters"),
      ]);

      const docData = await docRes.json();
      const offerData = await offerRes.json();

      if (docData.success) setDocuments(docData.documents || []);
      if (offerData.success) {
        setOfferLetters(offerData.letters || []);
        if (offerData.letters?.length > 0 && !selectedOfferLetter) {
          setSelectedOfferLetter(offerData.letters[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (canGenerate) {
      fetch("/api/owner/accounts")
        .then((r) => r.json())
        .then((d) => {
          if (d.accounts) setAllUsers(d.accounts);
        })
        .catch(() => {});
    }
  }, [canGenerate]);

  const handleGenerateOfferLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId || !offerRole) return;
    setGeneratingOffer(true);
    try {
      const res = await fetch("/api/offer-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUserId,
          role: offerRole,
          department: offerDept,
          duration: offerDuration,
          joiningDate: offerJoiningDate,
          salaryOrStipend: offerSalaryOrStipend ? parseFloat(offerSalaryOrStipend) : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGenerateModalOpen(false);
        loadData();
        if (data.letter) setSelectedOfferLetter(data.letter);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingOffer(false);
    }
  };

  const vaultDocuments = documents.filter((d) => d.documentType !== "OFFER_LETTER");

  return (
    <TeamCoreShell
      title="Document Vault & Offer Letters"
      subtitle="Official agency documents, verified credentials, and intellectual property agreements"
      actions={
        canGenerate ? (
          <button
            onClick={() => setGenerateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-crimson/25 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Generate Offer Letter
          </button>
        ) : null
      }
    >
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* TABS HEADER - CLEARLY SEPARATED */}
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-2 overflow-x-auto text-xs font-mono">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab("OFFER_LETTERS");
            }}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === "OFFER_LETTERS"
                ? "bg-crimson text-white font-bold shadow-md shadow-crimson/20"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <Award className="w-3.5 h-3.5 text-bright-red" />
            Offer Letters ({offerLetters.length})
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab("ALL");
            }}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === "ALL"
                ? "bg-neutral-800 text-white font-bold"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Other Documents ({vaultDocuments.length})
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab("CERTIFICATES");
            }}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === "CERTIFICATES"
                ? "bg-neutral-800 text-white font-bold"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            Certificates & ID
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab("POLICIES");
            }}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === "POLICIES"
                ? "bg-neutral-800 text-white font-bold"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            Policies & NDAs
          </button>
        </div>

        {/* MAIN SPLIT: DOCUMENTS LIST & OFFER LETTER PREVIEW */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Document Vault Table (6 Cols) */}
          <div className="lg:col-span-6 space-y-4">
            <h3 className="text-sm font-orbitron font-bold uppercase tracking-wider text-white flex items-center gap-2">
              {activeTab === "OFFER_LETTERS" ? (
                <>
                  <Award className="w-4 h-4 text-bright-red" />
                  Official Offer Letters
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 text-bright-red" />
                  My Documents Vault
                </>
              )}
            </h3>

            {/* If in Offer Letters Tab */}
            {activeTab === "OFFER_LETTERS" ? (
              offerLetters.length === 0 ? (
                <div className="rounded-3xl bg-neutral-900/40 border border-neutral-800 p-8 text-center text-xs font-mono text-neutral-500">
                  No official offer letters issued yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {offerLetters.map((letter) => {
                    const isSelected = selectedOfferLetter?.id === letter.id;
                    return (
                      <div
                        key={letter.id}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                          isSelected
                            ? "bg-crimson/10 border-crimson/50 shadow-[0_0_15px_rgba(217,4,41,0.15)]"
                            : "bg-neutral-900/60 border-neutral-800/80 hover:border-neutral-700"
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-neutral-950 border border-crimson/30 flex items-center justify-center text-bright-red">
                            <Award className="w-5 h-5" />
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-orbitron font-bold text-white">
                              {letter.role} &bull; {letter.department}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-400">
                              <span className="text-bright-red font-semibold">{letter.offerNumber}</span>
                              <span>&bull;</span>
                              <span>Issued: {new Date(letter.issueDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {letter.verificationCode && (
                            <a
                              href={`/verify?code=${letter.verificationCode}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[10px] font-mono flex items-center gap-1 transition-all"
                            >
                              <Shield className="w-3 h-3 text-emerald-400" /> Verify
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOfferLetter(letter);
                              const previewEl = document.getElementById("offer-letter-view");
                              if (previewEl && window.innerWidth < 1024) {
                                previewEl.scrollIntoView({ behavior: "smooth" });
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-orbitron font-bold uppercase transition-all ${
                              isSelected
                                ? "bg-bright-red text-white shadow-md shadow-crimson/30"
                                : "bg-crimson/20 border border-crimson/40 text-bright-red hover:bg-crimson hover:text-white"
                            }`}
                          >
                            {isSelected ? "Viewing" : "Preview"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* Other Documents Vault View */
              vaultDocuments.length === 0 ? (
                <div className="rounded-3xl bg-neutral-900/40 border border-neutral-800 p-8 text-center text-xs font-mono text-neutral-500">
                  No documents found in this section.
                </div>
              ) : (
                <div className="space-y-3">
                  {vaultDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 sm:p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex items-center justify-between gap-4 group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-bright-red group-hover:scale-105 transition-transform">
                          {doc.documentType.includes("CERTIFICATE") ? (
                            <Award className="w-5 h-5" />
                          ) : (
                            <FileText className="w-5 h-5" />
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-orbitron font-bold text-white group-hover:text-bright-red transition-colors">
                            {doc.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-400">
                            <span>{doc.documentNumber || "CXA-DOC"}</span>
                            <span>&bull;</span>
                            <span>{new Date(doc.issuedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {doc.verificationCode && (
                          <a
                            href={`/verify?code=${doc.verificationCode}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[10px] font-mono flex items-center gap-1 transition-all"
                          >
                            <Shield className="w-3 h-3 text-emerald-400" /> Verify
                          </a>
                        )}
                        {doc.fileUrl && (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[10px] font-mono flex items-center gap-1 transition-all"
                          >
                            <Download className="w-3 h-3" /> Download
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Right: Selected Offer Letter Official Preview (6 Cols) */}
          <div className="lg:col-span-6">
            <div className="rounded-3xl bg-neutral-900/90 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-bright-red animate-pulse" />
                  <h3 className="text-sm font-orbitron font-bold uppercase tracking-wider text-white">
                    Official Offer Letter Preview
                  </h3>
                </div>
                {selectedOfferLetter && (
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-neutral-300 hover:text-white flex items-center gap-1.5 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print / PDF
                  </button>
                )}
              </div>

              {selectedOfferLetter ? (
                <div id="offer-letter-view" className="space-y-6 text-neutral-300 font-sans text-xs leading-relaxed">
                  {/* Agency Branding Header */}
                  <div className="flex items-start justify-between border-b border-neutral-800/80 pb-5">
                    <div>
                      <h2 className="text-xl font-orbitron font-black uppercase text-white tracking-wider">
                        CODEXA AGENCY
                      </h2>
                      <p className="text-[10px] font-mono text-neutral-400">
                        Elite Engineering & Autonomous AI Agency
                      </p>
                      <p className="text-[10px] font-mono text-neutral-500">
                        https://codxa-agency.online &bull; contact@codxa-agency.online
                      </p>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-neutral-500 block text-[10px] uppercase">Document ID</span>
                      <span className="text-bright-red font-bold text-xs">{selectedOfferLetter.offerNumber}</span>
                      <span className="text-[10px] text-neutral-400 block mt-1">
                        Date: {new Date(selectedOfferLetter.issueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Candidate Appointment Header */}
                  <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 space-y-1 font-mono text-xs">
                    <p className="text-neutral-400 text-[11px]">Appointment Recipient:</p>
                    <p className="text-white font-bold text-sm">
                      {selectedOfferLetter.user?.displayName || "Candidate Name"}
                    </p>
                    <p className="text-emerald-400">
                      Designation: {selectedOfferLetter.role} &bull; {selectedOfferLetter.department}
                    </p>
                    <p className="text-neutral-400 text-[11px]">
                      Effective Joining Date: {new Date(selectedOfferLetter.joiningDate).toLocaleDateString()}
                      {selectedOfferLetter.duration && ` &bull; Duration: ${selectedOfferLetter.duration}`}
                    </p>
                  </div>

                  {/* Body Text */}
                  <div className="space-y-3 font-sans text-neutral-300 text-xs leading-relaxed">
                    <p>
                      Dear <span className="text-white font-bold">{selectedOfferLetter.user?.displayName}</span>,
                    </p>
                    <p>
                      On behalf of the executive board of CodeXa Agency, we are thrilled to formally offer you the position of{" "}
                      <span className="text-white font-semibold">{selectedOfferLetter.role}</span> within our{" "}
                      <span className="text-white font-semibold">{selectedOfferLetter.department}</span> division.
                    </p>
                    <p>
                      Your contributions will directly power CodeXa&apos;s autonomous AI infrastructure, client engineering deliverables, and high-impact software deployments.
                    </p>

                    <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-xs text-neutral-200">
                      Monthly Compensation / Stipend:{" "}
                      {selectedOfferLetter.salaryOrStipend ? (
                        <span className="text-emerald-400 font-bold">
                          ₹{selectedOfferLetter.salaryOrStipend.toLocaleString()} INR
                        </span>
                      ) : (
                        <span className="text-neutral-400 font-semibold">
                          Not Assigned (Pending HR Update)
                        </span>
                      )}
                    </div>

                    <p className="text-neutral-400 text-[11px]">
                      {selectedOfferLetter.terms}
                    </p>
                  </div>

                  {/* Sign-off & Verification */}
                  <div className="pt-6 border-t border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-orbitron font-bold text-white">Ashu Chinthapalli</p>
                      <p className="text-[10px] font-mono text-neutral-400">Founder & CEO, CodeXa Agency</p>
                      <p className="text-[10px] font-mono text-neutral-500">Issued By: {selectedOfferLetter.issuedBy}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-neutral-950 border border-emerald-500/30 text-right font-mono">
                      <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block">
                        VERIFICATION CODE
                      </span>
                      <span className="text-bright-red font-bold text-xs">
                        {selectedOfferLetter.verificationCode}
                      </span>
                      <a
                        href={`/verify?code=${selectedOfferLetter.verificationCode}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] text-neutral-400 hover:text-white block mt-0.5"
                      >
                        codxa-agency.online/verify &rarr;
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-xs font-mono text-neutral-500">
                  Select an offer letter to preview document layout.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* GENERATE OFFER LETTER MODAL */}
      {generateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-neutral-900 border border-neutral-800 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <h3 className="text-base font-orbitron font-bold text-white uppercase">
                Generate Official Offer Letter
              </h3>
              <button
                onClick={() => setGenerateModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateOfferLetter} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1">
                  Candidate / Staff Member
                </label>
                <select
                  required
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs focus:outline-none focus:border-crimson"
                >
                  <option value="">Select Recipient...</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} (@{u.username}) &bull; {u.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Designation / Role
                  </label>
                  <input
                    type="text"
                    required
                    value={offerRole}
                    onChange={(e) => setOfferRole(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={offerDept}
                    onChange={(e) => setOfferDept(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    required
                    value={offerJoiningDate}
                    onChange={(e) => setOfferJoiningDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Duration (e.g. 3 Months)
                  </label>
                  <input
                    type="text"
                    value={offerDuration}
                    onChange={(e) => setOfferDuration(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1">
                  Stipend / Salary (₹)
                </label>
                <input
                  type="number"
                  value={offerSalaryOrStipend}
                  onChange={(e) => setOfferSalaryOrStipend(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setGenerateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-xs font-mono text-neutral-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generatingOffer}
                  className="px-5 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase transition-all shadow-lg shadow-crimson/25"
                >
                  {generatingOffer ? "Generating..." : "Generate Letter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </TeamCoreShell>
  );
}
