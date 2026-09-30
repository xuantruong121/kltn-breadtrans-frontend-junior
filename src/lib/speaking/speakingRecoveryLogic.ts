export interface StoredPendingSession {
  submissionId: number;
  submittedAt: number;
}

export interface MinimalSubmissionSummary {
  id: number;
  exerciseId: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

const DEFAULT_SESSION_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

/**
 * 3-Tier Durable Recovery Resolver:
 * Tier 1: URL search parameter (?submissionId=...)
 * Tier 2: sessionStorage stored pending session (within maxAgeMs)
 * Tier 3: Server submissions query (latest active PENDING or PROCESSING submission)
 */
export function resolvePendingSubmissionId(params: {
  urlSubId?: string | null;
  sessionStoredRaw?: string | null;
  serverSubmissions?: MinimalSubmissionSummary[];
  exerciseId: number;
  now?: number;
  maxAgeMs?: number;
}): number | null {
  const {
    urlSubId,
    sessionStoredRaw,
    serverSubmissions,
    exerciseId,
    now = Date.now(),
    maxAgeMs = DEFAULT_SESSION_MAX_AGE_MS,
  } = params;

  // Tier 1: URL param takes precedence
  if (urlSubId) {
    const parsed = Number(urlSubId);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  // Tier 2: sessionStorage persistence
  if (sessionStoredRaw) {
    try {
      const parsed: StoredPendingSession = JSON.parse(sessionStoredRaw);
      if (
        parsed.submissionId &&
        typeof parsed.submissionId === 'number' &&
        parsed.submittedAt &&
        now - parsed.submittedAt <= maxAgeMs
      ) {
        return parsed.submissionId;
      }
    } catch {
      // Invalid JSON in storage is safely ignored
    }
  }

  // Tier 3: Server query
  if (serverSubmissions && serverSubmissions.length > 0) {
    const activeSub = serverSubmissions.find(
      (s) =>
        s.exerciseId === exerciseId &&
        (s.status === 'PENDING' || s.status === 'PROCESSING'),
    );
    if (activeSub) {
      return activeSub.id;
    }
  }

  return null;
}

/**
 * Adaptive polling backoff calculation:
 * - 2000ms for attempts 1-5
 * - 3000ms for attempts 6-15
 * - 4500ms for attempts > 15
 */
export function calculatePollingInterval(attempt: number): number {
  if (attempt > 15) return 4500;
  if (attempt > 5) return 3000;
  return 2000;
}

/**
 * Terminal status check determining when polling must stop and storage be cleaned.
 */
export function isTerminalSpeakingStatus(status: string): boolean {
  return status === 'COMPLETED' || status === 'FAILED';
}

export function getSpeakingFailureMessage(errorCode?: string | null): string {
  if (errorCode === 'AUDIO_OBJECT_NOT_FOUND') {
    return 'Không tìm thấy tệp ghi âm của bài nộp. Vui lòng ghi âm và gửi lại.';
  }
  return 'Đánh giá phát âm chưa thành công. Bạn vui lòng thử lại.';
}
