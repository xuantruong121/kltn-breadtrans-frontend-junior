"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  createWorkletFlushController,
  isAudioWorkletSupported,
  mergeAudioChunks,
  type WorkletFlushController,
} from "@/lib/speaking/speakingAudioWorkletLogic";
import { encodeWAV, validateWavBinary } from "@/lib/speaking/speakingPracticeLogic";
import { resampleTo16kHz } from "@/lib/speaking/resampleAudio";

/**
 * Records one microphone answer as the 16 kHz mono WAV the Speaking API takes.
 * Failures throw a message that can be shown to the learner as it is.
 */
export function useWavRecorder() {
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<AudioWorkletNode | null>(null);
  const flushRef = useRef<WorkletFlushController | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef(44100);

  const release = useCallback(() => {
    nodeRef.current?.disconnect();
    nodeRef.current = null;
    flushRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void contextRef.current?.close().catch(() => undefined);
    contextRef.current = null;
  }, []);

  useEffect(() => release, [release]);

  const start = useCallback(async () => {
    if (!isAudioWorkletSupported())
      throw new Error("Trình duyệt chưa hỗ trợ ghi âm. Hãy dùng Chrome, Edge, Firefox hoặc Safari bản mới.");
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const AudioCtx = window.AudioContext;
      const context = new AudioCtx();
      contextRef.current = context;
      sampleRateRef.current = context.sampleRate || 44100;
      await context.audioWorklet.addModule("/worklets/breadtrans-recorder-processor.js");
      const source = context.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(context, "breadtrans-recorder-processor");
      nodeRef.current = node;
      const flush = createWorkletFlushController(node);
      flushRef.current = flush;
      node.port.onmessage = (event: MessageEvent) => {
        if (event.data?.type === "audio") chunksRef.current.push(new Float32Array(event.data.samples));
        else if (event.data?.type === "flushed") flush.onFlushedMessage();
      };
      // A silent output keeps the graph running without echoing the microphone.
      const silent = context.createGain();
      silent.gain.value = 0;
      source.connect(node);
      node.connect(silent);
      silent.connect(context.destination);
    } catch (error) {
      release();
      throw new Error(
        error instanceof DOMException && error.name === "NotFoundError"
          ? "Không tìm thấy micro. Hãy kết nối micro rồi thử lại."
          : "Chưa cấp quyền micro. Hãy cho phép micro trong trình duyệt rồi thử lại.",
      );
    }
  }, [release]);

  const stop = useCallback(
    async (maxDurationMs: number): Promise<Blob> => {
      const flushed = await (flushRef.current?.flush() ?? Promise.resolve(false));
      const sampleRate = sampleRateRef.current;
      release();
      if (!flushed) throw new Error("Bản ghi chưa hoàn tất. Hãy thu lại.");
      const merged = mergeAudioChunks(chunksRef.current);
      if (merged.length === 0) throw new Error("Bản ghi rỗng. Hãy nói to rõ rồi thu lại.");
      const wav = encodeWAV(await resampleTo16kHz(merged, sampleRate), 16000);
      const check = validateWavBinary(await wav.arrayBuffer(), maxDurationMs);
      if (!check.ok) throw new Error(check.message);
      return wav;
    },
    [release],
  );

  return { start, stop };
}
