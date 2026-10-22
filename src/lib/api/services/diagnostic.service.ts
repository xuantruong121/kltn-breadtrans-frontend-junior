import axiosClient from "../axiosClient";

export interface DiagnosticQuestion {
  id: number;
  skill: string;
  section?: string;
  construct?: string | null;
  questionType?: "MCQ" | "OPEN_TEXT";
  question: string;
  options: string[];
  passageTitle?: string | null;
  passageBody?: string | null;
  passageText?: string | null;
  audioUrl?: string | null;
  order: number;
}

export interface DiagnosticSkillProfile {
  skill: string;
  correctCount: number;
  totalCount: number;
  percentage: number | null;
  evidence: "SUFFICIENT" | "INSUFFICIENT";
}

export interface DiagnosticRecommendation {
  courseId: number;
  title: string;
  level: string | null;
  rank: number;
  relevance: number;
  reason: string;
  recommendedLesson?: { id: number; title: string } | null;
}

export interface DiagnosticPracticeRecommendation {
  id: string;
  skill: string;
  title: string;
  description: string;
  route: string;
  badge: string;
}

export interface CanonicalDiagnosticBlueprint {
  version: string;
  totalItems: number;
  objectiveCount: number;
  productiveCount: number;
  sections: Record<string, {
    name: string;
    total: number;
    objective: number;
    productive?: number;
    skills: string[];
  }>;
}

export interface DiagnosticResult {
  attemptId: number;
  canonicalBlueprint?: CanonicalDiagnosticBlueprint;
  correctCount: number;
  totalCount: number;
  totalTaskCount?: number;
  percentage: number;
  level: string;
  referenceLevel?: string;
  objectiveTotalCount?: number;
  productiveTaskCount?: number;
  productiveUnavailable?: boolean;
  productivePending?: boolean;
  objectiveCoreScore?: number;
  speakingEvidenceCount?: number;
  speakingScore?: number | null;
  speakingEvidenceConfidence?: string;
  speakingResponses?: DiagnosticSpeakingResponse[];
  writingFeedback?: DiagnosticWritingFeedback[];
  submittedAt?: string;
  completedAt?: string;
  skillProfiles?: DiagnosticSkillProfile[];
  strengths?: string[];
  weaknesses?: string[];
  practiceRecommendations?: DiagnosticPracticeRecommendation[];
  recommendations?: DiagnosticRecommendation[];
  questionsResult: Array<{
    questionId: number;
    selectedOption?: number;
    selectedText?: string;
    correctOption: number | null;
    correctText?: string | null;
    isCorrect: boolean | null;
    explanation: string | null;
  }>;
}

export interface DiagnosticSpeakingResponse {
  id: number;
  questionId: number;
  taskKey?: string;
  status: string;
  durationMs?: number | null;
  score?: number | null;
  failureReason?: string | null;
}

export interface DiagnosticWritingFeedback {
  questionId: number;
  status: "QUEUED" | "GRADING" | "GRADED" | "GRADING_FAILED";
  answer: string;
  score: number | null;
  feedback: string | null;
  suggestions: string[];
  provider: string | null;
  failureReason: string | null;
  gradedAt: string | null;
}

export interface DiagnosticAssessment {
  id: number;
  title: string;
  description: string | null;
  canonicalBlueprint?: CanonicalDiagnosticBlueprint;
  hasCompleted?: boolean;
  questions: DiagnosticQuestion[];
  latestAttempt: {
    id?: number;
    correctCount: number;
    totalCount: number;
    percentage: number;
    level: string;
    submittedAt: string;
    completedAt?: string;
  } | null;
  inProgressAttempt?: {
    id: number;
    answers: Record<string, unknown>;
    speakingResponses: DiagnosticSpeakingResponse[];
  } | null;
}

export const diagnosticService = {
  getCurrent: (): Promise<DiagnosticAssessment> =>
    axiosClient.get("/diagnostic/current"),
  getLatestResult: (): Promise<DiagnosticResult | null> =>
    axiosClient.get("/diagnostic/results/latest"),
  submit: (
    assessmentId: number,
    answers: Record<string, number | string>,
    submissionToken?: string,
    attemptId?: number,
  ): Promise<DiagnosticResult> =>
    axiosClient.post(`/diagnostic/${assessmentId}/attempts`, {
      answers,
      submissionToken,
      attemptId,
    }),
  startAttempt: async (assessmentId: number): Promise<{ attemptId: number; submissionToken: string }> =>
    (await axiosClient.post(`/diagnostic/${assessmentId}/attempts/start`)) as unknown as {
      attemptId: number;
      submissionToken: string;
    },
  confirmSpeaking: async (
    assessmentId: number,
    attemptId: number,
    questionId: number,
    audio: Blob,
    durationMs: number,
  ): Promise<DiagnosticSpeakingResponse> => {
    const form = new FormData();
    form.append("audio", audio, "diagnostic-speaking.webm");
    form.append("durationMs", String(durationMs));
    return axiosClient.post(
      `/diagnostic/${assessmentId}/attempts/${attemptId}/speaking/${questionId}/confirm`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
  },
  skipSpeaking: (
    assessmentId: number,
    attemptId: number,
    questionId: number,
  ): Promise<DiagnosticSpeakingResponse> =>
    axiosClient.post(
      `/diagnostic/${assessmentId}/attempts/${attemptId}/speaking/${questionId}/skip`,
    ),
  retryWriting: (
    assessmentId: number,
    attemptId: number,
    questionId: number,
  ): Promise<{ questionId: number; status: "QUEUED" }> =>
    axiosClient.post(
      `/diagnostic/${assessmentId}/attempts/${attemptId}/writing/${questionId}/retry`,
    ),
};
