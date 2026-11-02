/** Review state of the decks the AI suggests from a document. No I/O. */
export type ReviewWord = {
  word: string;
  pos: string;
  meaning: string;
  exampleEn: string;
  exampleVi: string;
  known: boolean;
  chosen: boolean;
};

export type ReviewDeck = {
  title: string;
  description: string;
  chosen: boolean;
  words: ReviewWord[];
};

type SuggestedDeck = {
  title: string;
  description?: string;
  words: Array<Omit<ReviewWord, "chosen">>;
};

export const toReviewDecks = (decks: SuggestedDeck[]): ReviewDeck[] =>
  decks.map((deck) => ({
    title: deck.title,
    description: deck.description ?? "",
    chosen: true,
    words: deck.words.map((word) => ({ ...word, chosen: true })),
  }));

/** Decks to create: a chosen deck with a name and at least one chosen word. */
export const decksToCreate = (decks: ReviewDeck[]) =>
  decks
    .filter((deck) => deck.chosen && deck.title.trim())
    .map((deck) => ({
      ...deck,
      words: deck.words.filter((word) => word.chosen),
    }))
    .filter((deck) => deck.words.length > 0);

export const chosenWordCount = (decks: ReviewDeck[]) =>
  decksToCreate(decks).reduce((total, deck) => total + deck.words.length, 0);
