/**
 * Lĩnh vực, the career or study tracks admins manage (owner 2026-11-21).
 * Names, descriptions and order come from the API: GET /learning-tracks for
 * learners (active tracks only), GET /admin/learning-tracks for admins (every
 * track, with usage). Admins create the codes, so a code is any string; the
 * only one the app relies on is GENERAL. No React, no I/O.
 */
import { TRACK_FIELD_COPY } from "../../components/admin/skillCmsStatus.ts";

/** The default track every learner starts on. Admins can rename it, never turn it off or delete it. */
export const GENERAL_TRACK = "GENERAL";

/** The list filter value for "no track yet"; the API reads it as items without tags. */
export const UNTAGGED_FILTER = "UNTAGGED";

/** A track as GET /learning-tracks returns it: active, in the admins' order. */
export type LearningTrackOption = {
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
};

/** Tagged items per skill, and the learners who chose the track. */
export type TrackUsage = {
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
  /** Tags on a TOEIC quiz or on a quiz that is gone: no skill, but they still hold the track. */
  other: number;
  learners: number;
};

/** A row of GET /admin/learning-tracks: every track, turned-off ones too. */
export type AdminLearningTrack = LearningTrackOption & {
  isActive: boolean;
  /** GENERAL: never turned off, never deleted. */
  isSystem: boolean;
  usage: TrackUsage;
};

/** Enough of a track to name it. Only the admin list says whether it is on. */
export type NamedTrack = { code: string; name: string; isActive?: boolean };

/** A track a learner can pick: the public list's rows, or the learner's own from the profile. */
export type TrackChoice = { code: string; name: string; description?: string | null };

/** The name, plus " (đã tắt)" for a track admins turned off. */
export const trackLabel = (track: NamedTrack) =>
  track.isActive === false ? `${track.name} (đã tắt)` : track.name;

/**
 * A list card's track line: the name of each code, in the order given, or
 * "Chưa gắn lĩnh vực". Read against the admin list, a turned-off track says
 * so. A code the list does not hold yet (still loading) shows as the code.
 */
export function trackNames(codes: readonly string[] | undefined, tracks: readonly NamedTrack[]): string {
  if (!codes?.length) return TRACK_FIELD_COPY.untagged;
  const byCode = new Map(tracks.map((track) => [track.code, track]));
  return codes
    .map((code) => {
      const track = byCode.get(code);
      return track ? trackLabel(track) : code;
    })
    .join(", ");
}

/**
 * The tracks a learner can pick: the active ones, plus the learner's current
 * track if admins turned it off since, so the learner keeps it until choosing
 * another (the API allows that). `allTracks` names that track; without it the
 * code stands in. The kept track goes last.
 */
export function trackChoices(
  activeTracks: readonly TrackChoice[],
  currentCode?: string | null,
  allTracks: readonly TrackChoice[] = [],
): TrackChoice[] {
  if (!currentCode || activeTracks.some((track) => track.code === currentCode)) return [...activeTracks];
  const current = allTracks.find((track) => track.code === currentCode) ?? { code: currentCode, name: currentCode };
  return [...activeTracks, current];
}

/**
 * The track filter of the admin content lists: "Tất cả", "Chưa gắn lĩnh
 * vực", then every track in the admins' order, turned-off ones marked.
 */
export function trackFilterOptions(tracks: readonly NamedTrack[]): Array<{ value: string; label: string }> {
  return [
    { value: "ALL", label: "Tất cả" },
    { value: UNTAGGED_FILTER, label: TRACK_FIELD_COPY.untagged },
    ...tracks.map((track) => ({ value: track.code, label: trackLabel(track) })),
  ];
}

/**
 * The tag buttons of one item: every active track, and a turned-off one only
 * while the item still has it, so it can be removed but never added.
 */
export function tagChoices(
  tracks: readonly NamedTrack[],
  selected: readonly string[],
): Array<{ code: string; label: string; selected: boolean }> {
  return tracks
    .filter((track) => track.isActive !== false || selected.includes(track.code))
    .map((track) => ({ code: track.code, label: trackLabel(track), selected: selected.includes(track.code) }));
}
