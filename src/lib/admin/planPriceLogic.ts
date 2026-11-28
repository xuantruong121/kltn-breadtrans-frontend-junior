/**
 * The price table of Plus and Pro (owner 2026-11-28): one row per term (30, 90,
 * 180 days), each with the price now on sale. Underneath, a price is a plan
 * version, because a purchase points at the version it bought; the admin only
 * sees prices. Pure, for the Node test runner.
 */
export type PriceVersion = {
  id: number;
  version: number;
  durationDays: number | null;
  priceVnd: number | null;
  status: "DRAFT" | "PUBLISHED" | "RETIRED";
  isCurrent: boolean;
  publishedAt: string | null;
  entitlements: Array<{ featureKey: string; enabled: boolean }>;
};

export type PriceHistoryEntry = {
  versionId: number;
  priceVnd: number;
  since: string;
  isCurrent: boolean;
};

export type TermRow = {
  days: number;
  /** The version on sale for this term; null when the term is not on sale. */
  current: PriceVersion | null;
  /** Prices this term has had, newest first, the one on sale included. */
  history: PriceHistoryEntry[];
};

export const PRICE_MAX_VND = 100_000_000;

const onSale = (version: PriceVersion) => version.isCurrent && version.status === "PUBLISHED";

/** One row per term that is on sale, shortest first. */
export function termRows(versions: PriceVersion[]): TermRow[] {
  const terms = new Set<number>();
  for (const version of versions) {
    if (onSale(version) && version.durationDays && version.durationDays > 0) terms.add(version.durationDays);
  }
  return [...terms]
    .sort((a, b) => a - b)
    .map((days) => {
      const ofTerm = versions.filter((version) => version.durationDays === days);
      const current = ofTerm.filter(onSale).sort((a, b) => b.version - a.version)[0] ?? null;
      const published = ofTerm
        .filter((version) => version.status !== "DRAFT" && version.publishedAt && typeof version.priceVnd === "number")
        .sort((a, b) => new Date(b.publishedAt as string).getTime() - new Date(a.publishedAt as string).getTime())
        .map((version) => ({
          versionId: version.id,
          priceVnd: version.priceVnd as number,
          since: version.publishedAt as string,
          isCurrent: current?.id === version.id,
        }));
      // A version made again at the same price (a re-seed, a grant change) is not a
      // price change: consecutive equal prices are one line, from the earliest date.
      const history: PriceHistoryEntry[] = [];
      for (const entry of published) {
        const last = history[history.length - 1];
        if (last && last.priceVnd === entry.priceVnd) last.since = entry.since;
        else history.push({ ...entry });
      }
      return { days, current, history };
    });
}

/** What a longer term comes to per 30 days, rounded to the thousand like the learner's price page. */
export function pricePer30Days(priceVnd: number, days: number): number {
  return Math.round((priceVnd * 30) / days / 1000) * 1000;
}

/**
 * How much cheaper a term is than buying the 30-day term again and again, in
 * whole percent; null for the 30-day term itself, when there is no 30-day
 * price to compare with, or when the term is not cheaper.
 */
export function savingPercent(priceVnd: number, days: number, priceOf30Days: number | null): number | null {
  if (days <= 30 || !priceOf30Days || priceOf30Days <= 0) return null;
  const percent = Math.round((1 - priceVnd / ((priceOf30Days * days) / 30)) * 100);
  return percent > 0 ? percent : null;
}

/** The price of each term as it would be with `days` set to `priceVnd`. */
function pricesWith(rows: TermRow[], days: number, priceVnd: number): Array<{ days: number; priceVnd: number }> {
  return rows
    .map((row) => ({ days: row.days, priceVnd: row.days === days ? priceVnd : (row.current?.priceVnd ?? 0) }))
    .filter((row) => row.priceVnd > 0);
}

/**
 * A soft warning (it never blocks) when a longer term would cost more per day
 * than a shorter one, against the rule that longer terms are cheaper (owner
 * 2026-11-04). Looks at the term being changed against every other term.
 */
export function priceWarning(rows: TermRow[], days: number, priceVnd: number): string | null {
  const prices = pricesWith(rows, days, priceVnd);
  const changed = prices.find((row) => row.days === days);
  if (!changed) return null;
  for (const other of prices) {
    if (other.days === days) continue;
    const [shorter, longer] = other.days < days ? [other, changed] : [changed, other];
    if (longer.priceVnd / longer.days >= shorter.priceVnd / shorter.days) {
      return `Với giá này, mức ${longer.days} ngày không rẻ hơn mức ${shorter.days} ngày tính theo ngày. Học viên sẽ thấy mua mức dài không có lợi.`;
    }
  }
  return null;
}

export type PriceInput = { value: number | null; problem: string | null };

/** Reads what the admin typed ("350000" or "350.000"); the problem is worded for the admin. */
export function readPriceInput(raw: string, currentPrice: number | null): PriceInput {
  const digits = raw.replace(/[\s.,]/g, "");
  if (!digits) return { value: null, problem: "Nhập giá mới." };
  if (!/^\d+$/.test(digits)) return { value: null, problem: "Giá chỉ gồm chữ số, ví dụ 350000." };
  const value = Number(digits);
  if (value < 1) return { value: null, problem: "Giá phải lớn hơn 0." };
  if (value > PRICE_MAX_VND) return { value: null, problem: "Giá tối đa 100.000.000 ₫." };
  if (value === currentPrice) return { value: null, problem: "Giá mới đang trùng giá đang bán." };
  return { value, problem: null };
}

/** The features a plan grants, from its on-sale versions (every term grants the same). */
export function grantedFeatureKeys(versions: PriceVersion[]): string[] {
  const current = versions.filter(onSale).sort((a, b) => b.version - a.version)[0];
  return (current?.entitlements ?? []).filter((entitlement) => entitlement.enabled).map((entitlement) => entitlement.featureKey);
}
