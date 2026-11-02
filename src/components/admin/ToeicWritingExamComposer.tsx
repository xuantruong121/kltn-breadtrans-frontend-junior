"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, PenLine, Save } from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import ImageUploadField from "@/components/admin/ImageUploadField";
import { BTN_AI, BTN_SECONDARY } from "@/components/admin/cmsButtons";

type TaskKind = "PICTURE_SENTENCE" | "WRITTEN_REQUEST" | "OPINION_ESSAY";
type Slot = {
  order: number;
  taskKind: TaskKind;
  filled: boolean;
  title: string;
  prompt: string;
  email: string;
  imageUrl: string;
  keywords: string[];
};
type Section = {
  publicationStatus: string;
  editable: boolean;
  slots: Slot[];
};

const TASK_LABELS: Record<TaskKind, string> = {
  PICTURE_SENTENCE: "Viết câu theo tranh",
  WRITTEN_REQUEST: "Trả lời email",
  OPINION_ESSAY: "Bài luận nêu ý kiến",
};
const FIELD =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100";
const unwrap = <T,>(value: any): T => (value?.data ?? value) as T;
const emptyForm = { title: "", prompt: "", email: "", imageUrl: "", keywords: "" };

/** The 8 Writing tasks of one exam. They are written here, never picked from practice. */
export default function ToeicWritingExamComposer({
  examId,
  onChanged,
}: {
  examId: number;
  onChanged?: () => void;
}) {
  const [section, setSection] = useState<Section | null>(null);
  const [selected, setSelected] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const slot = section?.slots.find((item) => item.order === selected);
  const readyCount = section?.slots.filter((item) => item.filled).length ?? 0;
  const disabled = busy || !section?.editable;

  const load = async () => {
    try {
      setSection(
        unwrap<Section>(await axiosClient.get(`/admin/exams/${examId}/writing`)),
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể tải phần Writing của đề."));
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // `load` is scoped to this component and keyed by the exam id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  useEffect(() => {
    if (!slot) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      title: slot.title || `TOEIC Writing — Câu ${slot.order}`,
      prompt: slot.prompt,
      email: slot.email,
      imageUrl: slot.imageUrl,
      keywords: slot.keywords.join(", "),
    });
  }, [slot]);

  const save = async () => {
    if (!slot) return;
    setBusy(true);
    try {
      const saved = await axiosClient.put(
        `/admin/exams/${examId}/writing/slots/${slot.order}`,
        {
          title: form.title,
          prompt: form.prompt,
          email: form.email,
          imageUrl: form.imageUrl,
          keywords: form.keywords.split(",").map((word) => word.trim()),
        },
      );
      setSection(unwrap<Section>(saved));
      toast.success(`Đã lưu câu ${slot.order}.`);
      onChanged?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể lưu câu Writing."));
    } finally {
      setBusy(false);
    }
  };

  const suggest = async () => {
    if (!slot) return;
    setBusy(true);
    try {
      const response = await axiosClient.post("/admin/writing/ai/suggest-task", {
        taskType: slot.taskKind,
        topic: form.title.trim() || undefined,
        currentPrompt: form.prompt.trim() || undefined,
      });
      const data = unwrap<{ prompt?: string; email?: string; keywords?: string[] }>(
        response,
      );
      if (!data?.prompt) {
        toast.error("Không nhận được đề bài hợp lệ từ AI.");
        return;
      }
      setForm((current) => ({
        ...current,
        prompt: data.prompt ?? current.prompt,
        email: data.email ?? current.email,
        keywords: data.keywords?.join(", ") ?? current.keywords,
      }));
      toast.success("Đã nhận gợi ý. Hãy kiểm tra rồi lưu.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể gợi ý đề bài lúc này."));
    } finally {
      setBusy(false);
    }
  };

  if (!section || !slot)
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
        <Loader2 className="animate-spin" size={16} /> Đang tải phần Writing...
      </div>
    );

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <PenLine size={17} /> Phần Writing của đề
          </p>
          <p className="mt-1 text-sm text-slate-600">
            8 câu theo cấu trúc TOEIC, chỉ thuộc đề này.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
            {readyCount}/8 câu
          </span>
        </div>
      </div>

      {!section.editable && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Đề đã xuất bản nên chỉ xem được. Muốn sửa, hãy nhân bản đề.
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(190px,0.75fr)_minmax(0,1.5fr)]">
        <div className="grid content-start grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
          {section.slots.map((item) => (
            <button
              key={item.order}
              type="button"
              onClick={() => setSelected(item.order)}
              aria-pressed={item.order === selected}
              className={`self-start rounded-lg border p-2 text-left text-sm ${item.order === selected ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
            >
              <span className="flex items-center justify-between font-semibold text-slate-900">
                Câu {item.order}
                {item.filled && (
                  <CheckCircle2 size={15} className="text-emerald-600" />
                )}
              </span>
              <span className="text-xs text-slate-600">
                {TASK_LABELS[item.taskKind]}
              </span>
              {item.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt=""
                  loading="lazy"
                  className="mt-1 h-14 w-full rounded object-cover"
                />
              )}
            </button>
          ))}
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">
              Câu {slot.order} · {TASK_LABELS[slot.taskKind]}
            </p>
            {section.editable && slot.taskKind !== "PICTURE_SENTENCE" && (
              <button
                type="button"
                onClick={() => void suggest()}
                disabled={busy}
                className={BTN_AI}
              >
                Gợi ý đề bài bằng AI
              </button>
            )}
          </div>
          <label className="block text-sm font-semibold text-slate-700">
            Tiêu đề câu
            <input
              value={form.title}
              disabled={disabled}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              className={FIELD}
            />
          </label>
          {slot.taskKind === "WRITTEN_REQUEST" && (
            <label className="block text-sm font-semibold text-slate-700">
              Email cần trả lời
              <textarea
                rows={6}
                value={form.email}
                disabled={disabled}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                className={FIELD}
              />
            </label>
          )}
          <label className="block text-sm font-semibold text-slate-700">
            Đề bài
            <textarea
              rows={4}
              value={form.prompt}
              disabled={disabled}
              onChange={(event) =>
                setForm({ ...form, prompt: event.target.value })
              }
              className={FIELD}
            />
          </label>
          {slot.taskKind === "PICTURE_SENTENCE" && (
            <>
              <ImageUploadField
                label="Ảnh của câu"
                value={form.imageUrl}
                disabled={disabled}
                onChange={(imageUrl) => setForm({ ...form, imageUrl })}
              />
              <label className="block text-sm font-semibold text-slate-700">
                Từ khoá bắt buộc, cách nhau bằng dấu phẩy
                <input
                  value={form.keywords}
                  disabled={disabled}
                  onChange={(event) =>
                    setForm({ ...form, keywords: event.target.value })
                  }
                  className={FIELD}
                />
              </label>
            </>
          )}
          {section.editable && (
            <div className="flex justify-end border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy}
                className={BTN_SECONDARY}
              >
                <Save size={15} /> Lưu câu {slot.order}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
