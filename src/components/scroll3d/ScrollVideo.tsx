"use client";

import React, { useEffect, useRef } from "react";

/**
 * Background video from /public/assets/media/<name>.(webm|mp4) with poster.
 * Only plays while on screen to save battery / GPU.
 */
export function ScrollVideo({
  name,
  className = "",
  style,
}: {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      },
      { rootMargin: "200px 0px" }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      className={`w-full h-full object-cover ${className}`}
      style={style}
      poster={`/assets/media/${name}-poster.webp`}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
    >
      <source src={`/assets/media/${name}.webm`} type="video/webm" />
      <source src={`/assets/media/${name}.mp4`} type="video/mp4" />
    </video>
  );
}
