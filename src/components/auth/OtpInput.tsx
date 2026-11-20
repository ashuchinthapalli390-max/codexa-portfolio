"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { Check } from "lucide-react";

export type OtpStatus = "idle" | "verifying" | "success" | "error";

/**
 * Animated 6-digit code input.
 * - digits flip in, active cell glows with a blinking caret
 * - paste / arrow keys / backspace supported
 * - verifying: a scan beam sweeps across the cells
 * - error: the row shakes and cells flash red
 * - success: cells turn green one by one and a check badge pops
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  status = "idle",
  disabled,
  autoFocus = true,
  length = 6,
  label = "Verification code",
}: {
  value: string[];
  onChange: (digits: string[]) => void;
  onComplete?: (code: string) => void;
  status?: OtpStatus;
  disabled?: boolean;
  autoFocus?: boolean;
  length?: number;
  label?: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [focused, setFocused] = useState<number | null>(null);
  const row = useAnimationControls();
  const locked = disabled || status === "verifying" || status === "success";

  useEffect(() => {
    if (autoFocus) setTimeout(() => refs.current[value.findIndex((d) => !d) === -1 ? length - 1 : value.findIndex((d) => !d)]?.focus(), 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  useEffect(() => {
    if (status === "error") {
      row.start({ x: [0, -12, 12, -8, 8, -4, 4, 0], transition: { duration: 0.5 } });
    }
  }, [status, row]);

  const commit = (next: string[]) => {
    onChange(next);
    if (next.every((d) => d) && next.length === length) onComplete?.(next.join(""));
  };

  const setAt = (i: number, raw: string) => {
    const clean = raw.replace(/\D/g, "");
    if (clean.length > 1) {
      // paste or autofill
      const next = Array.from({ length }, (_, k) => clean[k] || "");
      commit(next);
      refs.current[Math.min(clean.length, length - 1)]?.focus();
      return;
    }
    const next = [...value];
    next[i] = clean;
    commit(next);
    if (clean && i < length - 1) refs.current[i + 1]?.focus();
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      e.preventDefault();
      const next = [...value];
      next[i - 1] = "";
      onChange(next);
      refs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
  };

  return (
    <div className="relative" role="group" aria-label={label}>
      <motion.div animate={row} className="relative flex justify-between gap-2 sm:gap-3" style={{ perspective: 600 }}>
        {Array.from({ length }).map((_, i) => {
          const d = value[i] || "";
          const isFocus = focused === i && !locked;
          const tone =
            status === "success"
              ? "border-emerald-400 bg-emerald-500/10 text-emerald-300 shadow-[0_0_22px_rgba(16,185,129,0.35)]"
              : status === "error"
              ? "border-bright-red bg-crimson/15 text-bright-red shadow-[0_0_22px_rgba(255,30,60,0.35)]"
              : d
              ? "border-bright-red/70 bg-crimson/[0.08] text-white shadow-[0_0_18px_rgba(217,4,41,0.25)]"
              : isFocus
              ? "border-bright-red bg-white/[0.04] text-white shadow-[0_0_0_4px_rgba(217,4,41,0.15)]"
              : "border-white/10 bg-white/[0.03] text-white";
          return (
            <motion.div
              key={i}
              className="relative flex-1"
              initial={{ opacity: 0, y: 16, rotateX: -60 }}
              animate={{
                opacity: 1,
                y: 0,
                rotateX: 0,
                scale: status === "success" ? [1, 1.08, 1] : 1,
              }}
              transition={{
                delay: status === "success" ? i * 0.06 : 0.05 * i,
                duration: status === "success" ? 0.35 : 0.5,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <input
                ref={(el) => {
                  refs.current[i] = el;
                }}
                value={d}
                onChange={(e) => setAt(i, e.target.value)}
                onKeyDown={(e) => onKey(i, e)}
                onFocus={(e) => {
                  setFocused(i);
                  e.currentTarget.select();
                }}
                onBlur={() => setFocused((f) => (f === i ? null : f))}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={length}
                disabled={locked}
                aria-label={`Digit ${i + 1}`}
                className={`w-full h-14 sm:h-16 rounded-2xl border text-center font-mono text-2xl font-bold caret-transparent outline-none transition-all duration-200 !text-transparent selection:bg-transparent ${tone}`}
              />
              {/* visible digit with a 3D flip-in */}
              <AnimatePresence mode="popLayout">
                {d && (
                  <motion.span
                    key={`${i}-${d}`}
                    initial={{ rotateX: -90, y: -8, opacity: 0 }}
                    animate={{ rotateX: 0, y: 0, opacity: 1 }}
                    exit={{ rotateX: 90, y: 8, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className={`pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-2xl font-bold ${
                      status === "success" ? "text-emerald-300" : status === "error" ? "text-bright-red" : "text-white"
                    }`}
                  >
                    {d}
                  </motion.span>
                )}
              </AnimatePresence>
              {/* caret */}
              {isFocus && !d && (
                <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-[2px] bg-bright-red animate-pulse" />
              )}
            </motion.div>
          );
        })}

        {/* verifying scan beam */}
        <AnimatePresence>
          {status === "verifying" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
            >
              <motion.div
                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                animate={{ x: ["-120%", "320%"] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* progress dots */}
      <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
        {Array.from({ length }).map((_, i) => (
          <span
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              status === "success" ? "w-4 bg-emerald-400" : value[i] ? "w-4 bg-bright-red" : "w-1.5 bg-white/15"
            }`}
          />
        ))}
      </div>

      {/* success badge */}
      <AnimatePresence>
        {status === "success" && (
          <motion.div
            initial={{ scale: 0, rotate: -90, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.35 }}
            className="absolute -top-4 -right-3 w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.6)]"
          >
            <Check className="w-5 h-5 text-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
