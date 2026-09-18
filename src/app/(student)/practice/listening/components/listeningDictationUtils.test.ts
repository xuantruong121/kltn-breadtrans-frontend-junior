import assert from "node:assert/strict";
import test from "node:test";
import { diffDictationAnswer, normalizeDictationText } from "./listeningDictationUtils.ts";

test("normalizes whitespace and curly apostrophes", () => {
  assert.equal(normalizeDictationText("  Don’t   worry! "), "don't worry!");
});

test("returns useful missing and extra word feedback", () => {
  assert.deepEqual(
    diffDictationAnswer("The price per pint has tripled", "The price for pint has triple"),
    [
      { kind: "same", text: "the" },
      { kind: "same", text: "price" },
      { kind: "extra", text: "for" },
      { kind: "missing", text: "per" },
      { kind: "same", text: "pint" },
      { kind: "same", text: "has" },
      { kind: "extra", text: "triple" },
      { kind: "missing", text: "tripled" },
    ],
  );
});
