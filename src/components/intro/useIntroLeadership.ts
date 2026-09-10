"use client";

import { useState, useEffect } from "react";

export interface IntroLeader {
  role: "FOUNDER" | "CO-FOUNDER" | "CEO";
  name: string;
  roleLabel: string;
  mediaUrl?: string;
}

export interface IntroLeadershipData {
  founder: IntroLeader;
  coFounder: IntroLeader;
  ceo: IntroLeader;
}

// Canonical safe fallback matching official current leadership
const SAFE_FALLBACK_LEADERSHIP: IntroLeadershipData = {
  founder: {
    role: "FOUNDER",
    roleLabel: "FOUNDER",
    name: "ASHU",
    mediaUrl: "/assets/images/founder.jpeg",
  },
  coFounder: {
    role: "CO-FOUNDER",
    roleLabel: "CO-FOUNDER",
    name: "SANJAY",
    mediaUrl: "/assets/images/co-founder.jpeg",
  },
  ceo: {
    role: "CEO",
    roleLabel: "CEO",
    name: "KISHORE",
    mediaUrl: "/assets/images/ceo.jpeg",
  },
};

// Forbidden legacy names that must never be shown under any circumstances
const FORBIDDEN_LEGACY_NAMES = new Set(["DEEPAK", "VENU"]);

function cleanName(raw?: string | null, fallback: string = ""): string {
  if (!raw) return fallback;
  const upper = raw.trim().toUpperCase();
  if (FORBIDDEN_LEGACY_NAMES.has(upper)) {
    return fallback;
  }
  return upper;
}

/**
 * Hook to retrieve admin-managed leadership data for the cinematic intro
 * Automatically enforces a 2000ms max network timeout and falls back seamlessly.
 */
export function useIntroLeadership(): {
  leaders: IntroLeadershipData;
  isLoading: boolean;
} {
  const [leaders, setLeaders] = useState<IntroLeadershipData>(SAFE_FALLBACK_LEADERSHIP);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 2000); // 2 seconds maximum wait per specification

    fetch("/api/leadership/public", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data.profiles) && data.profiles.length > 0) {
          const resolved: IntroLeadershipData = {
            founder: { ...SAFE_FALLBACK_LEADERSHIP.founder },
            coFounder: { ...SAFE_FALLBACK_LEADERSHIP.coFounder },
            ceo: { ...SAFE_FALLBACK_LEADERSHIP.ceo },
          };

          for (const p of data.profiles) {
            const rawRole = (p.leadershipPosition || p.primaryRole || p.role || "").toUpperCase();
            const name = cleanName(p.displayName || p.name || p.username);

            if (
              rawRole.includes("FOUNDER") &&
              !rawRole.includes("CO_FOUNDER") &&
              !rawRole.includes("CO-FOUNDER")
            ) {
              if (name) resolved.founder.name = name;
              if (p.mediaUrl) resolved.founder.mediaUrl = p.mediaUrl;
            } else if (rawRole.includes("CO_FOUNDER") || rawRole.includes("CO-FOUNDER")) {
              if (name) resolved.coFounder.name = name;
              if (p.mediaUrl) resolved.coFounder.mediaUrl = p.mediaUrl;
            } else if (rawRole.includes("CEO")) {
              if (name) resolved.ceo.name = name;
              if (p.mediaUrl) resolved.ceo.mediaUrl = p.mediaUrl;
            }
          }

          setLeaders(resolved);
        }
      })
      .catch(() => {
        // Safe fallback already active - keep default
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setIsLoading(false);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  return { leaders, isLoading };
}
