"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toastVariants } from "@/lib/motion";

export type ToastType = "success" | "error" | "warning" | "info" | "loading";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
    loading: (message: string, title?: string) => string;
    dismiss: (id: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, title?: string, duration: number = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (type !== "loading" && duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }

      return id;
    },
    [dismiss]
  );

  const toast = {
    success: (message: string, title?: string) => addToast("success", message, title),
    error: (message: string, title?: string) => addToast("error", message, title, 5000),
    warning: (message: string, title?: string) => addToast("warning", message, title),
    info: (message: string, title?: string) => addToast("info", message, title),
    loading: (message: string, title?: string) => addToast("loading", message, title, 0),
    dismiss,
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast Render Portal */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 pointer-events-none max-w-sm w-full px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              variants={toastVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              layout
              className={`pointer-events-auto p-4 rounded-xl border backdrop-blur-xl shadow-2xl flex items-start gap-3 transition-colors ${
                t.type === "success"
                  ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-100 shadow-[0_0_25px_rgba(16,185,129,0.2)]"
                  : t.type === "error"
                  ? "bg-red-950/80 border-red-500/40 text-red-100 shadow-[0_0_25px_rgba(239,68,68,0.25)]"
                  : t.type === "warning"
                  ? "bg-amber-950/80 border-amber-500/40 text-amber-100 shadow-[0_0_25px_rgba(245,158,11,0.2)]"
                  : t.type === "loading"
                  ? "bg-zinc-950/90 border-red-500/30 text-zinc-200 shadow-[0_0_25px_rgba(220,38,38,0.15)]"
                  : "bg-zinc-950/80 border-blue-500/40 text-blue-100 shadow-[0_0_25px_rgba(59,130,246,0.2)]"
              }`}
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {t.type === "success" && (
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {t.type === "error" && (
                  <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {t.type === "warning" && (
                  <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
                {t.type === "loading" && (
                  <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                )}
                {t.type === "info" && (
                  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>

              {/* Message */}
              <div className="flex-1 min-w-0">
                {t.title && <h4 className="text-xs font-bold uppercase tracking-wider mb-0.5">{t.title}</h4>}
                <p className="text-xs text-zinc-300 leading-relaxed break-words">{t.message}</p>
              </div>

              {/* Close button */}
              <button
                onClick={() => dismiss(t.id)}
                className="flex-shrink-0 text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      toast: {
        success: (msg: string) => console.log("[Toast Success]", msg),
        error: (msg: string) => console.error("[Toast Error]", msg),
        warning: (msg: string) => console.warn("[Toast Warning]", msg),
        info: (msg: string) => console.info("[Toast Info]", msg),
        loading: (msg: string) => msg,
        dismiss: () => {},
      },
    };
  }
  return context;
}
