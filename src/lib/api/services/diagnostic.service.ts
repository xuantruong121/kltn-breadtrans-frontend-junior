import axiosClient from "../axiosClient";

export interface DiagnosticQuestion {
  id: number;
  skill: string;
  section?: string;
  construct?: string | null;
  questionType?: "MCQ" | "OPEN_TEXT";
  question: string;
  options: string[];
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

export interface DiagnosticResult {
  attemptId: number;
  correctCount: number;
  totalCount: number;
  percentage: number;
  level: string;
  objectiveTotalCount?: number;
  productiveTaskCount?: number;
  productiveUnavailable?: boolean;
  submittedAt?: string;
  skillProfiles?: DiagnosticSkillProfile[];
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: DiagnosticRecommendation[];
  questionsResult: Array<{
    questionId: number;
    selectedOption?: number;
    selectedText?: string;
    correctOption: number | null;
    isCorrect: boolean | null;
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
    answers: Record<string, number | string>,
    submissionToken?: string,
  ): Promise<DiagnosticResult> =>
    axiosClient.post(`/diagnostic/${assessmentId}/attempts`, {
      answers,
      submissionToken,
    }),
};
