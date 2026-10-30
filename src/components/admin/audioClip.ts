/**
 * The upload endpoint accepts plain audio types (audio/webm, audio/mp4, …);
 * a browser recorder reports "audio/webm;codecs=opus". Pure.
 */
export function recordedFileType(recorderMime: string): {
  type: string;
  extension: string;
} {
  const type = (recorderMime.split(";")[0] || "audio/webm").trim().toLowerCase();
  const extension =
    type === "audio/mp4" || type === "audio/x-m4a"
      ? "m4a"
      : type === "audio/ogg"
        ? "ogg"
        : type === "audio/mpeg"
          ? "mp3"
          : type === "audio/wav"
            ? "wav"
            : "webm";
  return { type: extension === "webm" ? "audio/webm" : type, extension };
}

/** 10 MB and audio only: a word's pronunciation is a few seconds. */
export function audioFileProblem(file: { type: string; size: number }): string | null {
  if (!file.type.startsWith("audio/")) return "Chỉ nhận file âm thanh (mp3, m4a, wav, ogg, webm).";
  if (file.size > 10 * 1024 * 1024) return "File audio tối đa 10MB.";
  return null;
}
