import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { PET_SPECIES_LIST } from "../../modules/pet/types.ts";
import {
  ARENA_DUEL,
  FLASHCARD,
  LEADERBOARD,
  LISTENING_QUESTION,
  OPTION_LETTERS,
  PET,
  QUESTION_TYPE_LABELS,
  READING_QUESTION,
  SHOP_ITEMS,
  SHOP_TYPE_LABELS,
  SPEAKING_RESULT,
  STREAK_RULES,
  TOEIC_EXAM,
  WEEK_DAYS,
  WORD_LEGEND,
  WRITING_PROMPT,
  bandOf,
  examMinutes,
  formatDecimal,
  formatThousands,
  partsOf,
  rangeLabel,
  rankByPoints,
  sectionTotal,
  weekdayIndex,
  wordTitle,
} from "./fragments.ts";

const SRC = path.resolve(import.meta.dirname, "../..");

// ---- Nói: speaking submission 304, exercise 137 ---------------------------

test("the speaking result is submission 304 with its scores", () => {
  assert.equal(SPEAKING_RESULT.submissionId, 304);
  assert.equal(SPEAKING_RESULT.exerciseId, 137);
  assert.equal(SPEAKING_RESULT.title, "Borrowing Books from the University Library");
  assert.equal(SPEAKING_RESULT.setLevel, "A1");
  assert.equal(
    SPEAKING_RESULT.sentence,
    "The university library is open from Monday to Friday from eight in the morning until ten at night.",
  );
  assert.equal(SPEAKING_RESULT.overall, 7.8);
  assert.equal(SPEAKING_RESULT.accuracy, 73);
  assert.equal(SPEAKING_RESULT.fluency, 94);
  assert.equal(SPEAKING_RESULT.completeness, 78);
  assert.equal(formatDecimal(SPEAKING_RESULT.overall), "7,8");
});

test("the speaking words are the 18 words of the sentence with their scores", () => {
  const raw =
    "The:0:Omission university:0:Omission library:0:Omission is:80:None open:38:Mispronunciation from:85:None " +
    "Monday:97:None to:91:None Friday:94:None from:85:None eight:97:None in:80:None the:91:None " +
    "morning:85:None until:97:None ten:94:None at:97:None night.:97:None";
  const expected = raw.split(" ").map((entry) => {
    const [text, accuracy, errorType] = entry.split(":");
    return { text, accuracy: Number(accuracy), errorType };
  });
  assert.deepEqual(SPEAKING_RESULT.words, expected);
  assert.equal(SPEAKING_RESULT.words.map((w) => w.text).join(" "), SPEAKING_RESULT.sentence);
});

test("every Nói word falls in its band: three omitted, open not passed, the rest passed", () => {
  const bands = SPEAKING_RESULT.words.map((w) => [w.text, bandOf(w)]);
  assert.deepEqual(bands, [
    ["The", "omit"],
    ["university", "omit"],
    ["library", "omit"],
    ["is", "pass"],
    ["open", "fail"],
    ["from", "pass"],
    ["Monday", "pass"],
    ["to", "pass"],
    ["Friday", "pass"],
    ["from", "pass"],
    ["eight", "pass"],
    ["in", "pass"],
    ["the", "pass"],
    ["morning", "pass"],
    ["until", "pass"],
    ["ten", "pass"],
    ["at", "pass"],
    ["night.", "pass"],
  ]);
  // The bands follow the product's thresholds, also where this submission has no word.
  assert.equal(bandOf({ text: "x", accuracy: 79, errorType: "None" }), "fix");
  assert.equal(bandOf({ text: "x", accuracy: 60, errorType: "None" }), "fix");
  assert.equal(bandOf({ text: "x", accuracy: 59, errorType: "Mispronunciation" }), "fail");
  assert.equal(bandOf({ text: "x", accuracy: 95, errorType: "Omission" }), "omit");
});

test("the legend has the product's four items, and a chip title carries the band and the %", () => {
  assert.deepEqual(
    WORD_LEGEND.map((item) => [item.band, item.label]),
    [
      ["pass", "Đạt chuẩn (≥ 80%)"],
      ["fix", "Cần chỉnh lại (60-79%)"],
      ["fail", "Chưa đạt (< 60%)"],
      ["omit", "Bỏ sót"],
    ],
  );
  const [the, , , is, open] = SPEAKING_RESULT.words;
  assert.equal(wordTitle(the), "The: Bỏ sót");
  assert.equal(wordTitle(is), "is: Đạt chuẩn (80%)");
  assert.equal(wordTitle(open), "open: Chưa đạt (38%)");
  assert.equal(wordTitle({ text: "x", accuracy: 70, errorType: "None" }), "x: Cần chỉnh lại (70%)");
});

// ---- Nghe, Đọc, Viết ------------------------------------------------------

test("the listening question is quiz 1, question 1, answer C", () => {
  assert.equal(LISTENING_QUESTION.quizId, 1);
  assert.equal(LISTENING_QUESTION.quiz, "Listening A2 — Everyday Communication");
  assert.equal(LISTENING_QUESTION.spoken, "The dentist can see you at two thirty on Thursday afternoon.");
  assert.equal(LISTENING_QUESTION.question, "When is the appointment?");
  assert.deepEqual(LISTENING_QUESTION.options, [
    "Thursday at 3:30 P.M.",
    "Friday at 2:30 P.M.",
    "Thursday at 2:30 P.M.",
    "Wednesday at 2:00 P.M.",
  ]);
  assert.equal(LISTENING_QUESTION.correctIndex, 2);
  assert.equal(OPTION_LETTERS[LISTENING_QUESTION.correctIndex], "C");
});

test("the reading question is quiz 2, question 1, a DETAIL question with its explanation", () => {
  assert.equal(READING_QUESTION.quizId, 2);
  assert.equal(READING_QUESTION.quiz, "Reading A2 — Notices & Messages");
  assert.equal(
    READING_QUESTION.passage,
    "NOTICE: The library will close at 5 P.M. this Friday for electrical maintenance. It will reopen at 9 A.M. on Saturday.",
  );
  assert.equal(READING_QUESTION.question, "Why will the library close early?");
  assert.deepEqual(READING_QUESTION.options, [
    "For a holiday",
    "For a staff meeting",
    "For electrical maintenance",
    "For book delivery",
  ]);
  assert.equal(READING_QUESTION.correctIndex, 2);
  assert.equal(READING_QUESTION.explanation, "The notice gives electrical maintenance as the reason.");
  assert.equal(READING_QUESTION.questionType, "DETAIL");
  assert.equal(QUESTION_TYPE_LABELS[READING_QUESTION.questionType], "Chi tiết");
});

test("the writing prompt is quiz 4, an EMAIL of 100–130 words", () => {
  assert.equal(WRITING_PROMPT.quizId, 4);
  assert.equal(WRITING_PROMPT.quiz, "Writing B1 — Professional Email");
  assert.equal(WRITING_PROMPT.taskType, "EMAIL");
  assert.deepEqual(WRITING_PROMPT.wordRange, [100, 130]);
  assert.equal(
    WRITING_PROMPT.prompt,
    "Bạn đã đăng ký một workshop vào thứ Sáu nhưng không thể tham dự. Viết email 100–130 từ cho ban tổ chức để xin chuyển sang buổi thứ Hai. Nêu lý do ngắn gọn và yêu cầu xác nhận.",
  );
  assert.equal(rangeLabel(WRITING_PROMPT.wordRange), "100–130");
});

// ---- Luyện đề TOEIC: exam 2 -----------------------------------------------

test("the TOEIC exam is exam 2: 200 questions in 120 minutes, and the parts sum to 200", () => {
  assert.equal(TOEIC_EXAM.examId, 2);
  assert.equal(TOEIC_EXAM.title, "TOEIC 2 Skills: Listening & Reading — Đề luyện tập 01");
  assert.equal(TOEIC_EXAM.totalQuestions, 200);
  assert.equal(TOEIC_EXAM.durationSeconds, 7200);
  assert.equal(examMinutes(TOEIC_EXAM), 120);
  assert.deepEqual(
    TOEIC_EXAM.parts.map((p) => [p.part, p.questions]),
    [
      [1, 6],
      [2, 25],
      [3, 39],
      [4, 30],
      [5, 30],
      [6, 16],
      [7, 54],
    ],
  );
  assert.equal(
    TOEIC_EXAM.parts.reduce((sum, p) => sum + p.questions, 0),
    TOEIC_EXAM.totalQuestions,
  );
  assert.deepEqual(partsOf(TOEIC_EXAM, "listening").map((p) => p.part), [1, 2, 3, 4]);
  assert.deepEqual(partsOf(TOEIC_EXAM, "reading").map((p) => p.part), [5, 6, 7]);
  assert.equal(sectionTotal(TOEIC_EXAM, "listening"), 100);
  assert.equal(sectionTotal(TOEIC_EXAM, "reading"), 100);
  assert.ok(TOEIC_EXAM.source.includes("do BreadTrans biên soạn"));
  assert.equal(TOEIC_EXAM.pickParts, "Chọn Part muốn luyện");
});

// ---- Flashcard ------------------------------------------------------------

test("the flashcard is the first word of Daily Routines & Time", () => {
  assert.deepEqual(FLASHCARD, {
    deck: "Daily Routines & Time",
    word: "schedule",
    partOfSpeech: "noun",
    ipa: "/ˈskedʒ.uːl/",
    meaning: "lịch trình",
    example: "My schedule is quite busy on Mondays.",
    exampleVi: "Lịch trình của tôi khá bận vào thứ Hai.",
  });
});

// ---- Habit tiles ----------------------------------------------------------

test("the pet is student2's foxy, named as the app names it", () => {
  assert.deepEqual(
    { speciesId: PET.speciesId, level: PET.level, exp: PET.exp, health: PET.health, satiety: PET.satiety, happiness: PET.happiness },
    { speciesId: "foxy", level: 1, exp: 165, health: 100, satiety: 53, happiness: 100 },
  );
  const species = PET_SPECIES_LIST.find((s) => s.id === PET.speciesId);
  assert.ok(species, "foxy is a species of the app");
  assert.equal(PET.speciesName, species.speciesName);
  assert.equal(PET.speciesName, "Cáo Phim Ảnh");
  assert.equal(PET.stageName, species.stages.stage1.name);
  assert.equal(PET.stageName, "Cáo Nhí Đeo Tai Nghe");
  assert.ok(PET.level >= species.stages.stage1.minLevel && PET.level < species.stages.stage2.minLevel);
});

test("the shop shows the three real items at their prices", () => {
  assert.deepEqual(
    SHOP_ITEMS.map((item) => [item.name, item.type, item.price]),
    [
      ["Huy hiệu Ngôi Sao", "BADGE", 100],
      ["Khung avatar Cam", "AVATAR_FRAME", 180],
      ["Khiên giữ chuỗi", "BOOST", 250],
    ],
  );
  assert.deepEqual(SHOP_TYPE_LABELS, { BADGE: "Huy hiệu", AVATAR_FRAME: "Khung avatar", BOOST: "Vật phẩm hỗ trợ" });
});

test("the streak tile states the rule, with the shield at its shop price", () => {
  assert.deepEqual(STREAK_RULES, [
    "Học ít nhất một bài mỗi ngày để giữ chuỗi.",
    "Lỡ một ngày? Khiên giữ chuỗi (250 Bánh Mì) tự được dùng để chuỗi không mất.",
  ]);
  const shield = SHOP_ITEMS.find((item) => item.type === "BOOST");
  assert.ok(shield && STREAK_RULES[1].includes(`(${shield.price} Bánh Mì)`));
});

test("the week runs T2 to CN and today is found from Monday", () => {
  assert.deepEqual(WEEK_DAYS, ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]);
  // 23/11/2026 is a Monday, 29/11/2026 a Sunday.
  assert.equal(weekdayIndex(new Date(2026, 10, 23)), 0);
  assert.equal(weekdayIndex(new Date(2026, 10, 26)), 3);
  assert.equal(weekdayIndex(new Date(2026, 10, 29)), 6);
});

test("the arena tile shows the real duel format with two initials and no stakes", () => {
  assert.equal(ARENA_DUEL.title, "Song Đấu Từ Vựng");
  assert.equal(ARENA_DUEL.summary, "Ghép trận với một học viên khác, trả lời 10 câu từ vựng, 12 giây mỗi câu.");
  assert.equal(ARENA_DUEL.questions, 10);
  assert.equal(ARENA_DUEL.secondsPerQuestion, 12);
  assert.equal(ARENA_DUEL.format, "1 đấu 1");
  assert.deepEqual(ARENA_DUEL.players, [
    { initial: "B", label: "Bạn" },
    { initial: "H", label: "Học viên" },
  ]);
  // The summary is the arena's own sentence, cut before the part about the stakes.
  const hero = fs.readFileSync(path.join(SRC, "modules/arena/components/ArenaHero.tsx"), "utf8");
  assert.ok(hero.replace(/\s+/g, " ").includes(ARENA_DUEL.summary), "ArenaHero says the same");
});

test("the leaderboard lists the three test accounts, ordered by points", () => {
  assert.deepEqual(
    LEADERBOARD.map((row) => [row.name, row.points, row.tier]),
    [
      ["Học viên BreadTrans 2", 1505, "Bạch Kim"],
      ["Học viên BreadTrans 3", 878, "Kim Cương"],
      ["Học viên BreadTrans 1", 125, "Vàng"],
    ],
  );
  for (const row of LEADERBOARD) assert.match(row.name, /^Học viên BreadTrans \d$/, "test accounts only");
  const shuffled = [LEADERBOARD[2], LEADERBOARD[0], LEADERBOARD[1]];
  assert.deepEqual(
    rankByPoints(shuffled).map((row) => [row.rank, row.name]),
    [
      [1, "Học viên BreadTrans 2"],
      [2, "Học viên BreadTrans 3"],
      [3, "Học viên BreadTrans 1"],
    ],
  );
  assert.equal(formatThousands(1505), "1.505");
  assert.equal(formatThousands(878), "878");
  assert.equal(formatThousands(1234567), "1.234.567");
});

// ---- Every string -----------------------------------------------------------

test("no fragment speaks of stakes, another certificate, an official score or a CEFR level", () => {
  const strings = JSON.stringify([
    SPEAKING_RESULT,
    WORD_LEGEND,
    LISTENING_QUESTION,
    READING_QUESTION,
    WRITING_PROMPT,
    TOEIC_EXAM,
    FLASHCARD,
    PET,
    SHOP_ITEMS,
    SHOP_TYPE_LABELS,
    STREAK_RULES,
    ARENA_DUEL,
    LEADERBOARD,
  ]);
  assert.doesNotMatch(strings, /cược|cá độ|đặt cửa/i);
  assert.doesNotMatch(strings, /IELTS|VSTEP|TOEFL|Cambridge/i);
  assert.doesNotMatch(strings, /\bETS\b|CEFR|chứng chỉ|điểm thi/);
});
