"use client";

import React from "react";
import { BookOpen, Lightbulb, PlayCircle } from "lucide-react";
import { GrammarTopicDetail } from "../types";

interface GrammarVideoPlayerProps {
  topic: GrammarTopicDetail;
}

export const GrammarVideoPlayer: React.FC<GrammarVideoPlayerProps> = ({ topic }) => (
  <div className="space-y-6">
    {topic.videoYoutubeId ? (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-xs">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${topic.videoYoutubeId}?rel=0&modestbranding=1`}
          title={topic.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="size-full border-none"
        />
      </div>
    ) : (
      <div className="flex aspect-video flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-200 dark:border-sky-900/60 bg-sky-50 dark:bg-sky-950/40 p-6 text-center text-sky-800 dark:text-sky-300">
        <PlayCircle size={42} aria-hidden="true" />
        <p className="mt-3 font-bold">Bài học này chưa có video minh họa</p>
        <p className="mt-1 text-sm font-medium">Bạn vẫn có thể xem lý thuyết và làm bài tập bên cạnh.</p>
      </div>
    )}

    <section className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{topic.title}</h2>
        <p className="mt-1 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
          {topic.description || "Củng cố cấu trúc qua ví dụ và bài tập thực hành."}
        </p>
      </div>
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
          <Lightbulb size={16} className="text-amber-500 dark:text-amber-400" aria-hidden="true" /> Công thức ghi nhớ cốt lõi
        </div>
        <p className="text-lg font-bold text-amber-900 dark:text-amber-200 font-mono">
          {topic.keyFormula || "Xem ví dụ và áp dụng cấu trúc trong bài tập."}
        </p>
      </div>
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-300">
          <BookOpen size={16} className="text-sky-500 dark:text-sky-400" aria-hidden="true" /> Cách học hiệu quả
        </h3>
        <p className="text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">
          Xem lý thuyết, sau đó hoàn thành bài tập để hệ thống lưu kết quả và cập nhật tiến độ thật của bạn.
        </p>
      </div>
    </section>
  </div>
);
