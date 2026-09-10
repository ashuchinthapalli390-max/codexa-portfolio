/**
 * CODEXA AGENCY — 50-Second Cinematic Intro Animation Timing Milestones
 * Precision 50-second choreography with slow, deliberate, ultra-premium pacing.
 */

export const INTRO_TIMING = {
  // Scene 1: Black cinematic initialization (00.0–05.0s)
  SCENE_1_START: 0,
  HUD_ACTIVE_TEXT: 2500, // Transforms to "SECURE EXPERIENCE CHANNEL // ACTIVE" at 2.5s

  // Scene 2: CodeXa system activation (05.0–09.0s)
  SCENE_2_ACTIVATION_START: 5000,

  // Scene 3: Multilingual CODEXA AGENCY transformation (09.0–21.0s, 12 full seconds)
  SCENE_3_WORDMARK_START: 9000,
  WORDMARK_CHAR_STAGGER_MS: 160, // 140ms to 200ms per character
  WORDMARK_LANGUAGE_HOLD_MS: 380, // 250ms to 450ms per language variant
  WORDMARK_SETTLE_MS: 1000, // Final settle duration

  // Scene 4: Logo formation and glow (21.0–26.0s, 5 seconds)
  SCENE_4_LOGO_START: 21000,

  // Scene 5: Founder — Ashu (26.0–34.0s, 8 seconds)
  SCENE_5_FOUNDER_START: 26000,

  // Scene 6: Co-Founder — Sanjay (34.0–42.0s, 8 seconds)
  SCENE_6_COFOUNDER_START: 34000,

  // Scene 7: CEO — Kishore (42.0–48.0s, 6 seconds)
  SCENE_7_CEO_START: 42000,

  // Scene 8: Final CodeXa brand lockup & reveal (48.0–50.0s, 2 seconds)
  SCENE_8_FINAL_LOCKUP_START: 48000,

  // Homepage smooth reveal trigger (at 50.0s)
  REVEAL_START: 50000,

  // Hard completion & overlay unmount
  COMPLETED: 51000,

  // Fail-safe maximum timeout
  FAILSAFE_TIMEOUT_MS: 55000,
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
