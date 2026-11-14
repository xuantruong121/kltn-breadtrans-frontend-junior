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

test("Writing Card State Machine: spotlight does not imply learner progress", () => {
  const status = computeWritingCardStatus({
    isAuthenticated: true,
    isCompleted: false,
    isSpotlight: true,
  });
  assert.equal(status, "NOT_STARTED");
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

  const shortMessageItem: WritingTopicItem = {
    id: 5,
    topicName: "Writing A2 Messages",
    type: "WRITING_EMAIL",
    taskType: "SHORT_MESSAGE",
  };
  assert.equal(resolveWritingFormatTag(shortMessageItem), "Tin nhắn ngắn");
  assert.equal(resolveWritingPedagogicalDescription(shortMessageItem).includes("phàn nàn"), false);

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

// Owner 2026-11-14: sentence translation sits on WRITING_PICTURE but is its own format.
test("a sentence translation exercise reads as Dịch câu, not a picture task", () => {
  const item: WritingTopicItem = {
    id: 91,
    title: "Dịch câu: Gia đình (A1)",
    type: "WRITING_PICTURE",
    taskType: "SENTENCE_TRANSLATION",
  };
  assert.equal(resolveWritingFormatTag(item), "Dịch câu");
  assert.match(resolveWritingPedagogicalDescription(item), /tiếng Việt sang tiếng Anh/);
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

// Owner 2026-11-13: the Writing header showed "SHORT_MESSAGE". Every task
// type stored today, and every Writing quiz type, reads as Vietnamese.
test("resolveWritingFormatTag never returns a stored code", () => {
  const taskTypes = [
    "EMAIL", "WRITTEN_REQUEST", "SHORT_MESSAGE", "PROPOSAL", "OPINION_ESSAY", "OPINION",
    "SENTENCE", "ANALYTICAL_RESPONSE", "INVITATION", "INFORMATION_REQUEST", "REQUEST",
    "ARGUMENT", "CUSTOMER_EMAIL", "STATUS_UPDATE", "MEETING_FOLLOWUP", "THANK_YOU",
    "PICTURE_SENTENCE", "SENTENCE_TRANSLATION", "",
  ];
  const types = ["WRITING_EMAIL", "WRITING_PICTURE", "WRITING_OPINION", "WRITING_SENTENCE", ""];
  for (const taskType of taskTypes) {
    for (const type of types) {
      const label = resolveWritingFormatTag({ id: 1, title: "Bài viết", taskType, type } as unknown as WritingTopicItem);
      assert.doesNotMatch(label, /_/, `${type}/${taskType} -> ${label}`);
      assert.notEqual(label, label.toUpperCase(), `${type}/${taskType} -> ${label}`);
    }
  }
});
