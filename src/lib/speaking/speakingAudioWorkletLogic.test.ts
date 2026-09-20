import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateChunkSequence,
  mergeAudioChunks,
  createWorkletFlushController,
} from "./speakingAudioWorkletLogic.ts";

test("AudioWorklet: validates initial chunk sequence", () => {
  const result = validateChunkSequence(null, 1);
  assert.equal(result.valid, true);
  assert.equal(result.expected, 1);
  assert.equal(result.gap, 0);
});

test("AudioWorklet: validates strictly consecutive chunk sequence", () => {
  const result1 = validateChunkSequence(1, 2);
  assert.equal(result1.valid, true);
  assert.equal(result1.expected, 2);
  assert.equal(result1.gap, 0);

  const result2 = validateChunkSequence(2, 3);
  assert.equal(result2.valid, true);
  assert.equal(result2.expected, 3);
  assert.equal(result2.gap, 0);
});

test("AudioWorklet: detects dropped chunk gap", () => {
  const result = validateChunkSequence(1, 3);
  assert.equal(result.valid, false);
  assert.equal(result.expected, 2);
  assert.equal(result.gap, 1);
});

test("AudioWorklet: detects out-of-order or duplicate chunk sequence", () => {
  const duplicate = validateChunkSequence(2, 2);
  assert.equal(duplicate.valid, false);
  assert.equal(duplicate.expected, 3);
  assert.equal(duplicate.gap, -1);

  const backwards = validateChunkSequence(5, 3);
  assert.equal(backwards.valid, false);
  assert.equal(backwards.expected, 6);
  assert.equal(backwards.gap, -3);
});

test("AudioWorklet: merges empty chunk array safely", () => {
  const merged = mergeAudioChunks([]);
  assert.equal(merged.length, 0);
  assert.ok(merged instanceof Float32Array);
});

test("AudioWorklet: merges single chunk", () => {
  const chunk = new Float32Array([0.5, -0.25, 0.75]);
  const merged = mergeAudioChunks([chunk]);
  assert.equal(merged.length, 3);
  assert.deepEqual(Array.from(merged), [0.5, -0.25, 0.75]);
});

test("AudioWorklet: merges multiple Float32Array chunks preserving exact order and length", () => {
  const chunk1 = new Float32Array([0.5, 0.25]);
  const chunk2 = new Float32Array([-0.125, -0.375, -0.5]);
  const chunk3 = new Float32Array([0.625]);

  const merged = mergeAudioChunks([chunk1, chunk2, chunk3]);
  assert.equal(merged.length, 6);
  assert.deepEqual(Array.from(merged), [0.5, 0.25, -0.125, -0.375, -0.5, 0.625]);
});

test("AudioWorklet Flush Controller: resolves true when flushed normally", async () => {
  let messageSent: unknown = null;
  const mockNode = {
    port: {
      postMessage: (msg: unknown) => {
        messageSent = msg;
      },
    },
  };

  const controller = createWorkletFlushController(mockNode, 500);
  const flushPromise = controller.flush();

  assert.deepEqual(messageSent, { type: "flush" });

  // Simulate worklet thread responding with 'flushed'
  controller.onFlushedMessage();

  const result = await flushPromise;
  assert.equal(result, true);
});

test("AudioWorklet Flush Controller: resolves false on timeout fallback", async () => {
  const mockNode = {
    port: {
      postMessage: () => {},
    },
  };

  // Set short timeout of 50ms
  const controller = createWorkletFlushController(mockNode, 50);
  const startTime = Date.now();
  const result = await controller.flush();
  const elapsed = Date.now() - startTime;

  assert.equal(result, false);
  assert.ok(elapsed >= 45, `Expected timeout after ~50ms, elapsed: ${elapsed}ms`);
});

test("AudioWorklet Flush Controller: immediately resolves true if node is null", async () => {
  const controller = createWorkletFlushController(null, 500);
  const result = await controller.flush();
  assert.equal(result, true);
});

test("AudioWorklet Flush Controller: cancel prevents memory leaks or delayed resolution", async () => {
  const mockNode = {
    port: {
      postMessage: () => {},
    },
  };

  const controller = createWorkletFlushController(mockNode, 500);
  controller.cancel();
  // Safe to call multiple times
  controller.cancel();
});
