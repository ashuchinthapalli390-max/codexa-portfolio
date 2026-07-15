/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
"use client";

import React, { useState, useEffect } from "react";
import "../../globals.css";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProfilePositionAdjuster } from "@/components/ui/ProfilePositionAdjuster";
import { PfpGalleryModal } from "@/components/ui/PfpGalleryModal";
import { PfpCropModal } from "@/components/ui/PfpCropModal";

interface ProfileData {
  id: string;
  displayName: string;
  publicBio: string;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  cropX?: number | null;
  cropY?: number | null;
  cropW?: number | null;
  cropH?: number | null;
  cropZoom?: number | null;
  cropRotation?: number | null;
}

export default function TeamMemberProfilePage() {
  const router = useRouter();

  const [sessionUser, setSessionUser] = useState<{ id: string; username: string; role: string } | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  // Text fields
  const [displayName, setDisplayName] = useState("");
  const [publicBio, setPublicBio] = useState("");

  // Committed media (what's actually saved in DB)
  const [committedMediaUrl, setCommittedMediaUrl] = useState<string | null>(null);
  const [committedMimeType, setCommittedMimeType] = useState<string | null>(null);
  const [committedCropX, setCommittedCropX] = useState<number | null>(null);
  const [committedCropY, setCommittedCropY] = useState<number | null>(null);
  const [committedCropW, setCommittedCropW] = useState<number | null>(null);
  const [committedCropH, setCommittedCropH] = useState<number | null>(null);
  const [committedCropZoom, setCommittedCropZoom] = useState<number | null>(null);

  // Remove media
  const [removeMedia, setRemoveMedia] = useState(false);

  // Position adjuster
  const [showAdjuster, setShowAdjuster] = useState(false);

  // PFP Gallery + CSS Crop flow (the ONLY profile media change method)
  const [showPfpGallery, setShowPfpGallery] = useState(false);
  const [pendingPfpPath, setPendingPfpPath] = useState<string | null>(null);

  // Feedback state (replaces uploadPhase)
  const [mediaFeedback, setMediaFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Text-save state
  const [textSaveState, setTextSaveState] = useState<"idle" | "loading" | "saved" | "error">("idle");
  const [textSaveMsg, setTextSaveMsg] = useState("");

  const [logoError, setLogoError] = useState(false);

  // ── Load session + profile ─────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        if (!data.authenticated) { router.replace("/login"); return; }
        setSessionUser(data.user);

        fetch("/api/admin/team")
          .then((r) => r.json())
          .then((teamData) => {
            if (teamData.success) {
              const myProfile = teamData.profiles.find((p: any) => p.userId === data.user.id);
              if (myProfile) {
                setProfile(myProfile);
                setDisplayName(myProfile.displayName ?? "");
                setPublicBio(myProfile.publicBio ?? "");
                setCommittedMediaUrl(myProfile.mediaUrl);
                setCommittedMimeType(myProfile.mediaMimeType);
                setCommittedCropX(myProfile.cropX ?? null);
                setCommittedCropY(myProfile.cropY ?? null);
                setCommittedCropW(myProfile.cropW ?? null);
                setCommittedCropH(myProfile.cropH ?? null);
                setCommittedCropZoom(myProfile.cropZoom ?? null);
              }
            }
          })
          .catch(() => {});
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  // ── Remove media ───────────────────────────────────────────────────────────
  const handleRemoveMedia = () => {
    setRemoveMedia(true);
    setShowAdjuster(false);
    setMediaFeedback(null);
  };

  // ── Save position metadata ─────────────────────────────────────────────────
  const handleSavePosition = async (meta: { cropX: number; cropY: number; cropW: number; cropH: number; cropZoom: number }) => {
    if (!profile?.id) throw new Error("Profile not found.");

    const res = await fetch("/api/profile-media/position", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetProfileId: profile.id,
        cropX: meta.cropX,
        cropY: meta.cropY,
        cropW: meta.cropW,
        cropH: meta.cropH,
        cropZoom: meta.cropZoom,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error("Could not save position.");

    setCommittedCropX(meta.cropX);
    setCommittedCropY(meta.cropY);
    setCommittedCropW(meta.cropW);
    setCommittedCropH(meta.cropH);
    setCommittedCropZoom(meta.cropZoom);
    setShowAdjuster(false);
  };

  // ── Save text fields ───────────────────────────────────────────────────────
  const handleSaveText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || textSaveState === "loading") return;

    setTextSaveState("loading");
    setTextSaveMsg("");

    try {
      const formData = new FormData();
      formData.append("displayName", displayName.trim());
      formData.append("publicBio", publicBio.trim());
      if (removeMedia) formData.append("removeMedia", "true");

      const res = await fetch("/api/profile", { method: "PATCH", body: formData });
      const data = await res.json();

      if (res.ok && data.success) {
        setTextSaveState("saved");
        setTextSaveMsg("Profile details updated.");
        if (removeMedia) {
          setCommittedMediaUrl(null);
          setCommittedMimeType(null);
          setRemoveMedia(false);
        }
        setTimeout(() => setTextSaveState("idle"), 3000);
      } else {
        setTextSaveState("error");
        setTextSaveMsg(data.error ?? "Failed to save profile details.");
      }
    } catch {
      setTextSaveState("error");
      setTextSaveMsg("Network error. Please try again.");
    }
  };

  const handleLogout = async () => {
    try { await fetch("/api/logout", { method: "POST" }); }
    finally { router.push("/login"); }
  };

  if (!sessionUser) {
    return (
      <div className="min-h-screen bg-[#070707] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#A5A5A5]">
          <svg className="w-5 h-5 animate-spin text-[#D90429]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
          </svg>
          <span className="font-orbitron text-sm tracking-wider">Loading workspace...</span>
        </div>
      </div>
    );
  }

  const activePreviewUrl = removeMedia ? null : committedMediaUrl;
  const hasCommittedMedia = !!committedMediaUrl && !removeMedia;
  const isAdmin = sessionUser.role === "ADMIN";

  return (
    <div className="min-h-screen bg-[#070707] text-[#F7F7F7] flex flex-col relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[#D90429] opacity-[0.03] blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#D90429] opacity-[0.02] blur-[120px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(217,4,41,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(217,4,41,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Nav */}
      <header className="border-b border-[rgba(217,4,41,0.15)] bg-[rgba(7,7,7,0.8)] backdrop-blur-md relative z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity">
            {!logoError ? (
              <img
                src="/assets/images/logo.jpeg"
                alt="CodeXa Agency"
                className="h-8 w-auto object-contain rounded border border-crimson/20"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="font-orbitron text-sm font-black tracking-[0.25em] text-[#F7F7F7] flex items-center gap-2">
                <span className="text-[#D90429]">⚡</span> CODEXA
              </span>
            )}
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-orbitron tracking-wider text-[#A5A5A5] border border-[rgba(217,4,41,0.25)] bg-[rgba(217,4,41,0.05)] px-3 py-1.5 rounded-full uppercase">
              👤 {sessionUser.role}
            </span>
            <button
              onClick={handleLogout}
              className="text-xs font-orbitron tracking-widest text-[#A5A5A5] hover:text-[#D90429] transition-colors uppercase"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-12 relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Left — Preview Card */}
        <div className="md:col-span-1">
          <div className="sticky top-28 space-y-4">
            <div className="text-xs font-orbitron tracking-widest text-[#A5A5A5] uppercase">Public Preview</div>

            <div
              className="rounded-2xl p-[1px]"
              style={{
                background: "linear-gradient(135deg, rgba(217,4,41,0.35), rgba(7,7,7,0.8), rgba(217,4,41,0.1))",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              }}
            >
              <div className="rounded-2xl p-6 bg-[#0B0B0B] flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,4,41,0.08)_0%,transparent_70%)] pointer-events-none" />

                {/* Avatar */}
                <div
                  className="w-24 h-24 rounded-full border border-crimson/30 relative mb-4 bg-[#111111] flex items-center justify-center"
                  style={{ overflow: "hidden", aspectRatio: "1/1" }}
                >
                  {activePreviewUrl ? (
                    <img
                      src={activePreviewUrl}
                      alt={displayName || "Profile"}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: committedCropX != null && committedCropY != null
                          ? `${committedCropX}% ${committedCropY}%`
                          : "center",
                      }}
                    />
                  ) : (
                    <span className="font-orbitron text-2xl text-[#333333]">CX</span>
                  )}
                </div>

                <h3 className="font-orbitron text-lg font-bold tracking-wide text-[#F7F7F7]">
                  {displayName || "Your Name"}
                </h3>
                <div className="text-[10px] font-orbitron text-[#D90429] tracking-wider uppercase mt-1">
                  Core Team Member
                </div>
                <p className="text-xs text-[#A5A5A5] mt-4 line-clamp-4 leading-relaxed font-light italic">
                  {publicBio || "Enter a bio on the right to display your details here."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Editor */}
        <div className="md:col-span-2 space-y-6">
          <div>
            <h1 className="font-orbitron text-2xl font-bold tracking-wide text-[#F7F7F7]">My Profile</h1>
            <p className="text-xs text-[#A5A5A5] mt-1 font-light">Manage your public listing card details.</p>
          </div>

          {/* ── Media Section ─────────────────────────────────────── */}
          <div
            className="rounded-2xl p-[1px]"
            style={{ background: "linear-gradient(135deg, rgba(217,4,41,0.2), rgba(25,25,25,0.4))" }}
          >
            <div className="rounded-2xl p-6 bg-[#090909] space-y-4">
              <div className="text-[10px] font-orbitron tracking-widest text-[#A5A5A5] uppercase">
                Profile Media
              </div>

              {/* Media area */}
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                {/* Square preview */}
                <div
                  className="w-20 h-20 rounded-xl border border-[rgba(217,4,41,0.2)] bg-[#111] flex items-center justify-center flex-shrink-0"
                  style={{ overflow: "hidden", aspectRatio: "1/1" }}
                >
                  {activePreviewUrl ? (
                    <img
                      src={activePreviewUrl}
                      alt="Preview"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: committedCropX != null && committedCropY != null
                          ? `${committedCropX}% ${committedCropY}%`
                          : "center",
                      }}
                    />
                  ) : (
                    <svg className="w-8 h-8 text-[#222]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  {/* Helper text */}
                  {!activePreviewUrl && (
                    <div className="text-xs text-[#A5A5A5] font-light">
                      Select a profile image from the <span className="text-[#D90429] font-normal">PFP Library</span>.
                    </div>
                  )}

                  {/* Feedback */}
                  {mediaFeedback && (
                    <div className={`text-[10px] font-orbitron tracking-wide ${mediaFeedback.type === "success" ? "text-[#4ECDC4]" : "text-[#D90429]"}`}>
                      {mediaFeedback.type === "success" ? "✅" : "⚠"} {mediaFeedback.msg}
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {!isAdmin && (
                      <>
                        {/* PRIMARY — PFP Library (the only media change method) */}
                        <button
                          type="button"
                          id="select-profile-image-btn"
                          onClick={() => setShowPfpGallery(true)}
                          className="flex items-center gap-1.5 bg-[rgba(217,4,41,0.15)] hover:bg-[rgba(217,4,41,0.28)] text-[#D90429] font-orbitron text-[10px] tracking-wider uppercase px-4 py-2 rounded-lg transition-all border border-[rgba(217,4,41,0.2)] hover:border-[rgba(217,4,41,0.5)]"
                          style={{ boxShadow: "0 0 10px rgba(217,4,41,0.08)" }}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {hasCommittedMedia ? "Change Profile Image" : "Select Profile Image"}
                        </button>

                        {hasCommittedMedia && (
                          <button
                            type="button"
                            onClick={() => setShowAdjuster(!showAdjuster)}
                            className="bg-[#111] hover:bg-[#1A1A1A] text-[#A5A5A5] hover:text-white font-orbitron text-[10px] tracking-wider uppercase px-4 py-2 rounded-lg transition-colors"
                          >
                            {showAdjuster ? "Hide Adjuster" : "Adjust Position"}
                          </button>
                        )}

                        {activePreviewUrl && (
                          <button
                            type="button"
                            onClick={handleRemoveMedia}
                            className="text-[#555] hover:text-[#D90429] font-orbitron text-[10px] tracking-wider uppercase px-3 py-2 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </>
                    )}

                    {isAdmin && (
                      <div className="text-[10px] font-orbitron text-[#444] tracking-wider uppercase px-3 py-2 border border-[#1A1A1A] rounded-lg cursor-not-allowed select-none">
                        🔒 Admins cannot change profile images
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Optional Position Adjuster (inline collapsible) */}
              {showAdjuster && committedMediaUrl && !removeMedia && (
                <ProfilePositionAdjuster
                  mediaUrl={committedMediaUrl}
                  initialMeta={{
                    cropX: committedCropX ?? 0,
                    cropY: committedCropY ?? 0,
                    cropW: committedCropW ?? 100,
                    cropH: committedCropH ?? 100,
                    cropZoom: committedCropZoom ?? 1,
                  }}
                  onSave={handleSavePosition}
                  onCancel={() => setShowAdjuster(false)}
                />
              )}
            </div>
          </div>

          {/* ── Text / Bio Form ───────────────────────────────────── */}
          <div
            className="rounded-2xl p-[1px]"
            style={{ background: "linear-gradient(135deg, rgba(217,4,41,0.2), rgba(25,25,25,0.4))" }}
          >
            <form onSubmit={handleSaveText} className="rounded-2xl p-8 bg-[#090909] space-y-6">

              {/* Text save status */}
              {textSaveState !== "idle" && textSaveState !== "loading" && (
                <div
                  className="p-4 rounded-xl text-xs font-orbitron border flex items-center gap-3 animate-fade-in"
                  style={{
                    borderColor: textSaveState === "saved" ? "rgba(78,205,196,0.3)" : "rgba(217,4,41,0.3)",
                    background: textSaveState === "saved" ? "rgba(78,205,196,0.05)" : "rgba(217,4,41,0.05)",
                    color: textSaveState === "saved" ? "#4ECDC4" : "#D90429",
                  }}
                >
                  <span className="text-lg">{textSaveState === "saved" ? "✅" : "⚠️"}</span>
                  <span>{textSaveMsg}</span>
                </div>
              )}

              <div>
                <label htmlFor="prof-name" className="block text-[10px] font-orbitron tracking-widest text-[#A5A5A5] uppercase mb-2">
                  Display Name
                </label>
                <input
                  id="prof-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => { setDisplayName(e.target.value); setTextSaveState("idle"); }}
                  placeholder="E.g. Rohan Sharma"
                  disabled={textSaveState === "loading"}
                  className="w-full bg-[#111111] border border-[rgba(217,4,41,0.15)] rounded-lg px-4 py-3 text-[#F7F7F7] text-sm outline-none transition-all duration-200 focus:border-[rgba(217,4,41,0.5)] disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="prof-bio" className="block text-[10px] font-orbitron tracking-widest text-[#A5A5A5] uppercase mb-2">
                  Public Bio
                </label>
                <textarea
                  id="prof-bio"
                  rows={4}
                  value={publicBio}
                  onChange={(e) => { setPublicBio(e.target.value); setTextSaveState("idle"); }}
                  placeholder="Write a public description of your experience, skills, or quote..."
                  disabled={textSaveState === "loading"}
                  className="w-full bg-[#111111] border border-[rgba(217,4,41,0.15)] rounded-lg px-4 py-3 text-[#F7F7F7] text-sm outline-none transition-all duration-200 focus:border-[rgba(217,4,41,0.5)] resize-none disabled:opacity-50"
                />
              </div>

              <div className="border-t border-[#191919] pt-6 flex justify-end gap-4">
                <Link
                  href="/"
                  className="bg-transparent text-[#A5A5A5] hover:text-[#F7F7F7] font-orbitron text-[10px] tracking-widest uppercase px-5 py-3 transition-colors flex items-center justify-center"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={textSaveState === "loading" || !displayName.trim()}
                  className="relative group overflow-hidden rounded-lg p-[1px] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  style={{
                    background: displayName.trim() ? "linear-gradient(90deg, #D90429, #FF6B35)" : "rgba(217,4,41,0.15)",
                    boxShadow: displayName.trim() ? "0 4px 15px rgba(217,4,41,0.2)" : "none",
                  }}
                >
                  <div
                    className="rounded-lg py-2.5 px-6 flex items-center justify-center font-orbitron text-[10px] tracking-widest uppercase transition-all duration-200"
                    style={{
                      background: displayName.trim() ? "transparent" : "#111111",
                      color: displayName.trim() ? "#FFFFFF" : "#A5A5A5",
                    }}
                  >
                    {textSaveState === "loading" ? "Saving…" : "Save Profile"}
                  </div>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* PFP Gallery Modal — the ONLY way to change profile media */}
      {showPfpGallery && profile?.id && (
        <PfpGalleryModal
          isAdmin={isAdmin}
          onClose={() => setShowPfpGallery(false)}
          onSelect={(pfpPath) => {
            setPendingPfpPath(pfpPath);
            setShowPfpGallery(false);
          }}
        />
      )}

      {/* PFP Position/Crop Modal */}
      {pendingPfpPath && profile?.id && (
        <PfpCropModal
          pfpPath={pendingPfpPath}
          targetProfileId={profile.id}
          onClose={() => setPendingPfpPath(null)}
          onSuccess={(updatedProfile) => {
            setCommittedMediaUrl(updatedProfile.mediaUrl);
            setCommittedMimeType(updatedProfile.mediaMimeType);
            setCommittedCropX(updatedProfile.cropX ?? null);
            setCommittedCropY(updatedProfile.cropY ?? null);
            setCommittedCropW(updatedProfile.cropW ?? null);
            setCommittedCropH(updatedProfile.cropH ?? null);
            setCommittedCropZoom(updatedProfile.cropZoom ?? null);
            setPendingPfpPath(null);
            setRemoveMedia(false);
            setMediaFeedback({ type: "success", msg: "Profile image updated." });
            setTimeout(() => setMediaFeedback(null), 4000);
          }}
        />
      )}
    </div>
  );
}
