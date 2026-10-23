export type OutlineIssue = { groupId?: number; questionId?: number };
export type OutlineGroup = { id: number; part: number; questions: { id: number }[] };

export type OutlineState = "READY" | "WARNING" | "INCOMPLETE";

export type LrOutlineRow = {
  part: number;
  skill: "LISTENING" | "READING";
  questionCount: number;
  issueCount: number;
  state: OutlineState;
};

const LISTENING_PARTS = new Set([1, 2, 3, 4]);

export function buildLrOutline(
  groups: OutlineGroup[],
  issues: OutlineIssue[],
): LrOutlineRow[] {
  const groupPartById = new Map(groups.map((g) => [g.id, g.part]));
  const questionPartById = new Map<number, number>();
  for (const g of groups) for (const q of g.questions) questionPartById.set(q.id, g.part);

  const issueCountByPart = new Map<number, number>();
  for (const issue of issues) {
    const part =
      (issue.groupId !== undefined ? groupPartById.get(issue.groupId) : undefined) ??
      (issue.questionId !== undefined ? questionPartById.get(issue.questionId) : undefined);
    if (part === undefined) continue;
    issueCountByPart.set(part, (issueCountByPart.get(part) ?? 0) + 1);
  }

  return [1, 2, 3, 4, 5, 6, 7].map((part) => {
    const partGroups = groups.filter((g) => g.part === part);
    const questionCount = partGroups.reduce((total, g) => total + g.questions.length, 0);
    const issueCount = issueCountByPart.get(part) ?? 0;
    const state: OutlineState =
      questionCount === 0 ? "INCOMPLETE" : issueCount > 0 ? "WARNING" : "READY";
    return {
      part,
      skill: LISTENING_PARTS.has(part) ? "LISTENING" : "READING",
      questionCount,
      issueCount,
      state,
    };
  });
}

export function groupBySkill(rows: LrOutlineRow[]) {
  return {
    listening: rows.filter((r) => r.skill === "LISTENING"),
    reading: rows.filter((r) => r.skill === "READING"),
  };
}
