import axiosClient from "../axiosClient";

export interface SpeakingExercise {
  id: number;
  title: string;
  targetText: string;
  imageUrl?: string;
  audioUrl?: string;
  difficulty: string;
  category: string;
}

export const speakingService = {
  getExercises: async (): Promise<SpeakingExercise[]> => {
    return await axiosClient.get("/speaking/exercises");
  },

  getExerciseById: async (id: number): Promise<SpeakingExercise> => {
    return await axiosClient.get(`/speaking/exercises/${id}`);
  },

  submitAudio: async (id: number, audioBlob: Blob): Promise<any> => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.wav");
    
    return await axiosClient.post(`/speaking/exercises/${id}/submit`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};
