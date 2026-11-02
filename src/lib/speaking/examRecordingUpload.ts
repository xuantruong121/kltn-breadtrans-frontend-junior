import {
  speakingService,
  type SpeakingExamParentContext,
} from "@/lib/api/services/speaking.service";

/**
 * Stores a recording of an exam question: straight to storage when the server
 * offers it, and through the API when the bucket refuses the browser.
 */
export async function uploadExamRecording(input: {
  exerciseId: number;
  blob: Blob;
  key: string;
  maxSeconds: number;
  context: SpeakingExamParentContext;
}): Promise<void> {
  const { exerciseId, blob, key, maxSeconds, context } = input;
  const throughApi = () => speakingService.submitAudio(exerciseId, blob, key, undefined, context);
  const capabilities = await speakingService.getCapabilities();
  if (capabilities.uploadMode !== "presigned") {
    await throughApi();
    return;
  }
  const durationMs = Math.max(
    300,
    Math.min(maxSeconds * 1000 + 1500, Math.round(((blob.size - 44) / 32000) * 1000)),
  );
  const intent = await speakingService.createUploadIntent(
    exerciseId,
    { contentType: "audio/wav", sizeBytes: blob.size, durationMs, idempotencyKey: key },
    undefined,
    context,
  );
  if (intent.isAlreadyFinalized) return;
  try {
    await speakingService.uploadAudioDirectToR2(intent.uploadUrl, blob, intent.signedHeaders);
  } catch {
    await throughApi();
    return;
  }
  await speakingService.finalizeUpload(intent.uploadIntentId);
}
