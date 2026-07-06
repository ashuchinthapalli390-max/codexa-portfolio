"use client";

import React, { useState, useEffect, useRef } from "react";
import { Upload } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface MediaAssetProps {
  type: "image" | "video";
  src: string; // Static image source or image fallback source
  videoSources?: string[]; // Array of video sources (e.g. webm first, then mp4)
  poster?: string; // Poster for loading state and video fallback
  alt?: string;
  mobileSrc?: string; // Option for a lighter/mobile-optimized static image or source
  fallbackLabel: string;
  overlay?: boolean; // Red digital-web lines and border overlay
  glow?: boolean; // Subtle glowing halo behind
  className?: string;
  priority?: boolean; // Loading priority ('eager' vs 'lazy')
  reducedMotionImage?: string; // Custom static image for users who prefer reduced motion
  aspectRatio?: "video" | "square" | "portrait" | "wide" | "auto";
  objectFit?: "cover" | "contain";
}

export function MediaAsset({
  type,
  src,
  videoSources = [],
  poster,
  alt = "CodeXa Asset",
  mobileSrc,
  fallbackLabel,
  overlay = false,
  glow = false,
  className = "",
  priority = false,
  reducedMotionImage,
  aspectRatio = "auto",
  objectFit = "contain",
}: MediaAssetProps) {
  const isReduced = useReducedMotion();
  const [error, setError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Monitor viewport size for mobile-specific assets
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024); // md/lg threshold
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Reset loading and error states when src or type changes
  useEffect(() => {
    setError(false);
    setVideoError(false);
    setLoading(true);
  }, [src, type]);

  // Attempt to play the video loop
  useEffect(() => {
    if (type === "video" && videoRef.current && !videoError && !isReduced) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // System/browser autoplay blocking is expected in some browsers, 
          // we don't treat it as a hard crash, but rather let it pause or show poster.
          console.warn("Autoplay was blocked or interrupted:", err);
        });
      }
    }
  }, [type, videoSources, videoError, isReduced]);

  const handleMediaLoaded = () => {
    setLoading(false);
  };

  const handleMediaError = () => {
    setError(true);
    setLoading(false);
  };

  const handleVideoLoadError = () => {
    // Falls back to showing the static fallback image (src)
    setVideoError(true);
  };

  // Maps aspectRatio props to Tailwind classes
  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case "video":
        return "aspect-video";
      case "square":
        return "aspect-square";
      case "portrait":
        return "aspect-[3/4]";
      case "wide":
        return "aspect-[21/9]";
      case "auto":
      default:
        return "";
    }
  };

  // Determine standard static image to load
  const currentImageSrc = isMobile && mobileSrc ? mobileSrc : src;

  // Render visual missing asset placeholder block
  if (error || (!src && type === "image")) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center bg-gradient-to-br from-card to-[#121212] border border-dashed border-crimson/40 rounded-lg p-6 text-center transition-all duration-300 min-h-[240px] w-full ${className}`}
      >
        <div className="absolute inset-0 bg-cyber-grid opacity-10 pointer-events-none rounded-lg" />
        <div className="absolute top-2 left-2 text-[10px] text-crimson font-orbitron tracking-widest opacity-60">
          SYS.MEDIA_MISSING
        </div>

        <div className="flex flex-col items-center gap-3 relative z-10">
          <div className="p-3 rounded-full bg-deep-red/30 border border-crimson/30">
            <Upload className="w-7 h-7 text-bright-red animate-pulse" />
          </div>
          <span className="text-white font-orbitron text-xs font-semibold uppercase tracking-wider">
            {fallbackLabel}
          </span>
          <span className="text-[10px] text-secondary-text max-w-[220px] leading-tight">
            Please place the licensed asset file at this path to render.
          </span>
          <span className="text-[9px] font-mono text-crimson/80 bg-deep-red/25 px-2 py-0.5 rounded border border-crimson/20 break-all max-w-[280px]">
            {type === "video" && videoSources.length > 0 ? videoSources[0] : currentImageSrc}
          </span>
        </div>
      </div>
    );
  }

  // Handle prefers-reduced-motion fallback
  const shouldRenderFallbackImage = isReduced || videoError;

  return (
    <div className={`relative overflow-hidden rounded-lg ${getAspectRatioClass()} ${className}`}>
      {/* Glow Halo behind */}
      {glow && (
        <div className="absolute -inset-6 bg-crimson/15 rounded-full blur-[50px] pointer-events-none -z-10 animate-pulse-slow" />
      )}

      {/* Cyber Grid background reflex */}
      <div className="absolute inset-0 bg-cyber-grid opacity-[0.04] pointer-events-none" />

      {/* Spinner for loading state */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/20 backdrop-blur-xs z-20">
          <div className="w-8 h-8 border-2 border-crimson border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Render Video or Image */}
      {type === "video" && !shouldRenderFallbackImage ? (
        <video
          ref={videoRef}
          playsInline
          muted
          loop
          autoPlay
          poster={poster}
          onLoadedData={handleMediaLoaded}
          onError={handleVideoLoadError}
          className={`w-full h-full ${
            objectFit === "cover" ? "object-cover" : "object-contain"
          } transition-all duration-500`}
        >
          {videoSources.map((source, index) => {
            const ext = source.split(".").pop() || "mp4";
            const mime = `video/${ext}`;
            return <source key={index} src={source} type={mime} onError={handleVideoLoadError} />;
          })}
          {/* Internal video fallback image tag */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentImageSrc}
            alt={alt}
            onLoad={handleMediaLoaded}
            onError={handleMediaError}
            className={`w-full h-full ${
              objectFit === "cover" ? "object-cover" : "object-contain"
            }`}
          />
        </video>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={isReduced && reducedMotionImage ? reducedMotionImage : currentImageSrc}
          alt={alt}
          onLoad={handleMediaLoaded}
          onError={handleMediaError}
          loading={priority ? "eager" : "lazy"}
          className={`w-full h-full ${
            objectFit === "cover" ? "object-cover" : "object-contain"
          } transition-all duration-500`}
        />
      )}

      {/* Digital Web Line Overlays */}
      {overlay && (
        <div className="absolute inset-0 pointer-events-none z-10 rounded-lg border border-bright-red/20 overflow-hidden">
          {/* Top/Bottom glowing border line decorations */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-bright-red/40 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-bright-red/40 to-transparent" />
          
          {/* Corner web connection nodes */}
          <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t border-l border-bright-red/40" />
          <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t border-r border-bright-red/40" />
          <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b border-l border-bright-red/40" />
          <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b border-r border-bright-red/40" />

          {/* Web connections SVG vector drawing overlays */}
          <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <line x1="12%" y1="12%" x2="88%" y2="88%" stroke="#FF1E3C" strokeWidth="0.6" strokeDasharray="3 4" />
            <line x1="88%" y1="12%" x2="12%" y2="88%" stroke="#FF1E3C" strokeWidth="0.6" strokeDasharray="3 4" />
            <circle cx="50%" cy="50%" r="4.5" fill="#FF1E3C" className="animate-pulse" />
            <circle cx="12%" cy="12%" r="2.5" fill="#FF1E3C" />
            <circle cx="88%" cy="88%" r="2.5" fill="#FF1E3C" />
          </svg>
        </div>
      )}
    </div>
  );
}
