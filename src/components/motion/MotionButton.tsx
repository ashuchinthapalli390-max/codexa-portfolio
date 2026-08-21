"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { buttonHoverVariants } from "@/lib/motion";

interface MotionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  isLoading?: boolean;
}

export function MotionButton({
  children,
  className = "",
  variant = "primary",
  isLoading = false,
  disabled,
  ...props
}: MotionButtonProps) {
  const shouldReduceMotion = useReducedMotion();

  const variantStyles = {
    primary:
      "bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 hover:border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]",
    secondary:
      "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 hover:border-zinc-500",
    danger:
      "bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/80 hover:border-red-600",
    ghost:
      "bg-transparent hover:bg-zinc-900/50 text-zinc-400 hover:text-white border border-transparent",
  }[variant];

  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-lg px-4 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed";

  if (shouldReduceMotion) {
    return (
      <button
        className={`${baseStyles} ${variantStyles} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <span className="mr-2 inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    );
  }

  return (
    <motion.button
      variants={buttonHoverVariants}
      initial="initial"
      whileHover={!disabled && !isLoading ? "hover" : undefined}
      whileTap={!disabled && !isLoading ? "tap" : undefined}
      className={`${baseStyles} ${variantStyles} ${className}`}
      disabled={disabled || isLoading}
      {...(props as any)}
    >
      {isLoading && (
        <span className="mr-2 inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </motion.button>
  );
}
