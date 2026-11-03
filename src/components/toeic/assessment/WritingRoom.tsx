"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQueries } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import { toeicService } from "@/lib/api/services/toeic.service";
import { writingService } from "@/lib/api/services/writing.service";
import {
  WRITING_GROUPS,
  questionsOf,
  type PreviousSession,
  type RoomComponent,
} from "@/lib/toeic/assessmentRoom";
import { useSectionMarks } from "@/lib/toeic/useSectionMarks";
import { countWritingWords } from "@/lib/writing/writingExperienceLogic";
import { AssessmentRoom } from "./AssessmentRoom";
import { WritingPaper, type WritingPaperTask } from "./ExamPaperViews";

export type WritingComponent = RoomComponent & {
  writingQuizIds: number[];
  writtenQuizIds: number[];
};

const draftKey = (attemptId: number, quizId: number) =>
  `breadtrans:assessment:${attemptId}:writing:${quizId}`;
const checkpointKey = (attemptId: number, componentId: number) =>
  `breadtrans:assessment:${attemptId}:writing-save:${componentId}`;

type Checkpoint = { texts: Record<number, string>; savedAt: string };

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

function readCheckpoint(attemptId: number, componentId: number): Checkpoint | null {
  try {
    const raw = localStorage.getItem(checkpointKey(attemptId, componentId));
    return raw ? (JSON.parse(raw) as Checkpoint) : null;
  } catch {
    return null;
  }
}

function readDrafts(attemptId: number, quizIds: number[]) {
  const drafts: Record<number, string> = {};
  try {
    for (const id of quizIds) drafts[id] = localStorage.getItem(draftKey(attemptId, id)) ?? "";
  } catch {
    // Without storage the answers still live on this page until it is submitted.
  }
  return drafts;
}

export function WritingRoom({
  title,
  attemptId,
  component,
  sections,
  previousSession,
  onContinueSession,
  onSubmitted,
  onExit,
}: {
  title: string;
  attemptId: number;
  component: WritingComponent;
  sections: RoomComponent[];
  previousSession: PreviousSession | null;
  onContinueSession: (attemptId: number) => void;
  onSubmitted: () => void;
  onExit: () => void;
}) {
  const quizIds = component.writingQuizIds;
  const context = useMemo(
    () => ({ attemptId, componentId: component.assessmentComponentId }),
    [attemptId, component.assessmentComponentId],
  );
  const results = useQueries({
    queries: quizIds.map((id) => ({
      queryKey: ["assessment-writing-task", attemptId, id],
      queryFn: () => writingService.getQuizDetails(id, context),
      staleTime: Infinity,
    })),
  });
  const [activeGroup, setActiveGroup] = useState(0);
  const [texts, setTexts] = useState(() => readDrafts(attemptId, quizIds));
  const { marked, toggleMark } = useSectionMarks(attemptId, component.assessmentComponentId);
  const [checkpoint, setCheckpoint] = useState(() =>
    readCheckpoint(attemptId, component.assessmentComponentId),
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        for (const [id, text] of Object.entries(texts))
          localStorage.setItem(draftKey(attemptId, Number(id)), text);
      } catch {
        // Ignore storage quota and private mode failures.
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [attemptId, texts]);

  const submit = useMutation({
    mutationFn: () =>
      toeicService.completeAssessmentComponent(attemptId, component.assessmentComponentId, {
        writingAnswers: quizIds
          .filter((id) => texts[id]?.trim())
          .map((quizId) => ({ quizId, text: texts[quizId] })),
      }),
    onSuccess: () => {
      try {
        for (const id of quizIds) localStorage.removeItem(draftKey(attemptId, id));
        localStorage.removeItem(checkpointKey(attemptId, component.assessmentComponentId));
      } catch {
        // A leftover draft belongs to a finished attempt and is never read again.
      }
      onSubmitted();
    },
  });
  const { mutate, isPending } = submit;
  const handleSubmit = useCallback(() => {
    if (!isPending) mutate();
  }, [isPending, mutate]);

  const answered = useMemo(
    () =>
      new Set(
        quizIds.flatMap((id, index) =>
          texts[id]?.trim() || component.writtenQuizIds.includes(id) ? [index + 1] : [],
        ),
      ),
    [component.writtenQuizIds, quizIds, texts],
  );

  const saveCheckpoint = () => {
    const point: Checkpoint = { texts: { ...texts }, savedAt: new Date().toISOString() };
    try {
      localStorage.setItem(checkpointKey(attemptId, component.assessmentComponentId), JSON.stringify(point));
      setCheckpoint(point);
      toast.success(`Đã lưu bài làm lúc ${timeOf(point.savedAt)}`);
    } catch {
      toast.error("Máy này không cho lưu bài. Hãy nộp bài trước khi rời trang.");
    }
  };

  const failed = results.some((result) => result.isError);
  if (results.some((result) => result.isLoading))
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" aria-label="Đang tải đề" />
      </div>
    );

  const tasks = questionsOf(WRITING_GROUPS[activeGroup]).flatMap((number): WritingPaperTask[] => {
    const quiz = results[number - 1]?.data;
    if (!quiz) return [];
    return [
      {
        id: quizIds[number - 1],
        number,
        prompt: quiz.prompt ?? "",
        imageUrl: quiz.imageUrl,
        keywords: quiz.keywords,
        email: quiz.email,
      },
    ];
  });

  return (
    <AssessmentRoom
      title={title}
      component={component}
      sections={sections}
      groups={WRITING_GROUPS}
      activeGroup={activeGroup}
      onGroupChange={setActiveGroup}
      answered={answered}
      marked={marked}
      totalQuestions={quizIds.length}
      save={{
        status: checkpoint
          ? `Bản lưu lúc ${timeOf(checkpoint.savedAt)} trên máy này`
          : "Bài viết được tự động lưu trên máy này.",
        onSave: saveCheckpoint,
        restore: checkpoint
          ? {
              title: `Bản lưu lúc ${timeOf(checkpoint.savedAt)}`,
              detail: "Các bài viết đã đổi sau thời điểm đó sẽ bị thay bằng bản đã lưu.",
              onPick: () => {
                setTexts({ ...checkpoint.texts });
                toast.success("Đã khôi phục bản lưu.");
              },
            }
          : null,
      }}
      previousSession={previousSession}
      onContinueSession={onContinueSession}
      submitting={submit.isPending}
      submitError={submit.isError}
      onSubmit={handleSubmit}
      onExit={onExit}
    >
      {failed && (
        <p role="alert" className="mb-3 rounded-md bg-rose-50 p-3 text-sm font-semibold text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
          Chưa tải được một số câu. Tải lại trang để thử lại; bài viết và đồng hồ vẫn giữ nguyên.
        </p>
      )}
      <WritingPaper
        tasks={tasks}
        marks={{ marked, onToggle: toggleMark }}
        renderAnswer={(task) => {
          const text = texts[task.id] ?? "";
          const handedIn = component.writtenQuizIds.includes(task.id) && !text;
          return (
            <div>
              {handedIn && (
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 size={15} aria-hidden="true" /> Đã nộp câu này
                </p>
              )}
              <textarea
                value={text}
                onChange={(event) => setTexts((current) => ({ ...current, [task.id]: event.target.value }))}
                maxLength={10000}
                rows={task.number <= 5 ? 4 : 14}
                aria-label={`Bài viết câu ${task.number}`}
                spellCheck={false}
                className="w-full rounded-md border border-slate-300 bg-white p-3 text-base leading-7 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-950"
              />
              <p className="mt-1 text-sm tabular-nums text-slate-600 dark:text-slate-400">
                {countWritingWords(text)} từ
              </p>
            </div>
          );
        }}
      />
    </AssessmentRoom>
  );
}
