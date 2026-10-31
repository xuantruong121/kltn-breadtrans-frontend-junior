/**
 * Server-paged admin lists: the query an admin list screen sends and the
 * page it gets back. Pure, so it is unit-tested.
 */

export type AdminListPage<T, F = Record<string, unknown>> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  facets: F;
};

export const ADMIN_PAGE_SIZES = [12, 24, 48];

/**
 * Request params: filters left at "ALL" or empty are not sent, search text
 * is trimmed, and page / pageSize always are (they switch the endpoint to
 * paged mode).
 */
export function adminListParams(
  filters: Record<string, string | undefined>,
  page: number,
  pageSize: number,
): Record<string, string | number> {
  const params: Record<string, string | number> = { page, pageSize };
  for (const [key, raw] of Object.entries(filters)) {
    const value = (raw ?? "").trim();
    if (value && value !== "ALL") params[key] = value;
  }
  return params;
}

/** "25–48 / 130": the rows a page shows. */
export function pageRange(page: number, pageSize: number, total: number) {
  if (!total) return "0";
  const first = (page - 1) * pageSize + 1;
  return `${first}–${Math.min(page * pageSize, total)} / ${total}`;
}
