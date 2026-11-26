import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  IDLE_LIMIT_MS,
  TICK_SEC,
  formatStudyTime,
  reportChunks,
  studySkillFor,
  tickCredit,
} from "./studyTime.ts";

describe("studySkillFor", () => {
  it("names the skill of each practice room", () => {
    assert.equal(studySkillFor("/listening/1", false), "LISTENING");
    assert.equal(studySkillFor("/reading/2", false), "READING");
    assert.equal(studySkillFor("/writing/4", false), "WRITING");
    assert.equal(studySkillFor("/speaking/practice-describe-picture-b1", false), "SPEAKING");
    assert.equal(studySkillFor("/flashcard/1", false), "VOCAB");
    assert.equal(studySkillFor("/vocabulary/study", false), "VOCAB");
    assert.equal(studySkillFor("/toeic/attempts/42", false), "EXAM");
    assert.equal(studySkillFor("/gate/listening", false), "LISTENING");
  });

  it("counts the entry assessment and grammar only while they are being answered", () => {
    assert.equal(studySkillFor("/diagnostic", true), "DIAGNOSTIC");
    assert.equal(studySkillFor("/diagnostic", false), null);
    assert.equal(studySkillFor("/reading", true), "GRAMMAR");
    assert.equal(studySkillFor("/reading", false), null);
  });

  it("does not count catalogs, results or the dashboard", () => {
    assert.equal(studySkillFor("/dashboard", false), null);
    assert.equal(studySkillFor("/listening", false), null);
    assert.equal(studySkillFor("/listening/submissions/219", false), null);
    assert.equal(studySkillFor("/toeic/results/42", false), null);
  });
});

describe("tickCredit", () => {
  it("counts a check while the page is in view and the learner acted lately", () => {
    assert.equal(tickCredit({ visible: true, idleMs: 5_000, mediaPlaying: false }), TICK_SEC);
  });

  it("keeps counting while audio plays, even without input", () => {
    assert.equal(tickCredit({ visible: true, idleMs: IDLE_LIMIT_MS * 3, mediaPlaying: true }), TICK_SEC);
  });

  it("stops when the learner stepped away or the tab is hidden", () => {
    assert.equal(tickCredit({ visible: true, idleMs: IDLE_LIMIT_MS, mediaPlaying: false }), 0);
    assert.equal(tickCredit({ visible: false, idleMs: 0, mediaPlaying: true }), 0);
  });
});

describe("reportChunks and formatStudyTime", () => {
  it("splits pending seconds into reports of two minutes at most", () => {
    assert.deepEqual(reportChunks(0), []);
    assert.deepEqual(reportChunks(75), [75]);
    assert.deepEqual(reportChunks(300), [120, 120, 60]);
  });

  it("reads like a duration", () => {
    assert.equal(formatStudyTime(0), "0 phút");
    assert.equal(formatStudyTime(30), "dưới 1 phút");
    assert.equal(formatStudyTime(25 * 60 + 40), "25 phút");
    assert.equal(formatStudyTime(3600), "1 giờ");
    assert.equal(formatStudyTime(2 * 3600 + 5 * 60), "2 giờ 5 phút");
  });
});
