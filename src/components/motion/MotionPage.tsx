"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { pageVariants } from "@/lib/motion";

interface MotionPageProps {
  children: React.ReactNode;
  className?: string;
}

export function MotionPage({ children, className = "" }: MotionPageProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}
