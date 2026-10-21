import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatMessageTimestamp,
  formatMessageFullTooltip,
  isSameCalendarDay,
  formatDateDivider,
  formatListPreviewTime,
} from "./chatDateUtils.ts";

describe("Chat Formatting and History Invariants", () => {
  describe("1. Message Timestamp with Full Date, Month, Year", () => {
    it("formats message timestamp with both HH:mm and DD/MM/YYYY", () => {
      // 2026-10-20T14:32:00
      const date = new Date(2026, 9, 20, 14, 32);
      const formatted = formatMessageTimestamp(date);

      assert.match(formatted, /^14:32\s+·\s+20\/10\/2026$/);
    });

    it("handles ISO strings, timestamps, and invalid dates gracefully", () => {
      const isoStr = "2026-05-15T09:05:00.000Z";
      const formatted = formatMessageTimestamp(isoStr);
      assert.ok(formatted.includes("15/05/2026"));

      assert.equal(formatMessageTimestamp(null), "");
      assert.equal(formatMessageTimestamp("invalid-date"), "");
    });

    it("provides full localized tooltip string with weekday and year", () => {
      const date = new Date(2026, 9, 20, 14, 32, 5);
      const tooltip = formatMessageFullTooltip(date);
      assert.ok(tooltip.includes("2026"));
      assert.ok(tooltip.includes("14:32"));
    });
  });

  describe("2. Inter-day Date Dividers & Same Day Comparison", () => {
    it("identifies same calendar day vs different calendar days", () => {
      const morning = new Date(2026, 9, 20, 8, 30);
      const evening = new Date(2026, 9, 20, 21, 45);
      const nextDay = new Date(2026, 9, 21, 8, 30);

      assert.equal(isSameCalendarDay(morning, evening), true);
      assert.equal(isSameCalendarDay(morning, nextDay), false);
      assert.equal(isSameCalendarDay(null, evening), false);
    });

    it("formats date dividers for today, yesterday, and specific past dates", () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0);
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const pastDate = new Date(2025, 0, 15, 12, 0);

      const todayDivider = formatDateDivider(today);
      assert.ok(todayDivider.startsWith("Hôm nay,"));

      const yesterdayDivider = formatDateDivider(yesterday);
      assert.ok(yesterdayDivider.startsWith("Hôm qua,"));

      const pastDivider = formatDateDivider(pastDate);
      assert.ok(pastDivider.includes("2025"));
      assert.ok(pastDivider.includes("15"));
    });
  });

  describe("3. Sidebar Conversation List Preview Time", () => {
    it("formats today as HH:mm and older dates with DD/MM or DD/MM/YYYY", () => {
      const now = new Date();
      const todayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 45);
      assert.match(formatListPreviewTime(todayTime), /^15:45$/);

      const pastYear = new Date(2024, 5, 12, 10, 0);
      assert.ok(formatListPreviewTime(pastYear).includes("2024"));
    });
  });

  describe("4. Chat Markdown Parsing Structure Invariants", () => {
    it("extracts bold tokens wrapped in double asterisks", () => {
      const sample = "1. **Học qua hình ảnh:** 🎨 Hãy vẽ quả táo!";
      const boldMatch = sample.match(/\*\*([^*]+)\*\*/);
      assert.ok(boldMatch);
      assert.equal(boldMatch[1], "Học qua hình ảnh:");
    });

    it("extracts italic tokens wrapped in single asterisks", () => {
      const sample = "- *Ví dụ:* Hãy đặt câu thật vui.";
      const italicMatch = sample.match(/\*([^*]+)\*/);
      assert.ok(italicMatch);
      assert.equal(italicMatch[1], "Ví dụ:");
    });

    it("detects numbered list prefixes e.g. '1. ', '2. '", () => {
      const line1 = "1. **Học qua hình ảnh:** 🎨";
      const line2 = "2. **Gắn từ vào câu chuyện nhỏ:** 📖";
      const numberedRegex = /^(\d+)\.\s+(.+)$/;

      const match1 = line1.match(numberedRegex);
      assert.ok(match1);
      assert.equal(match1[1], "1");
      assert.equal(match1[2], "**Học qua hình ảnh:** 🎨");

      const match2 = line2.match(numberedRegex);
      assert.ok(match2);
      assert.equal(match2[1], "2");
    });

    it("detects bullet list prefixes e.g. '- ', '* ', '• '", () => {
      const bullet1 = "- Thay vì học từ đơn lẻ, hãy đặt một câu thật vui.";
      const bullet2 = "* Dán ghi chú quanh phòng";
      const bulletRegex = /^([-*•])\s+(.+)$/;

      assert.ok(bullet1.match(bulletRegex));
      assert.ok(bullet2.match(bulletRegex));
    });
  });
});
