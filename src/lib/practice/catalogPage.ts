/** One page of a learner catalog that is filtered in the browser. No React. */
export const CATALOG_PAGE_SIZES = [12, 24, 48];

export function catalogPage<T>(items: readonly T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  // A list that shrank keeps the reader on its last page, not an empty one.
  const current = Math.min(Math.max(1, page), totalPages);
  return {
    items: items.slice((current - 1) * pageSize, current * pageSize),
    page: current,
    totalPages,
  };
}
