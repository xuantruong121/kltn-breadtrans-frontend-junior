export type CandidateFilter = "FLAGGED" | "ALL";

export type CandidateLike = {
  issues: string[];
  applied: boolean;
  /** A group's questions carry their own warnings (missing key, duplicate options). */
  questions?: Array<{ issues: string[] }>;
};

/**
 * A warning on the item or on any of its questions (owner 2026-11-26: the
 * server counts both in flaggedCount, the page looked at the item only).
 */
export const hasIssues = (item: CandidateLike) =>
  item.issues.length > 0 || (item.questions ?? []).some((question) => question.issues.length > 0);

/** FLAGGED is the default view: only unapplied items that have a deterministic warning. */
export function matchesCandidateFilter(
  item: CandidateLike,
  filter: CandidateFilter,
): boolean {
  if (filter === "ALL") return true;
  return hasIssues(item) && !item.applied;
}

/**
 * "Cần kiểm tra" on the summary: the items the default view lists. An
 * applied item with a warning is not counted: it can no longer change here
 * (job 8b76100b showed "2" over an empty list).
 */
export const toCheckCount = (items: CandidateLike[]) =>
  items.filter((item) => matchesCandidateFilter(item, "FLAGGED")).length;

export function candidateGroupState(
  item: CandidateLike,
): "applied" | "warning" | "ready" {
  if (item.applied) return "applied";
  if (hasIssues(item)) return "warning";
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
        !hasIssues(item) && !item.applied && item.applyDecision?.ok !== false,
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
