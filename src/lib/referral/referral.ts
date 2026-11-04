/** Referral helpers (backend referral.logic.ts and /referrals). */
export type ReferralSummary = {
  code: string;
  invited: number;
  rewarded: number;
  rewardDays: number;
  invitedBy: { status: "PENDING" | "REWARDED" } | null;
  canClaim: boolean;
};

/** localStorage key holding a code from an invite link until it is claimed. */
export const REFERRAL_STORAGE_KEY = "bt_referral_code";

export function normalizeReferralCode(code: string): string {
  return code.trim().replace(/\s+/g, "").toUpperCase();
}

/** The `ref` code of an invite link (`?ref=BT-7KQ4M2`), or null. */
export function referralCodeFromSearch(search: string): string | null {
  const raw = new URLSearchParams(search).get("ref");
  const code = raw ? normalizeReferralCode(raw) : "";
  return /^BT-[A-Z0-9]{6}$/.test(code) ? code : null;
}

/** The link a learner shares: the sign-up page with their code. */
export function referralLink(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, "")}/register?ref=${encodeURIComponent(code)}`;
}
