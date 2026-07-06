"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowUpRight, ChevronRight } from "lucide-react";
import { LeadershipMember, ModalSection } from "@/config/leadershipData";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getProfileImageStyle } from "@/lib/profile-media";

interface LeadershipCardProps {
  member: LeadershipMember;
  mediaUrl: string | null;
  cropX?: number | null;
  cropY?: number | null;
  cropW?: number | null;
  cropH?: number | null;
  cropRotation?: number | null;
  updatedAt?: string | null;
  index: number;
}

// ─── Section renderer for modal ────────────────────────────────────────────
function ModalSectionBlock({ section }: { section: ModalSection }) {
  return (
    <div className="text-left">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 bg-[#D90429] rounded-full flex-shrink-0" />
        <span className="text-[10px] font-orbitron text-[#D90429] tracking-[0.2em] uppercase font-bold">
          {section.title}
        </span>
      </div>

      {/* PROJECTS */}
      {section.type === "projects" && section.projects && (
        <div className="space-y-2.5">
          {section.projects.map((proj, i) => (
            <div
              key={i}
              className="bg-[#0C0C0C] border border-[rgba(217,4,41,0.15)] rounded-xl px-4 py-3 hover:border-[rgba(217,4,41,0.35)] transition-colors group"
            >
              <div className="flex items-center gap-2">
                <span className="text-[#D90429] text-[10px] font-orbitron font-bold">◈</span>
                <span className="text-xs font-orbitron font-bold text-white group-hover:text-[#D90429] transition-colors">
                  {proj.name}
                </span>
              </div>
              <p className="text-[10px] text-[#666] font-light mt-1.5 leading-relaxed pl-4">
                {proj.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* SKILLS */}
      {section.type === "skills" && section.skills && (
        <div className="flex flex-wrap gap-1.5">
          {section.skills.map((skill, i) => (
            <span
              key={i}
              className="text-[9px] font-mono tracking-wider uppercase bg-[#0F0F0F] px-2.5 py-1 rounded-md border border-[rgba(217,4,41,0.18)] text-[#B0B0B0] hover:border-[#D90429]/50 hover:text-white transition-all cursor-default"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* BULLETS */}
      {section.type === "bullets" && section.bullets && (
        <ul className="space-y-2">
          {section.bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[11px] text-[#B0B0B0] font-light leading-relaxed">
              <ChevronRight className="w-3 h-3 text-[#D90429] flex-shrink-0 mt-0.5" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export function LeadershipCard({
  member,
  mediaUrl,
  cropX,
  cropY,
  cropW,
  cropH,
  cropRotation,
  updatedAt,
  index,
}: LeadershipCardProps) {
  const isReduced = useReducedMotion();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { src: imgUrl, imgStyle } = getProfileImageStyle(
    { mediaUrl, cropX, cropY, cropW, cropH, cropRotation, updatedAt },
    member.defaultImage
  );

  // Lock body scroll when modal open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isModalOpen]);

  // Escape key
  useEffect(() => {
    if (!isModalOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setIsModalOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isModalOpen]);

  return (
    <>
      {/* ─── CARD ──────────────────────────────────────────── */}
      <motion.div
        custom={index}
        initial={isReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ delay: index * 0.12, duration: 0.5, ease: "easeOut" }}
        whileHover={isReduced ? {} : { y: -8 }}
        onClick={() => setIsModalOpen(true)}
        className="relative flex flex-col items-center p-6 rounded-2xl cursor-pointer select-none group border border-crimson/25 bg-gradient-to-b from-deep-red/10 to-card hover:border-bright-red/50 shadow-lg hover:shadow-neon transition-all duration-300"
      >
        {/* Corner tag */}
        <div className="absolute top-3 left-4 text-[9px] font-orbitron text-crimson font-bold uppercase tracking-widest">
          BOARD // CDXA
        </div>
        <div className="absolute top-3 right-4">
          <ArrowUpRight className="w-4 h-4 text-secondary-text group-hover:text-bright-red group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>

        {/* Profile image with holographic ring */}
        <div className="relative mt-6 mb-5">
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-crimson to-bright-red blur-sm group-hover:blur-md transition-all opacity-75" />
          <div className="relative w-28 h-28 rounded-full bg-[#0E0E0E] border-2 border-background overflow-hidden flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgUrl}
              alt={member.name}
              style={imgStyle}
              className="filter saturate-75 group-hover:saturate-100 transition-all duration-300"
            />
          </div>
        </div>

        {/* Name + Role */}
        <h3 className="font-orbitron font-black text-lg text-white uppercase tracking-wider text-center group-hover:text-bright-red transition-colors">
          {member.name}
        </h3>
        <p className="text-[10px] text-bright-red font-orbitron tracking-widest uppercase mt-1 text-center font-bold">
          {member.tagline}
        </p>

        {/* Divider */}
        <div className="w-12 h-[1px] bg-crimson/30 my-4 group-hover:w-20 transition-all duration-300" />

        {/* Quote preview */}
        <p className="text-[11px] text-secondary-text text-center italic leading-relaxed px-2 mb-5 line-clamp-2">
          &ldquo;{member.quote}&rdquo;
        </p>

        {/* Skill chips preview */}
        <div className="flex flex-wrap gap-1.5 justify-center mt-auto">
          {member.cardSkillPreview.map((skill, idx) => (
            <span
              key={idx}
              className="text-[9px] font-mono tracking-wider uppercase bg-[#070707] px-2 py-0.5 rounded border border-crimson/15 text-secondary-text group-hover:border-bright-red/30 group-hover:text-white transition-colors"
            >
              {skill}
            </span>
          ))}
        </div>

        {/* View Profile button */}
        <div className="mt-4 text-[9px] font-orbitron tracking-widest text-crimson/50 group-hover:text-bright-red uppercase transition-colors flex items-center gap-1">
          View Profile <ArrowUpRight className="w-2.5 h-2.5" />
        </div>
      </motion.div>

      {/* ─── DETAIL MODAL ──────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/88 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative bg-[#080808] border border-[rgba(217,4,41,0.3)] rounded-2xl w-full max-w-xl overflow-hidden flex flex-col"
              style={{
                boxShadow: "0 0 60px rgba(217,4,41,0.2), 0 30px 60px rgba(0,0,0,0.8)",
                maxHeight: "90vh",
              }}
            >
              {/* Close */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 z-20 bg-[#111] hover:bg-[#222] p-1.5 rounded-full text-[#A5A5A5] hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Top banner */}
              <div className="relative h-24 bg-gradient-to-br from-[#1a0005] via-[#0d0003] to-[#080808] overflow-hidden flex-shrink-0">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(217,4,41,0.3)_0%,transparent_70%)]" />
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#080808] to-transparent" />
                <div
                  className="absolute inset-0 opacity-[0.08]"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(217,4,41,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(217,4,41,0.5) 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                  }}
                />
                <div className="absolute top-4 left-6 font-orbitron text-[9px] tracking-[0.3em] text-[#D90429] uppercase opacity-70">
                  {member.leadershipPosition.replace("_", " ")} // CODEX BOARD
                </div>
              </div>

              {/* Avatar overlapping banner */}
              <div className="flex justify-center -mt-12 relative z-10 flex-shrink-0 mb-1">
                <div className="relative">
                  <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-crimson to-bright-red blur-md opacity-80" />
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-[#080808] flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl}
                      alt={member.name}
                      style={imgStyle}
                    />
                  </div>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="overflow-y-auto flex-1 overscroll-contain" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(217,4,41,0.2) transparent" }}>
                <div className="px-7 pb-8 space-y-6">

                  {/* Name + Role */}
                  <div className="text-center">
                    <h3 className="font-orbitron text-xl font-black text-white uppercase tracking-wider">
                      {member.name}
                    </h3>
                    <p className="text-[10px] text-[#D90429] font-orbitron tracking-widest uppercase mt-1.5 font-bold leading-snug max-w-xs mx-auto">
                      {member.role}
                    </p>
                  </div>

                  {/* Description */}
                  <div className="bg-[#0D0D0D] border border-[rgba(217,4,41,0.1)] rounded-xl p-4 text-[11px] text-[#B0B0B0] font-light leading-relaxed space-y-3">
                    {member.description.split("\n\n").map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>

                  {/* Dynamic modal sections */}
                  {member.modalSections.map((section, i) => (
                    <ModalSectionBlock key={i} section={section} />
                  ))}

                  {/* Quote */}
                  <div className="relative bg-[#0D0D0D] border border-[rgba(217,4,41,0.15)] rounded-xl p-4 overflow-hidden">
                    <div className="absolute -top-3 -left-1 text-6xl text-crimson/10 font-serif select-none pointer-events-none leading-none">&ldquo;</div>
                    <p className="text-xs text-[#C0C0C0] italic leading-relaxed font-light pl-3 relative z-10">
                      {member.quote}
                    </p>
                    <div className="mt-2 text-[9px] font-orbitron text-[#D90429]/60 tracking-widest uppercase pl-3">
                      — {member.name}, {member.leadershipPosition.replace("_", " ")}
                    </div>
                  </div>

                </div>
              </div>

              {/* Bottom bar */}
              <div className="px-7 py-3 border-t border-[#111] bg-[#050505] flex justify-between items-center flex-shrink-0">
                <span className="text-[9px] font-orbitron text-[#333] uppercase tracking-widest">CODEXA BOARD</span>
                <span className="text-[9px] font-orbitron text-[#D90429]/40 uppercase tracking-widest">🔒 LOCKED</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
