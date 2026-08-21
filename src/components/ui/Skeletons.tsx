"use client";

import React from "react";

export function SkeletonPulse({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-zinc-900/70 border border-zinc-800/60 rounded-lg animate-pulse ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-red-500/5 to-transparent" />
    </div>
  );
}

export function DashboardStatSkeleton() {
  return (
    <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonPulse className="w-24 h-4" />
        <SkeletonPulse className="w-8 h-8 rounded-lg" />
      </div>
      <SkeletonPulse className="w-16 h-8" />
      <SkeletonPulse className="w-32 h-3" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="bg-zinc-950/90 border border-red-500/20 rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-4">
        <SkeletonPulse className="w-20 h-20 rounded-full" />
        <div className="space-y-2 flex-1">
          <SkeletonPulse className="w-40 h-6" />
          <SkeletonPulse className="w-28 h-4" />
        </div>
      </div>
      <div className="space-y-2">
        <SkeletonPulse className="w-full h-4" />
        <SkeletonPulse className="w-3/4 h-4" />
      </div>
      <div className="flex gap-2">
        <SkeletonPulse className="w-20 h-6 rounded-full" />
        <SkeletonPulse className="w-20 h-6 rounded-full" />
        <SkeletonPulse className="w-20 h-6 rounded-full" />
      </div>
    </div>
  );
}

export function ProjectSkeleton() {
  return (
    <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl overflow-hidden space-y-4 p-4">
      <SkeletonPulse className="w-full h-48 rounded-xl" />
      <div className="space-y-2">
        <SkeletonPulse className="w-2/3 h-5" />
        <SkeletonPulse className="w-full h-3" />
        <SkeletonPulse className="w-4/5 h-3" />
      </div>
      <div className="flex gap-2 pt-2">
        <SkeletonPulse className="w-16 h-5 rounded-md" />
        <SkeletonPulse className="w-16 h-5 rounded-md" />
      </div>
    </div>
  );
}

export function ConversationSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/40">
          <SkeletonPulse className="w-12 h-12 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-center">
              <SkeletonPulse className="w-28 h-4" />
              <SkeletonPulse className="w-12 h-3" />
            </div>
            <SkeletonPulse className="w-40 h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div key={i} className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-4">
          <div className="flex items-center gap-3">
            <SkeletonPulse className="w-10 h-10 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <SkeletonPulse className="w-32 h-4" />
              <SkeletonPulse className="w-20 h-3" />
            </div>
          </div>
          <div className="space-y-2">
            <SkeletonPulse className="w-full h-4" />
            <SkeletonPulse className="w-5/6 h-4" />
          </div>
          <SkeletonPulse className="w-full h-40 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function TeamSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-6 rounded-2xl bg-zinc-950/90 border border-zinc-800/80 space-y-4">
          <div className="flex justify-center">
            <SkeletonPulse className="w-28 h-28 rounded-full" />
          </div>
          <div className="text-center space-y-2">
            <SkeletonPulse className="w-32 h-5 mx-auto" />
            <SkeletonPulse className="w-24 h-3.5 mx-auto" />
          </div>
          <SkeletonPulse className="w-full h-12 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function CyberEmptyState({
  title = "No Data Found",
  description = "There are no records matching your current filter criteria.",
  icon,
  action,
}: {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md">
      <div className="w-14 h-14 rounded-2xl bg-red-950/30 border border-red-500/20 flex items-center justify-center text-red-400 mb-4 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
        {icon || (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )}
      </div>
      <h3 className="text-base font-semibold text-white mb-1.5">{title}</h3>
      <p className="text-xs text-zinc-400 max-w-sm mb-5 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
