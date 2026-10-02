"use client";

import React from "react";
import { BookOpen, Lightbulb, PlayCircle } from "lucide-react";
import { GrammarTopicDetail } from "../types";

interface GrammarVideoPlayerProps {
  topic: GrammarTopicDetail;
}

/**
 * Compact theory panel: key formula card + description + optional collapsible video.
 * No longer renders a full-height aspect-video placeholder when video is absent.
 */
export const GrammarVideoPlayer: React.FC<GrammarVideoPlayerProps> = ({ topic }) => (
  <div className="space-y-3.5">
    <div className="flex items-center gap-1.5">
      <BookOpen size={14} className="text-sky-500 dark:text-sky-400" aria-hidden="true" />
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Lý thuyết
      </h3>
    </div>

    {topic.keyFormula && (
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 p-3.5">
        <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
          <Lightbulb size={11} aria-hidden="true" />
          Công thức cốt lõi
        </div>
        <p className="font-mono text-sm font-bold leading-snug text-amber-900 dark:text-amber-200">
          {topic.keyFormula}
        </p>
      </div>
    )}

    {topic.description && (
      <p className="text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-400">
        {topic.description}
      </p>
    )}

    {topic.videoYoutubeId ? (
      <details
        className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
        data-testid="grammar-video-collapsible"
      >
        <summary className="flex cursor-pointer select-none list-none items-center gap-2 px-3 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60">
          <PlayCircle size={14} className="text-sky-500 dark:text-sky-400" aria-hidden="true" />
          Xem video minh họa
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
        className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500"
        data-testid="grammar-no-video"
      >
        <PlayCircle size={12} aria-hidden="true" />
        Chưa có video minh họa
      </p>
    )}
  </div>
);
