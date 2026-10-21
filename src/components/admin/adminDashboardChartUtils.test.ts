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
