/**
 * /admin — Main dashboard
 * Requires: accessGranted + authenticated session
 */
"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface SessionData {
  authenticated: boolean;
  user?: {
    id: string;
    username: string;
    role: string;
    displayName: string;
  };
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: "#D90429",
  ADMIN: "#FF6B35",
  EDITOR: "#4ECDC4",
  VIEWER: "#A5A5A5",
};

const ROLE_BG: Record<string, string> = {
  OWNER: "rgba(217,4,41,0.15)",
  ADMIN: "rgba(255,107,53,0.15)",
  EDITOR: "rgba(78,205,196,0.15)",
  VIEWER: "rgba(165,165,165,0.15)",
};

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "grid", roles: ["OWNER"] },
  { href: "/admin/team-profiles", label: "Team Profiles", icon: "users", roles: ["OWNER"] },
  { href: "/owner/access-keys", label: "Access Keys", icon: "key", roles: ["OWNER"] },
];

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forbidden = searchParams.get("error") === "forbidden";
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((data: SessionData) => {
        if (!data.authenticated) {
          router.replace("/login");
          return;
        }
        if (data.user?.role !== "OWNER" && data.user?.role !== "ADMIN") {
          router.replace("/dashboard/profile");
          return;
        }
        setSession(data);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-[#070707] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#A5A5A5]">
          <svg className="w-5 h-5 animate-spin text-[#D90429]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
          </svg>
          <span className="font-orbitron text-sm tracking-wider">Loading...</span>
        </div>
      </div>
    );
  }

  const role = session.user?.role ?? "VIEWER";
  const roleColor = ROLE_COLORS[role] ?? "#A5A5A5";
  const roleBg = ROLE_BG[role] ?? "rgba(165,165,165,0.15)";

  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <div className="min-h-screen bg-[#070707] flex">
      {/* Sidebar */}
      <aside
        className="w-64 flex-shrink-0 border-r border-[rgba(217,4,41,0.15)] flex flex-col"
        style={{ background: "rgba(7,7,7,0.98)" }}
      >
        {/* Brand */}
        <div className="px-6 py-6 border-b border-[rgba(217,4,41,0.1)]">
          <div className="flex items-center gap-3">
            {!logoError ? (
              <img
                src="/assets/images/logo.jpeg"
                alt="CodeXa Agency logo"
                className="w-10 h-10 object-contain rounded border border-crimson/25 shadow-[0_0_10px_rgba(217,4,41,0.2)]"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, rgba(217,4,41,0.3), rgba(99,0,15,0.5))", border: "1px solid rgba(217,4,41,0.4)" }}
              >
                <svg viewBox="0 0 32 32" fill="none" className="w-4 h-4" aria-hidden="true">
                  <path d="M6 16L16 6L26 16L16 26L6 16Z" stroke="#D90429" strokeWidth="1.5" fill="none" />
                  <circle cx="16" cy="16" r="2" fill="#FF1E3C" />
                </svg>
              </div>
            )}
            <div>
              <div className="font-orbitron text-xs font-bold text-[#F7F7F7] tracking-wider">CODEXA</div>
              <div className="text-[10px] text-[#A5A5A5] tracking-widest">ADMIN PANEL</div>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="px-6 py-4 border-b border-[rgba(217,4,41,0.08)]">
          <div className="text-xs text-[#A5A5A5] mb-1">Signed in as</div>
          <div className="text-sm font-semibold text-[#F7F7F7] truncate">{session.user?.displayName || session.user?.username || "Owner"}</div>
          <div
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full mt-1.5 text-[10px] font-orbitron tracking-widest uppercase"
            style={{ color: roleColor, background: roleBg, border: `1px solid ${roleColor}30` }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: roleColor }} />
            {role}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4">
          <div className="text-[10px] text-[#333333] font-orbitron tracking-widest uppercase px-3 mb-2">Navigation</div>
          <ul className="space-y-1">
            {visibleNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#A5A5A5] hover:text-[#F7F7F7] hover:bg-[rgba(217,4,41,0.08)] transition-all duration-150 group"
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout */}
        <div className="px-3 pb-6 border-t border-[rgba(217,4,41,0.08)] pt-4">
          <button
            id="admin-logout-btn"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#A5A5A5] hover:text-[#D90429] hover:bg-[rgba(217,4,41,0.08)] transition-all duration-150 disabled:opacity-50"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
              <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M6 10a.75.75 0 0 1 .75-.75h9.546l-1.048-.943a.75.75 0 1 1 1.004-1.114l2.5 2.25a.75.75 0 0 1 0 1.114l-2.5 2.25a.75.75 0 1 1-1.004-1.114l1.048-.943H6.75A.75.75 0 0 1 6 10Z" clipRule="evenodd" />
            </svg>
            {isLoggingOut ? "Signing out..." : "Sign Out"}
          </button>
          <Link
            href="/"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#333333] hover:text-[#A5A5A5] transition-all duration-150 mt-1"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
              <path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" />
            </svg>
            Main Website
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header
          className="px-8 py-5 border-b border-[rgba(217,4,41,0.1)] flex items-center justify-between flex-shrink-0"
          style={{ background: "rgba(7,7,7,0.95)" }}
        >
          <div>
            <h1 className="font-orbitron text-lg font-bold text-[#F7F7F7]">Dashboard</h1>
            <p className="text-xs text-[#A5A5A5] mt-0.5 tracking-wider">
              Welcome back, {session.user?.displayName || session.user?.username || "Owner"}
            </p>
          </div>
          <div className="text-xs text-[#333333] font-orbitron tracking-widest">
            {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Forbidden error */}
          {forbidden && (
            <div
              className="mb-6 rounded-xl px-5 py-4 flex items-center gap-3 text-sm"
              style={{ background: "rgba(217,4,41,0.1)", border: "1px solid rgba(217,4,41,0.3)" }}
              role="alert"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[#D90429] flex-shrink-0" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-1-5a1 1 0 1 0 2 0v-4a1 1 0 1 0-2 0v4Zm1-8a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" clipRule="evenodd" />
              </svg>
              <span className="text-[#F7F7F7]">
                Access denied. You don&apos;t have permission to view that page.
              </span>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
            {[
              { label: "Your Role", value: role, sub: "Access level", color: roleColor },
              { label: "Admin System", value: "Active", sub: "All systems operational", color: "#22C55E" },
              { label: "Session", value: "Secure", sub: "HTTP-only cookie", color: "#4ECDC4" },
              { label: "Encryption", value: "Enabled", sub: "bcrypt + iron-session", color: "#FFD700" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl p-5 relative overflow-hidden"
                style={{
                  background: "rgba(17,17,17,0.8)",
                  border: "1px solid rgba(217,4,41,0.1)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
                }}
              >
                <div className="text-xs text-[#A5A5A5] font-orbitron tracking-widest uppercase mb-2">{stat.label}</div>
                <div className="text-2xl font-orbitron font-bold" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-xs text-[#333333] mt-1">{stat.sub}</div>
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 opacity-40"
                  style={{ background: `linear-gradient(90deg, transparent, ${stat.color}, transparent)` }}
                />
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div
            className="rounded-xl p-6"
            style={{ background: "rgba(17,17,17,0.6)", border: "1px solid rgba(217,4,41,0.08)" }}
          >
            <h2 className="font-orbitron text-sm font-bold text-[#F7F7F7] tracking-wider mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {role === "OWNER" && (
                <Link
                  href="/admin/team-profiles"
                  className="flex items-center gap-3 p-4 rounded-lg border border-[rgba(217,4,41,0.15)] hover:border-[rgba(217,4,41,0.4)] hover:bg-[rgba(217,4,41,0.06)] transition-all duration-200 group"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(217,4,41,0.1)" }}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#D90429]" aria-hidden="true">
                      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#F7F7F7] group-hover:text-[#D90429] transition-colors">Manage Team Profiles</div>
                    <div className="text-xs text-[#A5A5A5]">Create accounts, edit details, adjust visibility</div>
                  </div>
                </Link>
              )}
              <Link
                href="/"
                className="flex items-center gap-3 p-4 rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.03)] transition-all duration-200 group"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#A5A5A5]" aria-hidden="true">
                    <path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#F7F7F7] group-hover:text-white transition-colors">View Website</div>
                  <div className="text-xs text-[#A5A5A5]">Open public site</div>
                </div>
              </Link>
            </div>
          </div>

          {/* Security info */}
          <div
            className="mt-5 rounded-xl p-5"
            style={{ background: "rgba(17,17,17,0.4)", border: "1px solid rgba(217,4,41,0.06)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#D90429]" aria-hidden="true">
                <path fillRule="evenodd" d="M9.661 2.237a.531.531 0 0 1 .678 0 11.947 11.947 0 0 0 7.078 2.749.5.5 0 0 1 .479.425c.069.52.104 1.05.104 1.59 0 5.162-3.26 9.563-7.834 11.256a.48.48 0 0 1-.332 0C5.26 16.564 2 12.163 2 7.001c0-.54.035-1.07.104-1.59a.5.5 0 0 1 .48-.425 11.947 11.947 0 0 0 7.077-2.75Z" clipRule="evenodd" />
              </svg>
              <h3 className="font-orbitron text-xs font-bold text-[#A5A5A5] tracking-wider uppercase">Security Status</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { label: "Session Cookie", status: "HTTP-Only", ok: true },
                { label: "Key Storage", status: "Hashed (bcrypt)", ok: true },
                { label: "Rate Limiting", status: "Active", ok: true },
                { label: "Audit Logging", status: "Enabled", ok: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${item.ok ? "bg-green-400" : "bg-[#D90429]"}`} />
                  <div>
                    <div className="text-[#A5A5A5]">{item.label}</div>
                    <div className="text-[#F7F7F7]">{item.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function NavIcon({ name }: { name: string }) {
  const cls = "w-4 h-4 text-[#A5A5A5] group-hover:text-[#D90429] transition-colors flex-shrink-0";
  if (name === "grid") return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={cls} aria-hidden="true">
      <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z" clipRule="evenodd" />
    </svg>
  );
  if (name === "key") return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={cls} aria-hidden="true">
      <path fillRule="evenodd" d="M8 7a5 5 0 1 1 3.61 4.804l-1.903 1.903A1 1 0 0 1 9 14H8v1a1 1 0 0 1-1 1H6v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 .293-.707L8.196 8.39A5.002 5.002 0 0 1 8 7Zm5-3a.75.75 0 0 0 0 1.5A1.5 1.5 0 0 1 14.5 7 .75.75 0 0 0 16 7a3 3 0 0 0-3-3Z" clipRule="evenodd" />
    </svg>
  );
  if (name === "users") return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={cls} aria-hidden="true">
      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
    </svg>
  );
  return null;
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#070707] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#A5A5A5]">
          <svg className="w-5 h-5 animate-spin text-[#D90429]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
          </svg>
          <span className="font-orbitron text-sm tracking-wider">Loading Dashboard...</span>
        </div>
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}
