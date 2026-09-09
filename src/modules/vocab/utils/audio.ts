/**
 * Audio and speech synthesis utilities for the Vocabulary Study Room
 */

let activeAudio: HTMLAudioElement | null = null;

export function stopCurrentAudio() {
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch {
      // ignore
    }
    activeAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

export function playWordAudio(
  word: string,
  audioUrl?: string,
  accent: "us" | "uk" = "us",
  playbackRate: number = 1.0
): Promise<void> {
  stopCurrentAudio();

  return new Promise((resolve) => {
    if (audioUrl && audioUrl.startsWith("http")) {
      const audio = new Audio(audioUrl);
      activeAudio = audio;
      audio.playbackRate = playbackRate;
      audio.onended = () => {
        activeAudio = null;
        resolve();
      };
      audio.onerror = () => {
        // Fallback to speech synthesis
        fallbackSpeechSynthesis(word, accent, playbackRate).then(resolve);
      };
      audio.play().catch(() => {
        fallbackSpeechSynthesis(word, accent, playbackRate).then(resolve);
      });
    } else {
      fallbackSpeechSynthesis(word, accent, playbackRate).then(resolve);
    }
  });
}

function fallbackSpeechSynthesis(
  text: string,
  accent: "us" | "uk",
  playbackRate: number
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = accent === "uk" ? "en-GB" : "en-US";
      utterance.rate = playbackRate;

      // Select matching voice if available
      const voices = window.speechSynthesis.getVoices();
      const targetLang = accent === "uk" ? "en-GB" : "en-US";
      const voice = voices.find((v) => v.lang === targetLang || v.lang.startsWith(targetLang.slice(0, 2)));
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    } catch {
      resolve();
    }
  });
}

/**
 * Web Audio API gentle sound effects without external assets
 */
export function playChime(type: "success" | "error" | "flip" | "step") {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === "success") {
      // Pleasant two-tone chord
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.setValueAtTime(659.25, now + 0.1); // E5

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(783.99, now); // G5
      osc2.frequency.setValueAtTime(1046.5, now + 0.1); // C6

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } else if (type === "error") {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, now); // A3
      osc.frequency.setValueAtTime(196, now + 0.12); // G3

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === "flip") {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    }
  } catch {
    // AudioContext blocked or not supported
  }
}
