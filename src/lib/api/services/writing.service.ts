import axiosClient from "../axiosClient";

export interface WritingTopic {
  id: number;
  title: string;
  description: string;
  imageUrl?: string;
}

export const writingService = {
  getTopics: async (): Promise<WritingTopic[]> => {
    return await axiosClient.get("/writing/topics");
  },

  getTopicById: async (id: number): Promise<WritingTopic> => {
    return await axiosClient.get(`/writing/topics/${id}`);
  },

  submitPart1: async (id: number, text: string): Promise<any> => {
    return await axiosClient.post(`/writing/quizzes/${id}/submit`, { text });
  },
};
