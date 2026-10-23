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
  const params = new URLSearchParams();
  if (artifact?.id) params.set("artifactId", String(artifact.id));
  if (artifact?.version) params.set("v", String(artifact.version));
  if (artifact?.checksumSha256) params.set("checksum", artifact.checksumSha256);
  const query = params.toString() ? `?${params.toString()}` : "";
  return `/quizzes/${quizId}/questions/${questionId}/audio${query}`;
}
