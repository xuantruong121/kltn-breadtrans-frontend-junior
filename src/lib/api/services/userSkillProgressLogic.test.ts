import { strict as assert } from "node:assert";
import test from "node:test";
import { skillScoreLabel, skillStatusLabel } from "./userSkillProgressLogic.ts";

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
    unitLabel: "lượt luyện",
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
    totalItems: 0,
    completedItems: 3,
    progressPercent: 100,
    levelRange: "A1 - C1",
    badge: "Phản hồi",
    unitLabel: "lượt luyện",
    normalizedScore: 82,
    statusLabel: "Đang tiến bộ",
  };

  assert.equal(skillScoreLabel(skill), "82/100");
  assert.equal(skillStatusLabel(skill), "Đang tiến bộ");
});
