/** Resamples recorded audio to the 16 kHz the Speaking API takes. */
export async function resampleTo16kHz(
  audioData: Float32Array,
  inputSampleRate: number,
): Promise<Float32Array> {
  if (inputSampleRate === 16000) return audioData;
  const targetLength = Math.round((audioData.length * 16000) / inputSampleRate);
  if (targetLength <= 0) {
    throw new Error("Target audio length is zero after resample calculation");
  }

  const OfflineCtx =
    window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  if (!OfflineCtx) {
    throw new Error("OfflineAudioContext not supported by this browser");
  }

  const offlineCtx = new OfflineCtx(1, targetLength, 16000);
  const audioBuffer = offlineCtx.createBuffer(
    1,
    audioData.length,
    inputSampleRate,
  );
  audioBuffer.getChannelData(0).set(audioData);

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  return renderedBuffer.getChannelData(0);
}
