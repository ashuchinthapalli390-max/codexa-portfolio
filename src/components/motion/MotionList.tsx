"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";

interface MotionListProps {
  children: React.ReactNode;
  className?: string;
}

export function MotionList({ children, className = "" }: MotionListProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-20px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface MotionListItemProps {
  children: React.ReactNode;
  className?: string;
}

export function MotionListItem({ children, className = "" }: MotionListItemProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}
