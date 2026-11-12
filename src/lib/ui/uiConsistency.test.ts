/**
 * One name and one icon per thing, everywhere (owner 2026-11-12). The names
 * and icons are in glossary.ts; this test fails when the source writes a
 * thing another way, or uses an emoji. It reads the source text: words are
 * checked only inside text a person reads (string literals and JSX text), so
 * code names such as `streakCount` or the plan code "PLUS" are not touched.
 *
 * A real exception goes in ALLOW with the reason.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const SRC = path.resolve(import.meta.dirname, "../..");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.ts$/.test(entry.name)) out.push(full);
  }
  return out;
}

const FILES = sourceFiles(SRC).map((file) => ({
  rel: path.relative(SRC, file).split(path.sep).join("/"),
  text: fs.readFileSync(file, "utf8"),
}));

/** Text a person reads: string literals and JSX text, with their line numbers. */
type Shown = { line: number; value: string; jsx: boolean };
function displayText(text: string): Shown[] {
  const out: Shown[] = [];
  const lineOf = (index: number) => text.slice(0, index).split("\n").length;
  const literal = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g;
  for (const m of text.matchAll(literal))
    // A ${...} inside a template is code, not text.
    out.push({ line: lineOf(m.index!), value: m[0].slice(1, -1).replace(/\$\{[^}]*\}/g, " "), jsx: false });
  // A /* comment */ between two tags is not text; blank it but keep the line breaks.
  const code = text.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));
  const jsx = />([^<>{}=;]*[A-Za-zÀ-ỹ][^<>{}=;]*)</g;
  for (const m of code.matchAll(jsx)) out.push({ line: lineOf(m.index!), value: m[1], jsx: true });
  return out;
}

/**
 * A word list rule: the wrong way, the right way, and where the wrong way is
 * fine. jsxOnly: a string literal of this shape is a code ("PLUS" as a plan
 * code, "Reading" as a skill key), so only JSX text is checked.
 */
type WordRule = { name: string; wrong: RegExp; right: string; allowIn?: RegExp; jsxOnly?: boolean };

const WORD_RULES: WordRule[] = [
  // Lowercase "bánh mì" is the food (ổ bánh mì, bánh mì que); the currency is "Bánh Mì".
  // The u flag matters: without it \b does not see "ì" as a letter.
  {
    name: "currency",
    wrong: /\bBánh mì(?!\p{L})(?! (que|gối|sừng))|[Ss]ố dư bánh mì|\d+\s*bánh(?!\p{L})(?! mì)|^\s*bánh\s*$/u,
    right: "Bánh Mì",
  },
  // Shown text only: a single lowercase token ("streak", "streak-freeze") is a key or a path.
  { name: "streak", wrong: /^Streak$|\b[Ss]treak\b(?=.*\s)|(?<=\s.*)\b[Ss]treak\b/, right: "chuỗi" },
  { name: "shield", wrong: /thẻ giữ chuỗi|Streak Freeze|khiên bảo vệ/i, right: "khiên giữ chuỗi" },
  { name: "level", wrong: /\bLv\.\s?\d|\bLv\.?$|\bLevel \d/, right: "Cấp N" },
  { name: "pet points outside the pet", wrong: /\bEXP\b/, right: "XP (learner) / EXP (pet only)", allowIn: /(^|\/)(modules\/pet|app\/\(student\)\/pet)\/|^lib\/ui\/(glossary|terms)\.ts$/ },
  { name: "plan names", wrong: /\b[gG]ói (FREE|PLUS|PRO)\b|BreadTrans (FREE|PLUS|PRO)\b/, right: "gói Free / Plus / Pro" },
  { name: "assistant", wrong: /Trợ Lý Bánh Mì|[tT]rợ lý học tập|Gia [sS]ư Bánh Mì|Bánh Mì Gia Sư/, right: "Trợ lý Bánh Mì" },
  { name: "dictation", wrong: /[Cc]hép chính tả|\bDictation\b(?=.*\s)|(?<=\s.*)\bDictation\b/, right: "Nghe chép", allowIn: /^app\/\(admin\)\// },
  { name: "flashcard", wrong: /[Tt]hẻ ghi nhớ/, right: "Flashcard" },
  { name: "shop", wrong: /^Shop$|\bShop\b(?=.*\s)/, right: "Cửa hàng" },
  // In Vietnamese text, or standing alone; an English log line or an API path is not text.
  {
    name: "transcript",
    wrong: /^(?=.*[À-ỹ])(?=.*(?<![/\w-])[Tt]ranscript\b)|^\s*(Full [Tt]ranscript|Transcript)\s*$|kịch bản/,
    right: "Lời thoại (bài nghe) / Lời bạn nói (bài nói)",
  },
  { name: "paid content", wrong: /\bPremium\b/, right: "gói Plus / gói Pro" },
  { name: "plan code shown", wrong: /^\s*(FREE|PLUS|PRO)\s*$/, right: "Free / Plus / Pro", jsxOnly: true },
  // Owner 2026-11-12: the report and the app say "thú ảo".
  { name: "pet", wrong: /[Tt]hú cưng/, right: "thú ảo" },
  { name: "help", wrong: /^\s*FAQ\s*$|Trung tâm trợ giúp/, right: "Trợ giúp" },
  { name: "English unit", wrong: /\b24h\b|\bBoost\b/, right: "24 giờ" },
  {
    name: "Title Case term",
    wrong: /Khung Avatar|Huy Hiệu|Thú Cưng|Thú Ảo|Cửa Hàng|Đấu Trường|Bảng Xếp Hạng|Nhiệm Vụ|Sổ Lỗi|Thông Báo|Ngữ Pháp|Luyện Đề|Giữ Chuỗi|Tiến Độ|Nghe Chép|Trợ Lý/,
    right: "sentence case: Thú ảo, Cửa hàng, Đấu trường, huy hiệu…",
  },
  {
    name: "English label",
    wrong: /^\s*(More|Pet|Edit|Change language|Add another language|AI Bilingual|BreadTrans AI Tutor|AI Tutor)\s*$/,
    right: "Thêm / Thú ảo / Sửa / Đổi ngôn ngữ / Thêm ngôn ngữ / Song ngữ / Trợ lý Bánh Mì",
  },
  { name: "English skill name in practice", wrong: /^\s*(Reading|Listening|Speaking|Writing)\s*$/, right: "Đọc / Nghe / Nói / Viết", allowIn: /toeic|exam|admin/i, jsxOnly: true },
  { name: "English skill suffix in practice", wrong: /\((Listening|Reading|Speaking|Writing)\)/, right: "Nghe / Nói / Đọc / Viết", allowIn: /toeic|exam|admin/i },
];

/** Icons that must come from the glossary component, not be drawn directly. */
const ICON_OWNERS: Array<{ icon: string; ownerFiles: RegExp; why: string }> = [
  { icon: "Wheat", ownerFiles: /^components\/ui\/BreadCoinIcon\.tsx$|^lib\/ui\/glossary\.tsx?$/, why: "Bánh Mì goes through BreadCoinIcon" },
  {
    icon: "Croissant",
    ownerFiles: /^(lib\/ui\/glossary\.tsx?|components\/FloatingAiTutor\.tsx|components\/auth\/QuickRegisterModal\.tsx|components\/notifications\/NotificationIcon\.tsx)$/,
    why: "Croissant is the assistant and the logo, never the currency",
  },
];

/** An icon drawn next to a word that has another icon in the glossary. */
const NEAR_RULES: Array<{ word: RegExp; icon: RegExp; right: string }> = [
  { word: /["> ]Viết["<]|Luyện Viết/, icon: /<(PenLine|Pencil|PencilLine)\b/, right: "PenTool" },
  { word: /Flashcard/, icon: /<(Layers3|RotateCw)\b/, right: "Layers" },
  { word: /[Tt]hú ảo/, icon: /<Heart\b/, right: "PawPrint" },
  { word: /[Nn]hiệm vụ/, icon: /<Target\b/, right: "ListChecks" },
  { word: /^\s*Bánh M[iì]\s*$|>\s*Bánh M[iì]\s*</m, icon: /<(Gift|Coins|Croissant)\b/, right: "BreadCoinIcon" },
];

const ALLOW: Array<{ file: string; rule: string; why: string }> = [];
const allowed = (file: string, rule: string) => ALLOW.some((a) => a.file === file && a.rule === rule);

test("no emoji anywhere in the source", () => {
  const found: string[] = [];
  for (const f of FILES)
    f.text.split("\n").forEach((line, i) => {
      // ©, ® and ™ are text signs; ✓ ✕ ✔ ✗ count as emoji here, they are drawn as icons.
      if (/(?![©®™])\p{Extended_Pictographic}|[✓✕✔✗]/u.test(line) && !allowed(f.rel, "emoji"))
        found.push(`${f.rel}:${i + 1}: ${line.trim().slice(0, 90)}`);
    });
  assert.deepEqual(found, []);
});

test("each thing is written one way (glossary.ts)", () => {
  const found: string[] = [];
  for (const f of FILES)
    for (const { line, value, jsx } of displayText(f.text))
      for (const rule of WORD_RULES) {
        if (rule.allowIn?.test(f.rel) || allowed(f.rel, rule.name) || (rule.jsxOnly && !jsx)) continue;
        if (rule.wrong.test(value)) found.push(`${f.rel}:${line} [${rule.name} -> ${rule.right}] ${value.slice(0, 80)}`);
      }
  assert.deepEqual(found, []);
});

test("shared icons are drawn by their glossary component only", () => {
  const found: string[] = [];
  for (const f of FILES)
    for (const rule of ICON_OWNERS) {
      if (rule.ownerFiles.test(f.rel) || allowed(f.rel, `icon:${rule.icon}`)) continue;
      if (new RegExp(`<${rule.icon}\\b|icon: ${rule.icon}\\b|Icon=\\{${rule.icon}\\}`).test(f.text))
        found.push(`${f.rel} [${rule.icon}] ${rule.why}`);
    }
  assert.deepEqual(found, []);
});

test("short forms written next to a value are not used", () => {
  // "Lv.{level}" and "{streak}d" are not caught as text: the value sits inside.
  const RAW: Array<{ wrong: RegExp; right: string }> = [
    { wrong: />\s*Lv\.?\s*\{/, right: "Cấp {level}" },
    { wrong: /\}d\s*</, right: "{n} ngày" },
    // A plan code ("PLUS") put straight into text; the name comes from planName().
    { wrong: /(gói|với|cho|Nội dung) \$?\{\s*[\w.]*([pP]lan|requiredPlan)\s*\}/, right: "{planName(plan)}" },
    { wrong: /(gói|với) (FREE|PLUS|PRO)\b/, right: "gói Free / Plus / Pro" },
  ];
  const found: string[] = [];
  for (const f of FILES)
    f.text.split("\n").forEach((line, i) => {
      for (const rule of RAW)
        if (rule.wrong.test(line)) found.push(`${f.rel}:${i + 1} -> ${rule.right}: ${line.trim().slice(0, 80)}`);
    });
  assert.deepEqual(found, []);
});

test("a word is drawn with its glossary icon", () => {
  const found: string[] = [];
  for (const f of FILES) {
    const lines = f.text.split("\n");
    lines.forEach((line, i) => {
      for (const rule of NEAR_RULES) {
        if (!rule.icon.test(line)) continue;
        const near = lines.slice(Math.max(0, i - 3), i + 4).join("\n");
        if (rule.word.test(near) && !allowed(f.rel, `near:${rule.right}`))
          found.push(`${f.rel}:${i + 1} -> ${rule.right}: ${line.trim().slice(0, 80)}`);
      }
    });
  }
  assert.deepEqual(found, []);
});
