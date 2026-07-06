/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, X } from "lucide-react";
import { SectionHeading } from "../ui/SectionHeading";
import { MediaAsset } from "../ui/MediaAsset";
import { LeadershipCard } from "../ui/LeadershipCard";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { LEADERSHIP_DATA, LEADERSHIP_ORDER } from "@/config/leadershipData";
import { getProfileImageStyle } from "@/lib/profile-media";

interface PublicProfile {
  id: string;
  memberType: "LEADERSHIP" | "CORE_TEAM";
  leadershipPosition: "FOUNDER" | "CO_FOUNDER" | "CEO" | null;
  displayName: string;
  publicBio: string | null;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  cropX?: number | null;
  cropY?: number | null;
  cropW?: number | null;
  cropH?: number | null;
  cropRotation?: number | null;
  displayOrder: number;
  updatedAt?: string | null;
}

export function TeamSection() {
  const isReduced = useReducedMotion();

  const [coreTeam, setCoreTeam] = useState<PublicProfile[]>([]);
  const [leadershipProfiles, setLeadershipProfiles] = useState<Record<string, PublicProfile>>({});
  const [loading, setLoading] = useState(true);

  // For core team member detail modal
  const [selectedCoreTeamMember, setSelectedCoreTeamMember] = useState<PublicProfile | null>(null);
  const [isCoreTeamOpen, setIsCoreTeamOpen] = useState(false);

  // Load public team listing
  useEffect(() => {
    fetch("/api/team/public")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const profiles: PublicProfile[] = data.profiles;

          // Build a map of leadershipPosition → PublicProfile from DB
          const profMap: Record<string, PublicProfile> = {};
          profiles
            .filter((p) => p.memberType === "LEADERSHIP" && p.leadershipPosition)
            .forEach((p) => {
              profMap[p.leadershipPosition!] = p;
            });
          setLeadershipProfiles(profMap);

          // Core Team profiles
          setCoreTeam(profiles.filter((p) => p.memberType === "CORE_TEAM"));
        }
      })
      .catch((e) => console.error("Error loading public team profiles:", e))
      .finally(() => setLoading(false));
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedCoreTeamMember) setSelectedCoreTeamMember(null);
        else if (isCoreTeamOpen) setIsCoreTeamOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCoreTeamMember, isCoreTeamOpen]);

  return (
    <section id="team" className="relative py-20 bg-[#070707] overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-crimson/5 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">

        {/* Section Heading */}
        <SectionHeading
          badge="Our Executive Board"
          title="Meet the People Behind CodeXa"
          subtitle="A specialized team of engineers, operations experts, and developer community organizers building the digital future."
          align="center"
        />

        {/* Intro banner */}
        <div className="max-w-4xl mx-auto mb-12 relative rounded-xl overflow-hidden border border-crimson/20 shadow-neon">
          <MediaAsset
            type="video"
            src="/assets/media/raw/team-intro.gif"
            videoSources={[
              "/assets/media/team-intro.webm",
              "/assets/media/team-intro.mp4"
            ]}
            poster="/assets/media/team-intro-poster.webp"
            alt="CodeXa Team Introduction Banner"
            fallbackLabel="team-intro"
            objectFit="cover"
            overlay={true}
            className="w-full h-48 sm:h-64 md:h-72 opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-transparent to-transparent opacity-85 pointer-events-none" />
        </div>

        {/* ─── LEADERSHIP CARDS (Premium Detailed) ─────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="relative flex flex-col items-center p-6 rounded-2xl border border-crimson/15 bg-gradient-to-b from-deep-red/5 to-card animate-pulse h-[340px]" />
            ))
          ) : (
            LEADERSHIP_ORDER.map((position, index) => {
              const data = LEADERSHIP_DATA[position];
              if (!data) return null;
              const prof = leadershipProfiles[position];
              return (
                <LeadershipCard
                  key={position}
                  member={data}
                  mediaUrl={prof?.mediaUrl ?? null}
                  cropX={prof?.cropX}
                  cropY={prof?.cropY}
                  cropW={prof?.cropW}
                  cropH={prof?.cropH}
                  cropRotation={prof?.cropRotation}
                  updatedAt={prof?.updatedAt}
                  index={index}
                />
              );
            })
          )}
        </div>

        {/* ─── CENTRED CORE TEAM HOLOGRAPHIC CARD ─────────────────── */}
        <div className="flex justify-center w-full relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={isReduced ? {} : { scale: 1.03 }}
            onClick={() => setIsCoreTeamOpen(true)}
            className="w-full max-w-lg p-[1px] rounded-2xl cursor-pointer select-none"
            style={{
              background: "linear-gradient(135deg, rgba(217,4,41,0.4), rgba(7,7,7,0.8), rgba(217,4,41,0.2))",
              boxShadow: "0 10px 40px rgba(217,4,41,0.1)",
            }}
          >
            <div className="rounded-2xl p-8 bg-[#090909]/95 backdrop-blur-md border border-[rgba(217,4,41,0.15)] hover:border-[#D90429]/50 transition-all duration-300 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-32 h-32 bg-[#D90429]/5 rounded-full blur-2xl pointer-events-none group-hover:bg-[#D90429]/10 transition-colors" />

              {/* Icon */}
              <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 relative overflow-hidden bg-[#111111] border border-crimson/25 group-hover:border-bright-red/50 shadow-[0_0_15px_rgba(217,4,41,0.15)] group-hover:shadow-[0_0_20px_rgba(217,4,41,0.3)] transition-all">
                <Users className="w-6 h-6 text-[#D90429] animate-pulse" />
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-orbitron font-bold text-lg text-white uppercase tracking-wider group-hover:text-[#D90429] transition-colors">
                  Core Team
                </h3>
                <p className="text-xs text-[#A5A5A5] mt-1 font-light">
                  Meet our talented members driving operations, graphics, and full-stack execution.
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-2.5 mt-3">
                  <span className="text-[10px] font-orbitron tracking-widest text-[#D90429] bg-[#D90429]/10 px-3 py-1 rounded-full uppercase border border-[#D90429]/20 font-bold">
                    {loading ? "..." : `${coreTeam.length} Members`}
                  </span>
                  <span className="text-[10px] text-[#555] font-orbitron tracking-wider">CLICK TO VIEW</span>
                </div>
              </div>

              <div className="hidden sm:block absolute right-6 top-6">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#A5A5A5] group-hover:text-[#D90429] transition-all" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.22 14.78a.75.75 0 0 0 1.06 0l7.22-7.22v5.69a.75.75 0 0 0 1.5 0v-7.5a.75.75 0 0 0-.75-.75h-7.5a.75.75 0 0 0 0 1.5h5.69l-7.22 7.22a.75.75 0 0 0 0 1.06Z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </motion.div>
        </div>

      </div>

      {/* ─── CORE TEAM MEMBER DETAIL MODAL ───────────────────────── */}
      <AnimatePresence>
        {selectedCoreTeamMember && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedCoreTeamMember(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0A0A0A] border border-[rgba(217,4,41,0.25)] rounded-2xl w-full max-w-sm overflow-hidden relative text-center"
              style={{ boxShadow: "0 0 35px rgba(217,4,41,0.2)" }}
            >
              <button
                onClick={() => setSelectedCoreTeamMember(null)}
                className="absolute right-4 top-4 z-10 bg-[#111] hover:bg-[#222] p-1.5 rounded-full text-[#A5A5A5] hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-8 flex flex-col items-center">
                {(() => {
                  const modalImage = getProfileImageStyle(selectedCoreTeamMember);
                  return (
                    <div className="relative w-24 h-24 rounded-full border border-crimson/20 overflow-hidden mb-5 bg-[#151515] flex items-center justify-center">
                      {selectedCoreTeamMember.mediaUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={modalImage.src}
                          alt={selectedCoreTeamMember.displayName}
                          style={modalImage.imgStyle}
                        />
                      ) : (
                        <span className="font-orbitron font-bold text-xl text-[#A5A5A5]">CX</span>
                      )}
                    </div>
                  );
                })()}

                <h3 className="font-orbitron text-lg font-bold text-white uppercase tracking-wider">
                  {selectedCoreTeamMember.displayName}
                </h3>
                <span className="text-[9px] text-[#D90429] font-orbitron tracking-widest uppercase mt-1 font-bold">
                  CORE TEAM
                </span>

                <div className="w-12 h-[1px] bg-crimson/20 my-4" />

                {selectedCoreTeamMember.publicBio ? (
                  <p className="text-xs text-[#A5A5A5] leading-relaxed font-light max-w-xs">
                    {selectedCoreTeamMember.publicBio}
                  </p>
                ) : (
                  <p className="text-xs text-[#444] italic">No bio available yet.</p>
                )}
              </div>

              <div className="px-6 py-3 border-t border-[#111] bg-[#050505] text-center">
                <span className="text-[9px] font-orbitron text-[#333] uppercase tracking-widest">CODEXA FORCE</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── CORE TEAM GRID MODAL ─────────────────────────────────── */}
      <AnimatePresence>
        {isCoreTeamOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="bg-[#070707] border border-[rgba(217,4,41,0.2)] rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col relative"
              style={{ boxShadow: "0 15px 50px rgba(217,4,41,0.15)" }}
            >
              <button
                onClick={() => setIsCoreTeamOpen(false)}
                className="absolute right-6 top-6 z-10 bg-[#111] hover:bg-[#222] p-2 rounded-full text-[#A5A5A5] hover:text-white transition-all shadow-md"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="px-8 pt-8 pb-4 border-b border-[#111111]">
                <span className="text-[10px] font-orbitron text-[#D90429] tracking-[0.3em] uppercase">CodeXa Force</span>
                <h2 className="font-orbitron text-2xl font-bold text-white tracking-wide mt-1 uppercase">Core Team Workspace</h2>
                <p className="text-xs text-[#A5A5A5] mt-1 font-light">Our backend, design, operations, and graphics execution department.</p>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-[radial-gradient(circle_at_top,rgba(217,4,41,0.03)_0%,transparent_60%)]">
                {coreTeam.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <span className="text-4xl animate-pulse">👥</span>
                    <p className="text-sm font-orbitron text-[#A5A5A5] tracking-wide uppercase">
                      Core Team profiles will appear here soon.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                    {coreTeam.map((member) => (
                      <motion.div
                        key={member.id}
                        whileHover={{ y: -5 }}
                        onClick={() => { setSelectedCoreTeamMember(member); setIsCoreTeamOpen(false); }}
                        className="bg-[#0B0B0B] border border-[rgba(217,4,41,0.15)] hover:border-[#D90429]/50 rounded-2xl p-4 text-center cursor-pointer transition-all duration-300 flex flex-col items-center group relative overflow-hidden"
                      >
                        {(() => {
                          const gridImage = getProfileImageStyle(member);
                          return (
                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-crimson/20 overflow-hidden mb-3 bg-[#111111] flex items-center justify-center group-hover:border-bright-red/50 transition-colors flex-shrink-0">
                              {member.mediaUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={gridImage.src}
                                  alt={member.displayName}
                                  style={gridImage.imgStyle}
                                  className="filter saturate-75 group-hover:saturate-100 transition-all duration-300"
                                />
                              ) : (
                                <span className="font-orbitron font-bold text-xs text-[#555] uppercase">CX</span>
                              )}
                            </div>
                          );
                        })()}

                        <h4 className="font-orbitron text-xs font-bold text-white tracking-wide truncate w-full group-hover:text-bright-red transition-colors">
                          {member.displayName}
                        </h4>
                        <div className="text-[8px] font-mono text-[#D90429] uppercase tracking-widest mt-1">
                          CORE // TEAM
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-8 py-4 border-t border-[#111111] bg-[#0A0A0A]/50 flex justify-between items-center text-[10px] font-orbitron text-[#333]">
                <span>ESC TO CLOSE</span>
                <span>🔒 VERIFIED SECURED PROFILES</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
