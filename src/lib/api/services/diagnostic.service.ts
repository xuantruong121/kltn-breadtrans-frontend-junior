import axiosClient from "../axiosClient";

export interface DiagnosticQuestion {
  id: number;
  skill: string;
  question: string;
  options: string[];
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
}

export interface DiagnosticResult {
  attemptId: number;
  correctCount: number;
  totalCount: number;
  percentage: number;
  level: string;
  submittedAt?: string;
  skillProfiles?: DiagnosticSkillProfile[];
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: DiagnosticRecommendation[];
  questionsResult: Array<{
    questionId: number;
    selectedOption?: number;
    correctOption: number;
    isCorrect: boolean;
    explanation: string | null;
  }>;
}

export interface DiagnosticAssessment {
  id: number;
  title: string;
  description: string | null;
  questions: DiagnosticQuestion[];
  latestAttempt: {
    correctCount: number;
    totalCount: number;
    percentage: number;
    level: string;
    submittedAt: string;
  } | null;
}

export const diagnosticService = {
  getCurrent: (): Promise<DiagnosticAssessment> =>
    axiosClient.get("/diagnostic/current"),
  getLatestResult: (): Promise<DiagnosticResult | null> =>
    axiosClient.get("/diagnostic/results/latest"),
  submit: (
    assessmentId: number,
    answers: Record<string, number>,
    submissionToken?: string,
  ): Promise<DiagnosticResult> =>
    axiosClient.post(`/diagnostic/${assessmentId}/attempts`, {
      answers,
      submissionToken,
    }),
};
