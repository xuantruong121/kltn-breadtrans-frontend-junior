import axiosClient from "../axiosClient";

export interface ReadingTopicQuiz {
  id: number;
  title: string;
  description?: string;
  type?: string;
  timeLimit?: number;
  questionCount?: number;
  courseId?: number | null;
  isPremiumContent?: boolean;
  isLocked?: boolean;
  _count?: {
    questions: number;
  };
}

export interface ReadingTopic {
  id: number;
  title: string;
  description: string;
  imageUrl?: string;
  isPremiumContent?: boolean;
  isLocked?: boolean;
  quizzes?: ReadingTopicQuiz[];
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
