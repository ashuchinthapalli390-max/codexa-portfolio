"use client";

import React from "react";
import { CodexaCinematicIntro } from "@/components/intro/CodexaCinematicIntro";

interface LoadingScreenProps {
  onComplete: () => void;
}

/**
 * Re-exports the unified CodexaCinematicIntro for full backwards compatibility
 * completely free of any video assets or legacy video playback logic.
 */
export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  return <CodexaCinematicIntro onComplete={onComplete} />;
}
