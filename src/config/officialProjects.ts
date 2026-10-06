import type { Project } from "@/lib/data-store";

/**
 * Single Source of Truth for Official CodeXa Projects & Systems.
 * All projects removed per request.
 */
export const OFFICIAL_PROJECTS: Project[] = [];

/** Flagship projects to display under the Main Projects section */
export const OFFICIAL_MAIN_PROJECTS: Project[] = [];

/** All community and team builds (includes both Co-Founder and Founder systems) */
export const OFFICIAL_TEAM_PROJECTS: Project[] = [];
