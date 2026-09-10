/**
 * CODEXA AGENCY — 30-Second Cinematic Intro Animation Timing Milestones
 * Calibrated 30-second choreography: cinematic, readable, smooth, and intentional.
 */

export const INTRO_TIMING = {
  // Scene 1: Black cinematic opening (00.0–02.5s)
  SCENE_1_START: 0,
  HUD_ACTIVE_TEXT: 1400,

  // Scene 2: CodeXa system activation (02.5–05.0s)
  SCENE_2_ACTIVATION_START: 2500,

  // Scene 3: Multilingual CODEXA AGENCY transformation (05.0–12.0s, 7.0s)
  SCENE_3_WORDMARK_START: 5000,
  WORDMARK_CHAR_STAGGER_MS: 110, // 90ms to 140ms per character
  WORDMARK_LANGUAGE_HOLD_MS: 220, // 180ms to 300ms per language variant
  WORDMARK_SETTLE_MS: 750, // 600ms to 900ms settle

  // Scene 4: Logo formation and halo (12.0–15.0s, 3.0s)
  SCENE_4_LOGO_START: 12000,

  // Scene 5: Founder — Ashu (15.0–20.0s, 5.0s)
  SCENE_5_FOUNDER_START: 15000,

  // Scene 6: Co-Founder — Sanjay (20.0–25.0s, 5.0s)
  SCENE_6_COFOUNDER_START: 20000,

  // Scene 7: CEO — Kishore (25.0–29.0s, 4.0s)
  SCENE_7_CEO_START: 25000,

  // Scene 8: Final CodeXa brand lockup & reveal (29.0–30.0s, 1.0s)
  SCENE_8_FINAL_LOCKUP_START: 29000,

  // Homepage smooth reveal trigger (at 30.0s)
  REVEAL_START: 30000,

  // Hard completion & overlay unmount
  COMPLETED: 30800,

  // Fail-safe maximum timeout
  FAILSAFE_TIMEOUT_MS: 33000,
} as const;

export type IntroPhase =
  | "opening"
  | "activation"
  | "wordmark"
  | "logo"
  | "founder"
  | "coFounder"
  | "ceo"
  | "finalLockup"
  | "revealing"
  | "done";
