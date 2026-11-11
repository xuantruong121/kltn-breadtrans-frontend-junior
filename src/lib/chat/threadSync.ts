/**
 * Brings a chat thread up to date from the server's latest messages. The
 * socket delivers messages at once, but a dropped socket must not leave a
 * side waiting for a reload, so an open thread is also synced on a timer.
 */
export type SyncMessage = {
  id?: string | number;
  clientMessageId?: string;
  role: "user" | "assistant" | "admin" | "system";
  content: string;
  timestamp: number;
};

const sameText = (a: string, b: string) => a.trim() === b.trim();

/**
 * The thread with the server messages it does not hold yet, oldest first.
 * Returns the same array when there is nothing new, so a store can skip the
 * update. A message the thread shows only locally (still sending, or a
 * system line written on the socket event) is matched to its stored copy
 * instead of being shown twice.
 */
export function mergeServerMessages<T extends SyncMessage>(
  existing: T[],
  server: T[],
): T[] {
  const ids = new Set(existing.map((m) => String(m.id)));
  const clientIds = new Set(
    existing.map((m) => m.clientMessageId).filter(Boolean) as string[],
  );
  const fresh = server.filter((m) => {
    if (m.id !== undefined && ids.has(String(m.id))) return false;
    if (m.clientMessageId && clientIds.has(m.clientMessageId)) return false;
    const localTwin = existing.some(
      (e) =>
        e.role === m.role &&
        sameText(e.content, m.content) &&
        typeof e.id !== "number" &&
        Math.abs(e.timestamp - m.timestamp) < 120_000,
    );
    return !localTwin;
  });
  if (fresh.length === 0) return existing;
  return [...existing, ...fresh].sort((a, b) => a.timestamp - b.timestamp);
}
