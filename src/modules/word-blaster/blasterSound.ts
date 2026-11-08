"use client";

import { arenaSound } from "@/modules/arena/sound/arenaSound";

/**
 * Bắn chữ rơi sound effects, made with Web Audio so no file has to load: a
 * zap for a shot, a crumbly burst for a broken block, a falling tone for a
 * lost life, a rising one when the game speeds up. They follow the Arena's
 * sound switch; music stays with arenaSound.
 */
export type BlasterSfx = "shoot" | "explode" | "miss" | "lifeLost" | "speedUp";

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

function noise(ac: AudioContext, ms: number, volume: number, cutoff: number) {
  const length = Math.floor((ac.sampleRate * ms) / 1000);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  const gain = ac.createGain();
  gain.gain.value = volume;
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start();
}

export function playBlaster(name: BlasterSfx) {
  const ac = audio();
  if (!ac) return;
  try {
    if (name === "shoot") tone(ac, 900, 220, 140, "square", 0.08);
    if (name === "explode") {
      noise(ac, 320, 0.35, 1400);
      tone(ac, 180, 60, 260, "triangle", 0.18);
    }
    if (name === "miss") tone(ac, 220, 160, 160, "sawtooth", 0.06);
    if (name === "lifeLost") {
      tone(ac, 440, 220, 220, "triangle", 0.16);
      tone(ac, 330, 110, 320, "triangle", 0.14, 0.18);
    }
    if (name === "speedUp") [523, 659, 784].forEach((f, i) => tone(ac, f, f * 1.01, 140, "square", 0.06, i * 0.11));
  } catch {
    // Sound is a nicety; a browser that refuses it changes nothing.
  }
}
