/**
 * The day's AI gradings (Speaking and Writing) and tutor questions (owner
 * 2026-11-13: running out showed only a red error; "Gói của tôi" shows what is
 * left). Pure: no React, no I/O.
 */

export type QuotaPlanCode = "FREE" | "PLUS" | "PRO";

export type DailyAllowance = { limit: number; used: number; remaining: number };

/** GET /subscriptions/me/usage */
export type DailyUsage = {
  planCode: QuotaPlanCode;
  resetsAt: string;
  aiGrading: DailyAllowance;
  tutor: DailyAllowance;
};

export type AiQuotaExhausted = {
  message: string;
  planCode: QuotaPlanCode | null;
  limit: number | null;
};

const FALLBACK = "Bạn đã dùng hết lượt AI chấm của hôm nay. Lượt chấm được làm mới vào ngày mai.";

/**
 * The out-of-gradings refusal (429 with error AI_QUOTA_EXHAUSTED), or null for
 * any other error, including other 429s ("thao tác quá nhanh").
 */
export function aiQuotaExhausted(error: unknown): AiQuotaExhausted | null {
  const response = (error as { response?: { status?: number; data?: Record<string, unknown> } } | null)
    ?.response;
  if (response?.status !== 429 || response.data?.error !== "AI_QUOTA_EXHAUSTED") return null;
  const quota = response.data.quota as { limit?: unknown; planCode?: unknown } | undefined;
  const planCode = quota?.planCode;
  return {
    message: typeof response.data.message === "string" && response.data.message ? response.data.message : FALLBACK,
    planCode: planCode === "FREE" || planCode === "PLUS" || planCode === "PRO" ? planCode : null,
    limit: typeof quota?.limit === "number" ? quota.limit : null,
  };
}

/** Whether to offer a bigger plan: not to a Pro learner. */
export function offersUpgrade(planCode: QuotaPlanCode | null): boolean {
  return planCode !== "PRO";
}

/** "còn 7/10 lượt" */
export function remainingText(allowance: DailyAllowance): string {
  return `còn ${allowance.remaining}/${allowance.limit} lượt`;
}

/** Share used, 0-100, for the thin bar. */
export function usedPercent(allowance: DailyAllowance): number {
  if (allowance.limit <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((allowance.used / allowance.limit) * 100)));
}
