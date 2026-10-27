"use client";

import { memo } from "react";

import type { ToeicQuestionGroup } from "@/lib/api/services/toeic.service";
import { isPassageWorthShowing, splitPassageDocuments, type PaperPart } from "@/lib/toeic/examPaper";
import { ToeicPaperQuestion } from "./ToeicPaperQuestion";

/** One short direction per Part, shown once above its questions. */
const PART_DIRECTIONS: Record<number, string> = {
  1: "Nghe bốn câu mô tả mỗi bức ảnh và chọn câu mô tả đúng nhất.",
  2: "Nghe câu hỏi hoặc câu nói cùng ba câu đáp và chọn câu đáp phù hợp nhất.",
  3: "Nghe đoạn hội thoại và trả lời các câu hỏi.",
  4: "Nghe bài nói ngắn và trả lời các câu hỏi.",
  5: "Chọn đáp án phù hợp nhất để hoàn thành câu.",
  6: "Đọc đoạn văn và chọn đáp án phù hợp cho mỗi chỗ trống.",
  7: "Đọc văn bản và trả lời các câu hỏi.",
};

type Props = {
  part: PaperPart<ToeicQuestionGroup>;
  answers: Record<number, number>;
  marked: Set<number>;
  /** Legacy strict attempts only: why this Part cannot be edited now. */
  lockedReason: string | null;
  onSelect: (questionId: number, optionIndex: number) => void;
  onToggleMark: (questionId: number) => void;
};

function Passage({ text }: { text: string }) {
  return (
    <div className="space-y-3">
      {splitPassageDocuments(text).map((doc, index) => (
        <div key={index} className="rounded-md border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
          {doc.heading && <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{doc.heading}</p>}
          <p className="whitespace-pre-line text-[15px] leading-7 text-slate-800 dark:text-slate-100">{doc.body}</p>
        </div>
      ))}
    </div>
  );
}

const Group = memo(function Group({
  group,
  answers,
  marked,
  disabled,
  onSelect,
  onToggleMark,
}: {
  group: ToeicQuestionGroup;
  answers: Record<number, number>;
  marked: Set<number>;
  disabled: boolean;
  onSelect: Props["onSelect"];
  onToggleMark: Props["onToggleMark"];
}) {
  const passage = isPassageWorthShowing(group.part, group.passageText) ? group.passageText : null;
  const numbers = group.questions.map((q) => q.questionNumber);
  const questions = group.questions.map((q) => (
    <ToeicPaperQuestion
      key={q.id}
      questionId={q.id}
      questionNumber={q.questionNumber}
      text={q.text}
      options={q.options}
      selectedIndex={answers[q.id]}
      marked={marked.has(q.id)}
      audioOnly={group.part <= 2}
      disabled={disabled}
      onSelect={onSelect}
      onToggleMark={onToggleMark}
    />
  ));
  return (
    <section data-group-id={group.id} className="border-b border-slate-100 py-3 last:border-b-0 dark:border-slate-800">
      {(group.part === 3 || group.part === 4) && numbers.length > 1 && (
        <p className="mb-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
          Câu {numbers[0]}–{numbers[numbers.length - 1]}
        </p>
      )}
      {group.imageUrl && (
        <img
          src={group.imageUrl}
          alt={`Ảnh câu ${numbers[0]}`}
          loading="lazy"
          className="mb-1 ml-12 max-h-80 w-auto max-w-[calc(100%-3rem)] rounded-md border border-slate-200 object-contain dark:border-slate-700"
        />
      )}
      {passage ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="lg:sticky lg:top-36 lg:max-h-[calc(100dvh-10rem)] lg:self-start lg:overflow-y-auto">
            <Passage text={passage} />
          </div>
          <div>{questions}</div>
        </div>
      ) : (
        questions
      )}
    </section>
  );
});

/** The questions of ONE Part, in order, with shared context shown once per group. */
export function ToeicExamPaper({ part, answers, marked, lockedReason, onSelect, onToggleMark }: Props) {
  return (
    <div>
      <p className="mb-1 text-sm text-slate-600 dark:text-slate-300">{PART_DIRECTIONS[part.part]}</p>
      {lockedReason && (
        <p className="mb-2 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">{lockedReason}</p>
      )}
      {part.groups.map((group) => (
        <Group
          key={group.id}
          group={group}
          answers={answers}
          marked={marked}
          disabled={Boolean(lockedReason)}
          onSelect={onSelect}
          onToggleMark={onToggleMark}
        />
      ))}
    </div>
  );
}
