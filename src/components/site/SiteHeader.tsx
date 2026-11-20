"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ArrowUpRight, UserCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { siteConfig } from "@/config/site";

export const SITE_NAV = [
  { label: "Home", href: "/" },
  { label: "Work", href: "/projects" },
  { label: "Team", href: "/team" },
  { label: "Apps", href: "/apps" },
  { label: "Mobile", href: "/mobile" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/projects") return pathname.startsWith("/projects") || pathname.startsWith("/team-projects");
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Global header for every inner public page. */
export function SiteHeader() {
  const pathname = usePathname() || "/";
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const portal = !user ? "/login" : user.role === "OWNER" ? "/owner" : user.role === "ADMIN" ? "/admin" : "/dashboard";

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-500 ${
          scrolled ? "py-2.5 bg-[#060606]/80 backdrop-blur-xl border-b border-white/[0.06]" : "py-4 bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="CodeXa Agency home">
            <img src="/assets/images/logo.jpeg" alt="" className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/10 group-hover:ring-bright-red/60 transition" />
            <span className="font-orbitron font-black text-sm tracking-[0.18em] text-white">
              CODEXA<span className="text-bright-red">.</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-md p-1">
            {SITE_NAV.map((item) => {
              const on = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-4 py-1.5 rounded-full font-orbitron text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                    on ? "text-white" : "text-white/55 hover:text-white"
                  }`}
                >
                  {on && (
                    <motion.span
                      layoutId="site-nav-pill"
                      className="absolute inset-0 rounded-full bg-crimson shadow-[0_0_20px_rgba(217,4,41,0.45)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href={portal}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-white/10 text-[10px] font-orbitron font-bold uppercase tracking-[0.18em] text-white/80 hover:text-white hover:border-white/30 transition"
            >
              {user ? <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> : null}
              {user ? "Portal" : "Login"}
            </Link>
            <Link
              href="/project-request"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-crimson hover:bg-bright-red text-[10px] font-orbitron font-bold uppercase tracking-[0.18em] text-white shadow-[0_0_20px_rgba(217,4,41,0.4)] transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Start Project</span>
              <span className="sm:hidden">Start</span>
            </Link>
            <button
              onClick={() => setOpen((v) => !v)}
              className="md:hidden p-2 rounded-full border border-white/10 text-white/80"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
            >
              {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-x-3 top-16 z-40 md:hidden rounded-3xl border border-white/10 bg-[#0a0a0a]/95 backdrop-blur-xl p-3 shadow-2xl"
          >
            {SITE_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3.5 rounded-2xl font-orbitron text-xs font-bold uppercase tracking-[0.2em] ${
                  isActive(pathname, item.href) ? "bg-crimson text-white" : "text-white/75 hover:bg-white/5"
                }`}
              >
                {item.label}
                <ArrowUpRight className="w-4 h-4 opacity-60" />
              </Link>
            ))}
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/10">
              <a href={siteConfig.internshipUrl} className="text-center px-3 py-3 rounded-2xl border border-white/10 font-orbitron text-[10px] font-bold uppercase tracking-widest text-white/80">
                Internship
              </a>
              <Link href={portal} className="text-center px-3 py-3 rounded-2xl border border-white/10 font-orbitron text-[10px] font-bold uppercase tracking-widest text-white/80">
                {user ? "Portal" : "Login"}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
