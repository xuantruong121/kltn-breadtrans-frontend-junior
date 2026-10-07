import test from "node:test";
import assert from "node:assert/strict";
import {
  probeOrPrefetchTranscript,
  revealAndFetchTranscript,
  revalidateOrFetchTranscript,
  getCachedTranscriptResources,
  clearTranscriptResourceCache,
  quizContainsDictation,
  retainTranscriptConsumer,
  releaseTranscriptConsumer,
  getActiveConsumerCount,
  isIdentityMatching,
  computeTranscriptContentHash,
  type TranscriptResourceFetcher,
} from "./listeningTranscriptResources.ts";
import type {
  Quiz,
  ListeningTranscriptItem,
  ListeningAudioArtifactIdentity,
} from "@/lib/api/services/quiz.service";

function createMockFetcher(overrides: Partial<TranscriptResourceFetcher> = {}) {
  const calls = {
    getQuizTranscript: [] as number[],
    revealTranscript: [] as number[],
    getTranscriptAudioBlob: [] as Array<{
      quizId: number;
      artifact?: ListeningAudioArtifactIdentity | null;
    }>,
    createObjectUrl: [] as Blob[],
    revokeObjectUrl: [] as string[],
  };

  const sampleItems: ListeningTranscriptItem[] = [
    {
      questionId: 101,
      order: 1,
      transcript: "Hello, this is a test sentence.",
      translation: "Xin chào, đây là câu kiểm thử.",
    },
    {
      questionId: 102,
      order: 2,
      transcript: "Second sentence for playback.",
      translation: "Câu thứ hai để phát lại.",
    },
  ];

  const sampleBlob = new Blob(["mock-audio-data"], { type: "audio/mpeg" });

  const fetcher: TranscriptResourceFetcher = {
    getQuizTranscript: async (quizId) => {
      calls.getQuizTranscript.push(quizId);
      return {
        items: sampleItems,
        audioArtifact: { id: 1, version: 1, checksumSha256: "abc", durationMs: 5000 },
      };
    },
    revealTranscript: async (quizId) => {
      calls.revealTranscript.push(quizId);
      return { revealedAt: new Date().toISOString() };
    },
    getTranscriptAudioBlob: async (quizId, _signal, artifact) => {
      calls.getTranscriptAudioBlob.push({ quizId, artifact });
      return sampleBlob;
    },
    createObjectUrl: (blob) => {
      calls.createObjectUrl.push(blob);
      return `blob:mock-url-${calls.createObjectUrl.length}`;
    },
    revokeObjectUrl: (url) => {
      calls.revokeObjectUrl.push(url);
    },
    ...overrides,
  };

  return { fetcher, calls, sampleItems, sampleBlob };
}

function createSampleQuiz(hasDictation = true, withArtifact = true): Quiz {
  return {
    id: 42,
    title: "Test Listening Quiz",
    type: "LISTENING_PRACTICE",
    mode: hasDictation ? "DICTATION" : "DIALOGUE",
    listeningAudioArtifact: withArtifact
      ? { id: 1, version: 1, checksumSha256: "abc", durationMs: 5000 }
      : null,
    questions: [
      {
        id: 101,
        type: hasDictation ? "DICTATION" : "DIALOGUE",
        order: 1,
        content: {},
      },
      {
        id: 102,
        type: hasDictation ? "DICTATION" : "DIALOGUE",
        order: 2,
        content: {},
      },
    ],
  } as any;
}

test.beforeEach(() => {
  clearTranscriptResourceCache();
});

// =========================================================================
// 1. Answer Security Tests
// =========================================================================

test("Security: Unrevealed Dictation probe does NOT call reveal and does not store transcript text", async () => {
  const { fetcher, calls } = createMockFetcher({
    getQuizTranscript: async (quizId) => {
      calls.getQuizTranscript.push(quizId);
      const error: any = new Error("Hãy xác nhận xem transcript trước khi tải nội dung.");
      error.response = { status: 403 };
      throw error;
    },
  });

  const quiz = createSampleQuiz(true);
  const entry = await probeOrPrefetchTranscript(quiz.id, quiz, undefined, fetcher);

  // Assert POST /reveal was NOT called
  assert.equal(calls.revealTranscript.length, 0);
  // Assert probe GET /transcript was called once to test authorization
  assert.equal(calls.getQuizTranscript.length, 1);
  // Assert audio was NOT downloaded
  assert.equal(calls.getTranscriptAudioBlob.length, 0);
  // Assert state is marked unauthorized
  assert.equal(entry.authorizationStatus, "unauthorized");
  // Assert transcript answers are completely null (not in state or cache)
  assert.equal(entry.transcript, null);
  assert.equal(entry.audioBlob, null);
});

test("Security & UX: Explicit reveal action triggers reveal exactly once and loads resources", async () => {
  let isRevealed = false;
  const { fetcher, calls } = createMockFetcher({
    getQuizTranscript: async (id) => {
      if (!isRevealed) {
        const error: any = new Error("Forbidden");
        error.response = { status: 403 };
        throw error;
      }
      calls.getQuizTranscript.push(id);
      return {
        items: [{ questionId: 101, order: 1, transcript: "Secret Answer", translation: "Bí mật" }],
        audioArtifact: { id: 1, version: 1, checksumSha256: "abc", durationMs: 5000 },
      };
    },
    revealTranscript: async (id) => {
      calls.revealTranscript.push(id);
      isRevealed = true;
      return { revealedAt: new Date().toISOString() };
    },
  });

  const quiz = createSampleQuiz(true);

  // 1. Initial probe on page load (returns 403)
  const probeEntry = await probeOrPrefetchTranscript(quiz.id, quiz, undefined, fetcher);
  assert.equal(probeEntry.authorizationStatus, "unauthorized");
  assert.equal(calls.revealTranscript.length, 0);

  // 2. Learner explicitly clicks Full Transcript tab
  const revealedEntry = await revealAndFetchTranscript(quiz.id, quiz, undefined, fetcher);
  assert.equal(calls.revealTranscript.length, 1);
  assert.equal(revealedEntry.authorizationStatus, "authorized");
  assert.equal(revealedEntry.transcript?.[0].transcript, "Secret Answer");
  assert.equal(calls.getTranscriptAudioBlob.length, 1);

  // 3. Learner switches tabs back and forth: zero new network calls
  const secondClick = await revealAndFetchTranscript(quiz.id, quiz, undefined, fetcher);
  assert.equal(calls.revealTranscript.length, 1); // still 1
  assert.equal(calls.getQuizTranscript.length, 1); // still 1
  assert.equal(calls.getTranscriptAudioBlob.length, 1); // still 1
  assert.equal(secondClick, revealedEntry);
});

// =========================================================================
// 2. Cache Identity & Invalidation Tests (Issue 4 & Follow-up Point 1)
// =========================================================================

test("Identity safety: same quizId with changed artifact version invalidates cache and revokes Blob URL", async () => {
  const { fetcher, calls } = createMockFetcher();
  const quizV1 = createSampleQuiz(false, true);
  quizV1.listeningAudioArtifact = { id: 10, version: 1, checksumSha256: "sha-1" };

  const entry1 = await probeOrPrefetchTranscript(quizV1.id, quizV1, undefined, fetcher);
  assert.equal(entry1.audioArtifact?.version, 1);
  assert.equal(calls.createObjectUrl.length, 1);
  const firstUrl = calls.createObjectUrl[0] ? entry1.audioBlobUrl : null;

  // Now the quiz is updated on the server to version 2
  const quizV2 = createSampleQuiz(false, true);
  quizV2.listeningAudioArtifact = { id: 10, version: 2, checksumSha256: "sha-2" };

  // Verification 1: getCachedTranscriptResources detects identity change and returns undefined
  const cachedCheck = getCachedTranscriptResources(quizV1.id, quizV2.listeningAudioArtifact, fetcher);
  assert.equal(cachedCheck, undefined);
  // Verification 2: Old URL was revoked
  assert.ok(calls.revokeObjectUrl.includes(firstUrl!));

  // Verification 3: Subsequent fetch creates new resources with version 2
  const entry2 = await probeOrPrefetchTranscript(quizV2.id, quizV2, undefined, fetcher);
  assert.equal(entry2.audioArtifact?.version, 2);
  assert.equal(calls.getQuizTranscript.length, 2);
  assert.equal(calls.getTranscriptAudioBlob.length, 2);
});

test("Identity safety: same quizId with changed checksum invalidates cache", async () => {
  const { fetcher, calls } = createMockFetcher();
  const quiz1 = createSampleQuiz(false, true);
  quiz1.listeningAudioArtifact = { id: 10, version: 1, checksumSha256: "checksum-aaa" };

  await probeOrPrefetchTranscript(quiz1.id, quiz1, undefined, fetcher);
  assert.equal(calls.createObjectUrl.length, 1);

  // Same version, but checksum changed (re-encoded audio)
  const quiz2 = createSampleQuiz(false, true);
  quiz2.listeningAudioArtifact = { id: 10, version: 1, checksumSha256: "checksum-bbb" };

  const staleCheck = getCachedTranscriptResources(quiz1.id, quiz2.listeningAudioArtifact, fetcher);
  assert.equal(staleCheck, undefined);

  const freshEntry = await probeOrPrefetchTranscript(quiz2.id, quiz2, undefined, fetcher);
  assert.equal(freshEntry.audioArtifact?.checksumSha256, "checksum-bbb");
  assert.equal(calls.getQuizTranscript.length, 2);
});

test("Identity safety: same quizId with changed transcript/content identity is detected", () => {
  const itemsA: ListeningTranscriptItem[] = [
    { questionId: 1, order: 1, transcript: "Sentence one", translation: null },
  ];
  const itemsB: ListeningTranscriptItem[] = [
    { questionId: 1, order: 1, transcript: "Sentence one updated", translation: null },
  ];

  const hashA = computeTranscriptContentHash(itemsA);
  const hashB = computeTranscriptContentHash(itemsB);
  assert.notEqual(hashA, hashB);

  const mockEntry: any = {
    audioArtifact: { id: 1, version: 1, checksumSha256: "chk" },
    contentHash: hashA,
  };

  assert.equal(isIdentityMatching(mockEntry, { contentHash: hashA }), true);
  assert.equal(isIdentityMatching(mockEntry, { contentHash: hashB }), false);
});

test("Identity safety: old cache not reused after identity change", async () => {
  const { fetcher } = createMockFetcher();
  const quiz = createSampleQuiz(false, true);
  quiz.listeningAudioArtifact = { id: 5, version: 1, checksumSha256: "c1" };

  await probeOrPrefetchTranscript(quiz.id, quiz, undefined, fetcher);

  // Asking for cache with artifact version 2 must return undefined, not the version 1 entry
  const result = getCachedTranscriptResources(quiz.id, { id: 5, version: 2, checksumSha256: "c2" }, fetcher);
  assert.equal(result, undefined);
});

test("Regression: same quiz id + same artifact + changed transcript content cannot reuse stale cached transcript", async () => {
  let transcriptItems: ListeningTranscriptItem[] = [
    { questionId: 101, order: 1, transcript: "Original sentence", translation: null },
  ];

  const { fetcher, calls } = createMockFetcher({
    getQuizTranscript: async (quizId) => {
      calls.getQuizTranscript.push(quizId);
      return {
        items: transcriptItems,
        audioArtifact: { id: 1, version: 1, checksumSha256: "abc", durationMs: 5000 },
      };
    },
  });

  const quiz = createSampleQuiz(false, true);
  quiz.listeningAudioArtifact = { id: 1, version: 1, checksumSha256: "abc" };

  // 1. Initial load caches transcript "Original sentence"
  const entry1 = await probeOrPrefetchTranscript(quiz.id, quiz, undefined, fetcher);
  assert.equal(entry1.transcript?.[0].transcript, "Original sentence");
  assert.equal(calls.getTranscriptAudioBlob.length, 1);

  // 2. Server updates transcript content (same quizId, same artifact)
  transcriptItems = [
    { questionId: 101, order: 1, transcript: "Updated sentence by admin", translation: null },
  ];

  // 3. Revalidation detects changed content
  const entry2 = await revalidateOrFetchTranscript(quiz.id, quiz, undefined, fetcher);
  assert.equal(entry2.transcript?.[0].transcript, "Updated sentence by admin");
  assert.notEqual(entry2.contentHash, entry1.contentHash);
  // Stale cached transcript was not reused
  assert.notEqual(entry1, entry2);
});

test("Regression: same content identity reuses cache without re-fetching audio", async () => {
  const { fetcher, calls } = createMockFetcher();
  const quiz = createSampleQuiz(false, true);

  const entry1 = await probeOrPrefetchTranscript(quiz.id, quiz, undefined, fetcher);
  const entry2 = await revalidateOrFetchTranscript(quiz.id, quiz, undefined, fetcher);

  assert.equal(calls.getTranscriptAudioBlob.length, 1);
  assert.equal(entry1.contentHash, entry2.contentHash);
});

test("Regression: changed artifact identity invalidates cache", async () => {
  const { fetcher } = createMockFetcher();
  const quiz = createSampleQuiz(false, true);
  quiz.listeningAudioArtifact = { id: 1, version: 1, checksumSha256: "abc" };

  const entry1 = await probeOrPrefetchTranscript(quiz.id, quiz, undefined, fetcher);
  assert.equal(entry1.audioArtifact?.version, 1);

  // Artifact version changes
  const updatedQuiz = {
    ...quiz,
    listeningAudioArtifact: { id: 1, version: 2, checksumSha256: "abc" },
  };

  const cachedCheck = getCachedTranscriptResources(quiz.id, updatedQuiz.listeningAudioArtifact, fetcher);
  assert.equal(cachedCheck, undefined);
});

test("Regression: strict artifact checksum comparison treats missing or mismatched checksum as different", () => {
  const cachedEntry: any = {
    audioArtifact: { id: 1, version: 1, checksumSha256: null },
    contentHash: "h1",
  };

  // Expected has checksum "sha-xyz", but cached checksum is null -> MUST return false
  const match1 = isIdentityMatching(cachedEntry, {
    audioArtifact: { id: 1, version: 1, checksumSha256: "sha-xyz" },
  });
  assert.equal(match1, false);

  // Expected has checksum "sha-xyz", and cached checksum is "sha-different" -> MUST return false
  cachedEntry.audioArtifact.checksumSha256 = "sha-different";
  const match2 = isIdentityMatching(cachedEntry, {
    audioArtifact: { id: 1, version: 1, checksumSha256: "sha-xyz" },
  });
  assert.equal(match2, false);

  // Both have identical checksum -> true
  cachedEntry.audioArtifact.checksumSha256 = "sha-xyz";
  const match3 = isIdentityMatching(cachedEntry, {
    audioArtifact: { id: 1, version: 1, checksumSha256: "sha-xyz" },
  });
  assert.equal(match3, true);
});

// =========================================================================
// 3. Blob URL Lifecycle & Consumer Tracking Tests (Issue 5 & Follow-up Point 2)
// =========================================================================

test("Blob URL lifecycle: revoke on workspace unmount when no active consumer remains", async () => {
  const { fetcher, calls } = createMockFetcher();
  const quiz = createSampleQuiz(false, true);

  // Consumer 1 mounts
  const release1 = retainTranscriptConsumer(quiz.id);
  assert.equal(getActiveConsumerCount(quiz.id), 1);

  const entry = await probeOrPrefetchTranscript(quiz.id, quiz, undefined, fetcher);
  const url = entry.audioBlobUrl!;
  assert.ok(url);

  // Consumer 1 unmounts
  release1();
  assert.equal(getActiveConsumerCount(quiz.id), 0);
  assert.ok(calls.revokeObjectUrl.includes(url));
});

test("Blob URL lifecycle: do not revoke an URL while another mounted workspace still uses it", async () => {
  const { fetcher, calls } = createMockFetcher();
  const quiz = createSampleQuiz(false, true);

  // Workspace 1 mounts
  const release1 = retainTranscriptConsumer(quiz.id);
  // Workspace 2 mounts (e.g. preview or split screen)
  const release2 = retainTranscriptConsumer(quiz.id);
  assert.equal(getActiveConsumerCount(quiz.id), 2);

  const entry = await probeOrPrefetchTranscript(quiz.id, quiz, undefined, fetcher);
  const url = entry.audioBlobUrl!;

  // Workspace 1 unmounts
  release1();
  assert.equal(getActiveConsumerCount(quiz.id), 1);
  // URL should NOT be revoked yet because Workspace 2 is still active
  assert.equal(calls.revokeObjectUrl.includes(url), false);

  // Workspace 2 unmounts
  release2();
  assert.equal(getActiveConsumerCount(quiz.id), 0);
  // Now URL is revoked
  assert.ok(calls.revokeObjectUrl.includes(url));
});

test("Blob URL lifecycle: direct releaseTranscriptConsumer call decrements and cleans up", async () => {
  const { fetcher, calls } = createMockFetcher();
  const quiz = createSampleQuiz(false, true);

  retainTranscriptConsumer(quiz.id);
  assert.equal(getActiveConsumerCount(quiz.id), 1);

  const entry = await probeOrPrefetchTranscript(quiz.id, quiz, undefined, fetcher);
  const url = entry.audioBlobUrl!;

  releaseTranscriptConsumer(quiz.id);
  assert.equal(getActiveConsumerCount(quiz.id), 0);
  assert.ok(calls.revokeObjectUrl.includes(url));
});

test("Blob URL replacement safety: two active consumers hold old URL across replacement until final release", async () => {
  const { fetcher, calls } = createMockFetcher();
  const quiz = createSampleQuiz(false, true);

  // 1. Two active consumers mount
  const release1 = retainTranscriptConsumer(quiz.id);
  const release2 = retainTranscriptConsumer(quiz.id);
  assert.equal(getActiveConsumerCount(quiz.id), 2);

  // 2. Initial fetch creates URL 1
  const entry1 = await probeOrPrefetchTranscript(quiz.id, quiz, undefined, fetcher);
  const url1 = entry1.audioBlobUrl!;
  assert.ok(url1);

  // 3. Resource replacement occurs
  const entry2 = await revealAndFetchTranscript(quiz.id, quiz, undefined, fetcher, true);
  const url2 = entry2.audioBlobUrl!;
  assert.notEqual(url1, url2);

  // 4. Old URL remains valid while active consumers still exist
  assert.equal(calls.revokeObjectUrl.includes(url1), false, "Old URL must not be revoked while active consumers remain");

  // 5. First consumer releases: old URL must still remain valid for remaining consumer
  release1();
  assert.equal(getActiveConsumerCount(quiz.id), 1);
  assert.equal(calls.revokeObjectUrl.includes(url1), false, "Old URL must not be revoked while consumer 2 is still active");

  // 6. Final consumer releases: now both old and new URLs are revoked
  release2();
  assert.equal(getActiveConsumerCount(quiz.id), 0);
  assert.ok(calls.revokeObjectUrl.includes(url1), "Final release must revoke old URL");
  assert.ok(calls.revokeObjectUrl.includes(url2), "Final release must revoke new URL");
});

test("Blob URL replacement safety: replacing an unheld entry revokes old URL immediately", async () => {
  const { fetcher, calls } = createMockFetcher();
  const quiz = createSampleQuiz(false, true);

  // Initial fetch with no active consumers
  const entry1 = await probeOrPrefetchTranscript(quiz.id, quiz, undefined, fetcher);
  const url1 = entry1.audioBlobUrl!;

  // Replacement
  const entry2 = await revealAndFetchTranscript(quiz.id, quiz, undefined, fetcher, true);
  const url2 = entry2.audioBlobUrl!;

  assert.notEqual(url1, url2);
  assert.ok(calls.revokeObjectUrl.includes(url1));
});

test("Blob URL lifecycle: revoke when cache is explicitly cleared", async () => {
  const { fetcher, calls } = createMockFetcher();
  const quiz = createSampleQuiz(false, true);

  const entry = await probeOrPrefetchTranscript(quiz.id, quiz, undefined, fetcher);
  const url = entry.audioBlobUrl!;

  clearTranscriptResourceCache(quiz.id, fetcher);
  assert.ok(calls.revokeObjectUrl.includes(url));
  assert.equal(getCachedTranscriptResources(quiz.id), undefined);
});

// =========================================================================
// 4. Abort Safety & In-Flight Isolation Tests (Issue 6)
// =========================================================================

test("Abort safety: first probe aborted, second probe succeeds without poisoning", async () => {
  const controller1 = new AbortController();
  const { fetcher, calls } = createMockFetcher();
  const quiz = createSampleQuiz(false, true);

  // First probe starts and is aborted immediately
  controller1.abort();
  await assert.rejects(
    async () => await probeOrPrefetchTranscript(quiz.id, quiz, controller1.signal, fetcher),
    (err: any) => err.name === "AbortError",
  );

  // Second probe starts with fresh signal and must succeed
  const controller2 = new AbortController();
  const entry = await probeOrPrefetchTranscript(quiz.id, quiz, controller2.signal, fetcher);

  assert.equal(entry.authorizationStatus, "authorized");
  assert.equal(calls.getQuizTranscript.length, 1);
  assert.equal(calls.getTranscriptAudioBlob.length, 1);
});

test("Abort safety: first reveal aborted, second reveal succeeds cleanly", async () => {
  let isRevealed = false;
  const { fetcher, calls } = createMockFetcher({
    getQuizTranscript: async (id) => {
      calls.getQuizTranscript.push(id);
      if (!isRevealed) {
        const error: any = new Error("Forbidden");
        error.response = { status: 403 };
        throw error;
      }
      return {
        items: [{ questionId: 101, order: 1, transcript: "Answer", translation: "Dịch" }],
        audioArtifact: { id: 1, version: 1, checksumSha256: "abc", durationMs: 5000 },
      };
    },
    revealTranscript: async (id) => {
      calls.revealTranscript.push(id);
      isRevealed = true;
      return { revealedAt: new Date().toISOString() };
    },
  });

  const quiz = createSampleQuiz(true, true);

  // Abort first reveal attempt
  const controller1 = new AbortController();
  controller1.abort();
  await assert.rejects(
    async () => await revealAndFetchTranscript(quiz.id, quiz, controller1.signal, fetcher),
    (err: any) => err.name === "AbortError",
  );

  // Second reveal attempt succeeds
  const controller2 = new AbortController();
  const entry = await revealAndFetchTranscript(quiz.id, quiz, controller2.signal, fetcher);

  assert.equal(entry.authorizationStatus, "authorized");
  assert.equal(entry.transcript?.[0].transcript, "Answer");
  assert.equal(calls.revealTranscript.length, 1);
});

test("Abort safety: in-flight abort of consumer 1 does not kill consumer 2 in Strict Mode", async () => {
  let finishFetch: () => void = () => {};
  const fetchPromise = new Promise<{
    items: ListeningTranscriptItem[];
    audioArtifact: ListeningAudioArtifactIdentity;
  }>((resolve) => {
    finishFetch = () =>
      resolve({
        items: [{ questionId: 101, order: 1, transcript: "Shared", translation: null }],
        audioArtifact: { id: 1, version: 1, checksumSha256: "abc", durationMs: 5000 },
      });
  });

  const { fetcher } = createMockFetcher({
    getQuizTranscript: async () => fetchPromise,
  });

  const quiz = createSampleQuiz(false, true);

  const controller1 = new AbortController();
  const controller2 = new AbortController();

  // Consumer 1 and 2 start together
  const p1 = probeOrPrefetchTranscript(quiz.id, quiz, controller1.signal, fetcher);
  const p2 = probeOrPrefetchTranscript(quiz.id, quiz, controller2.signal, fetcher);

  // Consumer 1 aborts while in-flight (Strict Mode unmount simulation)
  controller1.abort();

  await assert.rejects(
    async () => await p1,
    (err: any) => err.name === "AbortError",
  );

  // Resolve backend fetch
  finishFetch();

  // Consumer 2 must successfully complete!
  const res2 = await p2;
  assert.equal(res2.authorizationStatus, "authorized");
  assert.equal(res2.transcript?.[0].transcript, "Shared");
});

test("Abort safety: no stale rejected promise remains in map and no partial cache entry created", async () => {
  let shouldFail = true;
  const { fetcher, calls } = createMockFetcher({
    getQuizTranscript: async (id) => {
      calls.getQuizTranscript.push(id);
      if (shouldFail) {
        throw new Error("Network 500 Internal Error");
      }
      return {
        items: [{ questionId: 101, order: 1, transcript: "Recovered", translation: null }],
        audioArtifact: { id: 1, version: 1, checksumSha256: "abc", durationMs: 5000 },
      };
    },
  });

  const quiz = createSampleQuiz(false, true);

  // First attempt fails with 500
  await assert.rejects(
    async () => await probeOrPrefetchTranscript(quiz.id, quiz, undefined, fetcher),
    (err: any) => err.message.includes("Network 500"),
  );

  // No partial cache entry created
  assert.equal(getCachedTranscriptResources(quiz.id), undefined);

  // Retry attempt: backend recovers
  shouldFail = false;
  const recovered = await probeOrPrefetchTranscript(quiz.id, quiz, undefined, fetcher);
  assert.equal(recovered.authorizationStatus, "authorized");
  assert.equal(recovered.transcript?.[0].transcript, "Recovered");
});

// =========================================================================
// 5. Existing Core Feature Tests
// =========================================================================

test("Parallelization: Dialogue-only quiz prefetches transcript and published audio in parallel", async () => {
  const { fetcher, calls } = createMockFetcher();
  const dialogueQuiz = createSampleQuiz(false, true);

  const entry = await probeOrPrefetchTranscript(dialogueQuiz.id, dialogueQuiz, undefined, fetcher);

  // Dialogue-only does not require reveal
  assert.equal(calls.revealTranscript.length, 0);
  assert.equal(calls.getQuizTranscript.length, 1);
  assert.equal(calls.getTranscriptAudioBlob.length, 1);
  assert.equal(entry.authorizationStatus, "authorized");
  assert.equal(entry.transcript?.length, 2);
  assert.ok(entry.audioBlobUrl?.startsWith("blob:mock-url-"));
});

test("Cache reuse: Repeated requests return cached entry without network calls", async () => {
  const { fetcher, calls } = createMockFetcher();
  const quiz = createSampleQuiz(false, true);

  const first = await probeOrPrefetchTranscript(quiz.id, quiz, undefined, fetcher);
  const second = await probeOrPrefetchTranscript(quiz.id, quiz, undefined, fetcher);
  const fromTabSwitch = await revealAndFetchTranscript(quiz.id, quiz, undefined, fetcher);

  assert.equal(calls.getQuizTranscript.length, 1);
  assert.equal(calls.getTranscriptAudioBlob.length, 1);
  assert.equal(first, second);
  assert.equal(second, fromTabSwitch);
});

test("Resilience: Failed optional full-track audio does NOT discard authorized transcript", async () => {
  const { fetcher } = createMockFetcher({
    getTranscriptAudioBlob: async () => {
      const err: any = new Error("Audio 503 Service Unavailable");
      err.response = { status: 503 };
      throw err;
    },
  });

  const quiz = createSampleQuiz(false, true);
  const entry = await probeOrPrefetchTranscript(quiz.id, quiz, undefined, fetcher);

  assert.equal(entry.authorizationStatus, "authorized");
  assert.equal(entry.transcript?.length, 2);
  assert.equal(entry.audioBlob, null);
  assert.equal(entry.audioError, true);
  assert.ok(entry.audioNotice?.includes("chuẩn bị"));
});

test("Capability guard: empty Multiple Choice transcript does not request full-track audio", async () => {
  const { fetcher, calls } = createMockFetcher({
    getQuizTranscript: async (quizId) => {
      calls.getQuizTranscript.push(quizId);
      return { items: [], audioArtifact: null };
    },
  });

  const quiz = createSampleQuiz(false, false);
  const entry = await probeOrPrefetchTranscript(quiz.id, quiz, undefined, fetcher);

  assert.equal(entry.authorizationStatus, "authorized");
  assert.deepEqual(entry.transcript, []);
  assert.equal(entry.audioBlob, null);
  assert.equal(entry.audioError, false);
  assert.equal(calls.getTranscriptAudioBlob.length, 0);
});

test("Helper quizContainsDictation accurately classifies quiz modes", () => {
  assert.equal(quizContainsDictation({ mode: "DIALOGUE", questions: [{ type: "DICTATION" }] }), false);
  assert.equal(quizContainsDictation({ questions: [{ type: "DICTATION" }] }), true);
  assert.equal(quizContainsDictation({ questions: [{ type: "MULTIPLE_CHOICE" }] }), false);
  assert.equal(quizContainsDictation({ questions: [] }), false);
});
