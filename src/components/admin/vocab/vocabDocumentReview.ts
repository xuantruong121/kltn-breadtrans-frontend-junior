/** Review state of the decks the AI suggests from a document. No I/O. */
export type ReviewWord = {
  word: string;
  pos: string;
  meaning: string;
  /** From the AI; a deck is published only when every word has it. */
  ipaUs?: string;
  exampleEn: string;
  exampleVi: string;
  known: boolean;
  chosen: boolean;
};

export type ReviewDeck = {
  title: string;
  description: string;
  /** The practice level the AI proposed (STARTER … ADVANCED), or "" for none; the admin may change it. */
  level: string;
  chosen: boolean;
  words: ReviewWord[];
};

type SuggestedDeck = {
  title: string;
  description?: string;
  level?: string | null;
  words: Array<Omit<ReviewWord, "chosen">>;
};

/** The four practice levels (owner 2026-11-27). */
const DECK_LEVELS: readonly string[] = ["STARTER", "BASIC", "INTERMEDIATE", "ADVANCED"];

/** The deck's level kept from the AI (owner 2026-11-25: it was dropped), when it is a CMS level. */
export const deckLevel = (level: string | null | undefined) => {
  const code = String(level ?? "").trim().toUpperCase();
  return DECK_LEVELS.includes(code) ? code : "";
};

export const toReviewDecks = (decks: SuggestedDeck[]): ReviewDeck[] =>
  decks.map((deck) => ({
    title: deck.title,
    description: deck.description ?? "",
    level: deckLevel(deck.level),
    chosen: true,
    words: deck.words.map((word) => ({ ...word, chosen: true })),
  }));

/** A deck needs 4 different meanings for its quiz step before it can be published. */
export const DECK_MIN_WORDS = 4;

/** A chosen deck with fewer chosen words than that: created, but not publishable as it is. */
export const deckTooSmall = (deck: ReviewDeck) =>
  deck.chosen && deck.words.filter((word) => word.chosen).length < DECK_MIN_WORDS;

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
