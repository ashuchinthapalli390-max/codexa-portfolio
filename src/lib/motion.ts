/**
 * CodeXa Unified Motion Design System Tokens & Variants
 * Framer Motion 11+
 *
 * Visual Identity:
 * - Black / Cyber Dark / Crimson Glow / Tech Grid
 * - Snappy Developer Network Timings (120ms - 350ms)
 * - Cubic-bezier & spring dynamics
 * - Fully accessible & respects prefers-reduced-motion
 */

import { Variants, Transition } from "framer-motion";

// ─── TIMING & TRANSITION TOKENS ──────────────────────────────────────────────

export const transitions = {
  // Snappy button and micro-interactions
  fast: {
    duration: 0.15,
    ease: [0.25, 1, 0.5, 1],
  } as Transition,

  // Standard component enters & exits
  default: {
    duration: 0.25,
    ease: [0.16, 1, 0.3, 1],
  } as Transition,

  // Smooth modal and dialog zooms
  modal: {
    duration: 0.3,
    ease: [0.19, 1, 0.22, 1],
  } as Transition,

  // Page transitions
  page: {
    duration: 0.35,
    ease: [0.22, 1, 0.36, 1],
  } as Transition,

  // Spring physics for dynamic popups / notifications / digits
  spring: {
    type: "spring",
    damping: 24,
    stiffness: 300,
    mass: 0.8,
  } as Transition,

  springBouncy: {
    type: "spring",
    damping: 18,
    stiffness: 380,
  } as Transition,
};

// ─── PAGE TRANSITIONS ────────────────────────────────────────────────────────

export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
    filter: "blur(4px)",
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(4px)",
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1],
    },
  },
};

// ─── SECTION REVEAL ──────────────────────────────────────────────────────────

export const sectionRevealVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 28,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

// ─── CARD REVEALS & HOVERS ───────────────────────────────────────────────────

export const cardRevealVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export const cardHoverVariants: Variants = {
  initial: {
    scale: 1,
    y: 0,
  },
  hover: {
    scale: 1.015,
    y: -3,
    transition: {
      duration: 0.2,
      ease: [0.2, 0.8, 0.2, 1],
    },
  },
  tap: {
    scale: 0.985,
    y: 0,
    transition: {
      duration: 0.1,
    },
  },
};

// ─── STAGGER CONTAINERS ──────────────────────────────────────────────────────

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

export const staggerFastContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.02,
    },
  },
};

export const staggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 14,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export const staggerItemFade: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.2,
    },
  },
};

// ─── BUTTON INTERACTIONS ─────────────────────────────────────────────────────

export const buttonHoverVariants: Variants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.025,
    transition: { duration: 0.15, ease: "easeOut" },
  },
  tap: {
    scale: 0.96,
    transition: { duration: 0.08, ease: "easeIn" },
  },
};

export const buttonPressVariants: Variants = {
  initial: { scale: 1 },
  tap: {
    scale: 0.95,
    transition: { duration: 0.08, ease: "easeIn" },
  },
};

// ─── MODAL & DIALOG ANIMATIONS ───────────────────────────────────────────────

export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.25 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

export const modalDialogVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.94,
    y: 12,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 26,
      stiffness: 340,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 8,
    transition: {
      duration: 0.18,
      ease: "easeIn",
    },
  },
};

export const drawerVariants: Variants = {
  hidden: {
    x: "100%",
    opacity: 0.5,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 28,
      stiffness: 320,
    },
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: {
      duration: 0.22,
      ease: [0.4, 0, 1, 1],
    },
  },
};

// ─── TOAST NOTIFICATIONS ─────────────────────────────────────────────────────

export const toastVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -20,
    scale: 0.92,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 350,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    y: -10,
    transition: {
      duration: 0.18,
      ease: "easeOut",
    },
  },
};

// ─── SPECIALTY CYBER / SECURITY MICRO-ANIMATIONS ─────────────────────────────

export const errorShakeVariants: Variants = {
  initial: { x: 0 },
  shake: {
    x: [-8, 8, -6, 6, -3, 3, 0],
    transition: {
      duration: 0.45,
      ease: "easeInOut",
    },
  },
};

export const successPulseVariants: Variants = {
  initial: { scale: 1, opacity: 1 },
  pulse: {
    scale: [1, 1.06, 1],
    boxShadow: [
      "0 0 0 rgba(16, 185, 129, 0)",
      "0 0 25px rgba(16, 185, 129, 0.4)",
      "0 0 0 rgba(16, 185, 129, 0)",
    ],
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

export const digitPopVariants: Variants = {
  initial: {
    scale: 0.7,
    opacity: 0,
    y: 4,
  },
  pop: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 14,
      stiffness: 420,
    },
  },
};

export const reactionPopVariants: Variants = {
  initial: { scale: 0.6, opacity: 0 },
  animate: {
    scale: [1, 1.25, 1],
    opacity: 1,
    transition: {
      duration: 0.25,
      ease: "easeOut",
    },
  },
};

// ─── TAB & CHIP TRANSITIONS ──────────────────────────────────────────────────

export const tabTransitionVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
    filter: "blur(2px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.25,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    filter: "blur(2px)",
    transition: {
      duration: 0.18,
      ease: "easeIn",
    },
  },
};

export const chipHoverVariants: Variants = {
  initial: { scale: 1, y: 0 },
  hover: {
    scale: 1.03,
    y: -2,
    transition: { duration: 0.15, ease: "easeOut" },
  },
  tap: {
    scale: 0.97,
    transition: { duration: 0.08 },
  },
};

// ─── ALIASES FOR COMPONENT CONSISTENCY ────────────────────────────────────────

export const staggerContainerVariants = staggerContainer;
export const staggerItemVariants = staggerItem;

