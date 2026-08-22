"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Sparkles } from "lucide-react";
import { FAQItemData } from "@/data/faqs";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface FAQItemProps {
  faq: FAQItemData;
  isOpen: boolean;
  onToggle: () => void;
}

export function FAQItem({ faq, isOpen, onToggle }: FAQItemProps) {
  const isReduced = useReducedMotion();

  const answerId = `faq-answer-${faq.id}`;
  const buttonId = `faq-button-${faq.id}`;

  return (
    <motion.div
      layout={!isReduced}
      id={`faq-${faq.id}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative rounded-2xl transition-all duration-300 overflow-hidden ${
        isOpen
          ? "bg-[#0E0E0E] border border-bright-red/60 shadow-[0_0_30px_rgba(217,4,41,0.18)]"
          : "bg-[#0A0A0A]/90 hover:bg-[#0D0D0D] border border-crimson/20 hover:border-crimson/50 hover:shadow-[0_0_20px_rgba(217,4,41,0.08)]"
      }`}
    >
      {/* Laser scan line on hover */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-bright-red to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Cyber corner accents on open */}
      {isOpen && (
        <>
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-bright-red pointer-events-none" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-bright-red pointer-events-none" />
        </>
      )}

      {/* Accordion Header / Clickable Trigger */}
      <motion.button
        id={buttonId}
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={answerId}
        whileTap={isReduced ? {} : { scale: 0.99 }}
        className="w-full p-5 sm:p-6 text-left flex items-start justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bright-red rounded-2xl"
      >
        <div className="space-y-2 flex-1 pr-2">
          {/* Category Tag & Featured Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-orbitron font-black uppercase tracking-[0.2em] px-2.5 py-0.5 rounded-full bg-crimson/15 border border-crimson/30 text-bright-red">
              {faq.category}
            </span>

            {faq.featured && (
              <span className="inline-flex items-center gap-1 text-[9px] font-orbitron font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Sparkles className="w-2.5 h-2.5" /> FEATURED QUESTION
              </span>
            )}
          </div>

          {/* Question Text */}
          <h3
            className={`font-orbitron font-bold text-sm sm:text-base tracking-wide transition-colors leading-snug ${
              isOpen
                ? "text-white"
                : "text-[#E0E0E0] group-hover:text-white"
            }`}
          >
            {faq.question}
          </h3>
        </div>

        {/* Plus / Close Icon Indicator */}
        <div
          className={`relative flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-300 ${
            isOpen
              ? "bg-crimson border-bright-red text-white shadow-[0_0_12px_rgba(217,4,41,0.5)]"
              : "bg-[#141414] border-white/10 text-[#888888] group-hover:border-crimson/50 group-hover:text-white"
          }`}
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0, scale: isOpen ? 1.05 : 1 }}
            transition={
              isReduced
                ? { duration: 0.1 }
                : { type: "spring", stiffness: 350, damping: 25 }
            }
          >
            <Plus className="w-4 h-4" />
          </motion.div>
        </div>
      </motion.button>

      {/* Expandable Answer Body */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={answerId}
            role="region"
            aria-labelledby={buttonId}
            initial={
              isReduced
                ? { opacity: 0 }
                : { height: 0, opacity: 0, y: -6 }
            }
            animate={
              isReduced
                ? { opacity: 1 }
                : { height: "auto", opacity: 1, y: 0 }
            }
            exit={
              isReduced
                ? { opacity: 0 }
                : { height: 0, opacity: 0, y: -6 }
            }
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-6 sm:px-6 sm:pb-6 pt-1 text-xs sm:text-sm text-[#B0B0B0] font-light leading-relaxed border-t border-white/5 space-y-3">
              <p className="border-l-2 border-crimson/50 pl-3.5 whitespace-pre-line text-[#CCCCCC]">
                {faq.answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
