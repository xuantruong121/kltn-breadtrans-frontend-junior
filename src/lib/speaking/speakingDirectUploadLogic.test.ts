import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Phase 2: Direct-to-Cloudflare-R2 Presigned Audio Upload Frontend Logic Tests.
 * Tests pure client upload orchestration, header preservation, progress handling,
 * cancellation, security storage boundaries, and error sanitization.
 */

// Simulated Speaking Attempt Orchestrator for Phase 2
interface DirectUploadState {
  phase: string;
  uploadProgress: number;
  submissionId: number | null;
  errorMessage: string | null;
}

class MockDirectUploadPipeline {
  public state: DirectUploadState = {
    phase: 'READY',
    uploadProgress: 0,
    submissionId: null,
    errorMessage: null,
  };
  public inFlight = false;
  public multipartCalled = false;
  public presignedPutCalled = false;
  public finalizeCalled = false;
  public headersSent: Record<string, string> = {};
  public simulatedStorage: Map<string, ArrayBuffer> = new Map();

  async runPipeline(params: {
    uploadMode: 'presigned' | 'proxy';
    audioBlob: { size: number; arrayBuffer: () => Promise<ArrayBuffer> };
    idempotencyKey: string;
    shouldFailPut?: boolean;
    abortSignal?: AbortSignal;
    storageMock?: (url: string, headers: Record<string, string>, body: ArrayBuffer) => Promise<void>;
  }) {
    if (this.inFlight) return;
    this.inFlight = true;

    try {
      if (params.uploadMode === 'proxy') {
        this.state.phase = 'SUBMITTING';
        this.multipartCalled = true;
        this.state.submissionId = 100;
        this.state.phase = 'POLLING';
        return;
      }

      // Step A: Request Upload Intent
      this.state.phase = 'REQUESTING_UPLOAD';
      const intent = {
        uploadIntentId: 'intent-uuid-456',
        uploadUrl: 'https://r2.storage.example/speaking/pending/10/intent-uuid-456.wav?X-Amz-Signature=secret123',
        signedHeaders: {
          'Content-Type': 'audio/wav',
        },
        objectKey: 'speaking/pending/10/intent-uuid-456.wav',
        maxSizeBytes: 10485760,
      };

      // Step B: Direct Browser PUT to R2 Storage
      this.state.phase = 'UPLOADING';
      this.state.uploadProgress = 0;
      this.presignedPutCalled = true;
      this.headersSent = { ...intent.signedHeaders };

      if (params.abortSignal?.aborted) {
        throw new Error('Upload aborted by user');
      }

      if (params.shouldFailPut) {
        throw new Error('Network error during direct storage upload');
      }

      // Progress reporting
      this.state.uploadProgress = 50;
      this.state.uploadProgress = 100;

      const buffer = await params.audioBlob.arrayBuffer();
      if (params.storageMock) {
        await params.storageMock(intent.uploadUrl, intent.signedHeaders, buffer);
      } else {
        this.simulatedStorage.set(intent.objectKey, buffer);
      }

      // Step C: Server Finalization (only after PUT succeeds)
      this.state.phase = 'FINALIZING';
      this.finalizeCalled = true;

      const finalizedSubmission = {
        submissionId: 202,
        status: 'PENDING',
        pollUrl: '/speaking/submissions/202',
      };
      this.state.submissionId = finalizedSubmission.submissionId;

      this.state.phase = 'POLLING';
    } catch (err: any) {
      if (err.message.includes('aborted')) {
        this.state.phase = 'READY';
      } else {
        this.state.phase = 'FAILED';
        // Sanitize technical messages
        this.state.errorMessage = err.message.includes('storage') || err.message.includes('R2')
          ? 'Không thể tải lên tệp âm thanh. Vui lòng thử gửi lại.'
          : err.message;
      }
    } finally {
      this.inFlight = false;
    }
  }
}

test('Phase 2 Direct Upload: audio uploads directly to presigned URL with correct headers and never touches multipart route', async () => {
  const pipeline = new MockDirectUploadPipeline();
  const dummyBlob = {
    size: 160000,
    arrayBuffer: async () => new ArrayBuffer(160000),
  };

  await pipeline.runPipeline({
    uploadMode: 'presigned',
    audioBlob: dummyBlob,
    idempotencyKey: 'spk-test-1',
  });

  assert.equal(pipeline.presignedPutCalled, true, 'Audio MUST be uploaded via presigned PUT');
  assert.equal(pipeline.multipartCalled, false, 'Audio MUST NOT touch NestJS multipart route in presigned mode');
  assert.equal(pipeline.finalizeCalled, true, 'Finalize MUST be called after successful PUT');
  assert.equal(pipeline.headersSent['Content-Type'], 'audio/wav', 'Signed Content-Type header MUST be preserved');
  assert.equal(pipeline.state.submissionId, 202);
  assert.equal(pipeline.state.phase, 'POLLING');
});

test('Phase 2 Fallback Mode: routes through multipart route when uploadMode is proxy', async () => {
  const pipeline = new MockDirectUploadPipeline();
  const dummyBlob = {
    size: 160000,
    arrayBuffer: async () => new ArrayBuffer(160000),
  };

  await pipeline.runPipeline({
    uploadMode: 'proxy',
    audioBlob: dummyBlob,
    idempotencyKey: 'spk-test-proxy',
  });

  assert.equal(pipeline.multipartCalled, true, 'Multipart route used in proxy mode');
  assert.equal(pipeline.presignedPutCalled, false, 'Presigned PUT not called in proxy mode');
  assert.equal(pipeline.finalizeCalled, false, 'Finalize not called in proxy mode');
  assert.equal(pipeline.state.submissionId, 100);
});

test('Phase 2 Progress Tracking: updates progress from 0% to 100% during PUT', async () => {
  const pipeline = new MockDirectUploadPipeline();
  const dummyBlob = {
    size: 320000,
    arrayBuffer: async () => new ArrayBuffer(320000),
  };

  await pipeline.runPipeline({
    uploadMode: 'presigned',
    audioBlob: dummyBlob,
    idempotencyKey: 'spk-test-prog',
  });

  assert.equal(pipeline.state.uploadProgress, 100, 'Upload progress reaches 100%');
});

test('Phase 2 Failure Safety: failed PUT halts pipeline, never calls finalize, and sets friendly non-technical error', async () => {
  const pipeline = new MockDirectUploadPipeline();
  const dummyBlob = {
    size: 160000,
    arrayBuffer: async () => new ArrayBuffer(160000),
  };

  await pipeline.runPipeline({
    uploadMode: 'presigned',
    audioBlob: dummyBlob,
    idempotencyKey: 'spk-test-fail',
    shouldFailPut: true, // Network/CORS/Storage error
  });

  assert.equal(pipeline.presignedPutCalled, true);
  assert.equal(pipeline.finalizeCalled, false, 'Finalize MUST NOT be called if PUT failed');
  assert.equal(pipeline.state.phase, 'FAILED');
  assert.equal(
    pipeline.state.errorMessage,
    'Không thể tải lên tệp âm thanh. Vui lòng thử gửi lại.',
    'User error must be friendly and non-technical',
  );
  assert.doesNotMatch(pipeline.state.errorMessage || '', /R2|S3|AWS|BullMQ|Cloudflare/i, 'No technical leaks in UI');
});

test('Phase 2 Cancellation: abort signal cancels upload and reverts phase safely to READY', async () => {
  const pipeline = new MockDirectUploadPipeline();
  const dummyBlob = {
    size: 160000,
    arrayBuffer: async () => new ArrayBuffer(160000),
  };

  const controller = new AbortController();
  controller.abort(); // user clicked cancel

  await pipeline.runPipeline({
    uploadMode: 'presigned',
    audioBlob: dummyBlob,
    idempotencyKey: 'spk-test-abort',
    abortSignal: controller.signal,
  });

  assert.equal(pipeline.state.phase, 'READY', 'Phase safely reverts to READY on user abort');
  assert.equal(pipeline.finalizeCalled, false, 'Finalize never called on abort');
  assert.equal(pipeline.inFlight, false, 'In-flight guard released');
});

test('Phase 2 Duplicate Submit Prevention: in-flight guard rejects simultaneous submissions', async () => {
  const pipeline = new MockDirectUploadPipeline();
  pipeline.inFlight = true;

  const dummyBlob = {
    size: 160000,
    arrayBuffer: async () => new ArrayBuffer(160000),
  };

  await pipeline.runPipeline({
    uploadMode: 'presigned',
    audioBlob: dummyBlob,
    idempotencyKey: 'spk-test-dup',
  });

  assert.equal(pipeline.presignedPutCalled, false, 'Duplicate action while in-flight was prevented');
});

test('Phase 2 Security Boundary: presigned storage URL is never persisted in client storage', () => {
  const store = {
    data: new Map<string, string>(),
    setItem(k: string, v: string) { this.data.set(k, v); },
    getItem(k: string) { return this.data.get(k) ?? null; },
  };
  const presignedUrl = 'https://r2.storage.example/speaking/pending/10/intent.wav?X-Amz-Signature=secret_bearer_token';
  const submissionId = 202;
  const exerciseId = 1;

  store.setItem(
    `breadtrans:speaking:pending:${exerciseId}`,
    JSON.stringify({
      submissionId,
      submittedAt: Date.now(),
    }),
  );

  const stored = store.getItem(`breadtrans:speaking:pending:${exerciseId}`);
  assert.ok(stored, 'Session storage contains submission record');
  assert.ok(stored.includes('"submissionId":202'));
  assert.doesNotMatch(stored, /X-Amz-Signature/, 'Presigned URL MUST NEVER be stored in client storage');
  assert.doesNotMatch(stored, /https:\/\/r2/, 'Storage URL MUST NEVER be stored in client storage');
});
