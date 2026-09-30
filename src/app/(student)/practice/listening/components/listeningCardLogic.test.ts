import test from "node:test";
import assert from "node:assert/strict";
import {
  computeListeningCardStatus,
  matchesListeningDifficulty,
  resolveListeningFormatTag,
  resolveListeningPedagogicalDescription,
  resolveListeningSkillTags,
} from "./listeningCardLogic.ts";
import type { ListeningPracticeCatalogItem } from "@/lib/api/services/quiz.service";

test("Listening Card State Machine: accurately detects COMPLETED state", () => {
  const status = computeListeningCardStatus({
    isAuthenticated: true,
    isCompleted: true,
  });
  assert.equal(status, "COMPLETED");
});

test("Listening Card State Machine: accurately detects IN_PROGRESS spotlight state", () => {
  const status = computeListeningCardStatus({
    isAuthenticated: true,
    isCompleted: false,
    isSpotlight: true,
  });
  assert.equal(status, "IN_PROGRESS");
});

test("Listening Card State Machine: accurately detects NOT_STARTED state", () => {
  const status = computeListeningCardStatus({
    isAuthenticated: true,
    isCompleted: false,
    isSpotlight: false,
  });
  assert.equal(status, "NOT_STARTED");
});

test("Listening Card State Machine: accurately detects LOCKED state for unauthenticated guests", () => {
  const status = computeListeningCardStatus({
    isAuthenticated: false,
    isCompleted: false,
  });
  assert.equal(status, "LOCKED");
});

test("Listening Format Tag: resolves topic format accurately", () => {
  const dictationItem: ListeningPracticeCatalogItem = {
    id: 1,
    title: "Chép chính tả hội thoại công sở",
    description: null,
    mode: "DICTATION",
  };
  assert.equal(resolveListeningFormatTag(dictationItem), "Chép chính tả");

  const part1Item: ListeningPracticeCatalogItem = {
    id: 2,
    title: "TOEIC Part 1 — Mô tả tranh văn phòng",
    description: null,
    mode: "COMPREHENSION",
  };
  assert.equal(resolveListeningFormatTag(part1Item), "Mô tả tranh");

  const part2Item: ListeningPracticeCatalogItem = {
    id: 3,
    title: "TOEIC Part 2 — Hỏi đáp thông tin lịch trình",
    description: null,
    mode: "COMPREHENSION",
  };
  assert.equal(resolveListeningFormatTag(part2Item), "Hỏi - Đáp");

  const part3Item: ListeningPracticeCatalogItem = {
    id: 4,
    title: "TOEIC Part 3 — Hội thoại đặt phòng khách sạn",
    description: null,
    mode: "DIALOGUE",
  };
  assert.equal(resolveListeningFormatTag(part3Item), "Hội thoại ngắn");

  const part4Item: ListeningPracticeCatalogItem = {
    id: 5,
    title: "TOEIC Part 4 — Bài nói chuyện thông báo sân bay",
    description: null,
    mode: "COMPREHENSION",
  };
  assert.equal(resolveListeningFormatTag(part4Item), "Bài nói chuyện");
});

test("Listening Pedagogical Description & Skill Tags: prevents transcript leakage", () => {
  const rawTranscript = "The flight to Chicago is delayed by thirty minutes due to weather.";
  const item: ListeningPracticeCatalogItem = {
    id: 6,
    title: "TOEIC Part 4 — Airport Announcement",
    description: rawTranscript,
    mode: "COMPREHENSION",
    accents: ["US"],
  };

  const desc = resolveListeningPedagogicalDescription(item);
  assert.equal(desc.includes(rawTranscript), false);
  assert.equal(desc.includes("delayed by thirty minutes"), false);
  assert.ok(desc.length > 20);

  const tags = resolveListeningSkillTags(item);
  assert.ok(tags.length >= 1 && tags.length <= 2);
  assert.equal(tags.includes("Chicago"), false);
});

test("Listening Difficulty Matching: accommodates composite & CEFR levels", () => {
  assert.equal(matchesListeningDifficulty("A1 - A2", "BASIC"), true);
  assert.equal(matchesListeningDifficulty("B1 Intermediate", "INTERMEDIATE"), true);
  assert.equal(matchesListeningDifficulty("C1 Advanced", "ADVANCED"), true);
  assert.equal(matchesListeningDifficulty("C1 Advanced", "BASIC"), false);
});
