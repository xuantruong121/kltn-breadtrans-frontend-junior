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

  async getWatchTracking(classId?: number): Promise<Record<string, any>> {
    const query = classId ? `?classId=${classId}` : '';
    const res: any = await axiosClient.get(`/classes/watch-tracking${query}`);
    return res?.data || res || {};
  },

  async updateWatchTracking(videoKey: string, payload: any, classId?: number): Promise<any> {
    return axiosClient.patch('/classes/watch-tracking', {
      classId,
      videoKey,
      data: payload,
    });
  },

  submitAttempt(id: string | number, answers: Record<string, number>): Promise<ContentAttemptResult> {
    return axiosClient.post(`/content-topics/${id}/attempts`, { answers }) as unknown as Promise<ContentAttemptResult>;
  },
};
