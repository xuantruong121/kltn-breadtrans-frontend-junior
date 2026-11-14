/**
 * Auto-play after "Câu tiếp theo" (owner 2026-11-12): the next question's
 * audio starts by itself, unless it is the same recording the learner just
 * heard. Several questions of a dialogue share one published track, and
 * replaying the whole conversation on every question would get in the way.
 *
 * Pure: no React, no I/O.
 */

/**
 * Identifies the recording behind a question's audio URL. A published
 * artifact is identified by its id. Otherwise the URL without its query
 * string, because a signed URL carries a new signature on every request.
 */
export function audioTrackKey(url: string, artifactId?: number | null): string {
  if (typeof artifactId === "number" && Number.isFinite(artifactId)) {
    return `artifact:${artifactId}`;
  }
  const queryStart = url.indexOf("?");
  return queryStart === -1 ? url : url.slice(0, queryStart);
}

export function shouldAutoPlay(input: {
  requested: boolean;
  previousTrackKey: string | null | undefined;
  trackKey: string;
}): boolean {
  if (!input.requested) return false;
  return input.previousTrackKey !== input.trackKey;
}
