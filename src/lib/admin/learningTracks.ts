/**
 * The Lĩnh vực admin page (owner 2026-11-21): which row actions show, the
 * order PUT /admin/learning-tracks/order wants after a move, the count line
 * and the form bodies. An action that cannot run is left out, never shown
 * faded. No React, no I/O, so each rule is unit-tested.
 */
import { GENERAL_TRACK, type AdminLearningTrack, type TrackUsage } from "../learning-path/tracks.ts";

export type TrackRowAction = "edit" | "up" | "down" | "deactivate" | "activate" | "delete";

export const TRACK_ACTION_LABEL: Record<TrackRowAction, string> = {
  edit: "Sửa",
  up: "Lên",
  down: "Xuống",
  deactivate: "Tắt",
  activate: "Bật",
  delete: "Xoá",
};

/** True while any item is tagged with the track or any learner chose it. */
export const isTrackInUse = (usage: TrackUsage) => Object.values(usage).some((count) => count > 0);

/**
 * The actions of the row at `index` of `total`, in display order. GENERAL is
 * never turned off or deleted, a track in use is never deleted, the first row
 * has no "Lên" and the last no "Xuống". The API refuses the same.
 */
export function trackRowActions(
  track: Pick<AdminLearningTrack, "code" | "isActive" | "isSystem" | "usage">,
  index: number,
  total: number,
): TrackRowAction[] {
  const general = track.isSystem || track.code === GENERAL_TRACK;
  const actions: TrackRowAction[] = ["edit"];
  if (index > 0) actions.push("up");
  if (index < total - 1) actions.push("down");
  if (!track.isActive) actions.push("activate");
  else if (!general) actions.push("deactivate");
  if (!general && !isTrackInUse(track.usage)) actions.push("delete");
  return actions;
}

/** Every code, each once, after moving `code` one row up (-1) or down (+1). */
export function movedTrackOrder(codes: readonly string[], code: string, step: -1 | 1): string[] {
  const order = [...codes];
  const from = order.indexOf(code);
  const to = from + step;
  if (from < 0 || to < 0 || to >= order.length) return order;
  [order[from], order[to]] = [order[to], order[from]];
  return order;
}

/** "6 lĩnh vực · 5 đang bật" */
export const trackStats = (tracks: ReadonlyArray<Pick<AdminLearningTrack, "isActive">>) =>
  `${tracks.length} lĩnh vực · ${tracks.filter((track) => track.isActive).length} đang bật`;

export type TrackDraft = { name: string; code: string; description: string };

export const EMPTY_TRACK_DRAFT: TrackDraft = { name: "", code: "", description: "" };

/**
 * POST /admin/learning-tracks: the name, plus the code and the description
 * only when typed (the server makes the code from the name). Null without a
 * name.
 */
export function newTrackBody(draft: TrackDraft): { name: string; code?: string; description?: string } | null {
  const name = draft.name.trim();
  if (!name) return null;
  const code = draft.code.trim();
  const description = draft.description.trim();
  return { name, ...(code ? { code } : {}), ...(description ? { description } : {}) };
}

/** PATCH /admin/learning-tracks/:code: an emptied description clears it. Null without a name. */
export function editTrackBody(draft: Pick<TrackDraft, "name" | "description">): { name: string; description: string } | null {
  const name = draft.name.trim();
  return name ? { name, description: draft.description.trim() } : null;
}
