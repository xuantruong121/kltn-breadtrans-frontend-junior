/**
 * Whether a `user:currency_updated` event shows a toast. Song Đấu Từ Vựng
 * shows its stake, payout and refund on its own screens (net, after the
 * stake), so its events (source "arena") only update the balance; a second
 * toast with the gross amount contradicted them. Shop orders and admin
 * grants still get one.
 */
export type CurrencyEvent = { amount?: number; source?: string };

export function currencyToastKind(event: CurrencyEvent): "gain" | "loss" | null {
  if (event.source === "arena") return null;
  const amount = Number(event.amount ?? 0);
  if (amount > 0) return "gain";
  if (amount < 0) return "loss";
  return null;
}
