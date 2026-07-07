/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
"use client";

import React, { useState, useEffect, useRef } from "react";
import "../../globals.css";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import { getProfileImageStyle } from "@/lib/profile-media";
import { ProfileCropModal } from "@/components/ui/ProfileCropModal";

interface ProfileData {
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

type SaveState = "idle" | "loading" | "saved" | "error" | "invalid_file_type" | "file_too_large";

export default function TeamMemberProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [sessionUser, setSessionUser] = useState<{ id: string; username: string; role: string } | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [publicBio, setPublicBio] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);

  // Crop states
  const [cropX, setCropX] = useState<number | null>(null);
  const [cropY, setCropY] = useState<number | null>(null);
  const [cropW, setCropW] = useState<number | null>(null);
  const [cropH, setCropH] = useState<number | null>(null);
  const [cropZoom, setCropZoom] = useState<number | null>(null);
  const [cropRotation, setCropRotation] = useState<number | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeMedia, setRemoveMedia] = useState(false);
  const [cropModalFile, setCropModalFile] = useState<File | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [logoError, setLogoError] = useState(false);

  // Fetch session details
  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        if (!data.authenticated) {
          router.replace("/login");
          return;
        }
        setSessionUser(data.user);
        
        // Fetch current profile details
        fetch(`/api/admin/team`)
          .then((r) => r.json())
          .then((teamData) => {
            if (teamData.success) {
              const myProfile = teamData.profiles.find((p: any) => p.userId === data.user.id);
              if (myProfile) {
                setDisplayName(myProfile.displayName);
                setPublicBio(myProfile.publicBio ?? "");
                setMediaUrl(myProfile.mediaUrl);
                setMimeType(myProfile.mediaMimeType);
                setCropX(myProfile.cropX ?? null);
                setCropY(myProfile.cropY ?? null);
                setCropW(myProfile.cropW ?? null);
                setCropH(myProfile.cropH ?? null);
                setCropZoom(myProfile.cropZoom ?? null);
                setCropRotation(myProfile.cropRotation ?? null);
              }
            }
          })
          .catch(() => {});
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local validation
    const allowedMimes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
    if (!allowedMimes.includes(file.type)) {
      setSaveState("invalid_file_type");
      setStatusMsg("Invalid file type. Only PNG, JPG, JPEG, WEBP, and GIF are allowed.");
      return;
    }

    // Size limit check (10MB for static, 15MB for GIFs)
    const isGif = file.type === "image/gif";
    const maxLimit = isGif ? 15 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxLimit) {
      setSaveState("file_too_large");
      setStatusMsg(`File too large. Maximum size is ${isGif ? "15MB for GIFs" : "10MB"}.`);
      return;
    }

    setCropModalFile(file);
    setShowCropModal(true);
  };

  const handleCropComplete = ({ blob, cropData }: { blob: Blob | File; cropData?: any }) => {
    setSelectedFile(blob as File);
    setRemoveMedia(false);
    setSaveState("idle");
    setStatusMsg("");

    if (cropData) {
      setCropX(cropData.x);
      setCropY(cropData.y);
      setCropW(cropData.w);
      setCropH(cropData.h);
      setCropZoom(cropData.zoom);
      setCropRotation(cropData.rotation);
    } else {
      setCropX(0);
      setCropY(0);
      setCropW(100);
      setCropH(100);
      setCropZoom(1);
      setCropRotation(0);
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(blob);
  };

  const handleRemoveMedia = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setRemoveMedia(true);
    setSaveState("idle");
    setStatusMsg("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || saveState === "loading") return;

    setSaveState("loading");
    setStatusMsg("");

    try {
      // ── If a new file was selected: two-step Blob upload ──────────────────
      if (selectedFile && !removeMedia) {
        // Step A: upload directly from browser to Vercel Blob CDN
        let blobResult: { url: string; contentType: string };
        let finalProfileId: string;
        let finalNonce: string;

        try {
          // 1. Get a signed upload nonce from the server
          const initRes = await fetch("/api/profile-media/upload");
          const initData = await initRes.json();
          if (!initRes.ok) {
            throw new Error(initData.ref ? `PM-${initData.ref}` : "Failed to generate upload session.");
          }

          finalProfileId = initData.targetProfileId;
          finalNonce = initData.uploadNonce;

          // 2. Upload file directly from browser to Vercel Blob CDN
          const uploaded = await upload(selectedFile.name, selectedFile, {
            access: "public",
            handleUploadUrl: "/api/profile-media/upload",
            clientPayload: JSON.stringify({
              targetProfileId: finalProfileId,
              uploadNonce: finalNonce,
            }),
          });
          blobResult = { url: uploaded.url, contentType: selectedFile.type };
        } catch (uploadErr: any) {
          const errMsg = uploadErr?.message || "";
          const ref = errMsg.startsWith("PM-") ? errMsg : "Check logs for details";
          setSaveState("error");
          setStatusMsg(`Profile media could not be saved. Please try again. Reference: ${ref}`);
          return;
        }

        // Step B: commit Blob URL to Aiven MySQL
        const commitRes = await fetch("/api/profile-media/commit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blobUrl: blobResult.url,
            contentType: blobResult.contentType,
            targetProfileId: finalProfileId,
            uploadNonce: finalNonce,
            cropX,
            cropY,
            cropW,
            cropH,
            cropZoom,
            cropRotation,
          }),
        });

        const commitData = await commitRes.json();

        if (commitRes.ok && commitData.success) {
          // Now save text fields
          const formData = new FormData();
          formData.append("displayName", displayName.trim());
          formData.append("publicBio", publicBio.trim());
          if (cropX !== null) formData.append("cropX", cropX.toString());
          if (cropY !== null) formData.append("cropY", cropY.toString());
          if (cropW !== null) formData.append("cropW", cropW.toString());
          if (cropH !== null) formData.append("cropH", cropH.toString());
          if (cropZoom !== null) formData.append("cropZoom", cropZoom.toString());
          if (cropRotation !== null) formData.append("cropRotation", cropRotation.toString());
          await fetch("/api/profile", { method: "PATCH", body: formData });

          setSaveState("saved");
          setStatusMsg("Profile media updated successfully.");
          setMediaUrl(commitData.profile.mediaUrl);
          setMimeType(commitData.profile.mediaMimeType);
          setCropX(commitData.profile.cropX);
          setCropY(commitData.profile.cropY);
          setCropW(commitData.profile.cropW);
          setCropH(commitData.profile.cropH);
          setCropZoom(commitData.profile.cropZoom);
          setCropRotation(commitData.profile.cropRotation);
          setSelectedFile(null);
          setPreviewUrl(null);
          setRemoveMedia(false);
        } else {
          const ref = commitData.ref ?? "Unknown error";
          setSaveState("error");
          setStatusMsg(`Profile media could not be saved. Please try again. Reference: PM-${ref}`);
        }
        return;
      }

      // ── No file (text/crop/removeMedia only) ─────────────────────────────
      const formData = new FormData();
      formData.append("displayName", displayName.trim());
      formData.append("publicBio", publicBio.trim());
      formData.append("removeMedia", removeMedia ? "true" : "false");
      if (cropX !== null) formData.append("cropX", cropX.toString());
      if (cropY !== null) formData.append("cropY", cropY.toString());
      if (cropW !== null) formData.append("cropW", cropW.toString());
      if (cropH !== null) formData.append("cropH", cropH.toString());
      if (cropZoom !== null) formData.append("cropZoom", cropZoom.toString());
      if (cropRotation !== null) formData.append("cropRotation", cropRotation.toString());

      const res = await fetch("/api/profile", {
        method: "PATCH",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSaveState("saved");
        setStatusMsg("Profile updated successfully.");
        setMediaUrl(data.profile.mediaUrl);
        setMimeType(data.profile.mediaMimeType);
        setCropX(data.profile.cropX);
        setCropY(data.profile.cropY);
        setCropW(data.profile.cropW);
        setCropH(data.profile.cropH);
        setCropZoom(data.profile.cropZoom);
        setCropRotation(data.profile.cropRotation);
        setSelectedFile(null);
        setPreviewUrl(null);
        setRemoveMedia(false);
      } else {
        setSaveState("error");
        setStatusMsg(data.error ?? "Failed to save profile changes.");
      }
    } catch {
      setSaveState("error");
      setStatusMsg("Network error. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
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

  // Active rendering image
  const displayImage = removeMedia
    ? null
    : previewUrl || mediaUrl || null;

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

      {/* Navigation Header */}
      <header className="border-b border-[rgba(217,4,41,0.15)] bg-[rgba(7,7,7,0.8)] backdrop-blur-md relative z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity">
            {!logoError ? (
              <img
                src="/assets/images/logo.jpeg"
                alt="CodeXa Agency logo"
                className="h-8 w-auto object-contain rounded border border-crimson/20 shadow-[0_0_10px_rgba(217,4,41,0.15)]"
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

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-12 relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Side — Profile Preview Card (Holographic glass) */}
        <div className="md:col-span-1">
          <div className="sticky top-28 space-y-4">
            <div className="text-xs font-orbitron tracking-widest text-[#A5A5A5] uppercase">
              Public Preview
            </div>

            <div
              className="rounded-2xl p-[1px]"
              style={{
                background: "linear-gradient(135deg, rgba(217,4,41,0.35), rgba(7,7,7,0.8), rgba(217,4,41,0.1))",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              }}
            >
              <div className="rounded-2xl p-6 bg-[#0B0B0B] flex flex-col items-center text-center relative overflow-hidden">
                {/* Visual grid behind avatar */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,4,41,0.08)_0%,transparent_70%)] pointer-events-none" />
                
                {/* Photo / Avatar */}
                <div className="w-24 h-24 rounded-full border border-crimson/30 relative overflow-hidden mb-4 bg-[#111111] flex items-center justify-center">
                  {displayImage ? (
                    (() => {
                      const imgStyleInfo = getProfileImageStyle({
                        mediaUrl: displayImage,
                        cropX: previewUrl ? (selectedFile?.type === "image/gif" ? cropX : 0) : cropX,
                        cropY: previewUrl ? (selectedFile?.type === "image/gif" ? cropY : 0) : cropY,
                        cropW: previewUrl ? (selectedFile?.type === "image/gif" ? cropW : 100) : cropW,
                        cropH: previewUrl ? (selectedFile?.type === "image/gif" ? cropH : 100) : cropH,
                        cropRotation: previewUrl ? (selectedFile?.type === "image/gif" ? cropRotation : 0) : cropRotation,
                      });
                      return (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imgStyleInfo.src}
                          alt={displayName || "Team Member"}
                          style={imgStyleInfo.imgStyle}
                        />
                      );
                    })()
                  ) : (
                    <span className="font-orbitron text-2xl text-[#333333]">CX</span>
                  )}
                </div>

                {/* Display Name */}
                <h3 className="font-orbitron text-lg font-bold tracking-wide text-[#F7F7F7]">
                  {displayName || "Your Name"}
                </h3>
                
                <div className="text-[10px] font-orbitron text-[#D90429] tracking-wider uppercase mt-1">
                  Core Team Member
                </div>

                {/* Public Bio */}
                <p className="text-xs text-[#A5A5A5] mt-4 line-clamp-4 leading-relaxed font-light italic">
                  {publicBio || "Enter a bio on the right to display your details here."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side — Profile Editor form */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="font-orbitron text-2xl font-bold tracking-wide text-[#F7F7F7]">
                My Profile
              </h1>
              <p className="text-xs text-[#A5A5A5] mt-1 font-light">
                Manage your public listing card details.
              </p>
            </div>
          </div>

          {/* Status Alert Banner */}
          {saveState !== "idle" && saveState !== "loading" && (
            <div
              className="p-4 rounded-xl text-xs font-orbitron border flex items-center gap-3 animate-fade-in"
              style={{
                borderColor: saveState === "saved" ? "rgba(78,205,196,0.3)" : "rgba(217,4,41,0.3)",
                background: saveState === "saved" ? "rgba(78,205,196,0.05)" : "rgba(217,4,41,0.05)",
                color: saveState === "saved" ? "#4ECDC4" : "#D90429",
              }}
            >
              <span className="text-lg">
                {saveState === "saved" ? "✅" : "⚠️"}
              </span>
              <span>{statusMsg}</span>
            </div>
          )}

          <div
            className="rounded-2xl p-[1px]"
            style={{
              background: "linear-gradient(135deg, rgba(217,4,41,0.2), rgba(25,25,25,0.4))",
            }}
          >
            <form onSubmit={handleSave} className="rounded-2xl p-8 bg-[#090909] space-y-6">
              
              {/* Display Name */}
              <div>
                <label htmlFor="prof-name" className="block text-[10px] font-orbitron tracking-widest text-[#A5A5A5] uppercase mb-2">
                  Display Name
                </label>
                <input
                  id="prof-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => { setDisplayName(e.target.value); if (saveState !== "loading") setSaveState("idle"); }}
                  placeholder="E.g. Rohan Sharma"
                  disabled={saveState === "loading"}
                  className="w-full bg-[#111111] border border-[rgba(217,4,41,0.15)] rounded-lg px-4 py-3 text-[#F7F7F7] text-sm outline-none transition-all duration-200 focus:border-[rgba(217,4,41,0.5)] disabled:opacity-50"
                />
              </div>

              {/* Public Bio */}
              <div>
                <label htmlFor="prof-bio" className="block text-[10px] font-orbitron tracking-widest text-[#A5A5A5] uppercase mb-2">
                  Public Bio
                </label>
                <textarea
                  id="prof-bio"
                  rows={4}
                  value={publicBio}
                  onChange={(e) => { setPublicBio(e.target.value); if (saveState !== "loading") setSaveState("idle"); }}
                  placeholder="Write a public description of your experience, skills, or quote..."
                  disabled={saveState === "loading"}
                  className="w-full bg-[#111111] border border-[rgba(217,4,41,0.15)] rounded-lg px-4 py-3 text-[#F7F7F7] text-sm outline-none transition-all duration-200 focus:border-[rgba(217,4,41,0.5)] resize-none disabled:opacity-50"
                />
              </div>

              {/* Profile Image/GIF Upload */}
              <div>
                <label className="block text-[10px] font-orbitron tracking-widest text-[#A5A5A5] uppercase mb-2">
                  Profile Media (PNG, JPG, WEBP, or Animated GIF)
                </label>
                
                <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-xl border border-dashed border-[rgba(217,4,41,0.15)] bg-[#0B0B0B]">
                  
                  {/* Local preview sphere */}
                  <div className="w-20 h-20 rounded-full border border-crimson/20 relative overflow-hidden bg-[#111111] flex items-center justify-center flex-shrink-0">
                    {displayImage ? (
                      (() => {
                        const imgStyleInfo = getProfileImageStyle({
                          mediaUrl: displayImage,
                          cropX: previewUrl ? (selectedFile?.type === "image/gif" ? cropX : 0) : cropX,
                          cropY: previewUrl ? (selectedFile?.type === "image/gif" ? cropY : 0) : cropY,
                          cropW: previewUrl ? (selectedFile?.type === "image/gif" ? cropW : 100) : cropW,
                          cropH: previewUrl ? (selectedFile?.type === "image/gif" ? cropH : 100) : cropH,
                          cropRotation: previewUrl ? (selectedFile?.type === "image/gif" ? cropRotation : 0) : cropRotation,
                        });
                        return (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imgStyleInfo.src}
                            alt="Preview"
                            style={imgStyleInfo.imgStyle}
                          />
                        );
                      })()
                    ) : (
                      <svg className="w-8 h-8 text-[#222222]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    )}
                  </div>

                  <div className="flex-1 text-center sm:text-left space-y-3">
                    <div className="text-xs text-[#A5A5A5] font-light">
                      Max file size: <span className="text-[#F7F7F7] font-normal">10MB (15MB for GIFs)</span>. PNG, JPG, JPEG, WEBP, or Animated GIF formats.
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={saveState === "loading"}
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-[rgba(217,4,41,0.15)] hover:bg-[rgba(217,4,41,0.25)] text-[#D90429] font-orbitron text-[10px] tracking-wider uppercase px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Upload Media
                      </button>
                      
                      {displayImage && (
                        <button
                          type="button"
                          disabled={saveState === "loading"}
                          onClick={handleRemoveMedia}
                          className="bg-transparent text-[#A5A5A5] hover:text-[#D90429] font-orbitron text-[10px] tracking-wider uppercase px-3 py-2 transition-colors disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.gif"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="border-t border-[#191919] pt-6 flex justify-end gap-4">
                <Link
                  href="/"
                  className="bg-transparent text-[#A5A5A5] hover:text-[#F7F7F7] font-orbitron text-[10px] tracking-widest uppercase px-5 py-3 transition-colors flex items-center justify-center"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saveState === "loading" || !displayName.trim()}
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
                    {saveState === "loading" ? "Saving..." : "Save Changes"}
                  </div>
                </button>
              </div>

            </form>
          </div>
        </div>

      </main>

      {showCropModal && cropModalFile && (
        <ProfileCropModal
          file={cropModalFile}
          onClose={() => {
            setShowCropModal(false);
            setCropModalFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
