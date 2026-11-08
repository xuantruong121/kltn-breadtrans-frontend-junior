"use client";

import { arenaSound } from "@/modules/arena/sound/arenaSound";

/**
 * Bắn chữ rơi sound effects, made with Web Audio so no file has to load: a
 * tick per key that climbs with the letter, a crumbly burst with a bass thump
 * for a broken block, a chime that climbs with the combo, a thud for a lost
 * life, beeps for the countdown. They follow the Arena's sound switch; music
 * stays with arenaSound. Keys are quiet and big moments loud, on purpose.
 */
export type BlasterSfx = "key" | "shoot" | "explode" | "combo" | "miss" | "lifeLost" | "speedUp" | "count" | "go";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!arenaSound.getPrefs().sfx) return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(ac: AudioContext, from: number, to: number, ms: number, type: OscillatorType, volume: number, delay = 0) {
  const start = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + ms / 1000);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + ms / 1000);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + ms / 1000 + 0.02);
}

function noise(ac: AudioContext, ms: number, volume: number, cutoff: number, delay = 0) {
  const length = Math.floor((ac.sampleRate * ms) / 1000);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  const gain = ac.createGain();
  gain.gain.value = volume;
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(ac.currentTime + delay);
}

/** `level`: the letter's place in the word for "key", the combo for "combo". */
export function playBlaster(name: BlasterSfx, level = 0) {
  const ac = audio();
  if (!ac) return;
  try {
    if (name === "key") {
      // A short tick a semitone higher per letter, capped at an octave.
      const f = 660 * Math.pow(2, Math.min(12, level) / 12);
      tone(ac, f, f * 0.7, 55, "square", 0.035);
    }
    if (name === "shoot") tone(ac, 900, 220, 140, "square", 0.08);
    if (name === "explode") {
      noise(ac, 380, 0.32, 1800);
      tone(ac, 150, 42, 320, "sine", 0.32);
      tone(ac, 520, 180, 120, "triangle", 0.08);
    }
    if (name === "combo") {
      const base = 523 * Math.pow(2, Math.min(10, level - 2) / 12);
      [1, 1.26, 1.5].forEach((m, i) => tone(ac, base * m, base * m * 1.005, 160, "triangle", 0.07, i * 0.06));
    }
    if (name === "miss") tone(ac, 200, 140, 140, "sawtooth", 0.05);
    if (name === "lifeLost") {
      noise(ac, 260, 0.4, 320);
      tone(ac, 120, 45, 380, "sine", 0.38);
      tone(ac, 330, 150, 300, "triangle", 0.1, 0.12);
    }
    if (name === "speedUp") [523, 659, 784].forEach((f, i) => tone(ac, f, f * 1.01, 140, "square", 0.06, i * 0.11));
    if (name === "count") tone(ac, 660, 660, 120, "square", 0.07);
    if (name === "go") {
      tone(ac, 990, 990, 90, "square", 0.08);
      tone(ac, 1320, 1320, 220, "square", 0.07, 0.09);
    }
  } catch {
    // Sound is a nicety; a browser that refuses it changes nothing.
  }
}
