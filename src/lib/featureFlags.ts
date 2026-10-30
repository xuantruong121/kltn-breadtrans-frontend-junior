/**
 * Product switches read at build time.
 *
 * Courses are hidden (owner decision 2026-10-30): no navigation, no links, and
 * next.config.ts redirects every course route. The code and data stay, so
 * NEXT_PUBLIC_COURSES_ENABLED=true brings them back.
 */
export const COURSES_ENABLED = process.env.NEXT_PUBLIC_COURSES_ENABLED === "true";

/** Keeps an item only when courses are enabled. */
export function whenCourses<T>(...items: T[]): T[] {
  return COURSES_ENABLED ? items : [];
}
