/**
 * The plans section of the landing (spec 6.4.4): what each plan name shows,
 * read from the public catalog (GET /plans/catalog) when it answers and from
 * FALLBACK_PLANS until then, or when it fails. Pure: no I/O, no React.
 */
import type {
  PublicPlanCatalogItem,
  PublicPlanCatalogResponse,
  PublicPlanVersionSummary,
} from "@/lib/api/services/plan.service";

export type PlanCode = "FREE" | "PLUS" | "PRO";

export type PlanView = {
  code: PlanCode;
  /** Free, Plus or Pro, the names in TERMS (src/lib/ui/terms.ts). */
  name: string;
  /** The price of the shortest term on sale; 0 for Free. */
  priceVnd: number;
  /** Length of that term in days; null for Free, which does not run out. */
  days: number | null;
  summary: string;
  /** Longer terms (90, 180 days) are on sale too: the stage links to /plans. */
  moreTerms: boolean;
};

const PLUS_TEXT =
  "Mở Nói, Viết Trung cấp và Nghe chép mọi mức; AI chấm 30 bài mỗi ngày, sửa và nộp lại bài viết 2 lần mỗi bài, tặng 1 khiên giữ chuỗi mỗi 30 ngày.";
const PRO_TEXT =
  "Mở Nói, Viết mọi mức và đề TOEIC Speaking & Writing, 4 kỹ năng; AI chấm 60 bài mỗi ngày, sửa và nộp lại bài viết 5 lần mỗi bài, tặng 3 khiên giữ chuỗi mỗi 30 ngày.";

/**
 * What GET /plans/catalog sold on 2026-11-22: the 30-day versions and their
 * PlanVersion descriptions, verbatim. Free has no PlanVersion; its summary is
 * the list the /plans page shows for it (PlanCard), which matches the backend
 * limits (plan-limits.ts: 10 AI gradings a day).
 */
export const FALLBACK_PLANS: PlanView[] = [
  {
    code: "FREE",
    name: "Free",
    priceVnd: 0,
    days: null,
    summary:
      "Nghe và Đọc ở mọi mức, trừ Nghe chép Trung cấp trở lên. Nói và Viết mức Cơ bản, AI chấm 10 bài mỗi ngày. Đề TOEIC Nghe & Đọc, Flashcard, từ vựng và ngữ pháp.",
    moreTerms: false,
  },
  {
    code: "PLUS",
    name: "Plus",
    priceVnd: 69000,
    days: 30,
    summary: `${PLUS_TEXT} Thời hạn 30 ngày.`,
    moreTerms: true,
  },
  {
    code: "PRO",
    name: "Pro",
    priceVnd: 149000,
    days: 30,
    summary: `${PRO_TEXT} Thời hạn 30 ngày.`,
    moreTerms: true,
  },
];

const usable = (v: PublicPlanVersionSummary | null | undefined): v is PublicPlanVersionSummary =>
  !!v && Number.isFinite(v.priceVnd) && v.priceVnd >= 0 && Number.isFinite(v.durationDays) && v.durationDays > 0;

/** Every term on sale, shortest first; `currentVersion` when the API sends no list. */
function termsOf(item: PublicPlanCatalogItem): PublicPlanVersionSummary[] {
  const listed = item.versions?.length ? item.versions : [item.currentVersion];
  return listed.filter(usable).sort((a, b) => a.durationDays - b.durationDays);
}

/**
 * Free, Plus, Pro in that order, always all three. A paid plan the catalog
 * lists with a term on sale shows its shortest term; anything missing or
 * unusable keeps its fallback, so the stage never waits for the API.
 */
export function planViews(catalog: PublicPlanCatalogResponse | null): PlanView[] {
  return FALLBACK_PLANS.map((fallback) => {
    // Free costs nothing and has no term: its catalog row adds nothing to show.
    if (fallback.code === "FREE") return fallback;
    const item = catalog?.plans?.find((plan) => String(plan.code).toUpperCase() === fallback.code);
    const terms = item ? termsOf(item) : [];
    if (!item || terms.length === 0) return fallback;
    const shortest = terms[0];
    return {
      ...fallback,
      priceVnd: shortest.priceVnd,
      days: shortest.durationDays,
      summary: shortest.description?.trim() || item.description?.trim() || fallback.summary,
      moreTerms: terms.length > 1,
    };
  });
}

/**
 * "69.000đ". Grouped by hand rather than with Intl, so the server and every
 * browser print the same string and hydration never differs.
 */
export function formatVnd(n: number): string {
  const amount = Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
  return `${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ`;
}
