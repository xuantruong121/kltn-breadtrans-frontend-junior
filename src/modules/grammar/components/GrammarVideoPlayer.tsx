"use client";

import React from "react";
import { BookOpen, Lightbulb, PlayCircle } from "lucide-react";
import { GrammarTopicDetail } from "../types";

interface GrammarVideoPlayerProps {
  topic: GrammarTopicDetail;
}

/**
 * Compact, proportional theory panel:
 * - Core formula card with generous typography and contrast
 * - Topic description / rule text
 * - Optional collapsible video player (never renders a giant empty box)
 */
export const GrammarVideoPlayer: React.FC<GrammarVideoPlayerProps> = ({ topic }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2">
      <BookOpen size={16} className="text-sky-500 dark:text-sky-400" aria-hidden="true" />
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Lý thuyết ngữ pháp
      </h3>
    </div>

    {topic.keyFormula && (
      <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/90 dark:bg-amber-950/40 p-4 sm:p-5">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
          <Lightbulb size={13} aria-hidden="true" />
          Công thức cốt lõi
        </div>
        <p className="font-mono text-base font-bold leading-relaxed text-amber-950 dark:text-amber-200">
          {topic.keyFormula}
        </p>
      </div>
    )}

    {topic.description && (
      <p className="text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300">
        {topic.description}
      </p>
    )}

    {topic.videoYoutubeId ? (
      <details
        className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40"
        data-testid="grammar-video-collapsible"
      >
        <summary className="flex cursor-pointer select-none list-none items-center gap-2.5 px-4 py-3 text-xs sm:text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100/70 dark:text-slate-200 dark:hover:bg-slate-800/80">
          <PlayCircle size={16} className="text-sky-500 dark:text-sky-400" aria-hidden="true" />
          Xem video bài giảng
        </summary>
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${topic.videoYoutubeId}?rel=0&modestbranding=1`}
            title={`Video: ${topic.title}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="size-full border-none"
          />
        </div>
      </details>
    ) : (
      <p
        className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 dark:text-slate-500"
        data-testid="grammar-no-video"
      >
        <PlayCircle size={14} aria-hidden="true" />
        Chưa có video minh họa
      </p>
    )}
  </div>
);
