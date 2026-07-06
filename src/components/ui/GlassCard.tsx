"use client";

import React from "react";
import { useTilt } from "@/hooks/useTilt";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  glowOnHover?: boolean;
}

export function GlassCard({
  children,
  className = "",
  maxTilt = 6,
  glowOnHover = true,
}: GlassCardProps) {
  const isReduced = useReducedMotion();
  const { cardRef, tiltStyle, onMouseMove, onMouseLeave } = useTilt(maxTilt);

  const combinedClassName = `glass-panel rounded-lg p-6 relative overflow-hidden transition-all duration-300 ${
    glowOnHover ? "hover:shadow-neon hover:border-bright-red/50" : ""
  } ${className}`;

  if (isReduced) {
    return (
      <div className={combinedClassName}>
        {/* Subtle grid pattern bg */}
        <div className="absolute inset-0 bg-cyber-grid opacity-5 pointer-events-none" />
        <div className="relative z-10">{children}</div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef as React.RefObject<HTMLDivElement>}
      className={combinedClassName}
      style={tiltStyle}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* Subtle grid pattern bg */}
      <div className="absolute inset-0 bg-cyber-grid opacity-5 pointer-events-none" />
      
      {/* Glow reflect accent */}
      <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-transparent via-crimson/5 to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10">{children}</div>
    </div>
  );
}
