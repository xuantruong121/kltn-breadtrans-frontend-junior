import axiosClient from "../axiosClient";

export interface DiagnosticQuestion {
  id: number;
  skill: string;
  question: string;
  options: string[];
  order: number;
}

export interface DiagnosticAssessment {
  id: number;
  title: string;
  description: string | null;
  questions: DiagnosticQuestion[];
  latestAttempt: { correctCount: number; totalCount: number; percentage: number; level: string; submittedAt: string } | null;
}

export interface DiagnosticResult {
  attemptId: number;
  correctCount: number;
  totalCount: number;
  percentage: number;
  level: string;
  questionsResult: Array<{ questionId: number; selectedOption?: number; correctOption: number; isCorrect: boolean; explanation: string | null }>;
}

export const diagnosticService = {
  getCurrent: (): Promise<DiagnosticAssessment> => axiosClient.get("/diagnostic/current"),
  submit: (assessmentId: number, answers: Record<string, number>): Promise<DiagnosticResult> =>
    axiosClient.post(`/diagnostic/${assessmentId}/attempts`, { answers }),
};
