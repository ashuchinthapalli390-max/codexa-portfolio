"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, FolderGit2, User, Bell, Shield, Search, LogOut, ArrowUpRight, Sparkles, Clock, X,
  Menu, Key, Layers, BookOpen, CreditCard, BarChart3, Mail, UserPlus, FileText, CheckCircle2, Briefcase,
  GraduationCap, Calendar, Smartphone, Cpu, FileCheck, Sliders, Award, Receipt, ChevronsLeft, ChevronsRight,
  ChevronDown, CornerDownLeft, Globe, Settings, MessageSquare, Check, LucideIcon,
} from "lucide-react";
import { CodeXaAvatar } from "@/components/ui/CodeXaAvatar";
import { getEffectiveRole, getRoleDisplayName } from "@/lib/permissions";
import { NotificationItem } from "@/lib/data-store";
import { useAuth } from "@/context/AuthContext";
import { CodeXaPushPermissionPrompt } from "@/components/notifications/CodeXaPushPermissionPrompt";
import { SecureBoot } from "@/components/auth/SecureBoot";

/* ───────────────────────── types ───────────────────────── */

export interface ShellNavItem {
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  badge?: number | string;
}

export interface ShellNavSection {
  title: string;
  items: ShellNavItem[];
}

interface TeamCoreShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Extra sections shown first (e.g. in-page tabs of the Owner console). */
  nav?: ShellNavSection[];
  /** Buttons rendered in the top bar (right side). */
  topbarActions?: React.ReactNode;
}

type RawItem = { label: string; href: string; icon: LucideIcon };

/* ───────────────────────── role navigation ───────────────────────── */

function roleItems(role: string): RawItem[] {
  switch (role) {
    case "FOUNDER":
    case "CO_FOUNDER":
      return [
        { label: "Dashboard", href: "/owner", icon: LayoutDashboard },
        { label: "Leave Approvals", href: "/dashboard/leave", icon: Calendar },
        { label: "Scheduled Classes", href: "/dashboard/classes", icon: GraduationCap },
        { label: "Daily Topics", href: "/dashboard/classes/topics", icon: BookOpen },
        { label: "Assignments & Reviews", href: "/dashboard/assignments", icon: FileText },
        { label: "CodeXa AI Settings", href: "/dashboard/ai", icon: Sparkles },
        { label: "Mobile App Control", href: "/dashboard/apps/mobile", icon: Smartphone },
        { label: "MCP Connections", href: "/dashboard/integrations/mcp", icon: Cpu },
        { label: "Crew", href: "/owner?tab=accounts", icon: Users },
        { label: "Employees", href: "/dashboard/employees", icon: Briefcase },
        { label: "Interns", href: "/dashboard/interns", icon: GraduationCap },
        { label: "Users", href: "/dashboard/accounts", icon: UserPlus },
        { label: "Profiles", href: "/team", icon: User },
        { label: "Projects", href: "/owner?tab=all-projects", icon: FolderGit2 },
        { label: "Approvals", href: "/dashboard/approvals", icon: CheckCircle2 },
        { label: "Benefits Approvals", href: "/dashboard/benefits-approvals", icon: Sparkles },
        { label: "Attendance", href: "/dashboard/attendance", icon: Clock },
        { label: "Payments", href: "/dashboard/payments", icon: Receipt },
        { label: "Payment Verification", href: "/dashboard/payments?tab=queue", icon: CheckCircle2 },
        { label: "Payroll", href: "/dashboard/payroll", icon: CreditCard },
        { label: "Payroll Calendar", href: "/dashboard/payroll/calendar", icon: Calendar },
        { label: "Documents", href: "/dashboard/documents", icon: FileText },
        { label: "Offer Letters", href: "/dashboard/documents?tab=OFFER_LETTERS", icon: Award },
        { label: "Email", href: "/dashboard/email", icon: Mail },
        { label: "Apps Center", href: "/dashboard/apps", icon: Layers },
        { label: "Feature Flags", href: "/dashboard/features", icon: Sliders },
        { label: "Audit Logs", href: "/owner?tab=audit", icon: Clock },
        { label: "Settings", href: "/dashboard/settings/security", icon: Shield },
      ];
    case "CEO":
      return [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Crew", href: "/dashboard/accounts", icon: Users },
        { label: "Employees", href: "/dashboard/employees", icon: Briefcase },
        { label: "Interns", href: "/dashboard/interns", icon: GraduationCap },
        { label: "Profiles", href: "/team", icon: User },
        { label: "Projects", href: "/admin?tab=projects", icon: FolderGit2 },
        { label: "Approvals", href: "/dashboard/approvals", icon: CheckCircle2 },
        { label: "Attendance Analytics", href: "/dashboard/attendance", icon: Clock },
        { label: "UPI Payments", href: "/dashboard/payments", icon: Receipt },
        { label: "Payroll Summary", href: "/dashboard/payroll", icon: CreditCard },
        { label: "Analytics", href: "/admin", icon: BarChart3 },
        { label: "Reports", href: "/admin?tab=inquiries", icon: FileText },
        { label: "Security Settings", href: "/dashboard/settings/security", icon: Shield },
      ];
    case "CTO":
      return [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Scheduled Classes", href: "/dashboard/classes", icon: GraduationCap },
        { label: "Assignments & Reviews", href: "/dashboard/assignments", icon: FileText },
        { label: "Projects", href: "/admin?tab=projects", icon: FolderGit2 },
        { label: "Project Approvals", href: "/dashboard/approvals?type=PROJECT", icon: CheckCircle2 },
        { label: "Employees", href: "/dashboard/employees", icon: Briefcase },
        { label: "Interns", href: "/dashboard/interns", icon: GraduationCap },
        { label: "Create Account", href: "/dashboard/accounts?action=create", icon: UserPlus },
        { label: "Attendance Control", href: "/dashboard/attendance", icon: Clock },
        { label: "Payments & Dues", href: "/dashboard/payments", icon: Receipt },
        { label: "Email", href: "/dashboard/email", icon: Mail },
        { label: "Desktop Access", href: "/dashboard/apps", icon: Key },
        { label: "AI Access", href: "/dashboard/apps", icon: Cpu },
        { label: "Technical Analytics", href: "/admin?tab=projects", icon: BarChart3 },
        { label: "Security Settings", href: "/dashboard/settings/security", icon: Shield },
      ];
    case "HR":
      return [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Employees", href: "/dashboard/employees", icon: Briefcase },
        { label: "Interns", href: "/dashboard/interns", icon: GraduationCap },
        { label: "Scheduled Classes", href: "/dashboard/classes", icon: GraduationCap },
        { label: "Assignments", href: "/dashboard/assignments", icon: FileText },
        { label: "Profiles", href: "/team", icon: User },
        { label: "Attendance", href: "/dashboard/attendance", icon: Clock },
        { label: "UPI Verification", href: "/dashboard/payments", icon: Receipt },
        { label: "Payroll", href: "/dashboard/payroll", icon: CreditCard },
        { label: "Documents", href: "/dashboard/documents", icon: FileCheck },
        { label: "Offer Letters", href: "/dashboard/documents?tab=OFFER_LETTERS", icon: Award },
        { label: "Email", href: "/dashboard/email", icon: Mail },
        { label: "HR Analytics", href: "/admin", icon: BarChart3 },
        { label: "Security Settings", href: "/dashboard/settings/security", icon: Shield },
      ];
    case "COO":
      return [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Projects", href: "/admin?tab=projects", icon: FolderGit2 },
        { label: "Crew", href: "/dashboard/accounts", icon: Users },
        { label: "Employees", href: "/dashboard/employees", icon: Briefcase },
        { label: "Interns", href: "/dashboard/interns", icon: GraduationCap },
        { label: "Scheduled Classes", href: "/dashboard/classes", icon: GraduationCap },
        { label: "Profiles", href: "/team", icon: User },
        { label: "Attendance Summary", href: "/dashboard/attendance", icon: Clock },
        { label: "UPI Payments", href: "/dashboard/payments", icon: Receipt },
        { label: "Payroll Summary", href: "/dashboard/payroll", icon: CreditCard },
        { label: "Reports", href: "/admin?tab=inquiries", icon: FileText },
        { label: "Email", href: "/dashboard/email", icon: Mail },
        { label: "Security Settings", href: "/dashboard/settings/security", icon: Shield },
      ];
    case "INTERN":
      return [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "My Profile", href: "/dashboard/profile", icon: User },
        { label: "Internship Details", href: "/dashboard/interns", icon: GraduationCap },
        { label: "Scheduled Classes", href: "/dashboard/classes", icon: GraduationCap },
        { label: "My Assignments", href: "/dashboard/assignments", icon: FileText },
        { label: "Payments", href: "/dashboard/payments", icon: Receipt },
        { label: "Offer Letter", href: "/dashboard/documents?tab=OFFER_LETTERS", icon: Award },
        { label: "Documents", href: "/dashboard/documents?tab=ALL", icon: FileCheck },
        { label: "Settings", href: "/dashboard/settings/security", icon: Shield },
      ];
    case "EMPLOYEE":
    default:
      return [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "My Profile", href: "/dashboard/profile", icon: User },
        { label: "Employment Details", href: "/dashboard/employees", icon: Briefcase },
        { label: "Payments & Dues", href: "/dashboard/payments", icon: Receipt },
        { label: "Attendance Summary", href: "/dashboard/attendance", icon: Clock },
        { label: "Payroll & Payslips", href: "/dashboard/payroll", icon: CreditCard },
        { label: "Documents", href: "/dashboard/documents", icon: FileCheck },
        { label: "Assigned Projects", href: "/dashboard/projects", icon: FolderGit2 },
        { label: "App Center", href: "/dashboard/apps", icon: Smartphone },
        { label: "Settings", href: "/dashboard/settings/security", icon: Shield },
      ];
  }
}

const GROUP_ORDER = ["Overview", "People", "Learning", "Finance", "Documents & Comms", "Projects", "Platform"] as const;

/** Sorts a flat link list into easy-to-scan sidebar groups. */
function groupOf(href: string, label: string): (typeof GROUP_ORDER)[number] {
  const p = href.split("?")[0];
  if (label === "Dashboard") return "Overview";
  if (/(classes|assignments|topics)/.test(p) || label.startsWith("Internship")) return "Learning";
  if (/(payments|payroll)/.test(p)) return "Finance";
  if (/(documents|email)/.test(p)) return "Documents & Comms";
  if (/projects/.test(href)) return "Projects";
  if (/(employees|interns|accounts|leave|attendance|approvals|benefits)/.test(p) || p === "/team" || /accounts/.test(href) || label === "My Profile") return "People";
  if (/(analytics|inquiries)/i.test(href) || label === "Analytics" || label.includes("Analytics")) return "Overview";
  return "Platform";
}

function buildSections(items: RawItem[]): ShellNavSection[] {
  const map = new Map<string, ShellNavItem[]>();
  items.forEach((i) => {
    const g = groupOf(i.href, i.label);
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push({ label: i.label, href: i.href, icon: i.icon });
  });
  return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({ title: g, items: map.get(g)! }));
}

function timeAgo(iso?: string) {
  if (!iso) return "";
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* ───────────────────────── shell ───────────────────────── */

export function TeamCoreShell({ children, title, subtitle, actions, nav, topbarActions }: TeamCoreShellProps) {
  const router = useRouter();
  const pathname = usePathname() || "/dashboard";
  const { user: currentUser, status, loading: loadingSession, logout } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [navFilter, setNavFilter] = useState("");
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("cx_sidebar_collapsed") === "1");
    } catch {
      /* storage blocked */
    }
  }, []);

  const toggleCollapsed = () =>
    setCollapsed((v) => {
      try {
        localStorage.setItem("cx_sidebar_collapsed", v ? "0" : "1");
      } catch {
        /* storage blocked */
      }
      return !v;
    });

  useEffect(() => {
    if (status === "unauthenticated") {
      const safeRedirect = pathname ? `?redirect=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${safeRedirect}`);
      return;
    }
    if (status === "authenticated" && currentUser) {
      fetch("/api/notifications")
        .then((nr) => nr.json())
        .then((nData) => {
          if (nData.notifications) setNotifications(nData.notifications);
          if (nData.unreadCount !== undefined) setUnreadNotifsCount(nData.unreadCount);
        })
        .catch(() => {});
      fetch("/api/chat/conversations")
        .then((cr) => cr.json())
        .then((cData) => {
          if (cData.conversations) {
            const totalUnread = cData.conversations.reduce((sum: number, c: { unreadCount?: number }) => sum + (c.unreadCount || 0), 0);
            setUnreadMessagesCount(totalUnread);
          }
        })
        .catch(() => {});
    }
  }, [status, currentUser, pathname, router]);

  // close floating layers on route change
  useEffect(() => {
    setMobileOpen(false);
    setNotifOpen(false);
    setUserMenuOpen(false);
    setPaletteOpen(false);
  }, [pathname]);

  // ⌘K / Ctrl+K command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setNotifOpen(false);
        setUserMenuOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
    setUnreadNotifsCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const effectiveRole = getEffectiveRole(currentUser);
  const roleTitle = getRoleDisplayName(effectiveRole);
  const isExec = effectiveRole === "FOUNDER" || effectiveRole === "CO_FOUNDER";

  const sections = useMemo<ShellNavSection[]>(() => {
    const base = pathname.split("/")[1];
    let items = roleItems(effectiveRole);
    // when a page supplies its own in-page tabs, drop role links that point back into that page
    if (nav?.length) items = items.filter((i) => i.href.split("?")[0].split("/")[1] !== base);
    const roleSections = buildSections(items);
    if (nav?.length) return [...nav, ...roleSections.map((s) => ({ ...s, title: s.title === "Overview" ? "Workspace" : s.title }))];
    return roleSections;
  }, [effectiveRole, nav, pathname]);

  const [searchParamsStr, setSearchParamsStr] = useState("");
  useEffect(() => setSearchParamsStr(typeof window !== "undefined" ? window.location.search : ""), [pathname]);

  // the single most specific link that matches the current URL
  const activeHref = useMemo(() => {
    const explicit = sections.some((s) => s.items.some((i) => i.active));
    if (explicit) return undefined;
    let best: string | undefined;
    let bestScore = -1;
    sections.forEach((s) =>
      s.items.forEach((i) => {
        if (!i.href) return;
        const [p, q] = i.href.split("?");
        const pathOk = pathname === p || (p !== "/dashboard" && pathname.startsWith(`${p}/`));
        if (!pathOk) return;
        if (q && !searchParamsStr.includes(q)) return;
        const score = p.length + (q ? 1000 : 0);
        if (score > bestScore) {
          bestScore = score;
          best = i.href;
        }
      })
    );
    return best;
  }, [sections, pathname, searchParamsStr]);

  const isItemActive = useCallback(
    (item: ShellNavItem) => (item.active !== undefined ? item.active : !!item.href && item.href === activeHref),
    [activeHref]
  );

  const activeItem = sections.flatMap((s) => s.items).find(isItemActive);
  const activeSection = sections.find((s) => s.items.some(isItemActive));

  const filteredSections = navFilter
    ? sections
        .map((s) => ({ ...s, items: s.items.filter((i) => i.label.toLowerCase().includes(navFilter.toLowerCase())) }))
        .filter((s) => s.items.length)
    : sections;

  if (loadingSession) {
    return <SecureBoot label="CodeXa workspace" />;
  }

  const sidebarW = collapsed ? "lg:w-[76px]" : "lg:w-[268px]";
  const contentPad = collapsed ? "lg:pl-[76px]" : "lg:pl-[268px]";

  const renderItem = (item: ShellNavItem, key: string, compact: boolean) => {
    const Icon = item.icon;
    const on = isItemActive(item);
    const cls = `group relative w-full flex items-center gap-3 rounded-xl text-[13px] font-medium transition-colors ${
      compact ? "justify-center px-0 py-2.5" : "px-3 py-2"
    } ${on ? "bg-crimson/15 text-white" : "text-white/55 hover:text-white hover:bg-white/[0.04]"}`;
    const inner = (
      <>
        {on && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-bright-red shadow-[0_0_10px_#FF1E3C]" />}
        <Icon className={`w-[18px] h-[18px] shrink-0 ${on ? "text-bright-red" : "text-white/40 group-hover:text-white/80"}`} />
        {!compact && <span className="truncate flex-1 text-left">{item.label}</span>}
        {!compact && item.badge !== undefined && Boolean(item.badge) && (
          <span className={`px-1.5 min-w-[20px] text-center rounded-full text-[10px] font-bold ${on ? "bg-bright-red text-white" : "bg-white/[0.06] text-white/70"}`}>{item.badge}</span>
        )}
        {compact && (
          <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-[#151515] border border-white/10 text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition z-50">
            {item.label}
          </span>
        )}
      </>
    );
    return item.href ? (
      <Link key={key} href={item.href} className={cls} aria-current={on ? "page" : undefined} title={compact ? item.label : undefined}>
        {inner}
      </Link>
    ) : (
      <button key={key} onClick={() => { item.onClick?.(); setMobileOpen(false); }} className={cls} aria-current={on ? "page" : undefined} title={compact ? item.label : undefined}>
        {inner}
      </button>
    );
  };

  const sidebarBody = (compact: boolean) => (
    <div className="h-full flex flex-col">
      {/* brand */}
      <div className={`h-16 shrink-0 flex items-center ${compact ? "justify-center" : "justify-between px-4"} border-b border-white/[0.06]`}>
        <Link href={isExec ? "/owner" : "/dashboard"} className="flex items-center gap-2.5 min-w-0">
          <img src="/assets/images/logo.jpeg" alt="" className="w-8 h-8 rounded-lg object-cover ring-1 ring-white/10" />
          {!compact && (
            <span className="min-w-0">
              <span className="block font-orbitron font-black text-[13px] tracking-[0.16em] text-white leading-tight">CODEXA<span className="text-bright-red">.</span></span>
              <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-white/40 truncate">{isExec ? "Founder console" : `${roleTitle} workspace`}</span>
            </span>
          )}
        </Link>
      </div>

      {/* filter */}
      {!compact && (
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={navFilter}
              onChange={(e) => setNavFilter(e.target.value)}
              placeholder="Filter menu…"
              aria-label="Filter menu"
              className="w-full rounded-xl bg-white/[0.04] border border-white/[0.06] focus:border-bright-red/60 pl-8 pr-3 py-2 text-xs text-white placeholder-white/30 outline-none"
            />
          </div>
        </div>
      )}

      {/* groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4 [scrollbar-width:thin]" aria-label="Workspace">
        {filteredSections.map((s) => {
          const closed = !navFilter && closedGroups[s.title];
          return (
            <div key={s.title}>
              {compact ? (
                <div className="mx-auto my-2 h-px w-6 bg-white/10" />
              ) : (
                <button
                  onClick={() => setClosedGroups((g) => ({ ...g, [s.title]: !g[s.title] }))}
                  className="w-full flex items-center justify-between px-3 mb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-white/35 hover:text-white/60"
                  aria-expanded={!closed}
                >
                  {s.title}
                  <ChevronDown className={`w-3 h-3 transition-transform ${closed ? "-rotate-90" : ""}`} />
                </button>
              )}
              {!closed && <div className="space-y-0.5">{s.items.map((i, k) => renderItem(i, `${s.title}-${k}`, compact))}</div>}
            </div>
          );
        })}
        {filteredSections.length === 0 && <p className="px-3 text-xs text-white/40">No menu items match.</p>}
      </nav>

      {/* footer */}
      <div className={`shrink-0 border-t border-white/[0.06] p-3 ${compact ? "space-y-2" : ""}`}>
        {compact ? (
          <>
            <Link href={`/team/${currentUser?.username || ""}`} className="flex justify-center" title="My public profile">
              <CodeXaAvatar src={currentUser?.mediaUrl} alt={currentUser?.displayName || "Member"} size="sm" />
            </Link>
            <button onClick={toggleCollapsed} className="hidden lg:flex w-full justify-center p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.04]" aria-label="Expand sidebar">
              <ChevronsRight className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2.5">
            <Link href={`/team/${currentUser?.username || ""}`} className="flex items-center gap-2.5 min-w-0 flex-1 rounded-xl p-1.5 -m-1.5 hover:bg-white/[0.04]" title="My public profile">
              <CodeXaAvatar src={currentUser?.mediaUrl} alt={currentUser?.displayName || "Member"} size="sm" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white truncate">{currentUser?.displayName || "Member"}</span>
                <span className="block font-mono text-[10px] text-bright-red truncate">{roleTitle}</span>
              </span>
            </Link>
            <button onClick={toggleCollapsed} className="hidden lg:block p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.04]" aria-label="Collapse sidebar" title="Collapse sidebar">
              <ChevronsLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // command palette entries
  const paletteItems: (ShellNavItem & { group: string })[] = [
    ...sections.flatMap((s) => s.items.map((i) => ({ ...i, group: s.title }))),
    { label: "Notifications", icon: Bell, href: "/dashboard/notifications", group: "Quick actions" },
    { label: "Messages", icon: MessageSquare, href: "/dashboard/messages", group: "Quick actions" },
    { label: "Security settings", icon: Settings, href: "/dashboard/settings/security", group: "Quick actions" },
    { label: "My public profile", icon: User, href: `/team/${currentUser?.username || ""}`, group: "Quick actions" },
    { label: "Open public website", icon: Globe, href: "/", group: "Quick actions" },
    { label: "Sign out", icon: LogOut, onClick: () => logout(), group: "Quick actions" },
  ];

  const crumbs = [isExec ? "Founder console" : "Workspace", activeSection?.title, activeItem?.label || title].filter(
    (c, i, a) => c && a.indexOf(c) === i
  ) as string[];

  return (
    <div className="cx-console min-h-screen bg-[#060606] text-white selection:bg-crimson selection:text-white">
      {/* ambient */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        <div className="absolute -top-40 right-0 w-[50vw] h-[50vw] rounded-full bg-crimson/[0.07] blur-[140px]" />
        <div className="absolute bottom-0 left-1/4 w-[40vw] h-[30vw] rounded-full bg-deep-red/20 blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.35] bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      </div>

      {/* desktop sidebar */}
      <aside className={`hidden lg:block fixed inset-y-0 left-0 z-40 ${sidebarW} border-r border-white/[0.06] bg-[#080808]/95 backdrop-blur-xl transition-[width] duration-300`}>
        {sidebarBody(collapsed)}
      </aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="absolute inset-y-0 left-0 w-[290px] max-w-[85vw] bg-[#090909] border-r border-white/10"
            >
              <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-3 p-2 rounded-lg text-white/50 hover:text-white z-10" aria-label="Close menu">
                <X className="w-4 h-4" />
              </button>
              {sidebarBody(false)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className={`relative ${contentPad} transition-[padding] duration-300`}>
        {/* top bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-white/[0.06] bg-[#060606]/80 backdrop-blur-xl">
          <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 -ml-1 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.05]" aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </button>

            <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-2 min-w-0 font-mono text-[11px] uppercase tracking-[0.18em]">
              {crumbs.map((c, i) => (
                <React.Fragment key={c}>
                  {i > 0 && <span className="text-white/20">/</span>}
                  <span className={`truncate ${i === crumbs.length - 1 ? "text-white" : "text-white/40"}`}>{c}</span>
                </React.Fragment>
              ))}
            </nav>

            <button
              onClick={() => setPaletteOpen(true)}
              className="ml-auto md:ml-6 flex-1 md:flex-none md:w-72 lg:w-80 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:border-white/20 px-3 py-2 text-left text-xs text-white/40 transition"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="flex-1 truncate">Search or jump to…</span>
              <kbd className="hidden sm:inline px-1.5 py-0.5 rounded border border-white/10 font-mono text-[10px]">Ctrl K</kbd>
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 md:ml-auto">
              {topbarActions}
              <Link href="/" target="_blank" className="hidden xl:inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-mono uppercase tracking-widest text-white/45 hover:text-white" title="Open public website">
                Site <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>

              <Link href="/dashboard/messages" className="relative p-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.05]" title="Messages" aria-label="Messages">
                <MessageSquare className="w-[18px] h-[18px]" />
                {unreadMessagesCount > 0 && <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-bright-red text-[9px] font-bold flex items-center justify-center">{unreadMessagesCount}</span>}
              </Link>

              {/* notifications */}
              <div className="relative">
                <button
                  onClick={() => { setNotifOpen((v) => !v); setUserMenuOpen(false); }}
                  className="relative p-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.05]"
                  aria-label="Notifications"
                  aria-expanded={notifOpen}
                >
                  <Bell className="w-[18px] h-[18px]" />
                  {unreadNotifsCount > 0 && <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-bright-red text-[9px] font-bold flex items-center justify-center">{unreadNotifsCount}</span>}
                </button>
                <AnimatePresence>
                  {notifOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-[min(380px,calc(100vw-2rem))] rounded-2xl bg-[#0d0d0d] border border-white/10 shadow-2xl z-50 overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                          <span className="text-sm font-semibold">Notifications</span>
                          {unreadNotifsCount > 0 && (
                            <button onClick={markAllRead} className="inline-flex items-center gap-1 text-xs text-bright-red hover:text-white">
                              <Check className="w-3.5 h-3.5" /> Mark all read
                            </button>
                          )}
                        </div>
                        <div className="max-h-80 overflow-y-auto" data-lenis-prevent>
                          {notifications.length === 0 ? (
                            <div className="py-10 text-center">
                              <Bell className="w-6 h-6 mx-auto text-white/20" />
                              <p className="mt-2 text-xs text-white/40">You&apos;re all caught up.</p>
                            </div>
                          ) : (
                            notifications.slice(0, 20).map((n) => {
                              const item = n as NotificationItem & { createdAt?: string; isRead?: boolean };
                              return (
                                <div key={n.id} className="flex gap-3 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.02]">
                                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${item.isRead ? "bg-white/15" : "bg-bright-red"}`} />
                                  <div className="min-w-0">
                                    <p className="text-[13px] font-semibold text-white">{n.title}</p>
                                    <p className="text-xs text-white/55 leading-relaxed">{n.message}</p>
                                    {item.createdAt && <p className="mt-1 font-mono text-[10px] text-white/30">{timeAgo(item.createdAt)}</p>}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                        <Link href="/dashboard/notifications" className="block text-center px-4 py-2.5 text-xs text-white/60 hover:text-white border-t border-white/[0.06]">
                          View all notifications
                        </Link>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* user menu */}
              <div className="relative">
                <button
                  onClick={() => { setUserMenuOpen((v) => !v); setNotifOpen(false); }}
                  className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-white/[0.05]"
                  aria-label="Account menu"
                  aria-expanded={userMenuOpen}
                >
                  <CodeXaAvatar src={currentUser?.mediaUrl} alt={currentUser?.displayName || "Member"} size="sm" showGlow />
                  <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-white/40" />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0d0d0d] border border-white/10 shadow-2xl z-50 p-1.5"
                      >
                        <div className="px-3 py-3 border-b border-white/[0.06] mb-1">
                          <p className="text-sm font-semibold truncate">{currentUser?.displayName || "Member"}</p>
                          <p className="font-mono text-[10px] text-bright-red uppercase tracking-widest">{roleTitle}</p>
                          {currentUser?.username && <p className="font-mono text-[11px] text-white/40">@{currentUser.username}</p>}
                        </div>
                        {[
                          { l: "My public profile", h: `/team/${currentUser?.username || ""}`, i: User },
                          { l: "Security settings", h: "/dashboard/settings/security", i: Shield },
                          { l: "Notification settings", h: "/dashboard/settings/notifications", i: Bell },
                          { l: "Public website", h: "/", i: Globe },
                        ].map((m) => (
                          <Link key={m.l} href={m.h} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/[0.05]">
                            <m.i className="w-4 h-4 text-white/40" /> {m.l}
                          </Link>
                        ))}
                        <button onClick={() => logout()} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-bright-red hover:bg-crimson/10 mt-1 border-t border-white/[0.06]">
                          <LogOut className="w-4 h-4" /> Sign out
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* page */}
        <motion.main
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1600px] mx-auto space-y-6"
        >
          {(title || actions) && (
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-white/[0.06]">
              <div>
                {subtitle && <span className="font-mono text-[10px] text-bright-red tracking-[0.3em] uppercase">{subtitle}</span>}
                {title && <h1 className="font-orbitron font-black text-2xl sm:text-3xl text-white uppercase tracking-tight mt-1">{title}</h1>}
              </div>
              {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
            </div>
          )}
          {children}
          <CodeXaPushPermissionPrompt />
        </motion.main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={paletteItems}
        query={search}
        setQuery={setSearch}
        onSearchTeam={(q) => router.push(`/team?q=${encodeURIComponent(q)}`)}
        onNavigate={(href) => router.push(href)}
      />
    </div>
  );
}

/* ───────────────────────── command palette ───────────────────────── */

function CommandPalette({
  open, onClose, items, query, setQuery, onNavigate, onSearchTeam,
}: {
  open: boolean;
  onClose: () => void;
  items: (ShellNavItem & { group: string })[];
  query: string;
  setQuery: (q: string) => void;
  onNavigate: (href: string) => void;
  onSearchTeam: (q: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cursor, setCursor] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const seen = new Set<string>();
    return items.filter((i) => {
      const key = `${i.label}|${i.href || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return !q || i.label.toLowerCase().includes(q) || i.group.toLowerCase().includes(q);
    });
  }, [items, query]);

  useEffect(() => {
    if (open) {
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    } else setQuery("");
  }, [open, setQuery]);

  useEffect(() => setCursor(0), [query]);

  const run = (i?: ShellNavItem) => {
    if (!i) {
      if (query.trim()) onSearchTeam(query.trim());
      onClose();
      return;
    }
    onClose();
    if (i.onClick) i.onClick();
    else if (i.href) onNavigate(i.href);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Command palette">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98, rotateX: 8 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            style={{ transformPerspective: 1000 }}
            className="relative w-full max-w-xl rounded-2xl bg-[#0d0d0d] border border-white/10 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.9)] overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 border-b border-white/[0.06]">
              <Search className="w-4 h-4 text-white/40" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
                  if (e.key === "Enter") { e.preventDefault(); run(results[cursor]); }
                  if (e.key === "Escape") onClose();
                }}
                placeholder="Jump to a page or search the team…"
                className="flex-1 bg-transparent py-4 text-sm text-white placeholder-white/30 outline-none"
              />
              <kbd className="px-1.5 py-0.5 rounded border border-white/10 font-mono text-[10px] text-white/40">Esc</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2" data-lenis-prevent>
              {results.length === 0 ? (
                <button onClick={() => run()} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.04] text-left text-sm text-white">
                  <Users className="w-4 h-4 text-bright-red" /> Search team for “{query}”
                  <CornerDownLeft className="w-3.5 h-3.5 ml-auto text-white/30" />
                </button>
              ) : (
                results.map((r, idx) => {
                  const Icon = r.icon;
                  const showGroup = idx === 0 || results[idx - 1].group !== r.group;
                  return (
                    <React.Fragment key={`${r.group}-${r.label}-${idx}`}>
                      {showGroup && <div className="px-3 pt-3 pb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">{r.group}</div>}
                      <button
                        onMouseEnter={() => setCursor(idx)}
                        onClick={() => run(r)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition ${idx === cursor ? "bg-crimson/15 text-white" : "text-white/70"}`}
                      >
                        <Icon className={`w-4 h-4 ${idx === cursor ? "text-bright-red" : "text-white/40"}`} />
                        {r.label}
                        {idx === cursor && <CornerDownLeft className="w-3.5 h-3.5 ml-auto text-white/30" />}
                      </button>
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
