/**
 * Pure, testable business logic for Speaking Practice Zero-Click Submission,
 * Audio Validation, Idempotency, and Attempt State Machine.
 */

export type SpeakingAttemptPhase =
  | "READY"
  | "RECORDING"
  | "ENCODING"
  | "VALIDATING_AUDIO"
  | "SUBMITTING"
  | "POLLING"
  | "COMPLETED"
  | "FAILED"
  | "INVALID_AUDIO";

export interface LocalAudioQuality {
  durationMs: number;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  rms: number;
  peak: number;
  clippingRatio: number;
  isSilent: boolean;
  isClipped: boolean;
}

export type AudioValidationFailureReason =
  | "EMPTY"
  | "TOO_SHORT"
  | "TOO_LONG"
  | "SILENT"
  | "CLIPPED"
  | "RESAMPLE_FAILED"
  | "INVALID_WAV_HEADER"
  | "INVALID_FORMAT"
  | "INVALID_CHANNELS"
  | "INVALID_SAMPLE_RATE"
  | "INVALID_BIT_DEPTH";

export interface AudioValidationSuccess {
  ok: true;
  durationMs: number;
  quality: LocalAudioQuality;
}

export interface AudioValidationFailure {
  ok: false;
  reason: AudioValidationFailureReason;
  message: string;
}

export type AudioValidationResult = AudioValidationSuccess | AudioValidationFailure;

const MIN_DURATION_MS = 300;
const MAX_DURATION_MS = 45 * 1000;

/**
 * Validates whether a phase transition is legally permitted in the state machine.
 */
export function isValidPhaseTransition(
  from: SpeakingAttemptPhase,
  to: SpeakingAttemptPhase,
): boolean {
  switch (from) {
    case "READY":
      return to === "RECORDING";
    case "RECORDING":
      return to === "ENCODING" || to === "INVALID_AUDIO" || to === "READY";
    case "ENCODING":
      return to === "VALIDATING_AUDIO" || to === "INVALID_AUDIO";
    case "VALIDATING_AUDIO":
      return to === "SUBMITTING" || to === "INVALID_AUDIO";
    case "SUBMITTING":
      return to === "POLLING" || to === "FAILED";
    case "POLLING":
      return to === "COMPLETED" || to === "FAILED";
    case "COMPLETED":
    case "FAILED":
    case "INVALID_AUDIO":
      return to === "READY";
    default:
      return false;
  }
}

/**
 * Generates a stable Idempotency-Key for a recording session.
 * Reused on retry of the same Blob; regenerated only when a brand new recording starts.
 */
export function generateSpeakingIdempotencyKey(exerciseId: number): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 9);
  return `spk-${exerciseId}-${ts}-${rand}`;
}

/**
 * Encodes linear 16-bit PCM mono samples into a strictly compliant 44-byte RIFF/WAV Blob.
 */
export function encodeWAV(samples: Float32Array, sampleRate = 16000): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  // RIFF Chunk Descriptor
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");

  // "fmt " Sub-chunk
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat: 1 = linear PCM
  view.setUint16(22, 1, true); // NumChannels: 1 (Mono)
  view.setUint32(24, sampleRate, true); // SampleRate: 16000
  view.setUint32(28, sampleRate * 2, true); // ByteRate: 16000 * 1 * 2 = 32000
  view.setUint16(32, 2, true); // BlockAlign: 1 * 2 = 2
  view.setUint16(34, 16, true); // BitsPerSample: 16

  // "data" Sub-chunk
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  // Write 16-bit PCM samples
  for (let i = 0, offset = 44; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: "audio/wav" });
}

/**
 * Validates WAV binary structure and audio quality metrics before any network upload.
 * Rejects silence, incorrect sample rate, multi-channel, non-PCM, clipping, or invalid duration.
 */
export function validateWavBinary(
  arrayBuffer: ArrayBuffer,
): AudioValidationResult {
  if (!arrayBuffer || arrayBuffer.byteLength < 44) {
    return {
      ok: false,
      reason: "INVALID_WAV_HEADER",
      message: "Bản ghi âm không hợp lệ: Thiếu phần đầu WAV chuẩn.",
    };
  }

  const view = new DataView(arrayBuffer);
  const getString = (offset: number, length: number) => {
    let str = "";
    for (let i = 0; i < length; i++) {
      str += String.fromCharCode(view.getUint8(offset + i));
    }
    return str;
  };

  const riff = getString(0, 4);
  const wave = getString(8, 4);
  if (riff !== "RIFF" || wave !== "WAVE") {
    return {
      ok: false,
      reason: "INVALID_WAV_HEADER",
      message: "Định dạng file không phải RIFF/WAVE.",
    };
  }

  // Parse chunks
  let offset = 12;
  let hasFmt = false;
  let hasData = false;
  let audioFormat = 0;
  let numChannels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let dataOffset = 0;
  let dataSize = 0;

  while (offset + 8 <= arrayBuffer.byteLength) {
    const chunkId = getString(offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    offset += 8;

    if (chunkId === "fmt ") {
      hasFmt = true;
      if (chunkSize < 16 || offset + 16 > arrayBuffer.byteLength) {
        return {
          ok: false,
          reason: "INVALID_WAV_HEADER",
          message: "Dữ liệu cấu hình âm thanh bị lỗi.",
        };
      }
      audioFormat = view.getUint16(offset, true);
      numChannels = view.getUint16(offset + 2, true);
      sampleRate = view.getUint32(offset + 4, true);
      bitsPerSample = view.getUint16(offset + 14, true);
    } else if (chunkId === "data") {
      hasData = true;
      dataOffset = offset;
      dataSize = chunkSize;
    }

    offset += chunkSize;
    if (chunkSize % 2 === 1) offset += 1;
  }

  if (!hasFmt) {
    return {
      ok: false,
      reason: "INVALID_WAV_HEADER",
      message: "Thiếu thông tin định dạng âm thanh.",
    };
  }

  if (audioFormat !== 1) {
    return {
      ok: false,
      reason: "INVALID_FORMAT",
      message: "Âm thanh phải ở định dạng tuyến tính PCM.",
    };
  }

  if (numChannels !== 1) {
    return {
      ok: false,
      reason: "INVALID_CHANNELS",
      message: "Âm thanh phải là kênh đơn (Mono 1 channel).",
    };
  }

  if (sampleRate !== 16000) {
    return {
      ok: false,
      reason: "INVALID_SAMPLE_RATE",
      message: `Tần số lấy mẫu phải là 16000 Hz (nhận được ${sampleRate} Hz).`,
    };
  }

  if (bitsPerSample !== 16) {
    return {
      ok: false,
      reason: "INVALID_BIT_DEPTH",
      message: `Độ sâu bit phải là 16-bit (nhận được ${bitsPerSample}-bit).`,
    };
  }

  const availableData = Math.min(
    dataSize,
    arrayBuffer.byteLength - dataOffset,
  );
  if (!hasData || availableData <= 0) {
    return {
      ok: false,
      reason: "EMPTY",
      message: "Bản ghi âm rỗng, chưa có dữ liệu âm thanh.",
    };
  }

  const bytesPerSecond = sampleRate * numChannels * (bitsPerSample / 8);
  const durationMs = Math.round((availableData / bytesPerSecond) * 1000);

  if (durationMs < MIN_DURATION_MS) {
    return {
      ok: false,
      reason: "TOO_SHORT",
      message: `Bản ghi âm quá ngắn (${durationMs}ms). Vui lòng nói to rõ ràng toàn bộ câu.`,
    };
  }

  if (durationMs > MAX_DURATION_MS) {
    return {
      ok: false,
      reason: "TOO_LONG",
      message: `Bản ghi âm vượt quá thời lượng tối đa cho phép (45 giây).`,
    };
  }

  // Quality analysis
  const sampleCount = Math.floor(availableData / 2);
  let sumSquare = 0;
  let peak = 0;
  let clippingCount = 0;

  for (let i = 0; i < sampleCount; i++) {
    const rawSample = view.getInt16(dataOffset + i * 2, true);
    const normalized = rawSample / 32768.0;
    const abs = Math.abs(normalized);
    sumSquare += normalized * normalized;
    if (abs > peak) peak = abs;
    if (abs >= 0.99) clippingCount++;
  }

  const rms = Math.sqrt(sumSquare / (sampleCount || 1));
  const clippingRatio = clippingCount / (sampleCount || 1);

  // Silence threshold aligned with backend validator (peak < 0.001 || rms < 0.0003)
  const isSilent = peak < 0.001 || rms < 0.0003;
  if (isSilent) {
    return {
      ok: false,
      reason: "SILENT",
      message: "Âm thanh quá nhỏ hoặc im lặng. Vui lòng kiểm tra micro và đọc lại to hơn.",
    };
  }

  // Severe clipping: > 50% samples clipped
  const isClipped = clippingRatio > 0.5;
  if (isClipped) {
    return {
      ok: false,
      reason: "CLIPPED",
      message: "Âm thanh bị rè nghiêm trọng do micro đặt quá gần. Vui lòng thu âm lại ở khoảng cách 10-15cm.",
    };
  }

  return {
    ok: true,
    durationMs,
    quality: {
      durationMs,
      sampleRate,
      channels: numChannels,
      bitsPerSample,
      rms,
      peak,
      clippingRatio,
      isSilent: false,
      isClipped: clippingRatio > 0.05,
    },
  };
}

/**
 * Formats seconds into MM:SS.
 */
export function formatSpeakingTime(sec: number): string {
  if (!sec || isNaN(sec) || !isFinite(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Evaluates whether a keyboard shortcut (Space or R) should be allowed to execute.
 * Prevents shortcuts from firing when typing in inputs, textareas, contenteditable, buttons,
 * or when dialogs/modals/popovers are active.
 */
export function shouldHandleSpeakingShortcut(params: {
  key: string;
  activeElementTag?: string | null;
  isContentEditable?: boolean;
  isModalOpen: boolean;
  hasModifierKey: boolean;
}): boolean {
  const { key, activeElementTag, isContentEditable, isModalOpen, hasModifierKey } = params;

  if (hasModifierKey) return false;
  if (isModalOpen) return false;

  const k = key.toLowerCase();
  if (k !== " " && k !== "space" && k !== "r") {
    return false;
  }

  if (isContentEditable) return false;

  const tag = (activeElementTag || "").toUpperCase();
  if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(tag)) {
    return false;
  }

  return true;
}

/**
 * Finds the next exercise in sequence from the API list.
 * Returns the next exercise ID or null if on the last exercise.
 */
export function getNextExerciseId(
  currentId: number,
  exercises: Array<{ id: number }>,
): number | null {
  if (!Array.isArray(exercises) || exercises.length === 0) return null;
  const currentIndex = exercises.findIndex((e) => e.id === currentId);
  if (currentIndex !== -1 && currentIndex + 1 < exercises.length) {
    return exercises[currentIndex + 1].id;
  }
  return null;
}

export type WordAssessmentStatus =
  | "CORRECT"
  | "NEEDS_IMPROVEMENT"
  | "POOR"
  | "OMITTED"
  | "UNASSESSED";

export interface WordAssessmentInput {
  word?: string;
  accuracyScore?: number | null;
  errorType?: string | null;
}

/**
 * Classifies word assessment status strictly based on accuracyScore and errorType.
 */
export function classifyWordAssessmentStatus(
  item?: WordAssessmentInput | null
): WordAssessmentStatus {
  if (!item) return "UNASSESSED";
  const err = item.errorType?.trim().toLowerCase();
  if (err === "omission" || err === "unspoken") return "OMITTED";

  const score = item.accuracyScore;
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return "UNASSESSED";
  }

  if (score >= 80 && (err === "none" || !err)) return "CORRECT";
  if (score >= 60) return "NEEDS_IMPROVEMENT";
  return "POOR";
}

/**
 * Extracts truthful numeric score dimensions supported by the backend (accuracy, fluency, completeness).
 */
export function getTruthfulScoreDimensions(feedback?: {
  accuracyScore?: number | null;
  fluencyScore?: number | null;
  completenessScore?: number | null;
} | null): {
  accuracy: number | null;
  fluency: number | null;
  completeness: number | null;
} {
  const sanitize = (val?: number | null) =>
    typeof val === "number" && Number.isFinite(val) ? Math.round(val) : null;
  return {
    accuracy: sanitize(feedback?.accuracyScore),
    fluency: sanitize(feedback?.fluencyScore),
    completeness: sanitize(feedback?.completenessScore),
  };
}

/**
 * Computes sequential dual audio playback progression: native -> learner -> null.
 */
export function getSequentialPlaybackNextTrack(
  currentTrack: "native" | "learner",
  hasLearnerAudio: boolean
): "learner" | null {
  if (currentTrack === "native" && hasLearnerAudio) {
    return "learner";
  }
  return null;
}

export interface AccuracyTier {
  color: string;
  ring: string;
  badge: string;
  label: string;
}

/**
 * Returns color tier and accessible label for accuracy score values.
 */
export function getAccuracyTier(val?: number | null): AccuracyTier {
  if (typeof val !== "number" || !Number.isFinite(val)) {
    return {
      color: "text-slate-400",
      ring: "text-slate-400",
      badge: "bg-slate-100 text-slate-700",
      label: "Chưa đánh giá",
    };
  }
  if (val >= 80) {
    return {
      color: "text-emerald-700",
      ring: "text-emerald-500",
      badge: "bg-emerald-100 text-emerald-800",
      label: "Đạt chuẩn",
    };
  }
  if (val >= 60) {
    return {
      color: "text-amber-700",
      ring: "text-amber-500",
      badge: "bg-amber-100 text-amber-900",
      label: "Cần chỉnh lại",
    };
  }
  return {
    color: "text-rose-700",
    ring: "text-rose-500",
    badge: "bg-rose-100 text-rose-800",
    label: "Chưa đạt",
  };
}

/**
 * Formats seconds into MM:SS format for audio playback.
 */
export function formatAudioTime(sec: number): string {
  if (!sec || isNaN(sec) || !isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Generates user-facing status title and message based on the overall speaking score.
 */
export function getSpeakingScoreLabel(
  displayScore: number,
  isNoSpeech?: boolean,
): { title: string; subtitle: string; isStandard: boolean } {
  if (isNoSpeech) {
    return {
      title: "Chưa phát hiện giọng nói",
      subtitle: "Micro chưa thu được âm thanh rõ nét",
      isStandard: false,
    };
  }
  if (displayScore >= 8) {
    return {
      title: "Phát âm xuất sắc",
      subtitle: "Kết quả đánh giá phát âm",
      isStandard: true,
    };
  }
  if (displayScore >= 6) {
    return {
      title: "Phát âm khá tốt",
      subtitle: "Kết quả đánh giá phát âm",
      isStandard: false,
    };
  }
  return {
    title: "Cần luyện tập thêm",
    subtitle: "Kết quả đánh giá phát âm",
    isStandard: false,
  };
}

export interface WordDiagnosticDetails {
  statusBadge: string;
  statusClass: string;
  explanation: string;
}

/**
 * Returns truthful word-level diagnostic explanation and badge styling for assessed words.
 */
export function getWordDiagnosticDetails(
  item?: WordAssessmentInput | null,
): WordDiagnosticDetails {
  if (!item) {
    return {
      statusBadge: "Chưa có dữ liệu",
      statusClass: "bg-slate-100 text-slate-700 border-slate-200",
      explanation: "Từ này chưa có dữ liệu đánh giá.",
    };
  }
  const err = item.errorType?.trim().toLowerCase();
  const isOmitted = err === "omission" || err === "unspoken";
  const score = item.accuracyScore;
  const isCorrect =
    !isOmitted &&
    typeof score === "number" &&
    score >= 80 &&
    (err === "none" || !err);

  if (isCorrect) {
    return {
      statusBadge: "Phát âm chuẩn",
      statusClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
      explanation: `Từ này đạt điểm chính xác ${score}%.`,
    };
  }
  if (isOmitted) {
    return {
      statusBadge: "Bỏ sót từ",
      statusClass: "bg-rose-50 text-rose-800 border-rose-200",
      explanation: "Từ này bị bỏ sót hoặc chưa được phát âm rõ ràng trong câu.",
    };
  }
  if (err === "mispronunciation") {
    return {
      statusBadge: "Cần chỉnh lại âm",
      statusClass: "bg-amber-50 text-amber-900 border-amber-200",
      explanation: `Điểm chính xác đạt ${score ?? "chưa đạt"}%. Hãy lắng nghe audio mẫu và chú ý phát âm rõ âm đuôi.`,
    };
  }
  return {
    statusBadge: "Lỗi phát âm",
    statusClass: "bg-amber-50 text-amber-900 border-amber-200",
    explanation: `Điểm chính xác đạt ${score ?? "chưa đạt"}%. Hãy lắng nghe audio mẫu và chú ý phát âm rõ âm đuôi.`,
  };
}

export const RHYTHM_GUIDANCE_TEXT =
  "Hãy nghe lại câu mẫu và chú ý nhịp câu, trọng âm từ và chỗ ngắt nghỉ.";


