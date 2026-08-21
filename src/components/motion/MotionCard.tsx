"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cardRevealVariants, cardHoverVariants } from "@/lib/motion";

interface MotionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  enableHover?: boolean;
  delay?: number;
}

export function MotionCard({
  children,
  className = "",
  enableHover = true,
  delay = 0,
  ...props
}: MotionCardProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <div className={`cyber-card ${className}`} {...(props as any)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      variants={cardRevealVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay }}
      whileHover={enableHover ? { scale: 1.015, y: -3, transition: { duration: 0.2 } } : undefined}
      whileTap={enableHover ? { scale: 0.985, y: 0 } : undefined}
      className={className}
      {...(props as any)}
    >
      {children}
    </motion.div>
  );
}
