import axiosClient from "../axiosClient";
import { useAuthStore } from "@/stores/authStore";

export interface VocabTopic {
  id: number;
  title: string;
  /** Short line the CMS writes for the deck card. */
  description?: string | null;
  /** Practice level (STARTER … ADVANCED), when the deck has one. */
  level?: string | null;
  categoryName: string;
  totalWords: number;
  learnedCount: number;
  needReviewCount: number;
  /** Words whose review time has come (the deck's due-word review). */
  dueCount?: number;
  isPro: boolean;
  isLocked?: boolean;
  iconUrl?: string;
  words?: VocabWord[];
}

export interface VocabTopicsResponse {
  categories: Array<{ name: string; count: number; topics: VocabTopic[] }>;
  topics: VocabTopic[];
}

export interface VocabWord {
  id: number;
  word: string;
  pos: string;
  ipaUs?: string;
  ipaUk?: string;
  meaning: string;
  audioUs?: string;
  audioUk?: string;
  exampleEn?: string;
  exampleVi?: string;
  collocations?: Array<{
    phrase: string;
    meaningVi: string;
    exampleEn?: string;
    exampleVi?: string;
    audioUs?: string | null;
    audioUk?: string | null;
  }>;
  // Metadata cho user
  isStarred?: boolean;
  isMastered?: boolean;
  /** Its review time has come. */
  isDue?: boolean;
  /** Days until the next review for each self-rating; 0 means ten minutes. */
  reviewPreview?: Record<SrsGrade, number>;
}

export type SrsGrade = "AGAIN" | "HARD" | "GOOD" | "EASY";

/** A word the learner saved: a dictionary snapshot taken when it was saved. */
export interface SavedWord {
  id: number;
  /** As the learner saved it ("opens"). */
  word: string;
  /** Dictionary form ("open"); a flashcard matches its word against this. */
  canonicalWord: string;
  savedAt: string;
  pos: string;
  ipaUs?: string | null;
  ipaUk?: string | null;
  /** Vietnamese meaning, or the English definition when there is none. */
  meaning: string;
  definitionEn?: string | null;
  audioUs?: string | null;
  audioUk?: string | null;
  exampleEn?: string | null;
  exampleVi?: string | null;
}

export interface VocabTopicDetail {
  topicId: number;
  title: string;
  categoryName: string;
  totalWords: number;
  words: VocabWord[];
}

export interface DictionaryEntry {
  word: string;
  partOfSpeech: string | null;
  ipaUs: string | null;
  ipaUk: string | null;
  meaningVi: string | null;
  definitions: Array<{
    definition: string;
    meaningVi: string | null;
    example: string | null;
  }>;
  examples: string[];
  collocations: VocabWord["collocations"];
  synonyms: string[];
  antonyms: string[];
  audio: { us: string | null; uk: string | null };
  exampleVi?: string | null;
}

export interface VocabLookupResponse {
  query: string;
  canonicalWord: string | null;
  isInflectionMatch: boolean;
  source?: "LOCAL" | "CACHE" | "EXTERNAL";
  providerUnavailable?: boolean;
  saved?: boolean;
  savedId?: number | null;
  meaningViStatus?: "ENRICHED" | "UNAVAILABLE" | "NOT_APPLICABLE";
  entries?: DictionaryEntry[];
  matches: VocabWord[];
}

const lookupCache = new Map<
  string,
  { expiresAt: number; value: VocabLookupResponse }
>();
const lookupInflight = new Map<string, Promise<VocabLookupResponse>>();
const expandedLookupCache = new Map<
  string,
  { expiresAt: number; value: VocabLookupResponse }
>();

function getLookupScope(): string {
  const auth = useAuthStore.getState();
  return auth.accessToken || (auth.user ? `user:${auth.user.id}` : "guest");
}

/** What a review returns; the study room reads the XP and the grade. */
export type WordProgressReply = { isMastered?: boolean; xpEarned?: number };

/** How one check of the flashcard room went (thesis supervisor 2026-11-26). */
export type StepResult = "CORRECT" | "WRONG" | "SKIPPED";
/** PASSED only for a real speech recognition match. */
export type SpeakingResult = "PASSED" | "FAILED" | "UNAVAILABLE" | "SKIPPED";

/** What happened in the room's steps; the server decides the grade from it. */
export interface ReviewEvidence {
  quiz: StepResult;
  typing: StepResult;
  typingHints: number;
  speaking: SpeakingResult;
  /** "Đã nhớ": only the quiz and the typing were asked. */
  quickCheck: boolean;
}

export type WordReviewReply = WordProgressReply & {
  grade?: SrsGrade;
  intervalDays?: number;
};

export const vocabService = {
  getTopics: async (): Promise<VocabTopicsResponse> => {
    return await axiosClient.get("/vocab/topics");
  },

  getTopicById: async (id: number): Promise<VocabTopicDetail> => {
    return await axiosClient.get(`/vocab/topics/${id}`);
  },

  starWord: async (id: number, isStarred: boolean): Promise<any> => {
    return await axiosClient.post(`/vocab/words/${id}/star`, { isStarred });
  },

  /**
   * One review: the room reports its steps, the server decides the grade,
   * keeps the word's own schedule and says the grade and the new interval.
   * `xpEarned`: flashcard XP for a word known for the first time (2, or 0).
   */
  reviewWord: async (id: number, evidence: ReviewEvidence): Promise<WordReviewReply> => {
    return await axiosClient.post(`/vocab/words/${id}/review`, { evidence });
  },

  getSavedWords: async (): Promise<SavedWord[]> => {
    return await axiosClient.get("/vocab/saved");
  },

  saveWord: async (word: string): Promise<{ id: number }> => {
    return await axiosClient.post("/vocab/saved", { word });
  },

  removeSavedWord: async (id: number): Promise<{ deleted: boolean }> => {
    return await axiosClient.delete(`/vocab/saved/${id}`);
  },

  lookupWord: async (
    word: string,
    signal?: AbortSignal,
  ): Promise<VocabLookupResponse> => {
    const key = `${getLookupScope()}:${word.trim().toLowerCase()}`;
    const cached = lookupCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const existing = lookupInflight.get(key);
    if (existing && !signal) return existing;

    const request: Promise<VocabLookupResponse> = (
      axiosClient.get(`/vocab/lookup`, {
        params: { word },
        signal,
      }) as unknown as Promise<VocabLookupResponse>
    )
      .then((value) => {
        lookupCache.set(key, { expiresAt: Date.now() + 5 * 60 * 1000, value });
        return value;
      })
      .finally(() => lookupInflight.delete(key));
    lookupInflight.set(key, request);
    return request;
  },

  lookupWordDetails: async (
    word: string,
    signal?: AbortSignal,
  ): Promise<VocabLookupResponse> => {
    const key = `${getLookupScope()}:${word.trim().toLowerCase()}`;
    const cached = expandedLookupCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const value = (await axiosClient.get(`/vocab/lookup/details`, {
      params: { word },
      signal,
    })) as unknown as VocabLookupResponse;
    expandedLookupCache.set(key, {
      expiresAt: Date.now() + 30 * 60 * 1000,
      value,
    });
    return value;
  },
};
