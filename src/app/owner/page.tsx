"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /owner — Owner Home
 * Redirects to the main owner dashboard at /admin.
 * /owner/access-keys is served directly from its own page.
 */
export default function OwnerHomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#070707] flex items-center justify-center">
      <div className="flex items-center gap-3 text-[#A5A5A5]">
        <svg className="w-5 h-5 animate-spin text-[#D90429]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
        </svg>
        <span className="font-orbitron text-sm tracking-wider">Loading dashboard...</span>
      </div>
    </div>
  );
}
