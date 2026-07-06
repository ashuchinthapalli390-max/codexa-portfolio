"use client";

import React, { useEffect } from "react";
import { X, Check, Phone, Github, MessageCircle } from "lucide-react";
import { ImageAssetFallback } from "../ui/ImageAssetFallback";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface TeamMember {
  name: string;
  role: string;
  phone: string;
  image: string;
  details: string[];
  quote: string;
}

interface TeamDetailModalProps {
  member: TeamMember | null;
  onClose: () => void;
}

export function TeamDetailModal({ member, onClose }: TeamDetailModalProps) {
  const isReduced = useReducedMotion();

  // Esc key closure
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#070707]/90 backdrop-blur-md">
      {/* Background click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={isReduced ? { opacity: 1 } : { opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={isReduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        className="glass-panel rounded-xl max-w-2xl w-full relative overflow-hidden bg-card/90 shadow-neon border border-bright-red/30 z-10"
      >
        {/* Glow corners */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-bright-red" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-bright-red" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full border border-crimson/20 hover:border-bright-red bg-secondary-dark/60 text-secondary-text hover:text-white transition-all z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 md:p-8">
          {/* Profile Left Column */}
          <div className="md:col-span-5 flex flex-col items-center text-center">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-2 border-crimson p-1 bg-deep-red/10 shadow-neon mb-4 overflow-hidden relative">
              <ImageAssetFallback
                src={member.image}
                alt={member.name}
                fallbackLabel={`${member.name.toLowerCase()}-profile.png`}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            
            <h3 className="text-xl font-bold font-orbitron text-white uppercase tracking-wider">
              {member.name}
            </h3>
            <p className="text-xs text-bright-red font-orbitron tracking-widest uppercase mt-1">
              {member.role}
            </p>

            <div className="flex gap-4 mt-6 border-t border-crimson/15 pt-4 w-full justify-center">
              <a href={`tel:${member.phone}`} className="p-2.5 rounded bg-deep-red/20 border border-crimson/25 hover:border-bright-red hover:bg-deep-red/40 text-bright-red transition-all" title="Call">
                <Phone className="w-4 h-4" />
              </a>
              <a href="https://github.com/codexa-agency" target="_blank" rel="noopener noreferrer" className="p-2.5 rounded bg-deep-red/20 border border-crimson/25 hover:border-bright-red hover:bg-deep-red/40 text-bright-red transition-all" title="Github">
                <Github className="w-4 h-4" />
              </a>
              <a href={`https://wa.me/91${member.phone}`} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded bg-deep-red/20 border border-crimson/25 hover:border-bright-red hover:bg-deep-red/40 text-bright-red transition-all" title="WhatsApp">
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Profile Right Column details */}
          <div className="md:col-span-7 flex flex-col">
            <span className="text-[10px] tracking-widest text-crimson font-orbitron uppercase mb-1">
              Leadership Profile
            </span>
            <div className="w-8 h-1 bg-crimson mb-4" />

            {/* Quote */}
            <div className="relative p-4 rounded bg-deep-red/10 border-l-4 border-bright-red mb-6 shadow-inner italic text-sm text-white">
              “{member.quote}”
            </div>

            {/* Core Competencies */}
            <h4 className="font-orbitron font-semibold text-xs tracking-widest text-white uppercase mb-3">
              Capabilities & Focus Area
            </h4>

            <div className="flex flex-col gap-2 overflow-y-auto max-h-48 pr-2">
              {member.details.map((detail, index) => (
                <div key={index} className="flex gap-2.5 items-start text-xs text-secondary-text">
                  <Check className="w-4 h-4 text-bright-red shrink-0 mt-0.5" />
                  <span>{detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
