"use client";

import React from "react";
import { Cpu, Github, MessageCircle, ArrowUp, ArrowRight } from "lucide-react";
import { siteConfig } from "@/config/site";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function Footer() {
  const isReduced = useReducedMotion();
  const currentYear = new Date().getFullYear();
  const [logoError, setLogoError] = React.useState(false);

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: isReduced ? "auto" : "smooth" });
    }
  };

  return (
    <footer className="relative bg-[#070707] border-t border-crimson/15 pt-16 pb-8 overflow-hidden z-10">
      
      {/* Background digital-web lines overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <svg width="100%" height="100%">
          <path d="M 0 100 Q 300 0, 600 80 T 1200 40 T 1920 100" fill="none" stroke="#FF1E3C" strokeWidth="1" strokeDasharray="3 6" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        
        {/* Top Grid Area */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
          
          {/* Logo & details (Grid: 4 cols) */}
          <div className="md:col-span-4 flex flex-col items-start">
            <div className="flex items-center gap-2 mb-4 group cursor-pointer" onClick={() => handleScrollTo("home")}>
              {!logoError ? (
                <img
                  src="/assets/images/logo.jpeg"
                  alt="CodeXa Agency logo"
                  className="h-8 w-auto object-contain rounded transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(217,4,41,0.5)] border border-transparent group-hover:border-crimson/30"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <>
                  <div className="p-1.5 rounded bg-deep-red/20 border border-crimson/30">
                    <Cpu className="w-5 h-5 text-bright-red" />
                  </div>
                  <span className="font-orbitron font-black text-base tracking-[0.2em] text-white">
                    CODEXA <span className="text-crimson text-xs font-normal">AGENCY</span>
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-secondary-text leading-relaxed max-w-sm mb-6">
              Engineering cinematic, high-performance web applications, automating business workflows with agentic AI models, and safeguarding databases with modern cybersecurity frameworks.
            </p>

            {/* Socials Icons */}
            <div className="flex gap-3">
              <a 
                href={siteConfig.links.github} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded bg-card border border-crimson/15 hover:border-bright-red text-secondary-text hover:text-white transition-all"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
              <a 
                href={siteConfig.links.whatsapp} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded bg-card border border-crimson/15 hover:border-bright-red text-secondary-text hover:text-white transition-all"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links Column (Grid: 2 cols) */}
          <div className="md:col-span-2 md:col-start-6">
            <h4 className="font-orbitron font-bold text-xs uppercase tracking-widest text-white border-b border-crimson/20 pb-2 mb-4">
              Navigation
            </h4>
            <ul className="flex flex-col gap-2.5">
              {["home", "about", "services", "team", "internship", "process", "contact"].map((item) => (
                <li key={item}>
                  <button
                    onClick={() => handleScrollTo(item)}
                    className="text-xs text-secondary-text hover:text-white uppercase font-orbitron tracking-wider transition-colors flex items-center gap-1 group"
                  >
                    <ArrowRight className="w-3 h-3 text-crimson group-hover:translate-x-0.5 transition-transform" />
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Services Quick list Column (Grid: 3 cols) */}
          <div className="md:col-span-3">
            <h4 className="font-orbitron font-bold text-xs uppercase tracking-widest text-white border-b border-crimson/20 pb-2 mb-4">
              Core Services
            </h4>
            <ul className="flex flex-col gap-2.5">
              {siteConfig.services.slice(0, 5).map((service) => (
                <li key={service.id}>
                  <button
                    onClick={() => handleScrollTo("services")}
                    className="text-xs text-secondary-text hover:text-white transition-colors text-left"
                  >
                    {service.title}
                  </button>
                </li>
              ))}
              <li>
                <button
                  onClick={() => handleScrollTo("services")}
                  className="text-xs text-bright-red hover:underline font-orbitron font-semibold uppercase tracking-wider"
                >
                  View All Services &gt;
                </button>
              </li>
            </ul>
          </div>

          {/* Legal / Admin Column (Grid: 2 cols) */}
          <div className="md:col-span-2">
            <h4 className="font-orbitron font-bold text-xs uppercase tracking-widest text-white border-b border-crimson/20 pb-2 mb-4">
              System Admin
            </h4>
            <ul className="flex flex-col gap-2.5">
              <li>
                <a href={siteConfig.links.privacyPolicy} className="text-xs text-secondary-text hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href={siteConfig.links.termsOfService} className="text-xs text-secondary-text hover:text-white transition-colors">
                  Terms & Conditions
                </a>
              </li>
              <li>
                <a href={siteConfig.links.login} className="text-xs text-crimson hover:text-bright-red hover:underline font-orbitron tracking-widest uppercase">
                  Login
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright & watermark bar */}
        <div className="border-t border-crimson/10 pt-8 mt-4 flex flex-col md:flex-row justify-between items-center gap-4 text-center">
          
          {/* Copyright */}
          <div className="text-xs text-secondary-text">
            &copy; {currentYear} CODEXA AGENCY. All rights reserved. Where Ideas Become Digital Reality.
          </div>

          {/* Watermark */}
          <div className="text-xs font-orbitron font-bold text-bright-red tracking-widest uppercase">
            Powered By CodeXa | Developed By Ashu !!
          </div>

          {/* Scroll back to top */}
          <button
            onClick={() => handleScrollTo("home")}
            className="p-2 rounded bg-card border border-crimson/25 hover:border-bright-red text-bright-red transition-all"
            title="Scroll to Top"
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-4 h-4" />
          </button>

        </div>

      </div>
    </footer>
  );
}
