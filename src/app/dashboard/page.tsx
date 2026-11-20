"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FolderGit2, User, Sparkles, ArrowUpRight, Plus, CheckCircle2, Clock, CreditCard, GraduationCap, FileText,
  Receipt, Smartphone, Award, Briefcase, Shield, Users, Activity, Circle, LucideIcon,
} from "lucide-react";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { CodeXaAvatar } from "@/components/ui/CodeXaAvatar";
import { ActivityEvent, Post, Project, Profile } from "@/lib/data-store";
import { DashboardStatSkeleton } from "@/components/ui/Skeletons";
import { useAuth } from "@/context/AuthContext";
import { getEffectiveRole, getRoleDisplayName } from "@/lib/permissions";

const EASE = [0.16, 1, 0.3, 1] as const;

type Shortcut = { label: string; href: string; icon: LucideIcon; hint: string };

function shortcutsFor(role: string): Shortcut[] {
  if (role === "INTERN")
    return [
      { label: "Classes", href: "/dashboard/classes", icon: GraduationCap, hint: "Today's sessions" },
      { label: "Assignments", href: "/dashboard/assignments", icon: FileText, hint: "Submit & track" },
      { label: "Payments", href: "/dashboard/payments", icon: Receipt, hint: "Internship fee" },
      { label: "Offer letter", href: "/dashboard/documents?tab=OFFER_LETTERS", icon: Award, hint: "Download" },
    ];
  if (role === "HR")
    return [
      { label: "Employees", href: "/dashboard/employees", icon: Briefcase, hint: "Staff records" },
      { label: "Interns", href: "/dashboard/interns", icon: GraduationCap, hint: "Intern records" },
      { label: "Attendance", href: "/dashboard/attendance", icon: Clock, hint: "Sessions & reports" },
      { label: "Payroll", href: "/dashboard/payroll", icon: CreditCard, hint: "Ledger" },
    ];
  if (role === "FOUNDER" || role === "CO_FOUNDER")
    return [
      { label: "Approvals", href: "/dashboard/approvals", icon: CheckCircle2, hint: "Pending decisions" },
      { label: "Leave", href: "/dashboard/leave", icon: Clock, hint: "Leave requests" },
      { label: "Payments", href: "/dashboard/payments", icon: Receipt, hint: "Verification queue" },
      { label: "Founder console", href: "/owner", icon: Shield, hint: "Owner overview" },
    ];
  if (role === "CEO" || role === "COO" || role === "CTO")
    return [
      { label: "Approvals", href: "/dashboard/approvals", icon: CheckCircle2, hint: "Pending decisions" },
      { label: "Crew", href: "/dashboard/accounts", icon: Users, hint: "Accounts" },
      { label: "Attendance", href: "/dashboard/attendance", icon: Clock, hint: "Analytics" },
      { label: "Payments", href: "/dashboard/payments", icon: Receipt, hint: "UPI & dues" },
    ];
  return [
    { label: "Attendance", href: "/dashboard/attendance", icon: Clock, hint: "My summary" },
    { label: "Payslips", href: "/dashboard/payroll", icon: CreditCard, hint: "Payroll" },
    { label: "Documents", href: "/dashboard/documents", icon: FileText, hint: "My vault" },
    { label: "Apps", href: "/dashboard/apps", icon: Smartphone, hint: "Mobile & desktop" },
  ];
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function fmtDate(v?: string) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

function relTime(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function DashboardOverviewPage() {
  const { user: currentUser } = useAuth();
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [latestPosts, setLatestPosts] = useState<Post[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [internPayment, setInternPayment] = useState<any>(null);
  const [internProfile, setInternProfile] = useState<any>(null);
  const [paymentTimerSeconds, setPaymentTimerSeconds] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const effectiveRole = getEffectiveRole(currentUser);
  const isIntern = effectiveRole === "INTERN";

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    Promise.all([
      fetch("/api/activity").then((r) => r.json()).catch(() => ({ activities: [] })),
      fetch("/api/feed/posts").then((r) => r.json()).catch(() => ({ posts: [] })),
      fetch(`/api/projects?developerId=${currentUser.id}`).then((r) => r.json()).catch(() => ({ projects: [] })),
      fetch(`/api/profile/${currentUser.username}`).then((r) => r.json()).catch(() => ({ profile: null })),
    ])
      .then(([actRes, feedRes, projRes, profRes]) => {
        if (actRes.activities) setActivities(actRes.activities);
        if (feedRes.posts) setLatestPosts(feedRes.posts.slice(0, 4));
        if (projRes.projects) setMyProjects(projRes.projects);
        if (profRes.profile) setProfile(profRes.profile);
      })
      .finally(() => setLoading(false));

    if (effectiveRole === "INTERN") {
      fetch("/api/employment")
        .then((r) => r.json())
        .then((data) => {
          if (data.profiles?.[0]) setInternProfile(data.profiles[0]);
        })
        .catch(() => {});
      fetch("/api/payments/me")
        .then((r) => r.json())
        .then((data) => {
          if (data.payment) {
            setInternPayment(data);
            if (data.activeAttempt?.expiresAt) {
              setPaymentTimerSeconds(Math.max(0, Math.floor((new Date(data.activeAttempt.expiresAt).getTime() - Date.now()) / 1000)));
            }
          }
        })
        .catch(() => {});
    }
  }, [currentUser, effectiveRole]);

  // live countdown for an in-progress payment attempt
  useEffect(() => {
    if (paymentTimerSeconds <= 0) return;
    const t = setInterval(() => setPaymentTimerSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [paymentTimerSeconds > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const checklist = useMemo(
    () => [
      { done: !!profile?.mediaUrl, label: "Add a profile photo" },
      { done: !!profile?.headline, label: "Write a professional headline" },
      { done: !!(profile?.bio && profile.bio.length > 20), label: "Add a short bio" },
      { done: !!(profile?.skills && profile.skills.length >= 3), label: "List at least 3 skills" },
      { done: !!(profile?.githubUrl || profile?.portfolioUrl || profile?.linkedinUrl), label: "Link GitHub, LinkedIn or portfolio" },
    ],
    [profile]
  );
  const completionPct = !profile ? 30 : Math.min(100, 30 + [20, 15, 15, 10, 10].reduce((sum, w, i) => sum + (checklist[i].done ? w : 0), 0));

  const paid = internPayment?.internServicePaymentPaid || internPayment?.payment?.paymentStatus === "APPROVED";
  const verifying = internPayment?.activeAttempt?.status === "VERIFYING" || internPayment?.payment?.paymentStatus === "PENDING_VERIFICATION";
  const inProgress = internPayment?.activeAttempt?.status === "PAYMENT_STARTED" && paymentTimerSeconds > 0;

  const name = profile?.displayName || currentUser?.displayName || "there";
  const shortcuts = shortcutsFor(effectiveRole);

  return (
    <TeamCoreShell>
      <div className="space-y-6">
        {/* ── Welcome hero ── */}
        <motion.section
          initial={{ opacity: 0, y: 20, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
          style={{ transformPerspective: 1200 }}
          className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-br from-crimson/20 via-[#0c0c0c] to-[#080808] p-6 sm:p-8"
        >
          <div className="absolute -right-20 -top-24 w-80 h-80 rounded-full bg-crimson/25 blur-[100px]" />
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <CodeXaAvatar src={profile?.mediaUrl || currentUser?.mediaUrl} alt={name} size="lg" showGlow />
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/50">
                  {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <h1 className="mt-1 font-orbitron font-black text-2xl sm:text-3xl text-white tracking-tight">
                  {greeting()}, {name.split(" ")[0]}
                </h1>
                <p className="mt-1 text-sm text-white/55">
                  <span className="text-bright-red font-semibold">{getRoleDisplayName(effectiveRole)}</span> · CodeXa workspace
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link href={`/team/${currentUser?.username}`} target="_blank" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/15 bg-white/[0.04] hover:border-white/40 text-xs font-semibold text-white transition">
                Public profile <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              <Link href="/dashboard/projects" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-crimson hover:bg-bright-red text-xs font-semibold text-white shadow-[0_0_20px_rgba(217,4,41,0.35)] transition">
                <Plus className="w-3.5 h-3.5" /> New build
              </Link>
            </div>
          </div>
        </motion.section>

        {/* ── Stats ── */}
        {loading ? (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <DashboardStatSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4" style={{ perspective: 1200 }}>
            {isIntern ? (
              <StatCard
                i={0}
                href="/dashboard/payments"
                icon={Receipt}
                label="Internship payment"
                value={paid ? "₹450 Paid" : verifying ? "Verifying" : inProgress ? "In progress" : "₹450 Due"}
                tone={paid ? "good" : verifying || inProgress ? "warn" : "bad"}
                foot={
                  paid
                    ? "Payment successful"
                    : verifying
                    ? "Verification in progress"
                    : inProgress
                    ? `${Math.floor(paymentTimerSeconds / 60)}:${String(paymentTimerSeconds % 60).padStart(2, "0")} remaining`
                    : "Pay now to stay active →"
                }
              />
            ) : (
              <StatCard i={0} href="/dashboard/payroll" icon={CreditCard} label="Payroll & payslips" value="Open ledger" foot="Payouts, payslips & history" />
            )}
            <StatCard i={1} href="/dashboard/projects" icon={FolderGit2} label="My builds" value={String(myProjects.length).padStart(2, "0")} foot={myProjects.length ? "Projects you own or contribute to" : "Publish your first project →"} />
            <StatCard i={2} href="/dashboard/profile" icon={User} label="Profile strength" value={`${completionPct}%`} tone={completionPct >= 90 ? "good" : "warn"} foot={completionPct >= 100 ? "Profile complete" : "Finish setup to stand out →"} progress={completionPct} />
            {isIntern ? (
              <StatCard i={3} href="/dashboard/interns" icon={GraduationCap} label="Internship track" value={internProfile?.internshipDomain || internProfile?.department || "Technical"} foot={internProfile?.status ? `Status · ${internProfile.status}` : "View program details →"} small />
            ) : (
              <StatCard i={3} href="/dashboard/feed" icon={Activity} label="Team updates" value={String(activities.length).padStart(2, "0")} foot="Recent activity across CodeXa" />
            )}
          </div>
        )}

        {/* ── Shortcuts ── */}
        <section>
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-white/40">Quick actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {shortcuts.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div key={s.href} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05, duration: 0.5 }}>
                  <Link href={s.href} className="group flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] hover:border-bright-red/40 p-4 transition">
                    <span className="w-10 h-10 rounded-xl bg-crimson/15 border border-crimson/30 flex items-center justify-center group-hover:bg-crimson transition">
                      <Icon className="w-[18px] h-[18px] text-bright-red group-hover:text-white transition" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-white">{s.label}</span>
                      <span className="block text-xs text-white/40 truncate">{s.hint}</span>
                    </span>
                    <ArrowUpRight className="w-4 h-4 ml-auto text-white/20 group-hover:text-white transition" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── Intern program ── */}
        {isIntern && internProfile && (
          <section className="rounded-3xl border border-white/[0.08] bg-[#0a0a0a]/80 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-400">Active internship track</span>
                <h3 className="mt-1 font-orbitron font-bold text-white">{internProfile.internshipDomain || internProfile.department}</h3>
                <p className="font-mono text-xs text-white/45">
                  {internProfile.employeeId} · {internProfile.designation}
                </p>
              </div>
              <Link href="/dashboard/interns" className="self-start sm:self-auto inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-white/10 hover:border-emerald-400/50 text-xs text-white/80 hover:text-white transition">
                Full details <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { k: "Duration", v: internProfile.internshipDuration || (internProfile.internshipDurationMonths ? `${internProfile.internshipDurationMonths} months` : "—") },
                { k: "Status", v: internProfile.status || "—" },
                { k: "Start date", v: fmtDate(internProfile.internshipStartDate || internProfile.joiningDate) },
                { k: "End date", v: fmtDate(internProfile.internshipEndDate || internProfile.endDate) },
              ].map((d) => (
                <div key={d.k} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-3">
                  <dt className="font-mono text-[10px] uppercase tracking-widest text-white/40">{d.k}</dt>
                  <dd className="mt-1 text-sm font-semibold text-white">{d.v}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* ── Activity + side column ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <section className="xl:col-span-7 rounded-3xl border border-white/[0.08] bg-[#0a0a0a]/80 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="flex items-center gap-2 font-semibold text-white">
                <Sparkles className="w-4 h-4 text-bright-red" /> Recent activity
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/30">{activities.length} events</span>
            </div>
            {activities.length === 0 ? (
              <Empty icon={Activity} text="No recent activity yet. Updates from your team will appear here." />
            ) : (
              <ol className="relative space-y-1 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-white/[0.07]">
                {activities.slice(0, 8).map((act, idx) => (
                  <motion.li key={act.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} className="relative flex gap-4 rounded-2xl p-2 hover:bg-white/[0.02]">
                    <div className="relative z-10 shrink-0">
                      <CodeXaAvatar src={act.actorMediaUrl} alt={act.actorName} size="sm" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{act.title}</p>
                        <span className="shrink-0 font-mono text-[10px] text-white/35">{relTime(act.createdAt)}</span>
                      </div>
                      {act.details && <p className="text-xs text-white/55 leading-relaxed mt-0.5">{act.details}</p>}
                      {act.link && (
                        <Link href={act.link} className="mt-1 inline-flex items-center gap-1 text-xs text-bright-red hover:text-white">
                          Open <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </motion.li>
                ))}
              </ol>
            )}
          </section>

          <div className="xl:col-span-5 space-y-6">
            {/* profile checklist */}
            <section className="rounded-3xl border border-white/[0.08] bg-[#0a0a0a]/80 p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <Ring pct={completionPct} />
                <div>
                  <h2 className="font-semibold text-white">Complete your profile</h2>
                  <p className="text-xs text-white/50">A complete profile appears on the public team page.</p>
                </div>
              </div>
              <ul className="mt-5 space-y-2">
                {checklist.map((c) => (
                  <li key={c.label} className="flex items-center gap-2.5 text-sm">
                    {c.done ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Circle className="w-4 h-4 text-white/20" />}
                    <span className={c.done ? "text-white/45 line-through" : "text-white/80"}>{c.label}</span>
                  </li>
                ))}
              </ul>
              <Link href="/dashboard/profile" className="mt-5 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-white/[0.05] hover:bg-crimson border border-white/10 hover:border-bright-red text-xs font-semibold text-white transition">
                <User className="w-3.5 h-3.5" /> Edit my profile
              </Link>
            </section>

            {/* posts */}
            <section className="rounded-3xl border border-white/[0.08] bg-[#0a0a0a]/80 p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white">Latest team posts</h2>
                <Link href="/dashboard/feed" className="text-xs text-bright-red hover:text-white inline-flex items-center gap-1">
                  Feed <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              {latestPosts.length === 0 ? (
                <Empty icon={Users} text="No posts yet — share the first update with your team." />
              ) : (
                <div className="space-y-3">
                  {latestPosts.map((p) => (
                    <div key={p.id} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-3.5">
                      <div className="flex items-center gap-2.5">
                        <CodeXaAvatar src={p.author?.mediaUrl} alt={p.author?.displayName} size="xs" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{p.author?.displayName}</p>
                          <p className="font-mono text-[10px] text-white/35">@{p.author?.username}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-white/60 line-clamp-2 leading-relaxed">{p.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* my builds */}
            {myProjects.length > 0 && (
              <section className="rounded-3xl border border-white/[0.08] bg-[#0a0a0a]/80 p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-white">My builds</h2>
                  <Link href="/dashboard/projects" className="text-xs text-bright-red hover:text-white inline-flex items-center gap-1">
                    Manage <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
                <ul className="space-y-2">
                  {myProjects.slice(0, 4).map((p) => (
                    <li key={p.id}>
                      <Link href={`/projects/${p.slug}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/[0.03]">
                        <img src={p.thumbnailUrl || "/assets/images/logo.jpeg"} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-white truncate">{p.title}</span>
                          <span className="block font-mono text-[10px] text-white/40">{p.category} · {p.status}</span>
                        </span>
                        <ArrowUpRight className="w-4 h-4 text-white/25" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="flex items-center gap-2 px-1 text-xs text-white/35">
              <Shield className="w-3.5 h-3.5" /> Secure session · press <kbd className="px-1 rounded border border-white/10 font-mono">Ctrl K</kbd> to jump anywhere
            </div>
          </div>
        </div>
      </div>
    </TeamCoreShell>
  );
}

/* ───────────────────────── pieces ───────────────────────── */

function StatCard({
  i, href, icon: Icon, label, value, foot, tone, progress, small,
}: {
  i: number;
  href: string;
  icon: LucideIcon;
  label: string;
  value: string;
  foot: string;
  tone?: "good" | "warn" | "bad";
  progress?: number;
  small?: boolean;
}) {
  const toneCls = tone === "good" ? "text-emerald-400" : tone === "warn" ? "text-amber-300" : tone === "bad" ? "text-bright-red" : "text-white/45";
  return (
    <motion.div initial={{ opacity: 0, rotateX: -30, y: 20 }} animate={{ opacity: 1, rotateX: 0, y: 0 }} transition={{ delay: i * 0.07, duration: 0.7, ease: EASE }}>
      <Link href={href} className="group block h-full rounded-3xl border border-white/[0.08] bg-[#0a0a0a]/80 hover:border-bright-red/40 p-5 transition">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">{label}</span>
          <span className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center group-hover:bg-crimson/20 transition">
            <Icon className="w-4 h-4 text-bright-red" />
          </span>
        </div>
        <div className={`mt-3 font-orbitron font-black text-white truncate ${small ? "text-lg sm:text-xl" : "text-2xl sm:text-3xl"}`}>{value}</div>
        {progress !== undefined && (
          <div className="mt-3 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, ease: EASE }} className="h-full bg-gradient-to-r from-crimson to-bright-red" />
          </div>
        )}
        <p className={`mt-2 text-xs ${toneCls}`}>{foot}</p>
      </Link>
    </motion.div>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
        <circle cx="32" cy="32" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none" />
        <motion.circle
          cx="32" cy="32" r={r} stroke="#FF1E3C" strokeWidth="6" fill="none" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * pct) / 100 }}
          transition={{ duration: 1.2, ease: EASE }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-orbitron font-bold text-sm text-white">{pct}%</span>
    </div>
  );
}

function Empty({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 py-10 px-6 text-center">
      <Icon className="w-6 h-6 mx-auto text-white/20" />
      <p className="mt-2 text-xs text-white/45 max-w-xs mx-auto">{text}</p>
    </div>
  );
}
