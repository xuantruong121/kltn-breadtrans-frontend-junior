"use client";

import React from "react";
import { Lightbulb, BookOpen, Clock } from "lucide-react";
import { GrammarLesson } from "../types";

interface GrammarVideoPlayerProps {
  lesson: GrammarLesson;
}

export const GrammarVideoPlayer: React.FC<GrammarVideoPlayerProps> = ({ lesson }) => {
  return (
    <div className="space-y-6">
      {/* Video Container */}
      <div className="relative w-full aspect-video rounded-[2.5rem] overflow-hidden border-4 border-slate-200 shadow-[0_12px_0_0_#e2e8f0] bg-slate-900">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${lesson.youtubeId}?rel=0&modestbranding=1`}
          title={lesson.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-none"
        />
      </div>

      {/* Lesson Header & Formula Card */}
      <div className="bg-white rounded-[2rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-100 pb-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800">{lesson.title}</h2>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mt-1">
              <Clock size={14} /> Thời lượng: {lesson.duration}
            </div>
          </div>
        </div>

        {/* Key Formula */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-amber-800 text-xs font-black uppercase tracking-wider mb-1">
            <Lightbulb size={16} className="text-amber-500" /> Công thức ghi nhớ cốt lõi
          </div>
          <p className="text-lg font-black text-amber-900 font-mono">
            {lesson.keyFormula}
          </p>
        </div>

        {/* Summary Notes */}
        <div>
          <h4 className="font-extrabold text-slate-700 text-sm mb-2 flex items-center gap-1.5">
            <BookOpen size={16} className="text-sky-500" /> Tóm tắt kiến thức quan trọng:
          </h4>
          <ul className="space-y-2">
            {lesson.summaryNotes.map((note, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-slate-600 font-medium text-sm">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
