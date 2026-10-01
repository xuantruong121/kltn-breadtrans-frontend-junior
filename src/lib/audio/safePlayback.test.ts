import assert from "node:assert/strict";
import test from "node:test";
import {
  createAudioOutputPrimer,
  OUTPUT_WARM_IDLE_MS,
  playAudioFromStart,
  waitForAudioReady,
} from "./safePlayback.ts";

class FakeAudio {
  readyState = 0;
  currentTime = 4;
  loadCount = 0;
  playCount = 0;
  pauseCount = 0;
  volume = 0.7;
  muted = true;
  playbackRate = 0.75;
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

class FakeOutputContext {
  state: AudioContextState = "suspended";
  sampleRate = 1000;
  currentTime = 0;
  destination = {} as AudioDestinationNode;
  resumeCount = 0;
  sourceStartCount = 0;

  async resume() {
    this.resumeCount += 1;
    this.state = "running";
  }

  createGain() {
    return {
      gain: { value: 1 },
      connect() {},
      disconnect() {},
    } as unknown as GainNode;
  }

  createBufferSource() {
    return {
      buffer: null,
      connect() {},
      disconnect() {},
      start: () => {
        this.sourceStartCount += 1;
      },
      stop() {},
    } as unknown as AudioBufferSourceNode;
  }

  createBuffer() {
    return {} as AudioBuffer;
  }
}

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

test("cold playback primes output before starting the real audio at zero", async () => {
  const audio = new FakeAudio();
  audio.readyState = 4;
  const context = new FakeOutputContext();
  const now = 10_000;
  const primer = createAudioOutputPrimer(
    () => context as unknown as AudioContext,
    () => now,
  );
  await playAudioFromStart(
    asAudio(audio),
    1000,
    () => primer.prime(),
  );
  assert.equal(context.resumeCount, 1);
  assert.equal(context.sourceStartCount, 1);
  assert.equal(audio.currentTime, 0);
  assert.equal(audio.playCount, 1);
  assert.equal(audio.volume, 0.7);
  assert.equal(audio.muted, true);
  assert.equal(audio.playbackRate, 0.75);
});

test("immediate replay uses the warm path, then primes again after idle", async () => {
  const context = new FakeOutputContext();
  let now = 20_000;
  const primer = createAudioOutputPrimer(
    () => context as unknown as AudioContext,
    () => now,
  );
  await primer.prime();
  await primer.prime();
  assert.equal(context.sourceStartCount, 1);

  now += OUTPUT_WARM_IDLE_MS + 1;
  await primer.prime();
  assert.equal(context.sourceStartCount, 2);
});

test("a failed output prime does not strand normal media playback", async () => {
  const audio = new FakeAudio();
  audio.readyState = 4;
  const failingPrime = async () => {
    throw new Error("output unavailable");
  };
  await playAudioFromStart(asAudio(audio), 1000, failingPrime);
  assert.equal(audio.currentTime, 0);
  assert.equal(audio.playCount, 1);
});

test("cancelling an operation removes its pending playback", async () => {
  const audio = new FakeAudio();
  const controller = new AbortController();
  const pending = playAudioFromStart(
    asAudio(audio),
    1000,
    async () => undefined,
    controller.signal,
  );
  controller.abort();
  await assert.rejects(pending, /cancelled/);
  assert.equal(audio.playCount, 0);
});
