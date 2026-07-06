"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Shield, Cpu, Code } from "lucide-react";
import { NeonButton } from "../ui/NeonButton";

interface LoadingScreenProps {
  onComplete: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [percent, setPercent] = useState(0);
  const [terminalText, setTerminalText] = useState<string[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const logs = [
    "INITIALIZING CODEXA SYSTEM...",
    "LOADING INTERFACE GRID...",
    "CONNECTING TO DIGITAL NETWORK...",
    "ESTABLISHING SECURE PROTOCOLS...",
    "AI SYSTEMS ONLINE...",
    "CYBER DEFENSE AGENT ENGAGED...",
    "BUILDING THE FUTURE...",
    "SYSTEM DEPLOYMENT SUCCESSFUL."
  ];

  useEffect(() => {
    // Percentage loading ticker
    const timer = setInterval(() => {
      setPercent((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setIsDone(true);
          return 100;
        }
        // Random increases
        const inc = Math.floor(Math.random() * 8) + 3;
        return Math.min(prev + inc, 100);
      });
    }, 100);

    return () => clearInterval(timer);
  }, []);

  // Update terminal logs based on percent
  useEffect(() => {
    const activeLogCount = Math.min(
      Math.floor((percent / 100) * logs.length) + 1,
      logs.length
    );
    setTerminalText(logs.slice(0, activeLogCount));
  }, [percent]);

  const handleSkipOrEnter = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070707] flex flex-col justify-between p-6 select-none overflow-hidden">
      {/* Red web lines framing the screen */}
      <div className="absolute inset-0 pointer-events-none opacity-20 border border-crimson/30 m-4">
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-bright-red" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-bright-red" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-bright-red" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-bright-red" />
      </div>

      {/* Top bar status */}
      <div className="flex justify-between items-center text-crimson font-mono text-[10px] md:text-xs">
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-bright-red animate-ping" />
          SECURE CONNECTION :: ACTIVE
        </span>
        <span className="hidden sm:inline font-orbitron">CODEXA v1.0.0</span>
      </div>

      {/* Center Logo & Progress */}
      <div className="flex flex-col items-center justify-center flex-grow max-w-lg mx-auto w-full">
        {/* Core Icon Assembly */}
        <div className="relative mb-8 flex items-center justify-center">
          <div className="absolute -inset-6 bg-crimson/15 rounded-full blur-xl animate-pulse-slow" />
          
          {/* Futuristic glowing geometric emblem */}
          <div className="relative w-24 h-24 rounded-full border border-bright-red/40 flex items-center justify-center bg-[#070707] shadow-neon overflow-hidden">
            {!logoError ? (
              <img
                src="/assets/images/logo.jpeg"
                alt="CodeXa Agency logo"
                className="w-full h-full object-cover"
                onError={() => setLogoError(true)}
              />
            ) : (
              <>
                <span className="absolute text-[10px] text-crimson font-orbitron -top-3 tracking-widest bg-[#070707] px-2">
                  CDXA
                </span>
                <div className="relative flex items-center justify-center gap-1">
                  <Cpu className="w-6 h-6 text-bright-red animate-pulse" />
                  <Code className="w-5 h-5 text-secondary-text absolute -top-4 -right-4" />
                  <Shield className="w-4 h-4 text-crimson absolute -bottom-4 -left-4" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Brand Label */}
        <h1 className="text-3xl font-black font-orbitron tracking-[0.2em] text-white text-center mb-1">
          CODEXA
        </h1>
        <p className="text-[10px] tracking-[0.4em] font-orbitron uppercase text-crimson mb-8 text-center">
          Where Ideas Become Digital Reality
        </p>

        {/* Progress Display */}
        <div className="w-full bg-secondary-dark/60 border border-crimson/20 rounded h-2 mb-4 overflow-hidden relative">
          <div 
            className="h-full bg-gradient-to-r from-crimson to-bright-red transition-all duration-150 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="flex justify-between items-center w-full font-mono text-xs text-secondary-text mb-6">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-bright-red animate-pulse" />
            SYSTEM STABILITY
          </span>
          <span className="text-white font-semibold font-orbitron">{percent}%</span>
        </div>

        {/* Skip/Enter button area */}
        <div className="h-14 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {isDone ? (
              <motion.div
                key="enter-experience"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <NeonButton onClick={handleSkipOrEnter} size="lg" className="w-56 font-bold shadow-neon-hover">
                  Enter Experience
                </NeonButton>
              </motion.div>
            ) : (
              <motion.button
                key="skip-animation"
                onClick={handleSkipOrEnter}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                whileHover={{ opacity: 1, scale: 1.05 }}
                className="text-[10px] tracking-widest font-orbitron font-semibold uppercase text-secondary-text hover:text-bright-red transition-all duration-200"
              >
                [ SKIP ANIMATION ]
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Terminal Output Log in Footer */}
      <div className="bg-card/40 border border-crimson/10 rounded-lg p-4 font-mono text-[9px] md:text-[11px] text-crimson/80 h-32 overflow-hidden flex flex-col justify-end w-full max-w-xl mx-auto shadow-inner relative">
        <div className="absolute top-2 right-4 flex items-center gap-1.5 text-secondary-text text-[9px]">
          <Terminal className="w-3.5 h-3.5" />
          SYSTEM_LOG
        </div>
        <div className="flex flex-col gap-1 overflow-y-auto max-h-24">
          {terminalText.map((log, index) => (
            <div key={index} className="flex gap-2 items-start leading-tight">
              <span className="text-bright-red select-none">&gt;</span>
              <span>{log}</span>
            </div>
          ))}
          {percent < 100 && (
            <div className="flex items-center gap-1">
              <span className="text-bright-red select-none">&gt;</span>
              <span className="w-1.5 h-3.5 bg-bright-red animate-pulse" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
