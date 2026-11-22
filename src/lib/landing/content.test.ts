import assert from "node:assert/strict";
import test from "node:test";
import { LANDING_IMAGES, LANDING_VIDEO, type LandingImageKey } from "./assets.ts";
import {
  CROPS,
  HABITS,
  HABITS_LEAD,
  HABITS_TITLE,
  PATH,
  PATH_TITLE,
  SKILLS,
  SKILLS_TITLE,
  STAGE_VIDEO_KEY,
  VIDEO_CROP,
  cropMedia,
  cropRatio,
  fitWidth,
  stepIndex,
} from "./content.ts";

const CEFR_NEGATION = "không phải chứng chỉ hay cấp độ CEFR";
const OVERCLAIM = /ETS|CEFR [A-C][12]|học viên đã|\d+\s*(nghìn|k)\+? học viên/i;

test("SKILLS lists the six parts in order, Nói first", () => {
  assert.deepEqual(
    SKILLS.map((s) => s.name),
    ["Nói", "Nghe", "Đọc", "Viết", "Luyện đề TOEIC", "Flashcard"],
  );
  assert.deepEqual(
    SKILLS.map((s) => s.key),
    ["skill-noi", "skill-nghe", "skill-doc", "skill-viet", "skill-luyen-de", "skill-flashcard"],
  );
  assert.equal(STAGE_VIDEO_KEY, "skill-noi");
});

test("PATH has four steps in order and keeps the old roadmap's caveats", () => {
  assert.deepEqual(
    PATH.map((p) => p.key),
    ["path-danh-gia", "path-goi-y", "path-phan-hoi", "path-luyen-de"],
  );
  const phrases = ["bài đánh giá đầu vào", "gợi ý bài luyện", "luyện và nhận phản hồi", "luyện đề TOEIC"];
  PATH.forEach((step, i) => assert.ok(step.name.includes(phrases[i]), `${step.name} names "${phrases[i]}"`));
  assert.ok(PATH[0].fact.includes(CEFR_NEGATION));
  assert.ok(PATH[3].fact.includes("do BreadTrans biên soạn"));
  assert.ok(PATH[3].fact.includes("không phải điểm thi chính thức"));
});

test("HABITS has five or six tiles and shows the /market screen once", () => {
  assert.ok(HABITS.length >= 5 && HABITS.length <= 6, `${HABITS.length} tiles`);
  for (const h of HABITS) assert.match(h.key, /^habit-/);
  const keys = HABITS.map((h) => h.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(!(keys.includes("habit-banh-mi") && keys.includes("habit-cua-hang")), "banh-mi and cua-hang are the same screen");
  const names = HABITS.map((h) => h.name);
  assert.ok(names.includes("Bánh Mì"));
  assert.ok(names.includes("Thú ảo"));
});

test("every key is a landing image and every item has words", () => {
  for (const item of [...SKILLS, ...HABITS, ...PATH]) {
    assert.ok(item.key in LANDING_IMAGES, `${item.key} in LANDING_IMAGES`);
    assert.ok(item.name.trim().length > 0, `${item.key} name`);
    assert.ok(item.fact.trim().length > 0, `${item.key} fact`);
  }
});

test("no copy claims more than the product, apart from the CEFR negation of step one", () => {
  const strings = [
    SKILLS_TITLE,
    HABITS_TITLE,
    HABITS_LEAD,
    PATH_TITLE,
    ...[...SKILLS, ...HABITS, ...PATH].flatMap((item) => [item.name, item.fact]),
    ...Object.values(CROPS).map((crop) => crop?.alt ?? ""),
  ];
  const checked = strings.map((s) => (s === PATH[0].fact ? s.replace(CEFR_NEGATION, "") : s));
  for (const s of checked) {
    assert.doesNotMatch(s, OVERCLAIM);
    assert.doesNotMatch(s, /CEFR/, "CEFR appears only in the negation of step one");
  }
});

test("the writing picture is the practice list, so its caption claims no feedback", () => {
  const viet = SKILLS.find((s) => s.key === "skill-viet");
  assert.ok(viet);
  assert.ok(viet.fact.includes("theo trình độ"));
  assert.doesNotMatch(viet.fact, /nhận xét|chấm|phản hồi/);
});

test("every picture shown has a crop inside its image, with an alt for that crop", () => {
  const shown: LandingImageKey[] = [
    ...SKILLS.filter((s) => s.key !== STAGE_VIDEO_KEY).map((s) => s.key),
    ...HABITS.map((h) => h.key),
    ...PATH.map((p) => p.key),
  ];
  const inside = (c: { x: number; y: number; w: number; h: number }, width: number, height: number) =>
    c.x >= 0 && c.y >= 0 && c.w > 0 && c.h > 0 && c.x + c.w <= width && c.y + c.h <= height;
  for (const key of shown) {
    const crop = CROPS[key];
    assert.ok(crop, `${key} has a crop`);
    assert.ok(inside(crop, LANDING_IMAGES[key].width, LANDING_IMAGES[key].height), `${key} crop inside`);
    assert.ok(crop.alt.trim().length > 0, `${key} crop has its own alt`);
  }
  assert.ok(inside(VIDEO_CROP, LANDING_VIDEO.width, LANDING_VIDEO.height), "video crop inside");
});

test("the landing shows TOEIC only: no other certificate in words or in the exam-page crop", () => {
  const OTHER_CERTIFICATES = /IELTS|VSTEP|TOEFL|Cambridge|FCE|CAE/i;
  const strings = [
    SKILLS_TITLE,
    HABITS_TITLE,
    HABITS_LEAD,
    PATH_TITLE,
    ...[...SKILLS, ...HABITS, ...PATH].flatMap((item) => [item.name, item.fact]),
    ...Object.values(CROPS).map((crop) => crop?.alt ?? ""),
  ];
  for (const s of strings) assert.doesNotMatch(s, OTHER_CERTIFICATES);
  // skill-luyen-de.webp: the "IELTS Academic Dự kiến" chip starts at x 361 (row y 317-363),
  // then VSTEP, TOEFL and Cambridge. A crop that reaches that row must stop left of it.
  const crop = CROPS["skill-luyen-de"];
  assert.ok(crop);
  const reachesChipRow = crop.y < 363 && crop.y + crop.h > 317;
  assert.ok(!reachesChipRow || crop.x + crop.w <= 360, "exam-page crop stops before the IELTS chip");
});

test("cropMedia places the whole image so the crop fills its box", () => {
  assert.deepEqual(cropMedia({ width: 1600, height: 588 }, { x: 0, y: 215, w: 800, h: 373 }), {
    width: "200%",
    height: "157.6408%",
    left: "0%",
    top: "-57.6408%",
  });
  assert.deepEqual(cropMedia({ width: 1000, height: 500 }, { x: 250, y: 100, w: 500, h: 250 }), {
    width: "200%",
    height: "200%",
    left: "-50%",
    top: "-40%",
  });
  assert.equal(cropRatio({ x: 0, y: 0, w: 800, h: 373 }), "800 / 373");
});

test("fitWidth keeps the crop inside its container, less a margin", () => {
  assert.equal(fitWidth({ x: 0, y: 0, w: 800, h: 400 }), "min(calc(100cqw - 2 * 0px), calc((100cqh - 2 * 0px) * 2))");
  assert.equal(
    fitWidth({ x: 0, y: 0, w: 300, h: 400 }, "3cqmin"),
    "min(calc(100cqw - 2 * 3cqmin), calc((100cqh - 2 * 3cqmin) * 0.75))",
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
