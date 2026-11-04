/** Mirrors /admin/promo-codes (backend promo-code-admin.dto.ts). */
export type AdminPromoCode = {
  id: number;
  code: string;
  percentOff: number;
  validFrom: string | null;
  validTo: string | null;
  planCodes: string[];
  maxRedemptions: number | null;
  perUserOnce: boolean;
  source: "ADMIN" | "WINBACK";
  ownerEmail: string | null;
  active: boolean;
  note: string | null;
  redemptions: number;
  discountGivenVnd: number;
  createdAt: string;
};

export type PromoCodeDraft = {
  code: string;
  percentOff: string;
  validTo: string;
  plan: "ALL" | "PLUS" | "PRO";
  maxRedemptions: string;
  note: string;
};

export const EMPTY_PROMO_DRAFT: PromoCodeDraft = {
  code: "",
  percentOff: "20",
  validTo: "",
  plan: "ALL",
  maxRedemptions: "",
  note: "",
};

/** Form → request body, or the first problem in Vietnamese. */
export function promoDraftToBody(
  draft: PromoCodeDraft,
):
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; error: string } {
  const code = draft.code.trim().replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z0-9-]{3,30}$/.test(code)) {
    return { ok: false, error: "Mã gồm 3–30 chữ, số hoặc dấu gạch ngang." };
  }
  const percent = Number(draft.percentOff);
  if (!Number.isInteger(percent) || percent < 1 || percent > 90) {
    return { ok: false, error: "Mức giảm là số nguyên từ 1 đến 90%." };
  }
  const max = draft.maxRedemptions.trim() ? Number(draft.maxRedemptions) : null;
  if (max !== null && (!Number.isInteger(max) || max < 1)) {
    return { ok: false, error: "Số lượt tối đa là số nguyên dương, hoặc để trống." };
  }
  let validTo: string | undefined;
  if (draft.validTo) {
    // A date picker gives yyyy-mm-dd: the code works until the end of that
    // day in Vietnam time.
    const end = new Date(`${draft.validTo}T23:59:59+07:00`);
    if (Number.isNaN(end.getTime())) return { ok: false, error: "Ngày hết hạn không hợp lệ." };
    validTo = end.toISOString();
  }
  return {
    ok: true,
    body: {
      code,
      percentOff: percent,
      ...(validTo ? { validTo } : {}),
      ...(draft.plan === "ALL" ? {} : { planCodes: [draft.plan] }),
      ...(max !== null ? { maxRedemptions: max } : {}),
      ...(draft.note.trim() ? { note: draft.note.trim() } : {}),
    },
  };
}

/** "Còn hiệu lực", "Hết hạn", "Đã tắt" or "Hết lượt". */
export function promoStatus(promo: AdminPromoCode, now = new Date()): string {
  if (!promo.active) return "Đã tắt";
  if (promo.validTo && new Date(promo.validTo) <= now) return "Hết hạn";
  if (promo.maxRedemptions !== null && promo.redemptions >= promo.maxRedemptions) return "Hết lượt";
  return "Còn hiệu lực";
}
