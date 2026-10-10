"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Download,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Clock,
  GraduationCap,
  BookOpen,
  FileCode,
  FolderKanban,
  MessageSquare,
  Users,
  CalendarX,
  ShoppingBag,
  Info,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  Layers,
  Lock,
  Cpu,
  RefreshCw,
} from "lucide-react";

interface ShowcaseCatalog {
  application: {
    name: string;
    tagline: string;
    badgeText: string;
    platform: string;
    packageName: string;
    developer: string;
    distribution: string;
    officialWebsiteUrl: string;
    compatibility: string;
    supportEmail: string;
    supportPhone: string;
    shortDescription: string;
    fullDescription: string;
  };
  release: {
    id: string;
    versionName: string;
    versionCode: number;
    channel: string;
    apkFileSize: number;
    apkSha256: string;
    signingCertificateFingerprint?: string;
    releaseNotes?: string;
    updateType: string;
    minimumSupportedVersionCode: number;
    publishedAt: string;
    apkDownloadUrl: string;
  } | null;
  catalog: {
    revision: number;
    updatedAt: string;
    screenshots: Array<{
      id: string;
      title: string;
      caption?: string;
      altText?: string;
      url: string;
      thumbnailUrl?: string;
      displayOrder: number;
      featureCategory: string;
      isCover: boolean;
      fileSize: number;
    }>;
    videos: Array<{
      id: string;
      title: string;
      description?: string;
      url: string;
      thumbnailUrl?: string;
      durationSeconds: number;
      displayOrder: number;
      isFeatured: boolean;
    }>;
    features: Array<{
      id: string;
      title: string;
      description: string;
      icon: string;
      status: string;
      category: string;
    }>;
    installationSteps: Array<{
      stepNumber: number;
      title: string;
      description: string;
      tip: string;
    }>;
    troubleshooting: Array<{
      q: string;
      a: string;
      category: string;
    }>;
  };
}

export default function MobileShowcasePage() {
  const [data, setData] = useState<ShowcaseCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // Screenshot modal & carousel state
  const [selectedScreenshotIndex, setSelectedScreenshotIndex] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Video state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Copy hash state
  const [copiedHash, setCopiedHash] = useState(false);

  useEffect(() => {
    fetch("/api/mobile/store/catalog")
      .then((res) => res.json())
      .then((resData) => {
        if (resData.ok) {
          setData(resData);
        }
      })
      .catch((err) => console.error("[Mobile Showcase Load Error]", err))
      .finally(() => setLoading(false));
  }, []);

  // Handle keyboard escape for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedScreenshotIndex(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const formatFileSize = (bytes?: number) => {
    if (!bytes || isNaN(bytes) || bytes <= 0) return "85 MB";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const scrollCarousel = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = direction === "left" ? -340 : 340;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const toggleVideoPlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleVideoMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const release = data?.release;
  const app = data?.application;
  const screenshots = data?.catalog.screenshots || [];
  const videos = data?.catalog.videos || [];
  const features = data?.catalog.features || [];
  const installSteps = data?.catalog.installationSteps || [];
  const faq = data?.catalog.troubleshooting || [];

  const filteredScreenshots =
    activeCategory === "All"
      ? screenshots
      : screenshots.filter((s) => s.featureCategory?.toLowerCase() === activeCategory.toLowerCase());

  const featureIconsMap: Record<string, any> = {
    Clock,
    GraduationCap,
    BookOpen,
    FileCode,
    FolderKanban,
    MessageSquare,
    Users,
    CalendarX,
    Sparkles,
    ShoppingBag,
  };

  return (
    <div className="min-h-screen bg-[#060606] text-white selection:bg-crimson selection:text-white font-sans">
      {/* Background Ambient Accents */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-1/4 w-[600px] h-[350px] bg-crimson/15 rounded-full blur-[160px]" />
        <div className="absolute bottom-1/3 left-1/4 w-[500px] h-[300px] bg-red-600/10 rounded-full blur-[180px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f12_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f12_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-16">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-mono uppercase tracking-wider text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5"
            >
              &larr; CodeXa Home
            </Link>
            <span className="text-neutral-700">/</span>
            <Link href="/apps" className="text-xs font-mono uppercase text-neutral-400 hover:text-white transition-colors">
              Apps
            </Link>
            <span className="text-neutral-700">/</span>
            <span className="text-xs font-mono uppercase text-crimson font-bold">Mobile App Showcase</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/apps/mobile"
              className="text-xs font-mono px-3 py-1.5 rounded-xl bg-neutral-900/80 border border-neutral-800 text-neutral-300 hover:text-white hover:border-crimson/40 transition-all flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-crimson" />
              <span>Admin Center</span>
            </Link>
          </div>
        </div>

        {/* ── 1. OFFICIAL APP HERO SECTION ─────────────────────────────────── */}
        <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800/80 p-6 sm:p-10 lg:p-12 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          {/* Crimson glow line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-crimson to-transparent" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* App Icon Column */}
            <div className="lg:col-span-4 flex flex-col items-center text-center">
              <div className="relative group">
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-crimson to-bright-red opacity-50 blur-lg group-hover:opacity-80 transition duration-500" />
                <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-neutral-950 border-2 border-neutral-700/80 p-4 shadow-2xl flex items-center justify-center overflow-hidden">
                  <Image
                    src="/logo.jpeg"
                    alt="CodeXa Mobile Official App Icon"
                    width={160}
                    height={160}
                    className="object-cover rounded-2xl"
                    priority
                  />
                </div>
              </div>

              {/* Verified Badge */}
              <div className="mt-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verified Official Release</span>
              </div>
            </div>

            {/* App Details Column */}
            <div className="lg:col-span-8 space-y-6 text-center lg:text-left">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-crimson/15 border border-crimson/30 text-bright-red text-xs font-mono uppercase tracking-widest mb-3">
                  <Smartphone className="w-3.5 h-3.5" />
                  {app?.badgeText || "Available Exclusively on Our Official Website"}
                </div>
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-orbitron font-black uppercase tracking-wider text-white">
                  {app?.name || "CodeXa Mobile"}
                </h1>
                <p className="text-sm font-mono text-neutral-400 mt-1">
                  Developer: <span className="text-white font-bold">{app?.developer || "CodeXa Agency"}</span> • Platform:{" "}
                  <span className="text-emerald-400 font-bold">Android</span>
                </p>
              </div>

              <p className="text-neutral-300 font-sans text-sm sm:text-base leading-relaxed max-w-2xl">
                {app?.shortDescription ||
                  "Your complete CodeXa agency workspace, connected wherever you go. Attendance, Classes, Projects, Assignments, Communication. Everything in one place."}
              </p>

              {/* Version Specs Pill Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs max-w-2xl">
                <div className="p-3 rounded-2xl bg-neutral-950/70 border border-neutral-800/80">
                  <span className="text-neutral-500 text-[10px] block uppercase">Version</span>
                  <span className="text-white font-bold text-sm sm:text-base">
                    v{release?.versionName || "1.0.0"}
                  </span>
                  <span className="text-[10px] text-neutral-500 block">Build {release?.versionCode || 1}</span>
                </div>
                <div className="p-3 rounded-2xl bg-neutral-950/70 border border-neutral-800/80">
                  <span className="text-neutral-500 text-[10px] block uppercase">Package Size</span>
                  <span className="text-white font-bold text-sm sm:text-base">
                    {formatFileSize(release?.apkFileSize)}
                  </span>
                  <span className="text-[10px] text-neutral-500 block">Compiled APK</span>
                </div>
                <div className="p-3 rounded-2xl bg-neutral-950/70 border border-neutral-800/80">
                  <span className="text-neutral-500 text-[10px] block uppercase">Compatibility</span>
                  <span className="text-white font-bold text-sm sm:text-base">Android 8.0+</span>
                  <span className="text-[10px] text-neutral-500 block">SDK 26 or later</span>
                </div>
                <div className="p-3 rounded-2xl bg-neutral-950/70 border border-neutral-800/80">
                  <span className="text-neutral-500 text-[10px] block uppercase">Channel</span>
                  <span className="text-emerald-400 font-bold text-sm sm:text-base">
                    {release?.channel || "STABLE"}
                  </span>
                  <span className="text-[10px] text-neutral-500 block">Production</span>
                </div>
              </div>

              {/* Download CTA Action */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <a
                  href={release?.apkDownloadUrl || `/api/mobile/app-update/download`}
                  download="CodeXa.apk"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-crimson to-bright-red hover:from-crimson/90 hover:to-bright-red/90 text-white font-mono text-sm font-bold tracking-wider uppercase transition-all shadow-xl shadow-crimson/30 flex items-center justify-center gap-3 group active:scale-[0.98]"
                >
                  <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                  <span>Download Official APK</span>
                </a>

                <div className="text-xs font-mono text-neutral-500 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Available exclusively at codxa-agency.online</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. APP SCREENSHOTS SECTION (EXPLORE CODEXA MOBILE) ──────────── */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-neutral-800 pb-4">
            <div>
              <span className="text-xs font-mono text-crimson uppercase tracking-widest font-bold block">
                Visual Architecture
              </span>
              <h2 className="text-2xl sm:text-4xl font-orbitron font-bold uppercase tracking-wide text-white">
                Explore CodeXa Mobile
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 font-mono mt-1">
                A closer look at your CodeXa workspace in action.
              </p>
            </div>

            {/* Navigation Arrows */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollCarousel("left")}
                aria-label="Scroll screenshots left"
                className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scrollCarousel("right")}
                aria-label="Scroll screenshots right"
                className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Screenshot Category Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none font-mono text-xs">
            {["All", "Welcome & Auth", "Dashboard", "Attendance", "Classes", "Assignments", "Projects", "Communication", "Directory", "AI Copilot", "CodeXa Store"].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? "bg-crimson text-white font-bold shadow-lg shadow-crimson/20"
                    : "bg-neutral-900/80 text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Horizontal Screenshot Carousel */}
          <div
            ref={carouselRef}
            className="flex items-start gap-5 overflow-x-auto pb-4 pt-2 scrollbar-none snap-x snap-mandatory"
          >
            {filteredScreenshots.length > 0 ? (
              filteredScreenshots.map((shot, idx) => (
                <div
                  key={shot.id}
                  onClick={() => setSelectedScreenshotIndex(idx)}
                  className="snap-start shrink-0 w-[240px] sm:w-[280px] rounded-2xl bg-neutral-950 border border-neutral-800/80 p-2 shadow-xl hover:border-crimson/50 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="relative aspect-[9/16] w-full rounded-xl overflow-hidden bg-neutral-900">
                    <img
                      src={shot.url}
                      alt={shot.altText || shot.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <span className="text-[11px] font-mono text-white font-bold flex items-center gap-1">
                        <Maximize2 className="w-3.5 h-3.5" /> Tap to enlarge
                      </span>
                    </div>
                  </div>
                  <div className="p-3 space-y-1">
                    <span className="text-[10px] font-mono text-crimson font-bold uppercase block">
                      {shot.featureCategory}
                    </span>
                    <h3 className="text-xs font-orbitron font-bold text-white truncate">{shot.title}</h3>
                    {shot.caption && (
                      <p className="text-[11px] text-neutral-400 font-sans line-clamp-2 leading-relaxed">
                        {shot.caption}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="w-full py-16 text-center text-neutral-500 font-mono text-xs">
                No screenshots found in this category.
              </div>
            )}
          </div>
        </div>

        {/* ── 3. APP DEMO VIDEO SECTION (WATCH CODEXA IN ACTION) ──────────── */}
        <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800/80 p-6 sm:p-10 backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
            <div>
              <span className="text-xs font-mono text-crimson uppercase tracking-widest font-bold block">
                Interactive Demonstration
              </span>
              <h2 className="text-2xl sm:text-3xl font-orbitron font-bold uppercase tracking-wide text-white">
                Watch CodeXa in Action
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 font-mono mt-1">
                Official high-definition walkthrough of the CodeXa Android mobile application.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-crimson/15 border border-crimson/30 text-bright-red text-xs font-mono">
              <Play className="w-3 h-3 fill-current" /> 1080p Full HD
            </div>
          </div>

          {/* Video Player Container */}
          <div className="relative aspect-video max-w-4xl mx-auto rounded-3xl overflow-hidden bg-neutral-950 border border-neutral-800 shadow-2xl group">
            <video
              ref={videoRef}
              src={videos[0]?.url || "/appstore/codexa-demo-1080p.mp4"}
              poster={videos[0]?.thumbnailUrl || "/appstore/screenshot-1.png"}
              preload="metadata"
              playsInline
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="w-full h-full object-cover"
            />

            {/* Custom Play Button Overlay when paused */}
            {!isPlaying && (
              <div
                onClick={toggleVideoPlay}
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center cursor-pointer transition-opacity"
              >
                <div className="w-20 h-20 rounded-full bg-crimson hover:bg-bright-red text-white flex items-center justify-center shadow-2xl shadow-crimson/50 hover:scale-110 transition-all">
                  <Play className="w-8 h-8 fill-current ml-1" />
                </div>
              </div>
            )}

            {/* Bottom Controls Bar */}
            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleVideoPlay}
                  className="p-2 rounded-xl bg-neutral-900/80 text-white hover:bg-neutral-800 transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                </button>
                <button
                  onClick={toggleVideoMute}
                  className="p-2 rounded-xl bg-neutral-900/80 text-white hover:bg-neutral-800 transition-colors"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-xl bg-neutral-900/80 text-white hover:bg-neutral-800 transition-colors"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. KEY FEATURES SECTION ───────────────────────────────────────── */}
        <div className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-mono text-crimson uppercase tracking-widest font-bold">
              Core Capabilities
            </span>
            <h2 className="text-2xl sm:text-4xl font-orbitron font-bold uppercase tracking-wide text-white">
              Everything You Need, In One App
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-mono">
              Designed specifically for CodeXa Agency interns, developers, and leadership.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feat) => {
              const IconComponent = featureIconsMap[feat.icon] || Sparkles;
              return (
                <div
                  key={feat.id}
                  className="p-6 rounded-2xl bg-neutral-950/70 border border-neutral-800 hover:border-neutral-700 transition-all space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-crimson/15 border border-crimson/30 flex items-center justify-center text-bright-red group-hover:scale-110 transition-transform">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {feat.status}
                    </span>
                  </div>

                  <h3 className="text-base font-orbitron font-bold text-white">{feat.title}</h3>
                  <p className="text-xs text-neutral-400 font-sans leading-relaxed">{feat.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 5. WHAT'S NEW SECTION (RELEASE NOTES) ───────────────────────── */}
        {release?.releaseNotes && (
          <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800/80 p-6 sm:p-8 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <span className="text-xs font-mono text-crimson uppercase tracking-widest font-bold block">
                  Authoritative Changelog
                </span>
                <h2 className="text-xl sm:text-2xl font-orbitron font-bold uppercase tracking-wide text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-bright-red" /> What&apos;s New in v{release.versionName}
                </h2>
              </div>
              <span className="text-xs font-mono text-neutral-500">
                Published {new Date(release.publishedAt).toLocaleDateString()}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 font-mono text-xs text-neutral-300 whitespace-pre-line leading-relaxed">
              {release.releaseNotes}
            </div>
          </div>
        )}

        {/* ── 6. TECHNICAL APP INFORMATION SPECIFICATION ───────────────────── */}
        <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800/80 p-6 sm:p-8 backdrop-blur-xl space-y-6">
          <div className="border-b border-neutral-800 pb-4">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest block font-bold">
              Verification Ledger
            </span>
            <h2 className="text-xl sm:text-2xl font-orbitron font-bold uppercase tracking-wide text-white">
              Application Specifications
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800">
              <span className="text-neutral-400">Application Name</span>
              <span className="text-white font-bold">{app?.name || "CodeXa Mobile"}</span>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800">
              <span className="text-neutral-400">Package Identifier</span>
              <span className="text-white font-bold">{app?.packageName || "com.codexa.app"}</span>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800">
              <span className="text-neutral-400">Latest Release</span>
              <span className="text-white font-bold">
                v{release?.versionName || "1.0.0"} (Build {release?.versionCode || 1})
              </span>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800">
              <span className="text-neutral-400">APK Binary Size</span>
              <span className="text-white font-bold">{formatFileSize(release?.apkFileSize)}</span>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800">
              <span className="text-neutral-400">Target Operating System</span>
              <span className="text-emerald-400 font-bold">{app?.compatibility || "Android 8.0+ (API 26)"}</span>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800">
              <span className="text-neutral-400">Official Download Source</span>
              <span className="text-white font-bold">codxa-agency.online</span>
            </div>
          </div>

          {/* SHA-256 Hash Display */}
          {release?.apkSha256 && (
            <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-bold">SHA-256 Cryptographic Checksum</span>
                <span className="text-neutral-300 break-all">{release.apkSha256}</span>
              </div>
              <button
                onClick={() => copyHash(release.apkSha256)}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white shrink-0 flex items-center gap-1.5 self-start sm:self-center transition-colors"
              >
                {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedHash ? "Copied" : "Copy Hash"}</span>
              </button>
            </div>
          )}
        </div>

        {/* ── 7. INSTALLATION INSTRUCTIONS & TROUBLESHOOTING ─────────────────── */}
        <div className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-mono text-crimson uppercase tracking-widest font-bold">
              Getting Started
            </span>
            <h2 className="text-2xl sm:text-4xl font-orbitron font-bold uppercase tracking-wide text-white">
              How to Install CodeXa Mobile
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-mono">
              Simple 4-step installation for standard Android devices.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {installSteps.map((step) => (
              <div
                key={step.stepNumber}
                className="p-6 rounded-2xl bg-neutral-950/70 border border-neutral-800 space-y-3 relative flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-8 h-8 rounded-full bg-crimson text-white font-orbitron font-bold text-sm flex items-center justify-center">
                    {step.stepNumber}
                  </div>
                  <h3 className="text-sm font-orbitron font-bold text-white">{step.title}</h3>
                  <p className="text-xs text-neutral-400 font-sans leading-relaxed">{step.description}</p>
                </div>
                {step.tip && (
                  <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80 text-[11px] font-mono text-neutral-400">
                    <span className="text-amber-400 font-bold block mb-0.5">Tip:</span> {step.tip}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* FAQ & Troubleshooting Accordion */}
          <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800/80 p-6 sm:p-8 backdrop-blur-xl space-y-4">
            <div className="border-b border-neutral-800 pb-3">
              <h3 className="text-lg font-orbitron font-bold text-white uppercase flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-crimson" /> Support & Frequently Asked Questions
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {faq.map((item, index) => (
                <div
                  key={index}
                  className="p-5 rounded-2xl bg-neutral-950/70 border border-neutral-800 space-y-2"
                >
                  <h4 className="text-xs font-orbitron font-bold text-white flex items-start gap-2">
                    <span className="text-crimson font-mono">Q:</span> {item.q}
                  </h4>
                  <p className="text-xs text-neutral-400 font-sans leading-relaxed pl-5">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-neutral-400">
              <div>
                Need additional assistance? Email:{" "}
                <a href={`mailto:${app?.supportEmail || "contact@codxa-agency.online"}`} className="text-white hover:text-crimson font-bold">
                  {app?.supportEmail || "contact@codxa-agency.online"}
                </a>
              </div>
              <Link href="/payment-policy" className="hover:text-white transition-colors">
                Payment & Support Policy &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* ── 8. BOTTOM DOWNLOAD CTA BANNER ─────────────────────────────────── */}
        <div className="rounded-3xl bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border border-neutral-800 p-8 sm:p-12 text-center space-y-6 relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-4xl font-orbitron font-black uppercase text-white tracking-wide">
              Empower Your Agency Workflow Today
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-mono">
              Download the official CodeXa Mobile Android application exclusively from our website.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={release?.apkDownloadUrl || `/api/mobile/app-update/download`}
              download="CodeXa.apk"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-crimson hover:bg-bright-red text-white font-mono text-sm font-bold tracking-wider uppercase transition-all shadow-xl shadow-crimson/30 flex items-center justify-center gap-3"
            >
              <Download className="w-5 h-5" />
              <span>Download Official APK (v{release?.versionName || "1.0.0"})</span>
            </a>
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white font-mono text-sm font-bold transition-all text-center"
            >
              Visit Agency Website
            </Link>
          </div>
        </div>
      </div>

      {/* ── SCREENSHOT FULLSCREEN PREVIEW MODAL ────────────────────────────── */}
      {selectedScreenshotIndex !== null && filteredScreenshots[selectedScreenshotIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedScreenshotIndex(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[92vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar with Title & Close Button */}
            <div className="w-full flex items-center justify-between p-4 bg-neutral-900/80 backdrop-blur-md rounded-t-2xl border-t border-x border-neutral-800 text-white">
              <div>
                <span className="text-[10px] font-mono text-crimson font-bold uppercase block">
                  {filteredScreenshots[selectedScreenshotIndex].featureCategory}
                </span>
                <h3 className="text-sm font-orbitron font-bold">
                  {filteredScreenshots[selectedScreenshotIndex].title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedScreenshotIndex(null)}
                aria-label="Close modal"
                className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Image Container */}
            <div className="relative w-full max-h-[70vh] bg-black flex items-center justify-center overflow-hidden border-x border-neutral-800">
              <img
                src={filteredScreenshots[selectedScreenshotIndex].url}
                alt={filteredScreenshots[selectedScreenshotIndex].altText || "Screenshot Preview"}
                className="max-h-[70vh] max-w-full object-contain"
              />

              {/* Prev / Next Modal Arrows */}
              {selectedScreenshotIndex > 0 && (
                <button
                  onClick={() => setSelectedScreenshotIndex(selectedScreenshotIndex - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/70 hover:bg-black text-white border border-neutral-700 transition-colors"
                  aria-label="Previous screenshot"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              {selectedScreenshotIndex < filteredScreenshots.length - 1 && (
                <button
                  onClick={() => setSelectedScreenshotIndex(selectedScreenshotIndex + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/70 hover:bg-black text-white border border-neutral-700 transition-colors"
                  aria-label="Next screenshot"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Bottom Caption Bar */}
            {filteredScreenshots[selectedScreenshotIndex].caption && (
              <div className="w-full p-4 bg-neutral-900/80 backdrop-blur-md rounded-b-2xl border-b border-x border-neutral-800 text-center text-xs font-sans text-neutral-300">
                {filteredScreenshots[selectedScreenshotIndex].caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
