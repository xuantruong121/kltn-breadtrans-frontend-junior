import axiosClient from "../axiosClient";

export interface ToeicQuestion {
  id: number;
  groupId: number;
  questionNumber: number;
  text: string | null;
  options: string[];
}

export interface ToeicQuestionGroup {
  id: number;
  part: number;
  groupOrder: number;
  imageUrl: string | null;
  audioUrl: string | null;
  canonicalAccent?: "US" | "UK";
  passageText: string | null;
  questions: ToeicQuestion[];
}

export interface ToeicExam {
  id: number;
  title: string;
  description: string | null;
  groups?: ToeicQuestionGroup[];
  parts?: Array<{ part: number; questionCount: number }>;
}

export interface ToeicExamBriefing {
  id: number;
  title: string;
  description: string | null;
  type: "FULL_TEST" | "PRACTICE_BY_PART";
  difficulty: string;
  durationSeconds: number;
  parts: Array<{ part: number; questionCount: number }>;
}

export interface ToeicAttempt {
  id: number;
  userId: number;
  examId: number;
  mode: "PRACTICE" | "FULL_TEST";
  status: "PENDING_START" | "IN_PROGRESS" | "SUBMITTED";
  durationSeconds: number;
  startedAt: string | null;
  deadline: string | null;
  exam: ToeicExam;
  answers: Array<{ questionId: number; selectedIndex: number | null }>;
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
  getBriefing: async (examId: number): Promise<ToeicExamBriefing> =>
    (await axiosClient.get(`/toeic/exams/${examId}/briefing`)) as unknown as ToeicExamBriefing,
  getExam: async (examId: number): Promise<ToeicExam> =>
    (await axiosClient.get(`/toeic/exams/${examId}`)) as unknown as ToeicExam,
  getBundle: async (quizId: number): Promise<ToeicBundle> =>
    (await axiosClient.get(`/toeic/bundles/${quizId}`)) as unknown as ToeicBundle,
  startAttempt: async (examId: number): Promise<{ id: number }> =>
    (await axiosClient.post(`/toeic/exams/${examId}/attempts`, {
      mode: "FULL_TEST",
    })) as unknown as { id: number },
  beginAttempt: async (attemptId: number): Promise<ToeicAttempt> =>
    (await axiosClient.post(`/toeic/attempts/${attemptId}/begin`)) as unknown as ToeicAttempt,
  getAttempt: async (attemptId: number): Promise<ToeicAttempt> =>
    (await axiosClient.get(`/toeic/attempts/${attemptId}`)) as unknown as ToeicAttempt,
  cancelAttempt: async (attemptId: number): Promise<void> => {
    await axiosClient.post(`/toeic/attempts/${attemptId}/cancel`);
  },
  saveAnswers: async (attemptId: number, answers: Record<number, number>): Promise<void> => {
    await axiosClient.patch(`/toeic/attempts/${attemptId}/answers`, { answers });
  },
  submitAttempt: async (attemptId: number): Promise<unknown> =>
    (await axiosClient.post(`/toeic/attempts/${attemptId}/submit`)) as unknown,
  recordIntegrityEvent: async (
    attemptId: number,
    eventType:
      | "FULLSCREEN_EXIT"
      | "TAB_HIDDEN"
      | "WINDOW_BLUR"
      | "COPY_ATTEMPT"
      | "PASTE_ATTEMPT"
      | "CONTEXT_MENU_ATTEMPT",
    questionId?: number,
  ): Promise<void> => {
    await axiosClient.post(`/toeic/attempts/${attemptId}/integrity-events`, {
      eventType,
      ...(questionId ? { questionId } : {}),
    });
  },
  getResult: async (attemptId: number): Promise<{
    practiceResult?: { listeningCorrect: number; listeningTotal: number; readingCorrect: number; readingTotal: number; totalCorrect: number; totalQuestions: number };
    disclaimer?: string;
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
    attemptId: number,
    signal?: AbortSignal,
  ): Promise<Blob> =>
    (await axiosClient.get(
      `/toeic/groups/${groupId}/audio?attemptId=${attemptId}`,
      { responseType: "blob", signal },
    )) as unknown as Blob,
};
