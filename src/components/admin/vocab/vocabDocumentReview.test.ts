import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  chosenWordCount,
  decksToCreate,
  toReviewDecks,
} from "./vocabDocumentReview.ts";

const word = (name: string) => ({
  word: name,
  pos: "noun",
  meaning: "nghĩa",
  exampleEn: "",
  exampleVi: "",
  known: false,
});

describe("vocab document review", () => {
  it("starts with every deck and word chosen", () => {
    const [deck] = toReviewDecks([{ title: "A", words: [word("x")] }]);
    assert.equal(deck.chosen, true);
    assert.equal(deck.words[0].chosen, true);
  });

  it("creates only chosen decks with chosen words", () => {
    const decks = toReviewDecks([
      { title: "A", words: [word("x"), word("y")] },
      { title: "B", words: [word("z")] },
    ]);
    decks[0].words[1].chosen = false;
    decks[1].chosen = false;
    assert.deepEqual(
      decksToCreate(decks).map((deck) => deck.words.map((row) => row.word)),
      [["x"]],
    );
    assert.equal(chosenWordCount(decks), 1);
  });

  it("skips a deck left without a name or words", () => {
    const decks = toReviewDecks([
      { title: " ", words: [word("x")] },
      { title: "B", words: [word("y")] },
    ]);
    decks[1].words[0].chosen = false;
    assert.deepEqual(decksToCreate(decks), []);
  });
});
