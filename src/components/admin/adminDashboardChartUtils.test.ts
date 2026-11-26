import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getBarHeightPercent, getRangeLabel } from "./adminDashboardChartUtils.ts";

describe("admin dashboard chart utilities", () => {
  it("renders a zero activity value as a true zero-height bar", () => {
    assert.equal(getBarHeightPercent(0, 12), 0);
  });

  it("keeps a visible but proportional bar for non-zero activity", () => {
    assert.equal(getBarHeightPercent(1, 100), 4);
    assert.equal(getBarHeightPercent(50, 100), 50);
  });

  it("describes the controlled dashboard periods", () => {
    assert.equal(getRangeLabel("30d"), "30 ngày gần nhất");
    assert.equal(getRangeLabel("6m"), "6 tháng gần nhất");
    assert.equal(getRangeLabel("12m"), "12 tháng gần nhất");
  });
});

it("contentBreakdownRows: one row per area in its own unit, missing counts as 0", async () => {
  const { contentBreakdownRows } = await import("./adminDashboardChartUtils.ts");
  const rows = contentBreakdownRows({ vocabDecks: 30, speakingSets: 21, exams: 3 });
  assert.deepEqual(rows.map((row) => row.label), [
    "Từ vựng",
    "Ngữ pháp",
    "Nghe",
    "Đọc",
    "Viết",
    "Nói",
    "Luyện đề",
    "Phim, nhạc",
  ]);
  assert.deepEqual(rows[0], { label: "Từ vựng", count: 30, unit: "bộ từ" });
  assert.deepEqual(rows[5], { label: "Nói", count: 21, unit: "bộ luyện" });
  assert.equal(rows[2].count, 0);
  assert.equal(contentBreakdownRows(undefined).every((row) => row.count === 0), true);
});

it("trendSummary: no best period when every period is 0, and counts the periods with anything", async () => {
  const { trendSummary } = await import("./adminDashboardChartUtils.ts");
  const empty = trendSummary([
    { label: "1/11", value: 0 },
    { label: "2/11", value: 0 },
  ]);
  assert.equal(empty.peak, null);
  assert.equal(empty.total, 0);
  assert.equal(empty.activePeriods, 0);
  assert.equal(empty.periodCount, 2);

  const some = trendSummary([
    { label: "T9", value: 1 },
    { label: "T10", value: 9 },
    { label: "T11", value: 0 },
    { label: "T12", value: 9 },
  ]);
  // The first of two equal best periods.
  assert.deepEqual(some.peak, { label: "T10", value: 9 });
  assert.equal(some.total, 19);
  assert.equal(some.activePeriods, 3);
  assert.equal(some.periodCount, 4);
});

it("waitedFor: hours under a day, days after, nothing when nothing waits", async () => {
  const { waitedFor } = await import("./adminDashboardChartUtils.ts");
  const now = new Date("2026-11-26T12:00:00Z");
  assert.equal(waitedFor(null, now), null);
  assert.equal(waitedFor("not a date", now), null);
  assert.equal(waitedFor("2026-11-26T11:30:00Z", now), "dưới 1 giờ");
  assert.equal(waitedFor("2026-11-26T07:00:00Z", now), "5 giờ");
  assert.equal(waitedFor("2026-11-23T11:00:00Z", now), "3 ngày");
});

it("signedCount: a plus on additions, the minus kept, plain zero", async () => {
  const { signedCount } = await import("./adminDashboardChartUtils.ts");
  assert.equal(signedCount(1360), "+1.360");
  assert.equal(signedCount(-50), "-50");
  assert.equal(signedCount(0), "0");
  assert.equal(signedCount(undefined), "0");
});

it("getPreviousRangeLabel: the same length just before the chosen range", async () => {
  const { getPreviousRangeLabel } = await import("./adminDashboardChartUtils.ts");
  assert.equal(getPreviousRangeLabel("30d"), "30 ngày trước đó");
  assert.equal(getPreviousRangeLabel("6m"), "6 tháng trước đó");
  assert.equal(getPreviousRangeLabel("12m"), "12 tháng trước đó");
});
