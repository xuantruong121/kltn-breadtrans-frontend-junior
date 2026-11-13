"use client";

import React from "react";
import { Lightbulb } from "lucide-react";
import { GrammarTopicDetail } from "../types";

interface GrammarVideoPlayerProps {
  topic: GrammarTopicDetail;
}

/**
 * Compact, proportional theory panel:
 * - Core formula card with generous typography and contrast
 * - Topic description / rule text
 *
 * No video (owner 2026-11-13: "bỏ cái video minh hoạ đi"; no topic has one).
 */
export const GrammarVideoPlayer: React.FC<GrammarVideoPlayerProps> = ({ topic }) => (
  <div className="space-y-4">

    {topic.keyFormula && (
      <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/90 dark:bg-amber-950/40 p-4 sm:p-5">
        <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-amber-800 dark:text-amber-400">
          <Lightbulb size={13} aria-hidden="true" />
          Công thức cốt lõi
        </div>
        <p className="font-mono text-base font-bold leading-relaxed break-words [overflow-wrap:anywhere] text-amber-950 dark:text-amber-200">
          {topic.keyFormula}
        </p>
      </div>
    )}

    {topic.description && (
      <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300">
        {topic.description}
      </p>
    )}

  </div>
);
