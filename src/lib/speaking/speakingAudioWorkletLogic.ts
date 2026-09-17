/**
 * Pure, testable helpers for AudioWorklet audio recording,
 * sequence validation, chunk merging, and flush management.
 */

export interface SequenceValidationResult {
  valid: boolean;
  expected: number;
  gap: number;
}

/**
 * Checks whether the current browser environment supports the modern AudioWorklet API.
 */
export function isAudioWorkletSupported(): boolean {
  if (typeof window === "undefined") return false;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  return Boolean(
    AudioCtx &&
      "audioWorklet" in AudioCtx.prototype &&
      typeof AudioWorkletNode !== "undefined",
  );
}

/**
 * Validates strictly sequential chunk delivery from the AudioWorklet thread.
 * Detects dropped chunks (gap > 0) or duplicated/out-of-order chunks (gap < 0).
 */
export function validateChunkSequence(
  lastSeq: number | null,
  nextSeq: number,
): SequenceValidationResult {
  if (lastSeq === null) {
    return {
      valid: true,
      expected: nextSeq,
      gap: 0,
    };
  }

  const expected = lastSeq + 1;
  const gap = nextSeq - expected;

  return {
    valid: gap === 0,
    expected,
    gap,
  };
}

/**
 * Merges an array of Float32Array audio chunks into a single continuous Float32Array.
 */
export function mergeAudioChunks(chunks: Float32Array[]): Float32Array {
  let totalLength = 0;
  for (const chunk of chunks) {
    totalLength += chunk.length;
  }

  if (totalLength === 0) {
    return new Float32Array(0);
  }

  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

export interface WorkletFlushController {
  flush: () => Promise<boolean>;
  onFlushedMessage: () => void;
  cancel: () => void;
}

/**
 * Manages the graceful flush handshake between Main Thread and AudioWorklet.
 * Ensures the worklet delivers its final buffered samples before audio tracks are stopped,
 * with a fallback timeout to prevent hanging.
 */
export function createWorkletFlushController(
  node: { port: { postMessage: (msg: unknown) => void } } | null,
  timeoutMs = 600,
): WorkletFlushController {
  let resolver: ((flushedNormally: boolean) => void) | null = null;
  let timer: NodeJS.Timeout | null = null;

  const cleanup = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    resolver = null;
  };

  const flush = (): Promise<boolean> => {
    if (!node) return Promise.resolve(true);

    return new Promise<boolean>((resolve) => {
      resolver = resolve;

      timer = setTimeout(() => {
        if (resolver) {
          resolver(false); // Timed out waiting for flush
          cleanup();
        }
      }, timeoutMs);

      try {
        node.port.postMessage({ type: "flush" });
      } catch {
        if (resolver) {
          resolver(false);
          cleanup();
        }
      }
    });
  };

  const onFlushedMessage = () => {
    if (resolver) {
      resolver(true); // Successfully flushed
      cleanup();
    }
  };

  const cancel = () => {
    cleanup();
  };

  return {
    flush,
    onFlushedMessage,
    cancel,
  };
}
