"use client";

import { ProjectsExplorer } from "@/components/site/ProjectsExplorer";

/** Team & community builds — same explorer, opened on the "Team builds" tab. */
export default function TeamProjectsPage() {
  return <ProjectsExplorer initialTab="team" />;
}
