import type {
  Quiz,
  ListeningTranscriptItem,
  ListeningAudioArtifactIdentity,
} from "@/lib/api/services/quiz.service";

export type TranscriptAuthorizationStatus =
  | "unknown"
  | "authorized"
  | "unauthorized";

export interface TranscriptResourceCacheEntry {
  quizId: number;
  authorizationStatus: TranscriptAuthorizationStatus;
  transcript: ListeningTranscriptItem[] | null;
  audioBlob: Blob | null;
  audioBlobUrl: string | null;
  audioArtifact: ListeningAudioArtifactIdentity | null;
  contentHash: string | null;
  audioError: boolean;
  audioNotice: string | null;
  updatedAt: number;
}

export interface TranscriptResourceFetcher {
  getQuizTranscript: (quizId: number) => Promise<{
    items: ListeningTranscriptItem[];
    audioArtifact?: ListeningAudioArtifactIdentity | null;
    contentHash?: string | null;
    transcriptVersion?: number | string | null;
  }>;
  revealTranscript: (quizId: number) => Promise<{ revealedAt: string }>;
  getTranscriptAudioBlob: (
    quizId: number,
    signal?: AbortSignal,
    artifact?: ListeningAudioArtifactIdentity | null,
  ) => Promise<Blob>;
  createObjectUrl: (blob: Blob) => string;
  revokeObjectUrl: (url: string) => void;
}

let activeFetcher: TranscriptResourceFetcher | null = null;

export function setTranscriptResourceFetcher(fetcher: TranscriptResourceFetcher | null): void {
  activeFetcher = fetcher;
}

async function resolveFetcher(provided?: TranscriptResourceFetcher): Promise<TranscriptResourceFetcher> {
  if (provided) return provided;
  if (activeFetcher) return activeFetcher;

  const { quizService } = await import("@/lib/api/services/quiz.service");
  activeFetcher = {
    getQuizTranscript: (quizId: number) => quizService.getListeningTranscript(quizId),
    revealTranscript: (quizId: number) => quizService.revealListeningTranscript(quizId),
    getTranscriptAudioBlob: (
      quizId: number,
      signal?: AbortSignal,
      artifact?: ListeningAudioArtifactIdentity | null,
    ) => quizService.getListeningTranscriptAudioBlob(quizId, signal, artifact),
    createObjectUrl: (blob: Blob) => URL.createObjectURL(blob),
    revokeObjectUrl: (url: string) => URL.revokeObjectURL(url),
  };
  return activeFetcher;
}

export function computeTranscriptContentHash(
  items: ListeningTranscriptItem[] | null | undefined,
): string {
  if (!items || items.length === 0) return "empty";
  const sig = items
    .map(
      (item) =>
        `${item.questionId}_${item.order}_${item.transcript}_${item.startMs ?? 0}_${item.endMs ?? 0}`,
    )
    .join("|");
  let hash = 0;
  for (let i = 0; i < sig.length; i++) {
    hash = (Math.imul(31, hash) + sig.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16);
}

export function isIdentityMatching(
  cachedEntry: TranscriptResourceCacheEntry,
  expected?: {
    listeningAudioArtifact?: ListeningAudioArtifactIdentity | null;
    audioArtifact?: ListeningAudioArtifactIdentity | null;
    contentHash?: string | null;
    transcriptVersion?: number | string | null;
  } | ListeningAudioArtifactIdentity | null,
): boolean {
  if (!expected) return true;

  let expectedArtifact: ListeningAudioArtifactIdentity | null | undefined = undefined;

  if (typeof expected === "object" && expected !== null) {
    if ("listeningAudioArtifact" in expected) {
      expectedArtifact = expected.listeningAudioArtifact;
    } else if ("audioArtifact" in expected) {
      expectedArtifact = expected.audioArtifact;
    } else if ("id" in expected || "version" in expected || "checksumSha256" in expected) {
      expectedArtifact = expected as ListeningAudioArtifactIdentity;
    }
  }

  if (expectedArtifact !== undefined) {
    const cachedArt = cachedEntry.audioArtifact;
    const expArt = expectedArtifact;
    if (expArt === null && cachedArt !== null) return false;
    if (expArt !== null && cachedArt === null) return false;
    if (expArt && cachedArt) {
      if (typeof expArt.id === "number" && expArt.id !== cachedArt.id) return false;
      if (typeof expArt.version === "number" && expArt.version !== cachedArt.version) return false;

      // Strict checksum comparison:
      // If expected checksum is present, cached must match; missing or different is rejected
      if (expArt.checksumSha256 !== undefined && expArt.checksumSha256 !== null) {
        if (!cachedArt.checksumSha256 || cachedArt.checksumSha256 !== expArt.checksumSha256) {
          return false;
        }
      }
      if (
        cachedArt.checksumSha256 &&
        expArt.checksumSha256 &&
        cachedArt.checksumSha256 !== expArt.checksumSha256
      ) {
        return false;
      }
    }
  }

  if (typeof expected === "object" && expected !== null) {
    if ("contentHash" in expected && expected.contentHash !== undefined && expected.contentHash !== null) {
      if (cachedEntry.contentHash !== expected.contentHash) {
        return false;
      }
    }
  }

  return true;
}

interface ConsumerHandle {
  id: symbol;
  heldUrls: Set<string>;
}

const cacheByQuizId = new Map<number, TranscriptResourceCacheEntry>();
const activeConsumersByQuizId = new Map<number, Set<ConsumerHandle>>();
const urlRefCounts = new Map<string, number>();
const urlRevokers = new Map<string, (url: string) => void>();

function toRevokerFn(
  revoker?: ((url: string) => void) | Pick<TranscriptResourceFetcher, "revokeObjectUrl">,
): ((url: string) => void) | undefined {
  if (typeof revoker === "function") return revoker;
  if (revoker && typeof revoker.revokeObjectUrl === "function") {
    return (u: string) => revoker.revokeObjectUrl(u);
  }
  return undefined;
}

function incrementUrlRef(url: string, revoker?: (url: string) => void): void {
  const current = urlRefCounts.get(url) ?? 0;
  urlRefCounts.set(url, current + 1);
  if (revoker && !urlRevokers.has(url)) {
    urlRevokers.set(url, revoker);
  }
}

function decrementUrlRef(url: string, fallbackRevoker?: (url: string) => void): void {
  const current = urlRefCounts.get(url);
  if (current === undefined) return;
  const next = current - 1;
  if (next <= 0) {
    urlRefCounts.delete(url);
    const revoker =
      urlRevokers.get(url) ??
      fallbackRevoker ??
      (activeFetcher ? (u) => activeFetcher!.revokeObjectUrl(u) : undefined);
    try {
      if (revoker) {
        revoker(url);
      } else if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(url);
      }
    } catch {
      // ignore
    }
    urlRevokers.delete(url);
  } else {
    urlRefCounts.set(url, next);
  }
}

function registerQuizBlobUrl(
  quizId: number,
  url: string,
  customRevoker?: ((url: string) => void) | Pick<TranscriptResourceFetcher, "revokeObjectUrl">,
): void {
  const revokerFn = toRevokerFn(customRevoker);
  if (revokerFn) {
    urlRevokers.set(url, revokerFn);
  }

  const consumers = activeConsumersByQuizId.get(quizId);
  if (consumers && consumers.size > 0) {
    for (const consumer of consumers) {
      if (!consumer.heldUrls.has(url)) {
        consumer.heldUrls.add(url);
        incrementUrlRef(url, revokerFn);
      }
    }
  } else {
    // If no consumers currently active, track URL with 0 initial ref
    if (!urlRefCounts.has(url)) {
      urlRefCounts.set(url, 0);
    }
  }
}

export function retainTranscriptConsumer(
  quizId: number,
  customRevoker?: ((url: string) => void) | Pick<TranscriptResourceFetcher, "revokeObjectUrl">,
): () => void {
  const revokerFn = toRevokerFn(customRevoker);
  let consumers = activeConsumersByQuizId.get(quizId);
  if (!consumers) {
    consumers = new Set();
    activeConsumersByQuizId.set(quizId, consumers);
  }

  const handle: ConsumerHandle = {
    id: Symbol(),
    heldUrls: new Set<string>(),
  };
  consumers.add(handle);

  // If this quiz already has cached audio Blob URL, acquire it
  const cached = cacheByQuizId.get(quizId);
  if (cached?.audioBlobUrl) {
    handle.heldUrls.add(cached.audioBlobUrl);
    incrementUrlRef(cached.audioBlobUrl, revokerFn);
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;

    consumers.delete(handle);
    if (consumers.size === 0) {
      activeConsumersByQuizId.delete(quizId);
    }

    // Release all URLs held by this consumer lease
    for (const url of handle.heldUrls) {
      decrementUrlRef(url, revokerFn);
    }
    handle.heldUrls.clear();

    const remaining = activeConsumersByQuizId.get(quizId)?.size ?? 0;
    if (remaining === 0) {
      const entry = cacheByQuizId.get(quizId);
      if (entry?.audioBlobUrl && !urlRefCounts.has(entry.audioBlobUrl)) {
        entry.audioBlobUrl = null;
      }
    }
  };
}

export function releaseTranscriptConsumer(
  quizId: number,
  customRevoker?: ((url: string) => void) | Pick<TranscriptResourceFetcher, "revokeObjectUrl">,
): void {
  const consumers = activeConsumersByQuizId.get(quizId);
  if (consumers && consumers.size > 0) {
    const first = consumers.values().next().value;
    if (first) {
      consumers.delete(first);
      if (consumers.size === 0) {
        activeConsumersByQuizId.delete(quizId);
      }
      for (const u of first.heldUrls) {
        decrementUrlRef(u, toRevokerFn(customRevoker));
      }
      first.heldUrls.clear();
    }
  }
}

export function getActiveConsumerCount(quizId: number): number {
  return activeConsumersByQuizId.get(quizId)?.size ?? 0;
}

export function quizContainsDictation(quiz: {
  questions?: Array<{ type?: string }>;
  mode?: string;
}): boolean {
  if (quiz.mode === "DIALOGUE") return false;
  if (!Array.isArray(quiz.questions)) return false;
  return quiz.questions.some((q) => q.type === "DICTATION");
}

export function getCachedTranscriptResources(
  quizId: number,
  expected?: {
    listeningAudioArtifact?: ListeningAudioArtifactIdentity | null;
    audioArtifact?: ListeningAudioArtifactIdentity | null;
    contentHash?: string | null;
    transcriptVersion?: number | string | null;
  } | ListeningAudioArtifactIdentity | null,
  customRevoker?: ((url: string) => void) | Pick<TranscriptResourceFetcher, "revokeObjectUrl">,
): TranscriptResourceCacheEntry | undefined {
  const cached = cacheByQuizId.get(quizId);
  if (!cached) return undefined;

  if (expected && !isIdentityMatching(cached, expected)) {
    // Identity changed: invalidate and clear
    clearTranscriptResourceCache(quizId, customRevoker);
    return undefined;
  }

  return cached;
}

export function clearTranscriptResourceCache(
  quizId?: number,
  customRevoker?: ((url: string) => void) | Pick<TranscriptResourceFetcher, "revokeObjectUrl">,
): void {
  const revoker = toRevokerFn(customRevoker);
  if (typeof quizId === "number") {
    const entry = cacheByQuizId.get(quizId);
    if (entry?.audioBlobUrl) {
      decrementUrlRef(entry.audioBlobUrl, revoker);
      if (urlRefCounts.has(entry.audioBlobUrl)) {
        const r =
          revoker ??
          urlRevokers.get(entry.audioBlobUrl) ??
          (activeFetcher ? (u) => activeFetcher!.revokeObjectUrl(u) : undefined);
        try {
          if (r) r(entry.audioBlobUrl);
          else if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
            URL.revokeObjectURL(entry.audioBlobUrl);
          }
        } catch {
          // ignore
        }
        urlRefCounts.delete(entry.audioBlobUrl);
      }
      entry.audioBlobUrl = null;
    }
    const consumers = activeConsumersByQuizId.get(quizId);
    if (consumers) {
      for (const c of consumers) {
        for (const u of c.heldUrls) {
          decrementUrlRef(u, revoker);
        }
      }
      activeConsumersByQuizId.delete(quizId);
    }
    cacheByQuizId.delete(quizId);
    inFlightProbes.delete(quizId);
    inFlightReveals.delete(quizId);
    return;
  }

  for (const qId of Array.from(cacheByQuizId.keys())) {
    clearTranscriptResourceCache(qId, customRevoker);
  }
  cacheByQuizId.clear();
  activeConsumersByQuizId.clear();
  urlRefCounts.clear();
  urlRevokers.clear();
  inFlightProbes.clear();
  inFlightReveals.clear();
}

interface InFlightTask<T> {
  promise: Promise<T>;
  abortController: AbortController;
  subscribers: Set<{
    signal?: AbortSignal;
    onAbort?: () => void;
  }>;
}

const inFlightProbes = new Map<number, InFlightTask<TranscriptResourceCacheEntry>>();
const inFlightReveals = new Map<number, InFlightTask<TranscriptResourceCacheEntry>>();

function createAbortError(): Error {
  const err = new Error("This operation was aborted");
  err.name = "AbortError";
  return err;
}

function runInFlightTask<T>(
  taskMap: Map<number, InFlightTask<T>>,
  quizId: number,
  signal: AbortSignal | undefined,
  executor: (internalSignal: AbortSignal) => Promise<T>,
): Promise<T> {
  if (signal?.aborted) {
    return Promise.reject(createAbortError());
  }

  let task = taskMap.get(quizId);

  if (!task) {
    const abortController = new AbortController();
    const subscribers = new Set<{
      signal?: AbortSignal;
      onAbort?: () => void;
    }>();

    const rawPromise = executor(abortController.signal);

    const cleanup = () => {
      if (taskMap.get(quizId) === task) {
        taskMap.delete(quizId);
      }
    };

    rawPromise.then(cleanup, cleanup);

    task = {
      promise: rawPromise,
      abortController,
      subscribers,
    };
    taskMap.set(quizId, task);
  }

  const currentTask = task;

  return new Promise<T>((resolve, reject) => {
    const sub: { signal?: AbortSignal; onAbort?: () => void } = { signal };

    const handleAbort = () => {
      if (sub.signal) {
        sub.signal.removeEventListener("abort", handleAbort);
      }
      currentTask.subscribers.delete(sub);

      if (currentTask.subscribers.size === 0) {
        currentTask.abortController.abort();
        if (taskMap.get(quizId) === currentTask) {
          taskMap.delete(quizId);
        }
      }

      reject(createAbortError());
    };

    sub.onAbort = handleAbort;

    if (signal) {
      signal.addEventListener("abort", handleAbort, { once: true });
    }
    currentTask.subscribers.add(sub);

    currentTask.promise.then(
      (result) => {
        if (signal) {
          signal.removeEventListener("abort", handleAbort);
        }
        currentTask.subscribers.delete(sub);
        resolve(result);
      },
      (err) => {
        if (signal) {
          signal.removeEventListener("abort", handleAbort);
        }
        currentTask.subscribers.delete(sub);
        reject(err);
      },
    );
  });
}

/**
 * Safely probes or prefetches transcript resources during initial load.
 *
 * Validates fresh server content against any existing cached entry:
 * - If server transcript content changed, invalidates stale cache and fetches fresh audio.
 */
export async function probeOrPrefetchTranscript(
  quizId: number,
  quiz: Quiz,
  signal?: AbortSignal,
  customFetcher?: TranscriptResourceFetcher,
): Promise<TranscriptResourceCacheEntry> {
  const cached = cacheByQuizId.get(quizId);
  if (cached) {
    if (isIdentityMatching(cached, quiz)) {
      if (cached.transcript && cached.authorizationStatus === "authorized") {
        return cached;
      }
      if (cached.authorizationStatus === "unauthorized") {
        return cached;
      }
    } else {
      clearTranscriptResourceCache(quizId, customFetcher);
    }
  }

  return runInFlightTask(inFlightProbes, quizId, signal, async (internalSignal) => {
    const fetcher = await resolveFetcher(customFetcher);
    const hasDictation = quizContainsDictation(quiz);

    if (!hasDictation) {
      return await fetchAuthorizedResources(quizId, quiz, internalSignal, fetcher);
    }

    let transcriptResult: {
      items: ListeningTranscriptItem[];
      audioArtifact?: ListeningAudioArtifactIdentity | null;
      contentHash?: string | null;
      transcriptVersion?: number | string | null;
    };

    try {
      if (internalSignal.aborted) throw createAbortError();
      transcriptResult = await fetcher.getQuizTranscript(quizId);
    } catch (error: any) {
      if (internalSignal.aborted || error?.name === "AbortError") {
        throw createAbortError();
      }
      const status = error?.response?.status ?? error?.status;
      if (
        status === 403 ||
        error?.message?.includes("xác nhận xem transcript")
      ) {
        const entry: TranscriptResourceCacheEntry = {
          quizId,
          authorizationStatus: "unauthorized",
          transcript: null,
          audioBlob: null,
          audioBlobUrl: null,
          audioArtifact: quiz.listeningAudioArtifact ?? null,
          contentHash: null,
          audioError: false,
          audioNotice: null,
          updatedAt: Date.now(),
        };
        cacheByQuizId.set(quizId, entry);
        return entry;
      }
      throw error;
    }

    // 200 OK: Check if server transcript content changed compared to cached
    const freshHash =
      transcriptResult.contentHash ?? computeTranscriptContentHash(transcriptResult.items);
    const existing = cacheByQuizId.get(quizId);
    if (existing && existing.contentHash && existing.contentHash !== freshHash) {
      // Content changed on server: invalidate old cache
      clearTranscriptResourceCache(quizId, fetcher);
    }

    return await fetchAudioForTranscript(
      quizId,
      quiz,
      transcriptResult,
      internalSignal,
      fetcher,
    );
  });
}

/**
 * Called ONLY when the learner explicitly opens the Full Transcript tab or clicks retry.
 */
export async function revealAndFetchTranscript(
  quizId: number,
  quiz: Quiz,
  signal?: AbortSignal,
  customFetcher?: TranscriptResourceFetcher,
  forceReload = false,
): Promise<TranscriptResourceCacheEntry> {
  if (!forceReload) {
    const cached = cacheByQuizId.get(quizId);
    if (cached) {
      if (isIdentityMatching(cached, quiz)) {
        if (cached.transcript && cached.authorizationStatus === "authorized") {
          return cached;
        }
      } else {
        clearTranscriptResourceCache(quizId, customFetcher);
      }
    }
  }

  const hasDictation = quizContainsDictation(quiz);

  return runInFlightTask(inFlightReveals, quizId, signal, async (internalSignal) => {
    if (internalSignal.aborted) throw createAbortError();
    const fetcher = await resolveFetcher(customFetcher);

    if (hasDictation) {
      await fetcher.revealTranscript(quizId);
    }
    return await fetchAuthorizedResources(quizId, quiz, internalSignal, fetcher);
  });
}

/**
 * Actively checks server transcript content and invalidates stale cache if content changed.
 */
export async function revalidateOrFetchTranscript(
  quizId: number,
  quiz: Quiz,
  signal?: AbortSignal,
  customFetcher?: TranscriptResourceFetcher,
): Promise<TranscriptResourceCacheEntry> {
  const fetcher = await resolveFetcher(customFetcher);
  const cached = cacheByQuizId.get(quizId);

  if (quizContainsDictation(quiz) && cached?.authorizationStatus !== "authorized") {
    return await probeOrPrefetchTranscript(quizId, quiz, signal, fetcher);
  }

  const transcriptResult = await fetcher.getQuizTranscript(quizId);
  const freshHash =
    transcriptResult.contentHash ?? computeTranscriptContentHash(transcriptResult.items);

  if (cached && cached.contentHash && cached.contentHash !== freshHash) {
    clearTranscriptResourceCache(quizId, fetcher);
  }

  return await revealAndFetchTranscript(quizId, quiz, signal, fetcher);
}

async function fetchAuthorizedResources(
  quizId: number,
  quiz: Quiz,
  signal: AbortSignal,
  fetcher: TranscriptResourceFetcher,
): Promise<TranscriptResourceCacheEntry> {
  if (signal.aborted) {
    throw createAbortError();
  }
  const quizAudioArtifact = quiz.listeningAudioArtifact;

  if (quizAudioArtifact) {
    const [transcriptSettled, audioSettled] = await Promise.allSettled([
      fetcher.getQuizTranscript(quizId),
      fetcher.getTranscriptAudioBlob(quizId, signal, quizAudioArtifact),
    ]);

    if (signal.aborted) {
      throw createAbortError();
    }

    if (transcriptSettled.status === "rejected") {
      throw transcriptSettled.reason;
    }

    const transcriptResult = transcriptSettled.value;
    const effectiveArtifact = quizAudioArtifact ?? transcriptResult.audioArtifact ?? null;
    const contentHash =
      transcriptResult.contentHash ?? computeTranscriptContentHash(transcriptResult.items);

    // If cached entry has mismatched contentHash with fresh server result, stale audio cannot be kept
    const existing = cacheByQuizId.get(quizId);
    if (existing && existing.contentHash && existing.contentHash !== contentHash) {
      if (existing.audioBlobUrl) {
        decrementUrlRef(existing.audioBlobUrl, (u) => fetcher.revokeObjectUrl(u));
      }
    }

    let audioBlob: Blob | null = null;
    let audioBlobUrl: string | null = null;
    let audioError = false;
    let audioNotice: string | null = null;

    if (audioSettled.status === "fulfilled") {
      audioBlob = audioSettled.value;
      audioBlobUrl = fetcher.createObjectUrl(audioBlob);
      if (existing?.audioBlobUrl && existing.audioBlobUrl !== audioBlobUrl) {
        if ((urlRefCounts.get(existing.audioBlobUrl) ?? 0) <= 0) {
          const r = urlRevokers.get(existing.audioBlobUrl) ?? toRevokerFn(fetcher);
          try { r?.(existing.audioBlobUrl); } catch { /* ignore */ }
          urlRefCounts.delete(existing.audioBlobUrl);
          urlRevokers.delete(existing.audioBlobUrl);
        }
      }
      registerQuizBlobUrl(quizId, audioBlobUrl, fetcher);
    } else {
      audioError = true;
      audioNotice =
        "Bản ghi âm toàn bài đang được quản trị viên chuẩn bị. Bạn vẫn có thể xem kịch bản.";
    }

    const entry: TranscriptResourceCacheEntry = {
      quizId,
      authorizationStatus: "authorized",
      transcript: transcriptResult.items,
      audioBlob,
      audioBlobUrl,
      audioArtifact: effectiveArtifact,
      contentHash,
      audioError,
      audioNotice,
      updatedAt: Date.now(),
    };
    cacheByQuizId.set(quizId, entry);
    return entry;
  }

  const transcriptResult = await fetcher.getQuizTranscript(quizId);
  if (signal.aborted) {
    throw createAbortError();
  }
  return await fetchAudioForTranscript(
    quizId,
    quiz,
    transcriptResult,
    signal,
    fetcher,
  );
}

async function fetchAudioForTranscript(
  quizId: number,
  quiz: Quiz,
  transcriptResult: {
    items: ListeningTranscriptItem[];
    audioArtifact?: ListeningAudioArtifactIdentity | null;
    contentHash?: string | null;
  },
  signal: AbortSignal,
  fetcher: TranscriptResourceFetcher,
): Promise<TranscriptResourceCacheEntry> {
  if (signal.aborted) {
    throw createAbortError();
  }
  const effectiveArtifact =
    quiz.listeningAudioArtifact ?? transcriptResult.audioArtifact ?? null;
  const contentHash =
    transcriptResult.contentHash ?? computeTranscriptContentHash(transcriptResult.items);

  const existing = cacheByQuizId.get(quizId);
  if (existing && existing.contentHash && existing.contentHash !== contentHash) {
    if (existing.audioBlobUrl) {
      decrementUrlRef(existing.audioBlobUrl, (u) => fetcher.revokeObjectUrl(u));
    }
  }

  let audioBlob: Blob | null = null;
  let audioBlobUrl: string | null = null;
  let audioError = false;
  let audioNotice: string | null = null;

  try {
    audioBlob = await fetcher.getTranscriptAudioBlob(
      quizId,
      signal,
      effectiveArtifact,
    );
    if (signal.aborted) {
      throw createAbortError();
    }
    audioBlobUrl = fetcher.createObjectUrl(audioBlob);
    if (existing?.audioBlobUrl && existing.audioBlobUrl !== audioBlobUrl) {
      if ((urlRefCounts.get(existing.audioBlobUrl) ?? 0) <= 0) {
        const r = urlRevokers.get(existing.audioBlobUrl) ?? toRevokerFn(fetcher);
        try { r?.(existing.audioBlobUrl); } catch { /* ignore */ }
        urlRefCounts.delete(existing.audioBlobUrl);
        urlRevokers.delete(existing.audioBlobUrl);
      }
    }
    registerQuizBlobUrl(quizId, audioBlobUrl, fetcher);
  } catch (err: any) {
    if (signal.aborted || err?.name === "AbortError") {
      throw createAbortError();
    }
    audioError = true;
    audioNotice =
      "Bản ghi âm toàn bài đang được quản trị viên chuẩn bị. Bạn vẫn có thể xem kịch bản.";
  }

  const entry: TranscriptResourceCacheEntry = {
    quizId,
    authorizationStatus: "authorized",
    transcript: transcriptResult.items,
    audioBlob,
    audioBlobUrl,
    audioArtifact: effectiveArtifact,
    contentHash,
    audioError,
    audioNotice,
    updatedAt: Date.now(),
  };
  cacheByQuizId.set(quizId, entry);
  return entry;
}
