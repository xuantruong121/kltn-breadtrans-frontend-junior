/**
 * Microphone settings for Speaking recordings that Azure grades.
 *
 * Owner 2026-11-16: a full read of "… borrow a book from the front desk" came
 * back with "from the front desk" marked omitted. The stored WAV had dozens of
 * exact-zero gaps exactly there: the browser's noise suppression treated the
 * softer start and end of the sentence as noise and chopped them, and Azure
 * heard "Turn on next". Automatic gain control also kept the opening words
 * too quiet to recognize. Pronunciation scoring needs the voice as spoken, so
 * both are off. Echo cancellation stays on: it keeps the sample audio out of
 * the recording if it plays through speakers.
 */
export const SPEAKING_MIC_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: false,
  autoGainControl: false,
};
