/**
 * BreadTrans Recorder AudioWorkletProcessor
 *
 * Runs off the main UI thread in an AudioWorkletGlobalScope.
 * Collects raw mono PCM Float32 audio blocks (typically 128 frames per block)
 * and batches them into ~2048-frame chunks before transferring them to the
 * main thread via postMessage transferables.
 *
 * Protocol:
 * - Worklet -> Main: { type: 'audio', sequence: number, samples: ArrayBuffer }
 * - Main -> Worklet: { type: 'flush' }
 * - Worklet -> Main: { type: 'flushed', sequence: number }
 */

class BreadTransRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.sequence = 0;
    this.isRecording = true;

    this.port.onmessage = (event) => {
      const data = event.data;
      if (data && data.type === "flush") {
        this.flush();
      }
    };
  }

  flush() {
    if (this.bufferIndex > 0) {
      const remaining = this.buffer.slice(0, this.bufferIndex);
      this.sequence += 1;
      this.port.postMessage(
        {
          type: "audio",
          sequence: this.sequence,
          samples: remaining.buffer,
        },
        [remaining.buffer],
      );
      this.bufferIndex = 0;
    }
    this.isRecording = false;
    this.port.postMessage({
      type: "flushed",
      sequence: this.sequence,
    });
  }

  process(inputs) {
    if (!this.isRecording) {
      return false;
    }

    const input = inputs[0];
    if (!input || !input[0]) {
      return true;
    }

    const channelData = input[0];
    const len = channelData.length;

    for (let i = 0; i < len; i++) {
      this.buffer[this.bufferIndex++] = channelData[i];

      if (this.bufferIndex >= this.bufferSize) {
        this.sequence += 1;
        const chunk = new Float32Array(this.buffer);
        this.port.postMessage(
          {
            type: "audio",
            sequence: this.sequence,
            samples: chunk.buffer,
          },
          [chunk.buffer],
        );
        this.bufferIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor(
  "breadtrans-recorder-processor",
  BreadTransRecorderProcessor,
);
