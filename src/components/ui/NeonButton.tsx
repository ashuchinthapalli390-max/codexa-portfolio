"use client";

import React from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export function NeonButton({
  variant = "primary",
  size = "md",
  children,
  className = "",
  glowColor = "rgba(217, 4, 41, 0.4)",
  ...props
}: NeonButtonProps) {
  const isReduced = useReducedMotion();

  const baseStyles = "relative inline-flex items-center justify-center font-orbitron font-semibold uppercase tracking-wider transition-all duration-300 rounded overflow-hidden select-none active:scale-[0.98]";
  
  const sizeStyles = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };

  const variantStyles = {
    primary: "bg-crimson text-white border border-bright-red hover:bg-bright-red text-shadow",
    secondary: "bg-secondary-dark text-white border border-crimson/50 hover:bg-deep-red/30",
    outline: "bg-transparent text-white border border-crimson hover:bg-crimson/10",
    ghost: "bg-transparent text-secondary-text hover:text-white hover:bg-deep-red/10",
  };

  // Custom inline style for glow box-shadow on hover
  const glowStyle = !isReduced && variant !== "ghost" ? {
    boxShadow: `0 0 12px ${glowColor}, inset 0 0 4px rgba(255, 30, 60, 0.2)`
  } : {};

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      style={variant === "primary" ? glowStyle : undefined}
      {...props}
    >
      {/* Glow highlight line for primary/outline button */}
      {!isReduced && (variant === "primary" || variant === "outline") && (
        <span className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-bright-red to-transparent animate-pulse-slow" />
      )}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
}
