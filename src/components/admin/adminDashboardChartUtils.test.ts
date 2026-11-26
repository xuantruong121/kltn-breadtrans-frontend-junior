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
