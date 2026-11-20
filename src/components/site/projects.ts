import type { Project } from "@/lib/data-store";

export const FALLBACK_THUMB = "/assets/images/logo.jpeg";

/** Loads flagship + public team projects and merges them (deduped by id). */
export async function loadAllProjects(): Promise<Project[]> {
  const get = (url: string) =>
    fetch(url)
      .then((r) => r.json())
      .then((d) => (d && d.success && Array.isArray(d.projects) ? (d.projects as Project[]) : []))
      .catch(() => [] as Project[]);

  const [main, team] = await Promise.all([get("/api/projects?main=true"), get("/api/projects?public=true")]);
  const map = new Map<string, Project>();
  [...main.map((p) => ({ ...p, isMainProject: true })), ...team].forEach((p) => {
    const prev = map.get(p.id);
    map.set(p.id, prev ? { ...p, isMainProject: prev.isMainProject || p.isMainProject } : p);
  });
  return Array.from(map.values());
}

export function statusTone(status: string | undefined) {
  const s = (status || "").toLowerCase();
  if (s.includes("live") || s.includes("production")) return "text-emerald-300 bg-emerald-500/10 border-emerald-400/30";
  if (s.includes("progress")) return "text-amber-300 bg-amber-500/10 border-amber-400/30";
  if (s.includes("client")) return "text-sky-300 bg-sky-500/10 border-sky-400/30";
  return "text-white/60 bg-white/5 border-white/15";
}

export function matchesQuery(p: Project, q: string) {
  if (!q) return true;
  const s = q.toLowerCase();
  return (
    p.title?.toLowerCase().includes(s) ||
    p.shortDesc?.toLowerCase().includes(s) ||
    p.overview?.toLowerCase().includes(s) ||
    p.category?.toLowerCase().includes(s) ||
    (p.techStack || []).some((t) => t.toLowerCase().includes(s)) ||
    !!p.creator?.displayName?.toLowerCase().includes(s)
  );
}
