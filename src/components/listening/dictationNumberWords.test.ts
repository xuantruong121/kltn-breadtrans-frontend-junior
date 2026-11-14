import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { normalizeNumberTokens } from "./dictationNumberWords.ts";
import { calculateProgressiveDictationFeedback } from "./listeningDictationUtils.ts";

// Owner 2026-11-13: "nine to eleven" typed as "9 to 11" must count. The same
// cases run on the server (listening-number-words.spec.ts).
const SAME: Array<[string, string]> = [
  ["from nine to eleven", "from 9 to 11"],
  ["it opens at eight forty-five", "it opens at 8:45"],
  ["I will arrive at eight thirty", "I will arrive at 8:30"],
  ["about a ten-minute walk", "about a 10-minute walk"],
  ["get off after the second stop", "get off after the 2nd stop"],
  ["the twenty first floor", "the 21st floor"],
  ["twenty five people", "25 people"],
  ["one hundred and five", "105"],
  ["a hundred students", "100 students"],
  ["one thousand", "1,000"],
  ["two thousand three hundred", "2300"],
  ["platform three at eight fifteen", "platform 3 at 8:15"],
  ["before two o’clock", "before 2 o’clock"],
];

const DIFFERENT: Array<[string, string]> = [
  ["nine", "19"],
  ["eight thirty", "830"],
  ["nineteen ninety", "1990"],
];

describe("dictation numbers", () => {
  for (const [said, typed] of SAME) {
    test(`"${said}" and "${typed}" read the same`, () => {
      assert.equal(calculateProgressiveDictationFeedback(said, typed).isCorrect, true);
    });
  }

  for (const [said, typed] of DIFFERENT) {
    test(`"${said}" and "${typed}" stay different`, () => {
      assert.equal(calculateProgressiveDictationFeedback(said, typed).isCorrect, false);
    });
  }

  test("joins only runs that read as one number", () => {
    assert.deepEqual(normalizeNumberTokens(["eight", "forty", "five", "and", "one"]), ["8", "45", "and", "1"]);
    assert.deepEqual(normalizeNumberTokens(["a", "second"]), ["a", "2nd"]);
    assert.deepEqual(normalizeNumberTokens(["zero", "one"]), ["0", "1"]);
  });

  test("the verified prefix runs through a number written in digits", () => {
    const f = calculateProgressiveDictationFeedback(
      "We need twenty five copies for the group.",
      "We need 25 copies for a",
    );
    assert.equal(f.isCorrect, false);
    assert.equal(f.verifiedPrefix, "We need twenty five copies for");
    assert.equal(f.nextWord, "the");
  });

  test("the word to fix comes without the punctuation around it, the rest stays masked", () => {
    const f = calculateProgressiveDictationFeedback(
      "Sounds good. Did you bring the reading passage for tomorrow?",
      "Sounds good. Did you",
    );
    assert.equal(f.verifiedPrefix, "Sounds good. Did you");
    assert.equal(f.nextWord, "bring");
    assert.doesNotMatch(f.remainingMasks.join(" "), /[a-z]/i);
    assert.equal(
      calculateProgressiveDictationFeedback("Did you bring the reading passage?", "Did you bring the reading").nextWord,
      "passage",
    );
  });
});
