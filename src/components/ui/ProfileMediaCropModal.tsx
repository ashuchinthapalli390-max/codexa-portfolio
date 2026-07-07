"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Cropper from "react-easy-crop";
import { X, ZoomIn, RotateCw } from "lucide-react";
import { upload } from "@vercel/blob/client";
import { cropStaticProfileImage } from "@/lib/media/cropStaticProfileImage";
import { generateUploadRef } from "@/lib/upload";

interface CropAreaPercent {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropAreaPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ProfileMediaCropModalProps {
  file: File;
  targetProfileId?: string;
  onClose: () => void;
  onSuccess?: (updatedProfile: any) => void;
  onLocalCropComplete?: (result: {
    blob: Blob | File;
    cropData?: {
      cropX: number;
      cropY: number;
      cropW: number;
      cropH: number;
      cropZoom: number;
      cropRotation: number;
    };
  }) => void;
}

export function ProfileMediaCropModal({
  file,
  targetProfileId,
  onClose,
  onSuccess,
  onLocalCropComplete,
}: ProfileMediaCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string>("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const [croppedAreaPercent, setCroppedAreaPercent] = useState<CropAreaPercent | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropAreaPixels | null>(null);

  // Status/Upload states
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [cropError, setCropError] = useState<string | null>(null);
  const [errorRef, setErrorRef] = useState<string | null>(null);

  const [isMediaLoaded, setIsMediaLoaded] = useState(false);
  const [isMediaError, setIsMediaError] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const isGif = file.type === "image/gif";

  // Set up preview source and validate file
  useEffect(() => {
    let objectUrl = "";
    try {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        setCropError("Choose a JPG, PNG, WEBP, or GIF image.");
        return;
      }

      objectUrl = URL.createObjectURL(file);
      setImageSrc(objectUrl);
    } catch {
      setIsMediaError(true);
      setCropError(
        isGif
          ? "This GIF could not be opened. Please choose another file."
          : "This image could not be opened. Please choose another file."
      );
    }

    return () => {
      // Do not revoke too early; revoke when component unmounts
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [file, isGif]);

  const onCropChange = (c: { x: number; y: number }) => setCrop(c);
  const onZoomChange = (z: number) => setZoom(z);
  const onRotationChange = (r: number) => setRotation(r);

  const onCropCompleteCallback = useCallback(
    (percent: CropAreaPercent, pixels: CropAreaPixels) => {
      setCroppedAreaPercent(percent);
      setCroppedAreaPixels(pixels);
    },
    []
  );

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPercent(null);
    setCroppedAreaPixels(null);
  };

  const handleCancelUpload = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  };

  const handleSaveAndUpload = async () => {
    if (isSaving) return;
    setCropError(null);
    setErrorRef(null);

    if (!isMediaLoaded || !croppedAreaPixels || isMediaError) {
      setCropError("Preparing your image. Please wait a moment.");
      return;
    }

    setIsSaving(true);
    setSaveStatus("Preparing upload…");
    setUploadProgress(0);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let fileToUpload: File | Blob = file;
      let metaPayload: any = {
        cropX: 0,
        cropY: 0,
        cropW: 100,
        cropH: 100,
        cropZoom: 1,
        cropRotation: 0,
      };

      // 1. Process image/GIF crop coordinates
      if (isGif) {
        const maxGifLimit = 15 * 1024 * 1024;
        if (file.size > maxGifLimit) {
          setCropError("Animated GIF profile images must be 15 MB or smaller.");
          setIsSaving(false);
          return;
        }

        if (croppedAreaPercent) {
          metaPayload = {
            cropX: croppedAreaPercent.x,
            cropY: croppedAreaPercent.y,
            cropW: croppedAreaPercent.width,
            cropH: croppedAreaPercent.height,
            cropZoom: zoom,
            cropRotation: 0,
          };
        }
      } else {
        const maxImgLimit = 10 * 1024 * 1024;
        if (file.size > maxImgLimit) {
          setCropError("Profile images must be 10 MB or smaller.");
          setIsSaving(false);
          return;
        }

        try {
          // Crop static image into 1024x1024 Square
          fileToUpload = await cropStaticProfileImage(file, croppedAreaPixels, rotation);
        } catch (cropErr) {
          console.error("[crop] Crop processing failed:", cropErr);
          setCropError("We could not prepare this image. Try another image or adjust it again.");
          setIsSaving(false);
          return;
        }
      }

      // If we don't have targetProfileId, we are in Local Mode!
      if (!targetProfileId) {
        if (onLocalCropComplete) {
          onLocalCropComplete({
            blob: fileToUpload,
            cropData: metaPayload,
          });
        }
        setIsSaving(false);
        onClose();
        return;
      }

      // 2. Fetch upload signed nonce from server
      const initRes = await fetch(`/api/profile-media/upload?targetProfileId=${targetProfileId}`, {
        signal: controller.signal,
      });
      const initData = await initRes.json();
      if (!initRes.ok) {
        throw new Error(initData.ref ? `PM-${initData.ref}` : "Failed to obtain upload token.");
      }

      const { uploadNonce, targetProfileId: validatedProfileId } = initData;
      const ext = file.name.split(".").pop() || "bin";
      const uniqueName = `profiles/${validatedProfileId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      // 3. Upload directly to Vercel Blob via browser SDK
      setSaveStatus("Uploading profile media… 0%");
      const blobResult = await upload(uniqueName, fileToUpload, {
        access: "public",
        handleUploadUrl: "/api/profile-media/upload",
        clientPayload: JSON.stringify({
          targetProfileId: validatedProfileId,
          uploadNonce,
        }),
        abortSignal: controller.signal,
        onUploadProgress: ({ percentage }) => {
          setUploadProgress(Math.round(percentage));
          setSaveStatus(`Uploading profile media… ${Math.round(percentage)}%`);
        },
      });

      // 4. Commit to Aiven MySQL
      setSaveStatus("Saving profile changes…");
      const commitRes = await fetch("/api/profile-media/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          blobUrl: blobResult.url,
          contentType: file.type,
          targetProfileId: validatedProfileId,
          uploadNonce,
          ...metaPayload,
        }),
      });

      const commitData = await commitRes.json();
      if (!commitRes.ok || !commitData.success) {
        throw new Error(commitData.ref ? `PM-${commitData.ref}` : "Commit failed.");
      }

      // 5. Success
      setSaveStatus("Profile media updated.");
      onSuccess?.(commitData.profile);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setIsSaving(false);
        setSaveStatus("");
        return;
      }

      const ref = err?.message?.startsWith("PM-") ? err.message : generateUploadRef();
      setErrorRef(ref);
      setCropError("Profile media could not be saved. Your previous media is still active.");
      setIsSaving(false);
    }
  };

  const handleMediaLoaded = () => {
    setIsMediaLoaded(true);
    setIsMediaError(false);
  };

  const handleMediaError = () => {
    setIsMediaError(true);
    setCropError(
      isGif
        ? "This GIF could not be opened. Please choose another file."
        : "This image could not be opened. Please choose another file."
    );
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in animate-duration-150">
      <div className="bg-[#080808] border border-[rgba(217,4,41,0.35)] rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col shadow-[0_0_50px_rgba(217,4,41,0.25)] relative">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#111] flex justify-between items-center bg-[#0C0C0C]">
          <h3 className="font-orbitron font-bold text-sm text-white uppercase tracking-wider">
            {isGif ? "Adjust Animated GIF Position (1:1)" : "Crop Profile Image (1:1)"}
          </h3>
          {!isSaving && (
            <button onClick={onClose} className="text-[#A5A5A5] hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Error notification */}
        {cropError && (
          <div className="px-6 py-3 bg-[rgba(217,4,41,0.12)] border-b border-[rgba(217,4,41,0.25)] text-xs text-[#D90429] font-orbitron tracking-wide flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{cropError}</span>
            </div>
            {errorRef && (
              <span className="text-[10px] text-[#A5A5A5]/60 font-mono">Reference: {errorRef}</span>
            )}
          </div>
        )}

        {/* Loading placeholder text */}
        {!isMediaLoaded && !cropError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#080808]/90">
            <div className="text-center space-y-3">
              <svg className="w-8 h-8 animate-spin text-[#D90429] mx-auto" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
              </svg>
              <div className="font-orbitron text-xs text-[#A5A5A5] uppercase tracking-widest">
                Preparing image…
              </div>
            </div>
          </div>
        )}

        {/* Cropper canvas area */}
        <div className="relative w-full h-[300px] md:h-[360px] bg-[#050505] overflow-hidden">
          {imageSrc && !isMediaError && (
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
                onError: handleMediaError,
              }}
              classes={{
                containerClassName: "bg-[#050505]",
                mediaClassName: "max-h-full",
                cropAreaClassName: "border-2 border-[#D90429] shadow-[0_0_0_9999px_rgba(0,0,0,0.85)]",
              }}
            />
          )}
        </div>

        {/* Save/Upload Overlay */}
        {isSaving && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 px-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full border border-crimson/20 relative flex items-center justify-center bg-[#070707] shadow-neon">
              <svg className="w-8 h-8 animate-spin text-[#D90429]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
              </svg>
            </div>
            
            {/* Progress UI */}
            <div className="w-full max-w-xs space-y-2">
              <div className="h-1.5 rounded-full bg-[#111] overflow-hidden border border-[rgba(217,4,41,0.15)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#D90429] to-[#FF6B35] transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="font-orbitron text-xs text-[#F7F7F7] uppercase tracking-wider">{saveStatus}</div>
            </div>

            <button
              onClick={handleCancelUpload}
              className="px-4 py-1.5 rounded border border-[rgba(217,4,41,0.2)] text-[10px] font-orbitron tracking-widest text-[#A5A5A5] hover:text-white uppercase transition-colors"
            >
              Cancel Upload
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="p-6 bg-[#0A0A0A] border-t border-[#111] space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3 w-full sm:w-1/2">
              <ZoomIn className="w-4 h-4 text-crimson" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                disabled={!isMediaLoaded || isSaving}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#1A1A1A] rounded-lg appearance-none cursor-pointer accent-[#D90429] disabled:opacity-30"
              />
              <span className="text-[10px] font-mono text-[#A5A5A5] w-8 text-right">
                {zoom.toFixed(2)}x
              </span>
            </div>

            {/* Rotation Slider */}
            <div className="flex items-center gap-3 w-full sm:w-1/2 justify-end">
              <RotateCw className="w-4 h-4 text-crimson" />
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={isGif ? 0 : rotation}
                disabled={isGif || !isMediaLoaded || isSaving}
                onChange={(e) => setRotation(parseInt(e.target.value))}
                className="w-full h-1 bg-[#1A1A1A] rounded-lg appearance-none cursor-pointer accent-[#D90429] disabled:opacity-30"
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
              disabled={isSaving || !isMediaLoaded}
              className="text-[10px] font-orbitron tracking-widest text-[#A5A5A5] hover:text-white uppercase transition-colors disabled:opacity-30"
            >
              Reset
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isSaving}
                className="px-5 py-2 rounded bg-[#111] hover:bg-[#222] text-[10px] font-orbitron tracking-widest text-white uppercase transition-colors disabled:opacity-30"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAndUpload}
                disabled={isSaving || !isMediaLoaded || !croppedAreaPixels || !!cropError}
                className="px-6 py-2 rounded bg-gradient-to-r from-[#D90429] to-[#FF6B35] text-[10px] font-orbitron tracking-widest text-white uppercase font-bold transition-all shadow-[0_4px_15px_rgba(217,4,41,0.3)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save & Upload
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
