import { strict as assert } from "node:assert";
import test from "node:test";
import {
  formatSkillDimension,
  skillScoreLabel,
  skillStatusLabel,
} from "./userSkillProgressLogic.ts";

test("cross-skill zero state never presents a missing score as failure", () => {
  const skill = {
    skill: "LISTENING" as const,
    title: "Listening",
    categoryLabel: "Nghe hiểu",
    totalItems: 0,
    completedItems: 0,
    progressPercent: 0,
    levelRange: "A1 - C1",
    badge: "Nghe chủ động",
    unitLabel: "bài",
    normalizedScore: null,
    statusLabel: "Chưa đủ dữ liệu",
  };

  assert.equal(skillScoreLabel(skill), "Chưa đủ dữ liệu");
  assert.equal(skillStatusLabel(skill), "Chưa đủ dữ liệu");
});

test("cross-skill score and status use the server-provided values", () => {
  const skill = {
    skill: "SPEAKING" as const,
    title: "Speaking",
    categoryLabel: "Nói",
    totalItems: 8,
    completedItems: 3,
    progressPercent: 38,
    levelRange: "A1 - C1",
    badge: "Phản hồi",
    unitLabel: "bài luyện",
    normalizedScore: 82,
    statusLabel: "Đang tiến bộ",
  };

  assert.equal(skillScoreLabel(skill), "82/100");
  assert.equal(skillStatusLabel(skill), "Đang tiến bộ");
});

test("formatSkillDimension converts raw technical keys to friendly Vietnamese", () => {
  assert.equal(formatSkillDimension("accuracyScore"), "Độ chính xác");
  assert.equal(formatSkillDimension("fluencyScore"), "Độ lưu loát");
  assert.equal(formatSkillDimension("MULTIPLE_CHOICE"), "Trắc nghiệm");
  assert.equal(formatSkillDimension("DICTATION"), "Chép chính tả");
  assert.equal(formatSkillDimension("DETAIL"), "Chi tiết");
  assert.equal(formatSkillDimension(""), "");
  assert.equal(formatSkillDimension(null), "");
});
