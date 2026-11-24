/** One page of a learner catalog that is filtered in the browser. No React. */
export const CATALOG_PAGE_SIZES = [12, 24, 48];
/**
 * The picture catalog shows five cards a row on a wide screen (owner
 * 2026-11-24): a page of 20 fills whole rows at 5, 4, 2 and 1 columns.
 */
export const PICTURE_CATALOG_PAGE_SIZES = [20, 40, 60];

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
