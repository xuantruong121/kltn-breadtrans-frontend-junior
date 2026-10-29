/**
 * Whether an avatar shows its image or its fallback (initials, an icon).
 *
 * An avatar URL can be missing, or present but fail to load: Google profile
 * photos answer 429 to hot-linked requests at times. Both cases show the
 * fallback. A URL that failed once is not retried while it stays the same, so
 * a failing image cannot loop between error and retry; a new URL gets one try.
 */
export type AvatarImageState = "image" | "fallback";

export function avatarImageState(
  src: string | null | undefined,
  failedSrc: string | null,
): AvatarImageState {
  if (!src || !src.trim()) return "fallback";
  return src === failedSrc ? "fallback" : "image";
}
