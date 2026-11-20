"use client";

import React from "react";
import Link from "next/link";
import { Github, MessageCircle, ArrowUp, ArrowUpRight } from "lucide-react";
import { siteConfig } from "@/config/site";

const COLUMNS = [
  {
    title: "Explore",
    links: [
      { label: "Home", href: "/" },
      { label: "Our Work", href: "/projects" },
      { label: "Team", href: "/team" },
      { label: "Apps", href: "/apps" },
      { label: "Mobile App", href: "/mobile" },
    ],
  },
  {
    title: "Agency",
    links: [
      { label: "About", href: "/#about" },
      { label: "Services", href: "/#services" },
      { label: "Process", href: "/#process" },
      { label: "FAQ", href: "/#faq" },
      { label: "Contact", href: "/#contact" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Start a Project", href: "/project-request" },
      { label: "Internship Portal", href: siteConfig.internshipUrl, external: true },
      { label: "Payment Policy", href: "/payment-policy" },
      { label: "Verify Certificate", href: "/verify" },
      { label: "Member Login", href: "/login" },
    ],
  },
];

/** Shared footer used across the public site. */
export function SiteFooter() {
  const year = new Date().getFullYear();
  const toTop = () => {
    const lenis = (window as unknown as { __lenis?: { scrollTo: (t: number) => void } }).__lenis;
    if (lenis) lenis.scrollTo(0);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative z-10 border-t border-white/[0.06] bg-[#050505]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <img src="/assets/images/logo.jpeg" alt="" className="h-9 w-9 rounded-lg object-cover ring-1 ring-white/10" />
              <span className="font-orbitron font-black tracking-[0.18em] text-white">
                CODEXA<span className="text-bright-red">.</span> AGENCY
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/50">
              {siteConfig.tagline}. AI systems, cinematic web & mobile products and security-first platforms — engineered end to end.
            </p>
            <div className="mt-6 flex gap-2">
              <a href={siteConfig.links.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="p-2.5 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-bright-red transition">
                <Github className="w-4 h-4" />
              </a>
              <a href={siteConfig.links.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="p-2.5 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-bright-red transition">
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h4 className="font-mono text-[10px] uppercase tracking-[0.3em] text-bright-red">{col.title}</h4>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      {"external" in l && l.external ? (
                        <a href={l.href} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1 text-sm text-white/60 hover:text-white transition">
                          {l.label}
                          <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition" />
                        </a>
                      ) : (
                        <Link href={l.href} className="text-sm text-white/60 hover:text-white transition">
                          {l.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40">© {year} CodeXa Agency. All rights reserved.</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
            {siteConfig.brandPhrase.join(" · ")}
          </p>
          <button onClick={toTop} aria-label="Back to top" className="p-2.5 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-bright-red transition">
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}
