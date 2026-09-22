"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
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
  Share2,
  Star,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
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
  type DictationDiffToken,
  buildProgressiveAnswer,
  canonicalizeSubmittedDictation,
  maskWord,
  normalizeDictationToken,
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
  onSelectIndex: (index: number) => void;
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

function resolveTranscriptIndex(
  currentTime: number,
  duration: number,
  items: ListeningTranscriptItem[],
): number {
  if (!Number.isFinite(duration) || duration <= 0 || items.length === 0) return -1;
  const totalWeight = items.reduce(
    (sum, item) => sum + Math.max(item.transcript.trim().length, 1),
    0,
  );
  const target = Math.min(1, Math.max(0, currentTime / duration)) * totalWeight;
  let accumulated = 0;
  for (let index = 0; index < items.length; index += 1) {
    accumulated += Math.max(items[index].transcript.trim().length, 1);
    if (target <= accumulated || index === items.length - 1) return index;
  }
  return 0;
}


export function DailyDictationWorkspace({
  quiz,
  questions,
  currentQuestion,
  currentIndex,
  onSelectIndex,
  selectedAnswer,
  onChangeAnswer,
  onCheck,
  isChecking,
  isChecked,
  isSkipped,
  currentCheck,
  dictationDiff,
  isRevealed,
  onToggleReveal,
  showAnswerImmediately,
  onToggleShowAnswerImmediately,
  onSkip,
  onRetry,
  onNext,
  onPrev,
  onFinalSubmit,
  isSubmitting,
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
  const displayedAnswer = (isSkipped || isRevealed)
    ? (canonicalAnswer || currentCheck?.correctAnswer || selectedAnswer)
    : selectedAnswer;
  const isLastQuestion = currentIndex === questions.length - 1;
  const isCompletedOrRevealed = isSkipped || isRevealed || Boolean(isChecked && currentCheck?.isCorrect);
  const [activeTab, setActiveTab] = useState<"dictation" | "transcript">("dictation");
  const [isStarred, setIsStarred] = useState(false);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [selectedWordForLookup, setSelectedWordForLookup] = useState<string | null>(null);

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
  const audioBlobUrlRef = useRef<string | null>(null);
  const playbackRateRef = useRef(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [replayKey, setReplayKey] = useState("Ctrl");
  const [playPauseKey, setPlayPauseKey] = useState("`");
  const [autoReplay, setAutoReplay] = useState(false);
  const [replayDelay, setReplayDelay] = useState("0.5");
  const [wordSuggestions, setWordSuggestions] = useState(false);
  const [showShortcutTips, setShowShortcutTips] = useState(true);
  const [audioLoading, setAudioLoading] = useState(true);
  const [audioError, setAudioError] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [fullTranscript, setFullTranscript] = useState<ListeningTranscriptItem[]>([]);
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [transcriptReloadKey, setTranscriptReloadKey] = useState(0);
  const [selectedTranslationLanguage, setSelectedTranslationLanguage] = useState<"none" | "vi">("none");
  const [repeatTranscript, setRepeatTranscript] = useState(false);
  const [autoScrollTranscript, setAutoScrollTranscript] = useState(true);
  const [showTranscriptSpeedMenu, setShowTranscriptSpeedMenu] = useState(false);
  const autoplayOnLoadRef = useRef(false);
  const transcriptSpeedMenuRef = useRef<HTMLDivElement | null>(null);
  const activeTranscriptRowRef = useRef<HTMLButtonElement | null>(null);
  const transcriptListRef = useRef<HTMLDivElement | null>(null);
  const transcriptAudioRequestRef = useRef<AbortController | null>(null);
  const activeAudioVersion = currentQuestion?.audioAssets?.find((asset) => asset.isActive)?.version;

  // Speech Recognition (Mic)
  const [isListeningSpeech, setIsListeningSpeech] = useState(false);
  const recognitionRef = useRef<any>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const optionsRef = useRef<HTMLDivElement | null>(null);
  const audioMenuRef = useRef<HTMLDivElement | null>(null);
  const speedMenuRef = useRef<HTMLDivElement | null>(null);

  // Practice timer (minutes)
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedMinutes((m) => m + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

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
      focusInputAtEnd();
      requestAnimationFrame(() => {
        focusInputAtEnd();
      });
      setTimeout(() => {
        focusInputAtEnd();
      }, 50);
    }
  }, [isChecking, isCompletedOrRevealed, onCheck, focusInputAtEnd]);

  // Keep dictation textarea focused for uninterrupted typing UX (on mount, check completion, sentence change)
  useEffect(() => {
    if (!isCompletedOrRevealed && activeTab === "dictation") {
      focusInputAtEnd();
      const frame = requestAnimationFrame(() => {
        focusInputAtEnd();
      });
      const timer = setTimeout(() => {
        focusInputAtEnd();
      }, 50);
      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      };
    }
  }, [isChecking, isChecked, isCompletedOrRevealed, activeTab, currentIndex, focusInputAtEnd]);

  // Rotate the study tip automatically so the banner remains useful during a
  // longer dictation session. The manual refresh button still advances it on
  // demand.
  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % DICTATION_TIPS.length);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Word lookup from text selection or custom event (matching Speaking mechanism)
  const handleDictionaryLookup = useCallback(() => {
    const selected = window.getSelection()?.toString().trim() ?? "";
    const word = selected
      .replace(/[’‘ʼ]/g, "'")
      .replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, "");

    if (!/^[A-Za-z]+(?:'[A-Za-z]+)?$/.test(word)) {
      toast("Bôi đen một từ tiếng Anh, rồi chọn Tra từ.");
      return;
    }

    setSelectedWordForLookup(word);
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
      audioRef.current.currentTime = 0;
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
  }, [onRetry, onChangeAnswer, focusInputAtEnd]);

  // Skip current question: perform skip and immediately focus textarea so caret is visible
  const handleSkipSentence = useCallback(async () => {
    await onSkip();
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }, [onSkip]);

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

  // Fetch audio blob when question changes
  useEffect(() => {
    // Full transcript mode owns the shared player and advances through the
    // sentence playlist. Do not replace its source when the highlighted row
    // changes.
    if (activeTab === "transcript") return;

    const controller = new AbortController();
    let isMounted = true;
    const resetTimer = window.setTimeout(() => {
      if (!isMounted) return;
      setAudioLoading(true);
      setAudioError(false);
      setIsPlaying(false);
      setCurrentTime(0);
    }, 0);

    quizService
      .getQuestionAudioBlob(
        quiz.id,
        currentQuestion.id,
        controller.signal,
        activeAudioVersion,
      )
      .then((blob) => {
        if (!isMounted) return;
        if (audioBlobUrlRef.current) {
          URL.revokeObjectURL(audioBlobUrlRef.current);
        }
        const url = URL.createObjectURL(blob);
        audioBlobUrlRef.current = url;
        setAudioBlobUrl(url);
        setAudioLoading(false);

        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.playbackRate = playbackRateRef.current;
          audioRef.current.load();
          if (autoplayOnLoadRef.current) {
            autoplayOnLoadRef.current = false;
            void audioRef.current.play().catch(() => setIsPlaying(false));
          }
        }
      })
      .catch((err) => {
        if (!isMounted || err?.name === "AbortError" || err?.name === "CanceledError") return;
        setAudioError(true);
        setAudioLoading(false);
      });

    return () => {
      isMounted = false;
      window.clearTimeout(resetTimer);
      controller.abort();
    };
  }, [activeAudioVersion, activeTab, currentQuestion.id, quiz.id]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [isMuted, volume]);

  // Answers are redacted from the initial quiz payload. Load the complete
  // dictation script only when the learner explicitly opens this tab.
  useEffect(() => {
    if (activeTab !== "transcript") return;
    const controller = new AbortController();
    transcriptAudioRequestRef.current = controller;
    let cancelled = false;
    const loadingFrame = window.setTimeout(() => {
      if (!cancelled) {
        setIsTranscriptLoading(true);
        setTranscriptError(null);
      }
    }, 0);
    Promise.all([
      quizService.getListeningTranscript(quiz.id),
      quizService.getListeningTranscriptAudioBlob(quiz.id, controller.signal),
    ])
      .then(([response, audioBlob]) => {
        if (cancelled) return;
        setFullTranscript(response.items);
        if (audioBlobUrlRef.current) URL.revokeObjectURL(audioBlobUrlRef.current);
        const url = URL.createObjectURL(audioBlob);
        audioBlobUrlRef.current = url;
        setAudioBlobUrl(url);
        setAudioLoading(false);
        setAudioError(false);
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.playbackRate = playbackRateRef.current;
          audioRef.current.load();
        }
      })
      .catch((error) => {
        if (cancelled || error?.name === "AbortError" || error?.name === "CanceledError") return;
        setTranscriptError("Chưa tải được toàn bộ kịch bản. Bạn hãy thử lại.");
        setAudioError(true);
        setAudioLoading(false);
      })
      .finally(() => {
        if (!cancelled) setIsTranscriptLoading(false);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(loadingFrame);
      controller.abort();
      if (transcriptAudioRequestRef.current === controller) {
        transcriptAudioRequestRef.current = null;
      }
    };
  }, [activeTab, quiz.id, transcriptReloadKey]);

  // Cleanup object url on unmount
  useEffect(() => {
    return () => {
      transcriptAudioRequestRef.current?.abort();
      if (audioBlobUrlRef.current) {
        URL.revokeObjectURL(audioBlobUrlRef.current);
        audioBlobUrlRef.current = null;
      }
    };
  }, []);

  // Auto-scroll active sentence in transcript playlist
  useEffect(() => {
    if (activeTab === "transcript" && autoScrollTranscript && activeTranscriptRowRef.current) {
      activeTranscriptRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeTab, autoScrollTranscript, currentIndex]);

  const handleSelectTranscriptSentence = (questionIndex: number) => {
    onSelectIndex(questionIndex);
  };

  const handleTranscriptPrev = () => {
    if (currentIndex > 0) {
      onPrev();
    }
  };

  const handleTranscriptNext = () => {
    if (currentIndex < questions.length - 1) {
      onNext();
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
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [activeTab, audioError, audioLoading, isPlaying]);

  const replayAudio = useCallback(() => {
    if (activeTab === "transcript") {
      if (!audioRef.current) return;
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      void audioRef.current.play().catch(() => setIsPlaying(false));
      return;
    }
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    void audioRef.current.play().catch(() => setIsPlaying(false));
  }, [activeTab]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = Number(e.target.value);
    setCurrentTime(target);
    if (audioRef.current) {
      audioRef.current.currentTime = target;
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

  // Keyboard Shortcuts (Space = Play/Pause, Enter = Check)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isTypingTarget =
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLSelectElement ||
        activeElement?.getAttribute("contenteditable") === "true";

      // Alt+Space remains a local fallback. Ctrl+Space is handled by the
      // shared listening shortcut dispatcher in the parent workspace.
      if (e.altKey && e.code === "Space") {
        e.preventDefault();
        togglePlay();
        return;
      }

      // Modal open guards
      if (showSettings || showShortcutsModal) {
        return;
      }

      // If the question is already completed, correct, or skipped (revealed), Enter advances to the next question
      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.altKey) {
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
            focusInputAtEnd();
          }
          return;
        }
      }

      const playPausePressed =
        playPauseKey === "Space"
          ? e.code === "Space" && !e.ctrlKey && !e.altKey
          : playPauseKey === "`"
            ? e.key === "`" || e.code === "Backquote"
            : playPauseKey === "Enter" && activeTab !== "dictation"
              ? e.key === "Enter"
              : e.key === "`" || e.code === "Backquote";

      // Configured playback shortcuts are intentional controls, so they must
      // still work while the learner is focused in the dictation textarea.
      if (playPausePressed) {
        e.preventDefault();
        togglePlay();
        return;
      }

      const replayPressed =
        !e.repeat &&
        ((replayKey === "Ctrl" && e.key === "Control" && e.ctrlKey) ||
          (replayKey === "Alt" && e.key === "Alt" && e.altKey) ||
          (replayKey === "Shift" && e.key === "Shift" && e.shiftKey));
      if (replayPressed) {
        e.preventDefault();
        replayAudio();
        return;
      }

      // If not in textarea, bare Space toggles playback
      if (!isTypingTarget && e.code === "Space") {
        e.preventDefault();
        togglePlay();
        return;
      }

      // Arrow navigation in transcript mode (bare ArrowLeft / ArrowRight)
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

      // Arrow navigation with Ctrl
      if (e.ctrlKey && e.key === "ArrowRight") {
        e.preventDefault();
        if (currentIndex < questions.length - 1) onNext();
      } else if (e.ctrlKey && e.key === "ArrowLeft") {
        e.preventDefault();
        if (currentIndex > 0) onPrev();
      }
    };

    const handleSharedToggle = () => togglePlay();
    const handleSharedReplay = () => replayAudio();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("breadtrans:toggle-listening-audio", handleSharedToggle);
    window.addEventListener("breadtrans:replay-listening-audio", handleSharedReplay);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("breadtrans:toggle-listening-audio", handleSharedToggle);
      window.removeEventListener("breadtrans:replay-listening-audio", handleSharedReplay);
    };
  }, [
    activeTab,
    isChecking,
    isCompletedOrRevealed,
    isLastQuestion,
    currentIndex,
    questions.length,
    playPauseKey,
    replayKey,
    showSettings,
    showShortcutsModal,
    handlePerformCheck,
    focusInputAtEnd,
    onNext,
    onPrev,
    onFinalSubmit,
    replayAudio,
    togglePlay,
  ]);

  // Click outside listener for popovers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setShowOptionsMenu(false);
      }
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
    if (!showSettings && !showShortcutsModal) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (showSettings) setShowSettings(false);
      else setShowShortcutsModal(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showSettings, showShortcutsModal]);

  const activeTranscriptItem = fullTranscript.find((item) => item.questionId === currentQuestion?.id);
  const translationText =
    (currentCheck as any)?.translation ||
    (currentQuestion?.content as any)?.translation ||
    activeTranscriptItem?.translation ||
    null;
  const vocabLevel = level || quiz.bilingualContent?.skillLabel || "A1";
  const categoryTitle =
    (currentQuestion?.content as any)?.category ||
    (quiz as any).category ||
    quiz.bilingualContent?.skillLabel ||
    "Short Stories";

  const openTranscriptTab = () => {
    setTranscriptError(null);
    setIsTranscriptLoading(true);
    setActiveTab("transcript");
  };

  const retryTranscript = () => {
    setTranscriptError(null);
    setIsTranscriptLoading(true);
    setTranscriptReloadKey((value) => value + 1);
  };

  return (
    <div className="w-full max-w-7xl xl:max-w-[1560px] 2xl:max-w-[1720px] mx-auto flex-1 flex flex-col pt-1 sm:pt-2 pb-8 px-3 sm:px-5 lg:px-6 font-sans antialiased text-slate-800">
      {/* 1. Header / Breadcrumbs & Action Row */}
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        {/* Breadcrumb path */}
        <nav
          aria-label="Thanh điều hướng phân cấp"
          className="flex flex-wrap items-center gap-2 text-slate-500 font-medium"
        >
          <button
            type="button"
            onClick={() => onExit("/practice/listening")}
            className="hover:text-blue-600 transition-colors flex items-center gap-1 font-semibold cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Luyện nghe</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-slate-600">{categoryTitle}</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 font-bold truncate max-w-[180px] sm:max-w-xs">
            {quiz.title}
          </span>
        </nav>

        {/* Keep the header quiet so the learner's attention stays on the audio and answer field. */}
        <div className="flex items-center gap-3">
          {/* Practice Timer */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Clock size={14} className="text-slate-400" aria-hidden="true" />
            <span>{elapsedMinutes} phút</span>
          </div>
        </div>
      </div>

      {/* 2. Title & Meta Row */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Star button */}
          <button
            type="button"
            onClick={() => setIsStarred((s) => !s)}
            title={isStarred ? "Bỏ yêu thích" : "Yêu thích bài học"}
            aria-label="Yêu thích bài học"
            className="text-slate-400 hover:text-amber-500 transition-colors cursor-pointer shrink-0"
          >
            <Star
              size={22}
              className={isStarred ? "fill-amber-400 text-amber-400" : ""}
            />
          </button>

          {/* Title */}
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
            {quiz.title}
          </h1>

          {/* Vocab Level Badge */}
          <span className="shrink-0 rounded-md bg-amber-50 border border-amber-200/80 px-2 py-0.5 text-[11px] font-bold text-amber-800 uppercase tracking-wider">
            Trình độ: {vocabLevel}
          </span>
        </div>

        {/* More Options (...) */}
        <div className="relative shrink-0" ref={optionsRef}>
          <button
            type="button"
            onClick={() => setShowOptionsMenu((o) => !o)}
            title="Tùy chọn khác"
            aria-label="Tùy chọn khác"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <MoreHorizontal size={18} />
          </button>

          {showOptionsMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  setShowOptionsMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                <Share2 size={14} />
                <span>Sao chép liên kết</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowShortcutsModal(true);
                  setShowOptionsMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                <Keyboard size={14} />
                <span>Phím tắt nhanh</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Sub-Tabs Bar: [Dictation] [Full transcript] */}
      <div className="inline-flex max-w-full overflow-x-auto no-scrollbar p-1 bg-stone-100/90 rounded-xl border border-stone-200/80 mb-4 shadow-2xs self-start">
        <button
          type="button"
          onClick={() => setActiveTab("dictation")}
          className={`rounded-lg px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "dictation"
              ? "bg-white text-amber-700 shadow-xs border border-stone-200/60"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          Nghe chép chính tả <span className="hidden sm:inline">(Dictation)</span>
        </button>
        <button
          type="button"
          onClick={openTranscriptTab}
          className={`rounded-lg px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "transcript"
              ? "bg-white text-amber-700 shadow-xs border border-stone-200/60 font-bold"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          Toàn bộ kịch bản <span className="hidden sm:inline">(Full transcript)</span>
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
          setCurrentTime(audio.currentTime);
          if (activeTab === "transcript" && fullTranscript.length > 0) {
            const transcriptIndex = resolveTranscriptIndex(
              audio.currentTime,
              audio.duration,
              fullTranscript,
            );
            const item = fullTranscript[transcriptIndex];
            const questionIndex = item
              ? questions.findIndex((question) => question.id === item.questionId)
              : -1;
            if (questionIndex >= 0 && questionIndex !== currentIndex) {
              onSelectIndex(questionIndex);
            }
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration || 0);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
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
        <div className="w-full rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 lg:p-7 shadow-xs transition-all">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-7 items-start">
            {/* Left Column (lg:col-span-7): Player & Dictation Input */}
            <div className="lg:col-span-7 flex flex-col">
              {/* Sentence Navigator & Settings Row */}
              <div className="mb-3.5 flex items-center justify-between gap-4">
                {/* Left: ← Câu 1 / 21 → */}
                <div className="flex items-center gap-2.5 text-sm font-bold text-slate-700">
                  <button
                    type="button"
                    onClick={onPrev}
                    disabled={currentIndex === 0}
                    title="Câu trước"
                    aria-label="Câu trước"
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                  </button>

                  <span className="font-extrabold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg text-xs">
                    Câu {currentIndex + 1} / {questions.length}
                  </span>

                  <button
                    type="button"
                    onClick={onNext}
                    disabled={currentIndex === questions.length - 1}
                    title="Câu tiếp theo"
                    aria-label="Câu tiếp theo"
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>

                {/* Right: Tra từ & ⚙ Settings */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDictionaryLookup}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    title="Bôi đen một từ tiếng Anh rồi bấm Tra từ"
                  >
                    <BookOpen size={14} className="text-sky-600" />
                    <span className="hidden sm:inline">Tra từ</span>
                  </button>

                  <div className="relative" ref={settingsRef}>
                    <button
                      type="button"
                      onClick={() => setShowSettings((s) => !s)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      title="Cài đặt phát âm thanh"
                      aria-expanded={showSettings}
                    >
                      <Settings size={14} />
                      <span>Cài đặt</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Audio Player (BreadTrans clean light inline player) */}
              <div className="mb-3.5 rounded-xl bg-slate-50 border border-slate-200 p-2.5 sm:p-3 flex flex-wrap items-center gap-2.5 sm:gap-3">
                {/* Play / Pause button */}
                <button
                  type="button"
                  onClick={togglePlay}
                  disabled={audioLoading || audioError}
                  title={isPlaying ? "Tạm dừng" : "Phát câu"}
                  aria-label={isPlaying ? "Tạm dừng" : "Phát câu"}
                  className="flex size-11 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
                >
                  {audioLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : isPlaying ? (
                    <Pause size={17} fill="currentColor" />
                  ) : (
                    <Play size={17} fill="currentColor" className="ml-0.5" />
                  )}
                </button>

                {/* Monospace Timestamp */}
                <span className="font-mono text-xs font-semibold text-slate-500 shrink-0 select-none">
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
                  className="flex-1 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                />

                {/* Volume control: mute toggle + accessible volume slider */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={toggleMute}
                    title={isMuted ? "Bật âm thanh" : "Tắt tiếng"}
                    aria-label={isMuted ? "Bật âm thanh" : "Tắt tiếng"}
                    className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white hover:text-slate-800 cursor-pointer"
                  >
                    {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    aria-label="Âm lượng audio"
                    className="w-16 accent-blue-600 cursor-pointer"
                  />
                </div>

                {/* Speed selector */}
                <div className="relative shrink-0" ref={speedMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowSpeedMenu((value) => !value)}
                    aria-haspopup="listbox"
                    aria-expanded={showSpeedMenu}
                    className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 cursor-pointer"
                    title="Chọn tốc độ phát"
                  >
                    {playbackRate}x <ChevronDown size={14} />
                  </button>
                  {showSpeedMenu && (
                    <div className="absolute right-0 top-full z-50 mt-2 max-h-72 w-44 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl" role="listbox" aria-label="Tốc độ phát">
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
                            playbackRate === rate ? "bg-blue-600 font-bold text-white" : "text-slate-700 hover:bg-slate-100"
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
                    className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-white hover:text-slate-800 cursor-pointer"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  {showAudioMenu && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 text-sm shadow-xl">
                      <button
                        type="button"
                        disabled={!audioBlobUrl}
                        onClick={downloadAudio}
                        className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
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
                        className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-slate-700 hover:bg-slate-100 cursor-pointer"
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
                        className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        <RefreshCw size={15} />
                        <span>Đặt tốc độ chuẩn 1x</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Textarea Input */}
              <div className="relative mb-3.5">
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
                  readOnly={Boolean(isCompletedOrRevealed)}
                  spellCheck={wordSuggestions}
                  className={`w-full resize-none min-h-[92px] sm:min-h-[105px] rounded-xl border-2 p-3.5 sm:p-4 text-base sm:text-lg leading-relaxed placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs font-medium break-words cursor-text ${
                    isCompletedOrRevealed
                      ? "border-emerald-500 bg-emerald-50/15 text-slate-900 font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      : "border-slate-200 bg-white text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  }`}
                />

                {/* Mic Icon for Speech Input & subtle check indicator */}
                {!isCompletedOrRevealed && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                    {isChecking && (
                      <Loader2 size={16} className="animate-spin text-blue-500" aria-label="Đang kiểm tra..." />
                    )}
                    <button
                      type="button"
                      onClick={toggleSpeechRecognition}
                      disabled={isChecking}
                      title={isListeningSpeech ? "Đang lắng nghe..." : "Nhập bằng giọng nói"}
                      aria-label={isListeningSpeech ? "Đang lắng nghe..." : "Nhập bằng giọng nói"}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isListeningSpeech
                          ? "bg-rose-500 text-white animate-pulse"
                          : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {isListeningSpeech ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons Row before checking/skipping */}
              {!isCompletedOrRevealed && !isChecked && (
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => void handlePerformCheck()}
                    disabled={isChecking}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2 text-sm font-bold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    {isChecking && <Loader2 size={15} className="animate-spin" />}
                    <span>Kiểm tra</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSkipSentence}
                    disabled={isChecking}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 cursor-pointer shadow-2xs"
                  >
                    {isChecking ? <Loader2 size={13} className="animate-spin" /> : null}
                    <span>Bỏ qua</span>
                  </button>
                </div>
              )}

              {/* When Completed or Revealed or Skipped: show Next button & replay control */}
              {isCompletedOrRevealed && (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {isRevealed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-lg border bg-blue-50 text-blue-700 border-blue-200">
                        Đã xem đáp án
                      </span>
                    ) : !isSkipped ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-lg border bg-emerald-50 text-emerald-800 border-emerald-200">
                        ✓ Chính xác
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRetryCurrentSentence}
                      title="Làm lại câu này"
                      aria-label="Làm lại câu này"
                      className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200/90 bg-white shadow-2xs"
                    >
                      <RotateCcw size={16} />
                    </button>

                    {isLastQuestion ? (
                      <button
                        type="button"
                        onClick={onFinalSubmit}
                        disabled={isSubmitting}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-2 text-sm font-bold text-white shadow-xs transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            <span>Đang nộp bài...</span>
                          </>
                        ) : (
                          <>
                            <Check size={16} />
                            <span>Hoàn thành bài tập</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onNext}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-2.5 text-sm font-bold text-white shadow-xs transition-colors cursor-pointer"
                      >
                        <span>Câu tiếp theo</span>
                        <ArrowRight size={15} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Check Feedback Panel (Word-by-word diff) when checked and incorrect */}
              {isChecked && !isCompletedOrRevealed && (
                <div
                  className="mt-3.5 pt-3.5 border-t border-slate-100"
                  role="alert"
                  aria-live="polite"
                >
                  {/* Progressive answer review */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 sm:p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        Đối chiếu theo thứ tự nghe
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleSkipSentence}
                          disabled={isChecking}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 cursor-pointer shadow-2xs"
                        >
                          Bỏ qua
                        </button>
                        <button
                          type="button"
                          onClick={onToggleReveal}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                        >
                          {isRevealed ? "Ẩn đáp án" : "Xem đáp án"}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-2.5 gap-y-1.5 text-lg sm:text-xl md:text-2xl font-bold leading-relaxed">
                      {buildProgressiveAnswer(
                        currentCheck?.correctAnswer ?? canonicalAnswer,
                        currentCheck?.submittedAnswer ?? displayedAnswer,
                        isRevealed,
                      ).map((token, index) => (
                        <span
                          key={`${token.text}-${index}`}
                          className={
                            token.state === "hint"
                              ? "rounded-md bg-amber-100 px-2.5 py-0.5 text-amber-950 ring-1 ring-amber-300 font-bold inline-block shadow-2xs"
                              : token.state === "correct"
                                ? "text-emerald-700 font-bold"
                                : token.state === "answer"
                                  ? "text-slate-900 font-bold"
                                  : "text-slate-400 tracking-[0.2em] font-mono"
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
            <div className="lg:col-span-5 flex flex-col gap-3.5 sm:gap-4">
              {isCompletedOrRevealed ? (
                <>
                  {/* Card 1: Vietnamese Translation */}
                  <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-4 sm:p-4.5 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                          Bản dịch {selectedLanguage === "vi" ? "tiếng Việt" : selectedLanguage === "en" ? "tiếng Anh" : "bản địa"}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                          AI Bilingual
                        </span>
                      </div>
                      <p className="text-base sm:text-lg font-bold text-slate-800 leading-relaxed">
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

                    {/* Translation Actions Bar (Translated by ChatGPT4.1 + Edit + More options) */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-200/60 flex items-center justify-between gap-3 text-xs">
                      <span className="text-slate-400 font-medium text-xs select-none">
                        Translated by ChatGPT4.1
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Edit button: user provides improved translation to admin */}
                        <button
                          type="button"
                          onClick={() => {
                            setSuggestedTranslation(translationText || "");
                            setShowEditTranslationModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
                          title="Cung cấp bản dịch cải thiện cho Admin"
                        >
                          <Pencil size={12} className="text-slate-500" />
                          <span>Edit</span>
                        </button>

                        {/* More options: Change language, Add another language */}
                        <div className="relative" ref={translationMenuRef}>
                          <button
                            type="button"
                            onClick={() => setShowTranslationMenu((prev) => !prev)}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
                            title="Tùy chọn ngôn ngữ dịch"
                            aria-expanded={showTranslationMenu}
                          >
                            <MoreHorizontal size={14} />
                          </button>

                          {showTranslationMenu && (
                            <div className="absolute right-0 top-full mt-1.5 z-40 w-44 rounded-xl border border-slate-200 bg-white p-1 text-xs font-semibold text-slate-700 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowTranslationMenu(false);
                                  setShowChangeLanguageModal(true);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
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
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
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

                  {/* Card 2: Pronunciation */}
                  <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-4 sm:p-5 shadow-2xs">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                        Phát âm (Pronunciation)
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        Nhấp vào từ để tra từ điển
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-slate-900 leading-loose">
                      {canonicalAnswer ? (
                        String(canonicalAnswer).split(/\s+/).filter(Boolean).map((word: string, wordIdx: number) => {
                          const cleanWord = word.trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "") || word;
                          return (
                            <button
                              key={`${word}-${wordIdx}`}
                              type="button"
                              className="inline-block border-b border-dotted border-slate-400 pb-0.5 mr-2 text-slate-900 hover:text-blue-600 hover:border-blue-600 hover:bg-blue-50/70 rounded-xs px-1 py-0.5 cursor-pointer transition-all font-bold text-base sm:text-lg"
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
                <div className="flex flex-col justify-center items-center h-full min-h-[220px] rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
                  <div className="size-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
                    <Languages size={18} />
                  </div>
                  <p className="text-sm font-bold text-slate-700">
                    Bản dịch & Giải thích phát âm
                  </p>
                  <p className="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">
                    Sẽ tự động hiển thị sau khi bạn bấm Kiểm tra hoặc Bỏ qua.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 4b. Full Transcript Tab View (BreadTrans Light Theme Two-Column Split Layout) */
        <div className="w-full rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-6 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
            {/* Left Column: Player & Sentence Showcase */}
            <div className="lg:col-span-6 flex flex-col justify-between rounded-xl bg-stone-50/70 border border-stone-200/80 p-4 sm:p-5 min-h-[460px]">
              <div>
                {/* Left Top Bar: Translation Select & Repeat Checkbox */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-1.5 bg-white border border-stone-200/90 rounded-lg px-2.5 py-1 text-xs text-stone-700 shadow-2xs">
                    <Languages size={14} className="text-amber-600 shrink-0" />
                    <select
                      value={selectedTranslationLanguage}
                      onChange={(e) => setSelectedTranslationLanguage(e.target.value as "none" | "vi")}
                      aria-label="Chọn bản dịch"
                      className="bg-transparent text-xs font-semibold text-stone-700 focus:outline-none cursor-pointer pr-1"
                    >
                      <option value="none">Không dịch (No translation)</option>
                      <option value="vi">Tiếng Việt (Vietnamese)</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 select-none cursor-pointer hover:text-stone-900">
                    <input
                      type="checkbox"
                      checked={repeatTranscript}
                      onChange={(e) => setRepeatTranscript(e.target.checked)}
                      className="size-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                    />
                    <span>Lặp lại (Repeat)</span>
                  </label>
                </div>

                {/* Inline Custom Audio Player */}
                <div className="rounded-xl bg-white border border-stone-200/90 p-3 sm:p-3.5 shadow-2xs flex flex-wrap items-center gap-2.5 sm:gap-3">
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
                  <span className="font-mono text-xs font-semibold text-stone-500 shrink-0 select-none tabular-nums">
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
                    className="flex-1 min-w-[70px] h-1.5 bg-stone-200 rounded-full appearance-none cursor-pointer accent-amber-500 focus:outline-none"
                  />

                  {/* Volume control */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={toggleMute}
                      title={isMuted ? "Bật âm thanh" : "Tắt tiếng"}
                      aria-label={isMuted ? "Bật âm thanh" : "Tắt tiếng"}
                      className="rounded-lg p-1 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 cursor-pointer"
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
                      className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-xs font-bold text-stone-700 shadow-2xs transition-colors hover:bg-stone-100 cursor-pointer"
                      title="Chọn tốc độ phát"
                    >
                      {playbackRate}x <ChevronDown size={12} />
                    </button>
                    {showTranscriptSpeedMenu && (
                      <div className="absolute right-0 top-full z-50 mt-1 max-h-56 w-36 overflow-y-auto rounded-xl border border-stone-200 bg-white p-1 shadow-xl" role="listbox" aria-label="Tốc độ phát">
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
                              playbackRate === rate ? "bg-amber-500 font-bold text-white" : "text-stone-700 hover:bg-stone-100"
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

              {/* Sentence Focus Showcase (Center Area) */}
              <div className="my-auto py-8 px-4 flex flex-col items-center justify-center text-center">
                {(() => {
                  const activeTranscriptItem = fullTranscript.find((item) => item.questionId === currentQuestion?.id);
                  const activeSentenceText =
                    activeTranscriptItem?.transcript ||
                    (currentQuestion?.content as any)?.correctAnswer ||
                    (currentQuestion?.content as any)?.audioText ||
                    (currentQuestion?.content as any)?.text ||
                    "";
                  const activeSentenceTranslation =
                    activeTranscriptItem?.translation ||
                    (currentQuestion?.content as any)?.translation ||
                    null;

                  return (
                    <>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-stone-900 tracking-tight leading-relaxed max-w-lg">
                        {activeSentenceText || (
                          <span className="text-stone-400 font-normal italic">
                            (Đang tải nội dung câu...)
                          </span>
                        )}
                      </p>
                      {selectedTranslationLanguage === "vi" && (
                        <p className="mt-3 text-sm sm:text-base font-medium text-amber-800/90 max-w-lg leading-relaxed animate-in fade-in duration-200">
                          {activeSentenceTranslation || (
                            <span className="text-stone-400 italic font-normal">
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
              <div className="flex items-center justify-center gap-3 pt-3 border-t border-stone-200/80">
                <button
                  type="button"
                  onClick={handleTranscriptPrev}
                  disabled={currentIndex === 0}
                  title="Câu trước (ArrowLeft)"
                  aria-label="Câu trước"
                  className="p-2 text-stone-500 hover:text-stone-900 hover:bg-white rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer shadow-2xs border border-stone-200/60"
                >
                  <ChevronLeft size={18} />
                </button>

                <span className="font-mono text-xs sm:text-sm font-bold text-stone-700 bg-white px-3.5 py-1.5 rounded-lg border border-stone-200/80 shadow-2xs select-none">
                  {currentIndex + 1} / {questions.length}
                </span>

                <button
                  type="button"
                  onClick={handleTranscriptNext}
                  disabled={currentIndex === questions.length - 1}
                  title="Câu tiếp theo (ArrowRight)"
                  aria-label="Câu tiếp theo"
                  className="p-2 text-stone-500 hover:text-stone-900 hover:bg-white rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer shadow-2xs border border-stone-200/60"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Right Column: Scrollable Playlist of Sentences */}
            <div className="lg:col-span-6 flex flex-col justify-between rounded-xl bg-stone-50/40 border border-stone-200/80 p-3 sm:p-4 min-h-[460px]">
              {(() => {
                const displayTranscriptItems =
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
                        translation: (q.content as any)?.translation || null,
                      }));

                if (isTranscriptLoading && fullTranscript.length === 0) {
                  return (
                    <div className="space-y-2 p-2" aria-live="polite" aria-label="Đang tải kịch bản">
                      {questions.slice(0, Math.min(6, questions.length)).map((question) => (
                        <div key={question.id} className="h-12 animate-pulse rounded-xl bg-stone-100" />
                      ))}
                    </div>
                  );
                }

                if (transcriptError && fullTranscript.length === 0) {
                  return (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
                      <p>{transcriptError}</p>
                      <button
                        type="button"
                        onClick={retryTranscript}
                        className="mt-2.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer"
                      >
                        Thử lại
                      </button>
                    </div>
                  );
                }

                if (displayTranscriptItems.length === 0) {
                  return (
                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-5 text-sm text-stone-600 text-center">
                      Bài này chưa có dữ liệu kịch bản để hiển thị.
                    </div>
                  );
                }

                return (
                  <div
                    ref={transcriptListRef}
                    className="h-[360px] sm:h-[400px] overflow-y-auto space-y-1.5 pr-1.5 custom-scrollbar"
                    role="list"
                    aria-label="Danh sách câu kịch bản"
                  >
                    {displayTranscriptItems.map((item, idx) => {
                      const questionIndex = questions.findIndex((q) => q.id === item.questionId);
                      const resolvedIndex = questionIndex >= 0 ? questionIndex : idx;
                      const isCurrent = resolvedIndex === currentIndex;

                      return (
                        <button
                          key={item.questionId || idx}
                          type="button"
                          ref={isCurrent ? activeTranscriptRowRef : null}
                          onClick={() => handleSelectTranscriptSentence(resolvedIndex)}
                          className={`group w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer border ${
                            isCurrent
                              ? "bg-amber-50/90 border-amber-300 text-amber-950 shadow-2xs"
                              : "bg-white hover:bg-stone-50/90 border-stone-200/60 text-stone-700"
                          }`}
                        >
                          {/* The full script uses one continuous audio track; rows select the highlighted line. */}
                          <span
                            className={`size-7 sm:size-8 rounded-full flex items-center justify-center shrink-0 transition-colors mt-0.5 ${
                              isCurrent
                                ? "bg-amber-500 text-white shadow-xs"
                                : "bg-stone-100 text-stone-500 group-hover:bg-amber-100 group-hover:text-amber-700"
                            }`}
                            aria-hidden="true"
                          >
                            {idx + 1}
                          </span>

                          {/* Text content */}
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm leading-relaxed ${isCurrent ? "font-bold text-amber-950" : "font-medium text-stone-800 group-hover:text-stone-900"}`}>
                              {item.speaker && (
                                <span className="mr-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                                  {item.speaker}:
                                </span>
                              )}
                              {item.transcript}
                            </p>
                            {selectedTranslationLanguage === "vi" && item.translation && (
                              <p className="mt-1 text-xs text-amber-800/85 font-normal leading-relaxed line-clamp-2">
                                {item.translation}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Right Column Bottom Bar */}
              <div className="pt-3 border-t border-stone-200/70 flex flex-col gap-2">
                <div className="flex items-center justify-end">
                  <label className="flex items-center gap-2 text-xs font-semibold text-stone-600 select-none cursor-pointer hover:text-stone-900">
                    <input
                      type="checkbox"
                      checked={autoScrollTranscript}
                      onChange={(e) => setAutoScrollTranscript(e.target.checked)}
                      className="size-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                    />
                    <span>Tự động cuộn (Auto scroll)</span>
                  </label>
                </div>
                <div className="text-[11px] text-stone-400 font-medium space-y-0.5 select-none">
                  <p>
                    Nhấn <kbd className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 font-mono text-stone-600 text-[10px]">Space</kbd> để Phát / Dừng
                  </p>
                  <p>
                    Nhấn <kbd className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 font-mono text-stone-600 text-[10px]">←</kbd> và <kbd className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 font-mono text-stone-600 text-[10px]">→</kbd> để chuyển giữa các câu
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Motivational Tip Banner below Workspace (compact pill hugging content) */}
      <aside
        aria-label="Lời khuyên luyện nghe"
        className="mt-4 inline-flex max-w-2xl flex-wrap items-center gap-2 self-start rounded-lg border border-amber-200/80 bg-amber-50/70 px-3.5 py-1.5 text-sm font-medium text-amber-900 shadow-2xs"
      >
        <Lightbulb size={14} className="shrink-0 text-amber-600" aria-hidden="true" />
        <span className="leading-relaxed">
          {DICTATION_TIPS[tipIndex]}
        </span>
        <button
          type="button"
          onClick={handleRotateTip}
          title="Xem lời khuyên khác"
          aria-label="Xem lời khuyên khác"
          className="ml-0.5 shrink-0 rounded p-1 text-amber-700/80 transition-colors hover:bg-amber-100 hover:text-amber-950 cursor-pointer"
        >
          <RefreshCw size={12} />
        </button>
      </aside>

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
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 id="dictation-settings-title" className="flex items-center gap-2 text-lg font-black text-slate-900">
                <Settings size={19} className="text-blue-600" />
                Cài đặt nghe chép
              </h2>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                aria-label="Đóng cài đặt"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="divide-y divide-slate-100 px-5 py-2 text-sm">
              <label className="flex min-h-14 items-center justify-between gap-4">
                <span className="font-bold text-slate-800">Phím phát lại (Replay Key)</span>
                <select value={replayKey} onChange={(event) => setReplayKey(event.target.value)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-slate-700">
                  <option>Ctrl</option><option>Alt</option><option>Shift</option>
                </select>
              </label>
              <label className="flex min-h-14 items-center justify-between gap-4">
                <span className="font-bold text-slate-800">Phím phát / dừng</span>
                <select value={playPauseKey} onChange={(event) => setPlayPauseKey(event.target.value)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-slate-700">
                  <option>`</option><option>Space</option><option>Enter</option>
                </select>
              </label>
              <label className="flex min-h-14 items-center justify-between gap-4">
                <span className="font-bold text-slate-800">Tự động phát lại</span>
                <input type="checkbox" checked={autoReplay} onChange={(event) => setAutoReplay(event.target.checked)} className="size-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              </label>
              <label className="flex min-h-14 items-center justify-between gap-4">
                <span className="font-bold text-slate-800">Thời gian giữa các lần phát</span>
                <select value={replayDelay} onChange={(event) => setReplayDelay(event.target.value)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-slate-700">
                  <option value="0.25">0.25 giây</option><option value="0.5">0.5 giây</option><option value="1">1 giây</option><option value="2">2 giây</option>
                </select>
              </label>
              <label className="flex min-h-14 items-center justify-between gap-4">
                <span className="font-bold text-slate-800">Gợi ý từ (thiết bị di động)</span>
                <input type="checkbox" checked={wordSuggestions} onChange={(event) => setWordSuggestions(event.target.checked)} className="size-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              </label>
              <label className="flex min-h-14 items-center justify-between gap-4">
                <span className="font-bold text-slate-800">Hiện hướng dẫn phím tắt</span>
                <input type="checkbox" checked={showShortcutTips} onChange={(event) => setShowShortcutTips(event.target.checked)} className="size-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              </label>
              {onChangeAccent && (
                <div className="flex min-h-14 items-center justify-between gap-4">
                  <span className="font-bold text-slate-800">Giọng đọc</span>
                  <select value={accent} onChange={(event) => onChangeAccent(event.target.value)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-slate-700">
                    <option>US</option><option>UK</option><option>AU</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-4">
              <button type="button" onClick={() => setShowSettings(false)} className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 cursor-pointer">
                Xong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl text-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Keyboard size={17} className="text-blue-600" />
                Phím tắt nhanh
              </h3>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Phát / Dừng audio:</span>
                <kbd className="rounded-md bg-slate-100 border border-slate-200 px-2 py-1 font-mono text-slate-800 font-bold">{playPauseKey === "Space" ? "Space" : playPauseKey}</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Phát lại câu:</span>
                <kbd className="rounded-md bg-slate-100 border border-slate-200 px-2 py-1 font-mono text-slate-800 font-bold">{replayKey}</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Kiểm tra kết quả:</span>
                <kbd className="rounded-md bg-slate-100 border border-slate-200 px-2 py-1 font-mono text-slate-800 font-bold">Enter</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Câu tiếp theo:</span>
                <kbd className="rounded-md bg-slate-100 border border-slate-200 px-2 py-1 font-mono text-slate-800 font-bold">Ctrl + →</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Câu trước:</span>
                <kbd className="rounded-md bg-slate-100 border border-slate-200 px-2 py-1 font-mono text-slate-800 font-bold">Ctrl + ←</kbd>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 text-xs font-bold cursor-pointer"
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
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Pencil size={16} className="text-blue-600" />
                  Đề xuất bản dịch cải thiện
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bản dịch của bạn sẽ được gửi tới Admin để kiểm duyệt và nâng cấp bài học.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditTranslationModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="font-bold text-slate-700 block mb-1">Câu tiếng Anh gốc:</span>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 leading-relaxed">
                  {canonicalAnswer || "(Không có câu gốc)"}
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Bản dịch hiện tại:</span>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600 leading-relaxed">
                  {translationText || "(Chưa có bản dịch)"}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Bản dịch đề xuất của bạn <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  value={suggestedTranslation}
                  onChange={(e) => setSuggestedTranslation(e.target.value)}
                  placeholder="Nhập bản dịch tiếng Việt chuẩn xác hơn theo ý bạn..."
                  rows={3}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white p-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Ghi chú thêm (tùy chọn):
                </label>
                <input
                  type="text"
                  value={suggestionNote}
                  onChange={(e) => setSuggestionNote(e.target.value)}
                  placeholder="Ví dụ: Dịch tự nhiên hơn theo ngữ cảnh giao tiếp hàng ngày..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEditTranslationModal(false)}
                disabled={isSubmittingSuggestion}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmitTranslationSuggestion}
                disabled={isSubmittingSuggestion || !suggestedTranslation.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmittingSuggestion ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
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
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Globe size={16} className="text-blue-600" />
                Change language
              </h3>
              <button
                type="button"
                onClick={() => setShowChangeLanguageModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Chọn ngôn ngữ hiển thị bản dịch cho câu này:
            </p>

            <div className="space-y-1.5 text-xs">
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
                  className={`flex w-full items-center justify-between p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    selectedLanguage === item.code
                      ? "border-blue-600 bg-blue-50/70 text-blue-900 font-bold"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
                  }`}
                >
                  <span>{item.label}</span>
                  {selectedLanguage === item.code && <Check size={14} className="text-blue-600" />}
                </button>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowChangeLanguageModal(false)}
                className="rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
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
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Plus size={16} className="text-blue-600" />
                  Add another language
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đóng góp bản dịch ngôn ngữ mới cho câu này tới Admin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddLanguageModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="font-bold text-slate-700 block mb-1">Câu tiếng Anh gốc:</span>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 leading-relaxed">
                  {canonicalAnswer || "(Không có câu gốc)"}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Tên ngôn ngữ <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  value={addLangName}
                  onChange={(e) => setAddLangName(e.target.value)}
                  placeholder="Ví dụ: Japanese, Korean, French, German..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Bản dịch tương ứng <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  value={addLangTranslation}
                  onChange={(e) => setAddLangTranslation(e.target.value)}
                  placeholder="Nhập bản dịch bằng ngôn ngữ trên..."
                  rows={3}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white p-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddLanguageModal(false)}
                disabled={isSubmittingAddLang}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmitAddLanguage}
                disabled={isSubmittingAddLang || !addLangName.trim() || !addLangTranslation.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmittingAddLang ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
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
    </div>
  );
}
