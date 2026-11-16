/**
 * The learner's saved words (owner 2026-11-16): search, order, whether a
 * flashcard's word is saved, and the quick flip-card review on the saved
 * page. The review is local only; it never touches the SRS schedule.
 * Pure: no React, no network.
 */
import type { SavedWord } from "../api/services/vocab.service.ts";

export type SavedWordSort = "newest" | "az";

/** Lower case without Vietnamese marks, so "nghia" finds "nghĩa". */
export const foldText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

/** Words whose word, dictionary form or meaning contains the query. */
export function filterSavedWords(words: SavedWord[], query: string): SavedWord[] {
  const q = foldText(query);
  if (!q) return words;
  return words.filter((w) =>
    [w.word, w.canonicalWord, w.meaning, w.definitionEn ?? ""].some((field) => foldText(field).includes(q)),
  );
}

export function sortSavedWords(words: SavedWord[], sort: SavedWordSort): SavedWord[] {
  const out = [...words];
  if (sort === "az") out.sort((a, b) => a.word.localeCompare(b.word, "en", { sensitivity: "base" }));
  else out.sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt) || b.id - a.id);
  return out;
}

/** The saved row for a word, matched on the dictionary form or as saved. */
export function findSavedWord(words: SavedWord[], word: string): SavedWord | undefined {
  const key = word.trim().toLowerCase();
  if (!key) return undefined;
  return words.find((w) => w.canonicalWord?.toLowerCase() === key || w.word.toLowerCase() === key);
}

// ------------------------------------------------------------------ review

export type ReviewState = {
  /** Word ids in the order they are shown. */
  order: number[];
  index: number;
  flipped: boolean;
  remembered: number[];
  forgotten: number[];
};

/** Fisher–Yates with an injectable random source, so tests are exact. */
export function shuffled<T>(items: T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function startReview(ids: number[], random?: () => number): ReviewState {
  return { order: shuffled(ids, random), index: 0, flipped: false, remembered: [], forgotten: [] };
}

export const reviewDone = (state: ReviewState) => state.index >= state.order.length;

export const flipCard = (state: ReviewState): ReviewState =>
  reviewDone(state) ? state : { ...state, flipped: !state.flipped };

/** Marks the shown word and moves on. */
export function answerCard(state: ReviewState, remembered: boolean): ReviewState {
  if (reviewDone(state)) return state;
  const id = state.order[state.index];
  return {
    ...state,
    index: state.index + 1,
    flipped: false,
    remembered: remembered ? [...state.remembered, id] : state.remembered,
    forgotten: remembered ? state.forgotten : [...state.forgotten, id],
  };
}

/** A new round with only the words not remembered. */
export const reviewForgotten = (state: ReviewState, random?: () => number): ReviewState =>
  startReview(state.forgotten, random);
