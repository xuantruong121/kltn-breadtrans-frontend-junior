/**
 * Which admin actions a plan purchase allows, mirroring the backend rules.
 *
 * A payment PayOS received after its purchase expired comes back as an
 * EXPIRED purchase with a REVIEW_REQUIRED payment: the admin either confirms
 * it (the learner gets the plan) or rejects it after refunding the money.
 */
export type PurchaseActionInput = {
  status: string;
  payment: { status: string };
};

const lateReview = (item: PurchaseActionInput) =>
  item.status === "EXPIRED" && item.payment.status === "REVIEW_REQUIRED";

export const canConfirmPurchase = (item: PurchaseActionInput) =>
  (["REPORTED", "REVIEW_REQUIRED"].includes(item.payment.status) &&
    item.status === "PENDING_PAYMENT") ||
  lateReview(item);

export const canRejectPurchase = (item: PurchaseActionInput) =>
  (["REPORTED", "REVIEW_REQUIRED"].includes(item.payment.status) &&
    item.status === "PENDING_PAYMENT") ||
  lateReview(item);
