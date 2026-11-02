"use client";

import type { ReactNode } from "react";

/** A Speaking question as the paper shows it, in the exam and in admin preview. */
export type SpeakingPaperTask = {
  id: number;
  number: number;
  text: string;
  imageUrl?: string | null;
  stimulusTitle?: string | null;
  stimulusText?: string | null;
  audioUrl?: string | null;
};

export type WritingPaperTask = {
  id: number;
  number: number;
  prompt: string;
  imageUrl?: string | null;
  keywords?: string[];
  email?: string | null;
};

function QuestionNumber({ value }: { value: number }) {
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
      {value}
    </span>
  );
}

const PROMPT_BOX =
  "rounded-md bg-slate-50 p-3 text-base leading-7 text-slate-900 dark:bg-slate-900 dark:text-slate-100";

function PromptImage({ src, alt }: { src: string; alt: string }) {
  return (
    <img src={src} alt={alt} className="mx-auto max-h-96 w-auto max-w-full rounded-md object-contain" />
  );
}

/**
 * Paper of one Speaking tab. Questions 8-10 share one schedule: it stays on the
 * left and the three questions sit beside it. Every other question has its own
 * row, prompt on the left and the answer on the right.
 */
export function SpeakingPaper({
  tasks,
  renderAnswer,
}: {
  tasks: SpeakingPaperTask[];
  renderAnswer: (task: SpeakingPaperTask) => ReactNode;
}) {
  const shared = tasks.find((task) => task.stimulusText);
  if (shared && tasks.length > 1)
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        <div className={`${PROMPT_BOX} lg:sticky lg:top-24 lg:self-start`}>
          {shared.stimulusTitle && <p className="mb-2 font-semibold">{shared.stimulusTitle}</p>}
          <p className="whitespace-pre-line">{shared.stimulusText}</p>
        </div>
        <ol className="space-y-6">
          {tasks.map((task) => (
            <li key={task.id} id={`question-${task.number}`} className="flex scroll-mt-28 gap-3">
              <QuestionNumber value={task.number} />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-base leading-7 text-slate-900 dark:text-slate-100">{task.text}</p>
                {task.audioUrl && (
                  <audio controls preload="none" src={task.audioUrl} aria-label={`Nghe câu ${task.number}`} className="h-9 w-full max-w-sm" />
                )}
                {renderAnswer(task)}
              </div>
            </li>
          ))}
        </ol>
      </div>
    );

  return (
    <ol className="divide-y divide-slate-200 dark:divide-slate-800">
      {tasks.map((task) => (
        <li
          key={task.id}
          id={`question-${task.number}`}
          className="grid scroll-mt-28 gap-4 py-5 first:pt-0 last:pb-0 lg:grid-cols-2"
        >
          <div className={`${PROMPT_BOX} space-y-3`}>
            {task.imageUrl && <PromptImage src={task.imageUrl} alt={`Tranh của câu ${task.number}`} />}
            {task.text && <p className="whitespace-pre-line">{task.text}</p>}
            {task.audioUrl && (
              <audio controls preload="none" src={task.audioUrl} aria-label={`Nghe câu ${task.number}`} className="h-9 w-full" />
            )}
          </div>
          <div className="flex gap-3">
            <QuestionNumber value={task.number} />
            <div className="min-w-0 flex-1">{renderAnswer(task)}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Paper of one Writing tab: the task on the left, the answer on the right. */
export function WritingPaper({
  tasks,
  renderAnswer,
}: {
  tasks: WritingPaperTask[];
  renderAnswer: (task: WritingPaperTask) => ReactNode;
}) {
  return (
    <ol className="divide-y divide-slate-200 dark:divide-slate-800">
      {tasks.map((task) => (
        <li
          key={task.id}
          id={`question-${task.number}`}
          className="grid scroll-mt-28 gap-4 py-5 first:pt-0 last:pb-0 lg:grid-cols-2"
        >
          <div className={`${PROMPT_BOX} space-y-3`}>
            {task.imageUrl && <PromptImage src={task.imageUrl} alt={`Tranh của câu ${task.number}`} />}
            {Boolean(task.keywords?.length) && (
              <p className="font-semibold">{task.keywords?.join(" / ")}</p>
            )}
            {task.email && <p className="whitespace-pre-line">{task.email}</p>}
            {task.prompt && <p className="whitespace-pre-line">{task.prompt}</p>}
          </div>
          <div className="flex gap-3">
            <QuestionNumber value={task.number} />
            <div className="min-w-0 flex-1">{renderAnswer(task)}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
