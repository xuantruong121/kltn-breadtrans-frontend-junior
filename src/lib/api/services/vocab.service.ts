import axiosClient from "../axiosClient";

export interface VocabTopic {
  id: number;
  title: string;
  categoryName: string;
  totalWords: number;
  learnedCount: number;
  needReviewCount: number;
  isPro: boolean;
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
}

export interface VocabTopicDetail {
  topicId: number;
  title: string;
  categoryName: string;
  totalWords: number;
  words: VocabWord[];
}

export interface VocabLookupResponse {
  query: string;
  canonicalWord: string | null;
  isInflectionMatch: boolean;
  matches: VocabWord[];
}

const lookupCache = new Map<
  string,
  { expiresAt: number; value: VocabLookupResponse }
>();
const lookupInflight = new Map<string, Promise<VocabLookupResponse>>();

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

  masterWord: async (id: number, isMastered: boolean): Promise<any> => {
    return await axiosClient.post(`/vocab/words/${id}/master`, { isMastered });
  },

  reviewWord: async (id: number, isCorrect: boolean): Promise<any> => {
    return await axiosClient.post(`/vocab/words/${id}/review`, { isCorrect });
  },

  lookupWord: async (
    word: string,
    signal?: AbortSignal,
  ): Promise<VocabLookupResponse> => {
    const key = word.trim().toLowerCase();
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
};
