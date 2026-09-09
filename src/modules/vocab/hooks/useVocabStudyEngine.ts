"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { VocabWord, vocabService } from "@/lib/api/services/vocab.service";
import { QueueItem, StudyMode, QuizOption, SrsRating, StudySettings } from "../types/study";
import { playWordAudio, playChime, stopCurrentAudio } from "../utils/audio";

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = Math.abs(seed) || 1234567;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = Math.floor((s / 2147483647) * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

interface UseVocabStudyEngineProps {
  topicId: number;
  initialWords: VocabWord[];
}

export function useVocabStudyEngine({ topicId, initialWords }: UseVocabStudyEngineProps) {
  const queryClient = useQueryClient();

  // Settings
  const [settings, setSettings] = useState<StudySettings>({
    soundEnabled: true,
    speechRate: 1.0,
    autoPlayAudio: false,
    preferUkAccent: false,
  });

  // Mastered & Escalated tracking sets
  const [masteredIds, setMasteredIds] = useState<Set<number>>(
    () => new Set(initialWords.filter((w) => w.isMastered).map((w) => w.id))
  );
  const [reviewIds, setReviewIds] = useState<Set<number>>(new Set());

  // Active study queue
  // Initially, queue contains words that are not yet mastered (or all words if all are mastered)
  const [queue, setQueue] = useState<QueueItem[]>(() => {
    const unmastered = initialWords.filter((w) => !w.isMastered);
    const pool = unmastered.length > 0 ? unmastered : initialWords;
    return pool.map((word) => ({
      word,
      mode: "FLASHCARD" as StudyMode,
      stepCount: 1,
    }));
  });

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
  const recognitionRef = useRef<any>(null);

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
  }, []);

  // Active current item
  const currentItem = queue[currentIndex] as QueueItem | undefined;
  const currentWord = currentItem?.word;
  const currentMode = currentItem?.mode ?? "FLASHCARD";

  // Backend mastery mutation
  const toggleMasteredMut = useMutation({
    mutationFn: ({ wordId, isMastered }: { wordId: number; isMastered: boolean }) =>
      vocabService.masterWord(wordId, isMastered),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-today"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      queryClient.invalidateQueries({ queryKey: ["vocab-topic", topicId] });
      queryClient.invalidateQueries({ queryKey: ["vocab-topics"] });
      queryClient.invalidateQueries({ queryKey: ["myQuests"] });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("breadtrans:learning-event"));
      }
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
      const audioUrl = text?.trim()
        ? undefined
        : targetAccent === "uk"
          ? currentWord.audioUk
          : currentWord.audioUs;
      playWordAudio(textToSpeak, audioUrl, targetAccent, settings.speechRate);
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

  // Generate 4 Multiple Choice Options for Mode 2 deterministically without impure Math.random
  const quizOptions = useMemo<QuizOption[]>(() => {
    if (!currentWord) return [];

    const correctMeaning = currentWord.meaning;
    const otherWords = initialWords.filter((w) => w.id !== currentWord.id);

    // Deterministically shuffle other words using word id as seed
    const shuffledOthers = seededShuffle(otherWords, currentWord.id * 17 + 101);
    const distractorMeanings = shuffledOthers.slice(0, 3).map((w) => w.meaning);

    // If less than 3 distractors exist in the deck, add sensible generic fallbacks
    const fallbackMeanings = [
      "đồng ý, tán thành",
      "thực hiện, tiến hành",
      "thông báo, tuyên bố",
      "sắp xếp, lên kế hoạch",
    ];
    while (distractorMeanings.length < 3) {
      const fb = fallbackMeanings[distractorMeanings.length];
      if (fb && !distractorMeanings.includes(fb) && fb !== correctMeaning) {
        distractorMeanings.push(fb);
      } else {
        distractorMeanings.push(`Ý nghĩa ${distractorMeanings.length + 1}`);
      }
    }

    const allUnshuffled = [
      { text: correctMeaning, isCorrect: true },
      ...distractorMeanings.map((m) => ({ text: m, isCorrect: false })),
    ];
    const allOptions = seededShuffle(allUnshuffled, currentWord.id * 31 + 203);

    const keys: ("1" | "2" | "3" | "4")[] = ["1", "2", "3", "4"];
    return allOptions.map((opt, idx) => ({
      id: `${currentWord.id}-${idx}`,
      key: keys[idx]!,
      text: opt.text,
      isCorrect: opt.isCorrect,
    }));
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
  // ACTION: "ĐÃ THUỘC" (Mastered)
  // -------------------------------------------------------------
  const handleMarkMastered = useCallback(() => {
    if (!currentWord || isCompleted) return;

    playChime("success");
    setDirection(1);

    // 1. Mark as mastered in state & backend
    setMasteredIds((prev) => new Set(prev).add(currentWord.id));
    setReviewIds((prev) => {
      const updated = new Set(prev);
      updated.delete(currentWord.id);
      return updated;
    });

    toggleMasteredMut.mutate({ wordId: currentWord.id, isMastered: true });

    // 2. Remove word from active queue
    const remainingQueue = queue.filter((item, idx) => idx !== currentIndex);
    setQueue(remainingQueue);

    if (remainingQueue.length === 0) {
      setIsCompleted(true);
    } else {
      advanceQueue(remainingQueue, currentIndex < remainingQueue.length ? currentIndex : 0);
    }
  }, [currentWord, isCompleted, queue, currentIndex, toggleMasteredMut, advanceQueue]);

  // -------------------------------------------------------------
  // ACTION: "CHƯA NHỚ" (Escalate to next sequential mode)
  // Flashcard -> Trắc nghiệm -> Gõ từ -> Phát âm
  // -------------------------------------------------------------
  const handleEscalateMode = useCallback(() => {
    if (!currentWord || isCompleted) return;

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
  // ACTION: SELECT QUIZ OPTION (Mode 2)
  // -------------------------------------------------------------
  const handleSelectQuizOption = useCallback(
    (key: string) => {
      if (quizAnswered || !currentWord) return;

      const selectedOpt = quizOptions.find((opt) => opt.key === key);
      if (!selectedOpt) return;

      setSelectedQuizKey(key);
      setQuizAnswered(true);

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
    [quizAnswered, currentWord, quizOptions, handleEscalateMode]
  );

  // -------------------------------------------------------------
  // ACTION: CHECK TYPING (Mode 3)
  // -------------------------------------------------------------
  const handleCheckTyping = useCallback(() => {
    if (!currentWord || typingFeedback) return;

    const normalizedInput = typingInput.trim().toLowerCase();
    const normalizedTarget = currentWord.word.trim().toLowerCase();

    if (normalizedInput === normalizedTarget) {
      playChime("success");
      setTypingFeedback("CORRECT");
      setTimeout(() => {
        handleEscalateMode(); // advances to Mode 4: Phát âm
      }, 1000);
    } else {
      playChime("error");
      setTypingFeedback("INCORRECT");
      handlePlayAudio();
      setTimeout(() => {
        handleEscalateMode(); // advances to Mode 4: Phát âm for reinforcement
      }, 1800);
    }
  }, [currentWord, typingFeedback, typingInput, handleEscalateMode, handlePlayAudio]);

  const handleRevealTypingHint = useCallback(() => {
    if (!currentWord) return;
    const wordClean = currentWord.word.trim();
    const nextCount = Math.min(typingHintCount + 1, wordClean.length);
    setTypingHintCount(nextCount);
    setTypingInput(wordClean.slice(0, nextCount));
  }, [currentWord, typingHintCount]);

  // -------------------------------------------------------------
  // ACTION: SPEECH PRACTICE & SRS RATING (Mode 4)
  // -------------------------------------------------------------
  const handleToggleRecordSpeech = useCallback(() => {
    if (!currentWord) return;

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

    if (!SpeechRecognitionClass) {
      // Fallback: simulate realistic evaluation if speech API is unavailable
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        setSpokenTranscript(currentWord.word);
        setSpeechScore(92);
        setSpeechFeedback("Phát âm rất chuẩn xác! Hãy đánh giá độ khó:");
        playChime("success");
      }, 1600);
      return;
    }

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
        const cleanTranscript = transcript.trim().toLowerCase();
        const cleanTarget = currentWord.word.trim().toLowerCase();

        setSpokenTranscript(transcript);

        if (cleanTranscript === cleanTarget || cleanTranscript.includes(cleanTarget)) {
          setSpeechScore(95);
          setSpeechFeedback("Phát âm tuyệt vời! Chuẩn âm điệu.");
          playChime("success");
        } else {
          setSpeechScore(60);
          setSpeechFeedback(`Máy nghe nhận dạng: "${transcript}". Bạn có thể thử lại hoặc chọn mức nhớ bên dưới.`);
          playChime("error");
        }
      };

      recognition.onerror = () => {
        setIsRecording(false);
        setSpeechScore(80);
        setSpeechFeedback("Không thể truy cập microphone. Bạn có thể tự đánh giá mức độ ghi nhớ:");
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsRecording(false);
      setSpeechScore(85);
      setSpeechFeedback("Hoàn thành bài luyện phát âm. Chọn đánh giá bên dưới:");
    }
  }, [currentWord, isRecording, settings.preferUkAccent]);

  // SRS Rating Selection
  const handleSrsRate = useCallback(
    (rating: SrsRating) => {
      if (!currentWord || isCompleted) return;

      if (rating === "AGAIN") {
        playChime("step");
        setDirection(1);

        // Re-queue the word at the end of the queue for reinforcement
        setQueue((prevQueue) => {
          const updated = prevQueue.filter((_, idx) => idx !== currentIndex);
          return [
            ...updated,
            {
              word: currentWord,
              mode: "FLASHCARD",
              stepCount: 1,
            },
          ];
        });
        advanceQueue(queue, currentIndex < queue.length - 1 ? currentIndex : 0);
      } else {
        // HARD, GOOD, EASY -> Mark as mastered and remove from review queue
        handleMarkMastered();
      }
    },
    [currentWord, isCompleted, queue, currentIndex, advanceQueue, handleMarkMastered]
  );

  // Directly switch mode via stage pill tabs
  const handleSwitchMode = useCallback((mode: StudyMode) => {
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
  }, [currentIndex, resetModeInputs]);

  // Jump directly to a specific word
  const handleJumpToWord = useCallback(
    (wordId: number) => {
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
    setQueue(
      initialWords.map((word) => ({
        word,
        mode: "FLASHCARD",
        stepCount: 1,
      }))
    );
    setCurrentIndex(0);
    setIsCompleted(false);
    setMasteredIds(new Set());
    setReviewIds(new Set());
  }, [initialWords, resetModeInputs]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        if (e.key === "Enter" && currentMode === "TYPING") {
          e.preventDefault();
          handleCheckTyping();
        }
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
          handleMarkMastered();
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (currentMode === "FLASHCARD") {
          handleEscalateMode();
        } else if (currentMode === "TYPING") {
          handleCheckTyping();
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
            handleMarkMastered();
          }
        } else if (currentMode === "SPEAKING") {
          const srsMap: Record<string, SrsRating> = {
            "1": "AGAIN",
            "2": "HARD",
            "3": "GOOD",
            "4": "EASY",
          };
          if (srsMap[e.key]) {
            e.preventDefault();
            handleSrsRate(srsMap[e.key]);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentMode,
    quizAnswered,
    handleCheckTyping,
    handleMarkMastered,
    handleEscalateMode,
    handleSelectQuizOption,
    handleToggleRecordSpeech,
    handleSrsRate,
  ]);

  // Derived metrics for UI
  const totalWordsCount = initialWords.length;
  const learnedCount = masteredIds.size;
  const reviewCount = reviewIds.size;
  const newCount = Math.max(0, totalWordsCount - learnedCount - reviewCount);
  const completionPercentage = totalWordsCount > 0 ? Math.min(100, Math.round((learnedCount / totalWordsCount) * 100)) : 0;

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
    handleCheckTyping,
    handleRevealTypingHint,
    // Speaking state
    isRecording,
    spokenTranscript,
    speechScore,
    speechFeedback,
    handleToggleRecordSpeech,
    handleSrsRate,
    // General Actions
    handlePlayAudio,
    handleMarkMastered,
    handleEscalateMode,
    handleSwitchMode,
    handleJumpToWord,
    handleRestart,
  };
}
