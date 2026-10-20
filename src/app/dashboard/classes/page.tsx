"use client";

import React, { useState, useEffect } from "react";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { useAuth } from "@/context/AuthContext";
import {
  Calendar,
  Clock,
  Video,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  BookOpen,
  Users,
  GraduationCap,
  Play,
  FileText,
  Link as LinkIcon,
  Sparkles,
  ChevronRight,
  X,
  Layers,
  ShieldAlert,
  UserCheck,
  Send,
  CalendarCheck,
  CalendarX,
  History,
  AlertTriangle
} from "lucide-react";
import { getEffectiveRole } from "@/lib/permissions";

interface ScheduledClassItem {
  id: string;
  sourceKey?: string | null;
  sequenceNumber?: number | null;
  title: string;
  domain: string;
  batch: string;
  topic: string;
  subtopics: any;
  instructorId?: string | null;
  instructorName: string;
  classDate: string;
  startTime: string;
  endTime: string;
  duration: string;
  status: string; // DRAFT, UPCOMING, LIVE, COMPLETED, CANCELLED, RESCHEDULED
  mode: string;
  meetingLink?: string | null;
  learningObjectives?: string | null;
  attendingDomains?: string[] | null;
  learningGoals?: string[] | null;
  trainerDemo?: string | null;
  timeZone?: string;
  instructorNotes?: string | null;
  isCommon?: boolean;
  isStudentExcused?: boolean;
  excuseReason?: string;
  assignments?: any[];
  trainingAttendance?: { status: string }[];
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

const MONTH_OPTIONS = [
  { value: "", label: "All Months (2026 - 2027)" },
  { value: "2026-10", label: "October 2026" },
  { value: "2026-11", label: "November 2026" },
  { value: "2026-12", label: "December 2026" },
  { value: "2027-01", label: "January 2027" },
  { value: "2027-02", label: "February 2027" },
  { value: "2027-03", label: "March 2027" },
  { value: "2027-04", label: "April 2027" },
  { value: "2027-05", label: "May 2027" },
  { value: "2027-06", label: "June 2027" },
  { value: "2027-07", label: "July 2027" },
];

export default function ClassSchedulingPage() {
  const { user } = useAuth();
  const effectiveRole = user ? getEffectiveRole(user) : "EMPLOYEE";
  const canManage = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN", "INSTRUCTOR"].includes(effectiveRole);

  const [classes, setClasses] = useState<ScheduledClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "TODAY" | "UPCOMING" | "PAST" | "DRAFT">("ALL");
  const [selectedDomain, setSelectedDomain] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Overview stats
  const [stats, setStats] = useState<any>(null);

  // Sub-views for trainer
  const [viewMode, setViewMode] = useState<"CLASSES" | "ATTENDANCE" | "EXAMS" | "MAKEUP">("CLASSES");

  // Attendance modal
  const [attendanceModalClass, setAttendanceModalClass] = useState<ScheduledClassItem | null>(null);
  const [attendanceStudents, setAttendanceStudents] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [attendanceSuccess, setAttendanceSuccess] = useState<string | null>(null);

  // Meeting Link Modal
  const [meetingModalClass, setMeetingModalClass] = useState<ScheduledClassItem | null>(null);
  const [meetingLinkInput, setMeetingLinkInput] = useState("");

  // Reschedule Modal
  const [rescheduleModalClass, setRescheduleModalClass] = useState<ScheduledClassItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // Exam Blackout State
  const [examCohorts, setExamCohorts] = useState<any[]>([]);
  const [unverifiedStudents, setUnverifiedStudents] = useState<any[]>([]);
  const [newCollege, setNewCollege] = useState("NEC");
  const [newYearBatch, setNewYearBatch] = useState("2");
  const [newExamStart, setNewExamStart] = useState("");
  const [newExamEnd, setNewExamEnd] = useState("");
  const [newExamNotes, setNewExamNotes] = useState("");
  const [examSubmitting, setExamSubmitting] = useState(false);
  const [examMessage, setExamMessage] = useState<string | null>(null);

  // Live Make-up Queue State
  const [makeupQueue, setMakeupQueue] = useState<any[]>([]);
  const [makeupStats, setMakeupStats] = useState<any>(null);
  const [scheduleMakeupDate, setScheduleMakeupDate] = useState("");
  const [scheduleMakeupLink, setScheduleMakeupLink] = useState("");
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([]);
  const [makeupSubmitting, setMakeupSubmitting] = useState(false);
  const [makeupMessage, setMakeupMessage] = useState<string | null>(null);

  // Fetch classes
  const fetchClasses = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/classes?domain=${encodeURIComponent(selectedDomain)}`;
      if (selectedMonth) url += `&month=${encodeURIComponent(selectedMonth)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok && Array.isArray(data.classes)) {
        setClasses(data.classes);
      }
    } catch (err) {
      console.error("Failed to load classes:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    if (!canManage) return;
    try {
      const res = await fetch("/api/admin/training/stats");
      const data = await res.json();
      if (data.ok) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  };

  // Fetch exams
  const fetchExams = async () => {
    if (!canManage) return;
    try {
      const res = await fetch("/api/admin/training/exams");
      const data = await res.json();
      if (data.ok) {
        setExamCohorts(data.cohorts || []);
        setUnverifiedStudents(data.unverifiedInterns || []);
      }
    } catch (err) {
      console.error("Failed to load exams:", err);
    }
  };

  // Fetch makeup queue
  const fetchMakeupQueue = async () => {
    if (!canManage) return;
    try {
      const res = await fetch("/api/admin/training/makeup");
      const data = await res.json();
      if (data.ok) {
        setMakeupQueue(data.queue || []);
        setMakeupStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to load makeup queue:", err);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchStats();
    if (viewMode === "EXAMS") fetchExams();
    if (viewMode === "MAKEUP") fetchMakeupQueue();
  }, [selectedDomain, selectedMonth, viewMode]);

  // Open attendance modal
  const openAttendanceModal = async (cls: ScheduledClassItem) => {
    setAttendanceModalClass(cls);
    setAttendanceError(null);
    setAttendanceSuccess(null);
    setAttendanceLoading(true);
    try {
      const res = await fetch(`/api/admin/training/attendance?classId=${cls.id}`);
      const data = await res.json();
      if (data.ok) {
        setAttendanceStudents(data.students || []);
      } else {
        setAttendanceError(data.error || "Failed to load attendance list");
      }
    } catch (err: any) {
      setAttendanceError(err.message || "Network error loading attendance");
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Save attendance
  const saveAttendance = async () => {
    if (!attendanceModalClass) return;
    setAttendanceSaving(true);
    setAttendanceError(null);
    setAttendanceSuccess(null);
    try {
      const payload = {
        classId: attendanceModalClass.id,
        records: attendanceStudents.map(s => ({
          internId: s.internId,
          status: s.status,
          notes: s.notes
        }))
      };

      const res = await fetch("/api/admin/training/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.ok) {
        setAttendanceSuccess(data.message || "Attendance saved successfully!");
        fetchStats();
      } else {
        setAttendanceError(data.error || "Failed to save attendance");
      }
    } catch (err: any) {
      setAttendanceError(err.message || "Failed to save attendance");
    } finally {
      setAttendanceSaving(false);
    }
  };

  // Update class status (Publish, Start Live, Complete)
  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/classes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();
      if (data.ok) {
        setClasses((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
        );
        fetchStats();
      } else {
        alert(data.error || "Failed to update class status.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Save meeting link
  const handleSaveMeetingLink = async () => {
    if (!meetingModalClass) return;
    try {
      const res = await fetch("/api/admin/classes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: meetingModalClass.id, meetingLink: meetingLinkInput }),
      });
      const data = await res.json();
      if (data.ok) {
        setClasses((prev) =>
          prev.map((c) => (c.id === meetingModalClass.id ? { ...c, meetingLink: meetingLinkInput } : c))
        );
        setMeetingModalClass(null);
      } else {
        alert(data.error || "Failed to set meeting link.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Reschedule Class
  const handleReschedule = async () => {
    if (!rescheduleModalClass || !rescheduleDate) return;
    setRescheduleError(null);
    try {
      const res = await fetch("/api/admin/classes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rescheduleModalClass.id,
          classDate: rescheduleDate,
          status: "RESCHEDULED"
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setRescheduleModalClass(null);
        fetchClasses();
      } else {
        setRescheduleError(data.error || "Failed to reschedule class.");
      }
    } catch (err: any) {
      setRescheduleError(err.message || "Failed to reschedule class.");
    }
  };

  // Submit Exam Blackout
  const handleCreateBlackout = async (e: React.FormEvent) => {
    e.preventDefault();
    setExamSubmitting(true);
    setExamMessage(null);
    try {
      const res = await fetch("/api/admin/training/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          college: newCollege,
          yearBatch: newYearBatch,
          examStartDate: newExamStart,
          examEndDate: newExamEnd,
          notes: newExamNotes
        })
      });
      const data = await res.json();
      if (data.ok) {
        setExamMessage(data.message);
        fetchExams();
        fetchStats();
      } else {
        setExamMessage("Error: " + (data.error || "Failed to add blackout."));
      }
    } catch (err: any) {
      setExamMessage("Error: " + err.message);
    } finally {
      setExamSubmitting(false);
    }
  };

  // Schedule Live Make-up
  const handleScheduleMakeup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedQueueIds.length === 0 || !scheduleMakeupDate) {
      alert("Please select at least one student and a target date.");
      return;
    }
    setMakeupSubmitting(true);
    setMakeupMessage(null);
    try {
      const res = await fetch("/api/admin/training/makeup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queueIds: selectedQueueIds,
          makeupDate: scheduleMakeupDate,
          meetingLink: scheduleMakeupLink
        })
      });
      const data = await res.json();
      if (data.ok) {
        setMakeupMessage(data.message);
        setSelectedQueueIds([]);
        fetchMakeupQueue();
        fetchClasses();
      } else {
        setMakeupMessage("Error: " + (data.error || "Failed to schedule make-up."));
      }
    } catch (err: any) {
      setMakeupMessage("Error: " + err.message);
    } finally {
      setMakeupSubmitting(false);
    }
  };

  // Filter classes by active tab and search
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const filteredClasses = classes.filter((c) => {
    const dStr = c.classDate.split("T")[0];
    if (activeTab === "TODAY") {
      if (dStr !== todayStr) return false;
    } else if (activeTab === "UPCOMING") {
      if (dStr <= todayStr || c.status === "COMPLETED" || c.status === "DRAFT") return false;
    } else if (activeTab === "PAST") {
      if (dStr > todayStr && c.status !== "COMPLETED") return false;
    } else if (activeTab === "DRAFT") {
      if (c.status !== "DRAFT") return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchTopic = c.topic.toLowerCase().includes(q);
      const matchKey = c.sourceKey?.toLowerCase().includes(q);
      const matchDomain = c.domain.toLowerCase().includes(q);
      if (!matchTitle && !matchTopic && !matchKey && !matchDomain) return false;
    }

    return true;
  });

  return (
    <TeamCoreShell>
      <div className="min-h-screen bg-black text-white p-4 md:p-8 space-y-6">
        {/* Header Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-950 to-black border border-red-800/40 shadow-lg shadow-red-950/40">
                <GraduationCap className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                  CodeXa Training Hub
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-950/60 border border-red-800/50 text-red-300 font-mono">
                    2026 - 2027
                  </span>
                </h1>
                <p className="text-sm text-zinc-400 mt-0.5">
                  Single Trainer • Exactly 1 Live Class Per Day • 7:30 PM - 9:30 PM IST • 100% Live
                </p>
              </div>
            </div>
          </div>

          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setViewMode("CLASSES")}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  viewMode === "CLASSES"
                    ? "bg-red-700 text-white shadow-md shadow-red-950/60"
                    : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800"
                }`}
              >
                Schedule & Calendar
              </button>
              <button
                onClick={() => setViewMode("EXAMS")}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === "EXAMS"
                    ? "bg-red-700 text-white shadow-md shadow-red-950/60"
                    : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                Exam Exemptions
              </button>
              <button
                onClick={() => setViewMode("MAKEUP")}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === "MAKEUP"
                    ? "bg-red-700 text-white shadow-md shadow-red-950/60"
                    : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800"
                }`}
              >
                <History className="w-3.5 h-3.5 text-blue-400" />
                Live Make-Up Queue
                {stats?.makeupPendingCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center">
                    {stats.makeupPendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={fetchClasses}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Stats Strip for Management */}
        {canManage && stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80">
              <span className="text-xs text-zinc-400">Total Live Sessions</span>
              <p className="text-xl font-bold text-white mt-1">{stats.totalClasses}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80">
              <span className="text-xs text-amber-400">Draft Sessions</span>
              <p className="text-xl font-bold text-amber-300 mt-1">{stats.draftsCount}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80">
              <span className="text-xs text-emerald-400">Completed Sessions</span>
              <p className="text-xl font-bold text-emerald-300 mt-1">{stats.completedCount}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80">
              <span className="text-xs text-purple-400">Published Assignments</span>
              <p className="text-xl font-bold text-purple-300 mt-1">{stats.assignmentsPublishedCount}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80">
              <span className="text-xs text-blue-400">Live Make-Up Queue</span>
              <p className="text-xl font-bold text-blue-300 mt-1">{stats.makeupPendingCount}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80">
              <span className="text-xs text-rose-400">Exam Verification Req.</span>
              <p className="text-xl font-bold text-rose-300 mt-1">{stats.internsMissingAcademicRecordCount}</p>
            </div>
          </div>
        )}

        {/* VIEW 1: CLASSES & CALENDAR */}
        {viewMode === "CLASSES" && (
          <>
            {/* Filter Bar */}
            <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 flex flex-col md:flex-row gap-3 justify-between items-center">
              {/* Domain & Month selector */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Filter className="w-3.5 h-3.5 text-red-400" />
                  Domain:
                </div>
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

                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-xs rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-red-600"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search class title, key, topic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-600"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-zinc-800 pb-2 overflow-x-auto">
              {(["ALL", "TODAY", "UPCOMING", "PAST", ...(canManage ? ["DRAFT"] : [])] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    activeTab === tab
                      ? "bg-red-950/80 text-red-300 border border-red-800/60 shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
                  }`}
                >
                  {tab === "ALL" && `All Applicable (${classes.length})`}
                  {tab === "TODAY" && "Today's Class"}
                  {tab === "UPCOMING" && "Upcoming"}
                  {tab === "PAST" && "Completed / Past"}
                  {tab === "DRAFT" && "Drafts (Pre-Publish)"}
                </button>
              ))}
            </div>

            {/* Class Cards Grid */}
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-zinc-500 space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin text-red-500" />
                <p className="text-xs">Loading training schedule...</p>
              </div>
            ) : filteredClasses.length === 0 ? (
              <div className="p-12 text-center bg-zinc-950 border border-zinc-800/60 rounded-xl space-y-2">
                <Calendar className="w-8 h-8 text-zinc-600 mx-auto" />
                <h3 className="text-sm font-semibold text-zinc-300">No sessions match this filter</h3>
                <p className="text-xs text-zinc-500">Try changing the domain filter, month, or search query.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredClasses.map((cls) => {
                  const dateFormatted = new Date(cls.classDate).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                  });

                  const isCommon = Boolean(cls.sequenceNumber && cls.sequenceNumber <= 14);

                  return (
                    <div
                      key={cls.id}
                      className="bg-zinc-950 border border-zinc-800/90 hover:border-red-900/60 transition-all rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-lg shadow-black/60 relative overflow-hidden group"
                    >
                      {/* Top Accent Gradient */}
                      <div className={`absolute top-0 left-0 right-0 h-1 ${
                        cls.status === "LIVE" ? "bg-red-500 animate-pulse" :
                        cls.status === "COMPLETED" ? "bg-emerald-600" :
                        cls.status === "DRAFT" ? "bg-amber-600" : "bg-red-900/40"
                      }`} />

                      <div>
                        {/* Sequence, Date & Status */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[11px] font-mono text-zinc-400 font-semibold flex items-center gap-1.5">
                            <span className="text-red-400 font-bold">{cls.sourceKey || `DAY-${cls.sequenceNumber}`}</span>
                            <span>•</span>
                            <span>{dateFormatted}</span>
                          </span>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            cls.status === "LIVE" ? "bg-red-950/80 border-red-600 text-red-200 animate-pulse" :
                            cls.status === "COMPLETED" ? "bg-emerald-950/60 border-emerald-700/60 text-emerald-300" :
                            cls.status === "DRAFT" ? "bg-amber-950/60 border-amber-700/60 text-amber-300" :
                            "bg-zinc-900 border-zinc-700 text-zinc-300"
                          }`}>
                            {cls.status}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-bold text-white group-hover:text-red-300 transition-colors line-clamp-2">
                          {cls.title}
                        </h3>

                        {/* Common or Domains Badge */}
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {isCommon ? (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-gradient-to-r from-red-950 to-zinc-900 border border-red-700/50 text-red-200 shadow-sm">
                              COMMON CLASS — ALL 12 DOMAINS
                            </span>
                          ) : (
                            cls.attendingDomains && cls.attendingDomains.map((d) => (
                              <span key={d} className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">
                                {d}
                              </span>
                            ))
                          )}
                        </div>

                        {/* Student Excusal Badge */}
                        {cls.isStudentExcused && (
                          <div className="mt-2.5 p-2 rounded-lg bg-amber-950/40 border border-amber-800/50 flex items-center gap-2 text-xs text-amber-200">
                            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>{cls.excuseReason || "Excused for Semester Exams (Live Make-up Will Be Scheduled)"}</span>
                          </div>
                        )}

                        {/* Learning Goals */}
                        {cls.learningGoals && cls.learningGoals.length > 0 && (
                          <div className="mt-3.5 space-y-1">
                            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">You Will Learn:</span>
                            <ul className="space-y-1">
                              {cls.learningGoals.slice(0, 3).map((goal, gIdx) => (
                                <li key={gIdx} className="text-xs text-zinc-300 flex items-start gap-1.5">
                                  <span className="text-red-400 font-bold shrink-0">{gIdx + 1}.</span>
                                  <span className="line-clamp-2">{goal}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Demo walk-through */}
                        {cls.trainerDemo && (
                          <div className="mt-3 p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-xs text-zinc-400">
                            <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Live Demo:</span>
                            <p className="line-clamp-2 text-zinc-300 mt-0.5">{cls.trainerDemo}</p>
                          </div>
                        )}

                        {/* Time & Instructor */}
                        <div className="mt-3.5 flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-900 pt-3">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-zinc-500" />
                            {cls.startTime} - {cls.endTime} IST (120m)
                          </span>
                          <span className="text-zinc-500 font-mono text-[11px]">
                            {cls.instructorName}
                          </span>
                        </div>
                      </div>

                      {/* Card Action Controls */}
                      <div className="pt-2 border-t border-zinc-900 space-y-2">
                        {/* Meeting Link or Join */}
                        {cls.meetingLink ? (
                          <a
                            href={cls.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 px-3 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-red-950/60 transition-all"
                          >
                            <Video className="w-3.5 h-3.5" />
                            Join Live Meeting
                          </a>
                        ) : (
                          <div className="text-xs text-zinc-500 text-center py-1">
                            Live meeting link will be posted before class
                          </div>
                        )}

                        {/* Trainer Management Controls */}
                        {canManage && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            {cls.status === "DRAFT" && (
                              <button
                                onClick={() => handleStatusUpdate(cls.id, "UPCOMING")}
                                className="py-1.5 px-2 rounded bg-amber-950/60 hover:bg-amber-900 border border-amber-700/60 text-amber-200 text-[11px] font-semibold text-center"
                              >
                                Publish to Interns
                              </button>
                            )}
                            {cls.status === "UPCOMING" && (
                              <button
                                onClick={() => handleStatusUpdate(cls.id, "LIVE")}
                                className="py-1.5 px-2 rounded bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-200 text-[11px] font-semibold text-center"
                              >
                                Start Live Session
                              </button>
                            )}
                            {cls.status === "LIVE" && (
                              <button
                                onClick={() => handleStatusUpdate(cls.id, "COMPLETED")}
                                className="py-1.5 px-2 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-200 text-[11px] font-semibold text-center col-span-2"
                              >
                                Mark Class Completed & Release HW
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setMeetingModalClass(cls);
                                setMeetingLinkInput(cls.meetingLink || "");
                              }}
                              className="py-1.5 px-2 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[11px] font-medium text-center"
                            >
                              Set Meeting URL
                            </button>

                            <button
                              onClick={() => openAttendanceModal(cls)}
                              className="py-1.5 px-2 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[11px] font-medium text-center flex items-center justify-center gap-1"
                            >
                              <UserCheck className="w-3 h-3 text-red-400" />
                              Attendance
                            </button>

                            <button
                              onClick={() => {
                                setRescheduleModalClass(cls);
                                setRescheduleDate(cls.classDate.split("T")[0]);
                                setRescheduleError(null);
                              }}
                              className="py-1.5 px-2 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 text-[11px] font-medium text-center col-span-2"
                            >
                              Reschedule Session
                            </button>
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

        {/* VIEW 2: SEMESTER EXAM EXEMPTIONS */}
        {viewMode === "EXAMS" && (
          <div className="space-y-6">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                Verified University Semester-End Exam Blackout Policy
              </h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
                Attendance exemptions apply strictly to students with verified matching college and academic-year records.
                Classes pause 4 calendar days before verified exam start through final exam day. Affected students are marked EXCUSED and queued for live make-ups.
              </p>

              {/* Add Blackout Form */}
              <form onSubmit={handleCreateBlackout} className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1 font-semibold">College</label>
                  <input
                    type="text"
                    value={newCollege}
                    onChange={(e) => setNewCollege(e.target.value)}
                    placeholder="e.g. NEC, JNTUK"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1 font-semibold">Year of Study</label>
                  <select
                    value={newYearBatch}
                    onChange={(e) => setNewYearBatch(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1 font-semibold">First Exam Date</label>
                  <input
                    type="date"
                    value={newExamStart}
                    onChange={(e) => setNewExamStart(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1 font-semibold">Last Exam Date</label>
                  <input
                    type="date"
                    value={newExamEnd}
                    onChange={(e) => setNewExamEnd(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={examSubmitting}
                    className="w-full py-2 px-4 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-semibold text-xs shadow-md"
                  >
                    {examSubmitting ? "Applying..." : "Add & Apply Exemption"}
                  </button>
                </div>
              </form>

              {examMessage && (
                <div className="mt-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-amber-300">
                  {examMessage}
                </div>
              )}
            </div>

            {/* Active Blackout Cohorts List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {examCohorts.map((b) => (
                <div key={b.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800">
                      {b.college} • Year {b.yearBatch}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40">
                      ACTIVE
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <p className="text-zinc-300"><span className="text-zinc-500">Exams:</span> {b.examStartDate} to {b.examEndDate}</p>
                    <p className="text-amber-300 font-medium">
                      <span className="text-zinc-500">Blackout Window (-4 days):</span> {b.blackoutStart} to {b.blackoutEnd}
                    </p>
                    <p className="text-zinc-400 text-[11px]">{b.notes}</p>
                  </div>

                  <div className="border-t border-zinc-900 pt-3">
                    <span className="text-xs text-zinc-400 font-semibold">
                      Matching Verified Interns: {b.affectedInternsCount}
                    </span>
                    <div className="mt-2 flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {b.affectedInterns.map((intern: any) => (
                        <span key={intern.internId} className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                          {intern.internId} ({intern.name})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Unverified Interns Flagged */}
            {unverifiedStudents.length > 0 && (
              <div className="bg-zinc-950 border border-amber-900/60 rounded-xl p-6">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5" />
                  Exam Schedule Verification Required ({unverifiedStudents.length} Interns)
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  These interns have missing college or academic-year records. Do not automatically exempt or penalize without verifying.
                </p>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  {unverifiedStudents.map((u) => (
                    <div key={u.internId} className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs">
                      <p className="font-semibold text-white">{u.internId} - {u.name}</p>
                      <p className="text-[11px] text-zinc-500">{u.domain}</p>
                      <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300">
                        College: {u.college} | Year: {u.yearOfStudy}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: LIVE MAKE-UP QUEUE */}
        {viewMode === "MAKEUP" && (
          <div className="space-y-6">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-blue-400" />
                Live Make-Up Class Scheduling Queue
              </h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
                Students excused for approved semester exams require a separately scheduled LIVE make-up class.
                Never substitute recorded sessions. The sole trainer cannot have overlapping sessions on any date.
              </p>

              {/* Schedule Make-up Form */}
              <form onSubmit={handleScheduleMakeup} className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1 font-semibold">Make-Up Live Date (Mon-Sat, Non-Conflicting)</label>
                  <input
                    type="date"
                    value={scheduleMakeupDate}
                    onChange={(e) => setScheduleMakeupDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1 font-semibold">Meeting Link</label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={scheduleMakeupLink}
                    onChange={(e) => setScheduleMakeupLink(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={makeupSubmitting || selectedQueueIds.length === 0}
                    className="w-full py-2 px-4 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-semibold text-xs shadow-md"
                  >
                    {makeupSubmitting ? "Scheduling..." : `Schedule Make-Up for ${selectedQueueIds.length} Selected`}
                  </button>
                </div>
              </form>

              {makeupMessage && (
                <div className="mt-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-amber-300">
                  {makeupMessage}
                </div>
              )}
            </div>

            {/* Queue Table */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                <h3 className="text-sm font-bold text-white">Pending Live Make-Up Students</h3>
                <span className="text-xs text-zinc-400 font-mono">
                  {makeupQueue.filter(q => q.status === "PENDING").length} Pending Students
                </span>
              </div>

              {makeupQueue.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs">
                  No students currently pending make-up sessions.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-zinc-900/60 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                      <tr>
                        <th className="p-3 w-10">Select</th>
                        <th className="p-3">Intern ID & Name</th>
                        <th className="p-3">College & Domain</th>
                        <th className="p-3">Missed Live Session</th>
                        <th className="p-3">Excuse Reason</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {makeupQueue.map((item) => (
                        <tr key={item.id} className="hover:bg-zinc-900/40">
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={selectedQueueIds.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedQueueIds([...selectedQueueIds, item.id]);
                                } else {
                                  setSelectedQueueIds(selectedQueueIds.filter(id => id !== item.id));
                                }
                              }}
                              className="rounded border-zinc-800 text-red-600 focus:ring-red-600"
                            />
                          </td>
                          <td className="p-3 font-semibold text-white">
                            {item.internId} • {item.studentName}
                          </td>
                          <td className="p-3 text-zinc-400">
                            {item.college} (Y{item.year}) • {item.domain}
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-zinc-200">{item.originalClass.title}</span>
                            <span className="block text-[11px] text-zinc-500 font-mono">
                              {item.originalClass.sourceKey} on {item.originalClass.date}
                            </span>
                          </td>
                          <td className="p-3 text-amber-300">
                            {item.reason}
                          </td>
                          <td className="p-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              item.status === "PENDING" ? "bg-amber-950 text-amber-300 border border-amber-800" :
                              item.status === "SCHEDULED" ? "bg-blue-950 text-blue-300 border border-blue-800" :
                              "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL 1: ATTENDANCE MARKER */}
        {attendanceModalClass && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/40">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-red-500" />
                    Attendance: {attendanceModalClass.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                    {attendanceModalClass.sourceKey} • {attendanceModalClass.classDate.split("T")[0]} • 7:30-9:30 PM
                  </p>
                </div>
                <button
                  onClick={() => setAttendanceModalClass(null)}
                  className="p-1 rounded text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                {attendanceError && (
                  <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200">
                    {attendanceError}
                  </div>
                )}
                {attendanceSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-200">
                    {attendanceSuccess}
                  </div>
                )}

                {attendanceLoading ? (
                  <div className="p-8 text-center text-zinc-500 text-xs">Loading eligible student roster...</div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs text-zinc-400 pb-2 border-b border-zinc-800">
                      <span>Eligible Enrolled Students ({attendanceStudents.length})</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setAttendanceStudents(prev => prev.map(s => s.isExamBlackout ? s : { ...s, status: "PRESENT" }));
                          }}
                          className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-[11px] text-zinc-300"
                        >
                          Mark Non-Excused Present
                        </button>
                      </div>
                    </div>

                    <div className="divide-y divide-zinc-900 max-h-96 overflow-y-auto">
                      {attendanceStudents.map((s, idx) => (
                        <div key={s.internId} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-white flex items-center gap-2">
                              {s.internId} - {s.fullName}
                              {s.isExamBlackout && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300">
                                  Exam Blackout
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-zinc-500">
                              {s.college} (Y{s.yearOfStudy}) • {s.domain}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={s.status}
                              onChange={(e) => {
                                const newStatus = e.target.value;
                                setAttendanceStudents(prev => prev.map((item, i) => i === idx ? { ...item, status: newStatus } : item));
                              }}
                              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-none ${
                                s.status === "PRESENT" ? "bg-emerald-950 border-emerald-700 text-emerald-200" :
                                s.status === "ABSENT" ? "bg-red-950 border-red-700 text-red-200" :
                                s.status === "EXCUSED" ? "bg-amber-950 border-amber-700 text-amber-200" :
                                s.status === "MAKEUP_PENDING" ? "bg-blue-950 border-blue-700 text-blue-200" :
                                "bg-zinc-900 border-zinc-700 text-zinc-300"
                              }`}
                            >
                              <option value="PENDING">PENDING</option>
                              <option value="PRESENT">PRESENT</option>
                              <option value="ABSENT">ABSENT</option>
                              <option value="EXCUSED">EXCUSED</option>
                              <option value="MAKEUP_PENDING">MAKEUP PENDING</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-zinc-800 bg-zinc-900/40 flex justify-end gap-2">
                <button
                  onClick={() => setAttendanceModalClass(null)}
                  className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-300"
                >
                  Close
                </button>
                <button
                  onClick={saveAttendance}
                  disabled={attendanceSaving || attendanceLoading}
                  className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-xs font-semibold text-white shadow-md"
                >
                  {attendanceSaving ? "Saving..." : "Save Attendance Records"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: MEETING LINK */}
        {meetingModalClass && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-md p-5 space-y-4 shadow-2xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-red-500" />
                Set Live Meeting URL
              </h3>
              <p className="text-xs text-zinc-400">
                Enter the Google Meet, Zoom or Teams link for &quot;{meetingModalClass.title}&quot;.
              </p>
              <input
                type="url"
                placeholder="https://meet.google.com/xyz-abc-def"
                value={meetingLinkInput}
                onChange={(e) => setMeetingLinkInput(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setMeetingModalClass(null)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 text-xs text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMeetingLink}
                  className="px-4 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-xs font-semibold text-white"
                >
                  Save URL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: RESCHEDULE */}
        {rescheduleModalClass && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-md p-5 space-y-4 shadow-2xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-500" />
                Reschedule Session: {rescheduleModalClass.title}
              </h3>
              <p className="text-xs text-zinc-400">
                Select a new calendar date. The sole trainer cannot have overlapping sessions on any date. Sundays are off days.
              </p>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600"
              />
              {rescheduleError && (
                <div className="p-2.5 rounded bg-red-950/60 border border-red-800 text-xs text-red-200">
                  {rescheduleError}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setRescheduleModalClass(null)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 text-xs text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReschedule}
                  className="px-4 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-xs font-semibold text-white"
                >
                  Confirm Reschedule
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TeamCoreShell>
  );
}
