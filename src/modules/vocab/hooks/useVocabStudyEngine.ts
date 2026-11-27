"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";
import {
  ReviewEvidence,
  SpeakingResult,
  SrsGrade,
  VocabWord,
  vocabService,
} from "@/lib/api/services/vocab.service";
import { QueueItem, StudyMode, QuizOption, StudySettings } from "../types/study";
import { playWordAudio, playChime, stopCurrentAudio } from "../utils/audio";
import { buildQuizOptions } from "../utils/quizOptions";
import { addSessionXp } from "../utils/sessionXp";
import { dueWordsOf } from "../utils/dueReview";
import {
  NO_EVIDENCE,
  StepEvidence,
  toReviewEvidence,
  withQuickCheck,
  withQuiz,
  withSpeaking,
  withTyping,
} from "../utils/wordVerdict";

interface UseVocabStudyEngineProps {
  topicId: number;
  initialWords: VocabWord[];
  /** The deck's due-word review: only the due words, asked before anything is shown. */
  dueReview?: boolean;
}

/**
 * The system's grade of the word just finished (thesis supervisor 2026-11-26:
 * no self-rating). PENDING while the server decides, ERROR when it could not
 * be saved.
 */
export interface WordVerdictState {
  word: VocabWord;
  evidence: ReviewEvidence;
  status: "PENDING" | "READY" | "ERROR";
  /** A due word under review: it had no speaking step. */
  review?: boolean;
  grade?: SrsGrade;
  intervalDays?: number;
}

export function useVocabStudyEngine({ topicId, initialWords, dueReview = false }: UseVocabStudyEngineProps) {
  const queryClient = useQueryClient();
  // The due words when the room opened. Each review refetches the deck, and a
  // word just reviewed is no longer due, so the list must not follow the deck.
  const [dueStart] = useState<VocabWord[]>(() => dueWordsOf(initialWords));
  const startQueue = useCallback(
    (): QueueItem[] =>
      dueReview
        ? dueStart.map((word) => ({ word, mode: "QUIZ" as StudyMode, stepCount: 1, review: true }))
        : initialWords.map((word) => ({ word, mode: "FLASHCARD" as StudyMode, stepCount: 1 })),
    [dueReview, dueStart, initialWords]
  );

  // Settings
  const [settings, setSettings] = useState<StudySettings>({
    soundEnabled: true,
    speechRate: 1.0,
    autoPlayAudio: false,
    preferUkAccent: false,
  });

  // Mastered in DB (for word drawer / persistent status)
  const [masteredIds, setMasteredIds] = useState<Set<number>>(
    () => new Set(initialWords.filter((w) => w.isMastered).map((w) => w.id))
  );
  // Mastered in THIS study session (for live progress bar and learned count)
  const [sessionMasteredIds, setSessionMasteredIds] = useState<Set<number>>(new Set());
  const [reviewIds, setReviewIds] = useState<Set<number>>(new Set());
  // Flashcard XP the server paid in this session (owner 2026-11-18).
  const [sessionXp, setSessionXp] = useState(0);

  // A deck starts with all its words in order; a due-word review with the due ones.
  const [queue, setQueue] = useState<QueueItem[]>(startQueue);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [direction, setDirection] = useState<number>(1); // 1 = slide forward, -1 = slide back
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Mode-specific state
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [selectedQuizKey, setSelectedQuizKey] = useState<string | null>(null);
  const [quizAnswered, setQuizAnswered] = useState<boolean>(false);
  const [typingInput, setTypingInput] = useState<string>("");
  const [typingHintCount, setTypingHintCount] = useState<number>(0);
  const [typingFeedback, setTypingFeedback] = useState<"CORRECT" | "INCORRECT" | null>(null);

  // Speech recognition state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [spokenTranscript, setSpokenTranscript] = useState<string>("");
  const [speechScore, setSpeechScore] = useState<number | null>(null);
  const [speechFeedback, setSpeechFeedback] = useState<string | null>(null);
  const [isSpeakingSkipped, setIsSpeakingSkipped] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // What each word did in its steps. A ref: it outlives resetModeInputs, and
  // the delayed step changes (900-1800 ms) always read the latest value.
  const attemptsRef = useRef(new Map<number, StepEvidence>());
  const evidenceOf = useCallback(
    (wordId: number) => attemptsRef.current.get(wordId) ?? NO_EVIDENCE,
    []
  );
  const record = useCallback(
    (wordId: number, next: (e: StepEvidence) => StepEvidence) => {
      attemptsRef.current.set(wordId, next(attemptsRef.current.get(wordId) ?? NO_EVIDENCE));
    },
    []
  );

  // The grade of the word just finished, shown until the learner goes on.
  const [verdict, setVerdictState] = useState<WordVerdictState | null>(null);
  const verdictRef = useRef<WordVerdictState | null>(null);
  const setVerdict = useCallback((next: WordVerdictState | null) => {
    verdictRef.current = next;
    setVerdictState(next);
  }, []);

  // The typing input and the window both hear Enter; check once.
  const checkingRef = useRef(false);

  // Reset helper called during transitions to avoid setState within effect
  const resetModeInputs = useCallback(() => {
    setIsFlipped(false);
    setSelectedQuizKey(null);
    setQuizAnswered(false);
    setTypingInput("");
    setTypingHintCount(0);
    setTypingFeedback(null);
    setIsRecording(false);
    setSpokenTranscript("");
    setSpeechScore(null);
    setSpeechFeedback(null);
    setIsSpeakingSkipped(false);
    checkingRef.current = false;
  }, []);

  // Active current item
  const currentItem = queue[currentIndex] as QueueItem | undefined;
  const currentWord = currentItem?.word;
  const currentMode = currentItem?.mode ?? "FLASHCARD";
  const isReviewItem = Boolean(currentItem?.review);

  // After the server stored a word's progress: refresh what shows it.
  const refreshProgress = useCallback(() => {
    const currentUserId = useAuthStore.getState().user?.id;
    queryClient.invalidateQueries({ queryKey: ["dashboard-today", currentUserId] });
    queryClient.invalidateQueries({ queryKey: ["user-stats", currentUserId] });
    queryClient.invalidateQueries({ queryKey: ["vocab-topic", topicId] });
    queryClient.invalidateQueries({ queryKey: ["vocab-topics"] });
    queryClient.invalidateQueries({ queryKey: ["myQuests"] });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("breadtrans:learning-event"));
    }
  }, [queryClient, topicId]);

  // The room's steps for one word: the server grades it and reschedules it.
  const reviewMut = useMutation({
    mutationFn: ({ wordId, evidence }: { wordId: number; evidence: ReviewEvidence }) =>
      vocabService.reviewWord(wordId, evidence),
    onSuccess: (reply) => {
      setSessionXp((total) => addSessionXp(total, reply));
      refreshProgress();
    },
  });

  // Audio Play helper
  const handlePlayAudio = useCallback(
    (accent?: "us" | "uk", text?: string) => {
      if (!currentWord || !settings.soundEnabled) return;
      const targetAccent = accent || (settings.preferUkAccent ? "uk" : "us");
      const textToSpeak = text?.trim() || currentWord.word;
      // Stored audio belongs to the vocabulary word only. Example/phrase text
      // must not reuse the word audio.
      const requestedAudioUrl = text?.trim()
        ? undefined
        : targetAccent === "uk"
          ? currentWord.audioUk
          : currentWord.audioUs;
      const sameAccentAudio =
        Boolean(currentWord.audioUs && currentWord.audioUk) &&
        currentWord.audioUs === currentWord.audioUk;
      const audioUrl = sameAccentAudio ? undefined : requestedAudioUrl;
      void playWordAudio(textToSpeak, audioUrl, targetAccent, settings.speechRate).then(
        (result) => {
          if (result === "UNAVAILABLE") {
            toast.error(`Chưa có audio phát âm cho giọng ${targetAccent === "uk" ? "Anh" : "Mỹ"}.`);
          } else if (result === "ERROR") {
            toast.error("Không thể phát âm lúc này. Vui lòng thử lại.");
          }
        },
      );
    },
    [currentWord, settings]
  );

  // Auto-play audio on entering a new card if setting enabled
  useEffect(() => {
    if (settings.autoPlayAudio && currentWord && !isCompleted) {
      handlePlayAudio();
    }
  }, [currentIndex, currentMode, settings.autoPlayAudio, currentWord, isCompleted, handlePlayAudio]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopCurrentAudio();
    };
  }, []);

  // Generate 4 Multiple Choice Options for Mode 2 (uniformly distributed across keys 1, 2, 3, 4)
  const quizOptions = useMemo<QuizOption[]>(() => {
    if (!currentWord) return [];
    return buildQuizOptions(currentWord, initialWords).options;
  }, [currentWord, initialWords]);

  // -------------------------------------------------------------
  // ADVANCE OR COMPLETE ENGINE
  // -------------------------------------------------------------
  const advanceQueue = useCallback(
    (newQueue: QueueItem[], nextIdx: number) => {
      resetModeInputs();
      if (newQueue.length === 0) {
        setIsCompleted(true);
        return;
      }
      if (nextIdx >= newQueue.length) {
        // Wrapped around to review uncompleted items
        setCurrentIndex(0);
      } else {
        setCurrentIndex(nextIdx);
      }
    },
    [resetModeInputs]
  );

  // -------------------------------------------------------------
  // A word known for now: the server already stored its grade.
  // -------------------------------------------------------------
  const finishWord = useCallback(() => {
    if (!currentWord || isCompleted) return;

    playChime("success");
    setDirection(1);

    setMasteredIds((prev) => new Set(prev).add(currentWord.id));
    setSessionMasteredIds((prev) => new Set(prev).add(currentWord.id));
    setReviewIds((prev) => {
      const updated = new Set(prev);
      updated.delete(currentWord.id);
      return updated;
    });

    const remainingQueue = queue.filter((_, idx) => idx !== currentIndex);
    setQueue(remainingQueue);

    if (remainingQueue.length === 0) {
      setIsCompleted(true);
    } else {
      advanceQueue(remainingQueue, currentIndex < remainingQueue.length ? currentIndex : 0);
    }
  }, [currentWord, isCompleted, queue, currentIndex, advanceQueue]);

  // The word goes to the end of the session, from its flashcard, steps forgotten.
  const requeueWord = useCallback(() => {
    if (!currentWord) return;
    setDirection(1);
    attemptsRef.current.delete(currentWord.id);
    const withoutCurrent = queue.filter((_, idx) => idx !== currentIndex);
    const nextQueue = [
      ...withoutCurrent,
      { word: currentWord, mode: "FLASHCARD" as StudyMode, stepCount: 1 },
    ];
    setQueue(nextQueue);
    advanceQueue(nextQueue, currentIndex < withoutCurrent.length ? currentIndex : 0);
  }, [currentWord, queue, currentIndex, advanceQueue]);

  // -------------------------------------------------------------
  // The steps are over: the server decides the grade.
  // -------------------------------------------------------------
  const reviewWord = reviewMut.mutate;
  const sendVerdict = useCallback(
    (pending: WordVerdictState) => {
      setVerdict(pending);
      reviewWord(
        { wordId: pending.word.id, evidence: pending.evidence },
        {
          onSuccess: (reply) =>
            setVerdict({
              ...pending,
              status: "READY",
              grade: reply?.grade ?? "GOOD",
              intervalDays: reply?.intervalDays,
            }),
          onError: () => setVerdict({ ...pending, status: "ERROR" }),
        },
      );
    },
    [reviewWord, setVerdict]
  );

  const submitWord = useCallback(
    (word: VocabWord, review = false) => {
      if (verdictRef.current || isCompleted) return;
      if (isRecording && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        setIsRecording(false);
      }
      sendVerdict({
        word,
        evidence: toReviewEvidence(evidenceOf(word.id)),
        status: "PENDING",
        review,
      });
    },
    [isCompleted, isRecording, sendVerdict, evidenceOf]
  );

  /** "Tiếp tục" on the grade: the word is done for now, or comes back this session. */
  const handleContinue = useCallback(() => {
    const v = verdictRef.current;
    if (!v || v.status !== "READY") return;
    setVerdict(null);
    if (v.grade === "AGAIN") {
      playChime("step");
      requeueWord();
    } else {
      attemptsRef.current.delete(v.word.id);
      finishWord();
    }
  }, [finishWord, requeueWord, setVerdict]);

  const handleRetryVerdict = useCallback(() => {
    const v = verdictRef.current;
    if (!v || v.status !== "ERROR") return;
    sendVerdict({ ...v, status: "PENDING" });
  }, [sendVerdict]);

  /** "Để sau": nothing was saved, the word comes back at the end of the session. */
  const handleDeferVerdict = useCallback(() => {
    const v = verdictRef.current;
    if (!v || v.status !== "ERROR") return;
    setVerdict(null);
    toast("Chưa lưu được kết quả, từ này sẽ quay lại cuối phiên.");
    requeueWord();
  }, [requeueWord, setVerdict]);

  // -------------------------------------------------------------
  // ACTION: "CHƯA NHỚ" (Escalate to next sequential mode)
  // Flashcard -> Trắc nghiệm -> Gõ từ -> Phát âm
  // -------------------------------------------------------------
  const handleEscalateMode = useCallback(() => {
    if (!currentWord || isCompleted || verdictRef.current) return;

    resetModeInputs();
    playChime("step");
    setDirection(1);

    // Track as review word
    setReviewIds((prev) => new Set(prev).add(currentWord.id));

    const nextModeMap: Record<StudyMode, StudyMode> = {
      FLASHCARD: "QUIZ",
      QUIZ: "TYPING",
      TYPING: "SPEAKING",
      SPEAKING: "FLASHCARD", // cyclical safeguard
    };

    const nextMode = nextModeMap[currentMode];

    // Update current queue item's mode
    setQueue((prevQueue) => {
      const copy = [...prevQueue];
      if (copy[currentIndex]) {
        copy[currentIndex] = {
          ...copy[currentIndex],
          mode: nextMode,
          stepCount: copy[currentIndex].stepCount + 1,
        };
      }
      return copy;
    });
  }, [currentWord, isCompleted, currentMode, currentIndex, resetModeInputs]);

  // -------------------------------------------------------------
  // ACTION: "KIỂM TRA NHANH" (the old "Đã thuộc", owner 2026-11-26):
  // the quiz and the typing still decide; the speaking step is not asked.
  // -------------------------------------------------------------
  const handleQuickCheck = useCallback(() => {
    if (!currentWord || isCompleted || verdictRef.current || currentMode !== "FLASHCARD") return;
    record(currentWord.id, withQuickCheck);
    setQueue((prevQueue) =>
      prevQueue.map((item, idx) => (idx === currentIndex ? { ...item, quickCheck: true } : item))
    );
    handleEscalateMode();
  }, [currentWord, isCompleted, currentMode, currentIndex, record, handleEscalateMode]);

  // -------------------------------------------------------------
  // ACTION: SELECT QUIZ OPTION (Mode 2)
  // -------------------------------------------------------------
  const handleSelectQuizOption = useCallback(
    (key: string) => {
      if (quizAnswered || !currentWord) return;

      const selectedOpt = quizOptions.find((opt) => opt.key === key);
      if (!selectedOpt) return;

      setSelectedQuizKey(key);
      setQuizAnswered(true);
      record(currentWord.id, (e) => withQuiz(e, selectedOpt.isCorrect));

      if (selectedOpt.isCorrect) {
        playChime("success");
        // Auto-advance to Mode 3 (Gõ từ) after 900ms
        setTimeout(() => {
          handleEscalateMode();
        }, 900);
      } else {
        playChime("error");
        // Escalate after 1200ms
        setTimeout(() => {
          handleEscalateMode();
        }, 1200);
      }
    },
    [quizAnswered, currentWord, quizOptions, record, handleEscalateMode]
  );

  // -------------------------------------------------------------
  // ACTION: CHECK TYPING (Mode 3)
  // -------------------------------------------------------------
  const handleCheckTyping = useCallback(() => {
    if (!currentWord || typingFeedback || checkingRef.current) return;
    checkingRef.current = true;

    const normalizedInput = typingInput.trim().toLowerCase();
    const normalizedTarget = currentWord.word.trim().toLowerCase();
    const correct = normalizedInput === normalizedTarget;
    record(currentWord.id, (e) => withTyping(e, correct, typingHintCount));
    // After a quick check, and for a due word under review, the typing is the last step.
    const word = currentWord;
    const review = isReviewItem;
    const next = () =>
      review || evidenceOf(word.id).quickCheck ? submitWord(word, review) : handleEscalateMode();

    if (correct) {
      playChime("success");
      setTypingFeedback("CORRECT");
      setTimeout(next, 1000);
    } else {
      playChime("error");
      setTypingFeedback("INCORRECT");
      handlePlayAudio();
      setTimeout(next, 1800);
    }
  }, [
    currentWord,
    typingFeedback,
    typingInput,
    typingHintCount,
    isReviewItem,
    record,
    evidenceOf,
    handleEscalateMode,
    handlePlayAudio,
    submitWord,
  ]);

  const handleRevealTypingHint = useCallback(() => {
    if (!currentWord) return;
    const wordClean = currentWord.word.trim();
    const nextCount = Math.min(typingHintCount + 1, wordClean.length);
    setTypingHintCount(nextCount);
    setTypingInput(wordClean.slice(0, nextCount));
  }, [currentWord, typingHintCount]);

  // -------------------------------------------------------------
  // ACTION: SPEECH PRACTICE (Mode 4)
  // -------------------------------------------------------------
  const speakingResult = useCallback(
    (word: VocabWord, result: SpeakingResult) => record(word.id, (e) => withSpeaking(e, result)),
    [record]
  );

  const handleToggleRecordSpeech = useCallback(() => {
    if (!currentWord || verdictRef.current) return;

    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    // No speech recognition in this browser: the step cannot be checked, and
    // it no longer pretends it passed (the grade would be wrong).
    if (!SpeechRecognitionClass) {
      speakingResult(currentWord, "UNAVAILABLE");
      setSpeechScore(null);
      setSpeechFeedback("Trình duyệt này không nhận được giọng nói. Bấm Tiếp tục để xem kết quả.");
      return;
    }

    const word = currentWord;
    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = settings.preferUkAccent ? "en-GB" : "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
        setSpokenTranscript("");
        setSpeechScore(null);
        setSpeechFeedback(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";
        const cleanTranscript = transcript.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "");
        const cleanTarget = word.word.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "");

        setSpokenTranscript(transcript);

        const transcriptTokens = cleanTranscript.split(/\s+/);
        const isMatch =
          cleanTranscript === cleanTarget ||
          transcriptTokens.includes(cleanTarget) ||
          cleanTranscript.startsWith(cleanTarget + " ") ||
          cleanTranscript.endsWith(" " + cleanTarget) ||
          cleanTranscript.includes(" " + cleanTarget + " ");

        if (isMatch) {
          speakingResult(word, "PASSED");
          setSpeechScore(100);
          setSpeechFeedback("Phát âm chính xác!");
          playChime("success");
          setTimeout(() => submitWord(word), 900);
        } else {
          speakingResult(word, "FAILED");
          setSpeechScore(0);
          setSpeechFeedback("Chưa chính xác, cần cải thiện thêm.");
          playChime("error");
        }
      };

      recognition.onerror = () => {
        speakingResult(word, "UNAVAILABLE");
        setIsRecording(false);
        setSpeechScore(null);
        setSpeechFeedback("Không nhận được giọng nói. Bạn có thể thử lại, hoặc bấm Tiếp tục.");
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      speakingResult(word, "UNAVAILABLE");
      setIsRecording(false);
      setSpeechScore(null);
      setSpeechFeedback("Không truy cập được micro. Bạn có thể thử lại, hoặc bấm Tiếp tục.");
    }
  }, [currentWord, isRecording, settings.preferUkAccent, speakingResult, submitWord]);

  // "Bỏ qua phần phát âm": the word is graded without it.
  const handleSkipSpeaking = useCallback(() => {
    if (!currentWord || verdictRef.current) return;
    setIsSpeakingSkipped(true);
    speakingResult(currentWord, "SKIPPED");
    submitWord(currentWord);
  }, [currentWord, speakingResult, submitWord]);

  // "Tiếp tục" after a failed or impossible speaking attempt.
  const handleContinueSpeaking = useCallback(() => {
    if (!currentWord) return;
    submitWord(currentWord);
  }, [currentWord, submitWord]);

  // Directly switch mode via stage pill tabs
  const handleSwitchMode = useCallback((mode: StudyMode) => {
    if (verdictRef.current) return;
    // A due word under review is never shown first, and has no speaking step.
    if (isReviewItem && (mode === "FLASHCARD" || mode === "SPEAKING")) return;
    resetModeInputs();
    setDirection(1);
    setQueue((prevQueue) => {
      const copy = [...prevQueue];
      if (copy[currentIndex]) {
        copy[currentIndex] = {
          ...copy[currentIndex],
          mode,
        };
      }
      return copy;
    });
  }, [currentIndex, isReviewItem, resetModeInputs]);

  // Jump directly to a specific word
  const handleJumpToWord = useCallback(
    (wordId: number) => {
      if (verdictRef.current) return;
      resetModeInputs();
      const existingIdx = queue.findIndex((item) => item.word.id === wordId);
      if (existingIdx !== -1) {
        setDirection(existingIdx >= currentIndex ? 1 : -1);
        setCurrentIndex(existingIdx);
        setIsCompleted(false);
      } else {
        const targetWord = initialWords.find((w) => w.id === wordId);
        if (targetWord) {
          setQueue((prev) => [
            ...prev,
            { word: targetWord, mode: "FLASHCARD", stepCount: 1 },
          ]);
          setDirection(1);
          setCurrentIndex(queue.length);
          setIsCompleted(false);
        }
      }
    },
    [queue, currentIndex, initialWords, resetModeInputs]
  );

  // Restart session
  const handleRestart = useCallback(() => {
    resetModeInputs();
    attemptsRef.current.clear();
    setVerdict(null);
    setQueue(startQueue());
    setCurrentIndex(0);
    setIsCompleted(false);
    setSessionMasteredIds(new Set());
    setReviewIds(new Set());
    setSessionXp(0);
  }, [startQueue, resetModeInputs, setVerdict]);

  // Sync if topicId changes
  const prevTopicIdRef = useRef<number>(topicId);
  useEffect(() => {
    if (prevTopicIdRef.current !== topicId) {
      prevTopicIdRef.current = topicId;
      handleRestart();
    }
  }, [topicId, handleRestart]);

  const speakingDone = speechScore !== null || speechFeedback !== null || isSpeakingSkipped;
  const canContinueSpeaking = speechFeedback !== null && speechScore !== 100;

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const v = verdictRef.current;
      if (v) {
        // On the grade, Enter goes on (or retries a save that failed).
        if (e.key === "Enter") {
          e.preventDefault();
          if (v.status === "READY") handleContinue();
          else if (v.status === "ERROR") handleRetryVerdict();
        }
        return;
      }

      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        // The typing input checks on its own Enter.
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        if (currentMode === "FLASHCARD") {
          setIsFlipped((prev) => !prev);
          playChime("flip");
        } else if (currentMode === "SPEAKING") {
          handleToggleRecordSpeech();
        }
      } else if (e.key === "Tab") {
        e.preventDefault();
        if (currentMode === "FLASHCARD") {
          handleQuickCheck();
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (currentMode === "FLASHCARD") {
          handleEscalateMode();
        } else if (currentMode === "TYPING") {
          handleCheckTyping();
        } else if (currentMode === "SPEAKING") {
          // "Bỏ qua phần phát âm" before any attempt (owner 2026-11-16),
          // "Tiếp tục" after a failed or impossible one.
          if (!speakingDone) handleSkipSpeaking();
          else if (canContinueSpeaking) handleContinueSpeaking();
        }
      } else if (["1", "2", "3", "4"].includes(e.key)) {
        if (currentMode === "QUIZ" && !quizAnswered) {
          e.preventDefault();
          handleSelectQuizOption(e.key);
        } else if (currentMode === "FLASHCARD") {
          if (e.key === "1") {
            e.preventDefault();
            handleEscalateMode();
          } else if (e.key === "2") {
            e.preventDefault();
            handleQuickCheck();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentMode,
    quizAnswered,
    speakingDone,
    canContinueSpeaking,
    handleCheckTyping,
    handleQuickCheck,
    handleEscalateMode,
    handleSelectQuizOption,
    handleToggleRecordSpeech,
    handleSkipSpeaking,
    handleContinueSpeaking,
    handleContinue,
    handleRetryVerdict,
  ]);

  // Derived metrics for UI
  const totalWordsCount = dueReview ? dueStart.length : initialWords.length;
  const learnedCount = sessionMasteredIds.size;
  const reviewCount = reviewIds.size;
  const newCount = Math.max(0, totalWordsCount - learnedCount - reviewCount);
  const completionPercentage =
    totalWordsCount > 0
      ? Math.min(100, Math.round((learnedCount / totalWordsCount) * 100))
      : 0;

  return {
    currentWord,
    currentItem,
    currentMode,
    currentIndex,
    totalInQueue: queue.length,
    isCompleted,
    direction,
    isFlipped,
    setIsFlipped,
    settings,
    setSettings,
    // Metrics
    totalWordsCount,
    learnedCount,
    reviewCount,
    newCount,
    sessionXp,
    completionPercentage,
    masteredIds,
    reviewIds,
    // Quiz state
    quizOptions,
    selectedQuizKey,
    quizAnswered,
    handleSelectQuizOption,
    // Typing state
    typingInput,
    setTypingInput,
    typingHintCount,
    typingFeedback,
    isQuickCheck: Boolean(currentItem?.quickCheck) || isReviewItem,
    isReviewItem,
    handleCheckTyping,
    handleRevealTypingHint,
    // Speaking state
    isRecording,
    spokenTranscript,
    speechScore,
    speechFeedback,
    isSpeakingSkipped,
    canContinueSpeaking,
    handleToggleRecordSpeech,
    handleSkipSpeaking,
    handleContinueSpeaking,
    // The system's grade of the word just finished
    verdict,
    handleContinue,
    handleRetryVerdict,
    handleDeferVerdict,
    // General Actions
    handlePlayAudio,
    handleQuickCheck,
    handleEscalateMode,
    handleSwitchMode,
    handleJumpToWord,
    handleRestart,
  };
}
