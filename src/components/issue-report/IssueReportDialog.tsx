"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import {
  issueReportService,
  type CreateIssueReportInput,
  type IssueReportArea,
  type IssueReportCategory,
  type IssueReportImpact,
} from "@/lib/api/services/issue-report.service";

const categoryOptions: Array<{ value: IssueReportCategory; label: string }> = [
  { value: "CONTENT_ERROR", label: "Nội dung chưa chính xác" },
  { value: "ANSWER_ERROR", label: "Đáp án có vấn đề" },
  { value: "EXPLANATION_ERROR", label: "Giải thích chưa rõ" },
  { value: "AUDIO_ERROR", label: "Âm thanh không hoạt động" },
  { value: "IMAGE_ERROR", label: "Hình ảnh không phù hợp" },
  { value: "SCORING_ERROR", label: "Kết quả chấm điểm" },
  { value: "TECHNICAL_ERROR", label: "Tính năng không hoạt động" },
  { value: "ACCESSIBILITY", label: "Khó sử dụng / trợ năng" },
  { value: "OTHER", label: "Vấn đề khác" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  area: IssueReportArea;
  title?: string;
  context?: Omit<
    CreateIssueReportInput,
    "area" | "category" | "impact" | "description"
  >;
}

export function IssueReportDialog({
  open,
  onClose,
  area,
  title = "Báo lỗi nội dung",
  context,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLSelectElement>(null);
  const [category, setCategory] =
    useState<IssueReportCategory>("TECHNICAL_ERROR");
  const [impact, setImpact] = useState<IssueReportImpact>("NON_BLOCKING");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reportCode, setReportCode] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: issueReportService.create });

  useEffect(() => {
    if (!open) return;
    firstFieldRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        "button, select, textarea",
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = description.trim();
    if (trimmed.length < 20) {
      setError("Bạn hãy mô tả ít nhất 20 ký tự để đội ngũ có thể kiểm tra.");
      return;
    }
    setError(null);
    mutation.mutate(
      { area, category, impact, description: trimmed, ...context },
      {
        onSuccess: (result) => {
          setReportCode(result.reportCode);
          setDescription("");
        },
        onError: (err) =>
          setError(
            getApiErrorMessage(
              err,
              "Không gửi được báo lỗi. Vui lòng thử lại.",
            ),
          ),
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="issue-report-title"
        className="w-full max-w-lg rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle size={20} />
            </span>
            <div>
              <h2
                id="issue-report-title"
                className="text-lg font-bold text-slate-900"
              >
                {title}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Thông tin này sẽ được gửi đến đội ngũ BreadTrans.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            aria-label="Đóng cửa sổ báo lỗi"
          >
            <X size={20} />
          </button>
        </div>
        {reportCode ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto text-emerald-600" size={40} />
            <h3 className="mt-3 text-lg font-bold text-slate-900">
              Đã gửi báo lỗi
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Mã tiếp nhận:{" "}
              <strong className="text-slate-900">{reportCode}</strong>
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 min-h-11 rounded-xl bg-amber-500 px-5 font-bold text-white hover:bg-amber-600"
            >
              Đóng
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 pt-5">
            <div>
              <label
                htmlFor="issue-category"
                className="mb-1.5 block text-sm font-semibold text-slate-800"
              >
                Bạn gặp vấn đề gì?
              </label>
              <select
                ref={firstFieldRef}
                id="issue-category"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as IssueReportCategory)
                }
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold text-slate-800">
                Mức độ ảnh hưởng
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["NON_BLOCKING", "Vẫn học được"],
                    ["BLOCKING", "Không thể tiếp tục"],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm ${impact === value ? "border-amber-500 bg-amber-50 text-amber-900" : "border-slate-200 text-slate-600"}`}
                  >
                    <input
                      type="radio"
                      name="issue-impact"
                      value={value}
                      checked={impact === value}
                      onChange={() => setImpact(value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label
                htmlFor="issue-description"
                className="mb-1.5 block text-sm font-semibold text-slate-800"
              >
                Mô tả chi tiết
              </label>
              <textarea
                id="issue-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                maxLength={1500}
                placeholder="Ví dụ: Ở câu 3, nút phát âm không có tiếng dù tôi đã thử tải lại trang."
                className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm leading-6 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                aria-describedby="issue-description-help"
              />
              <div
                id="issue-description-help"
                className="mt-1 flex justify-between text-xs text-slate-500"
              >
                <span>Không cần dùng thuật ngữ kỹ thuật.</span>
                <span>{description.length}/1500</span>
              </div>
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700"
              >
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-bold text-white shadow-sm hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mutation.isPending && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                Gửi báo lỗi
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
