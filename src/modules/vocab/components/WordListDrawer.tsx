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
              className="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800"
            >
              {/* Drawer Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-850/90 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                    Danh sách từ vựng ({words.length})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Chọn một từ để học hoặc nghe phát âm
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Đóng danh sách từ"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm từ hoặc nghĩa..."
                    className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Word List Scrollable */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredWords.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">
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
                            ? "bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-500 ring-2 ring-sky-200 dark:ring-sky-900/50 shadow-2xs"
                            : "bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/70 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="size-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-[11px] text-slate-600 dark:text-slate-300 shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">
                                {w.word}
                              </span>
                              {w.pos && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                                  ({w.pos})
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
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
                            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 transition-colors"
                            title="Nghe phát âm"
                          >
                            <Volume2 size={15} />
                          </button>

                          {/* Status Pill */}
                          {isMastered ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-md">
                              <Check size={11} />
                              Thuộc
                            </span>
                          ) : isReview ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800/60 px-2 py-0.5 rounded-md">
                              <Clock size={11} />
                              Ôn tập
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/60 px-2 py-0.5 rounded-md">
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
              <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>
                  Đã thuộc: <strong className="text-emerald-700 dark:text-emerald-400">{masteredIds.size}</strong> /{" "}
                  {words.length}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
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
