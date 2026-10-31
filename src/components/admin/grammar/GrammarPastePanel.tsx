"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardPaste, Loader2, Plus } from "lucide-react";
import { BTN_PRIMARY, BTN_SECONDARY } from "../cmsButtons";
import {
  GRAMMAR_PASTE_SAMPLE,
  OPTION_LETTERS,
  parseGrammarPaste,
  rationaleCount,
  type GrammarDraft,
} from "./grammarCms";

/**
 * "Dán nhiều câu": paste questions as text (blocks or spreadsheet rows),
 * check each one before adding, then add the valid ones in one batch.
 */
export default function GrammarPastePanel({
  existingPrompts,
  addLabel,
  onAdd,
  onClose,
}: {
  existingPrompts: string[];
  /** e.g. "Thêm" or "Giữ … để thêm khi tạo chủ đề". */
  addLabel: (count: number) => string;
  onAdd: (drafts: GrammarDraft[]) => Promise<boolean>;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const rows = parseGrammarPaste(text, existingPrompts);
  const valid = rows.filter((row) => !row.problems.length);

  const add = async () => {
    setAdding(true);
    try {
      const added = await onAdd(
        valid.map((row) => ({
          question: row.question,
          options: row.options,
          correctIndex: row.correctIndex,
          explanation: row.explanation,
          optionExplanations: row.optionExplanations,
        })),
      );
      if (added) setText("");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mb-4 rounded-lg border border-slate-300 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-slate-900">Dán nhiều câu</p>
        <button
          type="button"
          onClick={() => setText((current) => (current.trim() ? current : GRAMMAR_PASTE_SAMPLE))}
          className={`${BTN_SECONDARY} ml-auto`}
        >
          <ClipboardPaste size={16} /> Chèn mẫu
        </button>
        <button type="button" onClick={onClose} className={BTN_SECONDARY}>
          Đóng
        </button>
      </div>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div>
          <textarea
            rows={14}
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-label="Văn bản câu hỏi"
            placeholder={GRAMMAR_PASTE_SAMPLE}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
          <details className="mt-2 text-sm text-slate-700">
            <summary className="cursor-pointer font-semibold text-slate-800">Cách viết</summary>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Mỗi câu một khối, các khối cách nhau một dòng trống.</li>
              <li>Dòng đầu là đề bài; 4 dòng sau là phương án (A. / A) / (A) có hay không đều được).</li>
              <li>
                Đánh dấu đáp án đúng bằng <code>*</code> hoặc <code>=</code> ở đầu dòng, hoặc thêm dòng{" "}
                <code>Đáp án: B</code>.
              </li>
              <li>
                Sau phương án sai, viết <code># lý do</code> để học viên biết vì sao sai.
              </li>
              <li>
                Dòng bắt đầu bằng <code>Giải thích:</code> là giải thích chung.
              </li>
              <li>
                Dán từ bảng tính (Excel, Google Sheets): mỗi dòng một câu, các cột là đề bài | A | B | C | D |
                đáp án (A–D) | giải thích.
              </li>
            </ul>
          </details>
        </div>
        <div className="min-w-0">
          {rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
              Dán câu hỏi vào ô bên trái; từng câu sẽ được kiểm tra ở đây trước khi thêm.
            </p>
          ) : (
            <>
              <p className="text-sm tabular-nums text-slate-700">
                {valid.length}/{rows.length} câu hợp lệ
              </p>
              <ol className="mt-2 max-h-96 space-y-2 overflow-y-auto pr-1">
                {rows.map((row) => {
                  const ok = !row.problems.length;
                  return (
                    <li
                      key={row.block}
                      className={`rounded-lg border bg-white p-3 text-sm ${ok ? "border-slate-200" : "border-rose-200"}`}
                    >
                      <p className="flex items-start gap-2 font-medium text-slate-950">
                        {ok ? (
                          <CheckCircle2 size={16} className="mt-0.5 flex-none text-emerald-600" aria-label="Hợp lệ" />
                        ) : (
                          <AlertTriangle size={16} className="mt-0.5 flex-none text-rose-600" aria-label="Có lỗi" />
                        )}
                        <span className="min-w-0">
                          {row.block}. {row.question || <span className="text-rose-700">(thiếu đề bài)</span>}
                        </span>
                      </p>
                      <p className="mt-1 text-slate-700">
                        {row.options.map((option, index) => (
                          <span
                            key={index}
                            className={`mr-3 ${index === row.correctIndex ? "font-semibold text-emerald-700" : ""}`}
                          >
                            {OPTION_LETTERS[index] ?? index + 1}. {option || "—"}
                          </span>
                        ))}
                      </p>
                      {ok && (
                        <p className="mt-1 text-xs text-slate-600">
                          Lý do sai {rationaleCount(row)}/3 · {row.explanation ? "có giải thích" : "chưa có giải thích"}
                        </p>
                      )}
                      {row.problems.length > 0 && (
                        <p className="mt-1 text-rose-700">{row.problems.join(" · ")}</p>
                      )}
                      {row.duplicate && (
                        <p className="mt-1 text-amber-800">Đề bài trùng một câu đã có.</p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        disabled={adding || !valid.length}
        onClick={() => void add()}
        className={`${BTN_PRIMARY} mt-3`}
      >
        {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={16} />}
        {addLabel(valid.length)}
      </button>
    </div>
  );
}
