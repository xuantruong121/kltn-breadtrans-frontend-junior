"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Mic, PlayCircle } from "lucide-react";

import {
  SECTION_BRIEF,
  SECTION_LABEL,
  type RoomComponent,
} from "@/lib/toeic/assessmentRoom";

/** The page between two sections. The section clock starts on its button. */
export function AssessmentSectionIntro({
  title,
  backHref,
  component,
  previous,
  sections,
  pending,
  error,
  onStart,
}: {
  title: string;
  backHref: string;
  component: RoomComponent;
  previous: RoomComponent | null;
  sections: RoomComponent[];
  pending: boolean;
  error: string | null;
  onStart: () => void;
}) {
  const label = SECTION_LABEL[component.kind] ?? "Phần thi";
  const needsMicrophone = component.kind === "SPEAKING";
  const [microphoneError, setMicrophoneError] = useState<string | null>(null);

  const start = async () => {
    if (component.kind === "LISTENING_READING")
      // Fullscreen needs this click; the paper opens inside the same document.
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    if (needsMicrophone && !microphoneError) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        setMicrophoneError(
          "Chưa dùng được micro. Hãy cho phép micro trong trình duyệt rồi bấm lại. Bắt đầu mà không có micro thì không thu âm được.",
        );
        return;
      }
    }
    onStart();
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-5 py-10">
      <Link
        href={backHref}
        className="mb-4 inline-flex min-h-10 items-center gap-2 self-start text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Thoát về trang đề
      </Link>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{title}</p>
        {sections.length > 1 && (
          <ol className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
            {sections.map((section) => (
              <li
                key={section.assessmentComponentId}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 ${
                  section.status === "COMPLETED"
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : section.assessmentComponentId === component.assessmentComponentId
                      ? "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {section.status === "COMPLETED" && <CheckCircle2 size={14} aria-hidden="true" />}
                {SECTION_LABEL[section.kind]}
              </li>
            ))}
          </ol>
        )}
        {previous && (
          <p className="mt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            Đã nộp phần {SECTION_LABEL[previous.kind]}.
          </p>
        )}
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100">Phần {label}</h1>
        <p className="mt-2 text-base leading-7 text-slate-700 dark:text-slate-300">{SECTION_BRIEF[component.kind]}</p>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Đồng hồ chạy ngay khi bắt đầu và không dừng khi rời trang. Hết giờ, phần này tự nộp và chuyển sang phần tiếp theo.
        </p>
        {needsMicrophone && (
          <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
            <Mic size={16} className="mt-1 shrink-0" aria-hidden="true" />
            Trình duyệt sẽ xin quyền dùng micro. Hãy ngồi ở nơi yên tĩnh.
          </p>
        )}
        {(microphoneError || error) && (
          <p role="alert" className="mt-3 rounded-md bg-rose-50 p-3 text-sm font-semibold text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
            {error ?? microphoneError}
          </p>
        )}
        <button
          type="button"
          onClick={() => void start()}
          disabled={pending}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-base font-bold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {pending ? (
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          ) : (
            <PlayCircle size={18} aria-hidden="true" />
          )}
          {microphoneError ? "Vẫn bắt đầu" : `Bắt đầu phần ${label}`}
        </button>
      </div>
    </main>
  );
}
