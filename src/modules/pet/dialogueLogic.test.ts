import test from "node:test";
import assert from "node:assert/strict";
import {
  resolvePetDialogue,
  POKE_MESSAGES,
  HUNGRY_MESSAGES,
} from "./dialogueLogic.ts";

test("Pet Dialogue State: POKE / ON_CLICK rotates message and takes precedence", () => {
  const dialogue0 = resolvePetDialogue({
    petName: "Bready",
    forcePoke: true,
    pokeMessageIndex: 0,
    satiety: 10, // Even if hungry, forcePoke takes precedence
  });
  assert.equal(dialogue0?.kind, "ON_CLICK");
  assert.equal(dialogue0?.text, POKE_MESSAGES[0]);
  assert.ok(dialogue0?.header.includes("Bready"));

  const dialogue1 = resolvePetDialogue({
    forcePoke: true,
    pokeMessageIndex: 1,
  });
  assert.equal(dialogue1?.text, POKE_MESSAGES[1]);

  const dialogue2 = resolvePetDialogue({
    forcePoke: true,
    pokeMessageIndex: 2,
  });
  assert.equal(dialogue2?.text, POKE_MESSAGES[2]);
});

test("Pet Dialogue State: HUNGRY triggers when satiety < 30% or idle > 3 minutes", () => {
  // Satiety < 30
  const hungryDialogue = resolvePetDialogue({
    petName: "Bready",
    satiety: 25,
  });
  assert.equal(hungryDialogue?.kind, "HUNGRY");
  assert.ok(hungryDialogue?.header.includes("Đang đói"));
  assert.ok(hungryDialogue?.text.includes("Bánh Mì"));

  // Very hungry (satiety < 20) uses second hungry line
  const veryHungry = resolvePetDialogue({
    satiety: 15,
  });
  assert.equal(veryHungry?.text, HUNGRY_MESSAGES[1]);

  // Idle for 180,000ms (3 mins) with non-full belly
  const idleDialogue = resolvePetDialogue({
    satiety: 50,
    idleDurationMs: 190_000,
  });
  assert.equal(idleDialogue?.kind, "HUNGRY");
});

test("Pet Dialogue State: STREAK_NUDGE triggers when streak > 0 and streak at risk", () => {
  const streakDialogue = resolvePetDialogue({
    petName: "Bready",
    satiety: 80,
    streak: 5,
    isStreakAtRisk: true,
  });
  assert.equal(streakDialogue?.kind, "STREAK_NUDGE");
  assert.ok(streakDialogue?.text.includes("5 ngày"));
  assert.ok(streakDialogue?.header.includes("Streak"));
});

test("Pet Dialogue State: GOAL_PROGRESS triggers when daily progress is in flight", () => {
  const goalDialogue = resolvePetDialogue({
    petName: "Bready",
    satiety: 80,
    completedQuestsCount: 2,
    totalQuestsCount: 4,
  });
  assert.equal(goalDialogue?.kind, "GOAL_PROGRESS");
  assert.ok(goalDialogue?.text.includes("2/4 bài rồi"));
});
