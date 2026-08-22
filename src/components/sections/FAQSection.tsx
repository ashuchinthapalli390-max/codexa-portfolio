"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
  Layers,
  MessageSquareCode
} from "lucide-react";
import { FAQS_DATA, FAQCategory, FAQItemData } from "@/data/faqs";
import { FAQFilters } from "@/components/faq/FAQFilters";
import { FAQItem } from "@/components/faq/FAQItem";
import { sectionRevealVariants, staggerContainerVariants, buttonHoverVariants } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface FAQSectionProps {
  initialFaqs?: FAQItemData[];
}

export function FAQSection({ initialFaqs = FAQS_DATA }: FAQSectionProps) {
  const isReduced = useReducedMotion();

  // Filter & Search state
  const [selectedCategory, setSelectedCategory] = useState<FAQCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [openItemIds, setOpenItemIds] = useState<Set<string>>(new Set(["what-is-codexa"]));

  // Filtered FAQs list based on category and query
  const filteredFaqs = useMemo(() => {
    return initialFaqs.filter((faq) => {
      // Category check
      const matchesCategory =
        selectedCategory === "ALL" || faq.category === selectedCategory;

      if (!matchesCategory) return false;

      // Search query check
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      return (
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q) ||
        faq.category.toLowerCase().includes(q)
      );
    });
  }, [initialFaqs, selectedCategory, searchQuery]);

  // Are all currently visible FAQs open?
  const allVisibleOpen = useMemo(() => {
    if (filteredFaqs.length === 0) return false;
    return filteredFaqs.every((faq) => openItemIds.has(faq.id));
  }, [filteredFaqs, openItemIds]);

  // Toggle single FAQ open/closed
  const handleToggleItem = (id: string) => {
    setOpenItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle Open All / Close All for visible items
  const handleToggleAll = () => {
    if (allVisibleOpen) {
      // Close all currently visible
      setOpenItemIds((prev) => {
        const next = new Set(prev);
        filteredFaqs.forEach((faq) => next.delete(faq.id));
        return next;
      });
    } else {
      // Open all currently visible
      setOpenItemIds((prev) => {
        const next = new Set(prev);
        filteredFaqs.forEach((faq) => next.add(faq.id));
        return next;
      });
    }
  };

  // Deep linking: Check URL hash on mount or hash change
  useEffect(() => {
    const handleHashCheck = () => {
      if (typeof window === "undefined") return;
      const hash = window.location.hash.replace("#", "");
      if (!hash) return;

      const matchedFaq = initialFaqs.find(
        (f) => f.id === hash || `faq-${f.id}` === hash || f.id.replace(/-/g, "") === hash
      );

      if (matchedFaq) {
        setSelectedCategory(matchedFaq.category);
        setOpenItemIds((prev) => new Set(prev).add(matchedFaq.id));

        setTimeout(() => {
          const el = document.getElementById(`faq-${matchedFaq.id}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 300);
      }
    };

    handleHashCheck();
    window.addEventListener("hashchange", handleHashCheck);
    return () => window.removeEventListener("hashchange", handleHashCheck);
  }, [initialFaqs]);

  // Schema.org FAQPage Structured Data for SEO
  const jsonLd = useMemo(() => {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: initialFaqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    };
  }, [initialFaqs]);

  return (
    <section id="faq" className="relative py-24 sm:py-32 bg-[#070707] text-white overflow-hidden">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Background Ambient Cyber Lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[500px] bg-crimson/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute -bottom-24 right-1/4 w-[400px] h-[350px] bg-deep-red/8 rounded-full blur-[140px] pointer-events-none" />

      {/* Cyber Grid Lines Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        
        {/* ─── 1. SECTION HEADER ───────────────────────────────────────────── */}
        <motion.div
          variants={sectionRevealVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="text-center max-w-3xl mx-auto space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-deep-red/30 border border-crimson/40 shadow-[0_0_15px_rgba(217,4,41,0.2)]">
            <HelpCircle className="w-3.5 h-3.5 text-bright-red animate-pulse" />
            <span className="text-[10px] font-orbitron font-bold tracking-[0.25em] text-bright-red uppercase">
              FAQ / KNOWLEDGE BASE
            </span>
          </div>

          <h2 className="font-orbitron font-black text-3xl sm:text-4xl md:text-5xl text-white tracking-wider uppercase">
            FREQUENTLY ASKED <span className="text-crimson">QUESTIONS</span>
          </h2>

          <p className="text-xs sm:text-sm text-[#A0A0A0] font-light leading-relaxed max-w-2xl mx-auto">
            Everything you may want to know about CodeXa Agency, our services, development approach, projects, internships, security, support and collaboration.
          </p>
        </motion.div>

        {/* ─── 2. CONTROLS: SEARCH & OPEN/CLOSE ALL ────────────────────────── */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 text-[#666666] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions, services, security..."
                className="w-full bg-[#0D0D0D] border border-crimson/25 rounded-2xl pl-11 pr-10 py-3 text-xs text-white placeholder-[#555555] outline-none focus:border-bright-red focus:shadow-[0_0_15px_rgba(217,4,41,0.2)] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-[#777777] hover:text-white hover:bg-[#1A1A1A] transition-colors"
                  title="Clear Search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dynamic Open All / Close All Button */}
            {filteredFaqs.length > 0 && (
              <motion.button
                variants={buttonHoverVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={handleToggleAll}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#111111] hover:bg-[#161616] border border-crimson/30 hover:border-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {allVisibleOpen ? (
                  <>
                    <ChevronUp className="w-4 h-4 text-bright-red" />
                    <span>CLOSE ALL</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 text-bright-red" />
                    <span>OPEN ALL</span>
                  </>
                )}
                <span className="text-[10px] font-mono text-[#777777]">({filteredFaqs.length})</span>
              </motion.button>
            )}

          </div>

          {/* Category Filter Pills */}
          <FAQFilters
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            faqs={initialFaqs}
          />
        </div>

        {/* ─── 3. FAQ ACCORDION LIST ───────────────────────────────────────── */}
        <div className="space-y-3.5 min-h-[300px]">
          {filteredFaqs.length === 0 ? (
            
            /* Empty State */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="text-center py-16 px-6 rounded-3xl bg-[#0A0A0A] border border-white/5 space-y-4 max-w-md mx-auto"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#121212] border border-crimson/30 flex items-center justify-center mx-auto text-bright-red">
                <HelpCircle className="w-6 h-6" />
              </div>
              
              <div className="space-y-1">
                <h4 className="font-orbitron font-black text-sm text-white uppercase tracking-wider">
                  NO FAQ RESULTS
                </h4>
                <p className="text-xs text-[#777777] leading-relaxed">
                  We could not find a question matching &quot;{searchQuery}&quot;.
                </p>
              </div>

              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("ALL");
                }}
                className="px-5 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(217,4,41,0.3)]"
              >
                CLEAR SEARCH
              </button>
            </motion.div>

          ) : (

            /* Accordion Items List */
            <motion.div
              variants={staggerContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="space-y-3.5"
            >
              <AnimatePresence mode="popLayout">
                {filteredFaqs.map((faq) => (
                  <FAQItem
                    key={faq.id}
                    faq={faq}
                    isOpen={openItemIds.has(faq.id)}
                    onToggle={() => handleToggleItem(faq.id)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>

          )}
        </div>

        {/* ─── 4. FINAL CTA BELOW FAQ ──────────────────────────────────────── */}
        <motion.div
          variants={sectionRevealVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="pt-8 border-t border-white/5"
        >
          <div className="rounded-3xl bg-gradient-to-r from-deep-red/20 via-[#0A0A0A] to-[#0A0A0A] border border-crimson/30 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-[0_0_30px_rgba(217,4,41,0.1)]">
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 text-[10px] font-orbitron text-bright-red font-bold uppercase tracking-widest">
                <MessageSquareCode className="w-3.5 h-3.5" /> HAVE A SPECIFIC REQUIREMENT?
              </div>
              <h3 className="font-orbitron font-black text-lg sm:text-xl text-white uppercase">
                Still have a question? Tell us what you&apos;re building.
              </h3>
              <p className="text-xs text-[#888888] font-light">
                Our leadership and technical team are available to discuss architecture, timeline, and collaboration.
              </p>
            </div>

            <motion.div variants={buttonHoverVariants} whileHover="hover" whileTap="tap" className="flex-shrink-0">
              <a
                href="#contact"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(217,4,41,0.4)] group"
              >
                CONTACT CODEXA <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </motion.div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
