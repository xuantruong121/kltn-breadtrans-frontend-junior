export type ListeningPlaybackOwner = "NONE" | "QUESTION_SEGMENT" | "FULL_SCRIPT";

export interface ListeningPlaybackOwnership {
  owner: ListeningPlaybackOwner;
  generation: number;
}

export interface AppliedListeningSource extends ListeningPlaybackOwnership {
  url: string;
}

/**
 * Each source-changing async flow must claim the shared audio element first.
 * A later claim invalidates all callbacks from the former owner.
 */
export function claimListeningPlayback(
  current: ListeningPlaybackOwnership,
  owner: ListeningPlaybackOwner,
): ListeningPlaybackOwnership {
  return { owner, generation: current.generation + 1 };
}

export function ownsListeningPlayback(
  current: ListeningPlaybackOwnership,
  owner: ListeningPlaybackOwner,
  generation: number,
): boolean {
  return current.owner === owner && current.generation === generation;
}

export function mayReplaceListeningSource(
  applied: AppliedListeningSource | null,
  owner: ListeningPlaybackOwner,
  generation: number,
  url: string,
): boolean {
  return !(
    owner === "FULL_SCRIPT" &&
    applied?.owner === owner &&
    applied.generation === generation &&
    applied.url !== url
  );
}
