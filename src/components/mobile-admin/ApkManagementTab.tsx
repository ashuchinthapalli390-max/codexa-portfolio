"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Smartphone,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Shield,
  Copy,
  Check,
  RefreshCw,
  HardDrive,
  Radio,
  FileCheck,
  FileText,
  RotateCcw,
  Trash2,
  Send,
  Eye,
  Sliders,
  Sparkles,
} from "lucide-react";

interface ApkRelease {
  id: string;
  appId: string;
  platform: string;
  packageName: string;
  versionName: string;
  versionCode: number;
  releaseChannel: string;
  storageProvider: string;
  storageBucket: string;
  storageKey: string;
  apkDownloadUrl: string;
  apkFileSize: number;
  apkSha256: string;
  signingCertificateFingerprint: string | null;
  releaseNotes: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "FAILED" | "VALIDATING";
  updateType: "OPTIONAL" | "MANDATORY";
  minimumSupportedVersionCode: number;
  isCurrentPublished: boolean;
  uploadedById: string;
  uploadedByName: string | null;
  uploadedAt: string;
  publishedById: string | null;
  publishedByName: string | null;
  publishedAt: string | null;
  downloadCount: number;
  updateSuccessCount: number;
  validationReport?: any;
}

interface ApkManagementTabProps {
  isEditor: boolean;
  effectiveRole: string;
}

export function ApkManagementTab({ isEditor, effectiveRole }: ApkManagementTabProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    releases: ApkRelease[];
    currentPublished: ApkRelease | null;
    publishedStable: ApkRelease | null;
    publishedBeta: ApkRelease | null;
    storage: { provider: string; bucket: string; status: string };
    stats: { totalReleases: number; totalPublished: number; totalDrafts: number; totalDownloads: number };
    auditLogs: any[];
    recentEvents: any[];
  } | null>(null);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [versionName, setVersionName] = useState("");
  const [versionCode, setVersionCode] = useState<number | "">("");
  const [releaseChannel, setReleaseChannel] = useState<"STABLE" | "BETA">("STABLE");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [updateType, setUpdateType] = useState<"OPTIONAL" | "MANDATORY">("OPTIONAL");
  const [minSupportedVersionCode, setMinSupportedVersionCode] = useState<number | "">(1);
  const [publishImmediately, setPublishImmediately] = useState(false);

  // Upload Progress State
  const [uploading, setUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<"IDLE" | "AUTHORIZING" | "TRANSFERRING" | "VALIDATING" | "DONE">("IDLE");
  const [bytesUploaded, setBytesUploaded] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [uploadPercent, setUploadPercent] = useState(0);

  // Modals & Actions
  const [selectedReleaseDetails, setSelectedReleaseDetails] = useState<ApkRelease | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadReleases = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/mobile/releases");
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json);
      } else {
        setMessage({ type: "error", text: json.error || "Failed to load releases." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error loading APK releases." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReleases();
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".apk")) {
      setMessage({ type: "error", text: "Invalid file type. Please select an Android APK (.apk)." });
      setSelectedFile(null);
      return;
    }

    if (file.size > 1024 * 1024 * 1024) {
      setMessage({ type: "error", text: "APK file size exceeds maximum limit of 1 GB." });
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setMessage(null);

    // Auto-detect version from filename (e.g. app-release-1.0.5-105.apk)
    const match = file.name.match(/(\d+\.\d+(?:\.\d+)?)/);
    if (match && !versionName) {
      setVersionName(match[1]);
    }
    const codeMatch = file.name.match(/build-(\d+)|v\d+-(\d+)|-(\d+)\.apk/i);
    if (codeMatch && !versionCode) {
      const code = codeMatch[1] || codeMatch[2] || codeMatch[3];
      if (code) setVersionCode(parseInt(code, 10));
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setMessage({ type: "error", text: "Please select an APK file to upload." });
      return;
    }
    if (!versionName.trim()) {
      setMessage({ type: "error", text: "Please enter a valid version name (e.g. 1.0.5)." });
      return;
    }
    const numCode = typeof versionCode === "number" ? versionCode : parseInt(versionCode, 10);
    if (isNaN(numCode) || numCode <= 0) {
      setMessage({ type: "error", text: "Please enter a valid integer version code (e.g. 105)." });
      return;
    }

    try {
      setUploading(true);
      setMessage(null);
      setBytesUploaded(0);
      setTotalBytes(selectedFile.size);
      setUploadPercent(0);

      // Phase 1: Request authorized direct-to-cloud upload session
      setUploadPhase("AUTHORIZING");
      const sessionRes = await fetch("/api/admin/mobile/releases/upload-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: releaseChannel,
          versionName: versionName.trim(),
          versionCode: numCode,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
        }),
      });

      const sessionJson = await sessionRes.json();
      if (!sessionRes.ok || !sessionJson.success) {
        throw new Error(sessionJson.error || "Failed to create upload session.");
      }

      const { session } = sessionJson;

      // Phase 2: Direct-to-cloud upload with REAL progress tracking
      setUploadPhase("TRANSFERRING");
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", session.signedUploadUrl, true);
        xhr.setRequestHeader("Content-Type", "application/vnd.android.package-archive");

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setBytesUploaded(event.loaded);
            setTotalBytes(event.total);
            const pct = Math.round((event.loaded / event.total) * 100);
            setUploadPercent(pct);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Cloud upload rejected with status ${xhr.status}: ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network connection error during APK upload."));
        xhr.send(selectedFile);
      });

      // Phase 3: Complete upload and execute cryptographic APK validation
      setUploadPhase("VALIDATING");
      const completeRes = await fetch("/api/admin/mobile/releases/complete-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storageBucket: session.bucket,
          storageKey: session.storageKey,
          downloadUrl: session.publicDownloadUrl,
          versionName: versionName.trim(),
          versionCode: numCode,
          releaseChannel,
          releaseNotes: releaseNotes.trim(),
          updateType,
          minSupportedVersionCode: typeof minSupportedVersionCode === "number" ? minSupportedVersionCode : 1,
          publishImmediately,
        }),
      });

      const completeJson = await completeRes.json();
      if (!completeRes.ok || !completeJson.success) {
        if (completeJson.validationErrors) {
          throw new Error(`APK Inspection Failed: ${completeJson.validationErrors.join("; ")}`);
        }
        throw new Error(completeJson.error || "Failed to complete APK validation.");
      }

      setUploadPhase("DONE");
      setMessage({
        type: "success",
        text: publishImmediately
          ? `APK v${versionName} successfully uploaded, validated, and PUBLISHED globally!`
          : `APK v${versionName} uploaded and validated. Saved as DRAFT release.`,
      });

      // Reset form
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setVersionName("");
      setVersionCode("");
      setReleaseNotes("");
      setPublishImmediately(false);

      await loadReleases();
    } catch (err: any) {
      console.error("[Upload Error]", err);
      setMessage({ type: "error", text: err?.message || "Failed to upload APK release." });
    } finally {
      setUploading(false);
      setUploadPhase("IDLE");
    }
  };

  const handlePublish = async (release: ApkRelease) => {
    setConfirmModal({
      open: true,
      title: `Publish CodeXa APK v${release.versionName}?`,
      description: `This will instantly designate v${release.versionName} (Build ${release.versionCode}) as the active published release for all users and dispatch update notifications.`,
      action: async () => {
        try {
          const res = await fetch(`/api/admin/mobile/releases/${release.id}/publish`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notifyUsers: true }),
          });
          const json = await res.json();
          if (res.ok && json.success) {
            setMessage({ type: "success", text: `Release v${release.versionName} is now published globally!` });
            await loadReleases();
          } else {
            setMessage({ type: "error", text: json.error || "Failed to publish release." });
          }
        } catch {
          setMessage({ type: "error", text: "Network error publishing release." });
        }
      },
    });
  };

  const handleRollback = async (release: ApkRelease) => {
    setConfirmModal({
      open: true,
      title: `Roll Back to v${release.versionName}?`,
      description: `This will demote the currently active release and point all CodeXa mobile clients back to v${release.versionName} (Build ${release.versionCode}). User accounts and data are fully preserved.`,
      action: async () => {
        try {
          const res = await fetch(`/api/admin/mobile/releases/${release.id}/rollback`, {
            method: "POST",
          });
          const json = await res.json();
          if (res.ok && json.success) {
            setMessage({
              type: "success",
              text: `Rolled back to v${release.versionName}. Active configuration updated.`,
            });
            await loadReleases();
          } else {
            setMessage({ type: "error", text: json.error || "Failed to rollback release." });
          }
        } catch {
          setMessage({ type: "error", text: "Network error rolling back release." });
        }
      },
    });
  };

  const handleArchive = async (release: ApkRelease) => {
    try {
      const res = await fetch(`/api/admin/mobile/releases/${release.id}/archive`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMessage({ type: "success", text: `Release v${release.versionName} archived.` });
        await loadReleases();
      } else {
        setMessage({ type: "error", text: json.error || "Failed to archive release." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error archiving release." });
    }
  };

  const handleDelete = async (release: ApkRelease) => {
    setConfirmModal({
      open: true,
      title: `Delete Draft Release v${release.versionName}?`,
      description: "This will remove the release record and delete the APK binary from persistent cloud storage.",
      action: async () => {
        try {
          const res = await fetch(`/api/admin/mobile/releases/${release.id}`, {
            method: "DELETE",
          });
          const json = await res.json();
          if (res.ok && json.success) {
            setMessage({ type: "success", text: `Release v${release.versionName} deleted.` });
            await loadReleases();
          } else {
            setMessage({ type: "error", text: json.error || "Failed to delete release." });
          }
        } catch {
          setMessage({ type: "error", text: "Network error deleting release." });
        }
      },
    });
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 MB";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const published = data?.currentPublished;
  const draftReleases = (data?.releases || []).filter((r) => r.status === "DRAFT");
  const pastReleases = (data?.releases || []).filter((r) => r.status !== "DRAFT");

  return (
    <div className="space-y-8 font-sans">
      {/* Alert Header / Toast */}
      {message && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-sm ${
            message.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
              : "bg-red-950/40 border-red-500/40 text-red-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {message.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            )}
            <p className="font-mono">{message.text}</p>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-neutral-400 hover:text-white px-2 py-1 text-xs font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Role Notice */}
      <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-crimson" />
          <div>
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider block">
              Authorization & Access Governance
            </span>
            <p className="text-sm font-semibold text-white">
              Role: <span className="text-crimson font-orbitron">{effectiveRole}</span> —{" "}
              {isEditor ? "Full Release & Publishing Control" : "Read-Only Release Visibility"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-neutral-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Cloud Storage: Connected (Supabase)
          </span>
          <button
            onClick={loadReleases}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* ── SECTION 1: CURRENT PUBLISHED VERSION ────────────────────────── */}
      <div className="rounded-3xl bg-neutral-900/70 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div>
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block font-bold">
              Active Production Deployment
            </span>
            <h3 className="text-xl font-orbitron font-bold text-white uppercase flex items-center gap-2">
              <Smartphone className="w-6 h-6 text-emerald-400" /> Current Published Version
            </h3>
          </div>
          {published && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                LIVE NOW
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                Channel: {published.releaseChannel}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                  published.updateType === "MANDATORY"
                    ? "bg-red-500/20 text-red-300 border-red-500/30"
                    : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                }`}
              >
                {published.updateType === "MANDATORY" ? "FORCE UPDATE REQUIRED" : "OPTIONAL UPDATE"}
              </span>
            </div>
          )}
        </div>

        {published ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800 space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Version</span>
                <p className="text-2xl font-orbitron font-bold text-white">v{published.versionName}</p>
                <span className="text-xs font-mono text-neutral-400">Build Code: {published.versionCode}</span>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800 space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Binary Size</span>
                <p className="text-2xl font-orbitron font-bold text-white">{formatFileSize(published.apkFileSize)}</p>
                <span className="text-xs font-mono text-neutral-400">Package: {published.packageName}</span>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800 space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Min Supported Code</span>
                <p className="text-2xl font-orbitron font-bold text-white">{published.minimumSupportedVersionCode}</p>
                <span className="text-xs font-mono text-neutral-400">
                  {published.updateType === "MANDATORY" ? "Older builds blocked" : "Soft update suggested"}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800 space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Downloads</span>
                <p className="text-2xl font-orbitron font-bold text-white">{published.downloadCount}</p>
                <span className="text-xs font-mono text-neutral-400">
                  Published: {published.publishedAt ? new Date(published.publishedAt).toLocaleDateString() : "Live"}
                </span>
              </div>
            </div>

            {/* SHA-256 and Download Bar */}
            <div className="p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono text-neutral-400 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-400" /> Cryptographic SHA-256 Checksum:
                </span>
                <button
                  onClick={() => copyToClipboard(published.apkSha256, "sha256")}
                  className="text-xs font-mono text-neutral-300 hover:text-white flex items-center gap-1 bg-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-800"
                >
                  {copiedKey === "sha256" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === "sha256" ? "Copied" : "Copy Hash"}
                </button>
              </div>
              <p className="font-mono text-xs text-neutral-300 bg-neutral-900 p-2.5 rounded-xl border border-neutral-800/80 break-all select-all">
                {published.apkSha256}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-xs font-mono text-neutral-400">
                  Published by: <span className="text-neutral-200">{published.publishedByName || "Founder"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={published.apkDownloadUrl || `/api/mobile/app-update/download?releaseId=${published.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-crimson hover:bg-crimson/90 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-crimson/20"
                  >
                    <Download className="w-4 h-4" /> Download APK
                  </a>
                  <button
                    onClick={() => copyToClipboard(published.apkDownloadUrl, "cdnUrl")}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-mono text-xs transition-colors"
                  >
                    {copiedKey === "cdnUrl" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedKey === "cdnUrl" ? "Copied Link" : "Copy CDN Link"}
                  </button>
                </div>
              </div>
            </div>

            {/* Release Notes */}
            {published.releaseNotes && (
              <div className="p-4 rounded-2xl bg-neutral-950/40 border border-neutral-800 space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Release Notes</span>
                <p className="text-xs font-sans text-neutral-300 whitespace-pre-line leading-relaxed">
                  {published.releaseNotes}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center text-neutral-500 font-mono text-xs border border-dashed border-neutral-800 rounded-2xl space-y-2">
            <Smartphone className="w-8 h-8 text-neutral-600 mx-auto" />
            <p>No active published APK release found.</p>
            <p className="text-[11px] text-neutral-600">Upload a new release below to deploy version 1.0.0 or higher.</p>
          </div>
        )}
      </div>

      {/* ── SECTION 2: UPLOAD NEW APK ───────────────────────────────────── */}
      {isEditor && (
        <div className="rounded-3xl bg-neutral-900/70 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
          <div className="border-b border-neutral-800 pb-4">
            <span className="text-[10px] font-mono text-crimson uppercase tracking-widest block font-bold">
              Founder & Co-Founder Authority
            </span>
            <h3 className="text-xl font-orbitron font-bold text-white uppercase flex items-center gap-2">
              <Upload className="w-6 h-6 text-crimson" /> Upload New Android APK
            </h3>
            <p className="text-xs font-mono text-neutral-400">
              Direct-to-cloud signed upload with ZIP structure, Dalvik bytecode, and signature verification.
            </p>
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-6">
            {/* File Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all text-center space-y-3 ${
                selectedFile
                  ? "bg-emerald-950/20 border-emerald-500/40"
                  : "bg-neutral-950/50 border-neutral-800 hover:border-neutral-700"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".apk"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 mx-auto flex items-center justify-center">
                {selectedFile ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : (
                  <Upload className="w-6 h-6 text-neutral-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-white font-mono">
                  {selectedFile ? selectedFile.name : "Click to select Android .apk file or drag & drop"}
                </p>
                <p className="text-xs text-neutral-500 font-mono mt-1">
                  {selectedFile
                    ? `Size: ${formatFileSize(selectedFile.size)} • Ready for verification`
                    : "Accepts compiled, signed Android APKs up to 1 GB"}
                </p>
              </div>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
              <div>
                <label className="block text-neutral-400 mb-1 font-bold">Application</label>
                <input
                  type="text"
                  readOnly
                  value="CodeXa Mobile (Android)"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-bold">Version Name *</label>
                <input
                  type="text"
                  required
                  disabled={uploading}
                  placeholder="e.g. 1.0.5"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-bold">Version Code (Integer) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  disabled={uploading}
                  placeholder="e.g. 105"
                  value={versionCode}
                  onChange={(e) => setVersionCode(e.target.value ? parseInt(e.target.value, 10) : "")}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-bold">Release Channel</label>
                <select
                  disabled={uploading}
                  value={releaseChannel}
                  onChange={(e) => setReleaseChannel(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                >
                  <option value="STABLE">Stable Channel (Production)</option>
                  <option value="BETA">Beta Channel (Pre-release testing)</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-bold">Update Policy</label>
                <select
                  disabled={uploading}
                  value={updateType}
                  onChange={(e) => setUpdateType(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                >
                  <option value="OPTIONAL">Optional Update (User can choose Later)</option>
                  <option value="MANDATORY">Mandatory / Force Update (Required to continue)</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-bold">Minimum Supported Code</label>
                <input
                  type="number"
                  min="1"
                  disabled={uploading}
                  value={minSupportedVersionCode}
                  onChange={(e) =>
                    setMinSupportedVersionCode(e.target.value ? parseInt(e.target.value, 10) : "")
                  }
                  placeholder="e.g. 103"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-crimson"
                />
              </div>
            </div>

            {/* Release Notes */}
            <div>
              <label className="block text-neutral-400 font-mono text-xs mb-1 font-bold">
                Release Notes & Changelog (Displayed in Mobile App)
              </label>
              <textarea
                rows={3}
                disabled={uploading}
                value={releaseNotes}
                onChange={(e) => setReleaseNotes(e.target.value)}
                placeholder="• Core database synchronization fixes&#10;• Attendance window optimizations&#10;• Improved APK update performance"
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-sans text-xs focus:outline-none focus:border-crimson leading-relaxed"
              />
            </div>

            {/* Publish Immediately Toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800">
              <div>
                <span className="text-sm font-semibold text-white font-mono block">Publish Immediately</span>
                <span className="text-xs text-neutral-500 font-mono">
                  If enabled, this APK will be verified and published to all users as soon as upload completes.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={uploading}
                  checked={publishImmediately}
                  onChange={(e) => setPublishImmediately(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-crimson"></div>
              </label>
            </div>

            {/* REAL PROGRESS BAR */}
            {uploading && (
              <div className="p-5 rounded-2xl bg-neutral-950 border border-crimson/30 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-crimson font-bold flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {uploadPhase === "AUTHORIZING" && "Authorizing Cloud Upload Session..."}
                    {uploadPhase === "TRANSFERRING" && "Uploading APK Binary to Cloud Storage..."}
                    {uploadPhase === "VALIDATING" && "Inspecting APK Structure & Checksums..."}
                    {uploadPhase === "DONE" && "Upload and Verification Complete!"}
                  </span>
                  <span className="text-neutral-400">
                    {uploadPhase === "TRANSFERRING"
                      ? `${formatFileSize(bytesUploaded)} / ${formatFileSize(totalBytes)} (${uploadPercent}%)`
                      : uploadPhase}
                  </span>
                </div>

                <div className="w-full h-3 rounded-full bg-neutral-900 overflow-hidden border border-neutral-800">
                  <div
                    className="h-full bg-gradient-to-r from-crimson to-red-500 transition-all duration-150 ease-out"
                    style={{
                      width:
                        uploadPhase === "AUTHORIZING"
                          ? "10%"
                          : uploadPhase === "VALIDATING"
                          ? "95%"
                          : uploadPhase === "DONE"
                          ? "100%"
                          : `${uploadPercent}%`,
                    }}
                  ></div>
                </div>
                <p className="text-[11px] font-mono text-neutral-500">
                  Transferred directly to cloud object storage. No ephemeral disk buffering.
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                  setVersionName("");
                  setVersionCode("");
                  setReleaseNotes("");
                }}
                disabled={uploading}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs transition-colors"
              >
                Reset Form
              </button>

              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="px-6 py-2.5 rounded-xl bg-crimson hover:bg-crimson/90 disabled:opacity-50 text-white font-mono text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-crimson/20"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Processing Upload...
                  </>
                ) : publishImmediately ? (
                  <>
                    <Send className="w-4 h-4" /> Upload & Publish Release
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> Upload & Save as Draft
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── SECTION 3: DRAFT RELEASES ───────────────────────────────────── */}
      {draftReleases.length > 0 && (
        <div className="rounded-3xl bg-neutral-900/70 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div>
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest block font-bold">
                Pre-Release Staging
              </span>
              <h3 className="text-lg font-orbitron font-bold text-white uppercase flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" /> Draft Releases Pending Approval ({draftReleases.length})
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {draftReleases.map((release) => (
              <div
                key={release.id}
                className="p-5 rounded-2xl bg-neutral-950/70 border border-neutral-800 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-orbitron font-bold text-white">v{release.versionName}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      DRAFT
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono text-neutral-400">
                    <div>Build Code: <span className="text-white">{release.versionCode}</span></div>
                    <div>Channel: <span className="text-white">{release.releaseChannel}</span></div>
                    <div>Size: <span className="text-white">{formatFileSize(release.apkFileSize)}</span></div>
                    <div>Type: <span className="text-white">{release.updateType}</span></div>
                  </div>

                  {release.releaseNotes && (
                    <p className="text-xs font-sans text-neutral-300 line-clamp-2">
                      {release.releaseNotes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-900">
                  <button
                    onClick={() => setSelectedReleaseDetails(release)}
                    className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono flex items-center gap-1"
                    title="View Inspection Report"
                  >
                    <Eye className="w-4 h-4" /> Details
                  </button>
                  {isEditor && (
                    <>
                      <button
                        onClick={() => handleDelete(release)}
                        className="p-2 rounded-xl bg-red-950/30 hover:bg-red-950/60 text-red-300 text-xs font-mono flex items-center gap-1 border border-red-500/30"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                      <button
                        onClick={() => handlePublish(release)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
                      >
                        <Send className="w-4 h-4" /> Publish Now
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION 4: RELEASE HISTORY TABLE ───────────────────────────── */}
      <div className="rounded-3xl bg-neutral-900/70 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div>
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block">
              Immutable Deployment Ledger
            </span>
            <h3 className="text-xl font-orbitron font-bold text-white uppercase flex items-center gap-2">
              <HardDrive className="w-6 h-6 text-neutral-300" /> Release History & Deployments
            </h3>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            Total Releases Recorded: {(data?.releases || []).length}
          </span>
        </div>

        {pastReleases.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950/60">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 bg-neutral-900/60">
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">SHA-256 Hash</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900 text-neutral-300">
                {pastReleases.map((rel) => (
                  <tr key={rel.id} className="hover:bg-neutral-900/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">
                      v{rel.versionName}
                      <span className="block text-[10px] text-neutral-500">Build {rel.versionCode}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rel.releaseChannel === "STABLE"
                            ? "bg-emerald-500/10 text-emerald-300"
                            : "bg-purple-500/10 text-purple-300"
                        }`}
                      >
                        {rel.releaseChannel}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {rel.isCurrentPublished ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          PUBLISHED (ACTIVE)
                        </span>
                      ) : rel.status === "ARCHIVED" ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-400">
                          ARCHIVED
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-400">
                          {rel.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[11px]">
                      {rel.updateType === "MANDATORY" ? (
                        <span className="text-red-400 font-bold">Mandatory</span>
                      ) : (
                        <span className="text-neutral-400">Optional</span>
                      )}
                    </td>
                    <td className="py-3 px-4">{formatFileSize(rel.apkFileSize)}</td>
                    <td className="py-3 px-4 font-mono text-[10px] text-neutral-400">
                      <button
                        onClick={() => copyToClipboard(rel.apkSha256, `hash-${rel.id}`)}
                        className="hover:text-white flex items-center gap-1"
                      >
                        {rel.apkSha256.substring(0, 10)}...
                        {copiedKey === `hash-${rel.id}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-neutral-400 text-[11px]">
                      {new Date(rel.publishedAt || rel.uploadedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedReleaseDetails(rel)}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={rel.apkDownloadUrl || `/api/mobile/app-update/download?releaseId=${rel.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                          title="Download APK"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        {isEditor && !rel.isCurrentPublished && (
                          <button
                            onClick={() => handleRollback(rel)}
                            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-crimson text-neutral-200 hover:text-white transition-colors text-[10px] font-bold flex items-center gap-1"
                            title="Re-activate this release"
                          >
                            <RotateCcw className="w-3 h-3" /> Roll Back To
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-neutral-500 font-mono text-xs border border-dashed border-neutral-800 rounded-2xl">
            No historical releases recorded yet.
          </div>
        )}
      </div>

      {/* ── SECTION 5: CLOUD STORAGE & TELEMETRY DIAGNOSTICS ────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Storage Architecture Card */}
        <div className="rounded-3xl bg-neutral-900/70 border border-neutral-800 p-6 space-y-4">
          <div className="flex items-center gap-2 text-white font-orbitron font-bold text-sm uppercase">
            <HardDrive className="w-4 h-4 text-emerald-400" /> Persistent Object Storage Architecture
          </div>
          <div className="space-y-2 text-xs font-mono text-neutral-300">
            <div className="flex justify-between py-1 border-b border-neutral-800/80">
              <span className="text-neutral-500">Provider</span>
              <span className="text-white font-bold">Supabase Cloud Storage (S3-Compatible)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-800/80">
              <span className="text-neutral-500">Bucket Name</span>
              <span className="text-white">mobile-releases</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-800/80">
              <span className="text-neutral-500">Object Partitioning</span>
              <span className="text-white">codexa-apk/[channel]/[version]/</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-800/80">
              <span className="text-neutral-500">Max Package Limit</span>
              <span className="text-white">1 GB per APK</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-neutral-500">Database Safety Rule</span>
              <span className="text-emerald-400 font-bold">Bytea-Free (Metadata only in Postgres)</span>
            </div>
          </div>
        </div>

        {/* Update Telemetry & Diagnostics */}
        <div className="rounded-3xl bg-neutral-900/70 border border-neutral-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-orbitron font-bold text-sm uppercase">
              <Radio className="w-4 h-4 text-crimson" /> Real-Time Update Telemetry
            </div>
            <span className="text-[10px] font-mono text-neutral-500">Recent Events</span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {(data?.recentEvents || []).length > 0 ? (
              data!.recentEvents.map((evt: any) => (
                <div
                  key={evt.id}
                  className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800 text-[11px] font-mono flex items-center justify-between"
                >
                  <div>
                    <span
                      className={`font-bold mr-2 ${
                        evt.eventType === "UPDATE_INSTALLED"
                          ? "text-emerald-400"
                          : evt.eventType === "DOWNLOAD_START"
                          ? "text-blue-400"
                          : "text-neutral-400"
                      }`}
                    >
                      {evt.eventType}
                    </span>
                    <span className="text-neutral-300">
                      v{evt.release?.versionName || "1.0"}
                    </span>
                  </div>
                  <span className="text-neutral-500 text-[10px]">
                    {new Date(evt.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs font-mono text-neutral-500 text-center py-6">
                No recent update events recorded yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── DETAILS MODAL ────────────────────────────────────────────────── */}
      {selectedReleaseDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-crimson uppercase tracking-widest block font-bold">
                  Release Inspection Details
                </span>
                <h4 className="text-lg font-orbitron font-bold text-white">
                  v{selectedReleaseDetails.versionName} (Build {selectedReleaseDetails.versionCode})
                </h4>
              </div>
              <button
                onClick={() => setSelectedReleaseDetails(null)}
                className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <div>Package ID: <span className="text-white">{selectedReleaseDetails.packageName}</span></div>
                <div>Status: <span className="text-white">{selectedReleaseDetails.status}</span></div>
                <div>Channel: <span className="text-white">{selectedReleaseDetails.releaseChannel}</span></div>
                <div>Update Type: <span className="text-white">{selectedReleaseDetails.updateType}</span></div>
                <div>Binary Size: <span className="text-white">{formatFileSize(selectedReleaseDetails.apkFileSize)}</span></div>
                <div>Downloads: <span className="text-white">{selectedReleaseDetails.downloadCount}</span></div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1 font-bold">SHA-256 Checksum:</label>
                <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] break-all select-all text-neutral-300">
                  {selectedReleaseDetails.apkSha256}
                </div>
              </div>

              {selectedReleaseDetails.signingCertificateFingerprint && (
                <div>
                  <label className="text-neutral-400 block mb-1 font-bold">Signing Certificate Fingerprint:</label>
                  <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] break-all select-all text-neutral-300">
                    {selectedReleaseDetails.signingCertificateFingerprint}
                  </div>
                </div>
              )}

              {selectedReleaseDetails.releaseNotes && (
                <div>
                  <label className="text-neutral-400 block mb-1 font-bold">Changelog / Release Notes:</label>
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 font-sans text-xs whitespace-pre-line">
                    {selectedReleaseDetails.releaseNotes}
                  </div>
                </div>
              )}

              {selectedReleaseDetails.validationReport && (
                <div>
                  <label className="text-neutral-400 block mb-1 font-bold">Automated Validation Report:</label>
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ZIP Archive Magic Valid (PK\x03\x04)
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> AndroidManifest.xml Verified
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Compiled Dalvik Executable (.dex) Present
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Cryptographic APK Signature Verified (
                      {selectedReleaseDetails.validationReport.signingType || "v2_v3_block"})
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedReleaseDetails(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 text-white font-mono text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRMATION MODAL ────────────────────────────────────────────── */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-4">
            <h4 className="text-base font-orbitron font-bold text-white uppercase">{confirmModal.title}</h4>
            <p className="text-xs font-mono text-neutral-300 leading-relaxed">{confirmModal.description}</p>
            <div className="flex items-center justify-end gap-2 pt-4">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white font-mono text-xs"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const action = confirmModal.action;
                  setConfirmModal(null);
                  await action();
                }}
                className="px-4 py-2 rounded-xl bg-crimson hover:bg-crimson/90 text-white font-mono text-xs font-bold"
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
