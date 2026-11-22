/**
 * Lĩnh vực on the learner's Nói screens (owner 2026-11-21). Phân loại folded
 * into Lĩnh vực: each set summary from GET /speaking/exercises carries the
 * active tracks it is tagged with, in the admins' order. No React, no I/O.
 */

/** A track on a set summary (practiceSet.tracks). */
export type SetTrack = { code: string; name: string; sortOrder: number };

/** What the chips read from one set card. */
export type ChipSet = {
  tracks?: readonly SetTrack[] | null;
  /** Learners only get published sets; an admin's preview also gets drafts. */
  publicationStatus?: string | null;
};

export type TrackChip = { code: string; label: string; count: number };

/** The chip that shows every set. */
export const ALL_TRACKS = "ALL";

const isPublished = (set: ChipSet) => !set.publicationStatus || set.publicationStatus === "PUBLISHED";

const codesOf = (set: ChipSet) => new Set((set.tracks ?? []).map((track) => track.code));

/**
 * "Tất cả", then each track that has at least one published set, by the
 * admins' order (sortOrder, then name). A count is the sets the chip shows.
 */
export function trackChips(sets: readonly ChipSet[]): TrackChip[] {
  const byCode = new Map<string, { track: SetTrack; count: number; published: boolean }>();
  for (const set of sets) {
    const codes = codesOf(set);
    for (const track of set.tracks ?? []) {
      if (!codes.delete(track.code)) continue; // a code listed twice counts once
      const entry = byCode.get(track.code) ?? { track, count: 0, published: false };
      entry.count += 1;
      entry.published ||= isPublished(set);
      byCode.set(track.code, entry);
    }
  }
  const chips = [...byCode.values()]
    .filter((entry) => entry.published)
    .sort((a, b) => a.track.sortOrder - b.track.sortOrder || a.track.name.localeCompare(b.track.name, "vi"))
    .map(({ track, count }) => ({ code: track.code, label: track.name, count }));
  return [{ code: ALL_TRACKS, label: "Tất cả", count: sets.length }, ...chips];
}

/** True when the set is under the chosen chip. */
export const inTrackChip = (set: ChipSet, chip: string) => chip === ALL_TRACKS || codesOf(set).has(chip);

/** The search box finds a set by a track name too ("y tế" finds a "Y tế" set). */
export const tracksMatchSearch = (tracks: ChipSet["tracks"], query: string) => {
  const q = query.trim().toLocaleLowerCase("vi");
  return Boolean(q) && (tracks ?? []).some((track) => track.name.toLocaleLowerCase("vi").includes(q));
};

/** The exercise header line: "Y tế · Chung", or undefined when the set has no track. */
export const trackLine = (tracks: ChipSet["tracks"]) =>
  (tracks ?? []).map((track) => track.name).join(" · ") || undefined;
