"use client";

import React from "react";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";

/**
 * Payments pages render their own content blocks but previously had no
 * workspace chrome at all (no sidebar / top bar). Wrap them in the shared shell.
 */
export default function PaymentsLayout({ children }: { children: React.ReactNode }) {
  return <TeamCoreShell>{children}</TeamCoreShell>;
}
