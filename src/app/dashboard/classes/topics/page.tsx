"use client";

import React, { useState, useEffect } from "react";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { useAuth } from "@/context/AuthContext";
import {
  Calendar,
  Clock,
  BookOpen,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Link as LinkIcon,
  Video,
  Trash2,
  Edit2,
  Sparkles,
  Layers,
  ChevronRight,
  Save,
  GraduationCap,
  ExternalLink,
  X,
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
  status: string;
  mode: string;
  meetingLink?: string | null;
  learningObjectives?: string | null;
  resources?: any;
  recordingUrl?: string | null;
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

export default function DailyTopicsManagerPage() {
  const { user } = useAuth();
  const effectiveRole = user ? getEffectiveRole(user) : "EMPLOYEE";
  const canManage = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN"].includes(effectiveRole);

  const [classes, setClasses] = useState<ScheduledClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedDomain, setSelectedDomain] = useState("All Domains");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Editor State
  const [mainTopic, setMainTopic] = useState("");
  const [learningObjectives, setLearningObjectives] = useState("");
  const [subtopics, setSubtopics] = useState<string[]>([]);
  const [newSubtopic, setNewSubtopic] = useState("");
  const [resources, setResources] = useState<Array<{ title: string; url: string; type?: string }>>([]);
  const [newResourceTitle, setNewResourceTitle] = useState("");
  const [newResourceUrl, setNewResourceUrl] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/classes");
      const data = await res.json();
      if (data.ok && Array.isArray(data.classes)) {
        setClasses(data.classes);
        // Default to first class for selected date if exists
        const forDate = data.classes.filter(
          (c: any) => c.classDate?.slice(0, 10) === selectedDate
        );
        if (forDate.length > 0 && !selectedClassId) {
          selectClass(forDate[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load classes for topics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const selectClass = (cls: ScheduledClassItem) => {
    setSelectedClassId(cls.id);
    setMainTopic(cls.topic || "");
    setLearningObjectives(cls.learningObjectives || "");

    let parsedSubs: string[] = [];
    if (Array.isArray(cls.subtopics)) parsedSubs = cls.subtopics;
    else if (typeof cls.subtopics === "string") {
      try {
        parsedSubs = JSON.parse(cls.subtopics);
      } catch (_) {}
    }
    setSubtopics(parsedSubs);

    let parsedRes: any[] = [];
    if (Array.isArray(cls.resources)) parsedRes = cls.resources;
    else if (typeof cls.resources === "string") {
      try {
        parsedRes = JSON.parse(cls.resources);
      } catch (_) {}
    }
    setResources(parsedRes);
    setSaveSuccess(false);
    setErrorMsg(null);
  };

  const handleAddSubtopic = () => {
    if (!newSubtopic.trim()) return;
    setSubtopics([...subtopics, newSubtopic.trim()]);
    setNewSubtopic("");
  };

  const handleRemoveSubtopic = (index: number) => {
    setSubtopics(subtopics.filter((_, i) => i !== index));
  };

  const handleAddResource = () => {
    if (!newResourceTitle.trim() || !newResourceUrl.trim()) return;
    setResources([
      ...resources,
      { title: newResourceTitle.trim(), url: newResourceUrl.trim() },
    ]);
    setNewResourceTitle("");
    setNewResourceUrl("");
  };

  const handleRemoveResource = (index: number) => {
    setResources(resources.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "DOCUMENT");

      const res = await fetch("/api/mobile/media/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.ok && data.url) {
        setResources([
          ...resources,
          {
            title: file.name.replace(/\.[^/.]+$/, ""),
            url: data.url,
            type: file.type.includes("pdf") ? "PDF" : "DOC",
          },
        ]);
      } else {
        setErrorMsg(data.error?.message || "File upload failed.");
      }
    } catch (err: any) {
      setErrorMsg("Failed to upload document: " + err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSaveTopics = async () => {
    if (!selectedClassId) {
      setErrorMsg("Please select a class session first.");
      return;
    }
    if (!mainTopic.trim()) {
      setErrorMsg("Main topic cannot be empty.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/admin/classes/topics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          mainTopic: mainTopic.trim(),
          subtopics,
          learningObjectives: learningObjectives.trim(),
          resources,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setSaveSuccess(true);
        // Update local class state
        setClasses((prev) =>
          prev.map((c) =>
            c.id === selectedClassId
              ? {
                  ...c,
                  topic: mainTopic.trim(),
                  subtopics,
                  learningObjectives: learningObjectives.trim(),
                  resources,
                }
              : c
          )
        );
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setErrorMsg(data.error || "Failed to save topics.");
      }
    } catch (err: any) {
      setErrorMsg("Error saving topics: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const currentClass = classes.find((c) => c.id === selectedClassId);

  // Filter classes by selected date and domain
  const dateClasses = classes.filter((c) => {
    const matchDate = c.classDate?.slice(0, 10) === selectedDate;
    const matchDomain = selectedDomain === "All Domains" || c.domain === selectedDomain;
    return matchDate && matchDomain;
  });

  return (
    <TeamCoreShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1f2228] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-red-400 mb-1">
              <BookOpen className="w-4 h-4" />
              <span>ACADEMY CURRICULUM CONTROL</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              Daily Topics & Lesson Manager
              <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-mono">
                Date-Wise Sync
              </span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Configure daily syllabus topics, modular subtopics, learning objectives, and download materials. Changes instantly reflect on the Mobile App date selector.
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
                onClick={handleSaveTopics}
                disabled={saving || !selectedClassId}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white flex items-center gap-2 shadow-lg shadow-red-900/20 transition-all disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save & Publish Topics
              </button>
            )}
          </div>
        </div>

        {/* Global Selectors Bar */}
        <div className="bg-[#0f1115] border border-[#1e222a] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Date Selector */}
            <div className="flex items-center gap-2 bg-[#14171d] border border-[#232732] px-3 py-2 rounded-lg">
              <Calendar className="w-4 h-4 text-red-400" />
              <label className="text-xs text-gray-400 font-medium">Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedClassId(null);
                }}
                className="bg-transparent text-white text-xs outline-none cursor-pointer"
              />
            </div>

            {/* Domain Selector */}
            <div className="flex items-center gap-2 bg-[#14171d] border border-[#232732] px-3 py-2 rounded-lg">
              <label className="text-xs text-gray-400 font-medium">Domain:</label>
              <select
                value={selectedDomain}
                onChange={(e) => {
                  setSelectedDomain(e.target.value);
                  setSelectedClassId(null);
                }}
                className="bg-transparent text-white text-xs outline-none cursor-pointer"
              >
                {DOMAINS.map((d) => (
                  <option key={d} value={d} className="bg-[#14161a] text-white">
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Classes for {selectedDate}: <strong>{dateClasses.length} found</strong></span>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Topics successfully updated in Core DB! Mobile horizontal date selector will immediately reflect these changes.</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 2-Column Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Classes for Selected Date */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Select Class Session
              </h2>
              <span className="text-xs text-gray-500 font-mono">
                {dateClasses.length} session(s)
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-red-500" />
                Loading sessions...
              </div>
            ) : dateClasses.length === 0 ? (
              <div className="bg-[#0f1115] border border-[#1e222a] rounded-xl p-8 text-center">
                <Calendar className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No classes scheduled on {selectedDate}.</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  Go to Class Scheduling to add a new session for this date.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dateClasses.map((cls) => {
                  const isSelected = cls.id === selectedClassId;
                  return (
                    <div
                      key={cls.id}
                      onClick={() => selectClass(cls)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-red-600/10 border-red-500 shadow-md shadow-red-950/20"
                          : "bg-[#0f1115] border-[#1e222a] hover:border-[#2a2f3a]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161920] border border-[#232732] text-gray-300">
                          {cls.domain}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400">
                          {cls.startTime} – {cls.endTime}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white line-clamp-1">{cls.title}</h3>
                      <p className="text-xs text-red-400 font-medium mt-1 line-clamp-1">
                        Topic: {cls.topic}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-2">
                        <span>Instructor: {cls.instructorName}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Topic Editor & Materials */}
          <div className="lg:col-span-2 space-y-6">
            {selectedClassId && currentClass ? (
              <div className="bg-[#0f1115] border border-[#1e222a] rounded-2xl p-6 space-y-6">
                {/* Header info */}
                <div className="border-b border-[#181a20] pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest">
                      EDITING DAILY TOPICS FOR SESSION
                    </span>
                    <span className="text-xs font-mono text-gray-400">
                      {currentClass.startTime} – {currentClass.endTime}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1">{currentClass.title}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Domain: <strong className="text-gray-300">{currentClass.domain}</strong> • Instructor: <strong className="text-gray-300">{currentClass.instructorName}</strong>
                  </p>
                </div>

                {/* Main Topic Input */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase font-mono tracking-wider">
                    Main Topic *
                  </label>
                  <input
                    type="text"
                    value={mainTopic}
                    onChange={(e) => setMainTopic(e.target.value)}
                    placeholder="e.g. Flutter Riverpod State Management & Offline Cache"
                    className="w-full bg-[#14171d] border border-[#232732] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-red-500 transition-colors"
                  />
                </div>

                {/* Learning Objectives */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase font-mono tracking-wider">
                    Learning Objectives & Overview
                  </label>
                  <textarea
                    rows={3}
                    value={learningObjectives}
                    onChange={(e) => setLearningObjectives(e.target.value)}
                    placeholder="Detail the technical milestones, deliverables, and core knowledge interns should gain from today's lesson..."
                    className="w-full bg-[#14171d] border border-[#232732] rounded-xl p-3.5 text-xs text-white outline-none focus:border-red-500 transition-colors"
                  />
                </div>

                {/* Subtopics Manager */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase font-mono tracking-wider">
                    Lesson Subtopics ({subtopics.length})
                  </label>
                  <p className="text-[11px] text-gray-500 mb-3">
                    Add granular subtopics so mobile users can see exactly what is taught.
                  </p>

                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newSubtopic}
                      onChange={(e) => setNewSubtopic(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSubtopic())}
                      placeholder="e.g. Optimistic State Updates with Outbox Queue"
                      className="flex-1 bg-[#14171d] border border-[#232732] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddSubtopic}
                      className="px-4 py-2 bg-[#1a1e27] hover:bg-[#222733] border border-[#282d3b] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Subtopic
                    </button>
                  </div>

                  <div className="space-y-2">
                    {subtopics.map((sub, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 bg-[#14171d] border border-[#1f232b] px-3.5 py-2 rounded-xl text-xs text-gray-200"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-gray-500">{idx + 1}.</span>
                          <span>{sub}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtopic(idx)}
                          className="text-gray-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Class Resources & Materials Upload */}
                <div className="border-t border-[#181a20] pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase font-mono tracking-wider">
                      Class Resources, PDFs & Links ({resources.length})
                    </label>
                    <label className="cursor-pointer px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors">
                      <Upload className={`w-3.5 h-3.5 ${uploadingFile ? "animate-spin" : ""}`} />
                      <span>{uploadingFile ? "Uploading..." : "Upload PDF / Doc"}</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.zip"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-4">
                    Attach reference links, cloud slide decks, documentation links, or PDF guides.
                  </p>

                  {/* Add Resource Link Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                    <input
                      type="text"
                      value={newResourceTitle}
                      onChange={(e) => setNewResourceTitle(e.target.value)}
                      placeholder="Resource Title (e.g. Flutter Architecture PDF)"
                      className="bg-[#14171d] border border-[#232732] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500"
                    />
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={newResourceUrl}
                        onChange={(e) => setNewResourceUrl(e.target.value)}
                        placeholder="https://..."
                        className="flex-1 bg-[#14171d] border border-[#232732] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddResource}
                        className="px-3 py-2 bg-[#1a1e27] hover:bg-[#222733] border border-[#282d3b] text-white text-xs font-semibold rounded-xl flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Link
                      </button>
                    </div>
                  </div>

                  {/* Resources List */}
                  <div className="space-y-2">
                    {resources.map((res, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 bg-[#14171d] border border-[#1f232b] px-3.5 py-2.5 rounded-xl text-xs text-gray-200"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-red-400 shrink-0" />
                          <span className="font-medium text-white truncate">{res.title}</span>
                          <a
                            href={res.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 truncate"
                          >
                            <span className="truncate max-w-[200px]">{res.url}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveResource(idx)}
                          className="text-gray-500 hover:text-red-400 p-1 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <div className="border-t border-[#181a20] pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleSaveTopics}
                    disabled={saving}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-red-900/20 transition-all disabled:opacity-50"
                  >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save & Publish Daily Topics
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#0f1115] border border-[#1e222a] rounded-2xl p-16 text-center">
                <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-white">Select a Class Session</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                  Choose a class on the left to view, edit, or upload daily topics, subtopics, and resources.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </TeamCoreShell>
  );
}
