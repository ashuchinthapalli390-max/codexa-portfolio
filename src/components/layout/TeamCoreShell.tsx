"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Share2,
  Users,
  FolderGit2,
  MessageSquare,
  User,
  Bell,
  Settings,
  Shield,
  Search,
  LogOut,
  ArrowUpRight,
  Sparkles,
  Inbox,
  Clock,
  Eye,
  Check,
  X,
  AlertCircle,
  Menu,
  Key,
  ToggleRight
} from "lucide-react";
import { CodeXaAvatar } from "@/components/ui/CodeXaAvatar";
import { isOwner, isCeoOrAdmin } from "@/lib/permissions";
import { NotificationItem } from "@/lib/data-store";

interface TeamCoreShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function TeamCoreShell({
  children,
  title,
  subtitle,
  actions,
}: TeamCoreShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  // Global search query
  const [globalSearch, setGlobalSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        if (!data.authenticated || !data.user) {
          router.replace("/login");
          return;
        }
        setCurrentUser(data.user);
        // Load notifications
        fetch("/api/notifications")
          .then((nr) => nr.json())
          .then((nData) => {
            if (nData.notifications) setNotifications(nData.notifications);
            if (nData.unreadCount !== undefined) setUnreadNotifsCount(nData.unreadCount);
          })
          .catch(() => {});
      })
      .catch(() => {
        setSessionError(true);
      })
      .finally(() => setLoadingSession(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
  };

  const handleMarkNotifsRead = async () => {
    await fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
    setUnreadNotifsCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSearch.trim()) return;
    router.push(`/team?q=${encodeURIComponent(globalSearch.trim())}`);
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-[#070707] text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-bright-red border-t-transparent animate-spin" />
        <p className="font-orbitron text-xs text-[#888] uppercase tracking-widest">Entering CodeXa Team Core...</p>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="min-h-screen bg-[#070707] text-white flex flex-col items-center justify-center space-y-4 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-bright-red" />
        <h2 className="font-orbitron font-black text-xl text-white uppercase">Unable to Load Workspace</h2>
        <p className="text-xs text-[#888] max-w-sm">Please check your connection and authenticate your session.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded-xl bg-crimson font-orbitron text-xs font-bold uppercase tracking-wider text-white"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const isUserOwner = isOwner(currentUser);
  const isUserExecutive = isCeoOrAdmin(currentUser);

  const mainNavItems = [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { label: "Team Core Feed", href: "/dashboard/feed", icon: Share2 },
    { label: "Team Directory", href: "/team", icon: Users },
    { label: "Projects", href: "/dashboard/projects", icon: FolderGit2 },
    { label: "Messages", href: "/dashboard/messages", icon: MessageSquare },
    { label: "My Profile", href: "/dashboard/profile", icon: User },
    { label: "Notifications", href: "/dashboard/notifications", icon: Bell, badge: unreadNotifsCount },
  ];

  const executiveNavItems = [
    { label: isUserOwner ? "Founder Console" : "Executive Center", href: isUserOwner ? "/owner" : "/admin", icon: Shield },
    ...(isUserOwner ? [{ label: "Accounts & Security", href: "/owner?tab=accounts", icon: Key }] : []),
    { label: "All Projects Pipeline", href: isUserOwner ? "/owner?tab=all-projects" : "/admin?tab=projects", icon: FolderGit2 },
    ...(isUserOwner ? [{ label: "Homepage Control", href: "/owner?tab=homepage", icon: ToggleRight }] : []),
    { label: "Inquiries Console", href: isUserOwner ? "/owner?tab=inquiries" : "/admin?tab=inquiries", icon: Inbox },
    ...(isUserOwner ? [{ label: "Audit & Security Logs", href: "/owner?tab=audit", icon: Clock }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#070707] text-white flex flex-col selection:bg-crimson selection:text-white">
      
      {/* ─── TOP COMMAND BAR ──────────────────────────────────────────────── */}
      <header className="h-16 border-b border-crimson/20 bg-[#090909]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
        
        {/* Left: Brand & Mobile Trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-[#141414] text-[#888] hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="p-1.5 rounded-xl bg-deep-red/30 border border-crimson/40 group-hover:border-bright-red transition-all shadow-[0_0_15px_rgba(217,4,41,0.2)]">
              <Shield className="w-4 h-4 text-bright-red" />
            </div>
            <div className="flex flex-col">
              <span className="font-orbitron font-black text-sm tracking-[0.2em] text-white leading-tight">
                CODEXA <span className="text-crimson text-xs font-normal">TEAM CORE</span>
              </span>
              <span className="text-[8px] font-mono text-[#777] hidden sm:block">Developer Platform &bull; Private Network</span>
            </div>
          </Link>
        </div>

        {/* Center: Global Search Bar */}
        <form onSubmit={handleGlobalSearchSubmit} className="hidden lg:block w-96 relative">
          <Search className="w-3.5 h-3.5 text-[#666] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Search engineers, projects, posts..."
            className="w-full bg-[#121212] border border-crimson/20 focus:border-bright-red rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-[#555] outline-none transition-colors"
          />
        </form>

        {/* Right: Notifications, User Avatar & Logout */}
        <div className="flex items-center gap-3">
          
          <Link
            href="/"
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1 text-[11px] font-orbitron text-[#888] hover:text-white transition-colors uppercase tracking-wider"
          >
            Public Site <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setNotifDropdownOpen(!notifDropdownOpen);
                if (!notifDropdownOpen && unreadNotifsCount > 0) handleMarkNotifsRead();
              }}
              className="p-2 rounded-xl bg-[#121212] hover:bg-deep-red/20 border border-crimson/20 text-[#888] hover:text-white transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-crimson text-white font-mono text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {notifDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#0D0D0D] border border-crimson/30 shadow-2xl p-4 space-y-3 z-50"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span className="font-orbitron font-bold text-xs text-white uppercase">Notifications</span>
                    <button onClick={() => setNotifDropdownOpen(false)} className="text-[#888] hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {notifications.length === 0 ? (
                      <p className="text-center py-6 text-xs text-[#666]">No notifications right now.</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="p-2.5 rounded-xl bg-[#141414] border border-white/5 space-y-0.5">
                          <p className="font-orbitron font-bold text-[11px] text-bright-red">{n.title}</p>
                          <p className="text-xs text-[#AAA]">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Quick Profile */}
          <Link
            href={`/team/${currentUser?.username}`}
            className="flex items-center gap-2.5 pl-2 border-l border-white/10 group"
            title="View My Public Profile"
          >
            <CodeXaAvatar
              src={currentUser?.mediaUrl}
              alt={currentUser?.displayName || "Member"}
              size="sm"
              showGlow
            />
            <div className="hidden sm:block text-left">
              <p className="font-orbitron font-bold text-xs text-white group-hover:text-bright-red transition-colors leading-tight">
                {currentUser?.displayName || "Member"}
              </p>
              <p className="text-[9px] font-mono text-crimson">@{currentUser?.username}</p>
            </div>
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-[#121212] hover:bg-deep-red/30 border border-crimson/20 text-[#888] hover:text-bright-red transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ─── MAIN APP BODY (Sidebar + Page Content) ──────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar Navigation */}
        <aside
          className={`${
            mobileMenuOpen ? "fixed inset-y-0 left-0 z-50 w-64" : "hidden"
          } md:flex w-60 border-r border-crimson/15 bg-[#080808] flex-col justify-between p-4 flex-shrink-0`}
        >
          <div className="space-y-6">
            
            {/* Core Navigation */}
            <div className="space-y-1">
              <span className="text-[9px] font-orbitron text-[#666] uppercase px-3 font-bold tracking-widest">
                Team Core
              </span>
              <nav className="space-y-1 pt-1.5">
                {mainNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-orbitron text-xs font-semibold uppercase tracking-wider transition-all ${
                        isActive
                          ? "bg-crimson text-white border border-bright-red shadow-[0_0_15px_rgba(217,4,41,0.3)]"
                          : "text-[#888] hover:text-white hover:bg-[#121212] border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-deep-red/40 text-bright-red border border-crimson/30">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Executive Management Section (if Owner or CEO) */}
            {isUserExecutive && (
              <div className="space-y-1 pt-3 border-t border-crimson/15">
                <span className="text-[9px] font-orbitron text-bright-red uppercase px-3 font-bold tracking-widest flex items-center gap-1.5">
                  <Shield className="w-3 h-3" /> Management
                </span>
                <nav className="space-y-1 pt-1.5">
                  {executiveNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(item.href.split("?")[0]);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-orbitron text-xs font-semibold uppercase tracking-wider transition-all ${
                          isActive
                            ? "bg-deep-red/30 text-white border border-crimson/50"
                            : "text-[#777] hover:text-white hover:bg-[#121212] border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 text-bright-red" />
                          <span>{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            )}
          </div>

          {/* User Profile Pill at Bottom */}
          <div className="pt-3 border-t border-white/5 flex items-center justify-between">
            <Link href={`/team/${currentUser?.username}`} className="flex items-center gap-2">
              <CodeXaAvatar src={currentUser?.mediaUrl} size="xs" />
              <div className="leading-tight">
                <p className="text-xs font-orbitron font-bold text-white truncate max-w-[110px]">{currentUser?.displayName}</p>
                <p className="text-[9px] font-mono text-crimson">{currentUser?.role}</p>
              </div>
            </Link>
          </div>
        </aside>

        {/* Dynamic Page Content */}
        <motion.main
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex-1 bg-[#070707] overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6"
        >
          {(title || actions) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-crimson/15">
              <div>
                {subtitle && (
                  <span className="text-[10px] font-orbitron text-bright-red tracking-[0.25em] uppercase font-bold">
                    {subtitle}
                  </span>
                )}
                {title && (
                  <h1 className="font-orbitron font-black text-2xl sm:text-3xl text-white uppercase mt-0.5">
                    {title}
                  </h1>
                )}
              </div>
              {actions && <div className="flex items-center gap-2.5">{actions}</div>}
            </div>
          )}

          {children}
        </motion.main>
      </div>
    </div>
  );
}
