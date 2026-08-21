"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { modalBackdropVariants, modalDialogVariants } from "@/lib/motion";

interface MotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

export function MotionModal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-xl",
  className = "",
}: MotionModalProps) {
  const shouldReduceMotion = useReducedMotion();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            variants={shouldReduceMotion ? undefined : modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Dialog Container */}
          <motion.div
            variants={shouldReduceMotion ? undefined : modalDialogVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`relative z-10 w-full ${maxWidth} bg-zinc-950/95 border border-red-500/30 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.15)] overflow-hidden ${className}`}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/40">
                <h3 className="text-lg font-semibold text-white tracking-wide">{title}</h3>
                <button
                  onClick={onClose}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800/60 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Content */}
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
