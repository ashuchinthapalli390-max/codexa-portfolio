"use client";

import React from "react";
import { motion } from "framer-motion";
import { FAQCategory, FAQ_CATEGORIES, FAQItemData } from "@/data/faqs";

interface FAQFiltersProps {
  selectedCategory: FAQCategory;
  onSelectCategory: (category: FAQCategory) => void;
  faqs: FAQItemData[];
}

export function FAQFilters({
  selectedCategory,
  onSelectCategory,
  faqs,
}: FAQFiltersProps) {
  // Count items per category
  const getCategoryCount = (category: FAQCategory) => {
    if (category === "ALL") return faqs.length;
    return faqs.filter((f) => f.category === category).length;
  };

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2 -my-2 flex justify-start sm:justify-center">
      <div className="inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#0C0C0C] border border-white/5 shadow-inner">
        {FAQ_CATEGORIES.map((category) => {
          const isSelected = selectedCategory === category;
          const count = getCategoryCount(category);

          return (
            <button
              key={category}
              onClick={() => onSelectCategory(category)}
              className={`relative px-3.5 py-2 rounded-xl text-[11px] font-orbitron font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bright-red ${
                isSelected
                  ? "text-white"
                  : "text-[#888888] hover:text-[#CCCCCC] hover:bg-[#141414]"
              }`}
            >
              {/* Active Animated Background Pill */}
              {isSelected && (
                <motion.div
                  layoutId="activeFaqFilterPill"
                  className="absolute inset-0 rounded-xl bg-crimson border border-bright-red shadow-[0_0_15px_rgba(217,4,41,0.35)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}

              <span className="relative z-10">{category}</span>
              <span
                className={`relative z-10 text-[9px] font-mono px-1.5 py-0.2 rounded-full ${
                  isSelected
                    ? "bg-white/20 text-white font-bold"
                    : "bg-[#181818] text-[#666666]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
