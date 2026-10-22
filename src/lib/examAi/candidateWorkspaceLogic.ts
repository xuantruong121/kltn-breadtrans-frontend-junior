export type CandidateFilter = "FLAGGED" | "ALL";

export type CandidateLike = { issues: string[]; applied: boolean };

/** FLAGGED is the default view: only unapplied items that have a deterministic warning. */
export function matchesCandidateFilter(
  item: CandidateLike,
  filter: CandidateFilter,
): boolean {
  if (filter === "ALL") return true;
  return item.issues.length > 0 && !item.applied;
}

export function candidateGroupState(
  item: CandidateLike,
): "applied" | "warning" | "ready" {
  if (item.applied) return "applied";
  if (item.issues.length) return "warning";
  return "ready";
}

export function selectAllValidKeys<
  T extends CandidateLike & { candidateKey: string },
>(items: T[]): string[] {
  return items
    .filter((item) => !item.issues.length && !item.applied)
    .map((item) => item.candidateKey);
}

export function selectUnappliedKeys<
  T extends CandidateLike & { candidateKey: string },
>(items: T[]): string[] {
  return items.filter((item) => !item.applied).map((item) => item.candidateKey);
}

export function toggleKey(selected: Set<string>, key: string): Set<string> {
  const next = new Set(selected);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}
