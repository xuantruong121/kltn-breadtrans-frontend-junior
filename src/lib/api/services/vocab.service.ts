import axiosClient from "../axiosClient";

export interface VocabTopic {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  words?: VocabWord[];
}

export interface VocabWord {
  id: number;
  word: string;
  meaning: string;
  pronunciation: string;
  exampleSentence: string;
  imageUrl?: string;
  audioUrl?: string;
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
