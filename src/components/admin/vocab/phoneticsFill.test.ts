import assert from "node:assert/strict";
import test from "node:test";

import { bulkPhonetics, fillFromPhonetics, type PhoneticsAnswer, type PhoneticsFields } from "./phoneticsFill.ts";

const answer = (over: Partial<PhoneticsAnswer> = {}): PhoneticsAnswer => ({
  found: true,
  unavailable: false,
  ipaUs: "/fɑɹ/",
  ipaUk: "/fɑː/",
  usIsShared: false,
  ukIsShared: false,
  audioUs: null,
  audioUk: null,
  ...over,
});
const empty: PhoneticsFields = { ipaUs: "", ipaUk: "", audioUs: "", audioUk: "" };

test("both boxes empty: both are filled and the message says US và UK", () => {
  const out = fillFromPhonetics(empty, answer());
  assert.equal(out.next.ipaUs, "/fɑɹ/");
  assert.equal(out.next.ipaUk, "/fɑː/");
  assert.equal(out.kind, "success");
  assert.match(out.message, /^Đã điền phiên âm US và UK\./);
});

test("allegation: US typed, UK empty: only UK is filled, and the typed US is kept", () => {
  const out = fillFromPhonetics(
    { ...empty, ipaUs: "/ˌælɪˈɡeɪʃn/" },
    answer({ ipaUs: "/ˌæl.əˈɡeɪ.ʃən/", ipaUk: "/ˌæl.əˈɡeɪ.ʃən/", ukIsShared: true }),
  );
  assert.equal(out.next.ipaUs, "/ˌælɪˈɡeɪʃn/");
  assert.equal(out.next.ipaUk, "/ˌæl.əˈɡeɪ.ʃən/");
  assert.match(out.message, /^Đã điền phiên âm UK\./);
});

test("a phonetics the AI suggested (the dictionary did not answer in time) is said so", () => {
  const ai = fillFromPhonetics(empty, answer({ source: "AI" }));
  assert.match(ai.message, /do AI gợi ý: kiểm lại trước khi lưu\./);
  assert.doesNotMatch(fillFromPhonetics(empty, answer({ source: "DICTIONARY" })).message, /AI gợi ý/);
  // Nothing was filled, so there is nothing to check.
  const full: PhoneticsFields = { ipaUs: "/a/", ipaUk: "/b/", audioUs: "u", audioUk: "k" };
  assert.doesNotMatch(fillFromPhonetics(full, answer({ source: "AI" })).message, /AI gợi ý/);
});

test("a general phonetics used for UK is said so, so the admin checks it", () => {
  const out = fillFromPhonetics(empty, answer({ ukIsShared: true, ipaUk: "/fɑɹ/" }));
  assert.match(out.message, /một phiên âm chung, đã dùng cho UK: kiểm lại trước khi lưu\./);
  assert.doesNotMatch(out.message, /cho US/);
});

test("a general phonetics used for both says both", () => {
  const out = fillFromPhonetics(empty, answer({ usIsShared: true, ukIsShared: true, ipaUk: "/fɑɹ/" }));
  assert.match(out.message, /đã dùng cho US và UK/);
});

test("a shared phonetics for a box that was not filled is not mentioned", () => {
  const out = fillFromPhonetics({ ...empty, ipaUk: "/x/" }, answer({ ukIsShared: true }));
  assert.equal(out.next.ipaUk, "/x/");
  assert.doesNotMatch(out.message, /chung/);
});

test("nothing new to fill is said as information, not as 'Đã điền'", () => {
  const full: PhoneticsFields = { ipaUs: "/a/", ipaUk: "/b/", audioUs: "u", audioUk: "k" };
  const out = fillFromPhonetics(full, answer());
  assert.deepEqual(out.next, full);
  assert.equal(out.kind, "info");
  assert.doesNotMatch(out.message, /Đã điền/);
  assert.match(out.message, /US \/fɑɹ\/, UK \/fɑː\/\. Các ô đã có chữ nên giữ nguyên\./);
});

test("audio the dictionary gives is filled into empty boxes only", () => {
  const out = fillFromPhonetics(
    { ...empty, audioUk: "keep.mp3" },
    answer({ audioUs: "https://m/us.mp3", audioUk: "https://m/uk.mp3" }),
  );
  assert.equal(out.next.audioUs, "https://m/us.mp3");
  assert.equal(out.next.audioUk, "keep.mp3");
  assert.match(out.message, /Đã điền cả audio\./);
});

test("no usable audio is said, once, only when the boxes have none either", () => {
  assert.match(fillFromPhonetics(empty, answer()).message, /không có audio dùng được/);
  assert.doesNotMatch(
    fillFromPhonetics({ ...empty, audioUs: "u.mp3" }, answer()).message,
    /audio/,
  );
});

test("a word the dictionary does not know is an error that points to the AI button", () => {
  const out = fillFromPhonetics(empty, answer({ found: false, ipaUs: null, ipaUk: null }));
  assert.equal(out.kind, "error");
  assert.deepEqual(out.next, empty);
  assert.match(out.message, /chưa có phiên âm cho từ này/);
});

test("a dictionary that did not answer is not reported as 'no phonetics'", () => {
  const out = fillFromPhonetics(empty, answer({ found: false, unavailable: true, ipaUs: null, ipaUk: null }));
  assert.equal(out.kind, "error");
  assert.match(out.message, /Chưa tra được từ điển lúc này/);
  assert.doesNotMatch(out.message, /chưa có phiên âm/);
});

test("the bulk fill takes trimmed phonetics, and none from a missing or failed answer", () => {
  assert.deepEqual(bulkPhonetics(answer({ ipaUs: " /a/ ", ipaUk: null })), { ipaUs: "/a/", ipaUk: "" });
  assert.deepEqual(bulkPhonetics(answer({ found: false })), { ipaUs: "", ipaUk: "" });
  assert.deepEqual(bulkPhonetics(answer({ unavailable: true })), { ipaUs: "", ipaUk: "" });
  assert.deepEqual(bulkPhonetics(null), { ipaUs: "", ipaUk: "" });
});
