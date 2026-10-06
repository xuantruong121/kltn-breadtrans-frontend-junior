"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Globe,
  Keyboard,
  Languages,
  Lightbulb,
  Loader2,
  Mic,
  MicOff,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Settings,
  StickyNote,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { PracticeHeader } from "@/components/practice/PracticeHeader";
import {
  DICTATION_SHORTCUTS,
  createDictationReplayController,
  type DictationReplayKey,
} from "./listeningShortcutConfig";
import { useAuthStore } from "@/stores/authStore";
import { WordDictionaryPopup } from "@/components/speaking/WordDictionaryPopup";
import { issueReportService } from "@/lib/api/services/issue-report.service";
import {
  type CheckPracticeQuestionResult,
  type ListeningTranscriptItem,
  type Question,
  type Quiz,
  quizService,
} from "@/lib/api/services/quiz.service";
import {
  probeOrPrefetchTranscript,
  revealAndFetchTranscript,
  getCachedTranscriptResources,
  retainTranscriptConsumer,
} from "./listeningTranscriptResources";
import {
  type DictationDiffToken,
  buildProgressiveAnswer,
  clampTranscriptIndex,
  moveTranscriptIndex,
  resolveTranscriptPlaybackState,
} from "./listeningDictationUtils";

export interface DictationAttemptMetrics {
  attemptCount: number;
  firstTryCorrect: boolean | null;
  bestWordAccuracy: number;
  hintCount: number;
  replayCount: number;
  revealed: boolean;
}

interface DailyDictationWorkspaceProps {
  quiz: Quiz;
  questions: Question[];
  currentQuestion: Question;
  currentIndex: number;
  selectedAnswer: string;
  onChangeAnswer: (value: string) => void;
  onCheck: () => Promise<CheckPracticeQuestionResult | null>;
  isChecking: boolean;
  isChecked: boolean;
  isSkipped: boolean;
  currentCheck?: CheckPracticeQuestionResult;
  dictationDiff: DictationDiffToken[];
  dictationMetrics: Record<number, DictationAttemptMetrics>;
  isRevealed: boolean;
  onToggleReveal: () => void;
  showAnswerImmediately: boolean;
  onToggleShowAnswerImmediately: () => void;
  onSkip: () => void | Promise<void>;
  onRetry?: () => void;
  onNext: () => void;
  onPrev: () => void;
  onFinalSubmit: () => void;
  isSubmitting: boolean;
  submitError: string | null;
  reviewOnly?: boolean;
  onExit: (href?: string) => void;
  accent?: string;
  onChangeAccent?: (accent: string) => void;
  level?: string;
}

const DICTATION_TIPS = [
  "Bạn sẽ cần khoảng 600 giờ luyện tập để có phản xạ nghe tiếng Anh tự nhiên.",
  "Hãy nghe trọn vẹn cả câu 2-3 lần trước khi bắt đầu gõ để nắm bắt nhịp điệu tự nhiên.",
  "Đừng dừng lại sau từng từ đơn lẻ. Hãy tập trung nghe theo từng cụm nghĩa (chunk).",
  "Chú ý các dạng phát âm lướt của giới từ và trợ động từ (to, for, at, was, have).",
  "Luyện nghe 15 phút mỗi ngày hiệu quả hơn gấp nhiều lần so với dồn 2 tiếng một tuần.",
  "Để ý hiện tượng nối âm và nuốt âm: 'going to' nghe như 'gonna', 'want to' nghe như 'wanna'.",
];

function formatTime(seconds: number): string {
  if (Number.isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function groupTranscriptItems(items: ListeningTranscriptItem[]) {
  const groups: Array<{
    key: string;
    startIndex: number;
    items: ListeningTranscriptItem[];
  }> = [];
  items.forEach((item, idx) => {
    const key = item.speakerTurnId || `chunk-${idx}`;
    const previous = groups[groups.length - 1];
    if (previous?.key === key) previous.items.push(item);
    else groups.push({ key, startIndex: idx, items: [item] });
  });
  return groups;
}

export function DailyDictationWorkspace({
  quiz,
  questions,
  currentQuestion,
  currentIndex,
  selectedAnswer,
  onChangeAnswer,
  onCheck,
  isChecking,
  isChecked,
  isSkipped,
  currentCheck,
  isRevealed,
  onToggleReveal,
  onSkip,
  onRetry,
  onNext,
  onPrev,
  onFinalSubmit,
  isSubmitting,
  reviewOnly = false,
  onExit,
  accent = "US",
  onChangeAccent,
  level,
}: DailyDictationWorkspaceProps) {
  const canonicalAnswer =
    currentCheck?.correctAnswer ||
    (currentQuestion?.content as any)?.correctAnswer ||
    (currentQuestion?.content as any)?.audioText ||
    "";
  const displayedAnswer = isSkipped
    ? (canonicalAnswer || currentCheck?.correctAnswer || selectedAnswer)
    : selectedAnswer;
  const isLastQuestion = currentIndex === questions.length - 1;
  // Viewing the masked suffix is only a hint. It must not lock the input or
  // turn the question into a skipped/completed outcome.
  const isCompletedOrRevealed = isSkipped || Boolean(isChecked && currentCheck?.isCorrect);
  const [activeTab, setActiveTab] = useState<"dictation" | "transcript">("dictation");
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState("");
  const [isBilingual, setIsBilingual] = useState(true);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [selectedWordForLookup, setSelectedWordForLookup] = useState<string | null>(null);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const quizId = quiz?.id;
  const utilityKey = `breadtrans:listening-utilities:user-${userId ?? "unknown"}:quiz-${quizId ?? "unknown"}`;

  useEffect(() => {
    if (!quizId || !userId) return;

    const timer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(
          localStorage.getItem(utilityKey) ?? "{}",
        );
        setNotes(typeof stored.notes === "string" ? stored.notes : "");
      } catch {
        setNotes("");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [quizId, utilityKey, userId]);

  useEffect(() => {
    if (!quizId) return;
    try {
      const stored = JSON.parse(localStorage.getItem(utilityKey) ?? "{}");
      localStorage.setItem(utilityKey, JSON.stringify({ ...stored, notes }));
    } catch {
      // ignore
    }
  }, [notes, quizId, utilityKey]);

  // Translation Card Actions State (Edit suggestion, Language dropdown, etc.)
  const [showTranslationMenu, setShowTranslationMenu] = useState(false);
  const [showEditTranslationModal, setShowEditTranslationModal] = useState(false);
  const [showChangeLanguageModal, setShowChangeLanguageModal] = useState(false);
  const [showAddLanguageModal, setShowAddLanguageModal] = useState(false);
  const [suggestedTranslation, setSuggestedTranslation] = useState("");
  const [suggestionNote, setSuggestionNote] = useState("");
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("vi");
  const [addLangName, setAddLangName] = useState("");
  const [addLangTranslation, setAddLangTranslation] = useState("");
  const [isSubmittingAddLang, setIsSubmittingAddLang] = useState(false);
  const translationMenuRef = useRef<HTMLDivElement | null>(null);

  // Audio Player State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackRateRef = useRef(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [replayKey, setReplayKey] = useState<DictationReplayKey>("Ctrl");
  const playPauseKey = "`";
  const [autoReplay, setAutoReplay] = useState(false);
  const [replayDelay, setReplayDelay] = useState("0.5");
  const [wordSuggestions, setWordSuggestions] = useState(false);
  const [showShortcutTips, setShowShortcutTips] = useState(true);
  const [audioLoading, setAudioLoading] = useState(true);
  const [audioError, setAudioError] = useState(false);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [fullTranscript, setFullTranscript] = useState<ListeningTranscriptItem[]>([]);
  const [selectedTranscriptItemIndex, setSelectedTranscriptItemIndex] = useState(-1);
  const [activeTranscriptItemIndex, setActiveTranscriptItemIndex] = useState(-1);
  const [activeTranscriptSpeakerTurnId, setActiveTranscriptSpeakerTurnId] = useState<string | null>(null);
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [selectedTranslationLanguage, setSelectedTranslationLanguage] = useState<"none" | "vi">("none");
  const [repeatTranscript, setRepeatTranscript] = useState(false);
  const [autoScrollTranscript, setAutoScrollTranscript] = useState(true);
  const [showTranscriptSpeedMenu, setShowTranscriptSpeedMenu] = useState(false);
  const autoplayOnLoadRef = useRef(false);
  const transcriptSpeedMenuRef = useRef<HTMLDivElement | null>(null);
  const activeTranscriptRowRef = useRef<HTMLButtonElement | null>(null);
  const transcriptListRef = useRef<HTMLDivElement | null>(null);
  const transcriptAudioRequestRef = useRef<AbortController | null>(null);
  const questionAudioCacheRef = useRef<Map<string, { blob: Blob; url: string }>>(new Map());
  const activeAudioVersion = currentQuestion?.audioAssets?.find((asset) => asset.isActive)?.version;
  const currentContent = (currentQuestion?.content ?? {}) as Record<string, any>;
  const currentSegment = Array.isArray(currentContent.transcriptSegments)
    ? currentContent.transcriptSegments.find(
        (segment: any) =>
          Number.isFinite(segment?.startMs) && Number.isFinite(segment?.endMs),
      )
    : undefined;
  const segmentStartSeconds =
    activeTab === "dictation" && currentSegment
      ? Number(currentSegment.startMs) / 1000
      : 0;
  const segmentEndSeconds =
    activeTab === "dictation" && currentSegment
      ? Number(currentSegment.endMs) / 1000
      : 0;
  const isSegmentAudio = segmentEndSeconds > segmentStartSeconds;

  // Speech Recognition (Mic)
  const [isListeningSpeech, setIsListeningSpeech] = useState(false);
  const recognitionRef = useRef<any>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const audioMenuRef = useRef<HTMLDivElement | null>(null);
  const speedMenuRef = useRef<HTMLDivElement | null>(null);

  const focusInputAtEnd = useCallback(() => {
    if (isCompletedOrRevealed || activeTab !== "dictation") return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    const len = el.value.length;
    try {
      el.setSelectionRange(len, len);
    } catch {
      // ignore
    }
  }, [isCompletedOrRevealed, activeTab]);

  const handlePerformCheck = useCallback(async () => {
    if (isChecking || isCompletedOrRevealed) return;
    const res = await onCheck();
    if (!res?.isCorrect) {
      const el = textareaRef.current;
      if (el && document.activeElement !== el) {
        el.focus({ preventScroll: true });
      }
    }
  }, [isChecking, isCompletedOrRevealed, onCheck]);

  // Keep dictation textarea focused on mount, tab switch, or sentence change without overriding active typing caret
  useEffect(() => {
    if (!isCompletedOrRevealed && activeTab === "dictation") {
      focusInputAtEnd();
      const frame = requestAnimationFrame(() => {
        focusInputAtEnd();
      });
      return () => {
        cancelAnimationFrame(frame);
      };
    }
  }, [isCompletedOrRevealed, activeTab, currentIndex, focusInputAtEnd]);

  // Rotate the study tip automatically so the banner remains useful during a
  // longer dictation session. The manual refresh button still advances it on
  // demand.
  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % DICTATION_TIPS.length);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleCustomLookup = (e: Event) => {
      const customEvent = e as CustomEvent<{ word?: string }>;
      const targetWord = customEvent.detail?.word;
      if (targetWord && typeof targetWord === "string") {
        const cleaned = targetWord.trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "") || targetWord;
        setSelectedWordForLookup(cleaned);
      }
    };
    window.addEventListener("breadtrans:lookup-word", handleCustomLookup);
    return () => {
      window.removeEventListener("breadtrans:lookup-word", handleCustomLookup);
    };
  }, []);

  // Redo current question: reset check state & draft answer, rewind audio, and re-focus input
  const handleRetryCurrentSentence = useCallback(() => {
    if (onRetry) {
      onRetry();
    } else {
      onChangeAnswer("");
    }
    if (audioRef.current) {
      audioRef.current.currentTime = isSegmentAudio ? segmentStartSeconds : 0;
      setCurrentTime(0);
      void audioRef.current.play().catch(() => undefined);
    }
    focusInputAtEnd();
    requestAnimationFrame(() => {
      focusInputAtEnd();
    });
    setTimeout(() => {
      focusInputAtEnd();
    }, 60);
  }, [onRetry, onChangeAnswer, focusInputAtEnd, isSegmentAudio, segmentStartSeconds]);

  // Skip current question: perform skip and immediately focus textarea so caret is visible
  const handleSkipSentence = useCallback(async () => {
    await onSkip();
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }, [onSkip]);

  const displayTranscriptItems: ListeningTranscriptItem[] =
    fullTranscript.length > 0
      ? fullTranscript
      : questions.map((q, idx) => ({
          questionId: q.id,
          order: q.order || idx + 1,
          transcript:
            (q.content as any)?.correctAnswer ||
            (q.content as any)?.audioText ||
            (q.content as any)?.text ||
            `Câu ${idx + 1}`,
          speaker: (q.content as any)?.speaker || null,
          speakerTurnId: null,
          translation: (q.content as any)?.translation || null,
        }));
  const transcriptGroups = groupTranscriptItems(displayTranscriptItems);

  // Close translation menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (translationMenuRef.current && !translationMenuRef.current.contains(e.target as Node)) {
        setShowTranslationMenu(false);
      }
    };
    if (showTranslationMenu) {
      document.addEventListener("mousedown", handleOutsideClick);
      return () => document.removeEventListener("mousedown", handleOutsideClick);
    }
  }, [showTranslationMenu]);

  // Submit suggested translation to admin (does NOT modify current live translation directly)
  const handleSubmitTranslationSuggestion = async () => {
    const trimmed = suggestedTranslation.trim();
    if (!trimmed) {
      toast.error("Vui lòng nhập bản dịch đề xuất.");
      return;
    }
    setIsSubmittingSuggestion(true);
    try {
      await issueReportService.create({
        area: "LISTENING",
        category: "CONTENT_ERROR",
        impact: "NON_BLOCKING",
        description: `[Đề xuất cải thiện bản dịch]\n- Câu gốc: "${canonicalAnswer}"\n- Bản dịch hiện tại: "${translationText || "Chưa có"}"\n- Bản dịch đề xuất: "${trimmed}"${suggestionNote.trim() ? `\n- Ghi chú: ${suggestionNote.trim()}` : ""}`,
        sourceType: "QUIZ",
        sourceId: quiz.id,
        questionId: currentQuestion.id,
        context: {
          quizTitle: quiz.title,
          questionNumber: currentIndex + 1,
          canonicalAnswer,
          currentTranslation: translationText,
          suggestedTranslation: trimmed,
          note: suggestionNote.trim() || undefined,
        },
      });
      toast.success("Đã gửi đề xuất bản dịch tới Admin. Cảm ơn đóng góp của bạn!");
      setShowEditTranslationModal(false);
      setSuggestedTranslation("");
      setSuggestionNote("");
    } catch {
      toast.error("Không thể gửi bản dịch đề xuất. Vui lòng thử lại sau.");
    } finally {
      setIsSubmittingSuggestion(false);
    }
  };

  // Submit new language translation to admin
  const handleSubmitAddLanguage = async () => {
    const lang = addLangName.trim();
    const trans = addLangTranslation.trim();
    if (!lang || !trans) {
      toast.error("Vui lòng nhập tên ngôn ngữ và bản dịch.");
      return;
    }
    setIsSubmittingAddLang(true);
    try {
      await issueReportService.create({
        area: "LISTENING",
        category: "CONTENT_ERROR",
        impact: "NON_BLOCKING",
        description: `[Đóng góp bản dịch ngôn ngữ mới: ${lang}]\n- Câu gốc: "${canonicalAnswer}"\n- Bản dịch (${lang}): "${trans}"`,
        sourceType: "QUIZ",
        sourceId: quiz.id,
        questionId: currentQuestion.id,
        context: {
          quizTitle: quiz.title,
          questionNumber: currentIndex + 1,
          canonicalAnswer,
          language: lang,
          translation: trans,
        },
      });
      toast.success(`Đã gửi bản dịch tiếng ${lang} tới Admin. Cảm ơn bạn!`);
      setShowAddLanguageModal(false);
      setAddLangName("");
      setAddLangTranslation("");
    } catch {
      toast.error("Không thể gửi bản dịch mới. Vui lòng thử lại sau.");
    } finally {
      setIsSubmittingAddLang(false);
    }
  };

  // Fetch audio blob when question changes; cached to prevent re-downloads on tab switches
  useEffect(() => {
    const questionCacheKey = `${quiz.id}:${currentQuestion.id}:${activeAudioVersion ?? 0}`;
    const cached = questionAudioCacheRef.current.get(questionCacheKey);

    if (cached) {
      if (activeTab === "dictation") {
        setAudioBlobUrl(cached.url);
        setAudioLoading(false);
        setAudioError(false);
        if (audioRef.current) {
          audioRef.current.src = cached.url;
          audioRef.current.playbackRate = playbackRateRef.current;
          audioRef.current.load();
        }
      }
      return;
    }

    const controller = new AbortController();
    let isMounted = true;
    const resetTimer = window.setTimeout(() => {
      if (!isMounted) return;
      if (activeTab === "dictation") {
        setAudioLoading(true);
        setAudioError(false);
        setIsPlaying(false);
        setCurrentTime(0);
      }
    }, 0);

    quizService
      .getQuestionAudioBlob(
        quiz.id,
        currentQuestion.id,
        controller.signal,
        activeAudioVersion,
        quiz.listeningAudioArtifact,
      )
      .then((blob) => {
        if (!isMounted) return;
        const url = URL.createObjectURL(blob);
        questionAudioCacheRef.current.set(questionCacheKey, { blob, url });

        if (activeTab === "dictation") {
          setAudioBlobUrl(url);
          setAudioLoading(false);
          setAudioError(false);

          if (audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.playbackRate = playbackRateRef.current;
            audioRef.current.load();
            if (autoplayOnLoadRef.current) {
              autoplayOnLoadRef.current = false;
              void audioRef.current.play().catch(() => setIsPlaying(false));
            }
          }
        }
      })
      .catch((err) => {
        if (!isMounted || err?.name === "AbortError" || err?.name === "CanceledError") return;
        if (activeTab === "dictation") {
          setAudioError(true);
          setAudioLoading(false);
        }
      });

    return () => {
      isMounted = false;
      window.clearTimeout(resetTimer);
      controller.abort();
    };
  }, [activeAudioVersion, currentQuestion.id, quiz.id, quiz.listeningAudioArtifact]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [isMuted, volume]);

  // Safe background probe or prefetch of permitted transcript resources on mount
  useEffect(() => {
    const controller = new AbortController();
    void probeOrPrefetchTranscript(quiz.id, quiz, controller.signal)
      .then((entry) => {
        if (entry.authorizationStatus === "authorized" && entry.transcript) {
          setFullTranscript(entry.transcript);
          setAudioNotice(entry.audioNotice);
        }
      })
      .catch(() => undefined);

    return () => {
      controller.abort();
    };
  }, [quiz.id, quiz]);

  // Retain transcript resource cache ownership while mounted
  useEffect(() => {
    const release = retainTranscriptConsumer(quiz.id);
    return () => {
      release();
    };
  }, [quiz.id]);

  // Cleanup object urls on unmount
  useEffect(() => {
    const questionCache = questionAudioCacheRef.current;
    return () => {
      transcriptAudioRequestRef.current?.abort();
      for (const item of questionCache.values()) {
        try {
          URL.revokeObjectURL(item.url);
        } catch {
          // ignore
        }
      }
      questionCache.clear();
    };
  }, []);

  const activeTranscriptScrollKey =
    activeTranscriptSpeakerTurnId ?? String(activeTranscriptItemIndex);

  // Auto-scroll only when the active speaker-turn row changes. Consecutive
  // chunks inside one grouped turn must not re-center the same row.
  useEffect(() => {
    if (activeTab === "transcript" && autoScrollTranscript && activeTranscriptRowRef.current) {
      activeTranscriptRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeTab, autoScrollTranscript, activeTranscriptScrollKey]);

  const handleSelectTranscriptSentence = (transcriptIndex: number) => {
    const itemIndex = transcriptIndex >= 0 && transcriptIndex < fullTranscript.length
      ? transcriptIndex
      : -1;
    const item = itemIndex >= 0 ? fullTranscript[itemIndex] : null;
    if (item && Number.isFinite(item.startMs) && audioRef.current) {
      audioRef.current.currentTime = Number(item.startMs) / 1000;
      setCurrentTime(audioRef.current.currentTime);
      setSelectedTranscriptItemIndex(itemIndex);
      setActiveTranscriptItemIndex(itemIndex);
      setActiveTranscriptSpeakerTurnId(item.speakerTurnId ?? null);
    }
  };

  const handleTranscriptPrev = () => {
    const nextIndex = moveTranscriptIndex(selectedTranscriptItemIndex, -1, fullTranscript.length);
    if (fullTranscript[nextIndex]) {
      handleSelectTranscriptSentence(nextIndex);
    }
  };

  const handleTranscriptNext = () => {
    const nextIndex = moveTranscriptIndex(selectedTranscriptItemIndex, 1, fullTranscript.length);
    if (fullTranscript[nextIndex]) {
      handleSelectTranscriptSentence(nextIndex);
    }
  };

  // Audio player methods
  const togglePlay = useCallback(() => {
    if (activeTab === "transcript") {
      if (!audioRef.current || audioError) return;
      if (isPlaying) {
        audioRef.current.pause();
        return;
      }
      void audioRef.current.play().catch(() => setIsPlaying(false));
      return;
    }

    if (!audioRef.current || audioLoading || audioError) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      if (isSegmentAudio && (audioRef.current.currentTime < segmentStartSeconds || audioRef.current.currentTime >= segmentEndSeconds)) {
        audioRef.current.currentTime = segmentStartSeconds;
      }
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [activeTab, audioError, audioLoading, isPlaying, isSegmentAudio, segmentStartSeconds, segmentEndSeconds]);

  const replayAudio = useCallback(() => {
    if (activeTab === "transcript") {
      if (!audioRef.current) return;
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      void audioRef.current.play().catch(() => setIsPlaying(false));
      return;
    }
    if (!audioRef.current) return;
    audioRef.current.currentTime = isSegmentAudio ? segmentStartSeconds : 0;
    setCurrentTime(0);
    void audioRef.current.play().catch(() => setIsPlaying(false));
  }, [activeTab, isSegmentAudio, segmentStartSeconds]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = Number(e.target.value);
    setCurrentTime(target);
    if (audioRef.current) {
      audioRef.current.currentTime = isSegmentAudio
        ? segmentStartSeconds + target
        : target;
    }
  };

  const handleRateChange = (rate: number) => {
    playbackRateRef.current = rate;
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const toggleMute = () => {
    setIsMuted((m) => !m);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextVolume = Number(event.target.value);
    setVolume(nextVolume);
    setIsMuted(nextVolume === 0);
    if (audioRef.current) {
      audioRef.current.volume = nextVolume;
      audioRef.current.muted = nextVolume === 0;
    }
  };

  const downloadAudio = () => {
    if (!audioBlobUrl || typeof document === "undefined") return;
    const link = document.createElement("a");
    link.href = audioBlobUrl;
    link.download = `breadtrans-dictation-${currentQuestion.id}.mp3`;
    link.click();
    setShowAudioMenu(false);
  };

  const handleRotateTip = () => {
    setTipIndex((prev) => (prev + 1) % DICTATION_TIPS.length);
  };

  // Web Speech API
  const toggleSpeechRecognition = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Trình duyệt của bạn chưa hỗ trợ nhận dạng giọng nói trực tiếp.");
      return;
    }

    if (isListeningSpeech) {
      recognitionRef.current?.stop();
      setIsListeningSpeech(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => setIsListeningSpeech(true);
      recognition.onend = () => setIsListeningSpeech(false);
      recognition.onerror = () => setIsListeningSpeech(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";
        if (transcript) {
          onChangeAnswer(selectedAnswer ? `${selectedAnswer} ${transcript}` : transcript);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListeningSpeech(false);
    }
  };

  // Keyboard Shortcuts (Backtick = Play/Pause, Enter = Check, Replay = configured modifier)
  useEffect(() => {
    const isAnyModalOpen =
      showSettings ||
      showShortcutsModal ||
      showNotesModal ||
      showEditTranslationModal ||
      showChangeLanguageModal ||
      showAddLanguageModal;

    const replayController = createDictationReplayController(
      () => replayKey,
      () => replayAudio(),
    );

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnyModalOpen) {
        replayController.reset();
        return;
      }

      const activeElement = document.activeElement;
      const isTypingTarget =
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLSelectElement ||
        activeElement?.getAttribute("contenteditable") === "true";

      // 1. Process candidate model for configured replay key
      replayController.handleKeyDown(e);

      // 2. Arrow navigation with Ctrl
      if (e.ctrlKey && e.key === "ArrowRight") {
        e.preventDefault();
        if (currentIndex < questions.length - 1) onNext();
        return;
      }
      if (e.ctrlKey && e.key === "ArrowLeft") {
        e.preventDefault();
        if (currentIndex > 0) onPrev();
        return;
      }

      // 3. Enter -> Check Answer OR Advance to next question
      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (isCompletedOrRevealed) {
          e.preventDefault();
          if (isLastQuestion) {
            onFinalSubmit();
          } else {
            onNext();
          }
          return;
        }

        // If in dictation mode, Enter checks answer and keeps focus in textarea
        if (activeTab === "dictation") {
          e.preventDefault();
          if (!isChecking) {
            void handlePerformCheck();
          } else {
            const el = textareaRef.current;
            if (el && document.activeElement !== el) {
              el.focus({ preventScroll: true });
            }
          }
          return;
        }
      }

      // 4. Backtick is the only Play/Pause shortcut. It intentionally works
      // while the Dictation textarea is focused so learners can keep typing.
      const playPausePressed =
        (e.key === "`" || e.code === "Backquote") &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey;

      if (playPausePressed) {
        e.preventDefault();
        togglePlay();
        return;
      }

      // 5. Arrow navigation in transcript mode (bare ArrowLeft / ArrowRight)
      if (!isTypingTarget && activeTab === "transcript") {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          if (currentIndex < questions.length - 1) {
            autoplayOnLoadRef.current = true;
            onNext();
          }
          return;
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          if (currentIndex > 0) {
            autoplayOnLoadRef.current = true;
            onPrev();
          }
          return;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isAnyModalOpen) {
        replayController.reset();
        return;
      }
      replayController.handleKeyUp(e);
    };

    const handleBlur = () => {
      replayController.handleBlur();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [
    activeTab,
    currentIndex,
    handlePerformCheck,
    isChecking,
    isCompletedOrRevealed,
    isLastQuestion,
    onFinalSubmit,
    onNext,
    onPrev,
    questions.length,
    replayAudio,
    replayKey,
    showAddLanguageModal,
    showChangeLanguageModal,
    showEditTranslationModal,
    showNotesModal,
    showSettings,
    showShortcutsModal,
    togglePlay,
  ]);

  // Click outside listener for popovers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (audioMenuRef.current && !audioMenuRef.current.contains(e.target as Node)) {
        setShowAudioMenu(false);
      }
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setShowSpeedMenu(false);
      }
      if (transcriptSpeedMenuRef.current && !transcriptSpeedMenuRef.current.contains(e.target as Node)) {
        setShowTranscriptSpeedMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showSettings && !showShortcutsModal && !showNotesModal) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (showSettings) setShowSettings(false);
      else if (showShortcutsModal) setShowShortcutsModal(false);
      else if (showNotesModal) setShowNotesModal(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showSettings, showShortcutsModal, showNotesModal]);

  const transcriptCursorIndex = clampTranscriptIndex(selectedTranscriptItemIndex, fullTranscript.length);
  const activeTranscriptItem =
    fullTranscript[transcriptCursorIndex] ??
    fullTranscript.find((item) => item.questionId === currentQuestion?.id);
  const translationText =
    (currentCheck as any)?.translation ||
    (currentQuestion?.content as any)?.translation ||
    activeTranscriptItem?.translation ||
    null;
  const vocabLevel = level || quiz.bilingualContent?.skillLabel || "A1";

  const loadTranscript = useCallback(
    async (forceReload = false) => {
      setIsTranscriptLoading(true);
      setTranscriptError(null);
      const controller = new AbortController();
      transcriptAudioRequestRef.current = controller;

      try {
        const res = await revealAndFetchTranscript(
          quiz.id,
          quiz,
          controller.signal,
          undefined,
          forceReload,
        );

        setFullTranscript(res.transcript ?? []);
        setSelectedTranscriptItemIndex(0);
        setActiveTranscriptItemIndex(0);
        setActiveTranscriptSpeakerTurnId(res.transcript?.[0]?.speakerTurnId ?? null);
        setAudioNotice(res.audioNotice);
        setAudioError(res.audioError);
        setAudioLoading(false);

        if (res.audioBlobUrl) {
          setAudioBlobUrl(res.audioBlobUrl);
          if (audioRef.current) {
            audioRef.current.src = res.audioBlobUrl;
            audioRef.current.playbackRate = playbackRateRef.current;
            audioRef.current.load();
            setCurrentTime(0);
          }
        }
      } catch (error: any) {
        if (error?.name === "AbortError" || error?.name === "CanceledError") return;
        setTranscriptError("Chưa tải được toàn bộ kịch bản. Bạn hãy thử lại.");
        setAudioError(true);
        setAudioLoading(false);
      } finally {
        setIsTranscriptLoading(false);
        if (transcriptAudioRequestRef.current === controller) {
          transcriptAudioRequestRef.current = null;
        }
      }
    },
    [quiz],
  );

  const openTranscriptTab = () => {
    setTranscriptError(null);
    setActiveTab("transcript");

    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    const cached = getCachedTranscriptResources(quiz.id, quiz.listeningAudioArtifact);
    if (cached?.transcript && cached.authorizationStatus === "authorized") {
      setFullTranscript(cached.transcript);
      setIsTranscriptLoading(false);
      setAudioNotice(cached.audioNotice);
      setAudioError(cached.audioError);
      setAudioLoading(false);

      if (cached.audioBlobUrl) {
        setAudioBlobUrl(cached.audioBlobUrl);
        if (audioRef.current) {
          audioRef.current.src = cached.audioBlobUrl;
          audioRef.current.playbackRate = playbackRateRef.current;
          audioRef.current.load();
          setCurrentTime(0);
        }
      }
      return;
    }

    setIsTranscriptLoading(true);
    void loadTranscript();
  };

  const openDictationTab = () => {
    setActiveTab("dictation");

    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    const questionCacheKey = `${quiz.id}:${currentQuestion.id}:${activeAudioVersion ?? 0}`;
    const cachedQuestion = questionAudioCacheRef.current.get(questionCacheKey);
    if (cachedQuestion) {
      setAudioBlobUrl(cachedQuestion.url);
      setAudioLoading(false);
      setAudioError(false);
      if (audioRef.current) {
        audioRef.current.src = cachedQuestion.url;
        audioRef.current.playbackRate = playbackRateRef.current;
        audioRef.current.load();
        setCurrentTime(0);
      }
    }
    focusInputAtEnd();
  };

  const retryTranscript = () => {
    setTranscriptError(null);
    setIsTranscriptLoading(true);
    void loadTranscript(true);
  };

  return (
    <div className="w-full min-h-dvh flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased">
      <PracticeHeader
        title={quiz.title}
        difficulty={reviewOnly ? "ÔN CÂU SAI" : vocabLevel}
        positionText={`Câu ${currentIndex + 1} / ${questions.length}`}
        onExit={() => onExit("/practice/listening")}
        exitLabel="Thoát"
        bilingualEnabled
        isBilingual={isBilingual}
        onToggleBilingual={() => {
          setIsBilingual((value) => {
            const next = !value;
            setSelectedTranslationLanguage(next ? "vi" : "none");
            return next;
          });
        }}
        notesEnabled
        onOpenNotes={() => setShowNotesModal(true)}
        shortcutsEnabled={showShortcutTips}
        shortcutsContent={
          <div data-shortcuts-popover="true" className="space-y-2.5 py-1 text-xs">
            {DICTATION_SHORTCUTS.map((shortcut) => (
              <div
                key={shortcut.id}
                className="flex items-center justify-between gap-3 text-slate-700 dark:text-slate-300"
              >
                <span className="font-semibold text-xs tracking-tight">
                  {shortcut.label}
                </span>
                <kbd className="inline-flex items-center justify-center min-w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/90 px-2 py-1 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 shadow-2xs">
                  {shortcut.keyDisplay}
                </kbd>
              </div>
            ))}
          </div>
        }
        soundEnabled
        soundMuted={isMuted}
        onToggleSound={() => {
          setIsMuted((prev) => {
            const next = !prev;
            if (audioRef.current) {
              audioRef.current.muted = next;
            }
            return next;
          });
        }}
      />

      <main className="w-full max-w-[1560px] 2xl:max-w-[1680px] mx-auto flex-1 flex flex-col pt-4 sm:pt-6 pb-12 px-4 sm:px-6 lg:px-8">
        {/* 3. Sub-Tabs Bar: [Dictation] [Full transcript] */}
        <div className="inline-flex max-w-full overflow-x-auto no-scrollbar p-1.5 bg-stone-100/90 dark:bg-slate-800/80 rounded-2xl border border-stone-200/80 dark:border-slate-700/80 mb-5 shadow-2xs self-start">
        <button
          type="button"
          onClick={openDictationTab}
          className={`rounded-xl px-5 py-2 text-sm sm:text-base font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "dictation"
              ? "bg-white text-blue-700 shadow-xs border border-stone-200/60 dark:bg-slate-900 dark:text-blue-400 dark:border-slate-700"
              : "text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200"
          }`}
        >
          Nghe chép chính tả (Dictation)
        </button>
        <button
          type="button"
          onClick={openTranscriptTab}
          className={`rounded-xl px-5 py-2 text-sm sm:text-base font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "transcript"
              ? "bg-white text-amber-600 shadow-xs border border-stone-200/60 dark:bg-slate-900 dark:text-amber-400 dark:border-slate-700"
              : "text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200"
          }`}
        >
          Toàn bộ kịch bản (Full transcript)
        </button>
      </div>

      {/* Shared audio instance across Dictation and Full Transcript modes */}
      <audio
        ref={audioRef}
        src={audioBlobUrl ?? undefined}
        preload="metadata"
        className="hidden"
        onTimeUpdate={() => {
          const audio = audioRef.current;
          if (!audio) return;
          if (activeTab === "dictation" && isSegmentAudio) {
            if (audio.currentTime >= segmentEndSeconds) {
              audio.pause();
              audio.currentTime = segmentStartSeconds;
              setCurrentTime(0);
              return;
            }
            setCurrentTime(Math.max(0, audio.currentTime - segmentStartSeconds));
          } else {
            setCurrentTime(audio.currentTime);
          }
          if (activeTab === "transcript" && fullTranscript.length > 0) {
            const playbackState = resolveTranscriptPlaybackState(
              audio.currentTime * 1000,
              fullTranscript,
            );
            setActiveTranscriptItemIndex(playbackState.activeChunkIndex);
            setActiveTranscriptSpeakerTurnId(playbackState.activeSpeakerTurnId);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            const fullDuration = audioRef.current.duration || 0;
            if (activeTab === "dictation" && isSegmentAudio) {
              audioRef.current.currentTime = segmentStartSeconds;
              setDuration(Math.max(0, segmentEndSeconds - segmentStartSeconds));
              setCurrentTime(0);
            } else {
              setDuration(fullDuration);
            }
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
          if (activeTab === "transcript") {
            setActiveTranscriptItemIndex(-1);
            setActiveTranscriptSpeakerTurnId(null);
          }
          if (activeTab === "transcript" && repeatTranscript) {
            window.setTimeout(() => {
              void audioRef.current?.play().catch(() => undefined);
            }, 300);
          } else if (autoReplay) {
            window.setTimeout(() => {
              void audioRef.current?.play().catch(() => undefined);
            }, Number(replayDelay) * 1000);
          }
        }}
      />

      {/* 4. Main Exercise Card */}
      {activeTab === "dictation" ? (
        <div className="w-full rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7 lg:p-8 shadow-xs transition-all">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7 lg:gap-8 items-start">
            {/* Left Column (lg:col-span-7): Player & Dictation Input */}
            <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-5">
              {/* Sentence Navigator & Settings Row */}
              <div className="flex items-center justify-between gap-4">
                {/* Left: ← Câu 1 / 21 → */}
                <div className="flex items-center gap-3 text-base font-bold text-slate-700 dark:text-slate-300">
                  <button
                    type="button"
                    onClick={onPrev}
                    disabled={currentIndex === 0}
                    title="Câu trước"
                    aria-label="Câu trước"
                    className="size-10 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-xl disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <span className="font-black text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-4 py-1.5 rounded-xl text-base sm:text-lg tracking-tight">
                    Câu {currentIndex + 1} / {questions.length}
                  </span>

                  <button
                    type="button"
                    onClick={onNext}
                    disabled={currentIndex === questions.length - 1}
                    title="Câu tiếp theo"
                    aria-label="Câu tiếp theo"
                    className="size-10 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-xl disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  >
                    <ArrowRight size={18} />
                  </button>
                </div>

                {/* Right: ⚙ Settings */}
                <div className="flex items-center gap-2.5">
                  <div className="relative" ref={settingsRef}>
                    <button
                      type="button"
                      onClick={() => setShowSettings((s) => !s)}
                      className="flex min-h-10 items-center gap-2 text-sm sm:text-base font-bold text-slate-700 hover:text-slate-950 bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:text-slate-300 dark:hover:text-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 px-4 py-2 rounded-xl transition-colors cursor-pointer shadow-2xs"
                      title="Cài đặt phát âm thanh"
                      aria-expanded={showSettings}
                    >
                      <Settings size={16} />
                      <span>Cài đặt</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Audio Player (BreadTrans clean light inline player) */}
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 p-3 sm:p-3.5 flex flex-wrap items-center gap-3 sm:gap-4 shadow-2xs">
                {/* Play / Pause button */}
                <button
                  type="button"
                  onClick={togglePlay}
                  disabled={audioLoading || audioError}
                  title={isPlaying ? "Tạm dừng" : "Phát câu"}
                  aria-label={isPlaying ? "Tạm dừng" : "Phát câu"}
                  className="flex size-12 sm:size-[50px] items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
                >
                  {audioLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : isPlaying ? (
                    <Pause size={20} fill="currentColor" />
                  ) : (
                    <Play size={20} fill="currentColor" className="ml-0.5" />
                  )}
                </button>

                {/* Monospace Timestamp */}
                <span className="font-mono text-sm sm:text-base font-bold text-slate-600 dark:text-slate-300 shrink-0 select-none">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                {/* Range Scrubber Bar */}
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  disabled={audioLoading || duration === 0}
                  aria-label="Thanh thời gian nghe"
                  className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                />

                {/* Volume control: mute toggle + accessible volume slider */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={toggleMute}
                    title={isMuted ? "Bật âm thanh" : "Tắt tiếng"}
                    aria-label={isMuted ? "Bật âm thanh" : "Tắt tiếng"}
                    className="rounded-xl p-2 text-slate-500 hover:text-slate-800 hover:bg-white dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    aria-label="Âm lượng audio"
                    className="w-18 accent-blue-600 cursor-pointer h-2"
                  />
                </div>

                {/* Speed selector */}
                <div className="relative shrink-0" ref={speedMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowSpeedMenu((value) => !value)}
                    aria-haspopup="listbox"
                    aria-expanded={showSpeedMenu}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-sm sm:text-base font-extrabold text-slate-800 shadow-2xs transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                    title="Chọn tốc độ phát"
                  >
                    {playbackRate}x <ChevronDown size={15} />
                  </button>
                  {showSpeedMenu && (
                    <div className="absolute right-0 top-full z-50 mt-2 max-h-72 w-44 overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-1.5 shadow-xl" role="listbox" aria-label="Tốc độ phát">
                      {[0.25, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.75, 2].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          role="option"
                          aria-selected={playbackRate === rate}
                          onClick={() => {
                            handleRateChange(rate);
                            setShowSpeedMenu(false);
                          }}
                          className={`flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm transition-colors cursor-pointer ${
                            playbackRate === rate ? "bg-blue-600 font-bold text-white" : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                          }`}
                        >
                          Tốc độ: {rate}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Three-dot audio actions */}
                <div className="relative shrink-0" ref={audioMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowAudioMenu((value) => !value)}
                    aria-label="Tùy chọn audio"
                    aria-expanded={showAudioMenu}
                    className="rounded-xl p-2 text-slate-500 hover:text-slate-800 hover:bg-white dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <MoreHorizontal size={20} />
                  </button>
                  {showAudioMenu && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-1.5 text-sm shadow-xl">
                      <button
                        type="button"
                        disabled={!audioBlobUrl}
                        onClick={downloadAudio}
                        className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                      >
                        <Download size={15} />
                        <span>{audioBlobUrl ? "Tải audio" : "Audio đang tải"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (audioRef.current) audioRef.current.currentTime = 0;
                          setCurrentTime(0);
                          setShowAudioMenu(false);
                          void audioRef.current?.play().catch(() => undefined);
                        }}
                        className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <RotateCcw size={15} />
                        <span>Phát lại từ đầu</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleRateChange(1);
                          setShowAudioMenu(false);
                        }}
                        className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <RefreshCw size={15} />
                        <span>Đặt tốc độ chuẩn 1x</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Textarea Input */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={displayedAnswer}
                  onChange={(e) => {
                    if (isCompletedOrRevealed) return;
                    onChangeAnswer(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.altKey) {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isCompletedOrRevealed) {
                        if (isLastQuestion) {
                          onFinalSubmit();
                        } else {
                          onNext();
                        }
                        return;
                      }
                      if (!isChecking) {
                        void handlePerformCheck();
                      }
                    }
                  }}
                  placeholder="Nhập những gì bạn nghe được (Type what you hear)..."
                  rows={3}
                  wrap="soft"
                  autoFocus
                  autoCapitalize={wordSuggestions ? "sentences" : "none"}
                  autoCorrect={wordSuggestions ? "on" : "off"}
                  enterKeyHint="done"
                  inputMode="text"
                  readOnly={Boolean(isCompletedOrRevealed)}
                  spellCheck={wordSuggestions}
                  className={`w-full resize-none min-h-[135px] sm:min-h-[160px] lg:min-h-[175px] rounded-2xl border-2 p-4 sm:p-5 sm:pb-12 text-xl sm:text-2xl lg:text-[24px] leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-all shadow-2xs font-semibold break-words cursor-text ${
                    isCompletedOrRevealed
                      ? "border-emerald-500 bg-emerald-50/15 text-slate-900 dark:text-slate-100 dark:bg-emerald-950/20 font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-950"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950"
                  }`}
                />

                {/* Mic Icon for Speech Input & subtle check indicator */}
                {!isCompletedOrRevealed && (
                  <div className="absolute bottom-3.5 right-3.5 flex items-center gap-2">
                    {isChecking && (
                      <Loader2 size={18} className="animate-spin text-blue-500" aria-label="Đang kiểm tra..." />
                    )}
                    <button
                      type="button"
                      onClick={toggleSpeechRecognition}
                      disabled={isChecking}
                      title={isListeningSpeech ? "Đang lắng nghe..." : "Nhập bằng giọng nói"}
                      aria-label={isListeningSpeech ? "Đang lắng nghe..." : "Nhập bằng giọng nói"}
                      className={`size-10 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                        isListeningSpeech
                          ? "bg-rose-500 text-white animate-pulse"
                          : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {isListeningSpeech ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons Row before checking/skipping */}
              {!isCompletedOrRevealed && !isChecked && (
                <div className="flex items-center justify-between gap-4 pt-1">
                  <button
                    type="button"
                    onClick={() => void handlePerformCheck()}
                    disabled={isChecking}
                    className="inline-flex min-h-[50px] sm:min-h-[54px] items-center justify-center gap-2.5 rounded-2xl bg-blue-600 px-8 sm:px-10 py-3 text-base sm:text-lg font-extrabold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    {isChecking && <Loader2 size={18} className="animate-spin" />}
                    <span>Kiểm tra</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSkipSentence}
                    disabled={isChecking}
                    className="inline-flex min-h-[50px] sm:min-h-[54px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 sm:px-8 py-3 text-base sm:text-lg font-bold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 cursor-pointer shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                  >
                    {isChecking ? <Loader2 size={16} className="animate-spin" /> : null}
                    <span>Bỏ qua</span>
                  </button>
                </div>
              )}

              {/* When correct or explicitly skipped: show Next button & replay control */}
              {isCompletedOrRevealed && (
                <div className="flex items-center justify-between gap-4 pt-1">
                  <div className="flex items-center gap-2.5">
                    {isSkipped ? (
                      <span className="inline-flex items-center gap-1.5 text-base sm:text-lg font-extrabold px-5 py-2.5 rounded-xl border bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                        Đã bỏ qua
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-base sm:text-lg font-extrabold px-5 py-2.5 rounded-xl border bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                        ✓ Chính xác
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleRetryCurrentSentence}
                      title="Làm lại câu này"
                      aria-label="Làm lại câu này"
                      className="size-12 sm:size-[50px] flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-colors cursor-pointer border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs"
                    >
                      <RotateCcw size={20} />
                    </button>

                    {isLastQuestion ? (
                      <button
                        type="button"
                        onClick={onFinalSubmit}
                        disabled={isSubmitting}
                        className="inline-flex min-h-[50px] sm:min-h-[54px] items-center gap-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-8 sm:px-9 py-3 text-base sm:text-lg font-extrabold text-white shadow-xs transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            <span>Đang nộp bài...</span>
                          </>
                        ) : (
                          <>
                            <Check size={20} />
                            <span>Hoàn thành bài tập</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onNext}
                        className="inline-flex min-h-[50px] sm:min-h-[54px] items-center gap-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-8 sm:px-9 py-3 text-base sm:text-lg font-extrabold text-white shadow-xs transition-colors cursor-pointer"
                      >
                        <span>Câu tiếp theo</span>
                        <ArrowRight size={18} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Check Feedback Panel (Word-by-word diff) when checked and incorrect */}
              {isChecked && !isCompletedOrRevealed && (
                <div
                  className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800"
                  role="alert"
                  aria-live="polite"
                >
                  {/* Progressive answer review */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 p-4 sm:p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Đối chiếu theo thứ tự nghe
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleSkipSentence}
                          disabled={isChecking}
                          className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 px-4 py-2 text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-slate-100 disabled:opacity-50 cursor-pointer shadow-2xs"
                        >
                          Bỏ qua
                        </button>
                        <button
                          type="button"
                          onClick={onToggleReveal}
                          className="text-sm sm:text-base font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer"
                        >
                          {isRevealed ? "Ẩn đáp án" : "Xem đáp án"}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-2 text-xl sm:text-2xl md:text-3xl font-bold leading-relaxed">
                      {buildProgressiveAnswer(
                        currentCheck?.correctAnswer ?? canonicalAnswer,
                        currentCheck?.submittedAnswer ?? displayedAnswer,
                        isSkipped,
                        isRevealed,
                      ).map((token, index) => (
                        <span
                          key={`${token.text}-${index}`}
                          className={
                            token.state === "hint"
                              ? "rounded-md bg-amber-100 text-amber-950 ring-1 ring-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:ring-amber-800 font-bold inline-block shadow-2xs px-1"
                              : token.state === "correct"
                                ? "text-emerald-700 dark:text-emerald-400 font-bold"
                                : token.state === "answer"
                                  ? "text-slate-900 dark:text-slate-100 font-bold"
                                  : "text-slate-400 dark:text-slate-500 tracking-[0.2em] font-mono"
                          }
                        >
                          {token.text}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column (lg:col-span-5): Translation & Pronunciation */}
            <div className="lg:col-span-5 flex flex-col gap-4 sm:gap-5">
              {isCompletedOrRevealed ? (
                <>
                  {/* Card 1: Vietnamese Translation */}
                  {isBilingual && (
                    <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 p-5 sm:p-6 shadow-2xs flex flex-col justify-between min-h-[170px]">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                          Bản dịch {selectedLanguage === "vi" ? "tiếng Việt" : selectedLanguage === "en" ? "tiếng Anh" : "bản địa"}
                        </span>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md">
                          AI Bilingual
                        </span>
                      </div>
                      <p className="text-xl sm:text-2xl lg:text-[24px] font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                        {selectedLanguage === "en" ? (
                          canonicalAnswer || (
                            <span className="text-slate-400 font-normal italic">
                              (Chưa có bản dịch cho câu này)
                            </span>
                          )
                        ) : (
                          translationText || (
                            <span className="text-slate-400 font-normal italic">
                              (Chưa có bản dịch cho câu này)
                            </span>
                          )
                        )}
                      </p>
                    </div>

                    {/* Translation Actions Bar (Edit + More options) */}
                    <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-end gap-3 text-sm">
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Edit button: user provides improved translation to admin */}
                        <button
                          type="button"
                          onClick={() => {
                            setSuggestedTranslation(translationText || "");
                            setShowEditTranslationModal(true);
                          }}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-slate-100 transition-colors cursor-pointer shadow-2xs"
                          title="Cung cấp bản dịch cải thiện cho Admin"
                        >
                          <Pencil size={14} className="text-slate-500" />
                          <span>Edit</span>
                        </button>

                        {/* More options: Change language, Add another language */}
                        <div className="relative" ref={translationMenuRef}>
                          <button
                            type="button"
                            onClick={() => setShowTranslationMenu((prev) => !prev)}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-slate-100 transition-colors cursor-pointer shadow-2xs"
                            title="Tùy chọn ngôn ngữ dịch"
                            aria-expanded={showTranslationMenu}
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          {showTranslationMenu && (
                            <div className="absolute right-0 top-full mt-1.5 z-40 w-44 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-1 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowTranslationMenu(false);
                                  setShowChangeLanguageModal(true);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors cursor-pointer"
                              >
                                <Globe size={13} className="text-slate-500 shrink-0" />
                                <span>Change language</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowTranslationMenu(false);
                                  setShowAddLanguageModal(true);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors cursor-pointer"
                              >
                                <Plus size={13} className="text-slate-500 shrink-0" />
                                <span>Add another language</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                  {/* Card 2: Pronunciation */}
                  <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 p-5 sm:p-6 shadow-2xs">
                    <div className="flex items-center justify-between mb-3.5">
                      <span className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Phát âm (Pronunciation)
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                        Nhấp vào từ để tra từ điển
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl lg:text-[24px] font-bold text-slate-900 dark:text-slate-100 leading-loose">
                      {canonicalAnswer ? (
                        String(canonicalAnswer).split(/\s+/).filter(Boolean).map((word: string, wordIdx: number) => {
                          const cleanWord = word.trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "") || word;
                          return (
                            <button
                              key={`${word}-${wordIdx}`}
                              type="button"
                              className="inline-block border-b-2 border-dotted border-slate-300 dark:border-slate-600 pb-0.5 mr-2 text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-600 dark:hover:border-blue-400 hover:bg-blue-50/80 dark:hover:bg-blue-950/50 rounded-md px-1.5 py-0.5 cursor-pointer transition-all font-bold text-xl sm:text-2xl lg:text-[24px]"
                              title={`Nhấn để tra từ điển & phát âm: "${cleanWord}"`}
                              onClick={() => {
                                if (cleanWord) {
                                  setSelectedWordForLookup(cleanWord);
                                }
                              }}
                            >
                              {word}
                            </button>
                          );
                        })
                      ) : (
                        <span className="text-slate-400 font-normal italic">
                          (Đang cập nhật phát âm)
                        </span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col justify-center items-center h-full min-h-[320px] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-8 text-center">
                  <div className="size-20 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5">
                    <Languages size={38} />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">
                    Bản dịch &amp; Giải thích phát âm
                  </p>
                  <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 mt-3 max-w-md leading-relaxed">
                    Sẽ tự động hiển thị sau khi bạn bấm Kiểm tra hoặc Bỏ qua.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 4b. Full Transcript Tab View (BreadTrans Light Theme Two-Column Split Layout) */
        <div className="w-full rounded-2xl border border-stone-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
            {/* Left Column: Player & Sentence Showcase */}
            <div className="lg:col-span-6 flex flex-col justify-between rounded-xl bg-stone-50/70 dark:bg-slate-800/60 border border-stone-200/80 dark:border-slate-700/80 p-4 sm:p-5 min-h-[460px]">
              <div>
                {/* Left Top Bar: Translation Select & Repeat Checkbox */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-stone-200/90 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-stone-700 dark:text-slate-300 shadow-2xs">
                    <Languages size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <select
                      value={selectedTranslationLanguage}
                      onChange={(e) => setSelectedTranslationLanguage(e.target.value as "none" | "vi")}
                      aria-label="Chọn bản dịch"
                      className="bg-transparent text-xs font-semibold text-stone-700 dark:text-slate-200 focus:outline-none cursor-pointer pr-1 [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-800 dark:[&>option]:text-slate-200"
                    >
                      <option value="none">Không dịch (No translation)</option>
                      <option value="vi">Tiếng Việt (Vietnamese)</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-slate-300 select-none cursor-pointer hover:text-stone-900 dark:hover:text-slate-100">
                    <input
                      type="checkbox"
                      checked={repeatTranscript}
                      onChange={(e) => setRepeatTranscript(e.target.checked)}
                      className="size-4 rounded border-stone-300 dark:border-slate-600 text-amber-600 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                    />
                    <span>Lặp lại (Repeat)</span>
                  </label>
                </div>

                {/* Inline Custom Audio Player */}
                <div className="rounded-xl bg-white dark:bg-slate-800 border border-stone-200/90 dark:border-slate-700 p-3 sm:p-3.5 shadow-2xs flex flex-wrap items-center gap-2.5 sm:gap-3">
                  {/* Play / Pause button */}
                  <button
                    type="button"
                    onClick={togglePlay}
                    disabled={audioLoading || audioError}
                    title={isPlaying ? "Tạm dừng" : "Phát câu"}
                    aria-label={isPlaying ? "Tạm dừng" : "Phát câu"}
                    className="flex size-9 items-center justify-center rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
                  >
                    {audioLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : isPlaying ? (
                      <Pause size={15} fill="currentColor" />
                    ) : (
                      <Play size={15} fill="currentColor" className="ml-0.5" />
                    )}
                  </button>

                  {/* Timestamp */}
                  <span className="font-mono text-xs font-semibold text-stone-500 dark:text-slate-400 shrink-0 select-none tabular-nums">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>

                  {/* Range Scrubber Bar */}
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                    disabled={audioLoading || duration === 0}
                    aria-label="Thanh thời gian nghe"
                    className="flex-1 min-w-[70px] h-1.5 bg-stone-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-amber-500 focus:outline-none"
                  />

                  {/* Volume control */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={toggleMute}
                      title={isMuted ? "Bật âm thanh" : "Tắt tiếng"}
                      aria-label={isMuted ? "Bật âm thanh" : "Tắt tiếng"}
                      className="rounded-lg p-1 text-stone-500 hover:text-stone-800 hover:bg-stone-100 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      aria-label="Âm lượng audio"
                      className="w-14 sm:w-16 accent-amber-500 cursor-pointer h-1.5"
                    />
                  </div>

                  {/* Speed Menu */}
                  <div className="relative shrink-0" ref={transcriptSpeedMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowTranscriptSpeedMenu((value) => !value)}
                      aria-haspopup="listbox"
                      aria-expanded={showTranscriptSpeedMenu}
                      className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-xs font-bold text-stone-700 shadow-2xs transition-colors hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 cursor-pointer"
                      title="Chọn tốc độ phát"
                    >
                      {playbackRate}x <ChevronDown size={12} />
                    </button>
                    {showTranscriptSpeedMenu && (
                      <div className="absolute right-0 top-full z-50 mt-1 max-h-56 w-36 overflow-y-auto rounded-xl border border-stone-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-1 shadow-xl" role="listbox" aria-label="Tốc độ phát">
                        {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                          <button
                            key={rate}
                            type="button"
                            role="option"
                            aria-selected={playbackRate === rate}
                            onClick={() => {
                              handleRateChange(rate);
                              setShowTranscriptSpeedMenu(false);
                            }}
                            className={`flex min-h-8 w-full items-center rounded-lg px-2.5 text-left text-xs transition-colors cursor-pointer ${
                              playbackRate === rate ? "bg-amber-500 font-bold text-white" : "text-stone-700 hover:bg-stone-100 dark:text-slate-300 dark:hover:bg-slate-800"
                            }`}
                          >
                            {rate}x {rate === 1 && "(Chuẩn)"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {audioNotice && (
                <p role="status" className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                  {audioNotice}
                </p>
              )}

              {/* Sentence Focus Showcase (Center Area) */}
              <div className="my-auto py-8 px-4 flex flex-col items-center justify-center text-center">
                {isTranscriptLoading && fullTranscript.length === 0 ? (
                  <div className="space-y-3 w-full max-w-md animate-pulse py-4" aria-live="polite">
                    <div className="h-8 bg-stone-200 dark:bg-slate-700 rounded-xl w-3/4 mx-auto" />
                    <div className="h-6 bg-stone-100 dark:bg-slate-800 rounded-lg w-1/2 mx-auto" />
                  </div>
                ) : (() => {
                  const activeTranscriptItem =
                    fullTranscript[transcriptCursorIndex] ??
                    fullTranscript.find((item) => item.questionId === currentQuestion?.id);
                  const activeSentenceText = activeTranscriptItem?.transcript || "";
                  const activeSentenceTranslation = activeTranscriptItem?.translation || null;

                  return (
                    <>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-stone-900 dark:text-slate-100 tracking-tight leading-relaxed max-w-2xl sm:max-w-3xl">
                        {activeSentenceText || (
                          <span className="text-stone-400 dark:text-slate-500 font-normal italic">
                            (Đang tải nội dung câu...)
                          </span>
                        )}
                      </p>
                      {selectedTranslationLanguage === "vi" && (
                        <p className="mt-3.5 text-base sm:text-lg md:text-xl font-medium text-amber-800/90 dark:text-amber-300/90 max-w-2xl sm:max-w-3xl leading-relaxed animate-in fade-in duration-200">
                          {activeSentenceTranslation || (
                            <span className="text-stone-400 dark:text-slate-500 italic font-normal">
                              (Chưa có bản dịch cho câu này)
                            </span>
                          )}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Bottom Sentence Pager */}
              <div className="flex items-center justify-center gap-3 pt-3 border-t border-stone-200/80 dark:border-slate-700/80">
                <button
                  type="button"
                  onClick={handleTranscriptPrev}
                  disabled={transcriptCursorIndex === 0 || fullTranscript.length === 0}
                  title="Câu trước (ArrowLeft)"
                  aria-label="Câu trước"
                  className="p-2 text-stone-500 hover:text-stone-900 hover:bg-white dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer shadow-2xs border border-stone-200/60 dark:border-slate-700"
                >
                  <ChevronLeft size={18} />
                </button>

                <span className="font-mono text-xs sm:text-sm font-bold text-stone-700 dark:text-slate-200 bg-white dark:bg-slate-800 px-3.5 py-1.5 rounded-lg border border-stone-200/80 dark:border-slate-700 shadow-2xs select-none">
                  {fullTranscript.length > 0 ? transcriptCursorIndex + 1 : 0} / {fullTranscript.length}
                </span>

                <button
                  type="button"
                  onClick={handleTranscriptNext}
                  disabled={fullTranscript.length === 0 || transcriptCursorIndex >= fullTranscript.length - 1}
                  title="Câu tiếp theo (ArrowRight)"
                  aria-label="Câu tiếp theo"
                  className="p-2 text-stone-500 hover:text-stone-900 hover:bg-white dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer shadow-2xs border border-stone-200/60 dark:border-slate-700"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Right Column: Scrollable Playlist of Sentences */}
            <div className="lg:col-span-6 flex flex-col justify-between rounded-xl bg-stone-50/40 dark:bg-slate-800/40 border border-stone-200/80 dark:border-slate-700/80 p-3 sm:p-4 min-h-[460px]">
              {isTranscriptLoading && fullTranscript.length === 0 ? (
                    <div className="space-y-2 p-2" aria-live="polite" aria-label="Đang tải kịch bản">
                      {questions.slice(0, Math.min(6, questions.length)).map((question) => (
                        <div key={question.id} className="h-12 animate-pulse rounded-xl bg-stone-100 dark:bg-slate-800" />
                      ))}
                    </div>
              ) : transcriptError && fullTranscript.length === 0 ? (
                    <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-4 text-sm text-rose-800 dark:text-rose-300" role="alert">
                      <p>{transcriptError}</p>
                      <button
                        type="button"
                        onClick={retryTranscript}
                        className="mt-2.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer"
                      >
                        Thử lại
                      </button>
                    </div>
              ) : displayTranscriptItems.length === 0 ? (
                    <div className="rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 p-5 text-sm text-stone-600 dark:text-slate-400 text-center">
                      Bài này chưa có dữ liệu kịch bản để hiển thị.
                    </div>
              ) : (
                  <div
                    ref={transcriptListRef}
                    className="h-[360px] sm:h-[400px] overflow-y-auto space-y-1.5 pr-1.5 custom-scrollbar"
                    role="list"
                    aria-label="Danh sách câu kịch bản"
                  >
                    {transcriptGroups.map((group, groupIndex) => {
                      const isCurrent =
                        fullTranscript.length > 0 &&
                        (activeTranscriptSpeakerTurnId
                          ? group.key === activeTranscriptSpeakerTurnId
                          : activeTranscriptItemIndex >= 0
                            ? group.items.some((_, offset) => group.startIndex + offset === activeTranscriptItemIndex)
                            : false);
                      const lead = group.items[0];

                      return (
                        <button
                          key={`${group.key}-${group.startIndex}`}
                          type="button"
                          ref={isCurrent ? activeTranscriptRowRef : null}
                          onClick={() => handleSelectTranscriptSentence(group.startIndex)}
                          className={`group w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer border ${
                            isCurrent
                              ? "bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/70 text-amber-950 dark:text-amber-200 shadow-2xs"
                              : "bg-white hover:bg-stone-50/90 border-stone-200/60 text-stone-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {/* The full script uses one continuous audio track; rows select the highlighted line. */}
                          <span
                            className={`size-7 sm:size-8 rounded-full flex items-center justify-center shrink-0 transition-colors mt-0.5 ${
                              isCurrent
                                ? "bg-amber-500 text-white shadow-xs"
                                : "bg-stone-100 text-stone-500 group-hover:bg-amber-100 group-hover:text-amber-700 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-amber-950/60 dark:group-hover:text-amber-300"
                            }`}
                            aria-hidden="true"
                          >
                            {groupIndex + 1}
                          </span>

                          {/* Text content */}
                          <div className="min-w-0 flex-1">
                            <p className={`text-base sm:text-lg leading-relaxed ${isCurrent ? "font-bold text-amber-950 dark:text-amber-200" : "font-medium text-stone-800 group-hover:text-stone-900 dark:text-slate-200 dark:group-hover:text-slate-100"}`}>
                              {lead.speaker && (
                                <span className="mr-1.5 text-xs sm:text-sm font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                                  {lead.speaker}:
                                </span>
                              )}
                              {group.items.map((item, index) => (
                                <span key={`${item.questionId}-${index}`} className={index > 0 ? "mt-1 block" : ""}>
                                  {item.transcript}
                                </span>
                              ))}
                            </p>
                            {selectedTranslationLanguage === "vi" && group.items.some((item) => item.translation) && (
                              <p className="mt-1.5 text-sm sm:text-base text-amber-800/85 dark:text-amber-300/85 font-medium leading-relaxed">
                                {group.items.map((item, index) => item.translation ? <span key={`${item.questionId}-translation-${index}`} className={index > 0 ? "mt-1 block" : ""}>{item.translation}</span> : null)}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
              )}

              {/* Right Column Bottom Bar */}
              <div className="pt-3 border-t border-stone-200/70 dark:border-slate-700/70 flex flex-col gap-2">
                <div className="flex items-center justify-end">
                  <label className="flex items-center gap-2 text-sm font-semibold text-stone-600 dark:text-slate-400 select-none cursor-pointer hover:text-stone-900 dark:hover:text-slate-200">
                    <input
                      type="checkbox"
                      checked={autoScrollTranscript}
                      onChange={(e) => setAutoScrollTranscript(e.target.checked)}
                      className="size-4 rounded border-stone-300 dark:border-slate-600 text-amber-600 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                    />
                    <span>Tự động cuộn (Auto scroll)</span>
                  </label>
                </div>
                {showShortcutTips && (
                  <div className="text-xs text-stone-500 dark:text-slate-400 font-medium space-y-1 select-none">
                    <p>
                      Nhấn <kbd className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 font-mono text-stone-700 text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">`</kbd> để Phát / Dừng
                    </p>
                    <p>
                      Nhấn <kbd className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 font-mono text-stone-700 text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">←</kbd> và <kbd className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 font-mono text-stone-700 text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">→</kbd> để chuyển giữa các câu
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Motivational Tip Banner below Workspace */}
      <aside
        aria-label="Lời khuyên luyện nghe"
        className="mt-5 inline-flex items-center gap-3 self-start rounded-2xl border border-amber-200/80 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/40 px-5 py-3.5 text-base sm:text-lg font-semibold text-amber-950 dark:text-amber-200 shadow-2xs max-w-full"
      >
        <Lightbulb size={20} className="shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <span className="leading-relaxed">
          {DICTATION_TIPS[tipIndex]}
        </span>
        <button
          type="button"
          onClick={handleRotateTip}
          title="Xem lời khuyên khác"
          aria-label="Xem lời khuyên khác"
          className="inline-flex items-center justify-center shrink-0 rounded-lg p-1.5 text-amber-700/80 hover:bg-amber-100 hover:text-amber-950 dark:text-amber-300/80 dark:hover:bg-amber-900/50 dark:hover:text-amber-100 transition-colors cursor-pointer"
        >
          <RefreshCw size={16} />
        </button>
      </aside>
      </main>

      {/* Settings modal mirrors the reference controls while keeping preferences local to this learner. */}
      {showSettings && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowSettings(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dictation-settings-title"
            className="w-full max-w-xl sm:max-w-2xl rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4.5">
              <h2 id="dictation-settings-title" className="flex items-center gap-2.5 text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
                <Settings size={20} className="text-blue-600 dark:text-blue-400" />
                Cài đặt nghe chép
              </h2>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                aria-label="Đóng cài đặt"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 px-6 py-3 text-sm sm:text-base">
              <label className="flex min-h-14 items-center justify-between gap-4">
                <span className="font-bold text-slate-800 dark:text-slate-200">Phím phát lại (Replay Key)</span>
                <select value={replayKey} onChange={(event) => setReplayKey(event.target.value as DictationReplayKey)} className="min-h-10 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 px-3 text-slate-700 dark:text-slate-200 [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-800 dark:[&>option]:text-slate-200">
                  <option value="Ctrl">Ctrl</option><option value="Alt">Alt</option><option value="Shift">Shift</option>
                </select>
              </label>
              <label className="flex min-h-14 items-center justify-between gap-4">
                <span className="font-bold text-slate-800 dark:text-slate-200">Phím phát / dừng</span>
                <select value={playPauseKey} disabled className="min-h-10 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 px-3 text-slate-700 dark:text-slate-200 [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-800 dark:[&>option]:text-slate-200 disabled:cursor-not-allowed disabled:opacity-70">
                  <option value="`">`</option>
                </select>
              </label>
              <label className="flex min-h-14 items-center justify-between gap-4">
                <span className="font-bold text-slate-800 dark:text-slate-200">Tự động phát lại</span>
                <input type="checkbox" checked={autoReplay} onChange={(event) => setAutoReplay(event.target.checked)} className="size-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" />
              </label>
              <label className="flex min-h-14 items-center justify-between gap-4">
                <span className="font-bold text-slate-800 dark:text-slate-200">Thời gian giữa các lần phát</span>
                <select value={replayDelay} onChange={(event) => setReplayDelay(event.target.value)} className="min-h-10 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 px-3 text-slate-700 dark:text-slate-200 [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-800 dark:[&>option]:text-slate-200">
                  <option value="0.25">0.25 giây</option><option value="0.5">0.5 giây</option><option value="1">1 giây</option><option value="2">2 giây</option>
                </select>
              </label>
              <label className="flex min-h-14 items-center justify-between gap-4">
                <span className="font-bold text-slate-800 dark:text-slate-200">Gợi ý từ (thiết bị di động)</span>
                <input type="checkbox" checked={wordSuggestions} onChange={(event) => setWordSuggestions(event.target.checked)} className="size-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" />
              </label>
              <label className="flex min-h-14 items-center justify-between gap-4">
                <span className="font-bold text-slate-800 dark:text-slate-200">Hiện hướng dẫn phím tắt</span>
                <input type="checkbox" checked={showShortcutTips} onChange={(event) => setShowShortcutTips(event.target.checked)} className="size-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" />
              </label>
              {onChangeAccent && (
                <div className="flex min-h-14 items-center justify-between gap-4">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Giọng đọc</span>
                  <select value={accent} onChange={(event) => onChangeAccent(event.target.value)} className="min-h-10 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 px-3 text-slate-700 dark:text-slate-200 [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-800 dark:[&>option]:text-slate-200">
                    <option>US</option><option>UK</option><option>AU</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end border-t border-slate-100 dark:border-slate-800 px-6 py-4">
              <button type="button" onClick={() => setShowSettings(false)} className="min-h-11 rounded-xl bg-blue-600 px-6 text-sm sm:text-base font-bold text-white hover:bg-blue-700 cursor-pointer">
                Xong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md sm:max-w-lg rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 sm:p-7 shadow-2xl text-slate-800 dark:text-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Keyboard size={17} className="text-blue-600 dark:text-blue-400" />
                Phím tắt nhanh
              </h3>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Phát / Dừng audio:</span>
                <kbd className="rounded-md bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 px-2 py-1 font-mono text-slate-800 dark:text-slate-200 font-bold">{playPauseKey}</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Phát lại câu:</span>
                <kbd className="rounded-md bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 px-2 py-1 font-mono text-slate-800 dark:text-slate-200 font-bold">{replayKey}</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Kiểm tra kết quả:</span>
                <kbd className="rounded-md bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 px-2 py-1 font-mono text-slate-800 dark:text-slate-200 font-bold">Enter</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Câu tiếp theo:</span>
                <kbd className="rounded-md bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 px-2 py-1 font-mono text-slate-800 dark:text-slate-200 font-bold">Ctrl + →</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Câu trước:</span>
                <kbd className="rounded-md bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 px-2 py-1 font-mono text-slate-800 dark:text-slate-200 font-bold">Ctrl + ←</kbd>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white px-5 py-2 text-xs font-bold cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Edit Translation Suggestion Modal (Submits feedback to Admin, does not mutate live) */}
      {showEditTranslationModal && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-[2px] animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl sm:max-w-3xl rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 mb-5">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                  <Pencil size={20} className="text-blue-600 dark:text-blue-400" />
                  Đề xuất bản dịch cải thiện
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Bản dịch của bạn sẽ được gửi tới Admin để kiểm duyệt và nâng cấp bài học.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditTranslationModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Câu tiếng Anh gốc:</span>
                <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 p-3.5 text-base font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                  {canonicalAnswer || "(Không có câu gốc)"}
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Bản dịch hiện tại:</span>
                <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 p-3.5 text-base font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                  {translationText || "(Chưa có bản dịch)"}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                  Bản dịch đề xuất của bạn <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  value={suggestedTranslation}
                  onChange={(e) => setSuggestedTranslation(e.target.value)}
                  placeholder="Nhập bản dịch tiếng Việt chuẩn xác hơn theo ý bạn..."
                  rows={3}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-3.5 text-base sm:text-lg text-slate-900 dark:text-slate-100 focus:border-blue-600 dark:focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Ghi chú thêm (tùy chọn):
                </label>
                <input
                  type="text"
                  value={suggestionNote}
                  onChange={(e) => setSuggestionNote(e.target.value)}
                  placeholder="Ví dụ: Dịch tự nhiên hơn theo ngữ cảnh giao tiếp hàng ngày..."
                  className="w-full rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-3 text-sm sm:text-base text-slate-800 dark:text-slate-100 focus:border-blue-600 dark:focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowEditTranslationModal(false)}
                disabled={isSubmittingSuggestion}
                className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 px-5 py-2.5 text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmitTranslationSuggestion}
                disabled={isSubmittingSuggestion || !suggestedTranslation.trim()}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 text-sm sm:text-base font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmittingSuggestion ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Gửi đề xuất cho Admin</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Change Language Modal */}
      {showChangeLanguageModal && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-[2px] animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg sm:max-w-xl rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                <Globe size={18} className="text-blue-600 dark:text-blue-400" />
                Change language
              </h3>
              <button
                type="button"
                onClick={() => setShowChangeLanguageModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Chọn ngôn ngữ hiển thị bản dịch cho câu này:
            </p>

            <div className="space-y-2 text-sm">
              {[
                { code: "vi", label: "Tiếng Việt (Mặc định)" },
                { code: "en", label: "English (Nguyên bản tiếng Anh)" },
                { code: "ja", label: "日本語 (Japanese)" },
                { code: "ko", label: "한국어 (Korean)" },
                { code: "fr", label: "Français (French)" },
                { code: "zh", label: "中文 (Chinese)" },
              ].map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    setSelectedLanguage(item.code);
                    setShowChangeLanguageModal(false);
                    if (item.code !== "vi" && item.code !== "en") {
                      toast(`Đã chọn ${item.label}. Ngôn ngữ này đang được cập nhật thêm.`);
                    }
                  }}
                  className={`flex w-full items-center justify-between p-3.5 rounded-xl border text-left transition-colors cursor-pointer text-sm sm:text-base ${
                    selectedLanguage === item.code
                      ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/50 text-blue-900 dark:text-blue-300 font-bold"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                  }`}
                >
                  <span>{item.label}</span>
                  {selectedLanguage === item.code && <Check size={16} className="text-blue-600 dark:text-blue-400" />}
                </button>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowChangeLanguageModal(false)}
                className="rounded-xl bg-slate-900 dark:bg-slate-800 text-white px-5 py-2.5 text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Add Another Language Modal */}
      {showAddLanguageModal && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-[2px] animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl sm:max-w-3xl rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 mb-5">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                  <Plus size={18} className="text-blue-600 dark:text-blue-400" />
                  Add another language
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Đóng góp bản dịch ngôn ngữ mới cho câu này tới Admin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddLanguageModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Câu tiếng Anh gốc:</span>
                <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 p-3.5 text-base font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                  {canonicalAnswer || "(Không có câu gốc)"}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                  Tên ngôn ngữ <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  value={addLangName}
                  onChange={(e) => setAddLangName(e.target.value)}
                  placeholder="Ví dụ: Japanese, Korean, French, German..."
                  className="w-full rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-3 text-base text-slate-800 dark:text-slate-100 focus:border-blue-600 dark:focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                  Bản dịch tương ứng <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  value={addLangTranslation}
                  onChange={(e) => setAddLangTranslation(e.target.value)}
                  placeholder="Nhập bản dịch bằng ngôn ngữ trên..."
                  rows={3}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-3.5 text-base sm:text-lg text-slate-900 dark:text-slate-100 focus:border-blue-600 dark:focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddLanguageModal(false)}
                disabled={isSubmittingAddLang}
                className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 px-5 py-2.5 text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmitAddLanguage}
                disabled={isSubmittingAddLang || !addLangName.trim() || !addLangTranslation.trim()}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 text-sm sm:text-base font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmittingAddLang ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Gửi bản dịch cho Admin</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Word Dictionary Popup (matching Speaking module) */}
      {selectedWordForLookup && (
        <WordDictionaryPopup
          word={selectedWordForLookup}
          onClose={() => setSelectedWordForLookup(null)}
          onPracticeWord={(w) => {
            if (typeof window !== "undefined" && "speechSynthesis" in window) {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(w);
              utterance.rate = 0.9;
              utterance.lang = accent === "UK" ? "en-GB" : "en-US";
              window.speechSynthesis.speak(utterance);
            }
          }}
        />
      )}

      {/* Notes Scratchpad Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl sm:max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                <StickyNote size={20} className="text-amber-500" />
                Ghi chú bài học
              </h3>
              <button
                type="button"
                onClick={() => setShowNotesModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú nhanh các từ mới hoặc cấu trúc nghe được..."
              rows={6}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950 placeholder:text-slate-400 dark:placeholder:text-slate-500 leading-relaxed"
            />
            <p className="mt-2.5 text-sm text-slate-500 dark:text-slate-400">
              Ghi chú được lưu tự động trên thiết bị này.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowNotesModal(false)}
                className="min-h-11 rounded-xl bg-slate-900 dark:bg-slate-800 text-white px-5 py-2.5 text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
