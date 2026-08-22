"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FolderGit2,
  Plus,
  ArrowUpRight,
  Github,
  Globe,
  Edit3,
  Trash2,
  Check,
  X,
  AlertCircle,
  Users
} from "lucide-react";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { Project, Profile } from "@/lib/data-store";

import { useAuth } from "@/context/AuthContext";

export default function MyProjectsPage() {
  const { user: currentUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    shortDesc: "",
    overview: "",
    category: "Web",
    status: "Live",
    techStackStr: "",
    liveUrl: "",
    repoUrl: "",
    thumbnailUrl: "",
    selectedCollabs: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentUser?.id) {
      loadProjects(currentUser.id);
    }
  }, [currentUser]);

  const loadProjects = (userId: string) => {
    setLoading(true);
    Promise.all([
      fetch(`/api/projects?developerId=${userId}`).then((r) => r.json()).catch(() => ({ projects: [] })),
      fetch("/api/team/public").then((r) => r.json()).catch(() => ({ profiles: [] })),
    ])
      .then(([projRes, teamRes]) => {
        if (projRes.projects) setProjects(projRes.projects);
        if (teamRes.profiles) setTeamMembers(teamRes.profiles);
      })
      .finally(() => setLoading(false));
  };

  const handleOpenAddModal = () => {
    setEditingProjectId(null);
    setFormData({
      title: "",
      slug: "",
      shortDesc: "",
      overview: "",
      category: "Web",
      status: "Live",
      techStackStr: "Next.js, TypeScript, TailwindCSS",
      liveUrl: "",
      repoUrl: "",
      thumbnailUrl: "/assets/images/logo.jpeg",
      selectedCollabs: [],
    });
    setModalOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setSaving(true);
    const slug = formData.slug.trim() || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const techStack = formData.techStackStr.split(",").map((s) => s.trim()).filter(Boolean);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title.trim(),
          slug,
          shortDesc: formData.shortDesc.trim(),
          overview: formData.overview.trim(),
          category: formData.category,
          status: formData.status,
          techStack,
          liveUrl: formData.liveUrl.trim() || null,
          repoUrl: formData.repoUrl.trim() || null,
          thumbnailUrl: formData.thumbnailUrl.trim() || "/assets/images/logo.jpeg",
          collaboratorIds: formData.selectedCollabs,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.project) {
        setProjects((prev) => [data.project, ...prev]);
        setModalOpen(false);
      }
    } catch {
      alert("Failed to save project build.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <TeamCoreShell
      title="My Project Builds"
      subtitle="Engineering Pipeline & Case Studies"
      actions={
        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)] inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Project</span>
        </button>
      }
    >
      <div className="space-y-6">
        
        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-64 rounded-3xl bg-[#0A0A0A] animate-pulse border border-white/5" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="p-16 rounded-3xl bg-[#0A0A0A] border border-white/5 text-center space-y-3">
            <FolderGit2 className="w-10 h-10 text-[#555] mx-auto" />
            <h3 className="font-orbitron font-bold text-sm text-white uppercase">No Project Builds Yet</h3>
            <p className="text-xs text-[#777] max-w-sm mx-auto">
              Publish your first web application, AI agent, or cybersecurity pipeline to feature it on your profile and team portfolio.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="px-6 py-2.5 rounded-xl bg-crimson font-orbitron text-xs font-bold uppercase text-white tracking-wider inline-flex items-center gap-1.5 mt-2"
            >
              <Plus className="w-4 h-4" /> Create First Build
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="rounded-3xl bg-[#0A0A0A] border border-crimson/20 hover:border-bright-red/50 overflow-hidden flex flex-col justify-between transition-all group shadow-xl"
              >
                <div className="relative aspect-video bg-[#050505] overflow-hidden">
                  <img
                    src={proj.thumbnailUrl || "/assets/images/logo.jpeg"}
                    alt={proj.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-crimson text-white text-[8px] font-orbitron font-bold uppercase">
                      {proj.category}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-black/70 text-emerald-400 text-[8px] font-orbitron font-bold uppercase">
                      {proj.status}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <h3 className="font-orbitron font-bold text-sm text-white group-hover:text-bright-red transition-colors">
                      {proj.title}
                    </h3>
                    <p className="text-xs text-[#888] line-clamp-2 leading-relaxed">
                      {proj.shortDesc || proj.overview}
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex flex-wrap gap-1">
                      {proj.techStack?.slice(0, 3).map((tech, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-[#151515] text-[9px] font-orbitron text-[#AAA]">
                          {tech}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <Link
                        href={`/projects/${proj.slug}`}
                        className="flex-1 py-2 rounded-xl bg-[#141414] hover:bg-crimson text-white text-[10px] font-orbitron font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                      >
                        Case Study <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                      {proj.liveUrl && (
                        <a
                          href={proj.liveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-[#141414] hover:bg-deep-red/30 text-[#888] hover:text-white"
                          title="Live Demo"
                        >
                          <Globe className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {proj.repoUrl && (
                        <a
                          href={proj.repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-[#141414] hover:bg-deep-red/30 text-[#888] hover:text-white"
                          title="GitHub Repository"
                        >
                          <Github className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ─── ADD PROJECT MODAL ────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#0D0D0D] border border-crimson/30 rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-orbitron font-bold text-sm text-white uppercase">New Project Build</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded bg-[#1A1A1A] text-[#888] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Project Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                  placeholder="e.g. HireLens AI"
                />
              </div>

              <div>
                <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Short Description</label>
                <input
                  type="text"
                  value={formData.shortDesc}
                  onChange={(e) => setFormData({ ...formData, shortDesc: e.target.value })}
                  className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                  placeholder="Autonomous AI Interview & Assessment Platform"
                />
              </div>

              <div>
                <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Tech Stack (Comma-separated)</label>
                <input
                  type="text"
                  value={formData.techStackStr}
                  onChange={(e) => setFormData({ ...formData, techStackStr: e.target.value })}
                  className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                  placeholder="Next.js, Python, FastAPI, Supabase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                  >
                    <option value="Web">Web Application</option>
                    <option value="AI">AI & Machine Learning</option>
                    <option value="Mobile">Mobile Application</option>
                    <option value="Cybersecurity">Cybersecurity</option>
                    <option value="Cloud">Cloud & DevOps</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                  >
                    <option value="Live">Live / Production</option>
                    <option value="Beta">Beta Testing</option>
                    <option value="In Progress">In Development</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Live URL</label>
                  <input
                    type="url"
                    value={formData.liveUrl}
                    onChange={(e) => setFormData({ ...formData, liveUrl: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">GitHub Repo</label>
                  <input
                    type="url"
                    value={formData.repoUrl}
                    onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                    placeholder="https://github.com/..."
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Thumbnail Image URL</label>
                <input
                  type="text"
                  value={formData.thumbnailUrl}
                  onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                  className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#141414] font-orbitron text-xs text-[#888] uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-crimson hover:bg-bright-red font-orbitron text-xs font-bold text-white uppercase shadow-[0_0_15px_rgba(217,4,41,0.3)] transition-all"
                >
                  {saving ? "Publishing..." : "Publish Build"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </TeamCoreShell>
  );
}
