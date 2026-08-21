"use client";

import React, { useState } from "react";

interface CodeXaAvatarProps {
  src?: string | null;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "custom";
  zoom?: number | null;
  positionX?: number | null;
  positionY?: number | null;
  className?: string;
  showGlow?: boolean;
  priority?: boolean;
}

const SIZE_MAP = {
  xs: "w-7 h-7",
  sm: "w-9 h-9",
  md: "w-12 h-12",
  lg: "w-20 h-20",
  xl: "w-28 h-28",
  "2xl": "w-36 h-36",
  custom: "",
};

export function CodeXaAvatar({
  src,
  alt = "CodeXa Member",
  size = "md",
  zoom = 1,
  positionX = 50,
  positionY = 50,
  className = "",
  showGlow = false,
}: CodeXaAvatarProps) {
  const [hasError, setHasError] = useState(false);

  const fallbackSrc = "/assets/images/logo.jpeg";
  const finalSrc = !hasError && src ? src : fallbackSrc;
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md;

  const posX = positionX !== null && positionX !== undefined ? positionX : 50;
  const posY = positionY !== null && positionY !== undefined ? positionY : 50;
  const scale = zoom !== null && zoom !== undefined && zoom >= 1 ? zoom : 1;

  return (
    <div
      className={`relative rounded-full overflow-hidden flex-shrink-0 bg-[#0A0A0A] border transition-all duration-300 ${
        showGlow
          ? "border-bright-red shadow-[0_0_15px_rgba(255,30,60,0.45)] hover:shadow-[0_0_22px_rgba(255,30,60,0.65)] hover:scale-[1.03]"
          : "border-crimson/30 hover:border-crimson/60"
      } ${sizeClasses} ${className}`}
    >
      {/* Visual Avatar Image */}
      <img
        src={finalSrc}
        alt={alt}
        onError={() => setHasError(true)}
        className="w-full h-full object-cover transition-transform duration-300"
        style={{
          objectPosition: `${posX}% ${posY}%`,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      />
    </div>
  );
}
