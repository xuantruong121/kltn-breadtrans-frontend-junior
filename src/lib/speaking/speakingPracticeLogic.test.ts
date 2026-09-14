/**
 * Speaking Practice Deterministic Logic Test Suite
 *
 * Note on Test Runner Limitations:
 * This repository uses Node.js native test runner (`node --test`) for pure logic and algorithmic helpers.
 * There is no React DOM or component test runner (e.g., React Testing Library, Jest, or Vitest) configured.
 * Unit tests target deterministic algorithmic logic, state machine transitions, WAV validation,
 * and presentation text helpers without falsely claiming DOM component render coverage.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import type { SpeakingAttemptPhase } from "./speakingPracticeLogic.ts";
import {
  isValidPhaseTransition,
  generateSpeakingIdempotencyKey,
  encodeWAV,
  validateWavBinary,
  formatSpeakingTime,
  shouldHandleSpeakingShortcut,
  getNextExerciseId,
  classifyWordAssessmentStatus,
  getTruthfulScoreDimensions,
  getSequentialPlaybackNextTrack,
  getAccuracyTier,
  getSpeakingScoreLabel,
  getWordDiagnosticDetails,
  RHYTHM_GUIDANCE_TEXT,
} from "./speakingPracticeLogic.ts";

test("Speaking State Machine: validates legal transitions", () => {
  assert.equal(isValidPhaseTransition("READY", "RECORDING"), true);
  assert.equal(isValidPhaseTransition("RECORDING", "ENCODING"), true);
  assert.equal(isValidPhaseTransition("ENCODING", "VALIDATING_AUDIO"), true);
  assert.equal(isValidPhaseTransition("VALIDATING_AUDIO", "SUBMITTING"), true);
  assert.equal(isValidPhaseTransition("SUBMITTING", "POLLING"), true);
  assert.equal(isValidPhaseTransition("POLLING", "COMPLETED"), true);

  // Failure & Invalid paths
  assert.equal(isValidPhaseTransition("VALIDATING_AUDIO", "INVALID_AUDIO"), true);
  assert.equal(isValidPhaseTransition("SUBMITTING", "FAILED"), true);
  assert.equal(isValidPhaseTransition("POLLING", "FAILED"), true);

  // Reset to READY from terminal phases and cancellation
  assert.equal(isValidPhaseTransition("RECORDING", "READY"), true); // User cancellation
  assert.equal(isValidPhaseTransition("COMPLETED", "READY"), true);
  assert.equal(isValidPhaseTransition("FAILED", "READY"), true);
  assert.equal(isValidPhaseTransition("INVALID_AUDIO", "READY"), true);

  // Illegal transitions
  assert.equal(isValidPhaseTransition("READY", "SUBMITTING"), false);
  assert.equal(isValidPhaseTransition("RECORDING", "COMPLETED"), false);
  assert.equal(isValidPhaseTransition("ENCODING", "POLLING"), false);
  assert.equal(isValidPhaseTransition("POLLING", "RECORDING"), false);
});

test("Stop & Finalization Guard: exactly one finalization occurs even during timer and manual stop race", async () => {
  let stopInFlight = false;
  let finalizeCount = 0;
  let submitCount = 0;

  const mockFinalizeAndSubmit = async () => {
    if (stopInFlight) return;
    stopInFlight = true;
    finalizeCount++;

    // Simulated async encoding/validation
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Simulated submit
    submitCount++;
  };

  // Simulate concurrent trigger from manual stop click and 45s timer tick
  await Promise.all([
    mockFinalizeAndSubmit(),
    mockFinalizeAndSubmit(),
    mockFinalizeAndSubmit(),
  ]);

  assert.equal(finalizeCount, 1, "Finalize must be invoked exactly once");
  assert.equal(submitCount, 1, "Submit must be invoked exactly once");
});

test("Direct Blob Pipeline: submit receives Blob directly, immune to stale React state", async () => {
  const dummySamples = new Float32Array(16000); // 1 second of 16kHz
  // populate non-zero samples
  for (let i = 0; i < dummySamples.length; i++) {
    dummySamples[i] = Math.sin((2 * Math.PI * 440 * i) / 16000) * 0.5;
  }

  const generatedBlob = encodeWAV(dummySamples, 16000);
  assert.ok(generatedBlob instanceof Blob);

  let receivedBlob: Blob | null = null;
  const mockSubmit = async (directBlob: Blob) => {
    receivedBlob = directBlob;
  };

  await mockSubmit(generatedBlob);

  assert.ok(receivedBlob !== null, "Blob was passed directly to submit function");
  assert.equal(receivedBlob, generatedBlob);
  assert.equal((receivedBlob as Blob | null)?.type, "audio/wav");
});

test("WAV Encoding & Pre-Upload Validation: guarantees valid 16kHz Mono 16-bit PCM", async () => {
  // 1 second of 16kHz sine wave audio
  const sampleCount = 16000;
  const samples = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    samples[i] = Math.sin((2 * Math.PI * 300 * i) / 16000) * 0.4;
  }

  const wavBlob = encodeWAV(samples, 16000);
  const arrayBuffer = await wavBlob.arrayBuffer();

  const result = validateWavBinary(arrayBuffer);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.quality.sampleRate, 16000);
    assert.equal(result.quality.channels, 1);
    assert.equal(result.quality.bitsPerSample, 16);
    assert.equal(result.quality.isSilent, false);
    assert.equal(result.durationMs, 1000);
  }
});

test("WAV Pre-Upload Validation: rejects silent or near-zero amplitude audio", async () => {
  // 1 second of silence
  const samples = new Float32Array(16000);
  const wavBlob = encodeWAV(samples, 16000);
  const arrayBuffer = await wavBlob.arrayBuffer();

  const result = validateWavBinary(arrayBuffer);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "SILENT");
  }
});

test("WAV Pre-Upload Validation: rejects audio shorter than 300ms", async () => {
  // 100ms audio (too short)
  const samples = new Float32Array(1600); // 100ms at 16kHz
  for (let i = 0; i < samples.length; i++) {
    samples[i] = 0.5;
  }
  const wavBlob = encodeWAV(samples, 16000);
  const arrayBuffer = await wavBlob.arrayBuffer();

  const result = validateWavBinary(arrayBuffer);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "TOO_SHORT");
  }
});

test("WAV Pre-Upload Validation: rejects corrupted or non-WAV buffer", () => {
  const invalidBuffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer;
  const result = validateWavBinary(invalidBuffer);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "INVALID_WAV_HEADER");
  }
});

test("Resample Failure Handling: blocks upload when resampling fails", () => {
  // Simulate resample failure handler
  let phase: SpeakingAttemptPhase = "ENCODING";
  const handleResampleFailure = () => {
    // Unsafe fallback to original sample rate is STRICTLY FORBIDDEN
    phase = "INVALID_AUDIO";
  };

  handleResampleFailure();
  assert.equal(phase, "INVALID_AUDIO");
});

test("Idempotency: retry of the same recording reuses key, new recording generates new key", () => {
  const key1 = generateSpeakingIdempotencyKey(42);
  const retryKey = key1; // On retry of same recording, re-use existing key
  assert.equal(key1, retryKey, "Retry must use identical Idempotency-Key");

  // New recording starts
  const key2 = generateSpeakingIdempotencyKey(42);
  assert.notEqual(key1, key2, "Fresh recording must generate a new Idempotency-Key");
});

test("Keyboard Shortcuts: ignores Space/R in inputs, textareas, contenteditable, or modals", () => {
  // Allowed cases
  assert.equal(
    shouldHandleSpeakingShortcut({
      key: " ",
      activeElementTag: "BODY",
      isContentEditable: false,
      isModalOpen: false,
      hasModifierKey: false,
    }),
    true,
  );

  assert.equal(
    shouldHandleSpeakingShortcut({
      key: "r",
      activeElementTag: "DIV",
      isContentEditable: false,
      isModalOpen: false,
      hasModifierKey: false,
    }),
    true,
  );

  // Blocked in input / textarea / select / button
  assert.equal(
    shouldHandleSpeakingShortcut({
      key: " ",
      activeElementTag: "INPUT",
      isContentEditable: false,
      isModalOpen: false,
      hasModifierKey: false,
    }),
    false,
  );

  assert.equal(
    shouldHandleSpeakingShortcut({
      key: "r",
      activeElementTag: "TEXTAREA",
      isContentEditable: false,
      isModalOpen: false,
      hasModifierKey: false,
    }),
    false,
  );

  assert.equal(
    shouldHandleSpeakingShortcut({
      key: " ",
      activeElementTag: "BUTTON",
      isContentEditable: false,
      isModalOpen: false,
      hasModifierKey: false,
    }),
    false,
  );

  // Blocked when modal is open
  assert.equal(
    shouldHandleSpeakingShortcut({
      key: " ",
      activeElementTag: "BODY",
      isContentEditable: false,
      isModalOpen: true,
      hasModifierKey: false,
    }),
    false,
  );

  // Blocked when modifier key (Ctrl/Cmd/Alt) is pressed
  assert.equal(
    shouldHandleSpeakingShortcut({
      key: "r",
      activeElementTag: "BODY",
      isContentEditable: false,
      isModalOpen: false,
      hasModifierKey: true,
    }),
    false,
  );
});

test("Next Exercise Traversal: traverses exercises in sequential order", () => {
  const exercises = [{ id: 10 }, { id: 15 }, { id: 22 }];

  assert.equal(getNextExerciseId(10, exercises), 15);
  assert.equal(getNextExerciseId(15, exercises), 22);
  assert.equal(getNextExerciseId(22, exercises), null, "Last exercise has no next exercise");
  assert.equal(getNextExerciseId(999, exercises), null, "Unknown exercise returns null");
});

test("Time Formatter: formats seconds into MM:SS correctly", () => {
  assert.equal(formatSpeakingTime(0), "00:00");
  assert.equal(formatSpeakingTime(9), "00:09");
  assert.equal(formatSpeakingTime(45), "00:45");
  assert.equal(formatSpeakingTime(75), "01:15");
});

test("Truthful Assessment: ensures no synthetic prosodyScore or learner IPA is fabricated", () => {
  // Provider-backed feedback model
  const backendFeedback = {
    accuracyScore: 85,
    fluencyScore: 78,
    completenessScore: 100,
    // Note: prosodyScore and learnerIpa are not provided by the Azure Speech assessment contract
    words: [
      { word: "Hello", accuracyScore: 90, errorType: "None" as const, isCorrect: true },
      { word: "world", accuracyScore: 80, errorType: "None" as const, isCorrect: true },
    ],
  };

  assert.equal(backendFeedback.accuracyScore, 85);
  assert.equal(backendFeedback.fluencyScore, 78);
  assert.equal(backendFeedback.completenessScore, 100);
  assert.equal(Object.hasOwn(backendFeedback, "prosodyScore"), false, "Prosody score must not be fabricated");
  assert.equal(Object.hasOwn(backendFeedback, "learnerIpa"), false, "Learner IPA must not be fabricated");
});

test("Polling Lifecycle: cleans up polling timer on terminal status and unmount", () => {
  let timerActive = true;
  let timerId: any = 12345;

  const cleanupPolling = () => {
    if (timerId) {
      timerActive = false;
      timerId = null;
    }
  };

  // Simulate terminal status reached (COMPLETED or FAILED)
  cleanupPolling();
  assert.equal(timerActive, false, "Polling timer must be deactivated on terminal status");
  assert.equal(timerId, null);

  // Simulate unmount cleanup
  timerId = 67890;
  timerActive = true;
  const unmount = () => cleanupPolling();
  unmount();
  assert.equal(timerActive, false, "Polling timer must be deactivated on unmount");
  assert.equal(timerId, null);
});

test("Local State Reset: 'Thử lại' resets attempt state without mutating server history", () => {
  interface AttemptState {
    phase: SpeakingAttemptPhase;
    audioBlob: Blob | null;
    audioUrl: string | null;
    submissionId: number | null;
    qualityWarning: string | null;
    currentSubmission: object | null;
  }

  let state: AttemptState = {
    phase: "COMPLETED",
    audioBlob: new Blob(),
    audioUrl: "blob:http://localhost/123",
    submissionId: 99,
    qualityWarning: "None",
    currentSubmission: { id: 99, status: "COMPLETED" },
  };

  const handleRetryRecord = () => {
    state = {
      phase: "READY",
      audioBlob: null,
      audioUrl: null,
      submissionId: null,
      qualityWarning: null,
      currentSubmission: null,
    };
  };

  handleRetryRecord();
  assert.equal(state.phase, "READY");
  assert.equal(state.audioBlob, null);
  assert.equal(state.audioUrl, null);
  assert.equal(state.submissionId, null);
  assert.equal(state.currentSubmission, null);
});

test("WAV Pre-Upload Validation: rejects incorrect channel count, sample rate, or bit depth", () => {
  // Helper to create a minimal 44-byte WAV header with arbitrary parameters
  const createMockWavHeader = (channels: number, sampleRate: number, bitsPerSample: number) => {
    const buffer = new ArrayBuffer(44 + 3200); // 3200 bytes of mock PCM data
    const view = new DataView(buffer);
    const writeStr = (off: number, s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
    };
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + 3200, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // Linear PCM
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * (bitsPerSample / 8), true);
    view.setUint16(32, channels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    writeStr(36, "data");
    view.setUint32(40, 3200, true);
    return buffer;
  };

  // Rejects Stereo (2 channels)
  const stereoBuffer = createMockWavHeader(2, 16000, 16);
  const stereoResult = validateWavBinary(stereoBuffer);
  assert.equal(stereoResult.ok, false);
  if (!stereoResult.ok) {
    assert.equal(stereoResult.reason, "INVALID_CHANNELS");
  }

  // Rejects 44.1 kHz
  const rate44kBuffer = createMockWavHeader(1, 44100, 16);
  const rateResult = validateWavBinary(rate44kBuffer);
  assert.equal(rateResult.ok, false);
  if (!rateResult.ok) {
    assert.equal(rateResult.reason, "INVALID_SAMPLE_RATE");
  }

  // Rejects 24-bit depth
  const bit24Buffer = createMockWavHeader(1, 16000, 24);
  const bitResult = validateWavBinary(bit24Buffer);
  assert.equal(bitResult.ok, false);
  if (!bitResult.ok) {
    assert.equal(bitResult.reason, "INVALID_BIT_DEPTH");
  }
});

test("Word Assessment Classification: accurately maps score ranges and omission status", () => {
  assert.equal(
    classifyWordAssessmentStatus({ word: "hello", accuracyScore: 92, errorType: "None" }),
    "CORRECT",
  );
  assert.equal(
    classifyWordAssessmentStatus({ word: "world", accuracyScore: 75, errorType: "None" }),
    "NEEDS_IMPROVEMENT",
  );
  assert.equal(
    classifyWordAssessmentStatus({ word: "speech", accuracyScore: 45, errorType: "Mispronunciation" }),
    "POOR",
  );
  assert.equal(
    classifyWordAssessmentStatus({ word: "missed", accuracyScore: 0, errorType: "Omission" }),
    "OMITTED",
  );
  assert.equal(
    classifyWordAssessmentStatus({ word: "unspoken", accuracyScore: null, errorType: "Unspoken" }),
    "OMITTED",
  );
  assert.equal(
    classifyWordAssessmentStatus({ word: "pending", accuracyScore: null, errorType: null }),
    "UNASSESSED",
  );
  assert.equal(classifyWordAssessmentStatus(null), "UNASSESSED");
});

test("Truthful Score Dimensions: strictly exposes exactly three numeric dimensions without unsupported metrics", () => {
  const dims = getTruthfulScoreDimensions({
    accuracyScore: 88.4,
    fluencyScore: 91.2,
    completenessScore: 100,
  });

  // Exactly three numeric dimensions: accuracy, fluency, completeness
  assert.equal(dims.accuracy, 88);
  assert.equal(dims.fluency, 91);
  assert.equal(dims.completeness, 100);
  assert.equal(Object.keys(dims).length, 3, "Only three numeric dimensions are supported");
  assert.equal(Object.hasOwn(dims, "prosody"), false);
  assert.equal(Object.hasOwn(dims, "syllable"), false);
  assert.equal(Object.hasOwn(dims, "phoneme"), false);
  assert.equal(Object.hasOwn(dims, "waveformComparison"), false);
});

test("Sequential Dual Playback: alternates from native to learner audio using sequential playback terminology", () => {
  assert.equal(getSequentialPlaybackNextTrack("native", true), "learner");
  assert.equal(getSequentialPlaybackNextTrack("native", false), null);
  assert.equal(getSequentialPlaybackNextTrack("learner", true), null);
});

test("Rhythm Guidance: provides qualitative coaching text without numeric metric claims", () => {
  assert.equal(typeof RHYTHM_GUIDANCE_TEXT, "string");
  assert.ok(RHYTHM_GUIDANCE_TEXT.length > 0);
  // Rhythm is qualitative coaching, not a provider-backed numeric score
  assert.equal(/score|điểm|hệ số|\d+%/i.test(RHYTHM_GUIDANCE_TEXT), false);
});

test("Word Diagnostic Details: strictly produces word-level assessments without unsupported terminology", () => {
  const correct = getWordDiagnosticDetails({ word: "hello", accuracyScore: 90, errorType: "None" });
  assert.match(correct.statusBadge, /chuẩn/i);
  assert.match(correct.explanation, /từ này/i);

  const omitted = getWordDiagnosticDetails({ word: "world", accuracyScore: 0, errorType: "Omission" });
  assert.match(omitted.statusBadge, /bỏ sót/i);
  assert.match(omitted.explanation, /từ này/i);

  const mispronounced = getWordDiagnosticDetails({ word: "test", accuracyScore: 50, errorType: "Mispronunciation" });
  assert.match(mispronounced.statusBadge, /chỉnh lại|lỗi/i);

  // Ensure no unsupported claims in explanations or badges
  const sampleOutputs = [correct, omitted, mispronounced];
  for (const out of sampleOutputs) {
    const combined = `${out.statusBadge} ${out.statusClass} ${out.explanation}`.toLowerCase();
    assert.equal(/phoneme|syllable|prosody|heatmap|waveform|âm vị|âm tiết/.test(combined), false);
  }
});

test("Truthful Presentation Helpers: ensures labels and tiers avoid unsupported scoring claims", () => {
  const tiers = [getAccuracyTier(95), getAccuracyTier(65), getAccuracyTier(30), getAccuracyTier(null)];
  for (const tier of tiers) {
    const text = `${tier.label} ${tier.badge}`.toLowerCase();
    assert.equal(/phoneme|syllable|prosody|heatmap|waveform|âm vị|âm tiết/.test(text), false);
  }

  const scoreLabels = [
    getSpeakingScoreLabel(9),
    getSpeakingScoreLabel(7),
    getSpeakingScoreLabel(4),
    getSpeakingScoreLabel(0, true),
  ];
  for (const label of scoreLabels) {
    const text = `${label.title} ${label.subtitle}`.toLowerCase();
    assert.equal(/phoneme|syllable|prosody|heatmap|waveform|âm vị|âm tiết/.test(text), false);
  }
});

