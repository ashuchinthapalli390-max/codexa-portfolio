import React from "react";

export interface ProfileMediaInfo {
  mediaUrl?: string | null;
  profileMediaUrl?: string | null;
  cropX?: number | null;
  cropY?: number | null;
  cropW?: number | null;
  cropH?: number | null;
  cropZoom?: number | null;
  cropRotation?: number | null;
  zoom?: number | null;
  objectPosition?: string | null;
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
  
  const src = profile.profileMediaUrl || profile.mediaUrl || defaultFallback;
  const finalSrc = src ? `${src}${cacheBuster}` : "";

  const zoom = profile.zoom !== undefined && profile.zoom !== null 
    ? profile.zoom 
    : (profile.cropZoom !== undefined && profile.cropZoom !== null ? profile.cropZoom : 1);

  const objectPosition = profile.objectPosition || "center";

  return {
    src: finalSrc,
    containerClass: "relative overflow-hidden w-full h-full",
    imgStyle: {
      width: "100%",
      height: "100%",
      objectFit: "cover" as const,
      objectPosition: objectPosition,
      transform: `scale(${zoom})`,
      transformOrigin: "center",
    },
  };
}
