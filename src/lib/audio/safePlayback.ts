/**
 * Start an HTML audio element only after it has decoded enough data to play.
 *
 * Calling play() immediately after assigning src can race the first network
 * packet and make the first phoneme appear clipped.  This helper deliberately
 * waits for HAVE_CURRENT_DATA (loadeddata/canplay), then rewinds and starts.
 */
export const AUDIO_READY_STATE = 2;
export const OUTPUT_PRIME_DURATION_MS = 100;
export const OUTPUT_WARM_IDLE_MS = 5000;

type AudioContextFactory = () => AudioContext | null;
type Clock = () => number;
type Prime = (signal?: AbortSignal) => Promise<void>;

const abortError = () => new Error("Audio playback was cancelled");

const abortable = <T>(promise: Promise<T>, signal?: AbortSignal) => {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<T>((resolve, reject) => {
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    const onAbort = () => {
      cleanup();
      reject(abortError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error: unknown) => {
        cleanup();
        reject(error);
      },
    );
  });
};

const createBrowserAudioContext: AudioContextFactory = () => {
  if (typeof window === "undefined") return null;
  const Context =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  return Context ? new Context() : null;
};

/**
 * Wakes the browser output graph once, then reuses it until it has been idle.
 * The zero-gain buffer is never the learner's audio and never advances it.
 */
export function createAudioOutputPrimer(
  createContext: AudioContextFactory = createBrowserAudioContext,
  now: Clock = () => Date.now(),
) {
  let context: AudioContext | null = null;
  let lastPrimedAt = 0;
  let activePrime: Promise<void> | null = null;

  const prime: Prime = (signal) => {
    if (activePrime) return abortable(activePrime, signal);
    const currentTime = now();
    if (
      context?.state === "running" &&
      lastPrimedAt > 0 &&
      currentTime - lastPrimedAt < OUTPUT_WARM_IDLE_MS
    ) {
      return Promise.resolve();
    }

    activePrime = (async () => {
      context ??= createContext();
      if (!context) return;
      if (context.state !== "running") await context.resume();
      if (context.state !== "running") {
        throw new Error("Audio output context did not become active");
      }

      const gain = context.createGain();
      const source = context.createBufferSource();
      const duration = OUTPUT_PRIME_DURATION_MS / 1000;
      gain.gain.value = 0;
      gain.connect(context.destination);
      source.buffer = context.createBuffer(
        1,
        Math.max(1, Math.ceil(context.sampleRate * duration)),
        context.sampleRate,
      );
      source.connect(gain);
      const startAt = context.currentTime;
      source.start(startAt);
      source.stop(startAt + duration);

      try {
        await new Promise<void>((resolve) =>
          setTimeout(resolve, OUTPUT_PRIME_DURATION_MS),
        );
      } finally {
        source.disconnect();
        gain.disconnect();
        lastPrimedAt = now();
      }
    })().finally(() => {
      activePrime = null;
    });

    return abortable(activePrime, signal);
  };

  return { prime };
}

const audioOutputPrimer = createAudioOutputPrimer();
export const primeAudioOutput: Prime = (signal) =>
  audioOutputPrimer.prime(signal);

export function waitForAudioReady(
  audio: HTMLAudioElement,
  timeoutMs = 4000,
  signal?: AbortSignal,
): Promise<void> {
  if (audio.readyState >= AUDIO_READY_STATE) return Promise.resolve();
  if (signal?.aborted) return Promise.reject(abortError());

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
      signal?.removeEventListener("abort", handleAbort);
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
    const handleAbort = () => settle(abortError());
    audio.addEventListener("loadeddata", handleReady);
    audio.addEventListener("canplay", handleReady);
    audio.addEventListener("error", handleError);
    signal?.addEventListener("abort", handleAbort, { once: true });
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
  prime: Prime = primeAudioOutput,
  signal?: AbortSignal,
): Promise<void> {
  audio.pause();
  const ready = waitForAudioReady(audio, timeoutMs, signal);
  const output = prime(signal).catch(() => undefined);
  await Promise.all([ready, output]);
  audio.currentTime = 0;
  await audio.play();
}
