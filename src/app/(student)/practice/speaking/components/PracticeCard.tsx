"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
  Layers3,
  Lock,
  RotateCcw,
  Type,
  Volume2,
} from "lucide-react";
import type { SpeakingExercise, SpeakingPracticeSetSummary } from "@/lib/api/services/speaking.service";

export type PracticeCardStatus = "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED" | "LOCKED";

export interface PracticeCardProps {
  exercise: SpeakingExercise & {
    isCompleted?: boolean;
    practiceSet?: SpeakingPracticeSetSummary;
    averageScore?: number;
    isSpotlight?: boolean;
  };
  isAuthenticated: boolean;
  statusOverride?: PracticeCardStatus;
  onOpenAuthGate: (exercise: SpeakingExercise) => void;
  onStart?: (exercise: SpeakingExercise & { practiceSet?: SpeakingPracticeSetSummary }) => void;
  isLaunching?: boolean;
}

const DIFFICULTY_CONFIG: Record<
  string,
  { label: string; badgeClass: string; dotClass: string }
> = {
  BEGINNER: {
    label: "Cơ bản",
    badgeClass: "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300",
    dotClass: "bg-emerald-500",
  },
  INTERMEDIATE: {
    label: "Trung cấp",
    badgeClass: "border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300",
    dotClass: "bg-amber-500",
  },
  ADVANCED: {
    label: "Nâng cao",
    badgeClass: "border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300",
    dotClass: "bg-rose-500",
  },
};

/**
 * Extracts acoustic focus points and domain vocabulary from sentence
 * to replace raw generic italic quotes with pedagogical learning cues.
 */
function extractPedagogicalCues(text?: string) {
  if (!text) {
    return { phonemes: ["/ə/", "/t/", "/s/"], keywords: [] };
  }

  const phonemeRules = [
    { regex: /\b(th\w*|\w*th\b|\w*th\w*)/i, symbol: "/θ/ - /ð/" },
    { regex: /\b(sh\w*|\w*tion|\w*sion|ch\w*)/i, symbol: "/ʃ/ - /tʃ/" },
    { regex: /\b(\w*ed|\w*ing|\w*est)/i, symbol: "/ɪd/ - /ɪŋ/" },
    { regex: /\b(\w*r\w*|wr\w*)/i, symbol: "/r/ & Linking" },
    { regex: /\b(v\w*|\w*ve\b|f\w*)/i, symbol: "/v/ - /f/" },
    { regex: /\b(z\w*|\w*s\b|\w*es\b)/i, symbol: "/s/ - /z/" },
  ];

  const phonemes: string[] = [];
  for (const rule of phonemeRules) {
    if (rule.regex.test(text)) {
      phonemes.push(rule.symbol);
      if (phonemes.length >= 2) break;
    }
  }
  if (phonemes.length === 0) phonemes.push("/ə/", "/s/");

  const stopWords = new Set([
    "about", "after", "again", "because", "could", "every", "first", "great", "might", "other",
    "should", "their", "there", "these", "which", "would", "where", "while", "please", "thank"
  ]);
  const words = text
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length >= 5 && !stopWords.has(w));

  const keywords = Array.from(new Set(words)).slice(0, 3);
  return { phonemes, keywords };
}

export function PracticeCard({
  exercise,
  isAuthenticated,
  statusOverride,
  onOpenAuthGate,
  onStart,
  isLaunching = false,
}: PracticeCardProps) {
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const practiceSet = exercise.practiceSet;
  const isCompleted = Boolean(
    exercise.isCompleted ||
    (practiceSet && practiceSet.isCompleted) ||
    (practiceSet && practiceSet.exerciseCount > 0 && practiceSet.completedCount >= practiceSet.exerciseCount)
  );

  const inProgress = Boolean(
    practiceSet &&
    practiceSet.completedCount > 0 &&
    practiceSet.completedCount < practiceSet.exerciseCount
  );

  let computedStatus: PracticeCardStatus = "NOT_STARTED";
  if (!isAuthenticated) {
    computedStatus = "LOCKED";
  } else if (isCompleted) {
    computedStatus = "COMPLETED";
  } else if (inProgress || exercise.isSpotlight) {
    computedStatus = "IN_PROGRESS";
  } else {
    computedStatus = "NOT_STARTED";
  }

  const status = statusOverride || computedStatus;

  const difficulty = (practiceSet?.difficultyLabel || exercise.difficulty || "BEGINNER").toUpperCase();
  const diffConfig = DIFFICULTY_CONFIG[difficulty] || {
    label: exercise.difficulty || "Cơ bản",
    badgeClass: "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
    dotClass: "bg-slate-400",
  };

  const wordCount = exercise.targetText
    ? exercise.targetText.trim().split(/\s+/).filter(Boolean).length
    : 0;

  const estimatedSeconds = Math.max(25, Math.min(90, Math.round(wordCount * 3.5)));
  const pedagogicalCues = extractPedagogicalCues(exercise.targetText);

  const totalExercises = practiceSet?.exerciseCount || 1;
  const completedExercises = practiceSet?.completedCount || (isCompleted ? 1 : 0);
  const progressPercent = Math.min(100, Math.round((completedExercises / totalExercises) * 100));

  const handleCardClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      onOpenAuthGate(exercise);
    }
  };

  const handlePlayPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === "undefined") return;

    if (isPlayingPreview) {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingPreview(false);
      return;
    }

    if (exercise.audioUrl) {
      const audio = new Audio(exercise.audioUrl);
      setIsPlayingPreview(true);
      audio.onended = () => setIsPlayingPreview(false);
      audio.onerror = () => setIsPlayingPreview(false);
      audio.play().catch(() => setIsPlayingPreview(false));
      return;
    }

    if ("speechSynthesis" in window && exercise.targetText) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(exercise.targetText);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      utterance.onstart = () => setIsPlayingPreview(true);
      utterance.onend = () => setIsPlayingPreview(false);
      utterance.onerror = () => setIsPlayingPreview(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // State-specific styling
  const containerClasses = {
    IN_PROGRESS:
      "relative flex min-h-80 flex-col justify-between rounded-2xl border-2 border-violet-400 dark:border-violet-600 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-md ring-4 ring-violet-500/10 dark:ring-violet-400/10 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl",
    COMPLETED:
      "relative flex min-h-80 flex-col justify-between rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-5 sm:p-6 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md",
    NOT_STARTED:
      "relative flex min-h-80 flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-lg",
    LOCKED:
      "relative flex min-h-80 flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-5 sm:p-6 opacity-95 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
  }[status];

  return (
    <article className={`group ${containerClasses}`}>
      <div className="space-y-3.5">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
              <Layers3 size={12} aria-hidden="true" />
              {practiceSet ? "BỘ LUYỆN" : exercise.category || "GENERAL"}
            </span>

            <span
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-bold ${diffConfig.badgeClass}`}
            >
              <span className={`size-1.5 rounded-full ${diffConfig.dotClass}`} aria-hidden="true" />
              {diffConfig.label}
            </span>
          </div>

          {/* Semantic Status Badge */}
          {status === "COMPLETED" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 dark:border-emerald-800 bg-emerald-100/80 dark:bg-emerald-950/80 px-2.5 py-0.5 text-[11px] font-black text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 size={12} aria-hidden="true" />
              {exercise.averageScore ? `Đã làm (${exercise.averageScore}%)` : "Đã hoàn thành"}
            </span>
          )}

          {status === "IN_PROGRESS" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-300 dark:border-violet-700 bg-violet-100/80 dark:bg-violet-950/80 px-2.5 py-0.5 text-[11px] font-black text-violet-800 dark:text-violet-200 uppercase tracking-wide">
              <Flame size={12} className="text-amber-500 fill-amber-500" aria-hidden="true" />
              {exercise.isSpotlight ? "GỢI Ý HÔM NAY" : "ĐANG HỌC DỞ"}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-extrabold leading-snug text-slate-900 dark:text-slate-100 transition-colors group-hover:text-violet-700 dark:group-hover:text-violet-400 sm:text-lg">
          {practiceSet?.title || exercise.title}
        </h3>

        {/* Tactical Pedagogical Cues Box (Replaces generic italic quotes) */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 p-3.5 space-y-2.5">
          {/* Acoustic Phoneme Focus & Mini Audio Preview */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Âm trọng tâm:
              </span>
              {pedagogicalCues.phonemes.map((ph) => (
                <span
                  key={ph}
                  className="rounded-md bg-violet-100/70 dark:bg-violet-950/60 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-violet-700 dark:text-violet-300"
                >
                  {ph}
                </span>
              ))}
            </div>

            {/* Interactive Audio Sample Preview Trigger */}
            {exercise.targetText && (
              <button
                type="button"
                onClick={handlePlayPreview}
                aria-label="Nghe thử phát âm mẫu"
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                  isPlayingPreview
                    ? "border-violet-300 bg-violet-100 text-violet-800 dark:border-violet-700 dark:bg-violet-900/60 dark:text-violet-200"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-violet-300 hover:text-violet-700 dark:hover:border-violet-600 dark:hover:text-violet-300"
                }`}
              >
                <Volume2
                  size={12}
                  className={isPlayingPreview ? "animate-pulse text-violet-600 dark:text-violet-400" : "text-slate-400"}
                  aria-hidden="true"
                />
                <span>{isPlayingPreview ? "Đang phát..." : "Nghe mẫu"}</span>
              </button>
            )}
          </div>

          {/* Clean Target Text Display */}
          {exercise.targetText ? (
            <div>
              <p className="line-clamp-2 text-xs font-semibold leading-relaxed text-slate-800 dark:text-slate-200">
                {exercise.targetText}
              </p>
              {exercise.translation && (
                <p className="mt-1 line-clamp-1 text-[11px] font-normal text-slate-500 dark:text-slate-400">
                  {exercise.translation}
                </p>
              )}
            </div>
          ) : exercise.description ? (
            <p className="line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
              {exercise.description}
            </p>
          ) : null}

          {/* Vocabulary Tags */}
          {pedagogicalCues.keywords.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Từ vựng:</span>
              {pedagogicalCues.keywords.map((kw) => (
                <span
                  key={kw}
                  className="rounded bg-slate-200/70 dark:bg-slate-700/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Progress Bar Display */}
        {practiceSet && (
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
              <span>Tiến độ bài học</span>
              <span className={status === "COMPLETED" ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : ""}>
                {completedExercises}/{totalExercises} câu ({progressPercent}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  status === "COMPLETED"
                    ? "bg-emerald-500"
                    : status === "IN_PROGRESS"
                      ? "bg-violet-600"
                      : "bg-slate-300 dark:bg-slate-700"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer Actions */}
      <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-4">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Type size={13} className="text-slate-400" aria-hidden="true" />
              {practiceSet ? `${practiceSet.exerciseCount} câu` : `${wordCount} từ`}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={13} className="text-slate-400" aria-hidden="true" />
              {practiceSet ? `~${Math.max(1, Math.ceil((wordCount * practiceSet.exerciseCount) / 35))} phút` : `~${estimatedSeconds}s`}
            </span>
          </div>

          {/* Differentiated CTA State Machine */}
          {status === "COMPLETED" ? (
            <button
              type="button"
              onClick={() => onStart?.(exercise)}
              disabled={isLaunching}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700/80 bg-white/90 dark:bg-slate-800/90 px-3.5 text-xs font-extrabold text-emerald-800 dark:text-emerald-300 shadow-2xs transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-950/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer disabled:opacity-60"
            >
              <RotateCcw size={13} aria-hidden="true" />
              Luyện tập lại
            </button>
          ) : status === "IN_PROGRESS" ? (
            <button
              type="button"
              onClick={() => onStart?.(exercise)}
              disabled={isLaunching}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 px-4 text-xs font-black text-white shadow-sm transition-all hover:shadow-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 cursor-pointer disabled:opacity-60"
            >
              Tiếp tục luyện tập
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          ) : status === "NOT_STARTED" ? (
            <button
              type="button"
              onClick={() => onStart?.(exercise)}
              disabled={isLaunching}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 text-xs font-black text-slate-800 dark:text-slate-200 transition-all hover:bg-violet-600 hover:text-white dark:hover:bg-violet-600 dark:hover:text-white focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500 cursor-pointer disabled:opacity-60"
            >
              Bắt đầu
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCardClick}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500 cursor-pointer"
            >
              <Lock size={12} aria-hidden="true" />
              Đăng nhập để luyện
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
