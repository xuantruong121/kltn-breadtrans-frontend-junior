"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { BTN_PRIMARY, BTN_SECONDARY } from "../cmsButtons";
import { OPTION_LETTERS, questionProblems, type GrammarDraft } from "./grammarCms";

const FIELD =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100 disabled:text-slate-600";

const four = (rows?: Array<string | null> | null) => {
  const out = [...(rows ?? [])].map((row) => row ?? "");
  while (out.length < 4) out.push("");
  return out.slice(0, 4);
};

/**
 * One question: the prompt, four A–D options with a radio for the answer, a
 * "why it is wrong" note under each wrong option, and the explanation.
 * `locked` (learners already answered the topic) keeps prompt, options and
 * answer as graded; the notes and explanation stay editable. The parent
 * saves: `onSubmit` returns false to keep the form open.
 */
export default function GrammarQuestionForm({
  formId,
  initial,
  locked = false,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  formId: string;
  initial: GrammarDraft | null;
  locked?: boolean;
  submitLabel: string;
  onSubmit: (draft: GrammarDraft) => Promise<boolean | void> | boolean | void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial?.question ?? "");
  const [options, setOptions] = useState(() => four(initial?.options));
  const [correct, setCorrect] = useState<number | null>(
    initial && initial.correctIndex >= 0 ? initial.correctIndex : null,
  );
  const [notes, setNotes] = useState(() => four(initial?.optionExplanations));
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [saving, setSaving] = useState(false);
  const problems = questionProblems({ question: text, options, correctIndex: correct });

  const submit = async () => {
    if (problems.length) {
      toast.error(problems.join(". ") + ".");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        question: text.trim(),
        options: options.map((option) => option.trim()),
        correctIndex: correct!,
        explanation: explanation.trim() || null,
        optionExplanations: notes.map((note, index) =>
          index === correct ? null : note.trim() || null,
        ),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="mt-3 space-y-3 border-t border-slate-100 pt-3"
    >
      {locked && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <Lock size={16} className="mt-0.5 flex-none" aria-hidden="true" />
          Học viên đã làm chủ đề này: đề bài, phương án và đáp án giữ nguyên như lúc chấm. Vẫn
          sửa được lý do sai và giải thích.
        </p>
      )}
      <label className="block text-sm font-medium text-slate-800">
        Đề bài
        <textarea
          rows={2}
          autoFocus={!locked}
          disabled={locked}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Ví dụ: She ____ in Hanoi since 2019."
          className={FIELD}
        />
      </label>
      <fieldset>
        <legend className="text-sm font-medium text-slate-800">
          Phương án, đáp án đúng và lý do sai
        </legend>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {options.map((value, index) => {
            const isKey = correct === index;
            return (
              <div
                key={index}
                className={`rounded-lg border px-3 py-1.5 ${
                  isKey
                    ? "border-emerald-400 bg-emerald-50/60 ring-1 ring-emerald-200"
                    : "border-slate-300 bg-white focus-within:border-slate-500"
                }`}
              >
                <div className="flex items-center gap-2">
                  <label className="flex flex-none cursor-pointer items-center gap-2 py-1.5">
                    <input
                      type="radio"
                      name={`grammar-correct-${formId}`}
                      checked={isKey}
                      disabled={locked}
                      onChange={() => setCorrect(index)}
                      aria-label={`Phương án ${OPTION_LETTERS[index]} là đáp án đúng`}
                      className="size-4 cursor-pointer accent-emerald-600"
                    />
                    <span className="w-4 text-sm font-semibold text-slate-700">
                      {OPTION_LETTERS[index]}
                    </span>
                  </label>
                  <input
                    value={value}
                    disabled={locked}
                    onChange={(event) =>
                      setOptions((rows) =>
                        rows.map((row, i) => (i === index ? event.target.value : row)),
                      )
                    }
                    aria-label={`Nội dung phương án ${OPTION_LETTERS[index]}`}
                    className="min-h-9 min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none disabled:text-slate-600"
                  />
                  {isKey && (
                    <span className="flex-none text-xs font-semibold text-emerald-700">Đúng</span>
                  )}
                </div>
                {!isKey && (
                  <input
                    value={notes[index]}
                    onChange={(event) =>
                      setNotes((rows) =>
                        rows.map((row, i) => (i === index ? event.target.value : row)),
                      )
                    }
                    placeholder="Vì sao sai (học viên thấy khi chọn phương án này)"
                    aria-label={`Vì sao phương án ${OPTION_LETTERS[index]} sai`}
                    className="mb-1 min-h-8 w-full border-t border-slate-100 bg-transparent pt-1 text-sm text-slate-700 outline-none placeholder:text-slate-500"
                  />
                )}
              </div>
            );
          })}
        </div>
      </fieldset>
      <label className="block text-sm font-medium text-slate-800">
        Giải thích chung (học viên đọc sau khi nộp bài)
        <textarea
          rows={2}
          value={explanation}
          onChange={(event) => setExplanation(event.target.value)}
          className={FIELD}
        />
      </label>
      {problems.length > 0 && !locked && (
        <p className="text-sm text-slate-600">Còn thiếu: {problems.join(" · ")}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className={BTN_PRIMARY}>
          {saving && <Loader2 size={14} className="animate-spin" />}
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className={BTN_SECONDARY}>
          Hủy
        </button>
      </div>
    </form>
  );
}
