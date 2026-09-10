"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getFirebaseAnalytics, trackEvent } from "@/lib/firebase";

export function FirebaseAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Initialize analytics instance once mounted in the browser
    getFirebaseAnalytics();
  }, []);

  useEffect(() => {
    if (!pathname) return;

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    trackEvent("page_view", {
      page_path: url,
      page_location: typeof window !== "undefined" ? window.location.href : url,
      page_title: typeof document !== "undefined" ? document.title : "",
    });
  }, [pathname, searchParams]);

  return null;
}
