"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = ["Verifying secure session", "Checking permissions", "Preparing your workspace"];

/** Full-screen 3D gyroscope loader shown while a protected area restores the session. */
export function SecureBoot({ label = "CodeXa workspace" }: { label?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => Math.min(v + 1, STEPS.length - 1)), 900);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#060606] text-white flex flex-col items-center justify-center gap-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(40%_40%_at_50%_45%,rgba(217,4,41,0.18),transparent_70%)]" />
      <div className="relative w-40 h-40" style={{ perspective: 700 }}>
        {[0, 1, 2].map((k) => (
          <motion.div
            key={k}
            className="absolute inset-0 rounded-full border"
            style={{
              borderColor: k === 1 ? "rgba(255,255,255,0.25)" : "rgba(255,30,60,0.7)",
              boxShadow: k === 1 ? "none" : "0 0 24px rgba(217,4,41,0.45)",
              transformStyle: "preserve-3d",
            }}
            initial={{ rotateX: 60 + k * 30, rotateY: k * 40 }}
            animate={{ rotateZ: 360, rotateY: [k * 40, k * 40 + 180, k * 40 + 360] }}
            transition={{ duration: 3 + k, repeat: Infinity, ease: "linear" }}
          />
        ))}
        <motion.div
          className="absolute inset-[34%] rounded-2xl overflow-hidden ring-1 ring-bright-red/60 shadow-[0_0_40px_rgba(255,30,60,0.55)]"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <img src="/assets/images/logo.jpeg" alt="" className="w-full h-full object-cover" />
        </motion.div>
      </div>

      <div className="relative text-center">
        <p className="font-orbitron font-black text-sm tracking-[0.25em] uppercase">{label}</p>
        <div className="mt-3 h-5">
          <AnimatePresence mode="wait">
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="font-mono text-xs text-white/50"
            >
              {STEPS[i]}…
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="mt-4 mx-auto w-48 h-1 rounded-full bg-white/10 overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-crimson to-bright-red" initial={{ width: "8%" }} animate={{ width: `${((i + 1) / STEPS.length) * 100}%` }} transition={{ duration: 0.8 }} />
        </div>
      </div>
    </div>
  );
}
