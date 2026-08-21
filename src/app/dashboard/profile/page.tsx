"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Camera,
  Globe,
  Github,
  Linkedin,
  Youtube,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  ArrowUpRight,
  Sparkles,
  Shield
} from "lucide-react";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { CodeXaAvatar } from "@/components/ui/CodeXaAvatar";
import { CodeXaMediaSelectorModal } from "@/components/ui/CodeXaMediaSelectorModal";
import { Profile } from "@/lib/data-store";

export default function MyProfileEditorPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");

  // Media selector modal
  const [mediaModalOpen, setMediaModalOpen] = useState(false);

  // Feedback state
  const [saveState, setSaveState] = useState<"idle" | "loading" | "saved" | "error">("idle");
  const [feedbackMsg, setFeedbackMsg] = useState("");

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
          loadProfileData(data.user.username);
        }
      })
      .catch(() => {});
  }, []);

  const loadProfileData = (username: string) => {
    setLoading(true);
    fetch(`/api/profile/${username}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.profile) {
          const p = data.profile;
          setProfile(p);
          setDisplayName(p.displayName || "");
          setHeadline(p.headline || "");
          setBio(p.bio || "");
          setSkills(p.skills || []);
          setGithubUrl(p.githubUrl || "");
          setLinkedinUrl(p.linkedinUrl || "");
          setPortfolioUrl(p.portfolioUrl || "");
        }
      })
      .finally(() => setLoading(false));
  };

  const handleAddSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    const clean = newSkillInput.trim();
    if (clean && !skills.includes(clean)) {
      setSkills([...skills, clean]);
      setNewSkillInput("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaveState("loading");
    setFeedbackMsg("");

    try {
      const res = await fetch(`/api/profile/${profile.username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          headline,
          bio,
          skills,
          githubUrl,
          linkedinUrl,
          portfolioUrl,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setProfile(data.profile);
        setSaveState("saved");
        setFeedbackMsg("Profile updated successfully!");
        setTimeout(() => setSaveState("idle"), 3000);
      } else {
        setSaveState("error");
        setFeedbackMsg(data.error || "Failed to update profile.");
      }
    } catch {
      setSaveState("error");
      setFeedbackMsg("Network error saving changes.");
    }
  };

  return (
    <TeamCoreShell
      title="Edit My Profile"
      subtitle="Identity & Professional Portfolio"
      actions={
        profile?.username && (
          <Link
            href={`/team/${profile.username}`}
            target="_blank"
            className="px-4 py-2 rounded-xl bg-[#141414] hover:bg-deep-red/20 border border-crimson/30 text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
          >
            <span>View Public Profile</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-bright-red" />
          </Link>
        )
      }
    >
      <div className="max-w-4xl space-y-8">
        
        {/* ─── AVATAR / PFP STUDIO CARD ──────────────────────────────────── */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0A0A0A] border border-crimson/25 flex flex-col sm:flex-row items-center gap-6 shadow-xl">
          <div className="relative group">
            <CodeXaAvatar
              src={profile?.mediaUrl}
              alt={displayName || "Avatar"}
              size="2xl"
              showGlow
            />
            <button
              type="button"
              onClick={() => setMediaModalOpen(true)}
              className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-orbitron font-bold uppercase"
              title="Change Profile Picture"
            >
              <Camera className="w-5 h-5 mb-1 text-bright-red" />
              Change
            </button>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
              <h2 className="font-orbitron font-black text-xl text-white uppercase">{displayName || "Member"}</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-crimson/20 border border-crimson/40 text-bright-red font-orbitron text-[10px] font-bold uppercase">
                {profile?.role?.replace("_", " ") || "DEVELOPER"}
              </span>
            </div>
            <p className="text-xs font-mono text-crimson">@{profile?.username}</p>
            <p className="text-xs text-[#888]">
              Select existing CodeXa media, previous uploads from your Supabase gallery, or upload a new photo.
            </p>
            <button
              type="button"
              onClick={() => setMediaModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#141414] hover:bg-crimson border border-crimson/30 text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 mt-2"
            >
              <Camera className="w-3.5 h-3.5 text-bright-red" /> Change Photo
            </button>
          </div>
        </div>

        {/* ─── FORM DETAILS CARD ─────────────────────────────────────────── */}
        <form onSubmit={handleSaveProfile} className="p-6 sm:p-8 rounded-3xl bg-[#0A0A0A] border border-crimson/25 space-y-6 shadow-xl">
          
          {feedbackMsg && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs ${
              saveState === "saved" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-deep-red/20 text-bright-red border border-bright-red/40"
            }`}>
              {saveState === "saved" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{feedbackMsg}</span>
            </div>
          )}

          <div className="space-y-4">
            
            {/* Display Name */}
            <div>
              <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#111] border border-crimson/20 focus:border-bright-red rounded-xl p-3 text-xs text-white outline-none transition-colors"
                placeholder="e.g. Ashu"
              />
            </div>

            {/* Professional Headline */}
            <div>
              <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1.5">
                Professional Headline
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full bg-[#111] border border-crimson/20 focus:border-bright-red rounded-xl p-3 text-xs text-white outline-none transition-colors"
                placeholder="e.g. AI Developer • Full Stack • Cybersecurity"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1.5">
                Professional Bio (Line breaks preserved)
              </label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-[#111] border border-crimson/20 focus:border-bright-red rounded-xl p-3.5 text-xs text-white outline-none resize-none leading-relaxed transition-colors"
                placeholder="Building intelligent, secure, and scalable digital products for CodeXa Agency..."
              />
            </div>

            {/* Dynamic Skills */}
            <div className="space-y-2">
              <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block">
                Technical Competencies & Skills
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={handleAddSkill}
                  placeholder="Type skill & press Enter (e.g. Next.js, Python, Supabase)..."
                  className="flex-1 bg-[#111] border border-crimson/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="px-4 py-2 rounded-xl bg-[#141414] hover:bg-crimson text-white text-xs font-orbitron font-bold uppercase transition-colors"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#141414] border border-crimson/25 text-xs font-orbitron text-white"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-[#888] hover:text-red-400"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Social & Portfolio Links */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1.5">
                  GitHub URL
                </label>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="w-full bg-[#111] border border-crimson/20 focus:border-bright-red rounded-xl p-3 text-xs text-white outline-none transition-colors"
                  placeholder="https://github.com/username"
                />
              </div>

              <div>
                <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1.5">
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="w-full bg-[#111] border border-crimson/20 focus:border-bright-red rounded-xl p-3 text-xs text-white outline-none transition-colors"
                  placeholder="https://linkedin.com/in/username"
                />
              </div>

              <div>
                <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1.5">
                  Portfolio / Website
                </label>
                <input
                  type="url"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  className="w-full bg-[#111] border border-crimson/20 focus:border-bright-red rounded-xl p-3 text-xs text-white outline-none transition-colors"
                  placeholder="https://yourportfolio.dev"
                />
              </div>
            </div>

          </div>

          <div className="pt-4 border-t border-white/5 flex justify-end">
            <button
              type="submit"
              disabled={saveState === "loading"}
              className="px-8 py-3 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)] disabled:opacity-50"
            >
              {saveState === "loading" ? "Saving Changes..." : "Save Profile Details"}
            </button>
          </div>

        </form>

      </div>

      {/* ─── MEDIA SELECTOR MODAL ─────────────────────────────────────── */}
      <CodeXaMediaSelectorModal
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        currentAvatarUrl={profile?.mediaUrl}
        onSuccess={(newAvatarUrl) => {
          setProfile((prev) => (prev ? { ...prev, mediaUrl: newAvatarUrl } : null));
        }}
      />
    </TeamCoreShell>
  );
}
