"use client";

import React, { useState } from "react";
import { 
  Phone, 
  Mail, 
  Send, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  MessageSquare,
  Github,
  ArrowUpRight
} from "lucide-react";
import { siteConfig } from "@/config/site";
import { SectionHeading } from "../ui/SectionHeading";
import { MediaAsset } from "../ui/MediaAsset";
import { NeonButton } from "../ui/NeonButton";

export function ContactSection() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    projectType: "web-dev",
    budget: "$1,000 - $5,000",
    message: ""
  });

  const [uiState, setUiState] = useState<"idle" | "loading" | "success" | "failed">("idle");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear validation on edit
    if (validationErrors.length > 0) setValidationErrors([]);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);

    // Basic Validation checks
    const errors = [];
    if (!formData.fullName.trim()) errors.push("Full Name is required.");
    if (!formData.email.trim()) {
      errors.push("Email Address is required.");
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.push("Please provide a valid email address.");
    }
    if (!formData.message.trim()) errors.push("Message body is required.");

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Set form state to loading
    setUiState("loading");

    // Simulate Server Request delay
    setTimeout(() => {
      // 90% chance success, 10% chance failure simulation
      const isSuccess = Math.random() > 0.1;
      if (isSuccess) {
        setUiState("success");
        // reset form on success
        setFormData({
          fullName: "",
          email: "",
          phone: "",
          projectType: "web-dev",
          budget: "$1,000 - $5,000",
          message: ""
        });
      } else {
        setUiState("failed");
      }
    }, 2000);
  };

  return (
    <section id="contact" className="relative py-20 bg-[#070707] overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        
        {/* Section Heading */}
        <SectionHeading
          badge="Start A Project"
          title="Let’s Build Something Powerful"
          subtitle="Ready to scale? Connect with our executives or send an immediate project inquiry request below."
          align="center"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mt-12">
          
          {/* Left Column: Rooftop wide background and direct contact details */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Cinematic rooftop graphic frame */}
            <div className="relative h-[200px] rounded-lg overflow-hidden border border-crimson/20 shadow-2xl">
              <div className="absolute inset-0 bg-[#070707]/60 z-10 pointer-events-none" />
              <MediaAsset
                type="video"
                src={siteConfig.images.contactRooftop}
                videoSources={[
                  "/assets/videos/contact-loop.webm",
                  "/assets/videos/contact-loop.mp4"
                ]}
                poster="/assets/posters/contact-poster.webp"
                alt="CodeXa Rooftop Contact backdrop"
                fallbackLabel="contact-rooftop.webp"
                className="w-full h-full"
                objectFit="cover"
                overlay={true}
              />
              <div className="absolute bottom-4 left-4 z-10">
                <span className="text-[10px] tracking-widest text-bright-red font-orbitron uppercase">
                  HEADQUARTERS
                </span>
                <h4 className="font-orbitron font-bold text-white uppercase text-sm tracking-wider">
                  CODEXA AGENCY NETWORK
                </h4>
              </div>
            </div>

            {/* Direct Contacts List cards */}
            <div className="flex flex-col gap-4">
              <h4 className="font-orbitron font-bold text-xs uppercase tracking-widest text-white border-b border-crimson/25 pb-2">
                Executive Contact Channels
              </h4>

              {/* Founder Ashu */}
              <div className="flex justify-between items-center p-4 rounded bg-card/60 border border-crimson/15 shadow-inner">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-crimson font-orbitron font-semibold">Founder</span>
                  <h5 className="font-orbitron font-bold text-sm text-white">Ashu</h5>
                </div>
                <a 
                  href={`tel:${siteConfig.contact.ashu.phone}`} 
                  className="flex items-center gap-1.5 font-mono text-xs text-bright-red hover:text-white transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {siteConfig.contact.ashu.phone}
                </a>
              </div>

              {/* Co-Founder Deepak */}
              <div className="flex justify-between items-center p-4 rounded bg-card/60 border border-crimson/15 shadow-inner">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-crimson font-orbitron font-semibold">Co-Founder</span>
                  <h5 className="font-orbitron font-bold text-sm text-white">Deepak</h5>
                </div>
                <a 
                  href={`tel:${siteConfig.contact.deepak.phone}`} 
                  className="flex items-center gap-1.5 font-mono text-xs text-bright-red hover:text-white transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {siteConfig.contact.deepak.phone}
                </a>
              </div>

              {/* CEO Venu */}
              <div className="flex justify-between items-center p-4 rounded bg-card/60 border border-crimson/15 shadow-inner">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-crimson font-orbitron font-semibold">CEO</span>
                  <h5 className="font-orbitron font-bold text-sm text-white">Venu</h5>
                </div>
                <a 
                  href={`tel:${siteConfig.contact.venu.phone}`} 
                  className="flex items-center gap-1.5 font-mono text-xs text-bright-red hover:text-white transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {siteConfig.contact.venu.phone}
                </a>
              </div>
            </div>

            {/* Quick action buttons list */}
            <div className="grid grid-cols-2 gap-3 mt-2">
              <a 
                href={siteConfig.links.whatsapp} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 text-xs font-orbitron uppercase tracking-wider text-white border border-crimson/25 hover:border-bright-red bg-card hover:bg-deep-red/10 rounded transition-all duration-300"
              >
                <MessageSquare className="w-4 h-4 text-bright-red" />
                WhatsApp
              </a>
              <a 
                href={siteConfig.links.github} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 text-xs font-orbitron uppercase tracking-wider text-white border border-crimson/25 hover:border-bright-red bg-card hover:bg-deep-red/10 rounded transition-all duration-300"
              >
                <Github className="w-4 h-4 text-bright-red" />
                Visit GitHub
              </a>
              
              <a 
                href={siteConfig.internshipUrl} 
                className="col-span-2 flex items-center justify-center gap-2 p-3.5 text-xs font-orbitron font-bold uppercase tracking-widest text-bright-red border border-bright-red/35 bg-deep-red/10 hover:bg-crimson hover:text-white rounded transition-all duration-300"
              >
                Join Internship
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>

          </div>

          {/* Right Column: Contact Inquiry Request Form (Grid: 7 cols) */}
          <div className="lg:col-span-7 bg-card/40 border border-crimson/15 rounded-xl p-6 md:p-8 backdrop-blur shadow-2xl relative">
            
            {/* Edge Indicators */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-crimson" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-crimson" />

            <h4 className="font-orbitron font-bold text-base uppercase text-white tracking-widest border-b border-crimson/15 pb-3 mb-6">
              Project Inquiry Console
            </h4>

            {/* Validation alerts */}
            {validationErrors.length > 0 && (
              <div className="p-4 rounded border border-bright-red bg-deep-red/20 mb-6 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs font-bold font-orbitron text-bright-red">
                  <AlertCircle className="w-4 h-4" />
                  VALIDATION ERROR
                </div>
                {validationErrors.map((err, i) => (
                  <p key={i} className="text-xs text-secondary-text list-disc pl-4 leading-tight">
                    • {err}
                  </p>
                ))}
              </div>
            )}

            {/* Success state */}
            {uiState === "success" && (
              <div className="p-6 rounded border border-emerald-500 bg-emerald-500/10 text-center mb-6 flex flex-col items-center gap-3">
                <CheckCircle className="w-12 h-12 text-emerald-400" />
                <h5 className="font-orbitron font-bold text-white uppercase text-sm tracking-wider">
                  Request Transmitted
                </h5>
                <p className="text-xs text-secondary-text max-w-sm">
                  Your inquiry message was delivered successfully. A CodeXa engineer will review details and connect back inside 24 hours.
                </p>
                <NeonButton size="sm" variant="outline" onClick={() => setUiState("idle")}>
                  Send New Request
                </NeonButton>
              </div>
            )}

            {/* Failed Submission State */}
            {uiState === "failed" && (
              <div className="p-6 rounded border border-bright-red bg-deep-red/20 text-center mb-6 flex flex-col items-center gap-3">
                <AlertCircle className="w-12 h-12 text-bright-red animate-bounce" />
                <h5 className="font-orbitron font-bold text-bright-red uppercase text-sm tracking-wider">
                  Transmission Failed
                </h5>
                <p className="text-xs text-secondary-text max-w-sm">
                  We encountered an error transmitting your project data. Please verify your internet connection or ping via WhatsApp.
                </p>
                <NeonButton size="sm" variant="primary" onClick={() => setUiState("idle")}>
                  Retry Submission
                </NeonButton>
              </div>
            )}

            {/* Core Form fields (Active/Idle UI states) */}
            {uiState !== "success" && uiState !== "failed" && (
              <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                
                {/* Full name & Email Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-orbitron text-[10px] uppercase font-bold tracking-widest text-secondary-text">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      disabled={uiState === "loading"}
                      className="bg-[#070707] border border-crimson/20 focus:border-bright-red rounded p-3 text-xs text-white outline-none focus:shadow-neon transition-all"
                      placeholder="e.g. Tony Stark"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-orbitron text-[10px] uppercase font-bold tracking-widest text-secondary-text">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={uiState === "loading"}
                      className="bg-[#070707] border border-crimson/20 focus:border-bright-red rounded p-3 text-xs text-white outline-none focus:shadow-neon transition-all"
                      placeholder="e.g. tony@stark.io"
                    />
                  </div>
                </div>

                {/* Phone & Project Type Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-orbitron text-[10px] uppercase font-bold tracking-widest text-secondary-text">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={uiState === "loading"}
                      className="bg-[#070707] border border-crimson/20 focus:border-bright-red rounded p-3 text-xs text-white outline-none focus:shadow-neon transition-all"
                      placeholder="e.g. 6303762110"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-orbitron text-[10px] uppercase font-bold tracking-widest text-secondary-text">
                      Project Type
                    </label>
                    <select
                      name="projectType"
                      value={formData.projectType}
                      onChange={handleInputChange}
                      disabled={uiState === "loading"}
                      className="bg-[#070707] border border-crimson/20 focus:border-bright-red rounded p-3 text-xs text-white outline-none focus:shadow-neon transition-all"
                    >
                      <option value="web-dev">Web Development</option>
                      <option value="ai-dev">AI & Automation</option>
                      <option value="cybersecurity">Security Audits</option>
                      <option value="mobile-apps">Mobile Applications</option>
                      <option value="other">Custom Stack</option>
                    </select>
                  </div>
                </div>

                {/* Budget selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-orbitron text-[10px] uppercase font-bold tracking-widest text-secondary-text">
                    Estimated Budget Range
                  </label>
                  <select
                    name="budget"
                    value={formData.budget}
                    onChange={handleInputChange}
                    disabled={uiState === "loading"}
                    className="bg-[#070707] border border-crimson/20 focus:border-bright-red rounded p-3 text-xs text-white outline-none focus:shadow-neon transition-all"
                  >
                    <option value="<$1,000">Less than $1,000</option>
                    <option value="$1,000 - $5,000">$1,000 - $5,000</option>
                    <option value="$5,000 - $15,000">$5,000 - $15,000</option>
                    <option value=">$15,000">Enterprise ($15,000+)</option>
                  </select>
                </div>

                {/* Message body text */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-orbitron text-[10px] uppercase font-bold tracking-widest text-secondary-text">
                    Project Message / Description *
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    disabled={uiState === "loading"}
                    rows={4}
                    className="bg-[#070707] border border-crimson/20 focus:border-bright-red rounded p-3 text-xs text-white outline-none focus:shadow-neon transition-all resize-none"
                    placeholder="Describe details of your app or project specifications..."
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={uiState === "loading"}
                  className="w-full mt-4 flex items-center justify-center gap-2 font-orbitron font-bold uppercase tracking-widest transition-all duration-300 rounded px-6 py-4 text-xs bg-crimson text-white border border-bright-red hover:bg-bright-red disabled:bg-deep-red/60 disabled:cursor-not-allowed hover:shadow-neon"
                >
                  {uiState === "loading" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      SUBMITTING REQUEST...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      SUBMIT PROJECT REQUEST
                    </>
                  )}
                </button>
              </form>
            )}

          </div>

        </div>

      </div>
    </section>
  );
}
