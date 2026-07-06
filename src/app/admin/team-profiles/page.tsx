/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getProfileImageStyle } from "@/lib/profile-media";
import { ProfileCropModal } from "@/components/ui/ProfileCropModal";
import { LEADERSHIP_DATA } from "@/config/leadershipData";

import "../../globals.css";

interface ProfileItem {
  id: string;
  userId: string | null;
  memberType: "LEADERSHIP" | "CORE_TEAM";
  leadershipPosition: "FOUNDER" | "CO_FOUNDER" | "CEO" | null;
  displayName: string;
  publicBio: string | null;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  cropX?: number | null;
  cropY?: number | null;
  cropW?: number | null;
  cropH?: number | null;
  cropZoom?: number | null;
  cropRotation?: number | null;
  isPublic: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    role: string;
    isActive: boolean;
    lastLoginAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

type UIState = "idle" | "loading" | "error";

function TeamProfilesContent() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState(false);

  // Hidden upload ref for quick leadership media replacement
  const quickUploadRef = useRef<HTMLInputElement>(null);
  const [quickUploadProfileId, setQuickUploadProfileId] = useState<string | null>(null);

  // Crop states
  const [cropModalFile, setCropModalFile] = useState<File | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropType, setCropType] = useState<"LEADERSHIP" | "CORE_TEAM_EDIT" | "CORE_TEAM_CREATE" | null>(null);

  // Edit crop coordinates
  const [editCropX, setEditCropX] = useState<number | null>(null);
  const [editCropY, setEditCropY] = useState<number | null>(null);
  const [editCropW, setEditCropW] = useState<number | null>(null);
  const [editCropH, setEditCropH] = useState<number | null>(null);
  const [editCropZoom, setEditCropZoom] = useState<number | null>(null);
  const [editCropRotation, setEditCropRotation] = useState<number | null>(null);

  // Create crop coordinates
  const [createCropX, setCreateCropX] = useState<number | null>(null);
  const [createCropY, setCreateCropY] = useState<number | null>(null);
  const [createCropW, setCreateCropW] = useState<number | null>(null);
  const [createCropH, setCreateCropH] = useState<number | null>(null);
  const [createCropZoom, setCreateCropZoom] = useState<number | null>(null);
  const [createCropRotation, setCreateCropRotation] = useState<number | null>(null);

  // Lists & Filtering
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [filteredCoreTeam, setFilteredCoreTeam] = useState<ProfileItem[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, ACTIVE, INACTIVE
  const [visibilityFilter, setVisibilityFilter] = useState("ALL"); // ALL, PUBLIC, HIDDEN
  const [sessionOwner, setSessionOwner] = useState<any>(null);
  const [uiState, setUiState] = useState<UIState>("loading");

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createBio, setCreateBio] = useState("");
  const [createOrder, setCreateOrder] = useState(0);
  const [createPublic, setCreatePublic] = useState(true);
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [createPreview, setCreatePreview] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // One-time Reveal State
  const [revealCredentials, setRevealCredentials] = useState<{ username: string; tempPass: string } | null>(null);

  // Edit Modal State
  const [editingProfile, setEditingProfile] = useState<ProfileItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editOrder, setEditOrder] = useState(0);
  const [editPublic, setEditPublic] = useState(true);
  const [editActive, setEditActive] = useState(true);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [editRemoveMedia, setEditRemoveMedia] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Password Reset Reveal
  const [resetRevealPassword, setResetRevealPassword] = useState<string | null>(null);

  // Confirmation Modals
  const [deleteConfirmProfile, setDeleteConfirmProfile] = useState<ProfileItem | null>(null);
  const [resetConfirmProfile, setResetConfirmProfile] = useState<ProfileItem | null>(null);

  const loadData = () => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        if (!data.authenticated || data.user.role !== "OWNER") {
          router.replace("/login");
          return;
        }
        setSessionOwner(data.user);

        fetch("/api/admin/team")
          .then((r) => r.json())
          .then((teamData) => {
            if (teamData.success) {
              setProfiles(teamData.profiles);
              setUiState("idle");
            } else {
              setUiState("error");
            }
          })
          .catch(() => setUiState("error"));
      })
      .catch(() => router.replace("/login"));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter only Core Team profiles client-side
  useEffect(() => {
    const coreTeamOnly = profiles.filter((p) => p.memberType === "CORE_TEAM");
    let result = [...coreTeamOnly];

    // Search Query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.displayName.toLowerCase().includes(q) ||
          p.user?.username.toLowerCase().includes(q)
      );
    }

    // Status Filter
    if (statusFilter !== "ALL") {
      const activeBool = statusFilter === "ACTIVE";
      result = result.filter((p) => p.user?.isActive === activeBool);
    }

    // Visibility Filter
    if (visibilityFilter !== "ALL") {
      const publicBool = visibilityFilter === "PUBLIC";
      result = result.filter((p) => p.isPublic === publicBool);
    }

    setFilteredCoreTeam(result);
  }, [profiles, searchQuery, statusFilter, visibilityFilter]);

  // Create profile handlers
  const handleCreateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isGif = file.type === "image/gif";
    const maxLimit = isGif ? 15 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxLimit) {
      alert(`File too large. Maximum size is ${isGif ? "15MB for GIFs" : "10MB"}.`);
      return;
    }

    setCropType("CORE_TEAM_CREATE");
    setCropModalFile(file);
    setShowCropModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || createLoading) return;

    setCreateLoading(true);
    setCreateError("");

    const formData = new FormData();
    formData.append("displayName", createName.trim());
    formData.append("publicBio", createBio.trim());
    formData.append("isPublic", createPublic ? "true" : "false");
    formData.append("displayOrder", String(createOrder));
    if (createFile) {
      formData.append("profileMedia", createFile);
      if (createCropX !== null) formData.append("cropX", createCropX.toString());
      if (createCropY !== null) formData.append("cropY", createCropY.toString());
      if (createCropW !== null) formData.append("cropW", createCropW.toString());
      if (createCropH !== null) formData.append("cropH", createCropH.toString());
      if (createCropZoom !== null) formData.append("cropZoom", createCropZoom.toString());
      if (createCropRotation !== null) formData.append("cropRotation", createCropRotation.toString());
    }

    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setRevealCredentials({
          username: data.username,
          tempPass: data.tempPassword,
        });
        setIsCreateOpen(false);
        setCreateName("");
        setCreateBio("");
        setCreateOrder(0);
        setCreatePublic(true);
        setCreateFile(null);
        setCreatePreview(null);
        loadData();
      } else {
        setCreateError(data.error ?? "Failed to create account.");
      }
    } catch {
      setCreateError("Network error. Try again.");
    } finally {
      setCreateLoading(false);
    }
  };

  // Edit profile handlers (Core Team)
  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isGif = file.type === "image/gif";
    const maxLimit = isGif ? 15 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxLimit) {
      alert(`File too large. Maximum size is ${isGif ? "15MB for GIFs" : "10MB"}.`);
      return;
    }

    setCropType("CORE_TEAM_EDIT");
    setCropModalFile(file);
    setShowCropModal(true);
  };

  const handleEditOpen = (profile: ProfileItem) => {
    setEditingProfile(profile);
    setEditName(profile.displayName);
    setEditBio(profile.publicBio ?? "");
    setEditOrder(profile.displayOrder);
    setEditPublic(profile.isPublic);
    setEditActive(profile.user?.isActive ?? true);
    setEditFile(null);
    setEditPreview(null);
    setEditCropX(profile.cropX ?? null);
    setEditCropY(profile.cropY ?? null);
    setEditCropW(profile.cropW ?? null);
    setEditCropH(profile.cropH ?? null);
    setEditCropZoom(profile.cropZoom ?? null);
    setEditCropRotation(profile.cropRotation ?? null);
    setEditRemoveMedia(false);
    setEditError("");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || editLoading) return;

    setEditLoading(true);
    setEditError("");

    const formData = new FormData();
    // Only core team fields can be updated as text on client
    formData.append("displayName", editName.trim());
    formData.append("publicBio", editBio.trim());
    formData.append("isPublic", editPublic ? "true" : "false");
    formData.append("displayOrder", String(editOrder));
    formData.append("isActive", editActive ? "true" : "false");

    if (editRemoveMedia) {
      formData.append("removeMedia", "true");
    } else if (editFile) {
      formData.append("profileMedia", editFile);
      if (editCropX !== null) formData.append("cropX", editCropX.toString());
      if (editCropY !== null) formData.append("cropY", editCropY.toString());
      if (editCropW !== null) formData.append("cropW", editCropW.toString());
      if (editCropH !== null) formData.append("cropH", editCropH.toString());
      if (editCropZoom !== null) formData.append("cropZoom", editCropZoom.toString());
      if (editCropRotation !== null) formData.append("cropRotation", editCropRotation.toString());
    }

    try {
      const response = await fetch(`/api/admin/team/${editingProfile.id}`, {
        method: "PATCH",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setEditingProfile(null);
        loadData();
      } else {
        setEditError(data.error ?? "Failed to save profile changes.");
      }
    } catch {
      setEditError("Network error. Try again.");
    } finally {
      setEditLoading(false);
    }
  };

  // Quick media handler for leadership
  const handleLeadershipMediaSelect = (profileId: string) => {
    setQuickUploadProfileId(profileId);
    setCropType("LEADERSHIP");
    quickUploadRef.current?.click();
  };

  const handleLeadershipMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !quickUploadProfileId) return;

    const isGif = file.type === "image/gif";
    const maxLimit = isGif ? 15 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxLimit) {
      alert(`File too large. Maximum size is ${isGif ? "15MB for GIFs" : "10MB"}.`);
      return;
    }

    setCropModalFile(file);
    setShowCropModal(true);
  };

  const handleCropComplete = async ({ blob, cropData }: { blob: Blob | File; cropData?: any }) => {
    setShowCropModal(false);
    setCropModalFile(null);
    if (quickUploadRef.current) quickUploadRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (editFileInputRef.current) editFileInputRef.current.value = "";

    if (cropType === "LEADERSHIP") {
      if (!quickUploadProfileId) return;

      const formData = new FormData();
      formData.append("profileMedia", blob);
      if (cropData) {
        formData.append("cropX", cropData.x.toString());
        formData.append("cropY", cropData.y.toString());
        formData.append("cropW", cropData.w.toString());
        formData.append("cropH", cropData.h.toString());
        formData.append("cropZoom", cropData.zoom.toString());
        formData.append("cropRotation", cropData.rotation.toString());
      } else {
        formData.append("cropX", "0");
        formData.append("cropY", "0");
        formData.append("cropW", "100");
        formData.append("cropH", "100");
        formData.append("cropZoom", "1");
        formData.append("cropRotation", "0");
      }

      try {
        setUiState("loading");
        const res = await fetch(`/api/admin/team/${quickUploadProfileId}`, {
          method: "PATCH",
          body: formData,
        });
        if (res.ok) {
          loadData();
        } else {
          const data = await res.json();
          alert(data.error ?? "Failed to upload image.");
          setUiState("idle");
        }
      } catch {
        alert("Network error uploading media.");
        setUiState("idle");
      } finally {
        setQuickUploadProfileId(null);
      }
    } else if (cropType === "CORE_TEAM_EDIT") {
      setEditFile(blob as File);
      setEditRemoveMedia(false);
      if (cropData) {
        setEditCropX(cropData.x);
        setEditCropY(cropData.y);
        setEditCropW(cropData.w);
        setEditCropH(cropData.h);
        setEditCropZoom(cropData.zoom);
        setEditCropRotation(cropData.rotation);
      } else {
        setEditCropX(0);
        setEditCropY(0);
        setEditCropW(100);
        setEditCropH(100);
        setEditCropZoom(1);
        setEditCropRotation(0);
      }
      setEditPreview(URL.createObjectURL(blob));
    } else if (cropType === "CORE_TEAM_CREATE") {
      setCreateFile(blob as File);
      if (cropData) {
        setCreateCropX(cropData.x);
        setCreateCropY(cropData.y);
        setCreateCropW(cropData.w);
        setCreateCropH(cropData.h);
        setCreateCropZoom(cropData.zoom);
        setCreateCropRotation(cropData.rotation);
      } else {
        setCreateCropX(0);
        setCreateCropY(0);
        setCreateCropW(100);
        setCreateCropH(100);
        setCreateCropZoom(1);
        setCreateCropRotation(0);
      }
      setCreatePreview(URL.createObjectURL(blob));
    }
  };

  const handleLeadershipMediaRemove = async (profileId: string) => {
    if (!confirm("Are you sure you want to remove the media and restore the fallback placeholder?")) return;

    const formData = new FormData();
    formData.append("removeMedia", "true");

    try {
      setUiState("loading");
      const res = await fetch(`/api/admin/team/${profileId}`, {
        method: "PATCH",
        body: formData,
      });
      if (res.ok) {
        loadData();
      } else {
        const data = await res.json();
        alert(data.error ?? "Failed to remove media.");
        setUiState("idle");
      }
    } catch {
      alert("Network error.");
      setUiState("idle");
    }
  };

  // Password reset handlers
  const handleResetPassword = async () => {
    if (!resetConfirmProfile) return;
    try {
      const res = await fetch(`/api/admin/team/${resetConfirmProfile.id}/reset-password`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResetRevealPassword(data.tempPassword);
      }
    } catch (e) {
      // ignore
    } finally {
      setResetConfirmProfile(null);
    }
  };

  // Delete handler
  const handleDeleteProfile = async () => {
    if (!deleteConfirmProfile) return;
    try {
      const res = await fetch(`/api/admin/team/${deleteConfirmProfile.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadData();
      }
    } catch (e) {
      // ignore
    } finally {
      setDeleteConfirmProfile(null);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  };

  // Helper to render leadership position labels — sourced from locked config
  const getPositionLabel = (pos: string | null) => {
    if (!pos) return "Board Member";
    const data = LEADERSHIP_DATA[pos as keyof typeof LEADERSHIP_DATA];
    if (!data) return "Board Member";
    return `${pos === "CO_FOUNDER" ? "Co-Founder" : pos.charAt(0) + pos.slice(1).toLowerCase()} — ${data.name}`;
  };

  const getPositionLockedBio = (pos: string | null) => {
    if (!pos) return "";
    const data = LEADERSHIP_DATA[pos as keyof typeof LEADERSHIP_DATA];
    if (!data) return "";
    // Show first sentence of description (before first period that ends a sentence)
    return data.description.split(".\n")[0].split(". ")[0] + ".";
  };

  const getPositionLockedRole = (pos: string | null) => {
    if (!pos) return "";
    const data = LEADERSHIP_DATA[pos as keyof typeof LEADERSHIP_DATA];
    return data?.role ?? "";
  };

  if (uiState === "loading") {
    return (
      <div className="min-h-screen bg-[#070707] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#A5A5A5]">
          <svg className="w-5 h-5 animate-spin text-[#D90429]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
          </svg>
          <span className="font-orbitron text-sm tracking-wider">Syncing System Database...</span>
        </div>
      </div>
    );
  }

  // Segment profiles
  const leadershipProfiles = profiles.filter((p) => p.memberType === "LEADERSHIP");

  return (
    <div className="min-h-screen bg-[#070707] flex text-[#F7F7F7] relative overflow-hidden">
      {/* Input element for leadership quick upload */}
      <input
        ref={quickUploadRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.gif"
        onChange={handleLeadershipMediaUpload}
        className="hidden"
      />

      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-[rgba(217,4,41,0.15)] flex flex-col z-20 bg-[#070707]/95">
        <div className="px-6 py-5 border-b border-[rgba(217,4,41,0.1)] flex items-center gap-3">
          {!logoError ? (
            <img
              src="/assets/images/logo.jpeg"
              alt="CodeXa Agency logo"
              className="w-10 h-10 object-contain rounded border border-crimson/25 shadow-[0_0_10px_rgba(217,4,41,0.2)]"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#D90429]/30 to-[#63000F]/50 border border-[#D90429]/40">
              <span className="text-[#D90429] font-orbitron font-black text-sm">⚡</span>
            </div>
          )}
          <div>
            <div className="font-orbitron text-xs font-bold tracking-wider">CODEXA</div>
            <div className="text-[10px] text-[#A5A5A5] tracking-widest">OWNER PANEL</div>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-[rgba(217,4,41,0.08)]">
          <div className="text-[10px] text-[#A5A5A5] uppercase font-orbitron tracking-widest mb-1">Signed in as</div>
          <div className="text-sm font-semibold truncate">{sessionOwner?.displayName ?? "Owner"}</div>
        </div>

        <nav className="flex-1 px-3 py-4">
          <div className="text-[10px] text-[#333] font-orbitron tracking-widest uppercase px-3 mb-2">Navigation</div>
          <ul className="space-y-1">
            <li>
              <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#A5A5A5] hover:text-[#F7F7F7] hover:bg-[rgba(217,4,41,0.06)] transition-all duration-150 group">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#A5A5A5]" aria-hidden="true">
                  <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z" clipRule="evenodd" />
                </svg>
                Overview
              </Link>
            </li>
            <li>
              <Link href="/admin/team-profiles" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#F7F7F7] bg-[rgba(217,4,41,0.08)] border border-[rgba(217,4,41,0.15)] transition-all duration-150 group">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#D90429]" aria-hidden="true">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
                Team Profiles
              </Link>
            </li>
          </ul>
        </nav>

        <div className="px-3 pb-6 border-t border-[rgba(217,4,41,0.08)] pt-4">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#A5A5A5] hover:text-[#D90429] hover:bg-[rgba(217,4,41,0.06)] transition-all duration-150">
            <span className="text-xs">🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        
        {/* Header */}
        <header className="px-8 py-6 border-b border-[rgba(217,4,41,0.08)] flex justify-between items-center bg-[#070707]/90 relative z-20">
          <div>
            <h1 className="font-orbitron text-lg font-bold text-[#F7F7F7]">Team Profiles Manager</h1>
            <p className="text-xs text-[#A5A5A5] mt-0.5 font-light">Manage Leadership display media and Core Team workspace logins.</p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-5 py-2.5 rounded-lg font-orbitron text-xs tracking-wider uppercase text-white bg-gradient-to-r from-[#D90429] to-[#FF6B35] shadow-[0_4px_15px_rgba(217,4,41,0.35)] hover:opacity-90 transition-opacity"
          >
            Create Team Login
          </button>
        </header>

        {/* Scrollable Work Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-[radial-gradient(circle_at_top,rgba(217,4,41,0.02)_0%,transparent_60%)]">
          
          {/* ─── SECTION 1: LEADERSHIP PROFILE MEDIA MANAGER ────────── */}
          <section className="space-y-4">
            <div>
              <h2 className="font-orbitron text-sm font-bold text-white uppercase tracking-wider">Leadership Profile Media</h2>
              <p className="text-[11px] text-[#A5A5A5] font-light mt-0.5">Written content (names, bios, quotes) is permanently locked. Manage static image and animated GIF media files below.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {leadershipProfiles.map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-xl border border-[rgba(217,4,41,0.15)] bg-[#0B0B0B] p-5 flex flex-col justify-between relative overflow-hidden group shadow-md"
                >
                  {/* Subtle red outline glow */}
                  <div className="absolute inset-0 border border-transparent group-hover:border-[#D90429]/30 transition-all duration-300 pointer-events-none rounded-xl" />

                  <div className="flex items-start gap-4">
                    {/* Media Preview Circle */}
                    <div className="w-16 h-16 rounded-full border border-crimson/25 overflow-hidden bg-[#111] flex-shrink-0 flex items-center justify-center relative">
                      {lead.mediaUrl ? (
                        (() => {
                          const styleInfo = getProfileImageStyle(lead);
                          return (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={styleInfo.src} alt={lead.displayName} style={styleInfo.imgStyle} />
                          );
                        })()
                      ) : (
                        <div className="text-crimson font-orbitron font-black text-xs select-none">CDXA</div>
                      )}
                    </div>

                    <div className="flex-1">
                      <h3 className="font-orbitron font-bold text-sm text-white tracking-wide uppercase">
                        {getPositionLabel(lead.leadershipPosition)}
                      </h3>
                      <p className="text-[9px] text-[#D90429]/70 font-orbitron tracking-wider uppercase mt-0.5 font-bold">
                        {getPositionLockedRole(lead.leadershipPosition)}
                      </p>
                      <p className="text-[10px] text-[#A5A5A5] leading-relaxed mt-1.5 font-light italic line-clamp-2">
                        &ldquo;{getPositionLockedBio(lead.leadershipPosition)}&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Locked text reminder */}
                  <div className="mt-4 pt-3 border-t border-[#191919] flex justify-between items-center">
                    <span className="text-[9px] font-orbitron tracking-widest text-[#333] uppercase">TEXT LOCKED🔒</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLeadershipMediaSelect(lead.id)}
                        className="bg-[#151515] hover:bg-[#D90429]/20 hover:border-[#D90429]/40 border border-[#222] text-[9px] font-orbitron font-semibold tracking-wider uppercase px-2.5 py-1.5 rounded text-white transition-all"
                      >
                        {lead.mediaUrl ? "Replace Media" : "Upload Media"}
                      </button>
                      {lead.mediaUrl && (
                        <button
                          onClick={() => handleLeadershipMediaRemove(lead.id)}
                          className="bg-transparent hover:text-[#D90429] text-[9px] font-orbitron font-semibold tracking-wider uppercase px-2 py-1 text-[#555] transition-all"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ─── SECTION 2: CORE TEAM PROFILES MANAGER ───────────── */}
          <section className="space-y-4">
            <div>
              <h2 className="font-orbitron text-sm font-bold text-white uppercase tracking-wider">Core Team Profiles</h2>
              <p className="text-[11px] text-[#A5A5A5] font-light mt-0.5">Manage details, display sort priority, search, reset passwords, or delete Core Team logins.</p>
            </div>

            {/* Core Team Filter Actions */}
            <div className="px-6 py-4 rounded-xl border border-[rgba(217,4,41,0.08)] bg-[#0A0A0A]/70 flex flex-wrap items-center gap-4">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Search Core Team members by name or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#111111] border border-[rgba(217,4,41,0.15)] rounded-lg px-4 py-2 text-xs text-[#F7F7F7] placeholder-[#333] outline-none focus:border-[#D90429]/50"
                />
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-orbitron text-[#A5A5A5] uppercase tracking-widest">Login:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#111111] border border-[rgba(217,4,41,0.15)] rounded-lg px-3 py-2 text-xs text-[#F7F7F7] outline-none cursor-pointer"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Disabled</option>
                </select>
              </div>

              {/* Visibility */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-orbitron text-[#A5A5A5] uppercase tracking-widest">Visibility:</span>
                <select
                  value={visibilityFilter}
                  onChange={(e) => setVisibilityFilter(e.target.value)}
                  className="bg-[#111111] border border-[rgba(217,4,41,0.15)] rounded-lg px-3 py-2 text-xs text-[#F7F7F7] outline-none cursor-pointer"
                >
                  <option value="ALL">All Visibility</option>
                  <option value="PUBLIC">Public Only</option>
                  <option value="HIDDEN">Hidden Only</option>
                </select>
              </div>
            </div>

            {/* Core Team Table */}
            {filteredCoreTeam.length === 0 ? (
              <div className="rounded-xl border border-[rgba(217,4,41,0.08)] bg-[#0B0B0B] p-12 text-center">
                <span className="text-3xl">👥</span>
                <h3 className="font-orbitron text-sm font-bold text-[#F7F7F7] mt-3">No Core Team Members</h3>
                <p className="text-xs text-[#A5A5A5] mt-1 font-light">Create a new login or adjust search query filters.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-[rgba(217,4,41,0.08)] bg-[#0B0B0B] overflow-hidden shadow-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[rgba(217,4,41,0.1)] bg-[#111]/60 font-orbitron text-[#A5A5A5] uppercase tracking-wider text-[10px]">
                      <th className="py-4 px-6">Name</th>
                      <th className="py-4 px-6">Username / Role</th>
                      <th className="py-4 px-6">Display Order</th>
                      <th className="py-4 px-6 text-center">Public Visibility</th>
                      <th className="py-4 px-6 text-center">Login Access</th>
                      <th className="py-4 px-6">Last Login</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#191919]">
                    {filteredCoreTeam.map((p) => (
                      <tr key={p.id} className="hover:bg-[#111]/30 transition-colors">
                        {/* Name */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full border border-crimson/20 overflow-hidden bg-[#151515] flex-shrink-0 flex items-center justify-center relative">
                              {p.mediaUrl ? (
                                (() => {
                                  const styleInfo = getProfileImageStyle(p);
                                  return (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={styleInfo.src} alt={p.displayName} style={styleInfo.imgStyle} />
                                  );
                                })()
                              ) : (
                                <span className="font-orbitron font-bold text-[10px] text-[#444]">CX</span>
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-white text-sm">{p.displayName}</div>
                              <div className="text-[9px] text-[#A5A5A5] font-light mt-0.5">Core Team Member</div>
                            </div>
                          </div>
                        </td>

                        {/* Username */}
                        <td className="py-4 px-6 font-mono text-[#A5A5A5]">
                          {p.userId ? (
                            <div>
                              <div>{p.user?.username}</div>
                              <div className="text-[8px] text-[#555] font-sans tracking-widest mt-0.5 uppercase">
                                {p.user?.role}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[#333] italic">No login created</span>
                          )}
                        </td>

                        {/* Order */}
                        <td className="py-4 px-6 text-[#A5A5A5] font-mono">
                          {p.displayOrder}
                        </td>

                        {/* Visibility */}
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2.5 py-0.5 rounded text-[8px] font-orbitron tracking-wider uppercase ${
                            p.isPublic
                              ? "bg-green-400/10 text-green-400 border border-green-400/20"
                              : "bg-red-500/10 text-red-500 border border-red-500/20"
                          }`}>
                            {p.isPublic ? "Public" : "Hidden"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-6 text-center">
                          {p.userId ? (
                            <span className={`px-2.5 py-0.5 rounded text-[8px] font-orbitron tracking-wider uppercase ${
                              p.user?.isActive
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : "bg-red-600/10 text-red-500 border border-red-600/20"
                            }`}>
                              {p.user?.isActive ? "Active" : "Disabled"}
                            </span>
                          ) : (
                            <span className="text-[#333] italic">—</span>
                          )}
                        </td>

                        {/* Last Login */}
                        <td className="py-4 px-6 text-[#A5A5A5]">
                          {p.user?.lastLoginAt ? (
                            new Date(p.user.lastLoginAt).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          ) : (
                            <span className="text-[#333] italic">Never</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditOpen(p)}
                              className="px-2.5 py-1 rounded hover:bg-[#222] border border-transparent hover:border-[#333] text-[#A5A5A5] hover:text-white transition-all"
                            >
                              Edit
                            </button>
                            {p.userId && (
                              <button
                                onClick={() => setResetConfirmProfile(p)}
                                className="px-2.5 py-1 rounded hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 text-[#A5A5A5] hover:text-amber-500 transition-all"
                              >
                                Reset Pass
                              </button>
                            )}
                            <button
                              onClick={() => setDeleteConfirmProfile(p)}
                              className="px-2.5 py-1 rounded hover:bg-red-500/10 border border-transparent hover:border-red-500/30 text-[#A5A5A5] hover:text-red-500 transition-all"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </div>
      </main>

      {/* ─── CREATE TEAM LOGIN MODAL ───────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#0A0A0A] border border-[rgba(217,4,41,0.25)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#191919] flex justify-between items-center bg-[#111]/30">
              <h3 className="font-orbitron font-bold text-sm text-white uppercase tracking-wider">Create Team Login</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-[#A5A5A5] hover:text-white text-lg">×</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-[#D90429] font-orbitron">
                  ⚠️ {createError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-orbitron tracking-widest text-[#A5A5A5] uppercase mb-1.5">Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full bg-[#111] border border-[rgba(217,4,41,0.15)] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#D90429]/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-orbitron tracking-widest text-[#A5A5A5] uppercase mb-1.5">Optional Bio</label>
                <textarea
                  rows={2}
                  placeholder="Enter initial public bio..."
                  value={createBio}
                  onChange={(e) => setCreateBio(e.target.value)}
                  className="w-full bg-[#111] border border-[rgba(217,4,41,0.15)] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#D90429]/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-orbitron tracking-widest text-[#A5A5A5] uppercase mb-1.5">Display Order</label>
                  <input
                    type="number"
                    value={createOrder}
                    onChange={(e) => setCreateOrder(Number(e.target.value))}
                    className="w-full bg-[#111] border border-[rgba(217,4,41,0.15)] rounded-lg px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
                <div className="pt-6">
                  <label className="flex items-center gap-2 text-xs text-[#A5A5A5] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={createPublic}
                      onChange={(e) => setCreatePublic(e.target.checked)}
                      className="rounded bg-[#111] border-[rgba(217,4,41,0.25)] text-[#D90429]"
                    />
                    <span>Public listing</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-orbitron tracking-widest text-[#A5A5A5] uppercase mb-1.5">Profile Photo / GIF</label>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-[rgba(217,4,41,0.15)] bg-[#111]/30">
                  <div className="w-10 h-10 rounded-full border border-crimson/25 overflow-hidden bg-[#111] flex items-center justify-center flex-shrink-0 relative">
                    {createPreview ? (
                      (() => {
                        const styleInfo = getProfileImageStyle({
                          mediaUrl: createPreview,
                          cropX: createCropX,
                          cropY: createCropY,
                          cropW: createCropW,
                          cropH: createCropH,
                          cropRotation: createCropRotation
                        });
                        return (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={styleInfo.src} alt="Preview" style={styleInfo.imgStyle} />
                        );
                      })()
                    ) : (
                      <span className="text-lg">👤</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCropType("CORE_TEAM_CREATE");
                      fileInputRef.current?.click();
                    }}
                    className="bg-[#222] hover:bg-[#333] text-[10px] px-3 py-1.5 rounded text-white"
                  >
                    Select File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.gif"
                    onChange={handleCreateFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="border-t border-[#191919] pt-4 mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="bg-transparent text-[#A5A5A5] hover:text-white px-4 py-2 text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !createName.trim()}
                  className="px-5 py-2 rounded font-orbitron text-xs tracking-wider uppercase text-white bg-gradient-to-r from-[#D90429] to-[#FF6B35] disabled:opacity-50"
                >
                  {createLoading ? "Generating Login..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── CREDENTIAL SUCCESS REVEAL SCREEN ───────────────────── */}
      {revealCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#0A0A0A] border border-[#D90429]/40 rounded-2xl w-full max-w-sm overflow-hidden p-6 space-y-5 text-center shadow-neon">
            <span className="text-3xl text-bright-red animate-bounce inline-block">✅</span>
            <h3 className="font-orbitron font-bold text-sm text-white uppercase tracking-wider">Account Created!</h3>
            
            <p className="text-xs text-[#A5A5A5] leading-relaxed">
              Save these credentials now. The password is encrypted and <span className="text-[#FF1E3C] font-semibold">cannot be viewed again.</span>
            </p>

            <div className="space-y-2 bg-[#111] p-4 rounded-xl border border-[rgba(217,4,41,0.15)] font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#555]">Username:</span>
                <span className="text-white font-bold select-all">{revealCredentials.username}</span>
              </div>
              <div className="flex justify-between items-center border-t border-[#191919] pt-2 mt-2">
                <span className="text-[#555]">Password:</span>
                <span className="text-[#FF6B35] font-bold select-all">{revealCredentials.tempPass}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(revealCredentials.username);
                }}
                className="flex-1 bg-[#151515] hover:bg-[#222] border border-[#333] text-[9px] tracking-wider uppercase font-orbitron py-2.5 rounded text-white"
              >
                Copy User
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(revealCredentials.tempPass);
                }}
                className="flex-1 bg-[#151515] hover:bg-[#222] border border-[#333] text-[9px] tracking-wider uppercase font-orbitron py-2.5 rounded text-white"
              >
                Copy Pass
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`Username: ${revealCredentials.username}\nPassword: ${revealCredentials.tempPass}`);
                }}
                className="flex-1 bg-[#D90429]/20 hover:bg-[#D90429]/30 border border-[#D90429]/30 text-[9px] tracking-wider uppercase font-orbitron py-2.5 rounded text-[#D90429]"
              >
                Copy Both
              </button>
            </div>

            <div className="border-t border-[#191919] pt-4 mt-6 flex justify-end">
              <button
                onClick={() => setRevealCredentials(null)}
                className="px-6 py-2 bg-[#222] hover:bg-[#333] rounded font-orbitron text-xs text-white uppercase tracking-wider"
              >
                Close & Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT MODAL (CORE TEAM ONLY) ────────────────────────── */}
      {editingProfile && (() => {
        const isLeadership = editingProfile.memberType === "LEADERSHIP";
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#0A0A0A] border border-[rgba(217,4,41,0.25)] rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#191919] flex justify-between items-center bg-[#111]/30">
              <h3 className="font-orbitron font-bold text-sm text-white uppercase tracking-wider">
                {editingProfile.memberType === "LEADERSHIP" ? "Edit Leadership Media" : "Edit Core Team Profile"}
              </h3>
              <button onClick={() => setEditingProfile(null)} className="text-[#A5A5A5] hover:text-white text-lg">×</button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-[#D90429] font-orbitron">
                  ⚠️ {editError}
                </div>
              )}

              {editingProfile.memberType === "LEADERSHIP" ? (
                <div className="p-4 rounded-lg border border-[rgba(217,4,41,0.15)] bg-[#111]/30">
                  <div className="text-[10px] font-orbitron tracking-wider text-crimson uppercase font-semibold mb-1">Locked written details</div>
                  <div className="text-xs text-[#A5A5A5] font-light">
                    Written details for {editingProfile.displayName} ({editingProfile.leadershipPosition}) are permanently locked in siteConfig. Only profile media (photo/GIF) can be uploaded or updated.
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] font-orbitron tracking-widest text-[#A5A5A5] uppercase mb-1.5">Display Name</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-[#111] border border-[rgba(217,4,41,0.15)] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#D90429]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-orbitron tracking-widest text-[#A5A5A5] uppercase mb-1.5">Public Bio</label>
                    <textarea
                      rows={3}
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="Add member description..."
                      className="w-full bg-[#111] border border-[rgba(217,4,41,0.15)] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#D90429]/50 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div>
                      <label className="block text-[10px] font-orbitron tracking-widest text-[#A5A5A5] uppercase mb-1.5">Display Order</label>
                      <input
                        type="number"
                        value={editOrder}
                        onChange={(e) => setEditOrder(Number(e.target.value))}
                        className="w-full bg-[#111] border border-[rgba(217,4,41,0.15)] rounded-lg px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>
                    <div className="pt-4">
                      <label className="flex items-center gap-2 text-xs text-[#A5A5A5] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editPublic}
                          onChange={(e) => setEditPublic(e.target.checked)}
                          className="rounded bg-[#111] border-[rgba(217,4,41,0.25)] text-[#D90429]"
                        />
                        <span>Public listing</span>
                      </label>
                    </div>
                    {editingProfile.userId && (
                      <div className="pt-4">
                        <label className="flex items-center gap-2 text-xs text-[#A5A5A5] cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={editActive}
                            onChange={(e) => setEditActive(e.target.checked)}
                            className="rounded bg-[#111] border-[rgba(217,4,41,0.25)] text-[#D90429]"
                          />
                          <span>Login Enabled</span>
                        </label>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] font-orbitron tracking-widest text-[#A5A5A5] uppercase mb-1.5">Profile Media</label>
                <div className="flex items-center gap-4 p-3 rounded-lg border border-[rgba(217,4,41,0.15)] bg-[#111]/30">
                  <div className="w-12 h-12 rounded-full border border-crimson/20 bg-[#111] flex items-center justify-center overflow-hidden relative">
                    {editRemoveMedia ? (
                      <span className="text-xl">👤</span>
                    ) : editPreview || editingProfile.mediaUrl ? (
                      (() => {
                        const styleInfo = getProfileImageStyle({
                          mediaUrl: editPreview || editingProfile.mediaUrl,
                          cropX: editPreview ? (editFile?.type === "image/gif" ? editCropX : 0) : editCropX,
                          cropY: editPreview ? (editFile?.type === "image/gif" ? editCropY : 0) : editCropY,
                          cropW: editPreview ? (editFile?.type === "image/gif" ? editCropW : 100) : editCropW,
                          cropH: editPreview ? (editFile?.type === "image/gif" ? editCropH : 100) : editCropH,
                          cropRotation: editPreview ? (editFile?.type === "image/gif" ? editCropRotation : 0) : editCropRotation,
                          updatedAt: editingProfile.updatedAt
                        });
                        return (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={styleInfo.src} alt="Preview" style={styleInfo.imgStyle} />
                        );
                      })()
                    ) : (
                      <span className="text-xl">👤</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCropType("CORE_TEAM_EDIT");
                        editFileInputRef.current?.click();
                      }}
                      className="bg-[#222] hover:bg-[#333] text-[10px] px-3 py-1.5 rounded text-white"
                    >
                      Replace Media
                    </button>
                    {(editingProfile.mediaUrl || editPreview) && !editRemoveMedia && (
                      <button
                        type="button"
                        onClick={() => { setEditRemoveMedia(true); setEditFile(null); setEditPreview(null); }}
                        className="bg-transparent hover:text-red-500 text-xs px-2 py-1 text-[#A5A5A5]"
                      >
                        Remove
                      </button>
                    )}
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.gif"
                      onChange={handleEditFileChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-[#191919] pt-4 mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="bg-transparent text-[#A5A5A5] hover:text-white px-4 py-2 text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading || (!isLeadership && !editName.trim())}
                  className="px-5 py-2 rounded font-orbitron text-xs tracking-wider uppercase text-white bg-gradient-to-r from-[#D90429] to-[#FF6B35] disabled:opacity-50"
                >
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      );})()} 


      {/* ─── RESET CONFIRMATION MODAL ────────────────────────── */}
      {resetConfirmProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#0A0A0A] border border-amber-500/40 rounded-2xl w-full max-w-sm overflow-hidden p-6 text-center space-y-4">
            <span className="text-3xl text-amber-500 inline-block animate-pulse">🗝️</span>
            <h3 className="font-orbitron font-bold text-sm text-white uppercase tracking-wider">Reset Password?</h3>
            <p className="text-xs text-[#A5A5A5] leading-relaxed">
              This will generate a new secure temporary password for <span className="text-white font-bold">{resetConfirmProfile.displayName}</span> and invalidate all active logins instantly.
            </p>
            <div className="border-t border-[#191919] pt-4 flex justify-end gap-2">
              <button
                onClick={() => setResetConfirmProfile(null)}
                className="px-4 py-2 text-xs font-orbitron uppercase text-[#A5A5A5] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded font-orbitron text-xs uppercase tracking-wider text-white"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── RESET PASSWORD REVEAL MODAL ───────────────────────── */}
      {resetRevealPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#0A0A0A] border border-amber-500/40 rounded-2xl w-full max-w-sm overflow-hidden p-6 text-center space-y-5">
            <span className="text-3xl">🗝️</span>
            <h3 className="font-orbitron font-bold text-sm text-white uppercase tracking-wider">New Password Generated</h3>
            <p className="text-xs text-[#A5A5A5] leading-relaxed">
              The new temporary password is shown below <span className="text-white font-bold">once only</span>. Be sure to save it.
            </p>
            <div className="bg-[#111] p-3 rounded-xl border border-amber-500/20 font-mono text-xs select-all text-amber-400 font-bold">
              {resetRevealPassword}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(resetRevealPassword);
                  alert("Copied to clipboard!");
                }}
                className="flex-1 bg-[#151515] border border-[#333] hover:bg-[#222] py-2 text-xs font-orbitron uppercase text-white rounded"
              >
                Copy Password
              </button>
              <button
                onClick={() => setResetRevealPassword(null)}
                className="flex-1 bg-amber-600/20 border border-amber-500/30 hover:bg-amber-600/30 py-2 text-xs font-orbitron uppercase text-amber-400 rounded"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRMATION MODAL ────────────────────────── */}
      {deleteConfirmProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#0A0A0A] border border-red-500/40 rounded-2xl w-full max-w-sm overflow-hidden p-6 text-center space-y-4">
            <span className="text-3xl text-red-500 inline-block">⚠️</span>
            <h3 className="font-orbitron font-bold text-sm text-white uppercase tracking-wider">Delete Account?</h3>
            <p className="text-xs text-[#A5A5A5] leading-relaxed">
              Are you sure you want to permanently delete the profile and login for <span className="text-white font-bold">{deleteConfirmProfile.displayName}</span>? This action is irreversible.
            </p>
            <div className="border-t border-[#191919] pt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmProfile(null)}
                className="px-4 py-2 text-xs font-orbitron uppercase text-[#A5A5A5] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProfile}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded font-orbitron text-xs uppercase tracking-wider text-white"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showCropModal && cropModalFile && (
        <ProfileCropModal
          file={cropModalFile}
          onClose={() => {
            setShowCropModal(false);
            setCropModalFile(null);
            if (quickUploadRef.current) quickUploadRef.current.value = "";
            if (fileInputRef.current) fileInputRef.current.value = "";
            if (editFileInputRef.current) editFileInputRef.current.value = "";
          }}
          onCropComplete={handleCropComplete}
        />
      )}

    </div>
  );
}

export default function TeamProfilesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#070707] flex items-center justify-center">
        <span className="font-orbitron text-xs text-[#A5A5A5] tracking-widest uppercase">Loading Panel...</span>
      </div>
    }>
      <TeamProfilesContent />
    </Suspense>
  );
}
