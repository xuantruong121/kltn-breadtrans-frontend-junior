/**
 * Why a practice exercise could not be loaded. Pure: no React, no API.
 *
 * Only a missing exercise is "not found". A plan lock, a level lock, an expired
 * session and a server or network failure each get their own message, so a
 * learner is never told that existing content does not exist.
 */
import type { LevelLock } from "../learning-path/levelLock.ts";

export type PracticeLoadError =
  | { kind: "LOCKED"; requiredPlan: "PLUS" | "PRO" }
  | ({ kind: "LEVEL_LOCKED" } & LevelLock)
  | { kind: "AUTH" }
  | { kind: "NOT_FOUND" }
  | { kind: "FAILED" };

export function classifyPracticeLoadError(err: any): PracticeLoadError | null {
  if (!err) return null;
  const status = err.response?.status ?? err.status;
  const data = err.response?.data ?? err.data ?? {};
  const detail = typeof data?.error === "object" && data.error !== null ? data.error : data;
  if (status === 403 && detail?.code === "FEATURE_NOT_INCLUDED")
    return { kind: "LOCKED", requiredPlan: detail?.requiredPlan === "PLUS" ? "PLUS" : "PRO" };
  if (status === 403 && detail?.code === "LEVEL_LOCKED")
    return {
      kind: "LEVEL_LOCKED",
      skill: detail.skill,
      level: detail.level ?? null,
      requiredPlan: detail.requiredPlan === "PLUS" || detail.requiredPlan === "PRO" ? detail.requiredPlan : null,
    };
  if (status === 401) return { kind: "AUTH" };
  if (status === 404) return { kind: "NOT_FOUND" };
  return { kind: "FAILED" };
}
