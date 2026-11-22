/**
 * The six admin content lists draw their search box and filter row through
 * AdminListToolbar instead of by hand (owner 2026-11-21). Reads the source
 * text: it proves what each file contains, not how the page renders.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(import.meta.dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8");

const WORKSPACE = "components/admin/SkillCmsWorkspace.tsx";
/** Nghe, Đọc and Viết render the shared workspace with their domain. */
const SKILL_PAGES = {
  listening: "app/(admin)/admin/listening/page.tsx",
  reading: "app/(admin)/admin/reading/page.tsx",
  writing: "app/(admin)/admin/writing/page.tsx",
};
/** Nói, Ngữ pháp and Từ vựng render the toolbar themselves. */
const OWN_PAGES = {
  speaking: "app/(admin)/admin/speaking/page.tsx",
  grammar: "app/(admin)/admin/grammar/page.tsx",
  vocab: "app/(admin)/admin/vocab/page.tsx",
};
const ALL_SOURCES = [WORKSPACE, ...Object.values(SKILL_PAGES), ...Object.values(OWN_PAGES)];

test("every content list renders AdminListToolbar", () => {
  const workspace = read(WORKSPACE);
  assert.match(workspace, /<AdminListToolbar\s+content=\{domain\}/);
  for (const [domain, file] of Object.entries(SKILL_PAGES))
    assert.match(read(file), new RegExp(`<SkillCmsWorkspace domain="${domain}"`), file);
  for (const [content, file] of Object.entries(OWN_PAGES))
    assert.match(read(file), new RegExp(`<AdminListToolbar\\s+content="${content}"`), file);
});

test("no content list has a search placeholder or a 'Xóa bộ lọc' of its own", () => {
  for (const file of ALL_SOURCES) {
    const source = read(file);
    assert.doesNotMatch(source, /placeholder="Tìm theo/, file);
    assert.doesNotMatch(source, /Xóa bộ lọc/, file);
  }
});

test("Nói, Ngữ pháp and Từ vựng have no select of their own", () => {
  for (const file of Object.values(OWN_PAGES)) assert.doesNotMatch(read(file), /<select\b/, file);
});

test("the toolbar draws one search row and one filter row 12px apart", () => {
  const toolbar = read("components/admin/AdminListToolbar.tsx");
  assert.match(toolbar, /<div className="space-y-3">/);
  assert.equal(toolbar.split('placeholder="Tìm theo tên, mô tả..."').length, 2);
  assert.match(toolbar, /<select[\s\S]*?className=\{ADMIN_SELECT\}/);
  // "Xóa bộ lọc" only while a filter is on, with a visible keyboard focus ring.
  assert.match(toolbar, /\{filtersActive && \(\s*<button[\s\S]*?focus-visible:ring-2[\s\S]*?Xóa bộ lọc/);
});

test("Nghe's form filter is a select now: the pill group is gone", () => {
  assert.doesNotMatch(read(WORKSPACE), /aria-label="Lọc loại bài nghe"/);
});

test("the workspace list keeps its header while the first page loads (source check)", () => {
  const workspace = read(WORKSPACE);
  assert.doesNotMatch(workspace, /mode === "list" \? list\.isLoading/);
  assert.match(workspace, /\{list\.isLoading \? \(/);
});

test("Nói sends the shared sort values and is titled 'Nội dung Nói'", () => {
  const speaking = read(OWN_PAGES.speaking);
  assert.doesNotMatch(speaking, /UPDATED/);
  assert.match(speaking, /title="Nội dung Nói"/);
});

test("Nói filters by Lĩnh vực, with no Phân loại filter or category request (owner 2026-11-21)", () => {
  const speaking = read(OWN_PAGES.speaking);
  assert.match(speaking, /track=\{\{ value: trackFilter/);
  assert.doesNotMatch(speaking, /\bextra=\{/);
  assert.doesNotMatch(speaking, /category: |speaking\/categories/);
});
