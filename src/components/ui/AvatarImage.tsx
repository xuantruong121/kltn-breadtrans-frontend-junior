"use client";

import { useState, type ReactNode } from "react";

import { avatarImageState } from "@/lib/ui/avatarFallback";

type AvatarImageProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** What the avatar showed before for a missing URL (initials, an icon). */
  fallback: ReactNode;
};

/**
 * An avatar image that falls back when the URL is missing or fails to load,
 * instead of showing a broken-image icon. See lib/ui/avatarFallback.
 */
export function AvatarImage({ src, alt, className, fallback }: AvatarImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (avatarImageState(src, failedSrc) === "fallback") return <>{fallback}</>;
  return <img src={src!} alt={alt} className={className} onError={() => setFailedSrc(src!)} />;
}
