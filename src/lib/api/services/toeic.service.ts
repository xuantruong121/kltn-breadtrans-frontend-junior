import axiosClient from "../axiosClient";

export interface ToeicQuestion {
  id: number;
  groupId: number;
  questionNumber: number;
  text: string;
  options: string[];
}

export interface ToeicQuestionGroup {
  id: number;
  part: number;
  groupOrder: number;
  imageUrl: string | null;
  audioUrl: string | null;
  passageText: string | null;
  questions: ToeicQuestion[];
}

export interface ToeicExam {
  id: number;
  title: string;
  description: string | null;
  groups: ToeicQuestionGroup[];
}

export interface ToeicBundle {
  id: number;
  title: string;
  description: string | null;
  bilingualContent: Record<string, unknown> | null;
  listeningReading: ToeicExam;
  speakingWriting: {
    id: number;
    title: string;
    description: string | null;
    questions: Array<{
      id: number;
      type: string;
      content: Record<string, unknown>;
      order: number;
    }>;
  };
}

export const toeicService = {
  getExam: async (examId: number): Promise<ToeicExam> =>
    (await axiosClient.get(`/toeic/exams/${examId}`)) as unknown as ToeicExam,
  getBundle: async (quizId: number): Promise<ToeicBundle> =>
    (await axiosClient.get(`/toeic/bundles/${quizId}`)) as unknown as ToeicBundle,
  startAttempt: async (examId: number): Promise<{ id: number }> =>
    (await axiosClient.post(`/toeic/exams/${examId}/attempts`, {
      mode: "PRACTICE",
    })) as unknown as { id: number },
  saveAnswers: async (attemptId: number, answers: Record<number, number>): Promise<void> => {
    await axiosClient.patch(`/toeic/attempts/${attemptId}/answers`, { answers });
  },
  submitAttempt: async (attemptId: number): Promise<void> => {
    await axiosClient.post(`/toeic/attempts/${attemptId}/submit`);
  },
  getResult: async (attemptId: number): Promise<{
    totalScore: number | null;
    listeningScore: number | null;
    readingScore: number | null;
    submittedAt: string | null;
  }> =>
    (await axiosClient.get(`/toeic/attempts/${attemptId}/result`)) as unknown as {
      totalScore: number | null;
      listeningScore: number | null;
      readingScore: number | null;
      submittedAt: string | null;
    },
  getGroupAudio: async (
    groupId: number,
    accent: "US" | "UK",
    rate: number,
    signal?: AbortSignal,
  ): Promise<Blob> =>
    (await axiosClient.get(
      `/toeic/groups/${groupId}/audio?accent=${accent}&rate=${rate}`,
      { responseType: "blob", signal },
    )) as unknown as Blob,
};
