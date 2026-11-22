/**
 * The learning goal after onboarding: what the learner chose (goal, career
 * track, minutes a day, target day), shown as one line and edited in place.
 * Goal labels come from the onboarding option lists, the track's name from
 * the API. No React, no I/O.
 */
import {
  GOAL_OPTIONS,
  MINUTE_OPTIONS,
  type LearnerProfile,
  type LearningGoal,
  type LearningTrack,
} from "./onboarding.ts";

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

type GoalFields = Pick<LearnerProfile, "goal" | "track" | "trackName" | "minutesPerDay" | "targetDate">;

/** The form state: `targetDate` is a date input value ("2026-12-20") or "". */
export type GoalDraft = {
  goal: LearningGoal;
  track: LearningTrack;
  minutesPerDay: number;
  targetDate: string;
};

/** "2026-12-20": the Vietnam calendar day of an instant, or "" when there is none. */
export function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  return new Date(ms + VN_OFFSET_MS).toISOString().slice(0, 10);
}

/** "20/12/2026", or "" when there is no target day. */
export function formatGoalDate(iso: string | null): string {
  const day = toDateInput(iso);
  if (!day) return "";
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

export function goalDraft(profile: GoalFields): GoalDraft {
  return {
    goal: profile.goal,
    track: profile.track,
    minutesPerDay: profile.minutesPerDay,
    targetDate: toDateInput(profile.targetDate),
  };
}

const goalLabel = (goal: LearningGoal) => GOAL_OPTIONS.find((o) => o.value === goal)?.label ?? goal;
/**
 * The name admins gave the track, as the profile sends it. GENERAL is still
 * the default code; its name ("Chung") comes from the API like any other.
 * The code stands in only if a profile arrives without a name.
 */
const trackLabel = ({ track, trackName }: Pick<GoalFields, "track" | "trackName">) => trackName || track;

/** "Đạt điểm TOEIC · Công nghệ thông tin · 30 phút mỗi ngày · Ngày mục tiêu 20/12/2026" */
export function goalSummary(profile: GoalFields): string {
  const day = formatGoalDate(profile.targetDate);
  return [
    goalLabel(profile.goal),
    trackLabel(profile),
    `${profile.minutesPerDay} phút mỗi ngày`,
    day ? `Ngày mục tiêu ${day}` : "Chưa đặt ngày mục tiêu",
  ].join(" · ");
}

/** Only what changed, ready for PUT /learning-path/profile; an emptied day clears it. */
export function goalPatch(saved: GoalDraft, draft: GoalDraft): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (draft.goal !== saved.goal) patch.goal = draft.goal;
  if (draft.track !== saved.track) patch.track = draft.track;
  if (draft.minutesPerDay !== saved.minutesPerDay) patch.minutesPerDay = draft.minutesPerDay;
  if (draft.targetDate !== saved.targetDate) patch.targetDate = draft.targetDate || null;
  return patch;
}

/** A target day before today (Vietnam time). An empty day is not in the past. */
export function isPastDate(day: string, today: Date): boolean {
  return day !== "" && day < toDateInput(today.toISOString());
}

/** The usual minute choices, plus the learner's own value if it is not one of them. */
export function minuteChoices(current: number): number[] {
  const all: number[] = MINUTE_OPTIONS.includes(current) ? [...MINUTE_OPTIONS] : [...MINUTE_OPTIONS, current];
  return all.sort((a, b) => a - b);
}
