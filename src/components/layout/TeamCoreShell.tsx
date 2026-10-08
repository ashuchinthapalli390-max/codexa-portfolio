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
  ToggleRight,
  Layers
} from "lucide-react";
import { CodeXaAvatar } from "@/components/ui/CodeXaAvatar";
import { 
  hasPermission, 
  getEffectiveRole, 
  getRoleDisplayName, 
  Permission, 
  isOwner, 
  isCeoOrAdmin 
} from "@/lib/permissions";
import { NotificationItem } from "@/lib/data-store";
import { useAuth } from "@/context/AuthContext";
import {
  CreditCard,
  BarChart3,
  Mail,
  UserPlus,
  FileText,
  Activity,
  CheckCircle2,
  Briefcase,
  GraduationCap,
  Calendar,
  Smartphone,
  Cpu,
  FileCheck,
  Sliders,
  Award,
  Receipt,
} from "lucide-react";
import { CodeXaPushPermissionPrompt } from "@/components/notifications/CodeXaPushPermissionPrompt";

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
  const { user: currentUser, status, loading: loadingSession, logout } = useAuth();

  // Notifications & Messages state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  // Global search query
  const [globalSearch, setGlobalSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      const safeRedirect = pathname ? `?redirect=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${safeRedirect}`);
      return;
    }

    if (status === "authenticated" && currentUser) {
      // Load notifications
      fetch("/api/notifications")
        .then((nr) => nr.json())
        .then((nData) => {
          if (nData.notifications) setNotifications(nData.notifications);
          if (nData.unreadCount !== undefined) setUnreadNotifsCount(nData.unreadCount);
        })
        .catch(() => {});

      // Load chat conversations to calculate unread DM count
      fetch("/api/chat/conversations")
        .then((cr) => cr.json())
        .then((cData) => {
          if (cData.conversations) {
            const totalUnread = cData.conversations.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
            setUnreadMessagesCount(totalUnread);
          }
        })
        .catch(() => {});
    }
  }, [status, currentUser, pathname, router]);

  const handleLogout = async () => {
    await logout();
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

  const effectiveRole = getEffectiveRole(currentUser);
  const displayRoleTitle = getRoleDisplayName(effectiveRole);

  interface NavItem {
    label: string;
    href: string;
    icon: any;
    badge?: number | string;
  }

  // Build role-tailored primary navigation per Section 56
  const getNavItems = (): NavItem[] => {
    switch (effectiveRole) {
      case "FOUNDER":
      case "CO_FOUNDER":
        return [
          { label: "Dashboard", href: "/owner", icon: LayoutDashboard },
          { label: "Scheduled Classes", href: "/dashboard/classes", icon: GraduationCap },
          { label: "Assignments & Reviews", href: "/dashboard/assignments", icon: FileText },
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
          { label: "Mobile App", href: "/dashboard/apps/mobile", icon: Smartphone },
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
  };

  const navItems = getNavItems();


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
              <p className="text-[9px] font-mono text-crimson">{displayRoleTitle}</p>
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
          } md:flex w-60 border-r border-crimson/15 bg-[#080808] flex-col justify-between p-4 flex-shrink-0 overflow-y-auto`}
        >
          <div className="space-y-6">
            
            {/* Dynamic Role Navigation */}
            <div className="space-y-1">
              <span className="text-[9px] font-orbitron text-bright-red uppercase px-3 font-bold tracking-widest flex items-center gap-1.5">
                <Shield className="w-3 h-3" />
                <span>{effectiveRole === "FOUNDER" || effectiveRole === "CO_FOUNDER" ? "Executive Console" : `${effectiveRole} Workspace`}</span>
              </span>
              <nav className="space-y-1 pt-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href.split("?")[0]));
                  return (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl font-orbitron text-xs font-semibold uppercase tracking-wider transition-all ${
                        isActive
                          ? "bg-crimson text-white border border-bright-red shadow-[0_0_15px_rgba(217,4,41,0.3)]"
                          : "text-[#888] hover:text-white hover:bg-[#121212] border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge !== undefined && Boolean(item.badge) && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-deep-red/40 text-bright-red border border-crimson/30">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* User Profile Pill at Bottom */}
          <div className="pt-3 border-t border-white/5 flex items-center justify-between">
            <Link href={`/team/${currentUser?.username}`} className="flex items-center gap-2">
              <CodeXaAvatar src={currentUser?.mediaUrl} size="xs" />
              <div className="leading-tight">
                <p className="text-xs font-orbitron font-bold text-white truncate max-w-[110px]">{currentUser?.displayName}</p>
                <p className="text-[9px] font-mono text-crimson truncate max-w-[110px]">{displayRoleTitle}</p>
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
          <CodeXaPushPermissionPrompt />
        </motion.main>
      </div>
    </div>
  );
}
