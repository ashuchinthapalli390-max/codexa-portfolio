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
  Layers,
  ShieldAlert,
  Play,
  BookOpen
} from "lucide-react";
import { getEffectiveRole } from "@/lib/permissions";

interface AssignmentItem {
  id: string;
  sourceKey?: string | null;
  title: string;
  description: string;
  assignedByName: string;
  domain: string;
  attendingDomains?: string[] | null;
  classId?: string | null;
  dueDate: string;
  releaseAt?: string | null;
  publishedAt?: string | null;
  evidenceRequired?: string | null;
  status: string; // DRAFT, PUBLISHED, ACTIVE, CLOSED
  class?: {
    id: string;
    sourceKey?: string;
    sequenceNumber?: number;
    title: string;
    classDate: string;
    status: string;
  } | null;
  submittedCount?: number;
  approvedCount?: number;
  pendingCount?: number;
  revisionCount?: number;
  submissions?: any[];
  mySubmission?: any;
  isStudentExcused?: boolean;
  excuseReason?: string;
}

const DOMAIN_OPTIONS = [
  { code: "ALL", label: "All Domains" },
  { code: "FS_AI", label: "Full-Stack Development with AI (3m)" },
  { code: "PY", label: "Programming Full Stack - Python (6m)" },
  { code: "AIML", label: "AI & Machine Learning (6m)" },
  { code: "CY2", label: "Cybersecurity (2m)" },
  { code: "PENTEST", label: "Ethical Hacking + Penetration Testing (9m)" },
  { code: "AI9", label: "AI & ML + Generative AI & AI Agents (9m)" },
  { code: "ETH", label: "Ethical Hacking (6m)" },
  { code: "AG3", label: "Generative AI & AI Agents (3m)" },
  { code: "MOBILE", label: "Mobile App Development (3m)" },
  { code: "JAVA", label: "Programming Full Stack - Java (6m)" },
  { code: "UIUX", label: "UI/UX Design (3m)" },
  { code: "WEB", label: "Web Development (6m)" },
];

export default function AssignmentControlCenterPage() {
  const { user } = useAuth();
  const effectiveRole = user ? getEffectiveRole(user) : "EMPLOYEE";
  const canManage = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN", "INSTRUCTOR"].includes(effectiveRole);

  const [activeTab, setActiveTab] = useState<"ASSIGNMENTS" | "SUBMISSIONS">("ASSIGNMENTS");
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Submit Modal for Intern
  const [submitModalAssignment, setSubmitModalAssignment] = useState<AssignmentItem | null>(null);
  const [textContent, setTextContent] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Review Modal for Trainer
  const [reviewModalSubmission, setReviewModalSubmission] = useState<any | null>(null);
  const [gradeInput, setGradeInput] = useState("A");
  const [feedbackInput, setFeedbackInput] = useState("");
  const [isGrading, setIsGrading] = useState(false);

  // Release Worker Action
  const [releaseChecking, setReleaseChecking] = useState(false);
  const [releaseMessage, setReleaseMessage] = useState<string | null>(null);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/assignments?domain=${encodeURIComponent(selectedDomain)}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.assignments)) {
        setAssignments(data.assignments);
      }
    } catch (err) {
      console.error("Failed to load assignments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [selectedDomain]);

  // Run Assignment Release Worker
  const runReleaseWorker = async () => {
    setReleaseChecking(true);
    setReleaseMessage(null);
    try {
      const res = await fetch("/api/admin/assignments/release-check", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setReleaseMessage(`Release Check Complete: ${data.releasedCount} assignments unlocked.`);
        fetchAssignments();
      } else {
        setReleaseMessage("Error: " + data.error);
      }
    } catch (err: any) {
      setReleaseMessage("Error: " + err.message);
    } finally {
      setReleaseChecking(false);
    }
  };

  // Submit Homework (Intern)
  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitModalAssignment) return;
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    try {
      const res = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT",
          assignmentId: submitModalAssignment.id,
          textContent,
          repositoryUrl,
          notes: submissionNotes
        })
      });
      const data = await res.json();
      if (data.ok) {
        setSubmitSuccess("Assignment submitted successfully!");
        setTextContent("");
        setRepositoryUrl("");
        setSubmissionNotes("");
        fetchAssignments();
      } else {
        setSubmitError(data.error || "Failed to submit assignment");
      }
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit assignment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Grade Homework (Trainer)
  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalSubmission) return;
    setIsGrading(true);
    try {
      const res = await fetch("/api/admin/assignments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: reviewModalSubmission.id,
          grade: gradeInput,
          feedback: feedbackInput
        })
      });
      const data = await res.json();
      if (data.ok) {
        setReviewModalSubmission(null);
        fetchAssignments();
      } else {
        alert(data.error || "Failed to evaluate submission");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsGrading(false);
    }
  };

  // Filter assignments
  const filteredAssignments = assignments.filter((a) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = a.title.toLowerCase().includes(q);
      const matchDesc = a.description.toLowerCase().includes(q);
      const matchKey = a.sourceKey?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchKey) return false;
    }
    return true;
  });

  // Collect all submissions for trainer view
  const allSubmissions = assignments.flatMap((a) =>
    (a.submissions || []).map((s) => ({
      ...s,
      assignmentTitle: a.title,
      assignmentDomain: a.domain,
      classTitle: a.class?.title,
      dueDate: a.dueDate
    }))
  );

  return (
    <TeamCoreShell>
      <div className="min-h-screen bg-black text-white p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-950 to-black border border-red-800/40 shadow-lg shadow-red-950/40">
              <FileText className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                Internship Assignment Portal
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-950/60 border border-red-800/50 text-red-300 font-mono">
                  Post-Class Release
                </span>
              </h1>
              <p className="text-sm text-zinc-400 mt-0.5">
                Released daily at 9:35 PM IST strictly after live class completion • 2-Day Deadline
              </p>
            </div>
          </div>

          {canManage && (
            <div className="flex items-center gap-2">
              <button
                onClick={runReleaseWorker}
                disabled={releaseChecking}
                className="px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-all"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                {releaseChecking ? "Checking..." : "Evaluate HW Release"}
              </button>

              <button
                onClick={fetchAssignments}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {releaseMessage && (
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-emerald-300">
            {releaseMessage}
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 flex flex-col md:flex-row gap-3 justify-between items-center">
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <Filter className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs text-zinc-400">Domain:</span>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-xs rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-red-600"
            >
              {DOMAIN_OPTIONS.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search assignment title, class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-600"
            />
          </div>
        </div>

        {/* Tabs for Trainer */}
        {canManage && (
          <div className="flex gap-2 border-b border-zinc-800 pb-2">
            <button
              onClick={() => setActiveTab("ASSIGNMENTS")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === "ASSIGNMENTS"
                  ? "bg-red-950/80 text-red-300 border border-red-800/60"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Assignments ({assignments.length})
            </button>
            <button
              onClick={() => setActiveTab("SUBMISSIONS")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === "SUBMISSIONS"
                  ? "bg-red-950/80 text-red-300 border border-red-800/60"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Student Submissions ({allSubmissions.length})
            </button>
          </div>
        )}

        {/* Tab 1: Assignments Grid */}
        {activeTab === "ASSIGNMENTS" && (
          <>
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-zinc-500 space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin text-red-500" />
                <p className="text-xs">Loading assignments...</p>
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="p-12 text-center bg-zinc-950 border border-zinc-800/60 rounded-xl space-y-2">
                <FileText className="w-8 h-8 text-zinc-600 mx-auto" />
                <h3 className="text-sm font-semibold text-zinc-300">No released assignments match this filter</h3>
                <p className="text-xs text-zinc-500">
                  {canManage
                    ? "Assignments unlock automatically at 9:35 PM after the live class is marked COMPLETED."
                    : "Assignments will appear here once your instructor completes the live class."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredAssignments.map((a) => {
                  const dueDateFormatted = new Date(a.dueDate).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                  });

                  const mySub = a.mySubmission;

                  return (
                    <div
                      key={a.id}
                      className="bg-zinc-950 border border-zinc-800 hover:border-red-900/60 transition-all rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-lg shadow-black/60 relative overflow-hidden group"
                    >
                      <div className={`absolute top-0 left-0 right-0 h-1 ${
                        a.status === "PUBLISHED" || a.status === "ACTIVE" ? "bg-emerald-500" : "bg-amber-600"
                      }`} />

                      <div>
                        {/* Header & Status */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[11px] font-mono text-zinc-400 font-semibold flex items-center gap-1.5">
                            <span className="text-red-400 font-bold">{a.sourceKey || a.id}</span>
                            {a.class && (
                              <>
                                <span>•</span>
                                <span className="text-zinc-500">{a.class.classDate.split("T")[0]}</span>
                              </>
                            )}
                          </span>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            a.status === "PUBLISHED" || a.status === "ACTIVE"
                              ? "bg-emerald-950/60 border-emerald-700/60 text-emerald-300"
                              : "bg-amber-950/60 border-amber-700/60 text-amber-300"
                          }`}>
                            {a.status}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-bold text-white group-hover:text-red-300 transition-colors line-clamp-2">
                          {a.title}
                        </h3>

                        {/* Associated Class */}
                        {a.class && (
                          <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-red-400 shrink-0" />
                            <span className="line-clamp-1">{a.class.title}</span>
                          </div>
                        )}

                        {/* Student Excusal Badge */}
                        {a.isStudentExcused && (
                          <div className="mt-2.5 p-2 rounded-lg bg-amber-950/40 border border-amber-800/50 flex items-center gap-2 text-xs text-amber-200">
                            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>{a.excuseReason}</span>
                          </div>
                        )}

                        {/* Task Description */}
                        <div className="mt-3 text-xs text-zinc-300 bg-zinc-900/60 border border-zinc-800/60 rounded-lg p-3 space-y-1.5">
                          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block">
                            Instructions:
                          </span>
                          <p className="line-clamp-3">{a.description}</p>
                        </div>

                        {/* Evidence Required */}
                        {a.evidenceRequired && (
                          <div className="mt-2.5 text-xs text-zinc-400 space-y-1">
                            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block">
                              What to Submit:
                            </span>
                            <p className="text-zinc-300 line-clamp-2">{a.evidenceRequired}</p>
                          </div>
                        )}

                        {/* Due Date & Submission Status */}
                        <div className="mt-3.5 flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-900 pt-3">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-zinc-500" />
                            Due: {dueDateFormatted} 23:59 IST
                          </span>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-2 border-t border-zinc-900">
                        {!canManage ? (
                          /* Intern View */
                          <div>
                            {mySub ? (
                              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1 text-xs">
                                <div className="flex justify-between items-center">
                                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    {mySub.status}
                                  </span>
                                  {mySub.grade && (
                                    <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold font-mono">
                                      Grade: {mySub.grade}
                                    </span>
                                  )}
                                </div>
                                {mySub.feedback && (
                                  <p className="text-zinc-300 text-[11px] mt-1 bg-black/40 p-2 rounded border border-zinc-800/60">
                                    <span className="text-zinc-500 font-semibold">Trainer Feedback:</span> {mySub.feedback}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setSubmitModalAssignment(a);
                                  setTextContent("");
                                  setRepositoryUrl("");
                                  setSubmissionNotes("");
                                  setSubmitError(null);
                                  setSubmitSuccess(null);
                                }}
                                className="w-full py-2 px-3 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-red-950/60 transition-all"
                              >
                                <Send className="w-3.5 h-3.5" />
                                Submit After-Class Homework
                              </button>
                            )}
                          </div>
                        ) : (
                          /* Trainer View */
                          <div className="flex items-center justify-between text-xs text-zinc-400">
                            <span>Submissions: <strong className="text-white">{a.submittedCount || 0}</strong></span>
                            <span>Graded: <strong className="text-emerald-400">{a.approvedCount || 0}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Tab 2: Trainer Submissions List */}
        {activeTab === "SUBMISSIONS" && canManage && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">Student Homework Submissions</h3>
              <span className="text-xs text-zinc-400 font-mono">{allSubmissions.length} Total Submissions</span>
            </div>

            {allSubmissions.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No student submissions yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-900/60 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="p-3">Intern</th>
                      <th className="p-3">Assignment</th>
                      <th className="p-3">Evidence</th>
                      <th className="p-3">Submitted At</th>
                      <th className="p-3">Status / Grade</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {allSubmissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-zinc-900/40">
                        <td className="p-3 font-semibold text-white">
                          {sub.internId || sub.userId}
                          <span className="block text-[11px] text-zinc-400 font-normal">{sub.userName}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-zinc-200">{sub.assignmentTitle}</span>
                        </td>
                        <td className="p-3">
                          {sub.repositoryUrl ? (
                            <a
                              href={sub.repositoryUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-red-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                            >
                              <GitBranch className="w-3 h-3" />
                              View Code Repo
                            </a>
                          ) : (
                            <span className="text-zinc-500">Text Content</span>
                          )}
                        </td>
                        <td className="p-3 text-zinc-400 text-[11px]">
                          {new Date(sub.submittedAt).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            sub.status === "GRADED" ? "bg-emerald-950 text-emerald-300 border border-emerald-800" :
                            "bg-amber-950 text-amber-300 border border-amber-800"
                          }`}>
                            {sub.status} {sub.grade ? `(${sub.grade})` : ""}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => {
                              setReviewModalSubmission(sub);
                              setGradeInput(sub.grade || "A");
                              setFeedbackInput(sub.feedback || "Good work on the practical demonstration.");
                            }}
                            className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-white"
                          >
                            Grade & Feedback
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* MODAL 1: INTERN HOMEWORK SUBMISSION */}
        {submitModalAssignment && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-red-500" />
                  Submit Homework: {submitModalAssignment.title}
                </h3>
                <button
                  onClick={() => setSubmitModalAssignment(null)}
                  className="p-1 rounded text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {submitError && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200">
                  {submitError}
                </div>
              )}
              {submitSuccess && (
                <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-200">
                  {submitSuccess}
                </div>
              )}

              <form onSubmit={handleSubmitAssignment} className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1 font-semibold">GitHub Repository URL (Optional/Recommended)</label>
                  <input
                    type="url"
                    placeholder="https://github.com/your-username/codexa-task"
                    value={repositoryUrl}
                    onChange={(e) => setRepositoryUrl(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1 font-semibold">Task Explanation / Reflection</label>
                  <textarea
                    rows={4}
                    placeholder="Describe your implementation, tests performed, and 3 key takeaways..."
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1 font-semibold">Notes for Trainer (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Completed all steps and deployed to Vercel"
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-900">
                  <button
                    type="button"
                    onClick={() => setSubmitModalAssignment(null)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 text-xs text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-xs font-semibold text-white shadow-md"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Homework"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: TRAINER GRADING & FEEDBACK */}
        {reviewModalSubmission && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-red-500" />
                  Evaluate Submission: {reviewModalSubmission.userName}
                </h3>
                <button
                  onClick={() => setReviewModalSubmission(null)}
                  className="p-1 rounded text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-zinc-900 rounded-lg text-xs space-y-1.5 border border-zinc-800">
                <p><span className="text-zinc-500">Intern ID:</span> <strong className="text-white">{reviewModalSubmission.internId}</strong></p>
                <p><span className="text-zinc-500">Assignment:</span> {reviewModalSubmission.assignmentTitle}</p>
                {reviewModalSubmission.repositoryUrl && (
                  <p>
                    <span className="text-zinc-500">Repository:</span>{" "}
                    <a href={reviewModalSubmission.repositoryUrl} target="_blank" rel="noopener noreferrer" className="text-red-400 underline">
                      {reviewModalSubmission.repositoryUrl}
                    </a>
                  </p>
                )}
                {reviewModalSubmission.textContent && (
                  <div>
                    <span className="text-zinc-500">Student Explanation:</span>
                    <p className="mt-1 text-zinc-300 bg-black/50 p-2 rounded border border-zinc-800">
                      {reviewModalSubmission.textContent}
                    </p>
                  </div>
                )}
              </div>

              <form onSubmit={handleGradeSubmission} className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1 font-semibold">Grade</label>
                  <select
                    value={gradeInput}
                    onChange={(e) => setGradeInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="A+">A+ (Exceptional)</option>
                    <option value="A">A (Excellent)</option>
                    <option value="B+">B+ (Good)</option>
                    <option value="B">B (Satisfactory)</option>
                    <option value="Revision Required">Revision Required</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1 font-semibold">Trainer Feedback</label>
                  <textarea
                    rows={3}
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
                    placeholder="Provide constructive feedback and practical advice..."
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-900">
                  <button
                    type="button"
                    onClick={() => setReviewModalSubmission(null)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 text-xs text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGrading}
                    className="px-4 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-xs font-semibold text-white shadow-md"
                  >
                    {isGrading ? "Saving..." : "Save Grade & Feedback"}
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
