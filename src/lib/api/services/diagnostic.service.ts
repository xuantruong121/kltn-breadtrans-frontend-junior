import type { PracticePlacement } from "@/lib/learning-path/practiceLevel";
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
  /** LISTENING only: null audio is an explicit NOT_READY state. */
  mediaStatus?: "READY" | "NOT_READY" | null;
  taskType?: "MCQ" | "SPEAKING_RESPONSE" | "WRITING_RESPONSE" | string;
  instructions?: string | null;
  prepSeconds?: number | null;
  responseSeconds?: number | null;
  wordMin?: number | null;
  wordMax?: number | null;
  productive?: boolean;
  order: number;
}

export type DiagnosticSkillState =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "PENDING_GRADING"
  | "COMPLETE"
  | "GRADING_FAILED";

export interface DiagnosticFourSkillSkill {
  skill: "LISTENING" | "READING" | "SPEAKING" | "WRITING" | "LANGUAGE_USE";
  state: DiagnosticSkillState;
  score: number | null;
  weight: number;
  itemsScored: number;
  itemsTotal: number;
  tasksGraded?: number;
  tasksPending?: number;
  tasksFailed?: number;
  tasksSkipped?: number;
}

export type DiagnosticSkillKey = DiagnosticFourSkillSkill["skill"];

export interface DiagnosticAdviceResource {
  kind: "LISTENING_QUIZ" | "READING_QUIZ" | "WRITING_QUIZ" | "SPEAKING_EXERCISE" | "COURSE";
  id: number;
  title: string;
  route: string;
  access: "OPEN" | "LOCKED";
  requirement: string | null;
  /** Speaking: the practice set key, for the catalog's display title. */
  setKey?: string | null;
  cefrLevel?: string | null;
}

export interface DiagnosticAdviceFinding {
  skill: DiagnosticSkillKey;
  areaKey: string;
  area: string;
  evidence: string;
}

export interface DiagnosticAdvicePriority extends DiagnosticAdviceFinding {
  rank: number;
  why: string;
  action: string;
  graderFeedback: string[];
  resources: DiagnosticAdviceResource[];
}

/** D1 advice (V2): evidence-based findings and links to published content. */
export interface DiagnosticAdvice {
  version: string;
  basis: "D1_ADVISORY_SCORES_ONLY";
  profile: {
    assessed: DiagnosticSkillKey[];
    strongest: DiagnosticSkillKey[];
    weakest: DiagnosticSkillKey[];
    balanced: boolean;
    spread: number | null;
  };
  strengths: DiagnosticAdviceFinding[];
  priorities: DiagnosticAdvicePriority[];
  supplemental: DiagnosticAdvicePriority[];
  unassessed: Array<{
    skill: DiagnosticSkillKey;
    reason: "SKIPPED" | "PENDING_GRADING" | "GRADING_FAILED" | "NOT_SUBMITTED";
    generalPractice: DiagnosticAdviceResource | null;
  }>;
  mockGraderEvidence: boolean;
  noWeaknessFound: boolean;
}

export type DiagnosticProductiveTaskStatus =
  | "NOT_ATTEMPTED"
  | "SKIPPED"
  | "SUBMITTED"
  | "GRADING_PENDING"
  | "GRADED"
  | "GRADING_FAILED";

export interface DiagnosticObservedSkill {
  skill: "LISTENING" | "READING" | "LANGUAGE_USE";
  correct: number;
  total: number;
  score: number | null;
  weight: number;
}

export interface DiagnosticObservedProductiveSkill {
  skill: "SPEAKING" | "WRITING";
  tasks: Array<{
    questionId: number;
    order: 1 | 2;
    status: DiagnosticProductiveTaskStatus;
    score: number | null;
    weight: number;
  }>;
  graded: number;
  total: number;
  skipped: number;
  pending: number;
  failed: number;
  /** Mean of the graded tasks; null when none is graded. */
  score: number | null;
  coverage: "NONE" | "PARTIAL" | "FULL";
}

/** FOUR_SKILL_OBSERVED_V3: the observed score over the evidence actually graded. */
export interface DiagnosticObservedResult {
  policyVersion: "FOUR_SKILL_OBSERVED_V3";
  rubricWeightingVersion: string;
  weights: { LISTENING: number; READING: number; SPEAKING_TASK: number; WRITING_TASK: number };
  listening: DiagnosticObservedSkill;
  reading: DiagnosticObservedSkill;
  /** Weight 0: supporting evidence only. */
  languageUse: DiagnosticObservedSkill;
  speaking: DiagnosticObservedProductiveSkill;
  writing: DiagnosticObservedProductiveSkill;
  objectiveCore: number | null;
  observed: {
    score: number | null;
    numerator: number | null;
    denominator: number;
    gradedProductiveTasks: number;
    withheldReason: null | "OBJECTIVE_INCOMPLETE" | "PRODUCTIVE_PENDING" | "PRODUCTIVE_FAILED";
  };
  coverageWeight: number;
}

export interface DiagnosticBreakdownGroup {
  key: string;
  correct: number;
  total: number;
}

export type DiagnosticObjectiveBreakdown = Record<
  "LISTENING" | "READING" | "LANGUAGE_USE",
  { byDifficulty: DiagnosticBreakdownGroup[]; bySubskill: DiagnosticBreakdownGroup[] }
>;

/**
 * FOUR_SKILL_PLACEMENT_V2. Without `observed` (older attempts) `overall` is
 * null until all four skills are COMPLETE; with it, `overall` is the observed
 * score.
 */
export interface DiagnosticFourSkillResult {
  scoringVersion: "FOUR_SKILL_PLACEMENT_V2";
  state: DiagnosticSkillState;
  skills: Record<DiagnosticFourSkillSkill["skill"], DiagnosticFourSkillSkill>;
  overall: number | null;
  placementBand: null;
  placementBandStatus: string;
  observed?: DiagnosticObservedResult;
}

/** Weighting facts of a graded Speaking/Writing task (null for older tasks). */
export interface DiagnosticTaskWeighting {
  weightingVersion?: string | null;
  criterionWeights?: Record<string, number> | null;
  unavailableCriteria?: string[];
  limitedEvidence?: boolean;
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
  administeredForm?: {
    totalItems: number;
    objectiveCount: number;
    productiveCount: number;
    itemsBySkill: Record<string, number>;
  };
  fourSkill?: DiagnosticFourSkillResult | null;
  /** Internal practice levels from a four-skill attempt (not CEFR). */
  practicePlacement?: PracticePlacement | null;
  /** FOUR_SKILL_OBSERVED_V3 only. */
  objectiveBreakdown?: DiagnosticObjectiveBreakdown | null;
  advice?: DiagnosticAdvice | null;
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

export interface DiagnosticSpeakingResponse extends DiagnosticTaskWeighting {
  id: number;
  questionId: number;
  taskKey?: string;
  status: string;
  durationMs?: number | null;
  /** Task rubric percentage 0-100; null unless GRADED. */
  score?: number | null;
  scoreScale?: "PERCENT_0_100";
  failureReason?: string | null;
  rubricVersion?: string | null;
  /** A null criterion could not be assessed. */
  criteria?: Record<string, number | null> | null;
  criterionFeedback?: Record<string, string> | null;
  feedback?: string | null;
  suggestions?: string[];
  transcript?: string | null;
}

export interface DiagnosticWritingFeedback extends DiagnosticTaskWeighting {
  questionId: number;
  status: "QUEUED" | "GRADING" | "GRADED" | "GRADING_FAILED";
  answer: string;
  /** Task rubric percentage 0-100; null unless GRADED. */
  score: number | null;
  scoreScale?: "PERCENT_0_100";
  /** A null criterion could not be assessed. */
  criteria?: Record<string, number | null> | null;
  criterionFeedback?: Record<string, string> | null;
  rubricVersion?: string | null;
  wordCount?: number | null;
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
  abandonAttempt: (assessmentId: number, attemptId: number): Promise<{ attemptId: number; status: "ABANDONED" }> =>
    axiosClient.post(`/diagnostic/${assessmentId}/attempts/${attemptId}/abandon`),
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
    /** The recording's own decoded length; omitted when it could not be measured. */
    durationMs?: number,
  ): Promise<DiagnosticSpeakingResponse> => {
    const form = new FormData();
    form.append("audio", audio, "diagnostic-speaking.webm");
    if (durationMs !== undefined) form.append("durationMs", String(durationMs));
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
  retrySpeaking: (
    assessmentId: number,
    attemptId: number,
    questionId: number,
  ): Promise<DiagnosticSpeakingResponse> =>
    axiosClient.post(
      `/diagnostic/${assessmentId}/attempts/${attemptId}/speaking/${questionId}/retry`,
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
