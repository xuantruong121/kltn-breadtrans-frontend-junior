import type { SpeakingExercise, SpeakingSubmissionSummary } from "@/lib/api/services/speaking.service";

export type SpeakingMode =
  | "LISTEN_REPEAT"
  | "READ_ALOUD"
  | "QUICK_RESPONSE"
  | "DESCRIBE"
  | "OPINION"
  | "PRONUNCIATION";

export interface SpeakingModeInfo {
  id: SpeakingMode;
  label: string;
  objective: string;
  needsModel: boolean;
}

export interface SpeakingProgressInput {
  completedItems?: number | null;
  totalItems?: number | null;
}

export interface SpeakingProgressPresentation {
  completedItems: number;
  totalItems: number | null;
  completionPercent: number | null;
}

/** Keep completion separate from performance score and never invent a denominator. */
export function presentSpeakingProgress(
  input: SpeakingProgressInput | undefined,
  fallbackCompletedItems = 0,
): SpeakingProgressPresentation {
  const completedItems = Math.max(
    0,
    Math.floor(
      Number.isFinite(input?.completedItems)
        ? Number(input?.completedItems)
        : fallbackCompletedItems,
    ),
  );
  const rawTotal = Number(input?.totalItems);
  const totalItems =
    Number.isFinite(rawTotal) && rawTotal > 0 ? Math.floor(rawTotal) : null;

  return {
    completedItems,
    totalItems,
    completionPercent:
      totalItems === null
        ? null
        : Math.min(
            100,
            Math.round(
              (Math.min(completedItems, totalItems) / totalItems) * 100,
            ),
          ),
  };
}

export function resolveSpeakingMode(exercise: Pick<SpeakingExercise, "title" | "category">): SpeakingModeInfo {
  const text = `${exercise.title ?? ""} ${exercise.category ?? ""}`.toLowerCase();

  if (text.includes("read aloud") || text.includes("đọc thành tiếng")) {
    return { id: "READ_ALOUD", label: "Đọc thành tiếng", objective: "Luyện đọc rõ ràng, liền mạch và đúng ngữ điệu.", needsModel: true };
  }
  if (text.includes("question response") || text.includes("information response") || text.includes("phản hồi")) {
    return { id: "QUICK_RESPONSE", label: "Phản hồi nhanh", objective: "Luyện phản xạ trả lời tự nhiên theo tình huống.", needsModel: false };
  }
  if (text.includes("describe") || text.includes("mô tả")) {
    return { id: "DESCRIBE", label: "Mô tả", objective: "Luyện mô tả thông tin bằng câu nói mạch lạc.", needsModel: false };
  }
  if (text.includes("opinion") || text.includes("express opinion") || text.includes("quan điểm")) {
    return { id: "OPINION", label: "Nêu quan điểm", objective: "Luyện trình bày quan điểm và lý do một cách rõ ràng.", needsModel: false };
  }
  if (text.includes("pronunciation") || text.includes("phát âm")) {
    return { id: "PRONUNCIATION", label: "Phát âm", objective: "Luyện âm cuối, trọng âm và nối âm trong câu.", needsModel: true };
  }
  return { id: "LISTEN_REPEAT", label: "Nghe và lặp lại", objective: "Luyện bắt chước mẫu câu với phát âm và nhịp điệu tự nhiên.", needsModel: true };
}

export function findPreviousCompletedAttempt(
  submissions: SpeakingSubmissionSummary[] | undefined,
  exerciseId: number,
  currentSubmissionId?: number,
): SpeakingSubmissionSummary | null {
  return (submissions ?? [])
    .filter((item) => item.exerciseId === exerciseId && item.id !== currentSubmissionId && item.status === "COMPLETED" && Number.isFinite(item.overallScore))
    .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))[0] ?? null;
}

export function scoreDelta(current?: number | null, previous?: number | null): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  return Math.round((current as number) - (previous as number));
}
