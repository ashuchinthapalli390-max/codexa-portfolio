"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Image as ImageIcon,
  Video,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Eye,
  CheckCircle2,
  XCircle,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  ExternalLink,
  Save,
  Check,
  Star,
  Layers,
  Clock,
  HelpCircle,
  FileText,
  AlertCircle,
  X,
} from "lucide-react";

interface MediaItem {
  id: string;
  mediaCategory: string;
  mediaType: string;
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  fileSize: number;
  displayOrder: number;
  title: string | null;
  caption: string | null;
  altText: string | null;
  thumbnailUrl: string | null;
  featureCategory: string | null;
  isCover: boolean;
  isFeatured: boolean;
  isPublished: boolean;
  durationSeconds?: number | null;
  width?: number | null;
  height?: number | null;
  createdAt: string;
}

interface ShowcaseContent {
  id: string;
  appName: string;
  appTagline: string;
  badgeText: string;
  shortDescription: string;
  fullDescription: string;
  compatibilityText: string;
  supportEmail: string;
  supportPhone: string;
  featuresJson: any[];
  installationStepsJson: any[];
  troubleshootingJson: any[];
  contentRevision: number;
}

export function AppShowcaseTab({ isEditor }: { isEditor: boolean }) {
  const [activeSubTab, setActiveSubTab] = useState<"screenshots" | "videos" | "content" | "features">("screenshots");
  const [loading, setLoading] = useState(true);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [content, setContent] = useState<ShowcaseContent | null>(null);
  const [stats, setStats] = useState<any>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Upload state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<"SCREENSHOT" | "DEMO_VIDEO">("SCREENSHOT");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploadFeatureCategory, setUploadFeatureCategory] = useState("General");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit modal state
  const [editMediaModal, setEditMediaModal] = useState<MediaItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editIsCover, setEditIsCover] = useState(false);
  const [editIsFeatured, setEditIsFeatured] = useState(false);
  const [editIsPublished, setEditIsPublished] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; item: MediaItem | null }>({ open: false, item: null });

  // Content edit state
  const [savingContent, setSavingContent] = useState(false);

  useEffect(() => {
    loadShowcaseData();
  }, []);

  const loadShowcaseData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/mobile/showcase");
      const json = await res.json();
      if (res.ok && json.success) {
        setMediaList(json.media || []);
        setContent(json.content || null);
        setStats(json.stats || {});
      } else {
        setMessage({ type: "error", text: json.error || "Failed to load showcase data." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error loading showcase data." });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setMessage({ type: "error", text: "Please select an image or video file." });
      return;
    }

    try {
      setUploading(true);
      setMessage(null);
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("mediaCategory", uploadCategory);
      formData.append("title", uploadTitle.trim() || uploadFile.name);
      formData.append("caption", uploadCaption.trim());
      formData.append("featureCategory", uploadFeatureCategory.trim());
      formData.append("displayOrder", String(mediaList.length + 1));

      const res = await fetch("/api/admin/mobile/showcase/media", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setMessage({ type: "success", text: "Showcase media uploaded successfully!" });
        setUploadModalOpen(false);
        setUploadFile(null);
        setUploadTitle("");
        setUploadCaption("");
        await loadShowcaseData();
      } else {
        setMessage({ type: "error", text: json.error || "Failed to upload media." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Error uploading media." });
    } finally {
      setUploading(false);
    }
  };

  const handleOpenEdit = (item: MediaItem) => {
    setEditMediaModal(item);
    setEditTitle(item.title || "");
    setEditCaption(item.caption || "");
    setEditCategory(item.featureCategory || "General");
    setEditIsCover(item.isCover);
    setEditIsFeatured(item.isFeatured);
    setEditIsPublished(item.isPublished);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMediaModal) return;

    try {
      setSavingEdit(true);
      const res = await fetch(`/api/admin/mobile/showcase/media/${editMediaModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          caption: editCaption.trim(),
          featureCategory: editCategory.trim(),
          isCover: editIsCover,
          isFeatured: editIsFeatured,
          isPublished: editIsPublished,
        }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setMessage({ type: "success", text: "Media item updated successfully." });
        setEditMediaModal(null);
        await loadShowcaseData();
      } else {
        setMessage({ type: "error", text: json.error || "Failed to update media." });
      }
    } catch {
      setMessage({ type: "error", text: "Error saving media changes." });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.item) return;
    try {
      const res = await fetch(`/api/admin/mobile/showcase/media/${deleteModal.item.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMessage({ type: "success", text: "Media removed from showcase." });
        setDeleteModal({ open: false, item: null });
        await loadShowcaseData();
      } else {
        setMessage({ type: "error", text: json.error || "Failed to delete media." });
      }
    } catch {
      setMessage({ type: "error", text: "Error deleting media." });
    }
  };

  const moveOrder = async (index: number, direction: "up" | "down") => {
    const list = [...mediaList];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const reordered = list.map((item, i) => ({ id: item.id, displayOrder: i + 1 }));
    setMediaList(list);

    try {
      await fetch("/api/admin/mobile/showcase/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reorder: true, items: reordered }),
      });
    } catch {
      await loadShowcaseData();
    }
  };

  const handleSaveContent = async () => {
    if (!content) return;
    try {
      setSavingContent(true);
      setMessage(null);
      const res = await fetch("/api/admin/mobile/showcase/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMessage({ type: "success", text: "Showcase content specifications updated globally!" });
        setContent(json.content);
      } else {
        setMessage({ type: "error", text: json.error || "Failed to save content." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error saving content." });
    } finally {
      setSavingContent(false);
    }
  };

  const screenshots = mediaList.filter((m) => m.mediaCategory === "SCREENSHOT" || m.mediaType === "IMAGE");
  const videos = mediaList.filter((m) => m.mediaCategory === "DEMO_VIDEO" || m.mediaType === "VIDEO");

  return (
    <div className="space-y-8 font-mono">
      {/* Top Action Bar */}
      <div className="rounded-3xl bg-neutral-900/70 border border-neutral-800 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-xl">
        <div>
          <span className="text-[10px] text-crimson uppercase tracking-widest font-bold block">
            Media & Catalog Management
          </span>
          <h2 className="text-xl font-orbitron font-bold text-white uppercase flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-crimson" /> App Showcase & Media Store
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Manage official screenshots, demonstration videos, features, and public /mobile showcase copy.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/mobile"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-bold text-white flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-crimson" />
            <span>Open Public Showcase</span>
          </a>

          {isEditor && (
            <button
              onClick={() => setUploadModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-crimson hover:bg-crimson/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-crimson/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Media</span>
            </button>
          )}
        </div>
      </div>

      {/* Toast Message */}
      {message && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : "bg-red-950/40 border-red-500/40 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub-Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
        <button
          onClick={() => setActiveSubTab("screenshots")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 ${
            activeSubTab === "screenshots"
              ? "bg-crimson text-white shadow-lg shadow-crimson/20"
              : "bg-neutral-900/60 text-neutral-400 hover:text-white"
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" /> Screenshots ({screenshots.length})
        </button>

        <button
          onClick={() => setActiveSubTab("videos")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 ${
            activeSubTab === "videos"
              ? "bg-crimson text-white shadow-lg shadow-crimson/20"
              : "bg-neutral-900/60 text-neutral-400 hover:text-white"
          }`}
        >
          <Video className="w-3.5 h-3.5" /> Demo Videos ({videos.length})
        </button>

        <button
          onClick={() => setActiveSubTab("content")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 ${
            activeSubTab === "content"
              ? "bg-crimson text-white shadow-lg shadow-crimson/20"
              : "bg-neutral-900/60 text-neutral-400 hover:text-white"
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Showcase Copy & Specs
        </button>

        <button
          onClick={() => setActiveSubTab("features")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 ${
            activeSubTab === "features"
              ? "bg-crimson text-white shadow-lg shadow-crimson/20"
              : "bg-neutral-900/60 text-neutral-400 hover:text-white"
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Features Catalog ({(content?.featuresJson || []).length})
        </button>
      </div>

      {/* ── SUB-TAB 1: SCREENSHOTS ────────────────────────────────────────── */}
      {activeSubTab === "screenshots" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {screenshots.map((shot, idx) => (
              <div
                key={shot.id}
                className="p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-3 flex flex-col justify-between group hover:border-neutral-700 transition-all"
              >
                <div className="space-y-2">
                  <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800">
                    <img src={shot.publicUrl} alt={shot.title || ""} className="w-full h-full object-cover" />
                    {shot.isCover && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-crimson text-white flex items-center gap-1 shadow-md">
                        <Star className="w-3 h-3 fill-current" /> Cover
                      </span>
                    )}
                    {!shot.isPublished && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-900/80 text-amber-400 border border-amber-500/30">
                        Draft
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] text-crimson font-bold uppercase block truncate">
                      {shot.featureCategory || "General"}
                    </span>
                    <h4 className="text-xs font-bold text-white truncate">{shot.title || `Screenshot ${idx + 1}`}</h4>
                    {shot.caption && (
                      <p className="text-[11px] text-neutral-400 font-sans line-clamp-2 mt-0.5">{shot.caption}</p>
                    )}
                  </div>
                </div>

                {isEditor && (
                  <div className="pt-2 border-t border-neutral-900 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveOrder(idx, "up")}
                        disabled={idx === 0}
                        title="Move Up"
                        className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 disabled:opacity-30 text-neutral-300"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveOrder(idx, "down")}
                        disabled={idx === screenshots.length - 1}
                        title="Move Down"
                        className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 disabled:opacity-30 text-neutral-300"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] text-neutral-500 font-bold ml-1">#{shot.displayOrder}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(shot)}
                        title="Edit Details"
                        className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteModal({ open: true, item: shot })}
                        title="Delete"
                        className="p-1.5 rounded-lg bg-red-950/30 hover:bg-red-950/60 text-red-400 border border-red-500/20"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SUB-TAB 2: DEMO VIDEOS ────────────────────────────────────────── */}
      {activeSubTab === "videos" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {videos.map((vid) => (
              <div
                key={vid.id}
                className="p-5 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800">
                    <video src={vid.publicUrl} poster={vid.thumbnailUrl || undefined} controls className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">{vid.title}</h4>
                      {vid.isFeatured && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-crimson text-white">
                          Featured Video
                        </span>
                      )}
                    </div>
                    {vid.caption && <p className="text-xs text-neutral-400 font-sans mt-1">{vid.caption}</p>}
                    <span className="text-[10px] text-neutral-500 block mt-2">
                      Duration: ~{vid.durationSeconds || 120}s • Storage: {vid.storageKey}
                    </span>
                  </div>
                </div>

                {isEditor && (
                  <div className="pt-3 border-t border-neutral-900 flex items-center justify-end gap-2 text-xs">
                    <button
                      onClick={() => handleOpenEdit(vid)}
                      className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 flex items-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit Info
                    </button>
                    <button
                      onClick={() => setDeleteModal({ open: true, item: vid })}
                      className="px-3 py-1.5 rounded-xl bg-red-950/30 hover:bg-red-950/60 text-red-400 border border-red-500/20 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SUB-TAB 3: CONTENT & COPY ─────────────────────────────────────── */}
      {activeSubTab === "content" && content && (
        <div className="rounded-3xl bg-neutral-950/80 border border-neutral-800 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div>
              <h3 className="text-base font-orbitron font-bold text-white uppercase">
                Showcase Public Copy & Specifications
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Edits here update the public /mobile page and the in-app CodeXa Store instantly without redeployment.
              </p>
            </div>
            {isEditor && (
              <button
                onClick={handleSaveContent}
                disabled={savingContent}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
              >
                <Save className="w-4 h-4" />
                <span>{savingContent ? "Saving..." : "Save Copy Changes"}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-neutral-400 font-bold mb-1">Application Name</label>
              <input
                type="text"
                disabled={!isEditor}
                value={content.appName}
                onChange={(e) => setContent({ ...content, appName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
              />
            </div>
            <div>
              <label className="block text-neutral-400 font-bold mb-1">Application Tagline</label>
              <input
                type="text"
                disabled={!isEditor}
                value={content.appTagline}
                onChange={(e) => setContent({ ...content, appTagline: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-neutral-400 font-bold mb-1">Short Description (Hero Section)</label>
              <textarea
                rows={2}
                disabled={!isEditor}
                value={content.shortDescription}
                onChange={(e) => setContent({ ...content, shortDescription: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-neutral-400 font-bold mb-1">Full Description (About CodeXa Mobile)</label>
              <textarea
                rows={5}
                disabled={!isEditor}
                value={content.fullDescription}
                onChange={(e) => setContent({ ...content, fullDescription: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-crimson font-sans leading-relaxed"
              />
            </div>
            <div>
              <label className="block text-neutral-400 font-bold mb-1">Android Compatibility String</label>
              <input
                type="text"
                disabled={!isEditor}
                value={content.compatibilityText}
                onChange={(e) => setContent({ ...content, compatibilityText: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
              />
            </div>
            <div>
              <label className="block text-neutral-400 font-bold mb-1">Support Email</label>
              <input
                type="text"
                disabled={!isEditor}
                value={content.supportEmail}
                onChange={(e) => setContent({ ...content, supportEmail: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── SUB-TAB 4: FEATURES CATALOG ───────────────────────────────────── */}
      {activeSubTab === "features" && content && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="text-sm font-orbitron font-bold text-white uppercase">
              Registered Features Specification ({(content.featuresJson || []).length})
            </h3>
            {isEditor && (
              <button
                onClick={handleSaveContent}
                disabled={savingContent}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
              >
                <Save className="w-4 h-4" /> Save Catalog
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(content.featuresJson || []).map((feat, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-crimson font-bold uppercase">{feat.category}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                    {feat.status}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">{feat.title}</h4>
                <p className="text-neutral-400 font-sans line-clamp-3">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── UPLOAD MEDIA MODAL ────────────────────────────────────────────── */}
      {uploadModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setUploadModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-neutral-950 border border-neutral-800 p-6 sm:p-8 space-y-6 text-xs text-neutral-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <h3 className="text-base font-orbitron font-bold text-white uppercase flex items-center gap-2">
                <Upload className="w-5 h-5 text-crimson" /> Upload Showcase Media
              </h3>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="p-2 rounded-xl bg-neutral-900 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-neutral-400 font-bold mb-1">Media Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                >
                  <option value="SCREENSHOT">App Screenshot (Portrait 9:16)</option>
                  <option value="DEMO_VIDEO">Demonstration Video (MP4)</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 font-bold mb-1">Select File *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  required
                  accept={uploadCategory === "SCREENSHOT" ? "image/png,image/jpeg,image/webp" : "video/mp4,video/webm"}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setUploadFile(f);
                      if (!uploadTitle) setUploadTitle(f.name.replace(/\.[^/.]+$/, ""));
                    }
                  }}
                  className="w-full text-xs text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-crimson file:text-white hover:file:bg-bright-red"
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-bold mb-1">Title</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Smart Attendance Tracker"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-bold mb-1">Feature Category</label>
                <input
                  type="text"
                  value={uploadFeatureCategory}
                  onChange={(e) => setUploadFeatureCategory(e.target.value)}
                  placeholder="e.g. Attendance, Classes, Chat"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-bold mb-1">Caption / Description</label>
                <textarea
                  rows={2}
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  placeholder="Short description displayed on showcase"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                />
              </div>

              <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-900 text-neutral-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="px-6 py-2 rounded-xl bg-crimson hover:bg-bright-red disabled:opacity-50 text-white font-bold"
                >
                  {uploading ? "Uploading..." : "Upload to Cloud"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT MEDIA MODAL ──────────────────────────────────────────────── */}
      {editMediaModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEditMediaModal(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-neutral-950 border border-neutral-800 p-6 sm:p-8 space-y-6 text-xs text-neutral-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <h3 className="text-base font-orbitron font-bold text-white uppercase flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-crimson" /> Edit Media Item
              </h3>
              <button
                onClick={() => setEditMediaModal(null)}
                className="p-2 rounded-xl bg-neutral-900 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-neutral-400 font-bold mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-bold mb-1">Feature Category</label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-bold mb-1">Caption</label>
                <textarea
                  rows={3}
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsCover}
                    onChange={(e) => setEditIsCover(e.target.checked)}
                    className="rounded text-crimson focus:ring-0"
                  />
                  <span>Designate as Cover</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsPublished}
                    onChange={(e) => setEditIsPublished(e.target.checked)}
                    className="rounded text-crimson focus:ring-0"
                  />
                  <span>Published on Website</span>
                </label>
              </div>

              <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditMediaModal(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-900 text-neutral-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  {savingEdit ? "Saving..." : "Save Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ────────────────────────────────────── */}
      {deleteModal.open && deleteModal.item && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDeleteModal({ open: false, item: null })}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-neutral-950 border border-neutral-800 p-6 space-y-5 text-xs text-neutral-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-orbitron font-bold text-red-400 uppercase flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-400" /> Remove Showcase Media?
              </h3>
              <button
                onClick={() => setDeleteModal({ open: false, item: null })}
                className="p-1 rounded-lg bg-neutral-900 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-neutral-400">
              Are you sure you want to remove &quot;{deleteModal.item.title || "this item"}&quot; from the public app showcase? The file will be pruned from the showcase catalog.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteModal({ open: false, item: null })}
                className="px-4 py-2 rounded-xl bg-neutral-900 text-neutral-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
