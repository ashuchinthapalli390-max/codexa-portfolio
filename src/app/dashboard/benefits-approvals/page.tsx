"use client";

import React, { useState, useEffect } from "react";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { useAuth } from "@/context/AuthContext";
import {
  Shield, Check, X, Clock, AlertCircle, RefreshCw, Eye, Sparkles,
  UserCheck, ExternalLink, Filter, Loader2, Send
} from "lucide-react";

interface IdCardSubmission {
  id: string;
  user_id: string;
  image_url: string;
  version: number;
  status: string;
  rejection_reason?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  submitted_at: string;
  full_name: string;
  username: string;
  email: string;
  intern_id?: string | null;
  employee_id?: string | null;
  department?: string | null;
}

interface AiAccessRequest {
  id: string;
  user_id: string;
  resource_type: string;
  reason?: string | null;
  status: string;
  reviewer_decision?: string | null;
  reviewer_notes?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  provisioning_status?: string | null;
  provisioned_at?: string | null;
  activation_instructions?: string | null;
  requested_at: string;
  full_name: string;
  username: string;
  email: string;
  intern_id?: string | null;
  employee_id?: string | null;
  department?: string | null;
}

export default function BenefitsApprovalsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"ID_CARD" | "AI_ACCESS">("ID_CARD");

  const [idSubmissions, setIdSubmissions] = useState<IdCardSubmission[]>([]);
  const [aiRequests, setAiRequests] = useState<AiAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modals state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectType, setRejectType] = useState<"ID_CARD" | "AI_ACCESS">("ID_CARD");

  const [provisionModalId, setProvisionModalId] = useState<string | null>(null);
  const [activationInstructions, setActivationInstructions] = useState(
    "Gemini Pro access activated on official CodeXa Workspace account. Log in with your registered CodeXa email."
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const [idRes, aiRes] = await Promise.all([
        fetch("/api/admin/benefits/id-card").then(r => r.json()),
        fetch("/api/admin/benefits/ai-access-requests").then(r => r.json()),
      ]);

      if (idRes.submissions) setIdSubmissions(idRes.submissions);
      if (aiRes.requests) setAiRequests(aiRes.requests);
    } catch (e) {
      console.error("Failed to load benefits approvals:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleIdCardAction = async (submissionId: string, action: string, reason?: string) => {
    setActionLoading(submissionId);
    try {
      const res = await fetch("/api/admin/benefits/id-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, action, rejectionReason: reason }),
      });
      const data = await res.json();
      if (data.ok) {
        fetchData();
        setRejectModalId(null);
        setRejectionReason("");
      } else {
        alert(data.error || "Action failed");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAiRequestAction = async (requestId: string, action: string, notes?: string, instructions?: string) => {
    setActionLoading(requestId);
    try {
      const res = await fetch("/api/admin/benefits/ai-access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          action,
          notes,
          activationInstructions: instructions,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        fetchData();
        setRejectModalId(null);
        setRejectionReason("");
        setProvisionModalId(null);
      } else {
        alert(data.error || "Action failed");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <TeamCoreShell>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0C0C0C] p-6 rounded-2xl border border-white/10 shadow-2xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-[#D90429]/20 text-[#D90429]">
                <Shield className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold tracking-wider font-orbitron text-white">
                POST-PAYMENT BENEFITS APPROVAL CENTER
              </h1>
            </div>
            <p className="text-xs text-neutral-400">
              Founder & Co-Founder review center for ₹450 Paid Intern Benefits (ID Card Photos & Gemini Pro Access).
            </p>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-xs text-neutral-300 rounded-xl border border-white/10 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Queue
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 border-b border-white/10 pb-2">
          <button
            onClick={() => setActiveTab("ID_CARD")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold font-orbitron tracking-wide transition ${
              activeTab === "ID_CARD"
                ? "bg-[#D90429] text-white shadow-lg shadow-[#D90429]/20"
                : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            ID CARD PHOTOS
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/40 text-white font-mono">
              {idSubmissions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("AI_ACCESS")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold font-orbitron tracking-wide transition ${
              activeTab === "AI_ACCESS"
                ? "bg-[#D90429] text-white shadow-lg shadow-[#D90429]/20"
                : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            GEMINI PRO ACCESS REQUESTS
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/40 text-white font-mono">
              {aiRequests.length}
            </span>
          </button>
        </div>

        {/* TAB 1: ID CARD PHOTO SUBMISSIONS */}
        {activeTab === "ID_CARD" && (
          <div className="bg-[#0C0C0C] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-12 text-center text-neutral-500 flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-[#D90429]" />
                <span className="text-xs">Loading submitted photos...</span>
              </div>
            ) : idSubmissions.length === 0 ? (
              <div className="p-12 text-center text-neutral-500 text-xs">
                No ID Card photo submissions pending review.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-950/80 border-b border-white/10 text-neutral-400 font-orbitron uppercase text-[10px] tracking-wider">
                      <th className="p-4">Intern Details</th>
                      <th className="p-4">Submitted Photo</th>
                      <th className="p-4">Revision</th>
                      <th className="p-4">Current Status</th>
                      <th className="p-4">Reviewer</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-neutral-200">
                    {idSubmissions.map((sub) => {
                      const isPending = sub.status === "SUBMITTED" || sub.status === "UNDER_REVIEW";
                      return (
                        <tr key={sub.id} className="hover:bg-white/[0.02] transition">
                          <td className="p-4">
                            <div className="font-bold text-white text-sm">{sub.full_name || sub.username}</div>
                            <div className="text-neutral-400 text-[11px]">ID: {sub.intern_id || sub.employee_id || "CXA-INT"}</div>
                            <div className="text-neutral-500 text-[10px]">{sub.email}</div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={sub.image_url}
                                alt="ID portrait"
                                className="w-14 h-18 object-cover rounded-lg border border-white/20 shadow-md cursor-pointer hover:opacity-80 transition"
                                onClick={() => setSelectedImage(sub.image_url)}
                              />
                              <button
                                onClick={() => setSelectedImage(sub.image_url)}
                                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 text-[10px] flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" /> Full
                              </button>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded-md bg-white/10 text-[11px] font-mono">
                              v{sub.version}
                            </span>
                            <div className="text-neutral-500 text-[10px] mt-1">
                              {new Date(sub.submitted_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${
                              sub.status === "APPROVED"
                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                : sub.status === "REJECTED"
                                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                  : sub.status === "ID_CARD_READY" || sub.status === "ID_CARD_ISSUED"
                                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            }`}>
                              {sub.status}
                            </span>
                            {sub.rejection_reason && (
                              <div className="text-red-400 text-[10px] mt-1 max-w-xs">
                                Reason: {sub.rejection_reason}
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-neutral-400 text-[11px]">
                            {sub.reviewed_by_name || "—"}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {sub.status !== "APPROVED" && (
                                <button
                                  onClick={() => handleIdCardAction(sub.id, "APPROVE")}
                                  disabled={actionLoading === sub.id}
                                  className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-md shadow-green-900/30"
                                >
                                  <Check className="w-3 h-3" /> Approve
                                </button>
                              )}
                              {sub.status !== "REJECTED" && (
                                <button
                                  onClick={() => {
                                    setRejectModalId(sub.id);
                                    setRejectType("ID_CARD");
                                  }}
                                  disabled={actionLoading === sub.id}
                                  className="px-3 py-1.5 bg-red-600/30 hover:bg-red-600 text-red-200 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1 border border-red-500/40"
                                >
                                  <X className="w-3 h-3" /> Reject
                                </button>
                              )}
                              {sub.status === "APPROVED" && (
                                <button
                                  onClick={() => handleIdCardAction(sub.id, "SET_READY")}
                                  disabled={actionLoading === sub.id}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition"
                                >
                                  Set Ready
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AI ACCESS REQUESTS */}
        {activeTab === "AI_ACCESS" && (
          <div className="bg-[#0C0C0C] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-12 text-center text-neutral-500 flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-[#D90429]" />
                <span className="text-xs">Loading AI access requests...</span>
              </div>
            ) : aiRequests.length === 0 ? (
              <div className="p-12 text-center text-neutral-500 text-xs">
                No Gemini Pro access requests pending review.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-950/80 border-b border-white/10 text-neutral-400 font-orbitron uppercase text-[10px] tracking-wider">
                      <th className="p-4">Intern</th>
                      <th className="p-4">Payment Verification</th>
                      <th className="p-4">Requested Resource</th>
                      <th className="p-4">Purpose / Reason</th>
                      <th className="p-4">Request Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-neutral-200">
                    {aiRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-white/[0.02] transition">
                        <td className="p-4">
                          <div className="font-bold text-white text-sm">{req.full_name || req.username}</div>
                          <div className="text-neutral-400 text-[11px]">ID: {req.intern_id || req.employee_id || "CXA-INT"}</div>
                          <div className="text-neutral-500 text-[10px]">{req.email}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-green-400 font-bold text-xs">
                            <Check className="w-3.5 h-3.5" /> ₹450 PAID
                          </div>
                          <div className="text-neutral-500 text-[10px]">AI Tools ₹300 verified</div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-purple-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Gemini Pro Access
                          </div>
                          <div className="text-neutral-500 text-[10px]">
                            {new Date(req.requested_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-4 max-w-xs">
                          <div className="text-neutral-300 text-xs italic bg-neutral-900/50 p-2 rounded-lg border border-white/5">
                            &ldquo;{req.reason || "General internship coding assistance"}&rdquo;
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${
                            req.status === "ACCESS_GRANTED"
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : req.status === "APPROVED_PENDING_PROVISIONING"
                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                : req.status === "REJECTED"
                                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                  : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}>
                            {req.status}
                          </span>
                          {req.reviewer_notes && (
                            <div className="text-neutral-400 text-[10px] mt-1">
                              Note: {req.reviewer_notes}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {req.status === "PENDING_APPROVAL" && (
                              <button
                                onClick={() => handleAiRequestAction(req.id, "APPROVE")}
                                disabled={actionLoading === req.id}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-md shadow-green-900/30"
                              >
                                <Check className="w-3 h-3" /> Approve
                              </button>
                            )}

                            {req.status === "APPROVED_PENDING_PROVISIONING" && (
                              <button
                                onClick={() => setProvisionModalId(req.id)}
                                disabled={actionLoading === req.id}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-md shadow-purple-900/30"
                              >
                                <Sparkles className="w-3 h-3" /> Grant Access
                              </button>
                            )}

                            {req.status !== "REJECTED" && (
                              <button
                                onClick={() => {
                                  setRejectModalId(req.id);
                                  setRejectType("AI_ACCESS");
                                }}
                                disabled={actionLoading === req.id}
                                className="px-3 py-1.5 bg-red-600/30 hover:bg-red-600 text-red-200 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1 border border-red-500/40"
                              >
                                <X className="w-3 h-3" /> Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* IMAGE PREVIEW MODAL */}
        {selectedImage && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <div className="relative max-w-md w-full bg-[#111] p-4 rounded-2xl border border-white/20 text-center space-y-4">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-3 right-3 p-2 bg-neutral-900 text-white rounded-full hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="text-sm font-bold font-orbitron text-white">ID Card Photo Portrait</h3>
              <img
                src={selectedImage}
                alt="Enlarged portrait"
                className="w-full max-h-[460px] object-cover rounded-xl border border-white/10"
              />
              <div className="text-xs text-neutral-400">Portrait verified for 3:4 ID Card layout.</div>
            </div>
          </div>
        )}

        {/* REJECT REASON MODAL */}
        {rejectModalId && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#111] p-6 rounded-2xl border border-white/20 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold font-orbitron text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {rejectType === "ID_CARD" ? "Reject ID Card Photo" : "Reject Gemini Pro Request"}
                </h3>
                <button onClick={() => setRejectModalId(null)} className="text-neutral-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-neutral-400">
                Provide a clear reason for the intern so they understand the decision or can resubmit:
              </p>

              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={
                  rejectType === "ID_CARD"
                    ? "e.g. Image blurry, face not centered, inappropriate filter used. Please upload a clear passport-style portrait."
                    : "e.g. Currently waitlisted until next capacity window opens."
                }
                className="w-full h-24 p-3 bg-neutral-900 text-xs text-white rounded-xl border border-white/10 focus:border-[#D90429] outline-none"
              />

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setRejectModalId(null)}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (rejectType === "ID_CARD") {
                      handleIdCardAction(rejectModalId, "REJECT", rejectionReason);
                    } else {
                      handleAiRequestAction(rejectModalId, "REJECT", rejectionReason);
                    }
                  }}
                  disabled={!rejectionReason.trim()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PROVISION ACCESS MODAL */}
        {provisionModalId && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#111] p-6 rounded-2xl border border-white/20 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold font-orbitron text-purple-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Grant Gemini Pro Access
                </h3>
                <button onClick={() => setProvisionModalId(null)} className="text-neutral-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-neutral-400">
                Enter activation instructions or invitation link for the intern. The student will receive this in their mobile app and email:
              </p>

              <textarea
                value={activationInstructions}
                onChange={(e) => setActivationInstructions(e.target.value)}
                className="w-full h-24 p-3 bg-neutral-900 text-xs text-white rounded-xl border border-white/10 focus:border-purple-500 outline-none"
              />

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setProvisionModalId(null)}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAiRequestAction(provisionModalId, "MARK_PROVISIONED", undefined, activationInstructions)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Confirm & Provision Access
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TeamCoreShell>
  );
}
