/**
 * Consent and account deletion on the client (owner 2026-11-16). Pure: no
 * React, no network, so the rules can be tested with the Node test runner.
 */

/** The terms and privacy policy version the backend asks consent for. */
export const LEGAL_VERSION = "2026-11-16";
/** As printed on /terms and /privacy. */
export const LEGAL_UPDATED_LABEL = "16/11/2026";
export const DELETION_GRACE_DAYS = 7;

export const CONSENT_REQUIRED = "CONSENT_REQUIRED";
export const ACCOUNT_PENDING_DELETION = "ACCOUNT_PENDING_DELETION";

type ErrorBody = {
  code?: unknown;
  message?: unknown;
  scheduledAt?: unknown;
  cancelToken?: unknown;
};

function bodyOf(err: unknown): ErrorBody | null {
  const data = (err as { response?: { data?: unknown } } | null)?.response
    ?.data;
  return data && typeof data === "object" ? (data as ErrorBody) : null;
}

/** The machine-readable code of an API error, at the top or inside `message`. */
export function apiErrorCode(err: unknown): string | null {
  const body = bodyOf(err);
  if (!body) return null;
  if (typeof body.code === "string") return body.code;
  const inner = body.message as ErrorBody | null | undefined;
  if (inner && typeof inner === "object" && typeof inner.code === "string")
    return inner.code;
  return null;
}

export type PendingDeletion = { scheduledAt: string | null; cancelToken: string };

/** The cancel offer of a sign-in refused because the account waits for deletion. */
export function pendingDeletionOf(err: unknown): PendingDeletion | null {
  if (apiErrorCode(err) !== ACCOUNT_PENDING_DELETION) return null;
  const body = bodyOf(err) as ErrorBody;
  if (typeof body.cancelToken !== "string" || !body.cancelToken) return null;
  return {
    scheduledAt: typeof body.scheduledAt === "string" ? body.scheduledAt : null,
    cancelToken: body.cancelToken,
  };
}

/** A date as Vietnamese learners read it: 23/11/2026, in Vietnam time. */
export function formatVnDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")}`;
}

/** Whether the signed-in user still has to accept the current terms. */
export function needsConsent(user: { consentRequired?: unknown } | null | undefined) {
  return user?.consentRequired === true;
}

export type DeletionConfirm = {
  hasPassword: boolean;
  password: string;
  confirmEmail: string;
  accountEmail: string;
  understood: boolean;
};

/** The delete button stays off until the learner has confirmed everything. */
export function canRequestDeletion(input: DeletionConfirm): boolean {
  if (!input.understood) return false;
  if (input.hasPassword) return input.password.length > 0;
  return (
    input.confirmEmail.trim().toLowerCase() ===
    input.accountEmail.trim().toLowerCase()
  );
}

/** The body POST /account/deletion expects. */
export function deletionRequestBody(input: DeletionConfirm) {
  return input.hasPassword
    ? { password: input.password }
    : { confirmEmail: input.confirmEmail.trim() };
}

/** What GET /subscriptions/me/expiry-summary says about the plan, as far as deletion cares. */
export type DeletionPlanState = {
  isPaid: boolean;
  planCode: string;
  endsAt: string | null;
  queuedRenewal: { planCode: string; startsAt: string } | null;
  trial?: unknown;
} | null;

/**
 * What the learner loses with the account, only what applies (owner
 * 2026-11-21): a paid plan still running, a renewal already bought, and the
 * Bánh Mì balance. Facts only: the terms promise no refund, so neither does
 * this. `planName` turns a plan code into "Plus" / "Pro".
 */
export function deletionLosses(
  plan: DeletionPlanState,
  breads: number,
  planName: (code: string) => string,
): string[] {
  const lines: string[] = [];
  if (plan?.isPaid && !plan.trial && plan.endsAt) {
    lines.push(
      `Gói ${planName(plan.planCode)} đang dùng (còn hạn đến ${formatVnDate(plan.endsAt)}) sẽ mất cùng tài khoản.`,
    );
  }
  if (plan?.queuedRenewal) {
    lines.push(
      `Gói ${planName(plan.queuedRenewal.planCode)} đã gia hạn trước (bắt đầu từ ${formatVnDate(plan.queuedRenewal.startsAt)}) cũng sẽ mất.`,
    );
  }
  if (breads > 0) lines.push(`${breads} Bánh Mì hiện có sẽ mất cùng tài khoản.`);
  return lines;
}

const METHOD_LABELS: Record<string, string> = {
  EMAIL_SIGNUP: "Khi đăng ký bằng email",
  GOOGLE_SIGNUP: "Khi đăng ký bằng Google",
  PROMPT: "Khi được hỏi lại trong ứng dụng",
};
const DOCUMENT_LABELS: Record<string, string> = {
  TERMS: "Điều khoản sử dụng",
  PRIVACY: "Chính sách bảo mật",
};

export const consentMethodLabel = (method: string) =>
  METHOD_LABELS[method] ?? method;
export const consentDocumentLabel = (document: string) =>
  DOCUMENT_LABELS[document] ?? document;
