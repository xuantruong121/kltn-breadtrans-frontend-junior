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

/** Valid means no warning and, when the server decided, allowed to Apply. */
export function selectAllValidKeys<
  T extends CandidateLike & {
    candidateKey: string;
    applyDecision?: { ok: boolean };
  },
>(items: T[]): string[] {
  return items
    .filter(
      (item) =>
        !item.issues.length && !item.applied && item.applyDecision?.ok !== false,
    )
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

/**
 * A draft key in words: "LR:P3:G2" is "Part 3 · Nhóm 2", "SPEAKING" is
 * "Speaking" (owner 2026-11-25: the held-back list showed the raw key).
 */
export function candidateKeyLabel(key: string): string {
  const lr = /^LR:P(\d+):G(\d+)$/.exec(key);
  if (lr) return `Part ${lr[1]} · Nhóm ${lr[2]}`;
  const task = /^(SPEAKING|WRITING):TASK(\d+)$/.exec(key);
  if (task) return `${task[1] === "SPEAKING" ? "Speaking" : "Writing"} · Task ${task[2]}`;
  if (key === "SPEAKING") return "Speaking";
  if (key === "WRITING") return "Writing";
  return key;
}

export type PartCoverage = { part: number; expected: number; drafted: number };

/** Parts the draft holds fewer questions for than the exam frame needs. */
export function shortParts(coverage: PartCoverage[] | null | undefined): PartCoverage[] {
  return (coverage ?? []).filter((row) => row.drafted < row.expected);
}
