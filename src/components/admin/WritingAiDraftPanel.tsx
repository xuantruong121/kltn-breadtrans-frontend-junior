"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import toast from "react-hot-toast";

import axiosClient from "@/lib/api/axiosClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { BTN_AI, BTN_SECONDARY } from "./cmsButtons";
import { writingDraftQuestion, type WritingDraftTask } from "./skillCmsStatus";

type Draft = { title: string; description: string; tasks: WritingDraftTask[]; dropped: number };

const KIND_LABEL = { EMAIL: "Viết email", TRANSLATION: "Dịch câu" } as const;

/**
 * "Soạn bằng AI" for a Writing exercise (owner 2026-11-19): the AI drafts
 * email or "Dịch câu" tasks, the backend drops any that fail its checks, and
 * nothing is saved until the admin picks the tasks to keep.
 */
export function WritingAiDraftPanel({
  quizId,
  topic,
  level,
  kind,
  initialCount,
  autoStart,
  onUseDescription,
  onClose,
  onSaved,
}: {
  quizId: number;
  topic: string;
  level: string;
  kind: "EMAIL" | "TRANSLATION";
  initialCount: number;
  autoStart: boolean;
  onUseDescription?: (description: string) => void;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [count, setCount] = useState(Math.min(10, Math.max(1, initialCount)));
  const [busy, setBusy] = useState<"draft" | "save" | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [picked, setPicked] = useState<boolean[]>([]);
  const started = useRef(false);

  const requestDraft = async () => {
    setBusy("draft");
    try {
      const data = (await axiosClient.post("/admin/writing/ai/full-draft", {
        topic,
        level,
        kind,
        count,
      })) as unknown as Draft;
      setDraft(data);
      setPicked(data.tasks.map(() => true));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "AI chưa soạn được bài lúc này."));
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (!autoStart || started.current) return;
    started.current = true;
    void requestDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once when opened from "Tạo bằng AI"
  }, [autoStart]);

  const chosen = draft ? draft.tasks.filter((_, index) => picked[index]) : [];

  const save = async () => {
    if (!chosen.length) return;
    setBusy("save");
    let saved = 0;
    try {
      // One by one, so the questions keep the draft's order.
      for (const task of chosen) {
        await axiosClient.post(`/admin/skill-content/writing/${quizId}/questions`, writingDraftQuestion(task, level));
        saved += 1;
      }
      toast.success(`Đã thêm ${saved} câu vào bài.`);
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, `Đã thêm ${saved} câu; câu tiếp theo chưa lưu được.`));
      if (saved) await onSaved();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="writing-ai-draft-title"
        className="flex max-h-[90dvh] w-full max-w-3xl flex-col rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h2 id="writing-ai-draft-title" className="text-lg font-semibold text-slate-950">
              Soạn bài {KIND_LABEL[kind]} bằng AI
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Chủ đề: <span className="font-semibold text-slate-800">{topic}</span> · Trình độ {level}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 px-5 py-3">
          <label className="text-sm font-semibold text-slate-800">
            Số câu (tối đa 10)
            <input
              type="number"
              min={1}
              max={10}
              value={count}
              onChange={(event) => setCount(Math.min(10, Math.max(1, Number(event.target.value) || 1)))}
              className="ml-2 w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <button type="button" onClick={() => void requestDraft()} disabled={busy !== null} className={BTN_AI}>
            {busy === "draft" && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            {draft ? "Soạn lại" : "Soạn"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {busy === "draft" && !draft ? (
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 size={16} className="animate-spin" aria-hidden="true" /> AI đang soạn…
            </p>
          ) : !draft ? (
            <p className="text-sm text-slate-600">Bấm Soạn để AI tạo các câu nháp.</p>
          ) : (
            <div className="space-y-4">
              {draft.description && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  <p>{draft.description}</p>
                  {onUseDescription && (
                    <button
                      type="button"
                      onClick={() => {
                        onUseDescription(draft.description);
                        toast.success("Đã điền mô tả. Bấm Lưu nội dung để giữ lại.");
                      }}
                      className="mt-1 font-semibold text-blue-700 hover:underline"
                    >
                      Dùng làm mô tả bài
                    </button>
                  )}
                </div>
              )}
              {draft.dropped > 0 && (
                <p className="text-sm text-amber-800">AI trả thêm {draft.dropped} câu không đạt kiểm tra; hệ thống đã bỏ.</p>
              )}
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {draft.tasks.map((task, index) => (
                  <li key={index}>
                    <label className="flex cursor-pointer gap-3 p-3 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={picked[index] ?? false}
                        onChange={(event) =>
                          setPicked((current) => current.map((value, i) => (i === index ? event.target.checked : value)))
                        }
                        className="mt-1 size-4 accent-blue-600"
                      />
                      <span className="min-w-0 space-y-1 text-sm">
                        <span className="block font-semibold text-slate-900">{task.prompt}</span>
                        {task.acceptedAnswers?.length ? (
                          <span className="block text-slate-700" lang="en">
                            Đáp án: {task.acceptedAnswers.join(" · ")}
                          </span>
                        ) : null}
                        {task.hints?.length ? (
                          <span className="block text-slate-600">
                            Gợi ý: {task.hints.map((hint) => `${hint.vi} = ${hint.en}`).join(", ")}
                          </span>
                        ) : null}
                        {task.grammarTip && <span className="block text-slate-600">Ngữ pháp: {task.grammarTip}</span>}
                        {task.wordRange && (
                          <span className="block text-slate-600">
                            {task.taskType} · {task.wordRange[0]}–{task.wordRange[1]} từ
                          </span>
                        )}
                        {task.explanation && <span className="block text-slate-600">{task.explanation}</span>}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
          <button type="button" onClick={onClose} disabled={busy === "save"} className={BTN_SECONDARY}>
            Hủy
          </button>
          {/* No faded button before there is something to add (anti-slop rule). */}
          {draft &&
            (chosen.length ? (
              <button type="button" onClick={() => void save()} disabled={busy !== null} className={BTN_AI}>
                {busy === "save" && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                Thêm {chosen.length} câu đã chọn
              </button>
            ) : (
              <span className="self-center text-sm text-slate-600">Chọn ít nhất 1 câu để thêm.</span>
            ))}
        </div>
      </div>
    </div>
  );
}
