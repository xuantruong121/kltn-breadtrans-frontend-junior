/**
 * Length of a finished recording, measured from the recording itself.
 *
 * The client used to report a stopwatch (start() to onstop). With a real
 * microphone the first samples can arrive a second or more after start()
 * (device warm-up, Bluetooth profile switch), so the stopwatch ran longer
 * than the audio and the server - which decodes the file - refused it as a
 * duration mismatch. Decoding the Blob gives the same figure the server
 * measures. Null when the browser cannot decode it; the server still decodes
 * and judges the file either way.
 */
export async function measureRecordingDurationMs(blob: Blob): Promise<number | null> {
  const Ctx =
    typeof window !== "undefined"
      ? (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
      : undefined;
  if (!Ctx) return null;
  const ctx = new Ctx();
  try {
    const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
    return Math.round(buffer.duration * 1000);
  } catch {
    return null;
  } finally {
    void ctx.close().catch(() => undefined);
  }
}

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
