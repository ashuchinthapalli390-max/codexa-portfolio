"use client";

/**
 * ProfilePositionAdjuster.tsx
 *
 * Lightweight optional position adjuster for already-uploaded profile media.
 * Uses react-easy-crop for drag/zoom, but NEVER runs canvas.toBlob().
 * Saves only CSS position metadata: cropX, cropY, zoom.
 * Works for both static images and animated GIFs.
 */
import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { ZoomIn, RotateCcw } from "lucide-react";

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PositionMeta {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  cropZoom: number;
}

interface ProfilePositionAdjusterProps {
  /** The URL to preview (local objectURL or committed Blob URL) */
  mediaUrl: string;
  /** Current saved meta — used to initialise the adjuster */
  initialMeta?: Partial<PositionMeta>;
  /** Called when user confirms position save */
  onSave: (meta: PositionMeta) => Promise<void>;
  /** Called to dismiss the adjuster without saving */
  onCancel: () => void;
}

export function ProfilePositionAdjuster({
  mediaUrl,
  initialMeta,
  onSave,
  onCancel,
}: ProfilePositionAdjusterProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(initialMeta?.cropZoom ?? 1);
  const [croppedAreaPercent, setCroppedAreaPercent] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_: Area, percentArea: Area) => {
    setCroppedAreaPercent(percentArea);
  }, []);

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPercent(null);
    setError(null);
  };

  const handleSave = async () => {
    if (isSaving) return;
    setError(null);
    setIsSaving(true);

    try {
      const meta: PositionMeta = {
        cropX: croppedAreaPercent?.x ?? 0,
        cropY: croppedAreaPercent?.y ?? 0,
        cropW: croppedAreaPercent?.width ?? 100,
        cropH: croppedAreaPercent?.height ?? 100,
        cropZoom: zoom,
      };
      await onSave(meta);
    } catch (e: any) {
      setError(e?.message || "Could not save position. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-[rgba(217,4,41,0.2)] bg-[#0B0B0B] overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#111] bg-[#0C0C0C]">
        <span className="font-orbitron text-[10px] tracking-widest text-[#A5A5A5] uppercase">
          Adjust Position
        </span>
        <button
          onClick={onCancel}
          className="text-[10px] font-orbitron tracking-widest text-[#555] hover:text-white uppercase transition-colors"
        >
          Close
        </button>
      </div>

      {/* Crop area */}
      <div className="relative w-full h-52 bg-[#050505]">
        <Cropper
          image={mediaUrl}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="rect"
          showGrid={true}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          classes={{
            containerClassName: "bg-[#050505]",
            cropAreaClassName:
              "border-2 border-[#D90429] shadow-[0_0_0_9999px_rgba(0,0,0,0.85)]",
          }}
        />
      </div>

      {/* Controls */}
      <div className="px-4 py-4 space-y-3 bg-[#0A0A0A]">
        {/* Zoom */}
        <div className="flex items-center gap-3">
          <ZoomIn className="w-4 h-4 text-[#D90429] flex-shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full h-1 bg-[#1A1A1A] rounded-lg appearance-none cursor-pointer accent-[#D90429]"
          />
          <span className="text-[10px] font-mono text-[#A5A5A5] w-8 text-right">
            {zoom.toFixed(1)}x
          </span>
        </div>

        {/* Error */}
        {error && (
          <p className="text-[10px] text-[#D90429] font-orbitron tracking-wide">⚠ {error}</p>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-[10px] font-orbitron tracking-widest text-[#555] hover:text-white uppercase transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded bg-[#111] hover:bg-[#1A1A1A] text-[10px] font-orbitron tracking-widest text-white uppercase transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded bg-gradient-to-r from-[#D90429] to-[#FF6B35] text-[10px] font-orbitron tracking-widest text-white uppercase font-bold transition-all shadow-[0_4px_15px_rgba(217,4,41,0.3)] hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Save Position"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
