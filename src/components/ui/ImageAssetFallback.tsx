"use client";

import React, { useState, useEffect } from "react";
import { Upload, Image as ImageIcon } from "lucide-react";

interface ImageAssetFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackLabel: string;
}

export function ImageAssetFallback({ src, alt, fallbackLabel, className, ...props }: ImageAssetFallbackProps) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  if (!src || error) {
    return (
      <div 
        className={`relative flex flex-col items-center justify-center bg-gradient-to-br from-card to-secondary-dark border border-dashed border-crimson/50 rounded-lg p-6 text-center group cursor-pointer hover:border-bright-red transition-all ${className || ""}`}
        style={{ minHeight: "200px" }}
      >
        {/* Futuristic Grid elements */}
        <div className="absolute inset-0 bg-cyber-grid opacity-10 pointer-events-none rounded-lg" />
        <div className="absolute top-2 left-2 text-[10px] text-crimson font-orbitron tracking-widest opacity-60">
          SYS.IMG_MISSING
        </div>
        
        {/* Upload Icon & Label */}
        <div className="flex flex-col items-center gap-3 relative z-10">
          <div className="p-3 rounded-full bg-deep-red/40 border border-crimson/30 group-hover:border-bright-red/50 group-hover:bg-deep-red/60 transition-all duration-300">
            <Upload className="w-8 h-8 text-bright-red animate-pulse" />
          </div>
          <span className="text-white font-orbitron text-sm font-semibold uppercase tracking-wider">
            {fallbackLabel}
          </span>
          <span className="text-[11px] text-secondary-text max-w-[200px] leading-tight">
            Click or drag your licensed Spidey or team asset here.
          </span>
          <span className="text-[9px] font-mono text-crimson/80 bg-deep-red/20 px-2 py-0.5 rounded border border-crimson/20">
            {src || "No Src Provided"}
          </span>
        </div>
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt || "CodeXa Asset"} onError={() => setError(true)} className={className} {...props} />;
}
