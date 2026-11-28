/**
 * Matching for the category box of the vocab forms (owner 2026-11-28). A
 * category is only text kept on each deck, so a typing slip ("Tiếng anh học
 * thuat") makes a new group. These helpers compare without case and without
 * accents, so the box can offer the existing name instead. Pure, for the Node
 * test runner.
 */

/** Lower case, accents removed (đ too), inner spaces collapsed. */
export function categoryKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** The categories that contain what was typed (all of them when nothing is typed). */
export function filterCategories(options: string[], typed: string): string[] {
  const key = categoryKey(typed);
  if (!key) return options;
  return options.filter((option) => categoryKey(option).includes(key));
}

/** The existing category with exactly this name, if any. */
export function exactCategory(options: string[], typed: string): string | null {
  const name = typed.trim().replace(/\s+/g, " ");
  return name ? (options.find((option) => option === name) ?? null) : null;
}

/**
 * An existing category that is the same name written differently (case,
 * accents, spaces), so a new group is not made by accident. Null when the
 * typed name is exactly an existing one, or matches none.
 */
export function nearCategory(options: string[], typed: string): string | null {
  const key = categoryKey(typed);
  if (!key || exactCategory(options, typed)) return null;
  return options.find((option) => categoryKey(option) === key) ?? null;
}

/** What the box offers as a new category: the typed name tidied, or null if empty or already there. */
export function newCategoryName(options: string[], typed: string): string | null {
  const name = typed.trim().replace(/\s+/g, " ");
  if (!name) return null;
  return options.some((option) => categoryKey(option) === categoryKey(name)) ? null : name;
}
