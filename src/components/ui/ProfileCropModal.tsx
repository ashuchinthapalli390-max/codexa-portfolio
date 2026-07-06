"use client";

import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { X, ZoomIn, RotateCw } from "lucide-react";

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

// Canvas crop helper
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: CropArea,
  rotation = 0,
  isTransparent = false
): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.setAttribute("crossOrigin", "anonymous");
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D context");

  canvas.width = 1024;
  canvas.height = 1024;

  ctx.fillStyle = isTransparent ? "rgba(0,0,0,0)" : "#070707";
  ctx.fillRect(0, 0, 1024, 1024);

  // Setup transform for rotation if needed
  ctx.translate(512, 512);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-512, -512);

  // Draw the image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    1024,
    1024
  );

  return new Promise<Blob>((resolve, reject) => {
    const mime = isTransparent ? "image/png" : "image/jpeg";
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas conversion failed"));
      },
      mime,
      0.92
    );
  });
}

export function ProfileCropModal({ file, onClose, onCropComplete }: ProfileCropModalProps) {
  const [imageSrc] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [croppedAreaPercent, setCroppedAreaPercent] = useState<CropArea | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const isGif = file.type === "image/gif";
  const isPng = file.type === "image/png" || file.type === "image/webp";

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
  };

  const handleSave = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (isGif) {
        // For GIFs: skip canvas crop (would freeze it). Send original file + crop data.
        onCropComplete({
          blob: file,
          cropData: {
            x: croppedAreaPercent ? croppedAreaPercent.x : 0,
            y: croppedAreaPercent ? croppedAreaPercent.y : 0,
            w: croppedAreaPercent ? croppedAreaPercent.width : 100,
            h: croppedAreaPercent ? croppedAreaPercent.height : 100,
            zoom,
            rotation,
          },
        });
      } else {
        // For static images: crop using canvas
        if (!croppedAreaPixels) throw new Error("No crop area selected");
        const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation, isPng);
        onCropComplete({ blob });
      }
      onClose();
    } catch (e) {
      alert("Failed to crop image. Please try another file.");
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
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

        {/* Cropper area */}
        <div className="relative h-96 w-full bg-[#050505]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="rect"
            showGrid={true}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onRotationChange={onRotationChange}
            onCropComplete={onCropCompleteCallback}
            classes={{
              containerClassName: "bg-[#050505]",
              mediaClassName: "max-h-full",
              cropAreaClassName: "border-2 border-[#D90429] shadow-[0_0_0_9999px_rgba(0,0,0,0.85)]",
            }}
          />
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
                value={rotation}
                onChange={(e) => setRotation(parseInt(e.target.value))}
                className="w-full h-1 bg-[#1A1A1A] rounded-lg appearance-none cursor-pointer accent-[#D90429]"
              />
              <span className="text-[10px] font-mono text-[#A5A5A5] w-10 text-right">
                {rotation}°
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
                disabled={isProcessing}
                className="px-6 py-2 rounded bg-gradient-to-r from-[#D90429] to-[#FF6B35] text-[10px] font-orbitron tracking-widest text-white uppercase font-bold transition-all shadow-[0_4px_15px_rgba(217,4,41,0.3)] hover:opacity-90 disabled:opacity-50"
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
