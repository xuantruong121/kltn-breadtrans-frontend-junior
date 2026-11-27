/**
 * How many toasts stay on screen at once (owner 2026-11-27): several notices
 * arriving together filled the top of the page. The newest sits on top; one
 * that is pushed past the limit is dismissed, so it fades out as any toast does.
 */
export const TOAST_LIMIT = 4;

/**
 * The toasts to dismiss, given the toaster's list (newest first). Toasts already
 * on their way out (`visible: false`) are not counted and not dismissed again.
 */
export function toastsToDismiss(
  toasts: ReadonlyArray<{ id: string; visible: boolean }>,
  limit: number = TOAST_LIMIT,
): string[] {
  return toasts
    .filter((t) => t.visible)
    .slice(Math.max(0, limit))
    .map((t) => t.id);
}
