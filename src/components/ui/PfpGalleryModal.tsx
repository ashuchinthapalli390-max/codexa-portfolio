/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Search, ImageOff, ChevronRight } from "lucide-react";

interface PfpGalleryModalProps {
  /** Whether this user is an ADMIN (blocked from saving) */
  isAdmin?: boolean;
  onClose: () => void;
  onSelect: (pfpPath: string) => void;
}

export function PfpGalleryModal({ isAdmin, onClose, onSelect }: PfpGalleryModalProps) {
  const [images, setImages] = useState<string[]>([]);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  // Load image list from server
  useEffect(() => {
    setIsLoading(true);
    fetch("/api/pfp-library")
      .then((r) => r.json())
      .then((data) => {
        const imgs: string[] = data.images ?? [];
        setImages(imgs);
        setFiltered(imgs);
        setIsLoading(false);
      })
      .catch(() => {
        setLoadError(true);
        setIsLoading(false);
      });
  }, []);

  // Filter on search
  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      setFiltered(images);
    } else {
      setFiltered(images.filter((img) => img.toLowerCase().includes(q)));
    }
  }, [search, images]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleImageError = useCallback((path: string) => {
    setBrokenImages((prev) => new Set(prev).add(path));
  }, []);

  const handleSelectAndProceed = () => {
    if (!selected || isAdmin) return;
    onSelect(selected);
  };

  const isGif = (path: string) => path.toLowerCase().endsWith(".gif");

  const getFilename = (path: string) => {
    const parts = path.split("/");
    const name = parts[parts.length - 1];
    // Strip extension and hash-like names
    const withoutExt = name.replace(/\.[^.]+$/, "");
    // If name looks like a hex hash (32 chars), show shortened
    if (/^[0-9a-f]{32}$/i.test(withoutExt)) {
      return withoutExt.slice(0, 8) + "…";
    }
    return withoutExt.replace(/[-_]/g, " ");
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      aria-modal="true"
      role="dialog"
      aria-label="Select Profile Image"
    >
      {/* Modal container */}
      <div
        className="relative w-full flex flex-col bg-[#080808] rounded-2xl overflow-hidden"
        style={{
          maxWidth: "800px",
          maxHeight: "90dvh",
          border: "1px solid rgba(217,4,41,0.45)",
          boxShadow:
            "0 0 0 1px rgba(217,4,41,0.1), 0 0 40px rgba(217,4,41,0.3), 0 40px 80px rgba(0,0,0,0.8)",
        }}
      >
        {/* Neon top accent */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(217,4,41,0.8), rgba(255,107,53,0.6), rgba(217,4,41,0.8), transparent)",
          }}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(217,4,41,0.15)] bg-[#0C0C0C] flex-shrink-0">
          <div>
            <h2 className="font-orbitron font-bold text-sm text-white uppercase tracking-wider">
              Select Profile Image
            </h2>
            <p className="text-[10px] text-[#A5A5A5] font-mono mt-0.5 tracking-wide">
              CODEXA PFP LIBRARY · {images.length} IMAGES
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#555] hover:text-white transition-colors p-1.5 rounded-lg hover:bg-[#1A1A1A]"
            aria-label="Close gallery"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-6 py-3 border-b border-[#111] bg-[#0A0A0A] flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search images…"
              className="w-full bg-[#111] border border-[rgba(217,4,41,0.15)] rounded-lg pl-9 pr-4 py-2.5 text-[#F7F7F7] text-xs outline-none transition-all focus:border-[rgba(217,4,41,0.45)] placeholder:text-[#333] font-mono"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Grid area */}
        <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(217,4,41,0.3) transparent" }}>
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <svg className="w-8 h-8 animate-spin text-[#D90429]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
              </svg>
              <p className="text-xs font-orbitron text-[#444] tracking-widest uppercase">Loading PFP Library…</p>
            </div>
          )}

          {!isLoading && (loadError || images.length === 0) && (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <ImageOff className="w-12 h-12 text-[#222]" />
              <p className="text-sm font-orbitron text-[#444] tracking-wide text-center">
                No profile images found in the PFP library.
              </p>
              <p className="text-[10px] text-[#333] font-mono">
                Place images in public/assets/pfp/
              </p>
            </div>
          )}

          {!isLoading && !loadError && filtered.length === 0 && images.length > 0 && (
            <div className="flex flex-col items-center justify-center h-32 gap-3">
              <p className="text-xs font-orbitron text-[#444] tracking-wide">
                No results for &ldquo;{search}&rdquo;
              </p>
            </div>
          )}

          {!isLoading && !loadError && filtered.length > 0 && (
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
              }}
            >
              {filtered.map((imgPath) => {
                const isSelected = selected === imgPath;
                const isBroken = brokenImages.has(imgPath);
                const gif = isGif(imgPath);

                return (
                  <button
                    key={imgPath}
                    type="button"
                    onClick={() => setSelected(isSelected ? null : imgPath)}
                    disabled={!!isAdmin}
                    className="relative flex flex-col items-center gap-2 rounded-xl p-1.5 transition-all duration-200 group disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: isSelected
                        ? "rgba(217,4,41,0.12)"
                        : "rgba(255,255,255,0.02)",
                      border: isSelected
                        ? "1px solid rgba(217,4,41,0.7)"
                        : "1px solid rgba(255,255,255,0.04)",
                      boxShadow: isSelected
                        ? "0 0 16px rgba(217,4,41,0.35), inset 0 0 8px rgba(217,4,41,0.08)"
                        : "none",
                    }}
                    aria-pressed={isSelected}
                    aria-label={`Select ${getFilename(imgPath)}`}
                  >
                    {/* Image frame */}
                    <div
                      className="w-full rounded-lg overflow-hidden bg-[#111] flex items-center justify-center"
                      style={{ aspectRatio: "1/1" }}
                    >
                      {isBroken ? (
                        <ImageOff className="w-6 h-6 text-[#222]" />
                      ) : (
                        <img
                          src={imgPath}
                          alt={getFilename(imgPath)}
                          onError={() => handleImageError(imgPath)}
                          className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                          style={{
                            aspectRatio: "1/1",
                            filter: isSelected ? "none" : "saturate(0.8)",
                          }}
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className="text-[9px] font-mono tracking-wider uppercase truncate w-full text-center"
                      style={{ color: isSelected ? "#D90429" : "#444" }}
                    >
                      {gif ? "🎞 " : ""}{getFilename(imgPath)}
                    </span>

                    {/* Selected check badge */}
                    {isSelected && (
                      <div
                        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{
                          background: "#D90429",
                          boxShadow: "0 0 8px rgba(217,4,41,0.8)",
                        }}
                      >
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer — preview strip + action */}
        <div
          className="flex-shrink-0 border-t border-[rgba(217,4,41,0.15)] bg-[#0C0C0C] px-6 py-4 flex items-center justify-between gap-4"
        >
          {/* Selected preview */}
          <div className="flex items-center gap-3">
            {selected ? (
              <>
                <div
                  className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-[rgba(217,4,41,0.4)]"
                  style={{ aspectRatio: "1/1" }}
                >
                  <img
                    src={selected}
                    alt="Selected"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-orbitron text-white tracking-wide truncate max-w-[180px]">
                    {getFilename(selected)}
                  </p>
                  <p className="text-[9px] text-[#444] font-mono mt-0.5">
                    {isGif(selected) ? "Animated GIF" : "Static Image"}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-[10px] text-[#444] font-mono">No image selected</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#111] hover:bg-[#1A1A1A] text-[#A5A5A5] hover:text-white font-orbitron text-[10px] tracking-wider uppercase transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSelectAndProceed}
              disabled={!selected || !!isAdmin}
              className="flex items-center gap-2 px-5 py-2 rounded-lg font-orbitron text-[10px] tracking-wider uppercase font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: selected && !isAdmin
                  ? "linear-gradient(90deg, #D90429, #FF6B35)"
                  : "rgba(217,4,41,0.1)",
                color: selected && !isAdmin ? "#fff" : "#555",
                boxShadow: selected && !isAdmin
                  ? "0 4px 15px rgba(217,4,41,0.35)"
                  : "none",
              }}
            >
              Select Image <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
