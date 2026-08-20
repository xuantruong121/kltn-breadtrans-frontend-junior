"use client";

import React, { useState } from "react";
import { Volume2, RotateCw, CheckCircle2 } from "lucide-react";
import { FlashcardWord } from "../types";

interface FlashcardCard3DProps {
  word: FlashcardWord;
  onMastered?: () => void;
  isMastered?: boolean;
}

export const FlashcardCard3D: React.FC<FlashcardCard3DProps> = ({
  word,
  onMastered,
  isMastered = false,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const playPronunciation = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.lang = "en-US";
    utterance.rate = 0.85;

    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="w-full max-w-lg mx-auto select-none [perspective:1000px]">
      <div 
        onClick={() => setIsFlipped(!isFlipped)}
        className="cursor-pointer relative w-full h-[380px] transition-transform duration-500 [transform-style:preserve-3d]"
        style={{ transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* FRONT SIDE */}
        <div className="absolute inset-0 w-full h-full rounded-[2.5rem] bg-white border-4 border-slate-300 shadow-[0_12px_0_0_#cbd5e1] p-8 flex flex-col justify-between [backface-visibility:hidden]">
          <div className="flex items-center justify-between">
            <span className="bg-sky-100 text-sky-700 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border-2 border-sky-300">
              {word.type}
            </span>
            <button
              onClick={playPronunciation}
              className={`p-3 rounded-2xl border-2 transition-all ${
                isPlayingAudio 
                  ? "bg-sky-500 text-white border-sky-600 scale-110 shadow-sm" 
                  : "bg-sky-50 hover:bg-sky-100 text-sky-600 border-sky-200"
              }`}
              title="Nghe phát âm"
            >
              <Volume2 size={24} />
            </button>
          </div>

          <div className="text-center my-auto">
            <h2 className="text-5xl font-black text-slate-800 tracking-tight mb-2">
              {word.word}
            </h2>
            <p className="text-xl font-bold text-slate-400 font-mono tracking-wide">
              {word.ipa}
            </p>
          </div>

          <div className="flex items-center justify-between text-slate-400 text-xs font-extrabold uppercase tracking-wider pt-4 border-t-2 border-slate-100">
            <span className="flex items-center gap-1 text-slate-400">
              <RotateCw size={14} /> Nhấp để lật nghĩa
            </span>
            {isMastered && (
              <span className="flex items-center gap-1 text-emerald-500 font-black">
                <CheckCircle2 size={16} /> Đã thuộc
              </span>
            )}
          </div>
        </div>

        {/* BACK SIDE */}
        <div 
          className="absolute inset-0 w-full h-full rounded-[2.5rem] bg-gradient-to-br from-amber-50 to-orange-50 border-4 border-amber-300 shadow-[0_12px_0_0_#fcd34d] p-8 flex flex-col justify-between [transform:rotateY(180deg)] [backface-visibility:hidden]"
        >
          <div className="flex items-center justify-between">
            <span className="bg-amber-200 text-amber-900 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border-2 border-amber-300">
              Nghĩa tiếng Việt
            </span>
            <button
              onClick={playPronunciation}
              className="p-3 rounded-2xl bg-amber-200 hover:bg-amber-300 text-amber-800 border-2 border-amber-400 transition-all"
            >
              <Volume2 size={24} />
            </button>
          </div>

          <div className="text-center my-auto px-4">
            <h3 className="text-3xl font-black text-amber-900 mb-6">
              {word.mean}
            </h3>

            <div className="bg-white/80 border-2 border-amber-200/80 rounded-2xl p-4 text-left shadow-xs">
              <p className="font-bold text-slate-700 text-sm mb-1 italic">
                "{word.exampleEn}"
              </p>
              <p className="font-medium text-slate-500 text-xs">
                {word.exampleVi}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-amber-700 text-xs font-extrabold uppercase tracking-wider pt-4 border-t-2 border-amber-200">
            <span className="flex items-center gap-1">
              <RotateCw size={14} /> Nhấp để quay lại
            </span>
            {onMastered && (
              <button 
                onClick={(e) => { e.stopPropagation(); onMastered(); }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                  isMastered ? "bg-emerald-100 text-emerald-700" : "bg-orange-500 text-white hover:bg-orange-600"
                }`}
              >
                {isMastered ? "Đã thành thạo ✓" : "Đánh dấu đã thuộc"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
