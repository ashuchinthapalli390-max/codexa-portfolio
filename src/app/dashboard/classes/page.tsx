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
  Layers
} from "lucide-react";
import { getEffectiveRole } from "@/lib/permissions";

interface ScheduledClassItem {
  id: string;
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
  status: string; // UPCOMING, LIVE, COMPLETED, CANCELLED, RESCHEDULED
  mode: string;
  meetingLink?: string | null;
  learningObjectives?: string | null;
  resources?: any;
  recordingUrl?: string | null;
  createdAt: string;
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

export default function ClassSchedulingPage() {
  const { user } = useAuth();
  const effectiveRole = user ? getEffectiveRole(user) : "EMPLOYEE";
  const canManage = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN"].includes(effectiveRole);

  const [classes, setClasses] = useState<ScheduledClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "TODAY" | "UPCOMING" | "PAST">("TODAY");
  const [selectedDomain, setSelectedDomain] = useState("All Domains");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState("All Domains");
  const [batch, setBatch] = useState("Batch-2026");
  const [topic, setTopic] = useState("");
  const [subtopicsText, setSubtopicsText] = useState("");
  const [classDate, setClassDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("10:00 AM");
  const [endTime, setEndTime] = useState("11:30 AM");
  const [duration, setDuration] = useState("1h 30m");
  const [mode, setMode] = useState("ONLINE");
  const [meetingLink, setMeetingLink] = useState("");
  const [learningObjectives, setLearningObjectives] = useState("");
  const [resourcesText, setResourcesText] = useState("");
  const [recordingUrl, setRecordingUrl] = useState("");

  // Quick action modal
  const [recordingModalClass, setRecordingModalClass] = useState<ScheduledClassItem | null>(null);
  const [inputRecordingUrl, setInputRecordingUrl] = useState("");

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/classes");
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

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!title || !topic || !classDate || !startTime || !endTime) {
      setFormError("Please fill in all required fields (title, topic, date, start & end time).");
      return;
    }

    setSubmitting(true);
    try {
      const subtopics = subtopicsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const resources = resourcesText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const parts = line.split("|");
          return {
            title: parts[0]?.trim() || "Resource",
            url: parts[1]?.trim() || parts[0]?.trim() || "",
          };
        });

      const res = await fetch("/api/admin/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          domain,
          batch,
          topic,
          subtopics,
          classDate,
          startTime,
          endTime,
          duration,
          mode,
          meetingLink,
          learningObjectives,
          resources,
          recordingUrl,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setCreateModalOpen(false);
        // Reset form
        setTitle("");
        setTopic("");
        setSubtopicsText("");
        setMeetingLink("");
        setLearningObjectives("");
        setResourcesText("");
        setRecordingUrl("");
        await fetchClasses();
      } else {
        setFormError(data.error || "Failed to create class.");
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

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
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveRecording = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordingModalClass) return;
    try {
      const res = await fetch("/api/admin/classes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: recordingModalClass.id,
          recordingUrl: inputRecordingUrl,
          status: "COMPLETED",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setClasses((prev) =>
          prev.map((c) =>
            c.id === recordingModalClass.id
              ? { ...c, recordingUrl: inputRecordingUrl, status: "COMPLETED" }
              : c
          )
        );
        setRecordingModalClass(null);
        setInputRecordingUrl("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  const filteredClasses = classes.filter((c) => {
    const cDate = c.classDate ? new Date(c.classDate).toISOString().split("T")[0] : "";
    if (activeTab === "TODAY" && cDate !== todayStr) return false;
    if (activeTab === "UPCOMING" && (cDate <= todayStr || c.status === "CANCELLED")) return false;
    if (activeTab === "PAST" && (cDate >= todayStr && c.status !== "COMPLETED")) return false;

    if (selectedDomain !== "All Domains" && c.domain !== selectedDomain) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.topic.toLowerCase().includes(q) ||
        c.instructorName.toLowerCase().includes(q) ||
        c.domain.toLowerCase().includes(q)
      );
    }

    return true;
  });

  const todayCount = classes.filter((c) => c.classDate?.slice(0, 10) === todayStr).length;
  const upcomingCount = classes.filter((c) => c.classDate?.slice(0, 10) > todayStr && c.status !== "CANCELLED").length;
  const completedCount = classes.filter((c) => c.status === "COMPLETED").length;

  return (
    <TeamCoreShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1f2228] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-red-400 mb-1">
              <GraduationCap className="w-4 h-4" />
              <span>CODEXA ACADEMY & TRAINING CONTROL</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              Scheduled Classes & Curriculum
              <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-mono">
                {classes.length} Total
              </span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Manage live training sessions, syllabus topics, join links, and class recordings. Directly synchronized with Mobile App.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchClasses}
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
                Schedule Class
              </button>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0f1115] border border-[#1e222a] rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span>Today&apos;s Sessions</span>
              <Calendar className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">{todayCount}</div>
            <div className="text-[11px] text-gray-500 mt-1">Active for date {todayStr}</div>
          </div>

          <div className="bg-[#0f1115] border border-[#1e222a] rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span>Upcoming</span>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">{upcomingCount}</div>
            <div className="text-[11px] text-gray-500 mt-1">Scheduled future dates</div>
          </div>

          <div className="bg-[#0f1115] border border-[#1e222a] rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span>Completed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">{completedCount}</div>
            <div className="text-[11px] text-gray-500 mt-1">Recordings / Concluded</div>
          </div>

          <div className="bg-[#0f1115] border border-[#1e222a] rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span>Sync Status</span>
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Mobile Live
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Real-time DB connection</div>
          </div>
        </div>

        {/* Filters and Tabs */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex bg-[#0f1115] p-1 rounded-lg border border-[#1e222a]">
            {[
              { id: "TODAY", label: "Today's Classes" },
              { id: "UPCOMING", label: "Upcoming" },
              { id: "PAST", label: "Past & Completed" },
              { id: "ALL", label: "All Sessions" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === t.id
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Domain Filter */}
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

            {/* Search */}
            <div className="flex items-center gap-2 bg-[#0f1115] border border-[#1e222a] px-3 py-1.5 rounded-lg text-xs flex-1 md:w-60">
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search topic or instructor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-white outline-none w-full placeholder:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Classes List */}
        {loading ? (
          <div className="flex items-center justify-center p-16 text-gray-400 gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-red-500" />
            <span>Loading scheduled classes...</span>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="bg-[#0f1115] border border-[#1e222a] rounded-2xl p-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No classes found</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
              {searchQuery || selectedDomain !== "All Domains"
                ? "Try adjusting your search query or domain filter."
                : "No training sessions match the selected tab filter."}
            </p>
            {canManage && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white inline-flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Schedule First Class
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClasses.map((item) => {
              const cDateStr = item.classDate ? new Date(item.classDate).toISOString().split("T")[0] : "";
              const isToday = cDateStr === todayStr;

              return (
                <div
                  key={item.id}
                  className={`bg-[#0f1115] border rounded-xl p-5 flex flex-col justify-between transition-all hover:border-[#2a2f3a] ${
                    isToday ? "border-red-500/40 shadow-lg shadow-red-950/10" : "border-[#1e222a]"
                  }`}
                >
                  <div>
                    {/* Badge header */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161920] border border-[#232732] text-gray-300">
                        {item.domain}
                      </span>

                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                          item.status === "LIVE"
                            ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                            : item.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : item.status === "CANCELLED"
                            ? "bg-gray-500/10 text-gray-400 border border-gray-500/30"
                            : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white tracking-tight line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-xs font-medium text-red-400 mt-0.5 line-clamp-1">
                      Topic: {item.topic}
                    </p>

                    {/* Subtopics */}
                    {Array.isArray(item.subtopics) && item.subtopics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {item.subtopics.slice(0, 3).map((sub: string, idx: number) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-[#14171d] text-gray-400 px-1.5 py-0.5 rounded border border-[#1f232b]"
                          >
                            {sub}
                          </span>
                        ))}
                        {item.subtopics.length > 3 && (
                          <span className="text-[10px] text-gray-500 px-1 py-0.5">
                            +{item.subtopics.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Meta info */}
                    <div className="space-y-1.5 text-xs text-gray-400 mt-4 border-t border-[#181a20] pt-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-gray-500" />
                        <span>{cDateStr}</span>
                        <span className="text-gray-600">•</span>
                        <span>{item.startTime} – {item.endTime}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-gray-500" />
                        <span>Instructor: <strong className="text-gray-300 font-medium">{item.instructorName}</strong></span>
                      </div>

                      {item.mode && (
                        <div className="flex items-center gap-2">
                          <Video className="w-3.5 h-3.5 text-gray-500" />
                          <span>Mode: <span className="uppercase text-gray-300 font-mono text-[10px]">{item.mode}</span></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-5 pt-3 border-t border-[#181a20] flex items-center justify-between gap-2">
                    {item.meetingLink ? (
                      <a
                        href={item.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                      >
                        Join Class
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-gray-500 italic">No link attached</span>
                    )}

                    <div className="flex items-center gap-1.5">
                      {item.recordingUrl ? (
                        <a
                          href={item.recordingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-500/20 flex items-center gap-1"
                        >
                          <Play className="w-2.5 h-2.5" />
                          Recording
                        </a>
                      ) : canManage && (
                        <button
                          onClick={() => {
                            setRecordingModalClass(item);
                            setInputRecordingUrl(item.recordingUrl || "");
                          }}
                          className="px-2 py-1 text-[11px] font-medium bg-[#161820] text-gray-300 border border-[#232732] rounded hover:bg-[#1e222c]"
                        >
                          + Recording
                        </button>
                      )}

                      {canManage && item.status !== "COMPLETED" && item.status !== "CANCELLED" && (
                        <button
                          onClick={() => handleStatusUpdate(item.id, item.status === "LIVE" ? "COMPLETED" : "LIVE")}
                          className={`px-2 py-1 text-[11px] font-semibold rounded ${
                            item.status === "LIVE"
                              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                              : "bg-red-600 hover:bg-red-500 text-white"
                          }`}
                        >
                          {item.status === "LIVE" ? "End Class" : "Start Live"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Schedule Class Modal */}
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
                <GraduationCap className="w-4 h-4" />
                <span>NEW CURRICULUM SESSION</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-4">Schedule Class for Mobile App</h2>

              {formError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateClass} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1 font-medium">Class Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Full-Stack AI Architecture & Real-Time Supabase"
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
                    <label className="block text-gray-400 mb-1 font-medium">Batch / Cohort</label>
                    <input
                      type="text"
                      value={batch}
                      onChange={(e) => setBatch(e.target.value)}
                      className="w-full bg-[#14171d] border border-[#232732] rounded-lg px-3 py-2 text-white outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-medium">Primary Topic *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PostgreSQL Schema Design & PgBouncer Connection Pooling"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full bg-[#14171d] border border-[#232732] rounded-lg px-3 py-2 text-white outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-medium">
                    Subtopics (comma-separated tags)
                  </label>
                  <input
                    type="text"
                    placeholder="Connection Pooler, Prepared Statements, Prisma Migrations"
                    value={subtopicsText}
                    onChange={(e) => setSubtopicsText(e.target.value)}
                    className="w-full bg-[#14171d] border border-[#232732] rounded-lg px-3 py-2 text-white outline-none focus:border-red-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1 font-medium">Date *</label>
                    <input
                      type="date"
                      required
                      value={classDate}
                      onChange={(e) => setClassDate(e.target.value)}
                      className="w-full bg-[#14171d] border border-[#232732] rounded-lg px-3 py-2 text-white outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-medium">Start Time *</label>
                    <input
                      type="text"
                      required
                      placeholder="10:00 AM"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-[#14171d] border border-[#232732] rounded-lg px-3 py-2 text-white outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-medium">End Time *</label>
                    <input
                      type="text"
                      required
                      placeholder="11:30 AM"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-[#14171d] border border-[#232732] rounded-lg px-3 py-2 text-white outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1 font-medium">Mode</label>
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                      className="w-full bg-[#14171d] border border-[#232732] rounded-lg px-3 py-2 text-white outline-none focus:border-red-500"
                    >
                      <option value="ONLINE">ONLINE (Virtual Meeting)</option>
                      <option value="OFFLINE">OFFLINE (In-Office)</option>
                      <option value="HYBRID">HYBRID</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-medium">Meeting URL</label>
                    <input
                      type="url"
                      placeholder="https://meet.google.com/..."
                      value={meetingLink}
                      onChange={(e) => setMeetingLink(e.target.value)}
                      className="w-full bg-[#14171d] border border-[#232732] rounded-lg px-3 py-2 text-white outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-medium">Learning Objectives</label>
                  <textarea
                    rows={2}
                    placeholder="Understand real-time subscriptions, client token handshakes, and failure fallbacks."
                    value={learningObjectives}
                    onChange={(e) => setLearningObjectives(e.target.value)}
                    className="w-full bg-[#14171d] border border-[#232732] rounded-lg px-3 py-2 text-white outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-medium">
                    Resources (One per line: Title | URL)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Prisma Architecture Docs | https://prisma.io/docs&#10;Supabase Realtime Guide | https://supabase.com"
                    value={resourcesText}
                    onChange={(e) => setResourcesText(e.target.value)}
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
                    disabled={submitting}
                    className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center gap-2"
                  >
                    {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Publish Class
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Recording Modal */}
        {recordingModalClass && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0f1115] border border-[#222630] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
              <button
                onClick={() => setRecordingModalClass(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1">
                <Play className="w-3.5 h-3.5" />
                <span>ATTACH CLASS RECORDING</span>
              </div>
              <h2 className="text-base font-bold text-white mb-2">{recordingModalClass.title}</h2>
              <p className="text-xs text-gray-400 mb-4">
                Provide video link (YouTube unlisted, Google Drive, Loom, or Cloud storage). Marked completed on save.
              </p>

              <form onSubmit={handleSaveRecording} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1 font-medium">Recording URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://drive.google.com/... or https://youtube.com/..."
                    value={inputRecordingUrl}
                    onChange={(e) => setInputRecordingUrl(e.target.value)}
                    className="w-full bg-[#14171d] border border-[#232732] rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRecordingModalClass(null)}
                    className="px-3 py-1.5 rounded-lg bg-[#14161a] border border-[#232730] text-gray-300"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  >
                    Save & Mark Completed
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
