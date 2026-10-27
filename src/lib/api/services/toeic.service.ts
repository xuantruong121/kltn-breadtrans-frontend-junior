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
  learnerReady?: boolean;
  validation?: {
    counts: Record<string, number>;
    issues: Array<{ code: string; message: string }>;
  };
  activeAttempt?: {
    id: number;
    status: "PENDING_START" | "IN_PROGRESS";
    deadline: string | null;
  } | null;
  /** Every unfinished attempt on this exam, with its mode. */
  activeAttempts?: Array<{
    id: number;
    status: "PENDING_START" | "IN_PROGRESS";
    deadline: string | null;
    mode: "PRACTICE" | "FULL_TEST";
    selectedParts?: number[];
  }>;
}

export type ToeicLrSkillStats = {
  attempts: number;
  correct: number;
  total: number;
  accuracy: number | null;
  averageScore: number | null;
  bestScore: number | null;
  averageSeconds: number | null;
  trend: Array<{ attemptId: number; submittedAt: string; accuracy: number | null }>;
  parts: Array<{
    part: number;
    correct: number;
    wrong: number;
    unanswered: number;
    accuracy: number | null;
    types: Array<{ type: string; correct: number; wrong: number; unanswered: number; accuracy: number | null }>;
  }>;
};

export type ToeicGoal = { examDate: string | null; daysUntilExam: number | null; targetScore: number | null };

/** Learner statistics over submitted L&R attempts (scores are internal practice conversions). */
export type ToeicLrStats = {
  window: { days: number | null; from: string | null; to: string | null };
  overview: { attempts: number; practiceSeconds: number; averageSeconds: number | null };
  skills: { LISTENING: ToeicLrSkillStats; READING: ToeicLrSkillStats };
  goal: ToeicGoal;
  attempts: Array<{
    id: number;
    examId: number;
    examTitle: string;
    mode: "PRACTICE" | "FULL_TEST";
    inAssessment: boolean;
    /** Part practice: its Parts; empty = the whole exam. */
    parts: number[];
    submittedAt: string;
    durationSeconds: number | null;
    listeningCorrect: number;
    listeningTotal: number;
    readingCorrect: number;
    readingTotal: number;
    totalScore: number | null;
  }>;
};

/** Continuous Listening recording; only flexible Practice attempts get one. */
export type ToeicListeningMaster =
  | {
      available: true;
      /** Published object, or null when served locally from `path`. */
      url: string | null;
      path: string | null;
      durationSeconds: number;
      timeline: Array<{
        kind: "INTRO" | "DIRECTIONS" | "GROUP" | "END";
        part?: number;
        groupId?: number;
        questionNumbers?: number[];
        start: number;
        end: number;
      }>;
    }
  | { available: false; reason: string };

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
  currentQuestionId?: number | null;
  markedQuestionIds?: number[];
  /** Practice by Part: the chosen Parts; empty = the whole exam. */
  selectedParts?: number[];
  /** Strict Full Test section state — server-authoritative, null for Practice. */
  section?: "LISTENING" | "READING" | null;
  listeningPosition?: number;
  readingStartedAt?: string | null;
  readingDeadline?: string | null;
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

export type ToeicReviewStatus = "CORRECT" | "INCORRECT" | "SKIPPED";

export type ToeicReviewTally = {
  total: number;
  correct: number;
  incorrect: number;
  skipped: number;
  /** Percent, two decimals; null when total is 0. */
  accuracy: number | null;
};

export type ToeicReviewQuestion = {
  questionId: number;
  questionNumber: number;
  part: number;
  groupId: number;
  passageText: string | null;
  imageUrl: string | null;
  /** Authored script the group's audio was made from (Parts 1-4). */
  transcript: string | null;
  questionText: string | null;
  options: string[];
  selectedIndex: number | null;
  correctIndex: number;
  learnerAnswer: string | null;
  standardAnswer: string | null;
  status: ToeicReviewStatus;
  isCorrect: boolean;
  flagged: boolean;
  explanation: string | null;
};

export type ToeicReview = {
  attemptId: number;
  exam: { id: number; title: string; type: string };
  mode: "PRACTICE" | "FULL_TEST";
  selectedParts: number[];
  inAssessment: boolean;
  startedAt: string | null;
  submittedAt: string | null;
  durationSeconds: number | null;
  /** Internal 5-points-per-correct conversion; null for a part practice. */
  scores: { listening: number | null; reading: number | null; total: number | null };
  summary: {
    overall: ToeicReviewTally;
    listening: ToeicReviewTally;
    reading: ToeicReviewTally;
    parts: Array<{ part: number } & ToeicReviewTally>;
  };
  questions: ToeicReviewQuestion[];
};

export type ToeicTaskStatus = "NOT_SUBMITTED" | "PENDING" | "FAILED" | "NO_SPEECH" | "GRADED";

export type ToeicSpeakingTask = {
  number: number;
  exerciseId: number;
  title: string;
  taskType: string | null;
  prompt: string;
  imageUrl: string | null;
  status: ToeicTaskStatus;
  submission: null | {
    id: number;
    submittedAt: string;
    overallScore: number | null;
    transcript: string | null;
    hasRecording: boolean;
    criteria: { accuracy: number | null; fluency: number | null; completeness: number | null; prosody: number | null };
    feedback: string | null;
    suggestions: string[];
  };
};

export type ToeicWritingTask = {
  number: number;
  quizId: number;
  taskKind: string;
  title: string;
  status: ToeicTaskStatus;
  submission: null | {
    id: number;
    submittedAt: string;
    score: number | null;
    maxScore: number | null;
    criteria: Array<{ label: string; score: number | null; max: number | null; comment: string | null }>;
    feedback: string | null;
  };
};

export type ToeicAssessmentReviewComponent = {
  id: number;
  kind: "LISTENING_READING" | "SPEAKING" | "WRITING";
  order: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  startedAt: string | null;
  completedAt: string | null;
  childAttemptId?: number | null;
  childStatus?: string | null;
  tasks?: Array<ToeicSpeakingTask | ToeicWritingTask>;
};

export type ToeicAssessmentReview = {
  id: number;
  assessmentId: number;
  assessment: { id: number; title: string; productFamily: string };
  status: "IN_PROGRESS" | "COMPLETED" | string;
  startedAt: string | null;
  completedAt: string | null;
  skills: Array<Record<string, any> & { kind: string; complete: boolean }>;
  components: ToeicAssessmentReviewComponent[];
};

export const toeicService = {
  getBriefing: async (examId: number): Promise<ToeicExamBriefing> =>
    (await axiosClient.get(
      `/toeic/exams/${examId}/briefing`,
    )) as unknown as ToeicExamBriefing,
  getExam: async (examId: number): Promise<ToeicExam> =>
    (await axiosClient.get(`/toeic/exams/${examId}`)) as unknown as ToeicExam,
  getHistory: async (): Promise<
    Array<{
      id: number;
      exam: { id: number; title: string; type: string };
      mode: "PRACTICE" | "FULL_TEST";
      status: "PENDING_START" | "IN_PROGRESS" | "SUBMITTED";
      createdAt: string;
      submittedAt: string | null;
      totalScore: number | null;
      totalCorrect: number | null;
    }>
  > =>
    (await axiosClient.get("/toeic/history")) as unknown as Array<{
      id: number;
      exam: { id: number; title: string; type: string };
      mode: "PRACTICE" | "FULL_TEST";
      status: "PENDING_START" | "IN_PROGRESS" | "SUBMITTED";
      createdAt: string;
      submittedAt: string | null;
      totalScore: number | null;
      totalCorrect: number | null;
    }>,
  getLrStats: async (days: number | null): Promise<ToeicLrStats> =>
    (await axiosClient.get("/toeic/stats/listening-reading", {
      params: days ? { days } : {},
    })) as unknown as ToeicLrStats,
  saveToeicGoal: async (goal: { examDate: string | null; targetScore: number | null }): Promise<ToeicGoal> =>
    (await axiosClient.patch("/toeic/stats/goal", goal)) as unknown as ToeicGoal,
  getAssessmentHistory: async (): Promise<any[]> =>
    (await axiosClient.get("/toeic/assessments/history")) as unknown as any[],
  getBundle: async (quizId: number): Promise<ToeicBundle> =>
    (await axiosClient.get(
      `/toeic/bundles/${quizId}`,
    )) as unknown as ToeicBundle,
  startAttempt: async (
    examId: number,
    mode?: "PRACTICE" | "FULL_TEST",
    /** Practice only: Parts to practise; omitted = all. */
    parts?: number[],
  ): Promise<{ id: number }> =>
    (await axiosClient.post(`/toeic/exams/${examId}/attempts`, {
      mode: mode ?? "FULL_TEST",
      ...(parts?.length ? { parts } : {}),
    })) as unknown as { id: number },
  /** Absolute URL of the API (for media served by the backend itself). */
  apiUrl: (path: string) => `${axiosClient.defaults.baseURL}${path}`,
  beginAttempt: async (attemptId: number): Promise<ToeicAttempt> =>
    (await axiosClient.post(
      `/toeic/attempts/${attemptId}/begin`,
    )) as unknown as ToeicAttempt,
  getAttempt: async (attemptId: number): Promise<ToeicAttempt> =>
    (await axiosClient.get(
      `/toeic/attempts/${attemptId}`,
    )) as unknown as ToeicAttempt,
  cancelAttempt: async (attemptId: number): Promise<void> => {
    await axiosClient.post(`/toeic/attempts/${attemptId}/cancel`);
  },
  saveAnswers: async (
    attemptId: number,
    /** Option index per question; null clears a saved answer. */
    answers: Record<number, number | null>,
    state?: { markedQuestionIds?: number[]; currentQuestionId?: number },
  ): Promise<void> => {
    await axiosClient.patch(`/toeic/attempts/${attemptId}/answers`, {
      answers,
      ...state,
    });
  },
  submitAttempt: async (attemptId: number): Promise<unknown> =>
    (await axiosClient.post(`/toeic/attempts/${attemptId}/submit`)) as unknown,
  getRemainingTime: async (
    attemptId: number,
  ): Promise<{ remaining: number | null; section?: "LISTENING" | "READING" | null }> =>
    (await axiosClient.get(
      `/toeic/attempts/${attemptId}/remaining-time`,
    )) as unknown as { remaining: number | null; section?: "LISTENING" | "READING" | null },
  /** Advances the one-pass Listening cursor by exactly one segment (server-authoritative). */
  getListeningMaster: async (attemptId: number): Promise<ToeicListeningMaster> =>
    (await axiosClient.get(
      `/toeic/attempts/${attemptId}/listening/master`,
    )) as unknown as ToeicListeningMaster,
  advanceListening: async (attemptId: number): Promise<ToeicAttempt> =>
    (await axiosClient.post(
      `/toeic/attempts/${attemptId}/listening/advance`,
    )) as unknown as ToeicAttempt,
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
  getResult: async (
    attemptId: number,
  ): Promise<{
    practiceResult?: {
      listeningCorrect: number;
      listeningTotal: number;
      readingCorrect: number;
      readingTotal: number;
      totalCorrect: number;
      totalQuestions: number;
    };
    disclaimer?: string;
    totalScore: number | null;
    listeningScore: number | null;
    readingScore: number | null;
    submittedAt: string | null;
    scoreLabel?: string;
    partBreakdown?: Array<{ part: number; correct: number; total: number }>;
  }> =>
    (await axiosClient.get(
      `/toeic/attempts/${attemptId}/result`,
    )) as unknown as {
      totalScore: number | null;
      listeningScore: number | null;
      readingScore: number | null;
      submittedAt: string | null;
      scoreLabel?: string;
      partBreakdown?: Array<{ part: number; correct: number; total: number }>;
    },
  /** Post-submission answer review; the server refuses it before submission. */
  getReview: async (attemptId: number): Promise<ToeicReview> =>
    (await axiosClient.get(
      `/toeic/attempts/${attemptId}/review`,
    )) as unknown as ToeicReview,
  /** Per-task Speaking/Writing review of an assessment attempt (read-only). */
  getAssessmentReview: async (attemptId: number): Promise<ToeicAssessmentReview> =>
    (await axiosClient.get(
      `/toeic/assessments/attempts/${attemptId}/review`,
    )) as unknown as ToeicAssessmentReview,
  getGroupAudio: async (
    groupId: number,
    attemptId: number,
    signal?: AbortSignal,
  ): Promise<Blob> =>
    (await axiosClient.get(
      `/toeic/groups/${groupId}/audio?attemptId=${attemptId}`,
      { responseType: "blob", signal },
    )) as unknown as Blob,
  completeAssessmentComponent: async (
    attemptId: number,
    componentId: number,
  ): Promise<unknown> =>
    (await axiosClient.post(
      `/toeic/assessments/attempts/${attemptId}/components/${componentId}/complete`,
      {},
    )) as unknown,
};
