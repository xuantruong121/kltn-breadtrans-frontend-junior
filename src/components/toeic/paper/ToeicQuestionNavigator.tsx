"use client";

import { memo } from "react";

import { ExamQuestionPanel } from "@/components/toeic/paper/ExamQuestionPanel";
import type { ToeicQuestionGroup } from "@/lib/api/services/toeic.service";
import type { PaperPart } from "@/lib/toeic/examPaper";

type Props = {
  parts: PaperPart<ToeicQuestionGroup>[];
  answers: Record<number, number>;
  marked: Set<number>;
  currentQuestionId: number | null;
  timerValue: string;
  timerLabel?: string;
  timerNote?: string;
  saveStatus: string;
  saveError: boolean;
  saving: boolean;
  restoreDisabled: boolean;
  restoreTitle?: string;
  submitting: boolean;
  onJumpQuestion: (questionNumber: number) => void;
  onSubmit: () => void;
  onSave: () => void;
  onRestore: () => void;
};

/**
 * Right sidebar: time left, submit, restore/save, the review hint, then the
 * question numbers grouped by Part (labels only; Part switching lives in the
 * tabs above the questions).
 */
export const ToeicQuestionNavigator = memo(function ToeicQuestionNavigator({
  parts,
  answers,
  marked,
  currentQuestionId,
  timerValue,
  timerLabel,
  timerNote,
  saveStatus,
  saveError,
  saving,
  restoreDisabled,
  restoreTitle,
  submitting,
  onJumpQuestion,
  onSubmit,
  onSave,
  onRestore,
}: Props) {
  return (
    <ExamQuestionPanel
      sections={parts.map((p) => ({
        key: p.part,
        label: `Part ${p.part}`,
        questions: p.groups.flatMap((g) =>
          g.questions.map((q) => ({
            key: q.id,
            number: q.questionNumber,
            answered: answers[q.id] !== undefined,
            flagged: marked.has(q.id),
            current: currentQuestionId === q.id,
          })),
        ),
      }))}
      timerValue={timerValue}
      timerLabel={timerLabel}
      timerNote={timerNote}
      saveStatus={saveStatus}
      saveError={saveError}
      saving={saving}
      restoreDisabled={restoreDisabled}
      restoreTitle={restoreTitle ?? (restoreDisabled ? "Chưa có bản lưu nào khác bài đang làm" : "Lấy lại bản đã lưu gần nhất trên máy chủ")}
      submitting={submitting}
      onJumpQuestion={onJumpQuestion}
      onSubmit={onSubmit}
      onSave={onSave}
      onRestore={onRestore}
    />
  );
});
