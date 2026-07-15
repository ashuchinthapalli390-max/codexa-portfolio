/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, ZoomIn, RotateCcw } from "lucide-react";

interface PfpCropModalProps {
  /** The selected PFP path, e.g. /assets/pfp/alpha.jpg */
  pfpPath: string;
  /** Profile ID to update in DB */
  targetProfileId: string;
  onClose: () => void;
  onSuccess: (updatedProfile: any) => void;
}

interface DragState {
  dragging: boolean;
  startX: number;
  startY: number;
  startObjX: number;
  startObjY: number;
}

const DEFAULT_ZOOM = 1;
const DEFAULT_OBJ_X = 50;
const DEFAULT_OBJ_Y = 50;

export function PfpCropModal({
  pfpPath,
  targetProfileId,
  onClose,
  onSuccess,
}: PfpCropModalProps) {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [objX, setObjX] = useState(DEFAULT_OBJ_X); // 0–100 %
  const [objY, setObjY] = useState(DEFAULT_OBJ_Y); // 0–100 %
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState>({
    dragging: false,
    startX: 0,
    startY: 0,
    startObjX: DEFAULT_OBJ_X,
    startObjY: DEFAULT_OBJ_Y,
  });

  const isGif = pfpPath.toLowerCase().endsWith(".gif");

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, isSaving]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ── Drag / Pan ─────────────────────────────────────────────
  const startDrag = useCallback((clientX: number, clientY: number) => {
    dragRef.current = {
      dragging: true,
      startX: clientX,
      startY: clientY,
      startObjX: objX,
      startObjY: objY,
    };
  }, [objX, objY]);

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (!dragRef.current.dragging || !frameRef.current) return;
    const frame = frameRef.current;
    const rect = frame.getBoundingClientRect();
    const dx = ((dragRef.current.startX - clientX) / rect.width) * 100 * zoom;
    const dy = ((dragRef.current.startY - clientY) / rect.height) * 100 * zoom;
    setObjX(Math.max(0, Math.min(100, dragRef.current.startObjX + dx)));
    setObjY(Math.max(0, Math.min(100, dragRef.current.startObjY + dy)));
  }, [zoom]);

  const endDrag = useCallback(() => {
    dragRef.current.dragging = false;
  }, []);

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => moveDrag(e.clientX, e.clientY);
    const onMouseUp = () => endDrag();
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [moveDrag, endDrag]);

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => endDrag();
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [moveDrag, endDrag]);

  // ── Reset ──────────────────────────────────────────────────
  const handleReset = () => {
    setZoom(DEFAULT_ZOOM);
    setObjX(DEFAULT_OBJ_X);
    setObjY(DEFAULT_OBJ_Y);
    setSaveError(null);
  };

  // ── Save ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await fetch("/api/profile-media/pfp-select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetProfileId,
          pfpPath,
          cropX: Math.round(objX * 100) / 100,
          cropY: Math.round(objY * 100) / 100,
          cropW: 100,
          cropH: 100,
          cropZoom: Math.round(zoom * 100) / 100,
          objectPosition: `${Math.round(objX)}% ${Math.round(objY)}%`,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setSaveError(data.error ?? "Failed to save profile image.");
        setIsSaving(false);
        return;
      }

      setSaveSuccess(true);
      setTimeout(() => {
        onSuccess(data.profile);
      }, 700);
    } catch {
      setSaveError("Network error. Please try again.");
      setIsSaving(false);
    }
  };

  const objectPosition = `${Math.round(objX)}% ${Math.round(objY)}%`;

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/97 backdrop-blur-md p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}
      aria-modal="true"
      role="dialog"
      aria-label="Position Profile Image"
    >
      <div
        className="w-full flex flex-col bg-[#080808] rounded-2xl overflow-hidden"
        style={{
          maxWidth: "520px",
          maxHeight: "90dvh",
          border: "1px solid rgba(217,4,41,0.45)",
          boxShadow:
            "0 0 0 1px rgba(217,4,41,0.1), 0 0 40px rgba(217,4,41,0.3), 0 40px 80px rgba(0,0,0,0.9)",
        }}
      >
        {/* Neon top line */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(217,4,41,0.8), rgba(255,107,53,0.6), rgba(217,4,41,0.8), transparent)",
          }}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(217,4,41,0.15)] bg-[#0C0C0C] flex-shrink-0">
          <div>
            <h3 className="font-orbitron font-bold text-sm text-white uppercase tracking-wider">
              {isGif ? "Position Animated GIF (1:1)" : "Position Profile Image (1:1)"}
            </h3>
            <p className="text-[10px] text-[#A5A5A5] font-mono mt-0.5">
              Drag to reposition · Zoom slider to adjust scale
            </p>
          </div>
          {!isSaving && (
            <button
              onClick={onClose}
              className="text-[#555] hover:text-white transition-colors p-1.5 rounded-lg hover:bg-[#1A1A1A]"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Error */}
        {saveError && (
          <div className="px-6 py-3 bg-[rgba(217,4,41,0.1)] border-b border-[rgba(217,4,41,0.25)] text-xs text-[#D90429] font-orbitron tracking-wide flex items-center gap-2 flex-shrink-0">
            <span>⚠️</span>
            <span>{saveError}</span>
          </div>
        )}

        {/* Success */}
        {saveSuccess && (
          <div className="px-6 py-3 bg-[rgba(78,205,196,0.08)] border-b border-[rgba(78,205,196,0.2)] text-xs text-[#4ECDC4] font-orbitron tracking-wide flex items-center gap-2 flex-shrink-0">
            <span>✅</span>
            <span>Profile image updated.</span>
          </div>
        )}

        {/* Preview / Drag area */}
        <div className="flex items-center justify-center bg-[#050505] p-6 flex-shrink-0">
          <div
            ref={frameRef}
            className="relative rounded-full overflow-hidden select-none"
            style={{
              width: "220px",
              height: "220px",
              border: "2px solid rgba(217,4,41,0.5)",
              boxShadow: "0 0 20px rgba(217,4,41,0.25), 0 0 0 1px rgba(217,4,41,0.1)",
              cursor: "grab",
              userSelect: "none",
            }}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
          >
            <img
              src={pfpPath}
              alt="Profile preview"
              draggable={false}
              style={{
                width: `${zoom * 100}%`,
                height: `${zoom * 100}%`,
                objectFit: "cover",
                objectPosition,
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                userSelect: "none",
                pointerEvents: "none",
                maxWidth: "none",
              }}
            />
            {/* Drag hint */}
            <div
              className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none"
              style={{ opacity: 0.4 }}
            >
              <span className="text-[8px] font-orbitron text-white tracking-widest uppercase bg-black/60 px-2 py-0.5 rounded">
                Drag to reposition
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 py-5 bg-[#0A0A0A] border-t border-[#111] space-y-5 flex-shrink-0">
          {/* Zoom slider */}
          <div className="flex items-center gap-3">
            <ZoomIn className="w-4 h-4 text-[#D90429] flex-shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-orbitron text-[#555] uppercase tracking-wider">Zoom</span>
                <span className="text-[10px] font-mono text-[#A5A5A5]">{zoom.toFixed(2)}×</span>
              </div>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                disabled={isSaving}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#D90429] disabled:opacity-40"
                style={{ background: `linear-gradient(to right, #D90429 0%, #D90429 ${((zoom - 1) / 2) * 100}%, #1A1A1A ${((zoom - 1) / 2) * 100}%, #1A1A1A 100%)` }}
                aria-label="Zoom level"
              />
            </div>
          </div>

          {/* Object position display */}
          <div className="flex items-center justify-between text-[10px] font-mono text-[#333]">
            <span>position: {Math.round(objX)}% {Math.round(objY)}%</span>
            <span>{isGif ? "🎞 GIF · Animation preserved" : "📷 Static image"}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-6 pb-5 pt-1 bg-[#0A0A0A] flex items-center justify-between flex-shrink-0">
          <button
            onClick={handleReset}
            disabled={isSaving}
            className="flex items-center gap-1.5 text-[10px] font-orbitron tracking-widest text-[#555] hover:text-[#A5A5A5] uppercase transition-colors disabled:opacity-30"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Position
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-lg bg-[#111] hover:bg-[#1A1A1A] text-[10px] font-orbitron tracking-widest text-[#A5A5A5] hover:text-white uppercase transition-colors disabled:opacity-30"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || saveSuccess}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-orbitron text-[10px] tracking-widest uppercase font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(90deg, #D90429, #FF6B35)",
                color: "#fff",
                boxShadow: "0 4px 15px rgba(217,4,41,0.35)",
              }}
            >
              {isSaving ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
                  </svg>
                  Saving…
                </>
              ) : saveSuccess ? (
                "✓ Saved"
              ) : (
                "Save Profile Image"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
