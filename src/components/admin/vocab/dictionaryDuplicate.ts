/**
 * "Is this word already in the dictionary store?" for the add form
 * (owner 2026-11-28). The store holds one entry per (word, part of speech);
 * the server refuses a second one with a 409, and this lets the form say so
 * while the admin types, before Lưu. Pure, for the Node test runner.
 */
export type StoreEntryLike = {
  id: number;
  headword: string;
  displayWord: string;
  pos: string;
  status: "APPROVED" | "PENDING_REVIEW" | "REJECTED";
};

/** The server's key for a word: trimmed, inner spaces collapsed, lower case. */
export const headwordKey = (word: string) => word.trim().replace(/\s+/g, " ").toLowerCase();

const STATUS_NOTE: Record<StoreEntryLike["status"], string> = {
  APPROVED: "",
  PENDING_REVIEW: " (đang chờ duyệt)",
  REJECTED: " (đã loại)",
};

/** The entry that already holds this word and part of speech, if any (a rejected one still holds it). */
export function findTakenEntry<T extends StoreEntryLike>(items: T[], word: string, pos: string): T | null {
  const key = headwordKey(word);
  if (!key) return null;
  const partOfSpeech = pos.trim().toLowerCase() || "noun";
  return items.find((entry) => entry.headword === key && entry.pos === partOfSpeech) ?? null;
}

/** The line shown under the word box. */
export function takenMessage(entry: StoreEntryLike): string {
  return `"${entry.displayWord}" (${entry.pos}) đã có trong kho từ điển${STATUS_NOTE[entry.status]}.`;
}
