import test from "node:test";
import assert from "node:assert/strict";
import type { PublicPlanCatalogResponse, PublicPlanVersionSummary } from "../api/services/plan.service.ts";
import { FALLBACK_PLANS, formatVnd, planViews } from "./plans.ts";

const PLUS_TEXT =
  "Mở Nói, Viết Trung cấp và Nghe chép mọi mức; AI chấm 30 bài mỗi ngày, sửa và nộp lại bài viết 2 lần mỗi bài, tặng 1 khiên giữ chuỗi mỗi 30 ngày.";

const version = (id: number, priceVnd: number, durationDays: number, description: string): PublicPlanVersionSummary => ({
  id,
  version: id,
  displayName: null,
  description,
  priceVnd,
  currency: "VND",
  durationDays,
});

// The shape GET /plans/catalog returned on 2026-11-22, PRO left out on purpose.
const CATALOG_WITHOUT_PRO: PublicPlanCatalogResponse = {
  plans: [
    {
      code: "FREE",
      displayName: "BreadTrans Free",
      description: "Gói nền tảng miễn phí để bắt đầu tự học tiếng Anh.",
      purchasable: false,
      currentVersion: null,
      versions: [],
    },
    {
      code: "PLUS",
      displayName: "BreadTrans Plus",
      description: `${PLUS_TEXT} Thời hạn 30 ngày.`,
      purchasable: true,
      currentVersion: version(100, 69000, 30, `${PLUS_TEXT} Thời hạn 30 ngày.`),
      // Longest first here, so the test proves the shortest term is picked, not the first.
      versions: [
        version(103, 331000, 180, `${PLUS_TEXT} Thời hạn 180 ngày.`),
        version(102, 186000, 90, `${PLUS_TEXT} Thời hạn 90 ngày.`),
        version(100, 69000, 30, `${PLUS_TEXT} Thời hạn 30 ngày.`),
      ],
    },
  ],
};

test("without a catalog the fallback plans show, in the order Free, Plus, Pro", () => {
  const views = planViews(null);
  assert.deepEqual(views, FALLBACK_PLANS);
  assert.deepEqual(
    views.map((plan) => plan.code),
    ["FREE", "PLUS", "PRO"],
  );
});

test("the fallback carries the prices on sale on 2026-11-22", () => {
  const byCode = Object.fromEntries(FALLBACK_PLANS.map((plan) => [plan.code, plan]));
  assert.equal(byCode.FREE.priceVnd, 0);
  assert.equal(byCode.FREE.days, null);
  assert.equal(byCode.PLUS.priceVnd, 69000);
  assert.equal(byCode.PLUS.days, 30);
  assert.equal(byCode.PRO.priceVnd, 149000);
  assert.equal(byCode.PRO.days, 30);
  assert.deepEqual(
    FALLBACK_PLANS.map((plan) => plan.name),
    ["Free", "Plus", "Pro"],
  );
  for (const plan of FALLBACK_PLANS) assert.ok(plan.summary.length > 0, `${plan.code} has a summary`);
});

test("a paid plan shows its shortest term and says longer terms exist", () => {
  const plus = planViews(CATALOG_WITHOUT_PRO).find((plan) => plan.code === "PLUS");
  assert.ok(plus);
  assert.equal(plus.priceVnd, 69000);
  assert.equal(plus.days, 30);
  assert.equal(plus.moreTerms, true);
  assert.equal(plus.summary, `${PLUS_TEXT} Thời hạn 30 ngày.`);
  assert.equal(plus.name, "Plus");
});

test("Free has no term", () => {
  const free = planViews(CATALOG_WITHOUT_PRO).find((plan) => plan.code === "FREE");
  assert.ok(free);
  assert.equal(free.days, null);
  assert.equal(free.priceVnd, 0);
  assert.equal(free.moreTerms, false);
});

test("a plan missing from the catalog comes from the fallback", () => {
  const views = planViews(CATALOG_WITHOUT_PRO);
  assert.deepEqual(
    views.map((plan) => plan.code),
    ["FREE", "PLUS", "PRO"],
  );
  assert.deepEqual(
    views.find((plan) => plan.code === "PRO"),
    FALLBACK_PLANS.find((plan) => plan.code === "PRO"),
  );
});

test("a paid plan with one term on sale does not offer longer ones", () => {
  const catalog: PublicPlanCatalogResponse = {
    plans: [
      {
        code: "PRO",
        displayName: "BreadTrans Pro",
        description: null,
        purchasable: true,
        currentVersion: version(101, 149000, 30, "Mô tả Pro."),
      },
    ],
  };
  const pro = planViews(catalog).find((plan) => plan.code === "PRO");
  assert.ok(pro);
  assert.equal(pro.priceVnd, 149000);
  assert.equal(pro.days, 30);
  assert.equal(pro.moreTerms, false);
  assert.equal(pro.summary, "Mô tả Pro.");
});

test("prices read the Vietnamese way", () => {
  assert.equal(formatVnd(69000), "69.000đ");
  assert.equal(formatVnd(0), "0đ");
  assert.equal(formatVnd(149000), "149.000đ");
  assert.equal(formatVnd(1250000), "1.250.000đ");
});
