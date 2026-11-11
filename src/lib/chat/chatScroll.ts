/**
 * How a chat panel moves its message list, following what chat interfaces
 * commonly do (owner 2026-11-11):
 *
 * - opening the panel lands on the latest message;
 * - a new message brings the view down only when the reader is already near
 *   the bottom, or when it is their own message; someone reading older
 *   messages is left where they are and told how many arrived;
 * - loading older messages never moves what is on screen;
 * - Enter sends, Shift+Enter makes a new line, and the Enter that confirms a
 *   word in an input method (Telex, VNI) is not a send.
 *
 * Pure: no DOM, no React.
 */

/** Within this many pixels of the end, the reader counts as "at the bottom". */
export const NEAR_BOTTOM_PX = 80;

export type ScrollMetrics = { scrollTop: number; clientHeight: number; scrollHeight: number };

export const distanceFromBottom = (m: ScrollMetrics): number =>
  Math.max(0, m.scrollHeight - (m.scrollTop + m.clientHeight));

export const isNearBottom = (m: ScrollMetrics): boolean => distanceFromBottom(m) < NEAR_BOTTOM_PX;

export type ListChange = {
  /** The list was already placed once since the panel opened (or the thread changed). */
  placed: boolean;
  previousCount: number;
  count: number;
  /** Older messages were just put at the top. */
  prepended: boolean;
  /** The newest message was written by the person looking at the panel. */
  lastIsMine: boolean;
  nearBottom: boolean;
};

export type ScrollAction =
  /** Keep what is on screen where it is (older messages were added above). */
  | "KEEP_POSITION"
  /** Go straight to the end, no animation: the panel has just been opened. */
  | "JUMP_TO_BOTTOM"
  /** Follow the new message down. */
  | "FOLLOW"
  /** Leave the reader alone and count the message as not seen yet. */
  | "COUNT_UNSEEN"
  | "NONE";

export function scrollActionFor(change: ListChange): ScrollAction {
  if (change.prepended) return "KEEP_POSITION";
  if (change.count === 0) return "NONE";
  if (!change.placed) return "JUMP_TO_BOTTOM";
  if (change.count <= change.previousCount) return "NONE";
  return change.lastIsMine || change.nearBottom ? "FOLLOW" : "COUNT_UNSEEN";
}

/** The label of the "back to the latest message" button, shown whenever the reader has left the bottom. */
export function jumpButtonLabel(unseen: number): string {
  return unseen > 0 ? `Tin mới nhất (${unseen > 99 ? "99+" : unseen})` : "Tin mới nhất";
}

/** Whether this key press sends the message. */
export function sendsOnKey(event: {
  key: string;
  shiftKey: boolean;
  /** True while an input method is composing a word. */
  isComposing?: boolean;
  keyCode?: number;
}): boolean {
  if (event.key !== "Enter" || event.shiftKey) return false;
  // 229: the key event an input method reports while composing, in browsers that leave isComposing false.
  return !event.isComposing && event.keyCode !== 229;
}

/** Height of the growing message box: its content, up to `maxLines` lines. */
export function composerHeight(contentHeight: number, lineHeight: number, padding: number, maxLines = 4): number {
  const max = lineHeight * maxLines + padding;
  const min = lineHeight + padding;
  return Math.min(max, Math.max(min, Math.ceil(contentHeight)));
}
