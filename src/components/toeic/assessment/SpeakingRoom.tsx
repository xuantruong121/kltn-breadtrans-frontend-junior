"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueries } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { CheckCircle2, Loader2, Mic, Square } from "lucide-react";

import { toeicService } from "@/lib/api/services/toeic.service";
import {
  speakingService,
  type SpeakingExamParentContext,
} from "@/lib/api/services/speaking.service";
import { uploadExamRecording } from "@/lib/speaking/examRecordingUpload";
import { generateSpeakingIdempotencyKey } from "@/lib/speaking/speakingPracticeLogic";
import { useWavRecorder } from "@/lib/speaking/useWavRecorder";
import { useSectionMarks } from "@/lib/toeic/useSectionMarks";
import {
  MAX_SPEAKING_TAKES,
  SPEAKING_GROUPS,
  questionsOf,
  speakingTimeLabel,
  type PreviousSession,
  type RoomComponent,
} from "@/lib/toeic/assessmentRoom";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { AssessmentRoom } from "./AssessmentRoom";
import { SpeakingPaper, type SpeakingPaperTask } from "./ExamPaperViews";

type Timing = { readingSeconds: number; prepSeconds: number; responseSeconds: number };

export type SpeakingComponent = RoomComponent & {
  speakingExerciseIds: number[];
  speakingTakes: Array<{ exerciseId: number; takes: number }>;
};

/** A recording in flight when the section closes gets this long to finish. */
const UPLOAD_WAIT_MS = 30_000;

function NoteBox({ attemptId, exerciseId }: { attemptId: number; exerciseId: number }) {
  const key = `breadtrans:assessment:${attemptId}:note:${exerciseId}`;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(key) ?? "";
    } catch {
      return "";
    }
  });
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="min-h-9 rounded-md border border-blue-600 px-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40"
      >
        Viết ghi chú / dàn ý
      </button>
      {open && (
        <textarea
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            try {
              localStorage.setItem(key, event.target.value);
            } catch {
              // A note is a convenience; losing it costs no answer.
            }
          }}
          rows={3}
          aria-label="Ghi chú"
          className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      )}
    </div>
  );
}

function SpeakingAnswer({
  task,
  timing,
  attemptId,
  context,
  takes,
  blocked,
  closed,
  onRecording,
  onUpload,
  onSaved,
}: {
  task: SpeakingPaperTask;
  timing: Timing;
  attemptId: number;
  context: SpeakingExamParentContext;
  takes: number;
  blocked: boolean;
  closed: boolean;
  onRecording: (finish: (() => Promise<void>) | null) => void;
  onUpload: (upload: Promise<void>) => void;
  onSaved: () => void;
}) {
  const recorder = useWavRecorder();
  const [phase, setPhase] = useState<"IDLE" | "RECORDING" | "SAVING" | "RETRY">("IDLE");
  const [left, setLeft] = useState(timing.responseSeconds);
  const [error, setError] = useState<string | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const finishingRef = useRef(false);
  const pendingRef = useRef<{ blob: Blob; key: string } | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (localUrl) URL.revokeObjectURL(localUrl);
    },
    [localUrl],
  );

  const send = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending) return;
    setPhase("SAVING");
    setError(null);
    const upload = uploadExamRecording({
      exerciseId: task.id,
      blob: pending.blob,
      key: pending.key,
      maxSeconds: timing.responseSeconds,
      context,
    });
    onUpload(upload);
    try {
      await upload;
      pendingRef.current = null;
      setPhase("IDLE");
      onSaved();
    } catch (err) {
      setPhase("RETRY");
      setError(getApiErrorMessage(err, "Chưa lưu được bản ghi."));
    }
  }, [context, onSaved, onUpload, task.id, timing.responseSeconds]);

  const finish = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    onRecording(null);
    setPhase("SAVING");
    try {
      const blob = await recorder.stop(timing.responseSeconds * 1000 + 1500);
      setLocalUrl(URL.createObjectURL(blob));
      pendingRef.current = { blob, key: generateSpeakingIdempotencyKey(task.id) };
      await send();
    } catch (err) {
      setPhase("IDLE");
      setError(err instanceof Error ? err.message : "Bản ghi chưa hoàn tất. Hãy thu lại.");
    } finally {
      finishingRef.current = false;
    }
  }, [onRecording, recorder, send, task.id, timing.responseSeconds]);

  const begin = async () => {
    setError(null);
    try {
      await recorder.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không mở được micro.");
      return;
    }
    if (localUrl) URL.revokeObjectURL(localUrl);
    setLocalUrl(null);
    setPhase("RECORDING");
    onRecording(finish);
    const endsAt = Date.now() + timing.responseSeconds * 1000;
    setLeft(timing.responseSeconds);
    timerRef.current = window.setInterval(() => {
      const remaining = Math.ceil((endsAt - Date.now()) / 1000);
      setLeft(Math.max(0, remaining));
      if (remaining <= 0) void finish();
    }, 250);
  };

  const label = takes > 0 ? "Thu lại" : "Thu âm";
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-600 dark:text-slate-400">{speakingTimeLabel(timing)}</p>
      <NoteBox attemptId={attemptId} exerciseId={task.id} />
      {phase === "RECORDING" && (
        <button
          type="button"
          onClick={() => void finish()}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700"
        >
          <Square size={15} aria-hidden="true" /> Dừng · còn {left} giây
        </button>
      )}
      {phase === "SAVING" && (
        <p role="status" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          <Loader2 size={15} className="animate-spin" aria-hidden="true" /> Đang lưu bản ghi
        </p>
      )}
      {phase === "RETRY" && (
        <button
          type="button"
          onClick={() => void send()}
          className="inline-flex min-h-11 items-center rounded-md border border-rose-300 px-4 text-sm font-bold text-rose-800 hover:bg-rose-50 dark:text-rose-200 dark:hover:bg-rose-950/40"
        >
          Lưu lại bản ghi
        </button>
      )}
      {phase === "IDLE" && takes < MAX_SPEAKING_TAKES && !closed && (
        <button
          type="button"
          onClick={() => void begin()}
          disabled={blocked}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-amber-500 px-4 text-sm font-bold uppercase text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Mic size={16} aria-hidden="true" /> {label}
        </button>
      )}
      {phase === "IDLE" && takes > 0 && (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 size={15} aria-hidden="true" />
          Đã lưu bản ghi{takes >= MAX_SPEAKING_TAKES ? ", hết lượt thu lại" : ""}
        </p>
      )}
      {localUrl && phase === "IDLE" && (
        <audio controls src={localUrl} aria-label={`Nghe lại bản ghi câu ${task.number}`} className="h-9 w-full max-w-sm" />
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}

export function SpeakingRoom({
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
  component: SpeakingComponent;
  sections: RoomComponent[];
  previousSession: PreviousSession | null;
  onContinueSession: (attemptId: number) => void;
  onSubmitted: () => void;
  onExit: () => void;
}) {
  const context = useMemo(
    () => ({ attemptId, componentId: component.assessmentComponentId }),
    [attemptId, component.assessmentComponentId],
  );
  const results = useQueries({
    queries: component.speakingExerciseIds.map((id) => ({
      queryKey: ["assessment-speaking-task", attemptId, id],
      queryFn: () => speakingService.getExerciseById(id, context),
      staleTime: Infinity,
    })),
  });
  const exercises = results.map((result) => result.data);

  const [activeGroup, setActiveGroup] = useState(0);
  const { marked, toggleMark } = useSectionMarks(attemptId, component.assessmentComponentId);
  const [takes, setTakes] = useState<Record<number, number>>(() =>
    Object.fromEntries(component.speakingTakes.map((item) => [item.exerciseId, item.takes])),
  );
  const [recording, setRecording] = useState(false);
  const finishRef = useRef<(() => Promise<void>) | null>(null);
  const uploadsRef = useRef(new Set<Promise<void>>());

  const onRecording = useCallback((finish: (() => Promise<void>) | null) => {
    finishRef.current = finish;
    setRecording(Boolean(finish));
  }, []);
  const onUpload = useCallback((upload: Promise<void>) => {
    uploadsRef.current.add(upload);
    void upload.catch(() => undefined).finally(() => uploadsRef.current.delete(upload));
  }, []);

  const submit = useMutation({
    mutationFn: async () => {
      // The server refuses a recording once its section is closed.
      await finishRef.current?.();
      await Promise.race([
        Promise.allSettled([...uploadsRef.current]),
        new Promise((resolve) => window.setTimeout(resolve, UPLOAD_WAIT_MS)),
      ]);
      await toeicService.completeAssessmentComponent(attemptId, component.assessmentComponentId);
    },
    onSuccess: onSubmitted,
  });
  const { mutate, isPending } = submit;
  const handleSubmit = useCallback(() => {
    if (!isPending) mutate();
  }, [isPending, mutate]);

  const answered = useMemo(
    () =>
      new Set(
        component.speakingExerciseIds.flatMap((id, index) => (takes[id] > 0 ? [index + 1] : [])),
      ),
    [component.speakingExerciseIds, takes],
  );

  const failed = results.some((result) => result.isError);
  if (results.some((result) => result.isLoading))
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" aria-label="Đang tải đề" />
      </div>
    );

  const tasks = questionsOf(SPEAKING_GROUPS[activeGroup]).flatMap((number): SpeakingPaperTask[] => {
    const exercise = exercises[number - 1];
    if (!exercise) return [];
    return [
      {
        id: exercise.id,
        number,
        text: exercise.targetText ?? "",
        imageUrl: exercise.imageUrl,
        audioUrl: exercise.audioUrl,
        stimulusTitle: exercise.stimulus?.title?.replace(`${title} — `, ""),
        stimulusText: exercise.stimulus?.kind === "INFORMATION" ? exercise.stimulus.content : null,
      },
    ];
  });

  return (
    <AssessmentRoom
      title={title}
      component={component}
      sections={sections}
      groups={SPEAKING_GROUPS}
      activeGroup={activeGroup}
      onGroupChange={setActiveGroup}
      answered={answered}
      marked={marked}
      totalQuestions={component.speakingExerciseIds.length}
      save={{
        status: "Bản ghi được tự động lưu lên máy chủ.",
        // A recording is stored the moment it ends, so there is nothing to send.
        onSave: () => toast.success("Các bản ghi đã được lưu."),
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
          Chưa tải được một số câu. Tải lại trang để thử lại; đồng hồ vẫn giữ nguyên.
        </p>
      )}
      <SpeakingPaper
        tasks={tasks}
        marks={{ marked, onToggle: toggleMark }}
        renderAnswer={(task) => {
          const exercise = exercises[task.number - 1];
          return (
            <SpeakingAnswer
              key={task.id}
              task={task}
              timing={exercise?.timing ?? { readingSeconds: 0, prepSeconds: 0, responseSeconds: 45 }}
              attemptId={attemptId}
              context={context}
              takes={takes[task.id] ?? 0}
              blocked={recording}
              closed={submit.isPending}
              onRecording={onRecording}
              onUpload={onUpload}
              onSaved={() => setTakes((current) => ({ ...current, [task.id]: (current[task.id] ?? 0) + 1 }))}
            />
          );
        }}
      />
    </AssessmentRoom>
  );
}
