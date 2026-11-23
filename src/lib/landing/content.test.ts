import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { displayText } from "../ui/displayText.ts";
import { FAQ } from "./faq.ts";
import { LISTENING_QUESTION, READING_QUESTION, SPEAKING_RESULT, WRITING_PROMPT } from "./fragments.ts";
import { HABITS, HABITS_LEAD, HABITS_TITLE, PATH, SKILLS, stepIndex } from "./content.ts";

/** Step one's caveat and the FAQ's disclaimer: the only sentences on the landing that may name CEFR or ETS. */
const CEFR_NEGATION = "Kết quả là ước lượng nội bộ để gợi ý bài luyện, không phải chứng chỉ hay cấp độ CEFR.";
const ETS_DISCLAIMER =
  "BreadTrans không liên kết với ETS và không cấp chứng chỉ; điểm hiển thị chỉ dùng để theo dõi tiến bộ khi luyện tập.";
const OVERCLAIM = /\bETS\b|CEFR|học viên đã|\d+\s*(nghìn|k)\+? học viên/i;

/**
 * The stored values that carry a CEFR-like set code. The fragments never show
 * them raw: setLevel is not rendered and every quiz title goes through
 * titleWithoutSetCode (fragments.test.ts checks both in the components).
 */
const STORED_SET_CODES = [
  "A1",
  "Listening A2 — Everyday Communication",
  "Reading A2 — Notices & Messages",
  "Writing B1 — Professional Email",
];

// ---- What the guards scan ---------------------------------------------------

const SRC = path.resolve(import.meta.dirname, "../..");
const SCOPE =
  "every string literal and JSX text in src/app/(public)/page.tsx, src/components/landing/** and src/lib/landing/*.ts";

function sourceFiles(dir: string, deep: boolean): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return deep ? sourceFiles(full, deep) : [];
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.ts$/.test(entry.name) ? [full] : [];
  });
}

/**
 * The landing's sources, tests excluded: the page with its title and meta
 * description, the section components, the coded fragments, and the copy and
 * data in src/lib/landing (content, faq, plans, fragments, speakingDemo).
 * displayText reads the source text, so it also scans comments: whatever a
 * comment holds between two apostrophes or two backticks becomes a scanned
 * string, and a guarded word there fails here with its file and line. It
 * does not see text that arrives at runtime: the plan
 * descriptions GET /plans/catalog may send are not checked.
 */
const LANDING_FILES = [
  path.join(SRC, "app/(public)/page.tsx"),
  ...sourceFiles(path.join(SRC, "components/landing"), true),
  ...sourceFiles(path.join(SRC, "lib/landing"), false),
].map((file) => ({ rel: path.relative(SRC, file).split(path.sep).join("/"), text: fs.readFileSync(file, "utf8") }));

const SHOWN = LANDING_FILES.flatMap((f) => displayText(f.text).map((s) => ({ where: `${f.rel}:${s.line}`, value: s.value })));

/** `value` with every exact copy of the `allowed` sentences taken out. */
const without = (value: string, allowed: string[]) => allowed.reduce((s, sentence) => s.split(sentence).join(" "), value);

/** Every scanned string matching `pattern` once the exact `allowed` sentences are taken out. */
function offenders(pattern: RegExp, allowed: string[] = []): string[] {
  return SHOWN.filter(({ value }) => pattern.test(without(value, allowed))).map(({ where, value }) => `${where} ${value.slice(0, 100)}`);
}

test("SKILLS lists the six parts in order, Nói first", () => {
  assert.deepEqual(
    SKILLS.map((s) => s.name),
    ["Nói", "Nghe", "Đọc", "Viết", "Luyện đề TOEIC", "Flashcard"],
  );
  assert.deepEqual(
    SKILLS.map((s) => s.key),
    ["skill-noi", "skill-nghe", "skill-doc", "skill-viet", "skill-luyen-de", "skill-flashcard"],
  );
});

test("each skills fact says exactly what its fragment shows (owner feedback #3)", () => {
  assert.deepEqual(
    SKILLS.map((s) => [s.name, s.fact]),
    [
      ["Nói", "Đọc to câu mẫu rồi xem điểm từng từ: xanh là đạt chuẩn, vàng cần chỉnh lại, đỏ chưa đạt, từ gạch ngang là bị bỏ sót."],
      ["Nghe", "Nghe đoạn ghi âm rồi chọn đáp án. Bài được chấm ngay khi nộp và hiện đáp án đúng."],
      ["Đọc", "Đọc thông báo, tin nhắn hay email rồi trả lời. Mỗi câu có giải thích vì sao đáp án đúng."],
      ["Viết", "Mỗi đề Viết nêu rõ tình huống và số từ cần viết. Bài nộp được nhận xét theo tiêu chí."],
      [
        "Luyện đề TOEIC",
        "Đề Nghe & Đọc theo cấu trúc TOEIC do BreadTrans biên soạn: 200 câu trong 120 phút, hoặc chọn từng Part để luyện.",
      ],
      ["Flashcard", "Mỗi thẻ có phiên âm, nghĩa và câu ví dụ. Lật thẻ để xem mặt sau."],
    ],
  );
  const toeic = SKILLS.find((s) => s.name === "Luyện đề TOEIC");
  assert.ok(toeic?.fact.includes("do BreadTrans biên soạn"));
});

test("PATH has four steps in order and keeps the old roadmap's caveats", () => {
  assert.equal(PATH.length, 4);
  const phrases = ["bài đánh giá đầu vào", "gợi ý bài luyện", "luyện và nhận phản hồi", "luyện đề TOEIC"];
  PATH.forEach((step, i) => assert.ok(step.name.includes(phrases[i]), `${step.name} names "${phrases[i]}"`));
  assert.ok(PATH[0].fact.includes(CEFR_NEGATION));
  assert.ok(PATH[3].fact.includes("do BreadTrans biên soạn"));
  assert.ok(PATH[3].fact.includes("không phải điểm thi chính thức"));
});

test("HABITS has the five tiles of owner feedback #4, with their names and facts", () => {
  assert.equal(
    HABITS_LEAD,
    "Mỗi bài luyện xong đều được thưởng Bánh Mì. Dùng Bánh Mì để chăm thú ảo và đổi vật phẩm trong Cửa hàng.",
  );
  assert.deepEqual(
    HABITS.map((h) => [h.name, h.fact]),
    [
      ["Thú ảo", "Cho thú ảo ăn bằng Bánh Mì và chăm nó mỗi ngày."],
      ["Bánh Mì và Cửa hàng", "Đổi Bánh Mì lấy huy hiệu, khung avatar hay khiên giữ chuỗi trong Cửa hàng."],
      ["Chuỗi ngày học", "Học mỗi ngày để giữ chuỗi; khiên giữ chuỗi đỡ cho một ngày lỡ học."],
      ["Đấu trường", "Song đấu 10 câu từ vựng với một học viên khác, 12 giây mỗi câu."],
      ["Bảng xếp hạng", "Bảng xếp hạng theo điểm tích luỹ và hạng thành viên."],
    ],
  );
  const keys = HABITS.map((h) => h.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(HABITS_TITLE, "Lý do quay lại mỗi ngày");
});

test("every item has a unique key and words", () => {
  for (const step of PATH) assert.ok(step.name.trim().length > 0 && step.fact.trim().length > 0, step.name);
  const keys = [...SKILLS, ...HABITS].map((item) => item.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const item of [...SKILLS, ...HABITS]) {
    assert.ok(item.name.trim().length > 0, `${item.key} name`);
    assert.ok(item.fact.trim().length > 0, `${item.key} fact`);
  }
});

test(`the guards below scan ${SCOPE}`, () => {
  const files = LANDING_FILES.map((f) => f.rel);
  for (const expected of [
    "app/(public)/page.tsx",
    "components/landing/LandingHero.tsx",
    "components/landing/HeroScorePanel.tsx",
    "components/landing/PlanPicker.tsx",
    "components/landing/ActionTile.tsx",
    "components/landing/FaqTiles.tsx",
    "components/landing/LoafMark.tsx",
    "components/landing/fragments/FragNoi.tsx",
    "components/landing/fragments/TileArena.tsx",
    "lib/landing/content.ts",
    "lib/landing/faq.ts",
    "lib/landing/plans.ts",
    "lib/landing/fragments.ts",
    "lib/landing/speakingDemo.ts",
  ])
    assert.ok(files.includes(expected), `${expected} is scanned`);
  assert.ok(!files.some((f) => f.endsWith(".test.ts")), "tests are not scanned");
  // The scan reaches the JSX text of the sections and the strings of the data files.
  const values = SHOWN.map((s) => s.value);
  assert.ok(values.some((v) => v.includes("Bắt đầu học miễn phí")), "LandingHero's JSX text");
  assert.ok(values.some((v) => v.includes("Gói học và giá")), "PlanPicker's JSX text");
  assert.ok(values.some((v) => v.includes("AI chấm 30 bài mỗi ngày")), "plans.ts summaries");
  assert.ok(values.some((v) => v.includes("luyện đề theo cấu trúc TOEIC do BreadTrans biên soạn")), "the meta description");
  // Each allowed sentence is on the page once, so the allow-list cannot go stale unnoticed.
  assert.equal(values.filter((v) => v.includes(CEFR_NEGATION)).length, 1, "the CEFR negation, once");
  assert.equal(values.filter((v) => v.includes(ETS_DISCLAIMER)).length, 1, "the ETS disclaimer, once");
  assert.ok(PATH[0].fact.includes(CEFR_NEGATION));
  assert.ok(FAQ.some((entry) => entry.a.includes(ETS_DISCLAIMER)));
});

test(`no word of stakes or betting (cược, cá độ, đặt cửa) in ${SCOPE}`, () => {
  assert.deepEqual(offenders(/cược|cá độ|đặt cửa/i), []);
});

test(`TOEIC only: no other certificate (IELTS, VSTEP, TOEFL, Cambridge, FCE, CAE) in ${SCOPE}`, () => {
  assert.deepEqual(offenders(/IELTS|VSTEP|TOEFL|Cambridge|FCE|CAE/i), []);
});

test(`no ETS, CEFR or learner-count claim in ${SCOPE}, apart from the FAQ's ETS disclaimer and step one's CEFR negation`, () => {
  const allowed = [CEFR_NEGATION, ETS_DISCLAIMER];
  assert.deepEqual(offenders(OVERCLAIM, allowed), []);
  // Only the exact sentences are allowed: change a word and the same text fails.
  assert.doesNotMatch(without(`${CEFR_NEGATION} ${ETS_DISCLAIMER}`, allowed), OVERCLAIM);
  assert.match(without(CEFR_NEGATION.replace("không phải", "là"), allowed), OVERCLAIM);
  assert.match(without(ETS_DISCLAIMER.replace("không liên kết", "liên kết"), allowed), OVERCLAIM);
});

test(`no CEFR-like set code (A1-C2) in ${SCOPE}, apart from the four stored values the fragments never show raw`, () => {
  assert.deepEqual(
    [SPEAKING_RESULT.setLevel, LISTENING_QUESTION.quiz, READING_QUESTION.quiz, WRITING_PROMPT.quiz],
    STORED_SET_CODES,
  );
  // Allowed only as those exact literals in fragments.ts, where the data is kept.
  const isStored = ({ where, value }: { where: string; value: string }) =>
    where.startsWith("lib/landing/fragments.ts:") && STORED_SET_CODES.includes(value);
  assert.equal(SHOWN.filter(isStored).length, STORED_SET_CODES.length, "each stored value is scanned, once");
  assert.deepEqual(
    SHOWN.filter((s) => /\b[ABC][12]\b/.test(s.value) && !isStored(s)).map(({ where, value }) => `${where} ${value.slice(0, 100)}`),
    [],
  );
});

test("arrow keys move through the list and wrap, Home and End jump", () => {
  assert.equal(stepIndex("ArrowRight", 0, 6), 1);
  assert.equal(stepIndex("ArrowDown", 4, 6), 5);
  assert.equal(stepIndex("ArrowRight", 5, 6), 0);
  assert.equal(stepIndex("ArrowLeft", 0, 6), 5);
  assert.equal(stepIndex("ArrowUp", 3, 6), 2);
  assert.equal(stepIndex("Home", 4, 6), 0);
  assert.equal(stepIndex("End", 1, 6), 5);
  assert.equal(stepIndex("Enter", 2, 6), null);
  assert.equal(stepIndex("a", 2, 6), null);
});
