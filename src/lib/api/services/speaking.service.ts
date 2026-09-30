import axiosClient from "../axiosClient";

export interface SpeakingExercise {
  id: number;
  title: string;
  targetText: string;
  imageUrl?: string;
  audioUrl?: string;
  difficulty: string;
  category: string;
  translation?: string;
  description?: string;
  isCompleted?: boolean;
  practiceSet?: SpeakingPracticeSetSummary;
}

export interface SpeakingPracticeSetSummary {
  key: string;
  title: string;
  description: string;
  category: string;
  exerciseCount: number;
  completedCount: number;
  exerciseIds: number[];
  difficultyLabel: string;
  position: number;
  isCompleted: boolean;
}

export interface SubmitSpeakingResponse {
  submissionId: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  pollUrl: string;
  acceptedAt: string;
}

export interface WordAssessmentItem {
  word: string;
  accuracyScore?: number | null;
  errorType:
    | "None"
    | "Mispronunciation"
    | "Omission"
    | "Insertion"
    | "Unspoken";
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

export interface SpeakingCapabilities {
  uploadMode: "presigned" | "proxy";
  maxSizeBytes: number;
  maxDurationMs: number;
  minDurationMs: number;
  allowedContentTypes: string[];
}

export interface UploadIntentResponse {
  uploadIntentId: string;
  uploadUrl: string;
  signedHeaders: Record<string, string>;
  objectKey: string;
  expiresAt: string;
  maxSizeBytes: number;
  isAlreadyFinalized: boolean;
  submissionId?: number;
  pollUrl?: string;
}

export const speakingService = {
  getCapabilities: async (): Promise<SpeakingCapabilities> => {
    try {
      return await axiosClient.get("/speaking/capabilities");
    } catch {
      // Fallback defaults
      return {
        uploadMode: "presigned",
        maxSizeBytes: 10 * 1024 * 1024,
        maxDurationMs: 45000,
        minDurationMs: 300,
        allowedContentTypes: ["audio/wav", "audio/x-wav"],
      };
    }
  },

  createUploadIntent: async (
    exerciseId: number,
    data: {
      contentType: string;
      sizeBytes: number;
      durationMs: number;
      idempotencyKey: string;
    },
    traceId?: string,
  ): Promise<UploadIntentResponse> => {
    return await axiosClient.post(
      `/speaking/exercises/${exerciseId}/upload-intents`,
      data,
      {
        headers: traceId ? { "x-trace-id": traceId } : undefined,
      },
    );
  },

  uploadAudioDirectToR2: async (
    uploadUrl: string,
    blob: Blob,
    signedHeaders: Record<string, string> = { "Content-Type": "audio/wav" },
    onProgress?: (percent: number) => void,
    abortSignal?: AbortSignal,
  ): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);

      for (const [header, val] of Object.entries(signedHeaders)) {
        xhr.setRequestHeader(header, val);
      }

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(
            new Error(
              `Storage upload failed with status ${xhr.status}: ${xhr.statusText}`,
            ),
          );
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network error during direct storage upload"));
      };

      xhr.ontimeout = () => {
        reject(new Error("Storage upload timed out"));
      };

      xhr.onabort = () => {
        reject(new Error("Upload aborted by user"));
      };

      if (abortSignal) {
        abortSignal.addEventListener("abort", () => {
          xhr.abort();
        });
      }

      xhr.send(blob);
    });
  },

  finalizeUpload: async (
    uploadIntentId: string,
    traceId?: string,
  ): Promise<SubmitSpeakingResponse> => {
    return await axiosClient.post(
      `/speaking/upload-intents/${uploadIntentId}/finalize`,
      {},
      {
        headers: traceId ? { "x-trace-id": traceId } : undefined,
      },
    );
  },

  getExercises: async (): Promise<SpeakingExercise[]> => {
    return await axiosClient.get("/speaking/exercises");
  },

  getExerciseById: async (id: number): Promise<SpeakingExercise> => {
    return await axiosClient.get(`/speaking/exercises/${id}`);
  },

  /**
   * @deprecated Phase 2 legacy multipart route. Use direct-to-R2 uploadIntent + finalizeUpload.
   */
  submitAudio: async (
    id: number,
    audioBlob: Blob,
    idempotencyKey?: string,
    traceId?: string,
  ): Promise<SubmitSpeakingResponse> => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.wav");

    const key =
      idempotencyKey ||
      `spk-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const effectiveTraceId =
      traceId ||
      `spk-trace-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    return await axiosClient.post(
      `/speaking/exercises/${id}/submit`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          "Idempotency-Key": key,
          "x-trace-id": effectiveTraceId,
        },
      },
    );
  },

  getSubmission: async (
    submissionId: number,
  ): Promise<SpeakingSubmissionDetail> => {
    return await axiosClient.get(`/speaking/submissions/${submissionId}`);
  },

  getAudioSignedUrl: async (
    submissionId: number,
  ): Promise<{ audioUrl: string }> => {
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
