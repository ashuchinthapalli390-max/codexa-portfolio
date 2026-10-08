"use client";

import React, { useState, useEffect } from "react";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { useAuth } from "@/context/AuthContext";
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  GitBranch,
  Calendar,
  Clock,
  UserCheck,
  Award,
  MessageSquare,
  Sparkles,
  ChevronRight,
  X,
  Send,
  Eye,
  Check,
  Layers
} from "lucide-react";
import { getEffectiveRole } from "@/lib/permissions";

interface AssignmentItem {
  id: string;
  title: string;
  description: string;
  assignedBy?: string | null;
  assignedByName: string;
  domain: string;
  submissionType: string; // TEXT, REPOSITORY, BOTH
  dueDate: string;
  lateCutoff?: string | null;
  requirements?: string | null;
  status: string;
  createdAt: string;
  submittedCount?: number;
  approvedCount?: number;
  pendingCount?: number;
  revisionCount?: number;
}

interface SubmissionItem {
  id: string;
  assignmentId: string;
  userId: string;
  userName: string;
  userRole: string;
  internId?: string | null;
  submissionType: string;
  textContent?: string | null;
  repositoryUrl?: string | null;
  branch?: string | null;
  commitSha?: string | null;
  notes?: string | null;
  revision: number;
  status: string; // SUBMITTED, UNDER_REVIEW, REVISION_REQUESTED, APPROVED, GRADED
  grade?: string | null;
  feedback?: string | null;
  reviewerId?: string | null;
  reviewerName?: string | null;
  reviewedAt?: string | null;
  submittedAt: string;
  assignment?: {
    title: string;
    domain: string;
    dueDate: string;
    submissionType: string;
  };
}

const DOMAINS = [
  "All Domains",
  "Full-Stack Development with AI",
  "AI & Machine Learning",
  "Ethical Hacking",
  "Generative AI & AI Agents",
  "Web Development",
  "Programming Full Stack — Python",
  "Programming Full Stack — Java",
  "Cybersecurity — Ethical Hacking + Penetration Testing",
];

export default function AssignmentControlCenterPage() {
  const { user } = useAuth();
  const effectiveRole = user ? getEffectiveRole(user) : "EMPLOYEE";
  const canManage = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN"].includes(effectiveRole);

  const [activeTab, setActiveTab] = useState<"ASSIGNMENTS" | "SUBMISSIONS">("ASSIGNMENTS");
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionFilter, setSubmissionFilter] = useState("ALL");
  const [selectedDomain, setSelectedDomain] = useState("All Domains");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Assignment Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState("All Domains");
  const [submissionType, setSubmissionType] = useState("BOTH");
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [lateCutoff, setLateCutoff] = useState("");
  const [requirements, setRequirements] = useState("");

  // Review Modal State
  const [reviewModalSub, setReviewModalSub] = useState<SubmissionItem | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVE" | "REVISION_REQUESTED" | "GRADED">("APPROVE");
  const [gradeInput, setGradeInput] = useState("A+");
  const [feedbackInput, setFeedbackInput] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [asgRes, subRes] = await Promise.all([
        fetch("/api/admin/assignments").then((r) => r.json()),
        fetch("/api/admin/assignments/submissions").then((r) => r.json()),
      ]);

      if (asgRes.ok && Array.isArray(asgRes.assignments)) {
        setAssignments(asgRes.assignments);
      }
      if (subRes.ok && Array.isArray(subRes.submissions)) {
        setSubmissions(subRes.submissions);
      }
    } catch (e) {
      console.error("Failed to load assignment data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!title || !description || !dueDate) {
      setCreateError("Title, instructions, and due date are required.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          domain,
          submissionType,
          dueDate: new Date(dueDate).toISOString(),
          lateCutoff: lateCutoff ? new Date(lateCutoff).toISOString() : null,
          requirements,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setCreateModalOpen(false);
        setTitle("");
        setDescription("");
        setRequirements("");
        await fetchData();
      } else {
        setCreateError(data.error || "Failed to create assignment.");
      }
    } catch (err: any) {
      setCreateError(err.message || "An unexpected error occurred.");
    } finally {
      setCreating(false);
    }
  };

  const handleReviewSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalSub) return;
    setReviewing(true);
    try {
      const res = await fetch("/api/admin/assignments/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: reviewModalSub.id,
          status: reviewAction === "APPROVE" ? "APPROVED" : reviewAction,
          grade: reviewAction === "GRADED" || reviewAction === "APPROVE" ? gradeInput : null,
          feedback: feedbackInput,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setSubmissions((prev) =>
          prev.map((s) => (s.id === reviewModalSub.id ? { ...s, ...data.submission } : s))
        );
        setReviewModalSub(null);
        setFeedbackInput("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReviewing(false);
    }
  };

  const filteredAssignments = assignments.filter((a) => {
    if (selectedDomain !== "All Domains" && a.domain !== selectedDomain) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredSubmissions = submissions.filter((s) => {
    if (submissionFilter !== "ALL" && s.status !== submissionFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.userName.toLowerCase().includes(q) ||
        (s.internId && s.internId.toLowerCase().includes(q)) ||
        (s.assignment?.title && s.assignment.title.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const pendingSubmissionsCount = submissions.filter(
    (s) => s.status === "SUBMITTED" || s.status === "UNDER_REVIEW"
  ).length;

  return (
    <TeamCoreShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1f2228] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-red-400 mb-1">
              <FileText className="w-4 h-4" />
              <span>CODEXA ASSIGNMENT & PRACTICAL WORKSPACE</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              Assignments & Practical Reviews
              {pendingSubmissionsCount > 0 && (
                <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/40 px-2.5 py-0.5 rounded-full font-mono animate-pulse">
                  {pendingSubmissionsCount} Pending Review
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Issue text/repository assignments, review student code revisions, submit feedback, and grade submissions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-[#14161a] border border-[#232730] hover:bg-[#1a1d24] text-gray-300 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            {canManage && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white flex items-center gap-2 shadow-lg shadow-red-900/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                New Assignment
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs & Search */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex bg-[#0f1115] p-1 rounded-lg border border-[#1e222a]">
            <button
              onClick={() => setActiveTab("ASSIGNMENTS")}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${
                activeTab === "ASSIGNMENTS"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Active Assignments ({assignments.length})
            </button>

            <button
              onClick={() => setActiveTab("SUBMISSIONS")}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${
                activeTab === "SUBMISSIONS"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Student Submissions ({submissions.length})
              {pendingSubmissionsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {activeTab === "ASSIGNMENTS" ? (
              <div className="flex items-center gap-2 bg-[#0f1115] border border-[#1e222a] px-3 py-1.5 rounded-lg text-xs">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  className="bg-transparent text-gray-300 outline-none cursor-pointer"
                >
                  {DOMAINS.map((d) => (
                    <option key={d} value={d} className="bg-[#14161a] text-white">
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-[#0f1115] border border-[#1e222a] px-3 py-1.5 rounded-lg text-xs">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={submissionFilter}
                  onChange={(e) => setSubmissionFilter(e.target.value)}
                  className="bg-transparent text-gray-300 outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-[#14161a] text-white">All Statuses</option>
                  <option value="SUBMITTED" className="bg-[#14161a] text-white">Pending Review</option>
                  <option value="APPROVED" className="bg-[#14161a] text-white">Approved</option>
                  <option value="REVISION_REQUESTED" className="bg-[#14161a] text-white">Revision Requested</option>
                  <option value="GRADED" className="bg-[#14161a] text-white">Graded</option>
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 bg-[#0f1115] border border-[#1e222a] px-3 py-1.5 rounded-lg text-xs flex-1 md:w-60">
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-white outline-none w-full placeholder:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Tab 1: Active Assignments */}
        {activeTab === "ASSIGNMENTS" && (
          <div>
            {loading ? (
              <div className="flex items-center justify-center p-16 text-gray-400 gap-3">
                <RefreshCw className="w-5 h-5 animate-spin text-red-500" />
                <span>Loading assignments...</span>
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="bg-[#0f1115] border border-[#1e222a] rounded-2xl p-12 text-center">
                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-white">No assignments found</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                  Create an assignment to distribute coding tasks to interns.
                </p>
                {canManage && (
                  <button
                    onClick={() => setCreateModalOpen(true)}
                    className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white inline-flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create First Assignment
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAssignments.map((a) => {
                  const dDateStr = a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "No deadline";

                  return (
                    <div
                      key={a.id}
                      className="bg-[#0f1115] border border-[#1e222a] hover:border-[#2a2f3a] rounded-xl p-5 flex flex-col justify-between transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161920] border border-[#232732] text-gray-300">
                            {a.domain}
                          </span>

                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 font-semibold uppercase">
                            {a.submissionType} FORMAT
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-white tracking-tight line-clamp-1">
                          {a.title}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          {a.description}
                        </p>

                        <div className="space-y-1 text-xs text-gray-400 mt-4 border-t border-[#181a20] pt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Deadline:</span>
                            <span className="font-mono text-gray-300 font-semibold">{dDateStr}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Author:</span>
                            <span className="text-gray-300">{a.assignedByName}</span>
                          </div>
                        </div>

                        {/* Submission status breakdown */}
                        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                          <div className="bg-[#14171d] p-2 rounded-lg border border-[#1f222a]">
                            <div className="text-xs text-gray-500">Submitted</div>
                            <div className="text-sm font-bold text-white font-mono">{a.submittedCount || 0}</div>
                          </div>
                          <div className="bg-[#14171d] p-2 rounded-lg border border-[#1f222a]">
                            <div className="text-xs text-gray-500">Pending</div>
                            <div className="text-sm font-bold text-yellow-400 font-mono">{a.pendingCount || 0}</div>
                          </div>
                          <div className="bg-[#14171d] p-2 rounded-lg border border-[#1f222a]">
                            <div className="text-xs text-gray-500">Approved</div>
                            <div className="text-sm font-bold text-emerald-400 font-mono">{a.approvedCount || 0}</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-[#181a20] flex items-center justify-end">
                        <button
                          onClick={() => {
                            setActiveTab("SUBMISSIONS");
                            setSearchQuery(a.title);
                          }}
                          className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
                        >
                          View Submissions
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Student Submissions Review */}
        {activeTab === "SUBMISSIONS" && (
          <div>
            {loading ? (
              <div className="flex items-center justify-center p-16 text-gray-400 gap-3">
                <RefreshCw className="w-5 h-5 animate-spin text-red-500" />
                <span>Loading submissions...</span>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="bg-[#0f1115] border border-[#1e222a] rounded-2xl p-12 text-center">
                <UserCheck className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-white">No submissions found</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                  When interns submit solutions from the mobile app, they will appear here for review.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSubmissions.map((s) => {
                  const sDate = new Date(s.submittedAt).toLocaleString();

                  return (
                    <div
                      key={s.id}
                      className="bg-[#0f1115] border border-[#1e222a] hover:border-[#2a2f3a] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{s.userName}</span>
                          {s.internId && (
                            <span className="text-[11px] font-mono text-gray-400 bg-[#161820] px-1.5 py-0.5 rounded border border-[#232732]">
                              {s.internId}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-500 font-mono">
                            Rev #{s.revision} • {sDate}
                          </span>
                        </div>

                        <div className="text-xs text-red-400 font-medium">
                          Assignment: {s.assignment?.title || s.assignmentId}
                        </div>

                        {/* Submission payload preview */}
                        {s.submissionType === "REPOSITORY" && s.repositoryUrl && (
                          <div className="flex items-center gap-2 text-xs">
                            <GitBranch className="w-3.5 h-3.5 text-gray-400" />
                            <a
                              href={s.repositoryUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-400 hover:underline flex items-center gap-1 font-mono text-xs"
                            >
                              {s.repositoryUrl}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            {s.branch && <span className="text-gray-500 font-mono">({s.branch})</span>}
                          </div>
                        )}

                        {s.submissionType === "TEXT" && s.textContent && (
                          <p className="text-xs text-gray-300 line-clamp-2 bg-[#14171d] p-2 rounded border border-[#1f222a]">
                            {s.textContent}
                          </p>
                        )}

                        {s.feedback && (
                          <div className="text-[11px] text-gray-400 italic bg-[#161920] px-2 py-1 rounded border border-[#232732]">
                            Mentor Feedback: {s.feedback}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`text-xs font-mono font-semibold px-2.5 py-1 rounded ${
                            s.status === "APPROVED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : s.status === "REVISION_REQUESTED"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              : s.status === "GRADED"
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                          }`}
                        >
                          {s.status}
                          {s.grade && ` (${s.grade})`}
                        </span>

                        {canManage && (
                          <button
                            onClick={() => {
                              setReviewModalSub(s);
                              setFeedbackInput(s.feedback || "");
                              setGradeInput(s.grade || "A+");
                            }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5"
                          >
                            <Award className="w-3.5 h-3.5" />
                            Review
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Create Assignment Modal */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#0f1115] border border-[#222630] rounded-2xl max-w-xl w-full p-6 my-8 shadow-2xl relative">
              <button
                onClick={() => setCreateModalOpen(false)}
                className="absolute top-5 right-5 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-xs font-mono text-red-400 mb-1">
                <FileText className="w-4 h-4" />
                <span>NEW PRACTICAL ASSIGNMENT</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-4">Publish Assignment to Mobile App</h2>

              {createError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <form onSubmit={handleCreateAssignment} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1 font-medium">Assignment Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Implement Microservices Database Pooler & JWT Validation"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#14171d] border border-[#232732] rounded-lg px-3 py-2 text-white outline-none focus:border-red-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1 font-medium">Domain Track *</label>
                    <select
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="w-full bg-[#14171d] border border-[#232732] rounded-lg px-3 py-2 text-white outline-none focus:border-red-500"
                    >
                      {DOMAINS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-medium">Submission Format *</label>
                    <select
                      value={submissionType}
                      onChange={(e) => setSubmissionType(e.target.value)}
                      className="w-full bg-[#14171d] border border-[#232732] rounded-lg px-3 py-2 text-white outline-none focus:border-red-500"
                    >
                      <option value="REPOSITORY">GitHub / Git Repository URL</option>
                      <option value="TEXT">Written Text / Analysis Response</option>
                      <option value="BOTH">Both (Repo or Text allowed)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1 font-medium">Due Date & Time *</label>
                    <input
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-[#14171d] border border-[#232732] rounded-lg px-3 py-2 text-white outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-medium">Late Cutoff (Optional)</label>
                    <input
                      type="date"
                      value={lateCutoff}
                      onChange={(e) => setLateCutoff(e.target.value)}
                      className="w-full bg-[#14171d] border border-[#232732] rounded-lg px-3 py-2 text-white outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-medium">Instructions & Overview *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe the objective, tools to use, and step-by-step deliverable expectations."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#14171d] border border-[#232732] rounded-lg px-3 py-2 text-white outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-medium">Requirements & Acceptance Criteria</label>
                  <textarea
                    rows={2}
                    placeholder="- Must contain passing unit tests&#10;- Strict TypeScript without any type suppressions&#10;- Clean commit history"
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    className="w-full bg-[#14171d] border border-[#232732] rounded-lg px-3 py-2 text-white outline-none focus:border-red-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1e222a]">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-[#14161a] border border-[#232730] text-gray-300 hover:text-white"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={creating}
                    className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center gap-2"
                  >
                    {creating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Publish Assignment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Review Submission Modal */}
        {reviewModalSub && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0f1115] border border-[#222630] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
              <button
                onClick={() => setReviewModalSub(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-xs font-mono text-red-400 mb-1">
                <Award className="w-3.5 h-3.5" />
                <span>EVALUATE PRACTICAL WORK</span>
              </div>
              <h2 className="text-lg font-bold text-white mb-1">
                Review {reviewModalSub.userName}&apos;s Submission
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                Revision #{reviewModalSub.revision} • Submitted on {new Date(reviewModalSub.submittedAt).toLocaleDateString()}
              </p>

              {/* Submission details display */}
              <div className="mb-4 p-3 bg-[#14171d] rounded-lg border border-[#232732] space-y-2 text-xs">
                {reviewModalSub.repositoryUrl && (
                  <div>
                    <span className="text-gray-500 block mb-0.5">Repository URL:</span>
                    <a
                      href={reviewModalSub.repositoryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1 font-mono break-all"
                    >
                      {reviewModalSub.repositoryUrl}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                )}

                {reviewModalSub.textContent && (
                  <div>
                    <span className="text-gray-500 block mb-0.5">Written Solution:</span>
                    <p className="text-gray-200 whitespace-pre-wrap max-h-36 overflow-y-auto">
                      {reviewModalSub.textContent}
                    </p>
                  </div>
                )}
              </div>

              <form onSubmit={handleReviewSubmission} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1 font-medium">Decision *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "APPROVE", label: "Approve" },
                      { id: "REVISION_REQUESTED", label: "Request Changes" },
                      { id: "GRADED", label: "Grade Only" },
                    ].map((act) => (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => setReviewAction(act.id as any)}
                        className={`p-2 rounded-lg border text-center font-semibold transition-all ${
                          reviewAction === act.id
                            ? "bg-red-600 text-white border-red-500"
                            : "bg-[#14161a] text-gray-300 border-[#232730]"
                        }`}
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1 font-medium">Grade / Rating</label>
                    <input
                      type="text"
                      placeholder="e.g. A+, 95/100, Excellent"
                      value={gradeInput}
                      onChange={(e) => setGradeInput(e.target.value)}
                      className="w-full bg-[#14171d] border border-[#232732] rounded-lg px-3 py-2 text-white outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-medium">Feedback & Review Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Provide constructive feedback for the student..."
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    className="w-full bg-[#14171d] border border-[#232732] rounded-lg px-3 py-2 text-white outline-none focus:border-red-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewModalSub(null)}
                    className="px-4 py-2 rounded-lg bg-[#14161a] border border-[#232730] text-gray-300"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={reviewing}
                    className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center gap-2"
                  >
                    {reviewing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Confirm Decision
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </TeamCoreShell>
  );
}
