export const DIAGNOSTIC_SPEAKING_MAX_DURATION_MS = 90_000;
export const DIAGNOSTIC_SPEAKING_MIN_DURATION_MS = 300;

export function selectDiagnosticRecordingMimeType(
  isSupported: (mime: string) => boolean,
): string | undefined {
  return [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg",
  ].find(isSupported);
}

export function isValidDiagnosticRecording(blobSize: number, durationMs: number) {
  return (
    blobSize >= 1000 &&
    durationMs >= DIAGNOSTIC_SPEAKING_MIN_DURATION_MS &&
    durationMs <= DIAGNOSTIC_SPEAKING_MAX_DURATION_MS
  );
}

export function speakingResponseCountsAsEvidence(status: string, score: number | null | undefined) {
  return status === "GRADED" && typeof score === "number";
}
