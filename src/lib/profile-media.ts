import React from "react";

export interface ProfileMediaInfo {
  mediaUrl?: string | null;
  cropX?: number | null;
  cropY?: number | null;
  cropW?: number | null;
  cropH?: number | null;
  cropRotation?: number | null;
  updatedAt?: string | Date | null;
}

/**
 * Returns parent container classes and child img styles to correctly crop
 * and position profile images (especially animated GIFs) using percentage-based crop data.
 * Automatically appends a cache buster parameter using updatedAt to prevent stale previews.
 */
export function getProfileImageStyle(profile: ProfileMediaInfo, defaultFallback = "") {
  const time = profile.updatedAt ? new Date(profile.updatedAt).getTime() : null;
  const cacheBuster = time ? `?v=${time}` : "";
  const src = profile.mediaUrl ? `${profile.mediaUrl}${cacheBuster}` : defaultFallback;

  const hasCrop =
    profile.mediaUrl &&
    profile.cropX !== null &&
    profile.cropY !== null &&
    profile.cropW !== null &&
    profile.cropH !== null &&
    profile.cropW !== 0 &&
    profile.cropH !== 0;

  if (hasCrop) {
    const scale = 100 / (profile.cropW ?? 100);
    const leftVal = -(profile.cropX ?? 0) * scale;
    const topVal = -(profile.cropY ?? 0) * scale;
    const rot = profile.cropRotation ?? 0;

    return {
      src,
      containerClass: "relative overflow-hidden w-full h-full",
      imgStyle: {
        position: "absolute" as const,
        width: `${scale * 100}%`,
        height: `${scale * 100}%`,
        left: `${leftVal}%`,
        top: `${topVal}%`,
        transform: `rotate(${rot}deg)`,
        transformOrigin: "center",
        objectFit: "cover" as const,
      },
    };
  }

  return {
    src,
    containerClass: "relative overflow-hidden w-full h-full",
    imgStyle: {
      width: "100%",
      height: "100%",
      objectFit: "cover" as const,
    },
  };
}
