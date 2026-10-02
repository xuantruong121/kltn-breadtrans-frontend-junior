import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const helpPage = readFileSync(
  new URL("../../app/(public)/help/page.tsx", import.meta.url),
  "utf8",
);
const publicInfoPage = readFileSync(
  new URL("./PublicInfoPage.tsx", import.meta.url),
  "utf8",
);
const header = readFileSync(
  new URL("../navigation/AppHeader.tsx", import.meta.url),
  "utf8",
);

test("feedback suggestion points to a real semantic help section", () => {
  assert.match(helpPage, /id:\s*["']feedback["']/);
  assert.match(helpPage, /Đề xuất tính năng & Đóng góp ý kiến/);
  assert.match(publicInfoPage, /id=\{section\.id\}/);
  assert.match(publicInfoPage, /scroll-mt-24/);
  assert.match(header, /href:\s*["']\/help#feedback["']/);
});
