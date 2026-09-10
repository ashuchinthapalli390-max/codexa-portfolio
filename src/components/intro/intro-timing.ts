/**
 * CODEXA AGENCY — Cinematic Intro Animation Timing Milestones
 * Precision milestones in milliseconds for smooth timeline choreography.
 */

export const INTRO_TIMING = {
  // Phase 1: Opening scene (HUD + line activation)
  OPENING_START: 0,
  HUD_ACTIVE_TEXT: 400, // Switch to "SECURE EXPERIENCE CHANNEL // ACTIVE"
  
  // Phase 2: Wordmark multilingual morph ("CODEXA AGENCY")
  WORDMARK_START: 800,
  WORDMARK_CHAR_STAGGER_MS: 90, // 70-110ms staggered character delay
  
  // Phase 3: Logo reveal & halo glow
  LOGO_START: 3000,
  
  // Phase 4: Leadership reveals (Founders)
  FOUNDER_START: 3800, // ASHU
  COFOUNDER_START: 5000, // SANJAY
  CEO_START: 6200, // KISHORE
  
  // Phase 5: Final Brand Lockup & Tagline
  FINAL_LOCKUP_START: 7400,
  
  // Phase 6: Fade into homepage
  REVEAL_START: 8800,
  
  // Hard completion & overlay unmount
  COMPLETED: 9600,
  
  // Fail-safe maximum timeout (auto reveal if anything hangs)
  FAILSAFE_TIMEOUT_MS: 12000,
} as const;

export type IntroPhase =
  | "opening"
  | "wordmark"
  | "logo"
  | "founder"
  | "coFounder"
  | "ceo"
  | "finalLockup"
  | "revealing"
  | "done";
