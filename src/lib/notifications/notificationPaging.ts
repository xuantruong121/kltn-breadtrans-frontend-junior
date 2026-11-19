/** Numbered pages on the notifications page. No React, no I/O. */

export const NOTIFICATION_PAGE_SIZES = [10, 20, 50];
export const NOTIFICATION_DEFAULT_PAGE_SIZE = 20;

/**
 * The page to show: the one the server served. A page past the end (its last
 * notification was just deleted) comes back as the last page.
 */
export function servedPage(requested: number, served: { page?: number } | undefined): number {
  return served?.page ?? requested;
}
