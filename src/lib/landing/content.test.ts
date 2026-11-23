import assert from "node:assert/strict";
import test from "node:test";
import { FAQ } from "./faq.ts";
import {
  HABITS,
  HABITS_LEAD,
  HABITS_TITLE,
  PATH,
  PATH_TITLE,
  SKILLS,
  SKILLS_TITLE,
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

test("no word on the page speaks of stakes or betting", () => {
  const strings = [
    HABITS_TITLE,
    HABITS_LEAD,
    ...[...SKILLS, ...HABITS, ...PATH].flatMap((item) => [item.name, item.fact]),
    ...FAQ.flatMap((entry) => [entry.q, entry.a]),
  ];
  for (const s of strings) assert.doesNotMatch(s, /cược|cá độ|đặt cửa/i, s);
  assert.equal(HABITS_TITLE, "Lý do quay lại mỗi ngày");
});

test("no copy claims more than the product, apart from the CEFR negation of step one", () => {
  const strings = [
    SKILLS_TITLE,
    HABITS_TITLE,
    HABITS_LEAD,
    PATH_TITLE,
    ...[...SKILLS, ...HABITS, ...PATH].flatMap((item) => [item.name, item.fact]),
  ];
  const checked = strings.map((s) => (s === PATH[0].fact ? s.replace(CEFR_NEGATION, "") : s));
  for (const s of checked) {
    assert.doesNotMatch(s, OVERCLAIM);
    assert.doesNotMatch(s, /CEFR/, "CEFR appears only in the negation of step one");
  }
});

test("the landing shows TOEIC only: no other certificate in words", () => {
  const OTHER_CERTIFICATES = /IELTS|VSTEP|TOEFL|Cambridge|FCE|CAE/i;
  const strings = [
    SKILLS_TITLE,
    HABITS_TITLE,
    HABITS_LEAD,
    PATH_TITLE,
    ...[...SKILLS, ...HABITS, ...PATH].flatMap((item) => [item.name, item.fact]),
  ];
  for (const s of strings) assert.doesNotMatch(s, OTHER_CERTIFICATES);
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
