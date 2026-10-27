/**
 * Source-level guard against internal wording in user-facing UI files.
 * It targets specific phrases, not every "V1"/"API": lesson content and
 * identifiers may legitimately contain those. Exceptions are listed with a
 * reason. Rendered text is audited separately (backend
 * scripts/qa/ui-text-audit.ts).
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const ROOTS = ["src/app", "src/components", "src/modules"];

const BANNED: Array<[string, RegExp]> = [
  ["internal module version", /["'`>][^"'`<]*\b(?:Course|Lesson|Assessment|Diagnostic|Speaking|Quiz|Exam|Module)\s?V\d(?:\.\d)?\b/],
  ["legacy label", /["'`>][^"'`<]*\((?:Legacy|legacy)\)/],
  ["runtime wording", /["'`>][^"'`<]*\bruntime learner\b/],
  ["raw axios message", /Request failed with status code/],
  ["artifact wording", /["'`>][^"'`<]*\bartifact (?:PUBLISHED|DRAFT)\b/],
  ["English draft workflow", /["'`>][^"'`<]*\b(?:full draft|review trước khi Apply)\b/],
  ["storage vendor in helper text", /helperText="[^"]*Cloudflare R2/],
  ["raw error fallback", /response\?\.data\?\.message \|\| (?:err|error)\?\.message \|\|/],
];

// Admin cost dashboard: provider names are the billed line items there.
const ALLOW = new Set(["src/app/(admin)/admin/costs/page.tsx"]);

function* files(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) yield p;
  }
}

test("UI source files contain no internal implementation wording", () => {
  const hits: string[] = [];
  for (const root of ROOTS) {
    for (const file of files(root)) {
      const rel = file.replace(/\\/g, "/");
      if (ALLOW.has(rel)) continue;
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
          for (const [name, re] of BANNED)
            if (re.test(line)) hits.push(`${rel}:${i + 1} [${name}] ${line.trim().slice(0, 120)}`);
        });
    }
  }
  assert.deepEqual(hits, []);
});
