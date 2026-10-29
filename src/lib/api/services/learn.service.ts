import axiosClient from '../axiosClient';
import { ContentTopic } from '@/modules/learn/types';

export interface ContentAttemptResult {
  correctCount: number;
  totalCount: number;
  score: number;
  rewardBanh: number;
  questionsResult: Array<{ exerciseId: number; correctOption: number; isCorrect: boolean; explanation: string | null }>;
}

export const learnService = {
  async getContentTopics(category?: 'movie' | 'music'): Promise<ContentTopic[]> {
    const url = category ? `/content-topics?category=${category}` : '/content-topics';
    const res: any = await axiosClient.get(url);
    return Array.isArray(res) ? res : res?.data || [];
  },

  async getContentTopicById(id: string | number): Promise<ContentTopic> {
    const res: any = await axiosClient.get(`/content-topics/${id}`);
    return res?.data || res;
  },

  submitAttempt(id: string | number, answers: Record<string, number>): Promise<ContentAttemptResult> {
    return axiosClient.post(`/content-topics/${id}/attempts`, { answers }) as unknown as Promise<ContentAttemptResult>;
  },
};
