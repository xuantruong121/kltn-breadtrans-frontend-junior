"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Keyboard,
  Languages,
  Lightbulb,
  Loader2,
  Mic,
  MicOff,
  MoreHorizontal,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Settings,
  Share2,
  Star,
  StickyNote,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  type CheckPracticeQuestionResult,
  type ListeningTranscriptItem,
  type Question,
  type Quiz,
  quizService,
} from "@/lib/api/services/quiz.service";
import {
  type DictationDiffToken,
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
  onCheck: () => Promise<void>;
  isChecking: boolean;
  isChecked: boolean;
  currentCheck?: CheckPracticeQuestionResult;
  dictationDiff: DictationDiffToken[];
  dictationMetrics: Record<number, DictationAttemptMetrics>;
  isRevealed: boolean;
  onToggleReveal: () => void;
  showAnswerImmediately: boolean;
  onToggleShowAnswerImmediately: () => void;
  onSkip: () => void;
  onNext: () => void;
  onPrev: () => void;
  onFinalSubmit: () => void;
  isSubmitting: boolean;
  submitError: string | null;
  reviewOnly?: boolean;
  onExit: (href?: string) => void;
  notes: string;
  onSaveNotes: (notes: string) => void;
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

function normalizeDictationToken(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[’‘ʼ]/g, "'")
    .replace(/[^\p{L}\p{N}']/gu, "");
}

function maskWord(value: string): string {
  return value.replace(/\S/g, "*");
}

function buildProgressiveAnswer(
  expected: string,
  submitted: string,
  showAnswerImmediately: boolean,
  showFullAnswer: boolean,
): Array<{ text: string; state: "correct" | "wrong" | "hint" | "masked" | "answer" }> {
  const expectedWords = expected.trim().split(/\s+/).filter(Boolean);
  const submittedWords = submitted.trim().split(/\s+/).filter(Boolean);
  const hintIndex = Math.min(submittedWords.length, Math.max(expectedWords.length - 1, 0));
  const result = expectedWords.map((expectedWord, index) => {
    const typedWord = submittedWords[index];
    if (typedWord) {
      return {
        text: typedWord,
        state: normalizeDictationToken(typedWord) === normalizeDictationToken(expectedWord) ? "correct" as const : "wrong" as const,
      };
    }
    if (showFullAnswer) return { text: expectedWord, state: "answer" as const };
    if (showAnswerImmediately && index === hintIndex) return { text: expectedWord, state: "hint" as const };
    return { text: maskWord(expectedWord), state: "masked" as const };
  });

  if (submittedWords.length > expectedWords.length) {
    result.push(
      ...submittedWords.slice(expectedWords.length).map((word) => ({
        text: word,
        state: "wrong" as const,
      })),
    );
  }
  return result;
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
  currentCheck,
  dictationDiff,
  isRevealed,
  onToggleReveal,
  showAnswerImmediately,
  onToggleShowAnswerImmediately,
  onSkip,
  onNext,
  onPrev,
  onFinalSubmit,
  isSubmitting,
  onExit,
  notes,
  onSaveNotes,
  accent = "US",
  onChangeAccent,
  level,
}: DailyDictationWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<"dictation" | "transcript">("dictation");
  const [isStarred, setIsStarred] = useState(false);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

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
  const transcriptAudioCacheRef = useRef<Map<number, string>>(new Map());
  const transcriptAudioRequestRef = useRef<AbortController | null>(null);
  const transcriptPlaybackIndexRef = useRef(-1);
  const transcriptLoadedIndexRef = useRef(-1);
  const transcriptPlaybackRef = useRef(false);
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

  // Rotate the study tip automatically so the banner remains useful during a
  // longer dictation session. The manual refresh button still advances it on
  // demand.
  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % DICTATION_TIPS.length);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

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
    let cancelled = false;
    quizService
      .getListeningTranscript(quiz.id)
      .then((response) => {
        if (cancelled) return;
        setFullTranscript(response.items);
      })
      .catch(() => {
        if (!cancelled) {
          setTranscriptError("Chưa tải được toàn bộ kịch bản. Bạn hãy thử lại.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsTranscriptLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, quiz.id, transcriptReloadKey]);

  const loadTranscriptAudio = useCallback(async (questionIndex: number) => {
    const question = questions[questionIndex];
    if (!question) throw new Error("Không tìm thấy câu trong kịch bản");

    const cachedUrl = transcriptAudioCacheRef.current.get(question.id);
    if (cachedUrl) return cachedUrl;

    transcriptAudioRequestRef.current?.abort();
    const controller = new AbortController();
    transcriptAudioRequestRef.current = controller;
    setAudioLoading(true);
    setAudioError(false);

    try {
      const blob = await quizService.getQuestionAudioBlob(
        quiz.id,
        question.id,
        controller.signal,
        question.audioAssets?.find((asset) => asset.isActive)?.version,
      );
      const url = URL.createObjectURL(blob);
      transcriptAudioCacheRef.current.set(question.id, url);
      return url;
    } finally {
      if (transcriptAudioRequestRef.current === controller) {
        transcriptAudioRequestRef.current = null;
      }
    }
  }, [questions, quiz.id]);

  const playTranscriptSentence = useCallback(async (questionIndex: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      const url = await loadTranscriptAudio(questionIndex);
      audio.src = url;
      audio.playbackRate = playbackRateRef.current;
      audio.currentTime = 0;
      audio.load();
      transcriptLoadedIndexRef.current = questionIndex;
      setCurrentTime(0);
      setDuration(0);
      await audio.play();
      setAudioLoading(false);
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") return;
      setAudioLoading(false);
      setAudioError(true);
      setIsPlaying(false);
    }
  }, [loadTranscriptAudio]);

  // Cleanup object url on unmount
  useEffect(() => {
    const transcriptAudioCache = transcriptAudioCacheRef.current;
    return () => {
      transcriptAudioRequestRef.current?.abort();
      for (const url of transcriptAudioCache.values()) {
        URL.revokeObjectURL(url);
      }
      transcriptAudioCache.clear();
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

  useEffect(() => {
    if (activeTab !== "transcript") {
      transcriptPlaybackRef.current = false;
      transcriptPlaybackIndexRef.current = -1;
      transcriptLoadedIndexRef.current = -1;
    }
  }, [activeTab]);

  const handleSelectTranscriptSentence = (questionIndex: number) => {
    onSelectIndex(questionIndex);
    // Selecting a row changes the highlighted sentence. If playback is
    // paused, start from that sentence; active full-script playback continues
    // uninterrupted and advances automatically on each ended event.
    if (!isPlaying) {
      transcriptPlaybackRef.current = true;
      transcriptPlaybackIndexRef.current = questionIndex;
      void playTranscriptSentence(questionIndex);
    }
  };

  const handleTranscriptPrev = () => {
    if (currentIndex > 0) {
      const nextIndex = currentIndex - 1;
      onPrev();
      if (!isPlaying) transcriptPlaybackIndexRef.current = nextIndex;
    }
  };

  const handleTranscriptNext = () => {
    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1;
      onNext();
      if (!isPlaying) transcriptPlaybackIndexRef.current = nextIndex;
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
      transcriptPlaybackRef.current = true;
      if (transcriptPlaybackIndexRef.current < 0) {
        transcriptPlaybackIndexRef.current = currentIndex;
      }
      if (
        transcriptLoadedIndexRef.current !== transcriptPlaybackIndexRef.current ||
        !audioRef.current.src ||
        audioRef.current.ended
      ) {
        void playTranscriptSentence(transcriptPlaybackIndexRef.current);
      } else {
        void audioRef.current.play().catch(() => setIsPlaying(false));
      }
      return;
    }

    if (!audioRef.current || audioLoading || audioError) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [activeTab, audioError, audioLoading, currentIndex, isPlaying, playTranscriptSentence]);

  const replayAudio = useCallback(() => {
    if (activeTab === "transcript") {
      transcriptPlaybackRef.current = true;
      transcriptPlaybackIndexRef.current = 0;
      onSelectIndex(0);
      void playTranscriptSentence(0);
      return;
    }
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    void audioRef.current.play().catch(() => setIsPlaying(false));
  }, [activeTab, onSelectIndex, playTranscriptSentence]);

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

      const playPausePressed =
        playPauseKey === "Space"
          ? e.code === "Space" && !e.ctrlKey && !e.altKey
          : playPauseKey === "Enter"
            ? e.key === "Enter"
            : e.key === "`" || e.code === "Backquote";
      const checkPressed = activeElement === textareaRef.current && e.key === "Enter" && !e.shiftKey;

      // Enter in the answer box is reserved for checking. This avoids an
      // ambiguous configuration when Enter is also selected as play/pause.
      if (checkPressed) {
        e.preventDefault();
        if (!isChecking) {
          void onCheck();
        }
        return;
      }

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
  }, [activeTab, isChecking, currentIndex, questions.length, playPauseKey, replayKey, onCheck, onNext, onPrev, replayAudio, togglePlay]);

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
    if (!showSettings && !showNotesModal && !showShortcutsModal) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (showSettings) setShowSettings(false);
      else if (showNotesModal) setShowNotesModal(false);
      else setShowShortcutsModal(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showSettings, showNotesModal, showShortcutsModal]);

  const isLastQuestion = currentIndex === questions.length - 1;
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
    <div className="w-full max-w-5xl mx-auto py-5 sm:py-7 px-4 sm:px-6 flex flex-col justify-start font-sans antialiased text-slate-800">
      {/* 1. Header / Breadcrumbs & Action Row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        {/* Breadcrumb path */}
        <nav
          aria-label="Thanh điều hướng phân cấp"
          className="flex flex-wrap items-center gap-2 text-slate-500 font-medium"
        >
          <Link
            href="/practice/listening"
            className="hover:text-blue-600 transition-colors flex items-center gap-1 font-semibold"
          >
            <ArrowLeft size={14} />
            <span>Luyện nghe</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-600">{categoryTitle}</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 font-bold truncate max-w-[180px] sm:max-w-xs">
            {quiz.title}
          </span>
        </nav>

        {/* Right Action Utilities */}
        <div className="flex items-center gap-3">
          {/* Practice Timer */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Clock size={14} className="text-slate-400" aria-hidden="true" />
            <span>{elapsedMinutes} phút</span>
          </div>

          {/* Notes Toggle */}
          <button
            type="button"
            onClick={() => setShowNotesModal(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <StickyNote size={13} className="text-amber-500" />
            <span>Ghi chú</span>
          </button>

          {/* Exit / Close button */}
          <button
            type="button"
            onClick={() => onExit?.("/practice/listening")}
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg hover:bg-rose-100/70 transition-colors cursor-pointer"
            title="Thoát bài luyện"
            aria-label="Thoát bài luyện"
          >
            <X size={13} />
            <span>Thoát</span>
          </button>
        </div>
      </div>

      {/* 2. Title & Meta Row */}
      <div className="mb-5 flex items-center justify-between gap-3">
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
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight truncate">
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
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration || 0);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
          if (activeTab === "transcript" && transcriptPlaybackRef.current) {
            const nextIndex = transcriptPlaybackIndexRef.current + 1;
            if (nextIndex < questions.length) {
              transcriptPlaybackIndexRef.current = nextIndex;
              onSelectIndex(nextIndex);
              void playTranscriptSentence(nextIndex);
            } else if (repeatTranscript && questions.length > 0) {
              transcriptPlaybackIndexRef.current = 0;
              onSelectIndex(0);
              void playTranscriptSentence(0);
            } else {
              transcriptPlaybackRef.current = false;
              transcriptPlaybackIndexRef.current = -1;
            }
            return;
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
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs transition-all">
          {/* Sentence Navigator & Settings Row */}
          <div className="mb-5 flex items-center justify-between gap-4">
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

            {/* Right: ⚙ Settings */}
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

          {/* Audio Player (BreadTrans clean light inline player) */}
          <div className="mb-6 rounded-2xl bg-slate-50 border border-slate-200 p-4 sm:p-5 flex flex-wrap items-center gap-3 sm:gap-4">
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
              className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600 focus:outline-none"
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
                className="w-20 accent-blue-600 cursor-pointer"
              />
            </div>

            {/* DailyDictation-style speed selector */}
            <div className="relative shrink-0" ref={speedMenuRef}>
              <button
                type="button"
                onClick={() => setShowSpeedMenu((value) => !value)}
                aria-haspopup="listbox"
                aria-expanded={showSpeedMenu}
                className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 cursor-pointer"
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
          <div className="relative mb-5">
            <textarea
              ref={textareaRef}
              value={selectedAnswer}
              onChange={(e) => onChangeAnswer(e.target.value)}
              placeholder="Nhập những gì bạn nghe được (Type what you hear)..."
              rows={4}
              autoFocus
              spellCheck={wordSuggestions}
              className="w-full resize-y rounded-xl border-2 border-slate-200 bg-white p-5 pr-12 text-lg leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all shadow-2xs font-medium"
            />

            {/* Mic Icon for Speech Input */}
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              title={isListeningSpeech ? "Đang lắng nghe..." : "Nhập bằng giọng nói"}
              aria-label={isListeningSpeech ? "Đang lắng nghe..." : "Nhập bằng giọng nói"}
              className={`absolute bottom-3.5 right-3.5 p-2 rounded-lg transition-colors cursor-pointer ${
                isListeningSpeech
                  ? "bg-rose-500 text-white animate-pulse"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              }`}
            >
              {isListeningSpeech ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          </div>
          {showShortcutTips && (
            <p className="-mt-3 mb-4 text-xs text-slate-500">
               {playPauseKey === "Space" ? "Space" : playPauseKey} để phát / dừng · {replayKey} để phát lại câu · Enter để kiểm tra
            </p>
          )}

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Check Button */}
            <button
              type="button"
              onClick={() => void onCheck()}
              disabled={isChecking}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-2.5 text-sm font-bold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {isChecking && <Loader2 size={15} className="animate-spin" />}
              <span>{isChecked ? "Kiểm tra lại" : "Kiểm tra"}</span>
            </button>

            {/* Skip Button */}
            <button
              type="button"
              onClick={onSkip}
              disabled={isChecking}
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              Bỏ qua
            </button>

            {/* Final Submit Button if on last question and checked */}
            {isChecked && isLastQuestion && (
              <button
                type="button"
                onClick={onFinalSubmit}
                disabled={isSubmitting}
                className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-xs transition-all hover:bg-emerald-700 active:scale-98 cursor-pointer disabled:opacity-50"
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
            )}

            {/* Next Sentence CTA if checked and not last */}
            {isChecked && !isLastQuestion && (
              <button
                type="button"
                onClick={onNext}
                className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-sm font-bold text-white shadow-xs transition-colors cursor-pointer"
              >
                <span>Câu tiếp theo</span>
                <ArrowRight size={15} />
              </button>
            )}
          </div>

          {/* Check Feedback Panel (Word-by-word diff) */}
          {isChecked && (
            <div className="mt-5 pt-5 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border ${
                      currentCheck?.isCorrect
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {currentCheck?.isCorrect ? "✓ Chính xác" : "✗ Chưa chính xác"}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Độ chính xác: {Math.round(currentCheck?.wordAccuracy ?? (currentCheck?.isCorrect ? 100 : 0))}%
                  </span>
                </div>

              </div>

              {/* Progressive answer review: preserve left-to-right input and mask words not reached. */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Đối chiếu theo thứ tự nghe
                </p>
                <div className="flex flex-wrap gap-x-2 gap-y-1 text-base font-semibold leading-relaxed">
                  {buildProgressiveAnswer(
                    currentCheck?.correctAnswer ?? "",
                    selectedAnswer,
                    showAnswerImmediately,
                    isRevealed,
                  ).map((token, index) => (
                    <span
                      key={`${token.text}-${index}`}
                      className={
                        token.state === "wrong"
                          ? "rounded-md bg-rose-100 px-1.5 text-rose-800 ring-1 ring-rose-200"
                          : token.state === "correct"
                            ? "text-emerald-700"
                            : token.state === "hint"
                              ? "rounded-md bg-amber-100 px-1.5 text-amber-900 ring-1 ring-amber-200"
                              : token.state === "answer"
                                ? "text-slate-900"
                                : "text-slate-400 tracking-[0.18em]"
                      }
                    >
                      {token.text}
                    </span>
                  ))}
                </div>
                {dictationDiff.some((token) => token.kind !== "same") && (
                  <p className="mt-2 text-xs text-slate-500">
                    Từ màu đỏ là phần bạn nhập chưa khớp; các dấu * là phần chưa được chạm tới.
                  </p>
                )}
              </div>

              <div className="space-y-1 border-t border-slate-200 pt-3">
                <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={showAnswerImmediately}
                    onChange={onToggleShowAnswerImmediately}
                    className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Show answer immediately
                </label>
                <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isRevealed}
                    onChange={onToggleReveal}
                    className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Show full answer
                </label>
              </div>

              {/* Correct Answer text if revealed */}
              {isRevealed && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-sm text-blue-900">
                  <span className="text-xs font-bold text-blue-700 block mb-1">Đáp án đúng:</span>
                  <p className="font-semibold">{currentCheck?.correctAnswer}</p>
                </div>
              )}
            </div>
          )}
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
                      const itemIsPlaying = isCurrent && isPlaying;

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
                          {/* Circular Play button */}
                          <span
                            className={`size-7 sm:size-8 rounded-full flex items-center justify-center shrink-0 transition-colors mt-0.5 ${
                              isCurrent
                                ? "bg-amber-500 text-white shadow-xs"
                                : "bg-stone-100 text-stone-500 group-hover:bg-amber-100 group-hover:text-amber-700"
                            }`}
                            aria-hidden="true"
                          >
                            {itemIsPlaying ? (
                              <Pause size={13} fill="currentColor" />
                            ) : (
                              <Play size={13} fill="currentColor" className="ml-0.5" />
                            )}
                          </span>

                          {/* Text content */}
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm leading-relaxed ${isCurrent ? "font-bold text-amber-950" : "font-medium text-stone-800 group-hover:text-stone-900"}`}>
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

      {/* 5. Motivational Tip Banner below Workspace */}
      <aside
        aria-label="Lời khuyên luyện nghe"
        className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-amber-50/70 px-5 py-3.5 text-xs text-amber-900 shadow-2xs font-medium"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Lightbulb size={16} className="text-amber-600 shrink-0" aria-hidden="true" />
          <p className="truncate sm:whitespace-normal">
            {DICTATION_TIPS[tipIndex]}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRotateTip}
          title="Xem lời khuyên khác"
          aria-label="Xem lời khuyên khác"
          className="shrink-0 p-1 text-amber-700 hover:text-amber-900 transition-colors cursor-pointer"
        >
          <RefreshCw size={13} />
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

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl text-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <StickyNote size={17} className="text-amber-500" />
                Ghi chú bài học
              </h3>
              <button
                type="button"
                onClick={() => setShowNotesModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => onSaveNotes(e.target.value)}
              placeholder="Ghi lại từ mới, cấu trúc nghe được..."
              rows={6}
              className="w-full rounded-xl border-2 border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none"
            />
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowNotesModal(false)}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-xs font-bold shadow-xs cursor-pointer"
              >
                Lưu & Đóng
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
    </div>
  );
}
