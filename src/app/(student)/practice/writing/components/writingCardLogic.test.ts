import test from "node:test";
import assert from "node:assert/strict";
import {
  computeWritingCardStatus,
  matchesWritingDifficulty,
  resolveWritingFormatTag,
  resolveWritingPedagogicalDescription,
  resolveWritingSkillTags,
} from "./writingCardLogic.ts";
import type { WritingTopicItem } from "./WritingTopicCard.tsx";

test("Writing Card State Machine: accurately detects COMPLETED state", () => {
  const status = computeWritingCardStatus({
    isAuthenticated: true,
    isCompleted: true,
  });
  assert.equal(status, "COMPLETED");
});

test("Writing Card State Machine: accurately detects IN_PROGRESS spotlight state", () => {
  const status = computeWritingCardStatus({
    isAuthenticated: true,
    isCompleted: false,
    isSpotlight: true,
  });
  assert.equal(status, "IN_PROGRESS");
});

test("Writing Card State Machine: accurately detects NOT_STARTED state", () => {
  const status = computeWritingCardStatus({
    isAuthenticated: true,
    isCompleted: false,
    isSpotlight: false,
  });
  assert.equal(status, "NOT_STARTED");
});

test("Writing Card State Machine: accurately detects LOCKED state for guests", () => {
  const status = computeWritingCardStatus({
    isAuthenticated: false,
    isCompleted: false,
  });
  assert.equal(status, "LOCKED");
});

test("Writing Format Tag: resolves topic format accurately", () => {
  const pictureItem: WritingTopicItem = {
    id: 1,
    topicName: "Viết câu theo tranh công viên",
    type: "WRITING_PICTURE",
  };
  assert.equal(resolveWritingFormatTag(pictureItem), "Viết theo tranh");

  const emailItem: WritingTopicItem = {
    id: 2,
    topicName: "Soạn email phản hồi khách hàng",
    type: "WRITING_EMAIL",
  };
  assert.equal(resolveWritingFormatTag(emailItem), "Phản hồi Email");

  const opinionItem: WritingTopicItem = {
    id: 3,
    topicName: "Viết luận quan điểm làm việc từ xa",
    taskType: "WRITING_OPINION",
  };
  assert.equal(resolveWritingFormatTag(opinionItem), "Viết luận quan điểm");

  const sharedEmailEnumOpinionItem: WritingTopicItem = {
    id: 4,
    topicName: "Writing Opinion",
    type: "WRITING_EMAIL",
    taskType: "OPINION",
  };
  assert.equal(
    resolveWritingFormatTag(sharedEmailEnumOpinionItem),
    "Viết luận quan điểm",
  );
});

test("Writing Pedagogical Description: prevents prompt leakage", () => {
  const secretPrompt = "Write a 150-word email apologizing to Mr. Henderson for late delivery.";
  const item: WritingTopicItem = {
    id: 4,
    topicName: "Customer Complaint Response",
    type: "WRITING_EMAIL",
    description: secretPrompt,
  };

  const desc = resolveWritingPedagogicalDescription(item);
  assert.equal(desc.includes(secretPrompt), false);
  assert.equal(desc.includes("Mr. Henderson"), false);
  assert.ok(desc.length > 20);

  const tags = resolveWritingSkillTags(item);
  assert.ok(tags.length >= 1);
  assert.equal(tags.includes("Henderson"), false);
});

test("Writing Difficulty Matching: accommodates various levels", () => {
  assert.equal(matchesWritingDifficulty("Cơ bản A2", "BASIC"), true);
  assert.equal(matchesWritingDifficulty("Trung cấp B1", "INTERMEDIATE"), true);
  assert.equal(matchesWritingDifficulty("Nâng cao C1", "ADVANCED"), true);
  assert.equal(matchesWritingDifficulty("Nâng cao", "BASIC"), false);
});
