import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const header = readFileSync(
  new URL("../navigation/AppHeader.tsx", import.meta.url),
  "utf8",
);
const navUtils = readFileSync(
  new URL("../navigation/navUtils.ts", import.meta.url),
  "utf8",
);
const helpPage = readFileSync(
  new URL("../../app/(public)/help/page.tsx", import.meta.url),
  "utf8",
);

test("More contains leaderboard and FAQ, but not account support actions", () => {
  assert.match(navUtils, /\{ label: "Bảng xếp hạng", href: "\/arena" \}/);
  assert.match(navUtils, /\{ label: "FAQ", href: "\/help" \}/);
  assert.doesNotMatch(navUtils, /Liên hệ/);
  assert.doesNotMatch(navUtils, /Đề xuất/);
  assert.doesNotMatch(header, /href:\s*["']\/help#feedback["']/);
});

test("user dropdown owns Contact and Suggestion actions", () => {
  assert.match(header, /https:\/\/www\.facebook\.com\/truongngynz\.121/);
  assert.match(header, /target="_blank"/);
  assert.match(header, /rel="noopener noreferrer"/);
  assert.match(header, /Đề xuất &amp; Góp ý/);
  assert.match(header, /onClick=\{openSuggestion\}/);
});

test("public help remains a pure FAQ page", () => {
  assert.match(helpPage, /Câu hỏi thường gặp/);
  assert.match(helpPage, /type="search"/);
  assert.doesNotMatch(helpPage, /mailto:/);
  assert.doesNotMatch(helpPage, /href=\{?[^\n]*feedback/);
});
