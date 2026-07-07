"use client";

import React, { useState, useEffect, useCallback } from "react";
import Cropper from "react-easy-crop";
import { X, ZoomIn, RotateCw } from "lucide-react";
import { cropStaticProfileImage } from "@/lib/media/cropStaticProfileImage";

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ProfileCropModalProps {
  file: File;
  onClose: () => void;
  onCropComplete: (result: {
    blob: Blob | File;
    cropData?: {
      x: number;
      y: number;
      w: number;
      h: number;
      zoom: number;
      rotation: number;
    };
  }) => void;
}

export function ProfileCropModal({ file, onClose, onCropComplete }: ProfileCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string>("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [croppedAreaPercent, setCroppedAreaPercent] = useState<CropArea | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isMediaLoaded, setIsMediaLoaded] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);

  const isGif = file.type === "image/gif";

  // Safe client mounting and object URL lifecycle
  useEffect(() => {
    setIsMounted(true);
    let objectUrl = "";

    try {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        console.error("[crop] CROP_FILE_INVALID");
        setCropError("Choose a JPG, PNG, WEBP, or GIF image.");
        return;
      }

      // Create preview Object URL
      objectUrl = URL.createObjectURL(file);
      setImageSrc(objectUrl);
    } catch (e) {
      console.error("[crop] CROP_IMAGE_DECODE_FAILED", e);
      setCropError("This image could not be read. Please choose another file.");
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [file]);

  const onCropChange = (c: { x: number; y: number }) => setCrop(c);
  const onZoomChange = (z: number) => setZoom(z);
  const onRotationChange = (r: number) => setRotation(r);

  const onCropCompleteCallback = useCallback((croppedArea: CropArea, croppedPixels: CropArea) => {
    setCroppedAreaPercent(croppedArea);
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
    setCroppedAreaPercent(null);
  };

  const handleSave = async () => {
    if (isProcessing) return;
    setCropError(null);

    if (!isMediaLoaded || !croppedAreaPixels) {
      console.error("[crop] CROP_AREA_MISSING");
      setCropError("Preparing your image. Please wait a moment.");
      return;
    }

    setIsProcessing(true);

    try {
      if (isGif) {
        // Enforce GIF size limits
        const maxGifLimit = 15 * 1024 * 1024;
        if (file.size > maxGifLimit) {
          console.error("[crop] CROP_MEMORY_LIMIT");
          setCropError("Animated GIF profile images must be 15 MB or smaller.");
          setIsProcessing(false);
          return;
        }

        if (!croppedAreaPercent) {
          throw new Error("CROP_GIF_METADATA_FAILED");
        }

        onCropComplete({
          blob: file,
          cropData: {
            x: croppedAreaPercent.x,
            y: croppedAreaPercent.y,
            w: croppedAreaPercent.width,
            h: croppedAreaPercent.height,
            zoom,
            rotation: 0, // GIF rotation disabled
          },
        });
      } else {
        // Enforce static image size limits
        const maxImgLimit = 10 * 1024 * 1024;
        if (file.size > maxImgLimit) {
          console.error("[crop] CROP_MEMORY_LIMIT");
          setCropError("Profile images must be 10 MB or smaller.");
          setIsProcessing(false);
          return;
        }

        // Crops and returns a 1024x1024 File
        const croppedFile = await cropStaticProfileImage(file, croppedAreaPixels, rotation);
        onCropComplete({ blob: croppedFile });
      }
      onClose();
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("CROP_IMAGE_DECODE_FAILED")) {
        setCropError("This image could not be read. Please choose another file.");
      } else if (msg.includes("CROP_GIF_METADATA_FAILED")) {
        setCropError("This GIF could not be prepared. Try another animated GIF.");
      } else if (
        msg.includes("CROP_CANVAS_CONTEXT_FAILED") ||
        msg.includes("CROP_CANVAS_TOBLOB_FAILED") ||
        msg.includes("CROP_OUTPUT_FILE_FAILED")
      ) {
        setCropError("We could not prepare this image. Please try again or choose another image.");
      } else {
        console.error("[crop] CROP_UNKNOWN_ERROR", e);
        setCropError("We could not prepare this image. Please try again or choose another image.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMediaLoaded = () => {
    setIsMediaLoaded(true);
  };

  const handleMediaError = () => {
    console.error("[crop] CROP_IMAGE_DECODE_FAILED");
    setCropError("This image could not be read. Please choose another file.");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-[#080808] border border-[rgba(217,4,41,0.3)] rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col shadow-[0_0_50px_rgba(217,4,41,0.2)]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#111] flex justify-between items-center bg-[#0C0C0C]">
          <h3 className="font-orbitron font-bold text-sm text-white uppercase tracking-wider">
            {isGif ? "Adjust Animated GIF Position" : "Crop Profile Image (1:1)"}
          </h3>
          <button onClick={onClose} className="text-[#A5A5A5] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live crop error display */}
        {cropError && (
          <div className="px-6 py-3 bg-[rgba(217,4,41,0.1)] border-b border-[rgba(217,4,41,0.2)] text-xs text-[#D90429] font-orbitron tracking-wide flex items-center gap-2">
            <span>⚠️</span>
            <span>{cropError}</span>
          </div>
        )}

        {/* Cropper area */}
        <div className="relative w-full h-[280px] md:h-[320px] bg-[#050505]">
          {isMounted && imageSrc && !cropError && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={isGif ? 0 : rotation}
              aspect={1}
              cropShape="rect"
              showGrid={true}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onRotationChange={onRotationChange}
              onCropComplete={onCropCompleteCallback}
              onMediaLoaded={handleMediaLoaded}
              mediaProps={{
                onError: handleMediaError
              }}
              classes={{
                containerClassName: "bg-[#050505]",
                mediaClassName: "max-h-full",
                cropAreaClassName: "border-2 border-[#D90429] shadow-[0_0_0_9999px_rgba(0,0,0,0.85)]",
              }}
            />
          )}
        </div>

        {/* Controls */}
        <div className="p-6 bg-[#0A0A0A] border-t border-[#111] space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Zoom Control */}
            <div className="flex items-center gap-3 w-full sm:w-1/2">
              <ZoomIn className="w-4 h-4 text-crimson" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#1A1A1A] rounded-lg appearance-none cursor-pointer accent-[#D90429]"
              />
              <span className="text-[10px] font-mono text-[#A5A5A5] w-8 text-right">
                {zoom.toFixed(1)}x
              </span>
            </div>

            {/* Rotation Control */}
            <div className="flex items-center gap-3 w-full sm:w-1/2 justify-end">
              <RotateCw className="w-4 h-4 text-crimson" />
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={isGif ? 0 : rotation}
                disabled={isGif}
                onChange={(e) => setRotation(parseInt(e.target.value))}
                className="w-full h-1 bg-[#1A1A1A] rounded-lg appearance-none cursor-pointer accent-[#D90429] disabled:opacity-30 disabled:cursor-not-allowed"
              />
              <span className="text-[10px] font-mono text-[#A5A5A5] w-10 text-right">
                {isGif ? 0 : rotation}°
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={handleReset}
              className="text-[10px] font-orbitron tracking-widest text-[#A5A5A5] hover:text-white uppercase transition-colors"
            >
              Reset
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded bg-[#111] hover:bg-[#222] text-[10px] font-orbitron tracking-widest text-white uppercase transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isProcessing || !isMediaLoaded || !croppedAreaPixels || !!cropError}
                className="px-6 py-2 rounded bg-gradient-to-r from-[#D90429] to-[#FF6B35] text-[10px] font-orbitron tracking-widest text-white uppercase font-bold transition-all shadow-[0_4px_15px_rgba(217,4,41,0.3)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? "Processing..." : isGif ? "Save & Apply GIF" : "Crop & Save Image"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
