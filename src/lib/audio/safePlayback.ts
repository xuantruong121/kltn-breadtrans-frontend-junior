/**
 * Start an HTML audio element only after it has decoded enough data to play.
 *
 * Calling play() immediately after assigning src can race the first network
 * packet and make the first phoneme appear clipped.  This helper deliberately
 * waits for HAVE_CURRENT_DATA (loadeddata/canplay), then rewinds and starts.
 */
export const AUDIO_READY_STATE = 2;

export function waitForAudioReady(
  audio: HTMLAudioElement,
  timeoutMs = 4000,
): Promise<void> {
  if (audio.readyState >= AUDIO_READY_STATE) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeoutId = setTimeout(
      () => settle(new Error("Audio readiness timed out")),
      timeoutMs,
    );

    const cleanup = () => {
      audio.removeEventListener("loadeddata", handleReady);
      audio.removeEventListener("canplay", handleReady);
      audio.removeEventListener("error", handleError);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };

    const settle = (error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve();
    };

    const handleReady = () => settle();
    const handleError = () =>
      settle(new Error("Audio failed before playback became ready"));
    audio.addEventListener("loadeddata", handleReady);
    audio.addEventListener("canplay", handleReady);
    audio.addEventListener("error", handleError);
    try {
      audio.load();
    } catch (error) {
      settle(error instanceof Error ? error : new Error("Audio load failed"));
    }
  });
}

export async function playAudioFromStart(
  audio: HTMLAudioElement,
  timeoutMs = 4000,
): Promise<void> {
  audio.pause();
  await waitForAudioReady(audio, timeoutMs);
  audio.currentTime = 0;
  await audio.play();
}
