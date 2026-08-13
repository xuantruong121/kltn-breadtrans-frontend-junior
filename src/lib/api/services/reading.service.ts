import axiosClient from "../axiosClient";

export interface ReadingTopic {
  id: number;
  title: string;
  description: string;
  imageUrl?: string;
  quizzes?: any[];
}

export const readingService = {
  getTopics: async (): Promise<ReadingTopic[]> => {
    return await axiosClient.get("/reading/topics?category=BILINGUAL_LEVEL");
  },

  getTopicById: async (id: number): Promise<ReadingTopic> => {
    return await axiosClient.get(`/reading/topics/${id}`);
  },

  getTheory: async (quizId: number): Promise<any> => {
    return await axiosClient.get(`/reading/quizzes/${quizId}/theory`);
  },
};
