/**
 * Why a draft cannot be published yet, in the words of its editor's
 * checklist ("Trước khi xuất bản"). One wording for the editor, the list card
 * and the server's refusal (QA 2026-11-22: the list's publish icon skipped
 * the checklist). Pure.
 */

export type ChecklistEntry = {
  label: string;
  done: boolean;
  /** Advisory items never block publishing. */
  optional?: boolean;
};

/** "Còn thiếu: a; b." or null when nothing is missing. */
export function missingText(missing: string[]): string | null {
  return missing.length ? `Còn thiếu: ${missing.join("; ")}.` : null;
}

/** "Phiên âm 1/3 từ" -> "phiên âm 1/3 từ"; a step name ("Trắc nghiệm") keeps its capital. */
const inSentence = (label: string) => label.charAt(0).toLocaleLowerCase("vi") + label.slice(1);

/** The checklist items that block: required and not done. */
export const missingItems = (checklist: ChecklistEntry[]) =>
  checklist.filter((item) => !item.optional && !item.done).map((item) => inSentence(item.label));

/** The editor's blocker: unsaved changes first, then the required items. */
export function checklistBlocker(checklist: ChecklistEntry[], unsaved: boolean): string | null {
  if (unsaved) return "Lưu thay đổi trước khi xuất bản.";
  return missingText(missingItems(checklist));
}

/**
 * A list card's blocker. The server sends `publishProblems` with each draft
 * of the page (the same rule its publish runs); `fallback` covers a server
 * that does not send it yet. A published item has nothing to check.
 */
export function listPublishBlocker(
  row: { publicationStatus: string; publishProblems?: string[] | null },
  fallback: () => string[],
): string | null {
  if (row.publicationStatus === "PUBLISHED") return null;
  return missingText(Array.isArray(row.publishProblems) ? row.publishProblems : fallback());
}
