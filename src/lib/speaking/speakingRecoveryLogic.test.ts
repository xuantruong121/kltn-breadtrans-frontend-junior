import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolvePendingSubmissionId,
  calculatePollingInterval,
  isTerminalSpeakingStatus,
  getSpeakingFailureMessage,
} from './speakingRecoveryLogic.ts';

test('Speaking Submission Recovery - Tier 1: URL search param', () => {
  const result = resolvePendingSubmissionId({
    urlSubId: '456',
    exerciseId: 10,
  });
  assert.equal(result, 456);

  // Invalid URL parameter falls through
  const invalidResult = resolvePendingSubmissionId({
    urlSubId: 'invalid-id',
    exerciseId: 10,
  });
  assert.equal(invalidResult, null);
});

test('Speaking Submission Recovery - Tier 2: sessionStorage persistence', () => {
  const now = 1700000000000;
  const validStorage = JSON.stringify({
    submissionId: 789,
    submittedAt: now - 5 * 60 * 1000, // 5 minutes ago
  });

  const recovered = resolvePendingSubmissionId({
    sessionStoredRaw: validStorage,
    exerciseId: 10,
    now,
  });
  assert.equal(recovered, 789);

  // Expired storage (> 30 mins) is ignored
  const expiredStorage = JSON.stringify({
    submissionId: 789,
    submittedAt: now - 35 * 60 * 1000, // 35 minutes ago
  });
  const expiredResult = resolvePendingSubmissionId({
    sessionStoredRaw: expiredStorage,
    exerciseId: 10,
    now,
  });
  assert.equal(expiredResult, null);

  // Corrupted JSON is safely ignored
  const corruptedResult = resolvePendingSubmissionId({
    sessionStoredRaw: 'invalid-json{{{',
    exerciseId: 10,
    now,
  });
  assert.equal(corruptedResult, null);
});

test('Speaking Submission Recovery - Tier 3: Server query active submission', () => {
  const serverSubs = [
    { id: 101, exerciseId: 9, status: 'COMPLETED' as const },
    { id: 102, exerciseId: 10, status: 'PROCESSING' as const },
    { id: 103, exerciseId: 11, status: 'PENDING' as const },
  ];

  const result = resolvePendingSubmissionId({
    serverSubmissions: serverSubs,
    exerciseId: 10,
  });
  assert.equal(result, 102);

  // No active submission for exercise
  const noneActive = resolvePendingSubmissionId({
    serverSubmissions: [
      { id: 101, exerciseId: 10, status: 'COMPLETED' as const },
    ],
    exerciseId: 10,
  });
  assert.equal(noneActive, null);
});

test('Speaking Submission Recovery - Precedence order (Tier 1 > Tier 2 > Tier 3)', () => {
  const now = 1700000000000;
  const result = resolvePendingSubmissionId({
    urlSubId: '111',
    sessionStoredRaw: JSON.stringify({ submissionId: 222, submittedAt: now }),
    serverSubmissions: [{ id: 333, exerciseId: 10, status: 'PROCESSING' as const }],
    exerciseId: 10,
    now,
  });
  assert.equal(result, 111, 'URL sub ID must take precedence over storage and server');

  const tier2Result = resolvePendingSubmissionId({
    sessionStoredRaw: JSON.stringify({ submissionId: 222, submittedAt: now }),
    serverSubmissions: [{ id: 333, exerciseId: 10, status: 'PROCESSING' as const }],
    exerciseId: 10,
    now,
  });
  assert.equal(tier2Result, 222, 'Session storage must take precedence over server query');
});

test('Speaking Adaptive Polling Interval calculation', () => {
  assert.equal(calculatePollingInterval(1), 2000);
  assert.equal(calculatePollingInterval(5), 2000);
  assert.equal(calculatePollingInterval(6), 3000);
  assert.equal(calculatePollingInterval(15), 3000);
  assert.equal(calculatePollingInterval(16), 4500);
  assert.equal(calculatePollingInterval(50), 4500);
});

test('Speaking Terminal Status triggers cleanup', () => {
  assert.equal(isTerminalSpeakingStatus('COMPLETED'), true);
  assert.equal(isTerminalSpeakingStatus('FAILED'), true);
  assert.equal(isTerminalSpeakingStatus('PENDING'), false);
  assert.equal(isTerminalSpeakingStatus('PROCESSING'), false);
});

test('Speaking failure message hides storage details and explains missing audio', () => {
  assert.equal(
    getSpeakingFailureMessage('AUDIO_OBJECT_NOT_FOUND'),
    'Không tìm thấy tệp ghi âm của bài nộp. Vui lòng ghi âm và gửi lại.',
  );
  assert.equal(
    getSpeakingFailureMessage('STORAGE_UNAVAILABLE'),
    'Đánh giá phát âm chưa thành công. Bạn vui lòng thử lại.',
  );
});
