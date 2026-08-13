import axiosClient from "../axiosClient";

export interface VocabTopic {
  id: number;
  title: string;
  categoryName: string;
  totalWords: number;
  isPro: boolean;
  iconUrl?: string;
  words?: VocabWord[];
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
  // Metadata cho user
  isStarred?: boolean;
  isMastered?: boolean;
}

export const vocabService = {
  getTopics: async (): Promise<VocabTopic[]> => {
    return await axiosClient.get("/vocab/topics");
  },

  getTopicById: async (id: number): Promise<VocabTopic> => {
    return await axiosClient.get(`/vocab/topics/${id}`);
  },

  starWord: async (id: number, isStarred: boolean): Promise<any> => {
    return await axiosClient.post(`/vocab/words/${id}/star`, { isStarred });
  },

  masterWord: async (id: number, isMastered: boolean): Promise<any> => {
    return await axiosClient.post(`/vocab/words/${id}/master`, { isMastered });
  },
};
