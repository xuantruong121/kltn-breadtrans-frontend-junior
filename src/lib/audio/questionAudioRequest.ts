export type PublishedListeningAudioIdentity = {
  id: number;
  version: number;
  checksumSha256?: string | null;
};

/**
 * The backend reserves `v` for the immutable quiz-level production artifact.
 * Per-question assets are already resolved as the active asset server-side and
 * must not send their version as an artifact identity.
 */
export function buildQuestionAudioRequestPath(
  quizId: number,
  questionId: number,
  artifact?: PublishedListeningAudioIdentity | null,
) {
  return `/quizzes/${quizId}/questions/${questionId}/audio${identityQuery(artifact)}`;
}

/**
 * Asks the backend where to fetch a question's audio; the browser then loads
 * it straight from storage (a public URL, or a signed one for paid content)
 * instead of through the API (capacity run 2026-11-09).
 */
export function buildQuestionAudioUrlRequestPath(
  quizId: number,
  questionId: number,
  artifact?: PublishedListeningAudioIdentity | null,
) {
  return `/quizzes/${quizId}/questions/${questionId}/audio-url${identityQuery(artifact)}`;
}

function identityQuery(artifact?: PublishedListeningAudioIdentity | null) {
  const params = new URLSearchParams();
  if (artifact?.id) params.set("artifactId", String(artifact.id));
  if (artifact?.version) params.set("v", String(artifact.version));
  if (artifact?.checksumSha256) params.set("checksum", artifact.checksumSha256);
  return params.toString() ? `?${params.toString()}` : "";
}
