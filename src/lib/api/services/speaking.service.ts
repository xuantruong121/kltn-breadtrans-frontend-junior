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

export interface SubmitSpeakingResponse {
  submissionId: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  pollUrl: string;
  acceptedAt: string;
}

export interface WordAssessmentItem {
  word: string;
  accuracyScore: number;
  errorType: "None" | "Mispronunciation" | "Omission" | "Insertion" | "Unspoken";
  isCorrect: boolean;
}

export interface PronunciationAssessmentData {
  overallScore?: number | null;
  clarity: string;
  feedback: string;
  problematicWords: string[];
  suggestions: string[];
  fluencyScore?: number;
  accuracyScore?: number;
  completenessScore?: number;
  words?: WordAssessmentItem[];
  isSilentOrNoSpeech?: boolean;
  transcript?: string;
  errorCode?: string;
}

export interface SpeakingSubmissionDetail {
  id: number;
  exerciseId: number;
  userId: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  overallScore?: number | null;
  transcript?: string | null;
  aiFeedback?: PronunciationAssessmentData | null;
  durationMs?: number | null;
  audioQuality?: {
    durationMs: number;
    sampleRate: number;
    channels: number;
    bitsPerSample: number;
    rmsDb: number;
    peakDb: number;
    clippingRatio: number;
    isSilent: boolean;
  } | null;
  audioUrl?: string | null;
  submittedAt: string;
  processedAt?: string | null;
  lastErrorCode?: string | null;
  exercise?: SpeakingExercise;
}

export interface SpeakingSubmissionSummary {
  id: number;
  exerciseId: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  overallScore?: number | null;
  transcript?: string | null;
  durationMs?: number | null;
  submittedAt: string;
  processedAt?: string | null;
  lastErrorCode?: string | null;
  exerciseTitle?: string;
  targetText?: string;
}

export const speakingService = {
  getExercises: async (): Promise<SpeakingExercise[]> => {
    return await axiosClient.get("/speaking/exercises");
  },

  getExerciseById: async (id: number): Promise<SpeakingExercise> => {
    return await axiosClient.get(`/speaking/exercises/${id}`);
  },

  submitAudio: async (
    id: number,
    audioBlob: Blob,
    idempotencyKey?: string,
  ): Promise<SubmitSpeakingResponse> => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.wav");

    const key = idempotencyKey || `spk-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    return await axiosClient.post(`/speaking/exercises/${id}/submit`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        "Idempotency-Key": key,
      },
    });
  },

  getSubmission: async (submissionId: number): Promise<SpeakingSubmissionDetail> => {
    return await axiosClient.get(`/speaking/submissions/${submissionId}`);
  },

  getAudioSignedUrl: async (submissionId: number): Promise<{ audioUrl: string }> => {
    return await axiosClient.get(`/speaking/submissions/${submissionId}/audio`);
  },

  getMySubmissions: async (): Promise<SpeakingSubmissionSummary[]> => {
    return await axiosClient.get("/speaking/my-submissions");
  },

  generateTts: async (
    text: string,
    accent: "US" | "UK",
    rate: number,
  ): Promise<Blob> => {
    const response = await axiosClient.post(
      "/speaking/tts",
      { text, accent, rate },
      { responseType: "blob" },
    );
    return response as unknown as Blob;
  },
};
