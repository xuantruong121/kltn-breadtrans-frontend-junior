import { classifyPracticeRoute } from "./focusMode.ts";

/**
 * Study time in the practice rooms (owner 2026-11-26: the dashboard's "Thời
 * gian học" had no data behind it). The browser counts the seconds a room is
 * open, in view and in use, and sends them to POST /users/me/study-time.
 */
export type StudySkill =
  | "LISTENING"
  | "READING"
  | "WRITING"
  | "SPEAKING"
  | "VOCAB"
  | "GRAMMAR"
  | "EXAM"
  | "DIAGNOSTIC";

/** Seconds between two checks of "is the learner studying". */
export const TICK_SEC = 15;
/** Counted seconds are sent once they reach a minute (and when the room closes). */
export const FLUSH_SEC = 60;
/** The server takes at most two minutes per report. */
export const MAX_REPORT_SEC = 120;
/** No input for this long and nothing playing: the learner has stepped away. */
export const IDLE_LIMIT_MS = 2 * 60_000;

const GATE_SKILLS: Record<string, StudySkill> = {
  listening: "LISTENING",
  reading: "READING",
  writing: "WRITING",
  speaking: "SPEAKING",
};

/**
 * The skill a page trains, or null when it is not a practice room: the rooms
 * classifyPracticeRoute knows, the level gate by its skill, and the two that
 * only turn on focus mode while answering (the entry assessment, grammar).
 */
export function studySkillFor(pathname: string, isFocusMode: boolean): StudySkill | null {
  switch (classifyPracticeRoute(pathname)) {
    case "LISTENING_ROOM":
      return "LISTENING";
    case "READING_ROOM":
      return "READING";
    case "WRITING_ROOM":
      return "WRITING";
    case "SPEAKING_ROOM":
      return "SPEAKING";
    case "VOCAB_ROOM":
      return "VOCAB";
    case "TOEIC_ATTEMPT_ROOM":
      return "EXAM";
    case "GATE_ROOM":
      return GATE_SKILLS[pathname.split("/")[2]?.toLowerCase() ?? ""] ?? null;
    default:
      break;
  }
  if (!isFocusMode) return null;
  if (pathname === "/diagnostic" || pathname.startsWith("/diagnostic/")) return "DIAGNOSTIC";
  if (pathname === "/reading") return "GRAMMAR";
  return null;
}

/** Seconds one check adds: the page is in view, and the learner acted lately or something plays. */
export function tickCredit(input: { visible: boolean; idleMs: number; mediaPlaying: boolean }): number {
  return input.visible && (input.idleMs < IDLE_LIMIT_MS || input.mediaPlaying) ? TICK_SEC : 0;
}

/** Pending seconds as reports the server accepts (two minutes each at most). */
export function reportChunks(pending: number): number[] {
  const out: number[] = [];
  let left = Math.max(0, Math.floor(pending));
  while (left > 0) {
    const s = Math.min(MAX_REPORT_SEC, left);
    out.push(s);
    left -= s;
  }
  return out;
}

/** "0 phút", "dưới 1 phút", "25 phút", "1 giờ", "2 giờ 5 phút". */
export function formatStudyTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  if (s === 0) return "0 phút";
  if (s < 60) return "dưới 1 phút";
  const minutes = Math.floor(s / 60);
  if (minutes < 60) return `${minutes} phút`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} giờ ${m} phút` : `${h} giờ`;
}
