"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Edit2,
  ImageIcon,
  Mic,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { AdminImageThumb } from "@/components/admin/AdminImageThumb";
import {
  editContentLabel,
  examGroupLabel,
  groupActions,
  isFixedPrompt,
  type GroupAction,
} from "@/lib/examStudio/examGroupCard";
import { groupAudioSrc } from "@/lib/toeic/adminGroupAudio";

export type ExamCardQuestion = {
  id: number;
  questionNumber: number;
  text?: string | null;
  options: string[];
  correctIndex: number;
  explanation?: string | null;
};

export type ExamCardGroup = {
  id: number;
  part: number;
  imageUrl?: string | null;
  audioUrl?: string | null;
  audioPlaybackUrl?: string | null;
  passageText?: string | null;
  transcriptText?: string | null;
  mediaMetadata?: {
    audio?: { stale?: boolean } | null;
    image?: { stale?: boolean } | null;
  } | null;
  questions: ExamCardQuestion[];
};

type Props<G extends ExamCardGroup> = {
  group: G;
  /** L&R borrowed from another exam: shown, never changed from here. */
  readOnly: boolean;
  focusedQuestion: number | null;
  busy: boolean;
  onAction: (action: GroupAction, group: G) => void;
  onEditQuestion: (group: G, question: ExamCardQuestion) => void;
  onDeleteQuestion: (question: ExamCardQuestion) => void;
};

const MENU: Record<GroupAction, { icon: LucideIcon; label: string }> = {
  editContent: { icon: Edit2, label: "Sửa nội dung" },
  findImage: { icon: Search, label: "Tìm ảnh khác" },
  questionFromImage: { icon: RefreshCw, label: "Viết lại câu theo ảnh" },
  regenerateAudio: { icon: Mic, label: "Tạo lại audio" },
  suggestQuestion: { icon: RefreshCw, label: "AI gợi ý câu khác" },
  addQuestion: { icon: Plus, label: "Thêm câu hỏi" },
  deleteGroup: { icon: Trash2, label: "Xoá nhóm" },
};

function GroupMenu<G extends ExamCardGroup>({
  group,
  busy,
  onAction,
}: Pick<Props<G>, "group" | "busy" | "onAction">) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex-none">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Thao tác khác"
        className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 z-40 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
          >
            {groupActions(group.part, Boolean(group.imageUrl)).map((action) => {
              const { icon: Icon, label } = MENU[action];
              return (
                <button
                  key={action}
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  onClick={() => {
                    setOpen(false);
                    onAction(action, group);
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm disabled:opacity-50 ${action === "deleteGroup" ? "text-rose-700 hover:bg-rose-50" : "text-slate-700 hover:bg-slate-100"}`}
                >
                  <Icon size={14} aria-hidden="true" />
                  {action === "editContent"
                    ? editContentLabel(group.part)
                    : label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function MissingMedia<G extends ExamCardGroup>({
  group,
  readOnly,
  onAction,
}: Pick<Props<G>, "group" | "readOnly" | "onAction">) {
  const noImage = group.part === 1 && !group.imageUrl;
  const noAudio = group.part <= 4 && !group.audioUrl;
  const noPassage = group.part >= 6 && !group.passageText;
  const stale =
    group.mediaMetadata?.audio?.stale || group.mediaMetadata?.image?.stale;
  if (!noImage && !noAudio && !noPassage && !stale) return null;
  const message = [
    noImage && "thiếu ảnh",
    noAudio && "thiếu audio",
    noPassage && "thiếu đoạn văn",
    group.mediaMetadata?.audio?.stale && "audio cần tạo lại",
    group.mediaMetadata?.image?.stale && "ảnh cần tạo lại",
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <AlertTriangle size={14} className="flex-none" aria-hidden="true" />
      <span className="font-medium first-letter:uppercase">{message}</span>
      {!readOnly && noImage && (
        <button
          type="button"
          onClick={() => onAction("findImage", group)}
          className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-semibold"
        >
          <ImageIcon size={12} aria-hidden="true" /> Tìm ảnh
        </button>
      )}
      {!readOnly && (noImage || noPassage) && (
        <button
          type="button"
          onClick={() => onAction("editContent", group)}
          className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-semibold"
        >
          <Upload size={12} aria-hidden="true" />{" "}
          {noPassage ? "Thêm đoạn văn" : "Tải ảnh lên"}
        </button>
      )}
      {!readOnly && (noAudio || group.mediaMetadata?.audio?.stale) && (
        <button
          type="button"
          onClick={() => onAction("regenerateAudio", group)}
          className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-semibold"
        >
          <RefreshCw size={12} aria-hidden="true" /> Tạo audio
        </button>
      )}
    </div>
  );
}

/** One group as an admin reviews it: everything visible, nothing behind a tab. */
export function ExamGroupCard<G extends ExamCardGroup>({
  group,
  readOnly,
  focusedQuestion,
  busy,
  onAction,
  onEditQuestion,
  onDeleteQuestion,
}: Props<G>) {
  const audioSrc = groupAudioSrc(group);
  const showScript = group.part >= 3 && group.part <= 4 && group.transcriptText;
  const showPassage = group.part >= 6 && group.passageText;
  const multiple = group.questions.length > 1;

  const questions = group.questions.length ? (
    <div className="space-y-3">
      {group.questions.map((question) => (
        <div
          key={question.id}
          id={`exam-question-${question.questionNumber}`}
          className={`scroll-mt-24 rounded-lg border p-3 ${focusedQuestion === question.questionNumber ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"}`}
        >
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 text-sm font-semibold leading-6 text-slate-900">
              <span className="mr-2 text-slate-500">
                Câu {question.questionNumber}
              </span>
              {!isFixedPrompt(question.text) && question.text}
            </p>
            {!readOnly && (
              <div className="flex flex-none items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEditQuestion(group, question)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Edit2 size={12} aria-hidden="true" /> Sửa
                </button>
                {multiple && (
                  <button
                    type="button"
                    onClick={() => onDeleteQuestion(question)}
                    aria-label={`Xoá câu ${question.questionNumber}`}
                    className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 hover:border-rose-200 hover:text-rose-600"
                  >
                    <Trash2 size={12} aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
          </div>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {question.options.map((option, index) => {
              const correct = index === question.correctIndex;
              return (
                <li
                  key={index}
                  className={`flex items-start gap-1.5 rounded-md border px-2.5 py-1.5 text-sm leading-5 ${correct ? "border-emerald-300 bg-emerald-50 font-semibold text-emerald-900" : "border-slate-200 text-slate-700"}`}
                >
                  <span className="flex-none">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <span className="min-w-0 flex-1">{option}</span>
                  {correct && (
                    <Check
                      size={14}
                      className="mt-0.5 flex-none text-emerald-600"
                      aria-label="Đáp án đúng"
                    />
                  )}
                </li>
              );
            })}
          </ul>
          {question.explanation && (
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {question.explanation}
            </p>
          )}
        </div>
      ))}
    </div>
  ) : (
    <p className="text-sm text-slate-600">Nhóm này chưa có câu hỏi.</p>
  );

  return (
    <article
      id={`exam-group-${group.id}`}
      className="scroll-mt-24 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="min-w-0 text-sm font-bold text-slate-900">
          {examGroupLabel(group)}
        </h3>
        {!readOnly && (
          <GroupMenu group={group} busy={busy} onAction={onAction} />
        )}
      </div>

      <MissingMedia group={group} readOnly={readOnly} onAction={onAction} />

      {audioSrc && (
        <audio
          controls
          preload="none"
          src={audioSrc}
          className="h-9 w-full"
          aria-label={`Audio ${examGroupLabel(group)}`}
        />
      )}
      {group.part === 2 && group.transcriptText && (
        <p className="text-sm font-semibold leading-6 text-slate-900">
          {group.transcriptText}
        </p>
      )}
      {showScript && (
        <details className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
          <summary className="cursor-pointer font-semibold text-slate-900">
            Lời thoại
          </summary>
          <p className="mt-2 whitespace-pre-line leading-6">
            {group.transcriptText}
          </p>
        </details>
      )}

      {group.imageUrl ? (
        <div className="grid gap-3 md:grid-cols-[280px_minmax(0,1fr)]">
          <AdminImageThumb
            src={group.imageUrl}
            alt={examGroupLabel(group)}
            className="h-48 w-full"
          />
          {questions}
        </div>
      ) : showPassage ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="max-h-96 overflow-y-auto whitespace-pre-line rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-800">
            {group.passageText}
          </div>
          {questions}
        </div>
      ) : (
        questions
      )}
    </article>
  );
}
