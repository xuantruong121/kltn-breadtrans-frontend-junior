"use client";

import React, { useState, useEffect } from "react";
import { Volume2, RotateCw, CheckCircle2 } from "lucide-react";
import { FlashcardWord } from "../types";

interface FlashcardCard3DProps {
  word: FlashcardWord;
  isMastered?: boolean;
}

export const FlashcardCard3D: React.FC<FlashcardCard3DProps> = ({
  word,
  isMastered = false,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Always reset to front side (English word) when a new word is displayed
  useEffect(() => {
    setIsFlipped(false);
  }, [word?.id]);

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
        className="cursor-pointer relative w-full h-[360px] sm:h-[380px] transition-transform duration-500 [transform-style:preserve-3d]"
        style={{ transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* FRONT SIDE */}
        <div className="absolute inset-0 w-full h-full rounded-[2.5rem] bg-white border-4 border-slate-300 shadow-[0_12px_0_0_#cbd5e1] p-6 sm:p-8 flex flex-col justify-between [backface-visibility:hidden]">
          <div className="flex items-center justify-between">
            <span className="bg-sky-100 text-sky-700 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border-2 border-sky-300">
              {word.type || "TỪ VỰNG"}
            </span>
            <button
              onClick={playPronunciation}
              className={`p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                isPlayingAudio 
                  ? "bg-sky-500 text-white border-sky-600 scale-110 shadow-sm" 
                  : "bg-sky-50 hover:bg-sky-100 text-sky-600 border-sky-200"
              }`}
              title="Nghe phát âm"
            >
              <Volume2 size={22} />
            </button>
          </div>

          <div className="text-center my-auto px-4 max-w-full">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-800 tracking-tight mb-2 break-words">
              {word.word}
            </h2>
            <p className="text-lg sm:text-xl font-bold text-slate-400 font-mono tracking-wide break-words">
              {word.ipa}
            </p>
          </div>

          <div className="flex items-center justify-between text-slate-400 text-xs font-extrabold uppercase tracking-wider pt-4 border-t-2 border-slate-100">
            <span className="flex items-center gap-1 text-slate-400">
              <RotateCw size={14} /> Nhấp để lật nghĩa
            </span>
            {isMastered ? (
              <span className="flex items-center gap-1 text-emerald-600 font-black bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                <CheckCircle2 size={15} /> Đã thuộc
              </span>
            ) : (
              <span className="text-slate-400">
                Chưa thuộc
              </span>
            )}
          </div>
        </div>

        {/* BACK SIDE */}
        <div 
          className="absolute inset-0 w-full h-full rounded-[2.5rem] bg-gradient-to-br from-amber-50 to-orange-50 border-4 border-amber-300 shadow-[0_12px_0_0_#fcd34d] p-6 sm:p-8 flex flex-col justify-between [transform:rotateY(180deg)] [backface-visibility:hidden] overflow-y-auto"
        >
          <div className="flex items-center justify-between">
            <span className="bg-amber-200 text-amber-900 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border-2 border-amber-300">
              Nghĩa tiếng Việt
            </span>
            <button
              onClick={playPronunciation}
              className="p-3 rounded-2xl bg-amber-200 hover:bg-amber-300 text-amber-800 border-2 border-amber-400 transition-all cursor-pointer"
              title="Nghe phát âm"
            >
              <Volume2 size={22} />
            </button>
          </div>

          <div className="text-center my-auto px-2 max-w-full">
            <h3 className="text-2xl sm:text-3xl font-black text-amber-900 mb-3 break-words">
              {word.mean}
            </h3>

            {word.exampleEn && (
              <div className="bg-white/95 border-2 border-amber-300 rounded-2xl p-4 text-left shadow-xs mt-1">
                <p className="font-bold text-slate-800 text-sm sm:text-base mb-1.5 italic break-words leading-relaxed">
                  "{word.exampleEn}"
                </p>
                {word.exampleVi && (
                  <p className="font-semibold text-amber-900 text-xs sm:text-sm break-words leading-normal">
                    &rarr; {word.exampleVi}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-amber-700 text-xs font-extrabold uppercase tracking-wider pt-3 border-t-2 border-amber-200">
            <span className="flex items-center gap-1">
              <RotateCw size={14} /> Nhấp để xem từ
            </span>
            {isMastered && (
              <span className="flex items-center gap-1 text-emerald-700 font-black bg-emerald-100/80 px-2 py-0.5 rounded-lg border border-emerald-300">
                <CheckCircle2 size={14} /> Đã thuộc
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
