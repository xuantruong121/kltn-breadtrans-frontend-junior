"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Volume2, Check, Clock } from "lucide-react";
import { VocabWord } from "@/lib/api/services/vocab.service";

interface WordListDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  words: VocabWord[];
  currentWordId?: number;
  masteredIds: Set<number>;
  reviewIds: Set<number>;
  onSelectWord: (word: VocabWord) => void;
  onPlayAudio: (word: string, audioUrl?: string, accent?: "us" | "uk") => void;
}

export const WordListDrawer: React.FC<WordListDrawerProps> = ({
  isOpen,
  onClose,
  words,
  currentWordId,
  masteredIds,
  reviewIds,
  onSelectWord,
  onPlayAudio,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredWords = words.filter((w) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      w.word.toLowerCase().includes(q) ||
      w.meaning.toLowerCase().includes(q) ||
      (w.pos && w.pos.toLowerCase().includes(q))
    );
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          {/* Slide-over Drawer Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Danh sách từ vựng ({words.length})
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Chọn một từ để học hoặc nghe phát âm
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                  aria-label="Đóng danh sách từ"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-3.5 border-b border-slate-100 bg-white">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm từ hoặc nghĩa..."
                    className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Word List Scrollable */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredWords.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Không tìm thấy từ vựng phù hợp
                  </div>
                ) : (
                  filteredWords.map((w, idx) => {
                    const isCurrent = w.id === currentWordId;
                    const isMastered = masteredIds.has(w.id) || w.isMastered;
                    const isReview = reviewIds.has(w.id);

                    return (
                      <div
                        key={w.id || idx}
                        onClick={() => {
                          onSelectWord(w);
                          onClose();
                        }}
                        className={`w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between cursor-pointer border ${
                          isCurrent
                            ? "bg-sky-50 border-sky-400 ring-2 ring-sky-200 shadow-2xs"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="size-6 rounded-lg bg-slate-100 flex items-center justify-center font-black text-[11px] text-slate-600 shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-sm text-slate-900 truncate">
                                {w.word}
                              </span>
                              {w.pos && (
                                <span className="text-[10px] text-slate-400 font-semibold">
                                  ({w.pos})
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                              {w.meaning}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {/* Audio button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlayAudio(w.word, w.audioUs, "us");
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                            title="Nghe phát âm"
                          >
                            <Volume2 size={15} />
                          </button>

                          {/* Status Pill */}
                          {isMastered ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              <Check size={11} />
                              Thuộc
                            </span>
                          ) : isReview ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
                              <Clock size={11} />
                              Ôn tập
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                              Mới
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>
                  Đã thuộc: <strong className="text-emerald-700">{masteredIds.size}</strong> /{" "}
                  {words.length}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="font-bold text-sky-600 hover:underline cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
