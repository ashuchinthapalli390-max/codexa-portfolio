"use client";

import React, { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

interface MotionNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function MotionNumber({
  value,
  duration = 1.2,
  prefix = "",
  suffix = "",
  className = "",
}: MotionNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isInView || shouldReduceMotion) {
      setDisplayValue(value);
      return;
    }

    let startTimestamp: number | null = null;
    const startValue = 0;
    const endValue = value;
    const totalDurationMs = duration * 1000;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / totalDurationMs, 1);

      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startValue + (endValue - startValue) * easeProgress);

      setDisplayValue(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
      }
    };

    const animId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animId);
  }, [isInView, value, duration, shouldReduceMotion]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}
