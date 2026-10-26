export type ToeicDetailPresentation = {
  badge: string;
  summary: string;
  /** Learner-facing wording for the exam format row. */
  format: string;
};

const FAMILY_PRESENTATIONS: Record<string, ToeicDetailPresentation> = {
  TOEIC_SW: {
    badge: "TOEIC Speaking & Writing",
    summary:
      "Một bài luyện TOEIC gồm 11 nhiệm vụ Speaking và 8 nhiệm vụ Writing.",
    format: "2 kỹ năng (Speaking + Writing)",
  },
  TOEIC_4_SKILLS: {
    badge: "TOEIC 4 Skills",
    summary:
      "Một bài luyện TOEIC tích hợp Listening, Reading, Speaking và Writing.",
    format: "4 kỹ năng (Listening + Reading + Speaking + Writing)",
  },
};

const FALLBACK_PRESENTATION: ToeicDetailPresentation = {
  badge: "TOEIC",
  summary: "Bài luyện theo cấu trúc TOEIC.",
  format: "Theo cấu trúc TOEIC",
};

export function getToeicDetailPresentation(
  productFamily?: string | null,
): ToeicDetailPresentation {
  return FAMILY_PRESENTATIONS[productFamily ?? ""] ?? FALLBACK_PRESENTATION;
}

/**
 * A component is a skill group, never a numbered TOEIC Part. Speaking and
 * Writing have no Part numbers, so they are labelled by skill.
 */
const COMPONENT_LABELS: Record<string, string> = {
  LISTENING_READING: "Listening + Reading",
  SPEAKING: "Speaking",
  WRITING: "Writing",
};

/**
 * Durations are product constants, not database values: the backend stores how
 * many tasks a component has, not how long the room allows. They mirror the
 * timings the L&R briefing already shows (Listening 45 + Reading 75 = 120).
 */
const COMPONENT_DURATION_MINUTES: Record<string, number> = {
  LISTENING_READING: 120,
  SPEAKING: 20,
  WRITING: 60,
};

/** Listening/Reading is measured in questions, the productive skills in tasks. */
const COMPONENT_UNIT: Record<string, string> = {
  LISTENING_READING: "câu",
  SPEAKING: "nhiệm vụ",
  WRITING: "nhiệm vụ",
};

/** Approximate durations are phrased as such; Writing is a fixed 60 minutes. */
const COMPONENT_DURATION_IS_APPROXIMATE: Record<string, boolean> = {
  LISTENING_READING: true,
  SPEAKING: true,
  WRITING: false,
};

export type ToeicAssessmentComponentView = {
  id: number;
  kind: string;
  order: number;
  itemCount?: number | null;
  readiness?: { ready?: boolean; reason?: string | null } | null;
};

/** One left-column row: a skill group with its real size and duration. */
export type ToeicStructureRow = {
  key: string;
  label: string;
  measure: string;
  meta?: string;
};

/** Right-column facts, kept as plain data so this module stays JSX-free. */
export type ToeicAssessmentSummaryFacts = {
  /**
   * A single total is only meaningful when every component is counted in the
   * same unit. Listening/Reading is measured in questions while Speaking and
   * Writing are measured in tasks, so a 4 Skills exam must not advertise
   * "219 nhiệm vụ" by adding 200 questions to 19 tasks.
   */
  totalLabel: string | null;
  totalValue: string | null;
  /** Per-skill sizes, used when the units differ. */
  itemLines: string[];
  durationLines: string[];
  format: string;
};

export function getToeicComponentLabel(kind: string): string {
  return COMPONENT_LABELS[kind] ?? kind;
}

export function formatToeicComponentDuration(kind: string): string | undefined {
  const minutes = COMPONENT_DURATION_MINUTES[kind];
  if (minutes === undefined) return undefined;
  return COMPONENT_DURATION_IS_APPROXIMATE[kind]
    ? `Khoảng ${minutes} phút`
    : `${minutes} phút`;
}

function formatItemCount(
  component: ToeicAssessmentComponentView,
): string | undefined {
  if (typeof component.itemCount !== "number") return undefined;
  const unit = COMPONENT_UNIT[component.kind] ?? "nhiệm vụ";
  return `${component.itemCount} ${unit}`;
}

const byOrder = (
  a: ToeicAssessmentComponentView,
  b: ToeicAssessmentComponentView,
) => a.order - b.order;

export function buildAssessmentStructureRows(
  components: ToeicAssessmentComponentView[],
): ToeicStructureRow[] {
  return [...components].sort(byOrder).map((component) => ({
    key: String(component.id),
    label: getToeicComponentLabel(component.kind),
    measure: formatItemCount(component) ?? "Theo cấu trúc TOEIC",
    meta: formatToeicComponentDuration(component.kind),
  }));
}

export function buildAssessmentSummaryFacts(
  components: ToeicAssessmentComponentView[],
  productFamily?: string | null,
): ToeicAssessmentSummaryFacts {
  const ordered = [...components].sort(byOrder);
  const counted = ordered.filter(
    (component) => typeof component.itemCount === "number",
  );
  const units = new Set(
    counted.map((component) => COMPONENT_UNIT[component.kind] ?? "nhiệm vụ"),
  );
  const sameUnit = units.size === 1 ? [...units][0] : null;
  const total = counted.reduce(
    (sum, component) => sum + (component.itemCount as number),
    0,
  );
  return {
    totalLabel:
      counted.length && sameUnit
        ? sameUnit === "câu"
          ? "Số câu hỏi"
          : "Tổng nhiệm vụ"
        : null,
    totalValue:
      counted.length && sameUnit
        ? sameUnit === "câu"
          ? `${total} câu`
          : `${total}`
        : null,
    itemLines: counted.map(
      (component) =>
        `${getToeicComponentLabel(component.kind)} ${formatItemCount(component)}`,
    ),
    durationLines: ordered.map((component) => {
      const duration = formatToeicComponentDuration(component.kind);
      const label = getToeicComponentLabel(component.kind);
      return duration ? `${label} ${duration.toLowerCase()}` : label;
    }),
    format: getToeicDetailPresentation(productFamily).format,
  };
}

/**
 * Readiness stays server-authoritative: the page only reflects what each
 * component reported, and surfaces the reasons it was not ready.
 */
export function resolveAssessmentReadiness(
  components: ToeicAssessmentComponentView[],
): { ready: boolean; reasons: string[] } {
  if (!components.length) {
    return { ready: false, reasons: ["Bài thi chưa có phần thi nào."] };
  }
  const reasons = [...components]
    .sort(byOrder)
    .filter((component) => component.readiness?.ready !== true)
    .map(
      (component) =>
        `${getToeicComponentLabel(component.kind)}: ${
          component.readiness?.reason ?? "chưa sẵn sàng"
        }`,
    );
  return { ready: reasons.length === 0, reasons };
}
