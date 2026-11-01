import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const SRC = join(import.meta.dirname, "..", "..");

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return name.endsWith(".tsx") ? [path] : [];
  });
}

// A source scan only finds what it can read: scripts/verify_text_contrast.mjs
// measures the rendered pages.
test("paragraphs and labels do not use slate-400 in light mode (2.56:1 on white)", () => {
  const pale = /<(?:p|label|li|h[1-6])\b[^>\n]*className="[^"]*(?:^|\s|")text-slate-400(?:\s|")/;
  const found = tsxFiles(SRC).filter((file) => pale.test(readFileSync(file, "utf8")));
  assert.deepEqual(found, []);
});

test("text in dark mode avoids slate-500 and slate-600", () => {
  const dim = /dark:text-slate-[56]00\b/;
  const found = tsxFiles(SRC).filter((file) => dim.test(readFileSync(file, "utf8")));
  assert.deepEqual(found, []);
});
