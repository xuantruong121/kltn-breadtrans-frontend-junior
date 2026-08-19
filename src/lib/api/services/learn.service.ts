import axiosClient from '../axiosClient';
import { ContentTopic } from '@/modules/learn/types';

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

  async getWatchTracking(): Promise<Record<string, any>> {
    const res: any = await axiosClient.get('/classes/watch-tracking');
    return res?.data || res || {};
  },

  async updateWatchTracking(videoKey: string, payload: any): Promise<any> {
    return axiosClient.patch('/classes/watch-tracking', {
      videoKey,
      data: payload,
    });
  },
};
