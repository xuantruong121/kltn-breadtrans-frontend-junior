import test from "node:test";
import assert from "node:assert/strict";
import { CONTENT_TRACKS } from "./skillCmsStatus.ts";
import {
  kindOptionLabel,
  listUnit,
  sortOptions,
  toolbarCountText,
  toolbarFilters,
  type AdminContentList,
} from "./adminListToolbarLogic.ts";

const noop = () => {};
const choice = (...values: string[]) => ({
  value: "ALL",
  onChange: noop,
  options: values.map((value) => ({ value, label: value })),
});
const status = { value: "ALL" as const, onChange: noop };
const track = { value: "ALL", onChange: noop };
const sort = { value: "NEWEST" as const, onChange: noop };
const ALL = { value: "ALL", label: "Tất cả" };
const LISTS: AdminContentList[] = ["listening", "reading", "writing", "speaking", "grammar", "vocab"];

test("toolbarFilters keeps the slot order, whatever order the page passes them in", () => {
  const filters = toolbarFilters(
    {
      sort,
      extra: { label: "Audio", ...choice("ok") },
      track,
      level: choice("A1"),
      status,
      kind: choice("DICTATION"),
    },
    "listening",
  );
  assert.deepEqual(
    filters.map((filter) => filter.slot),
    ["kind", "status", "level", "track", "extra", "sort"],
  );
  assert.deepEqual(
    filters.map((filter) => filter.label),
    ["Dạng bài", "Trạng thái", "Trình độ", "Lĩnh vực", "Audio", "Sắp xếp"],
  );
});

test("toolbarFilters leaves out the slots a page does not have", () => {
  const labels = (filters: ReturnType<typeof toolbarFilters>) => filters.map((filter) => filter.label);
  // Đọc: no Dạng bài and no filter of its own.
  assert.deepEqual(labels(toolbarFilters({ sort, track, level: choice("B1"), status }, "reading")), [
    "Trạng thái",
    "Trình độ",
    "Lĩnh vực",
    "Sắp xếp",
  ]);
  // Nói: Phân loại is the page's own filter, so it comes after Lĩnh vực.
  assert.deepEqual(
    labels(toolbarFilters({ extra: { label: "Phân loại", ...choice("DAILY") }, sort, track, level: choice("A2"), status }, "speaking")),
    ["Trạng thái", "Trình độ", "Lĩnh vực", "Phân loại", "Sắp xếp"],
  );
  // Ngữ pháp: three filters.
  assert.deepEqual(labels(toolbarFilters({ sort, level: choice("BEGINNER"), status }, "grammar")), [
    "Trạng thái",
    "Trình độ",
    "Sắp xếp",
  ]);
  // Từ vựng: Chuyên mục between Trình độ and Sắp xếp.
  assert.deepEqual(
    labels(toolbarFilters({ extra: { label: "Chuyên mục", ...choice("TOEIC") }, sort, level: choice("B2"), status }, "vocab")),
    ["Trạng thái", "Trình độ", "Chuyên mục", "Sắp xếp"],
  );
});

test("toolbarFilters puts 'Tất cả' before a page's options and owns the status and track options", () => {
  const [kind, statusFilter, level, trackFilter, extra, sortFilter] = toolbarFilters(
    { kind: choice("DICTATION"), status, level: choice("A1"), track, extra: { label: "Audio", ...choice("none") }, sort },
    "listening",
  );
  assert.deepEqual(kind.options, [ALL, { value: "DICTATION", label: "DICTATION" }]);
  assert.deepEqual(level.options, [ALL, { value: "A1", label: "A1" }]);
  assert.deepEqual(extra.options, [ALL, { value: "none", label: "none" }]);
  assert.deepEqual(statusFilter.options, [
    ALL,
    { value: "DRAFT", label: "Bản nháp" },
    { value: "PUBLISHED", label: "Đã xuất bản" },
  ]);
  assert.deepEqual(trackFilter.options, [ALL, { value: "UNTAGGED", label: "Chưa gắn lĩnh vực" }, ...CONTENT_TRACKS]);
  assert.equal(sortFilter.options.some((option) => option.value === "ALL"), false);
  assert.deepEqual(sortFilter.options, sortOptions("listening"));
});

test("toolbarFilters hands the chosen value back to the page", () => {
  const seen: string[] = [];
  const [statusFilter, sortFilter] = toolbarFilters(
    {
      status: { value: "ALL", onChange: (value) => seen.push(value) },
      sort: { value: "NEWEST", onChange: (value) => seen.push(value) },
    },
    "grammar",
  );
  statusFilter.onChange("DRAFT");
  sortFilter.onChange("OLDEST");
  assert.deepEqual(seen, ["DRAFT", "OLDEST"]);
  assert.equal(statusFilter.value, "ALL");
  assert.equal(sortFilter.value, "NEWEST");
});

test("sortOptions: one sort vocabulary on all six lists", () => {
  for (const content of LISTS) {
    const options = sortOptions(content);
    assert.deepEqual(
      options.map((option) => option.value),
      ["NEWEST", "OLDEST", "LEVEL", "TITLE", "FEWEST"],
      content,
    );
    assert.deepEqual(
      options.slice(0, 4).map((option) => option.label),
      ["Mới tạo trước", "Cũ trước", "Trình độ thấp → cao", "Tên A → Z"],
      content,
    );
  }
});

test("sortOptions: 'fewest first' names what each list counts", () => {
  assert.deepEqual(Object.fromEntries(LISTS.map((content) => [content, sortOptions(content)[4].label])), {
    listening: "Ít câu hỏi trước",
    reading: "Ít câu hỏi trước",
    writing: "Ít câu hỏi trước",
    speaking: "Ít câu luyện trước",
    grammar: "Ít câu hỏi trước",
    vocab: "Ít từ trước",
  });
});

test("toolbarCountText: the total, the match while filtered, and the loading note", () => {
  const base = { total: 12, matched: 12, unit: "bài", filtered: false, fetching: false };
  assert.equal(toolbarCountText(base), "12 bài");
  assert.equal(toolbarCountText({ ...base, matched: 3, filtered: true }), "Khớp 3/12");
  assert.equal(toolbarCountText({ ...base, fetching: true }), "12 bài · đang tải");
  assert.equal(toolbarCountText({ ...base, matched: 3, filtered: true, fetching: true }), "Khớp 3/12 · đang tải");
  // A filter that keeps every item still says a filter is on.
  assert.equal(toolbarCountText({ ...base, filtered: true }), "Khớp 12/12");
  // An empty list is a real count.
  assert.equal(toolbarCountText({ ...base, total: 0, matched: 0 }), "0 bài");
  // Before the first page arrives there is no count to show.
  assert.equal(toolbarCountText({ ...base, total: undefined, matched: 0, fetching: true }), null);
});

test("listUnit: bài on Nghe, Đọc and Viết; bộ on Nói and Từ vựng; chủ đề on Ngữ pháp", () => {
  assert.deepEqual(Object.fromEntries(LISTS.map((content) => [content, listUnit(content)])), {
    listening: "bài",
    reading: "bài",
    writing: "bài",
    speaking: "bộ",
    grammar: "chủ đề",
    vocab: "bộ",
  });
  assert.equal(
    toolbarCountText({ total: 5, matched: 5, unit: listUnit("speaking"), filtered: false, fetching: false }),
    "5 bộ",
  );
});

test("kindOptionLabel shows a count only when the server sends one", () => {
  assert.equal(kindOptionLabel("Nghe hiểu", 4), "Nghe hiểu (4)");
  assert.equal(kindOptionLabel("Dịch câu", 0), "Dịch câu (0)");
  assert.equal(kindOptionLabel("Dịch câu", undefined), "Dịch câu");
});
