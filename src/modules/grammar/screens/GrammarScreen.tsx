"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, PlayCircle, BookOpen, Sparkles, CheckCircle2 } from "lucide-react";
import { GRAMMAR_TOPICS } from "../services/grammarData";
import { GrammarTopic, GrammarLesson } from "../types";
import { GrammarVideoPlayer } from "../components/GrammarVideoPlayer";
import { GrammarQuiz } from "../components/GrammarQuiz";

export const GrammarScreen: React.FC = () => {
  const [selectedTopic, setSelectedTopic] = useState<GrammarTopic>(GRAMMAR_TOPICS[0]);
  const [selectedLesson, setSelectedLesson] = useState<GrammarLesson>(GRAMMAR_TOPICS[0].lessons[0]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-[2rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🎓</span>
          <h1 className="text-3xl font-black text-slate-800">Ngữ Pháp Tiếng Anh</h1>
        </div>
        <p className="font-bold text-slate-400 text-sm">
          Bài giảng video sinh động và các điểm ngữ pháp trọng tâm theo form đề TOEIC
        </p>
      </div>

      {/* TOPIC SELECTOR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {GRAMMAR_TOPICS.map((topic) => {
          const isSelected = selectedTopic.id === topic.id;
          return (
            <motion.div
              key={topic.id}
              whileHover={{ y: -4 }}
              onClick={() => {
                setSelectedTopic(topic);
                setSelectedLesson(topic.lessons[0]);
              }}
              className={`p-5 rounded-3xl border-4 cursor-pointer transition-all ${
                isSelected
                  ? "bg-emerald-50 border-emerald-400 shadow-[0_6px_0_0_#34d399]"
                  : "bg-white border-slate-200 hover:border-slate-300 shadow-[0_6px_0_0_#e2e8f0]"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{topic.icon}</span>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    {topic.level}
                  </span>
                  <h3 className="font-extrabold text-slate-800 text-base line-clamp-1">
                    {topic.title}
                  </h3>
                </div>
              </div>
              <div className="text-xs font-bold text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span>{topic.lessons.length} Video bài giảng</span>
                <span className="text-emerald-600 font-extrabold">Học ngay →</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* LESSON TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {selectedTopic.lessons.map((lesson) => {
          const isSelected = selectedLesson.id === lesson.id;
          return (
            <button
              key={lesson.id}
              onClick={() => setSelectedLesson(lesson)}
              className={`px-4 py-2.5 rounded-2xl font-black text-sm whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                isSelected
                  ? "bg-slate-800 text-white shadow-md border-2 border-slate-900"
                  : "bg-white text-slate-500 hover:bg-slate-100 border-2 border-slate-200"
              }`}
            >
              <PlayCircle size={16} />
              {lesson.title}
            </button>
          );
        })}
      </div>

      {/* MAIN CONTENT: VIDEO & QUIZ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Video Player & Key formulas */}
        <div className="lg:col-span-7 space-y-6">
          <GrammarVideoPlayer lesson={selectedLesson} />
        </div>

        {/* Right: Practice Quiz */}
        <div className="lg:col-span-5">
          <GrammarQuiz questions={selectedLesson.questions} />
        </div>
      </div>
    </div>
  );
};
