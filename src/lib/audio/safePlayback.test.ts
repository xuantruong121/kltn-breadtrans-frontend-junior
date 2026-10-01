import assert from "node:assert/strict";
import test from "node:test";
import { playAudioFromStart, waitForAudioReady } from "./safePlayback.ts";

class FakeAudio {
  readyState = 0;
  currentTime = 4;
  loadCount = 0;
  playCount = 0;
  pauseCount = 0;
  private listeners = new Map<string, Set<() => void>>();

  addEventListener(name: string, listener: () => void) {
    const listeners = this.listeners.get(name) ?? new Set<() => void>();
    listeners.add(listener);
    this.listeners.set(name, listeners);
  }

  removeEventListener(name: string, listener: () => void) {
    this.listeners.get(name)?.delete(listener);
  }

  load() {
    this.loadCount += 1;
  }

  pause() {
    this.pauseCount += 1;
  }

  play() {
    this.playCount += 1;
    return Promise.resolve();
  }

  emit(name: string) {
    this.readyState = 2;
    for (const listener of this.listeners.get(name) ?? []) listener();
  }
}

const asAudio = (audio: FakeAudio) => audio as unknown as HTMLAudioElement;

test("does not play before loaded data is available", async () => {
  const audio = new FakeAudio();
  const pending = playAudioFromStart(asAudio(audio), 1000);
  await Promise.resolve();
  assert.equal(audio.playCount, 0);
  assert.equal(audio.currentTime, 4);

  audio.emit("loadeddata");
  await pending;
  assert.equal(audio.currentTime, 0);
  assert.equal(audio.playCount, 1);
  assert.equal(audio.loadCount, 1);
});

test("uses an already decoded player without reloading it", async () => {
  const audio = new FakeAudio();
  audio.readyState = 4;
  await waitForAudioReady(asAudio(audio));
  assert.equal(audio.loadCount, 0);
});

test("readiness failure never starts playback", async () => {
  const audio = new FakeAudio();
  const pending = playAudioFromStart(asAudio(audio), 10);
  await assert.rejects(pending, /timed out/);
  assert.equal(audio.playCount, 0);
});
