"use client";

import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useVocabStudyEngine } from "../hooks/useVocabStudyEngine";
import { useSavedWords } from "../hooks/useSavedWords";
import { StudyTopHeader } from "./StudyTopHeader";
import { StageTabIndicator } from "./StageTabIndicator";
import { FlashcardStage } from "./FlashcardStage";
import { QuizStage } from "./QuizStage";
import { TypingStage } from "./TypingStage";
import { SpeakingStage } from "./SpeakingStage";
import { WordVerdict } from "./WordVerdict";
import { StudyFooter } from "./StudyFooter";
import { WordListDrawer } from "./WordListDrawer";
import { StudySettingsModal } from "./StudySettingsModal";
import { CompletionCelebration } from "./CompletionCelebration";
import { DueReviewDone } from "./DueReviewDone";
import { REVIEW_STAGES } from "../utils/dueReview";
import { playChime, playWordAudio } from "../utils/audio";
import { LofiForest } from "./LofiForest";
import { studySound } from "../sound/studySound";
import { useAmbiencePrefs, useStudyAmbience } from "../sound/useStudyAmbience";

import { VocabTopic, VocabTopicDetail } from "@/lib/api/services/vocab.service";

interface VocabStudyRoomProps {
  topic: VocabTopic | VocabTopicDetail;
  /** The deck's due-word review (owner 2026-11-27) instead of the whole deck. */
  dueReview?: boolean;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction >= 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.22,
      ease: [0.25, 1, 0.5, 1] as const,
    },
  },
  exit: (direction: number) => ({
    x: direction >= 0 ? -60 : 60,
    opacity: 0,
    transition: {
      duration: 0.16,
      ease: [0.25, 1, 0.5, 1] as const,
    },
  }),
};

export const VocabStudyRoom: React.FC<VocabStudyRoomProps> = ({ topic, dueReview = false }) => {
  const [isWordListOpen, setIsWordListOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const topicId = "id" in topic ? topic.id : (topic as any).topicId;
  const words = topic.words || [];

  const engine = useVocabStudyEngine({
    topicId: topicId,
    initialWords: words,
    dueReview,
  });

  const {
    currentWord,
    currentMode,
    isCompleted,
    direction,
    isFlipped,
    setIsFlipped,
    settings,
    setSettings,
    totalWordsCount,
    learnedCount,
    reviewCount,
    dueDoneCount,
    leftCount,
    sessionXp,
    newCount,
    completionPercentage,
    masteredIds,
    reviewIds,
    quizOptions,
    selectedQuizKey,
    quizAnswered,
    handleSelectQuizOption,
    typingInput,
    setTypingInput,
    typingHintCount,
    typingFeedback,
    isQuickCheck,
    isReviewItem,
    handleCheckTyping,
    handleRevealTypingHint,
    isRecording,
    spokenTranscript,
    speechScore,
    speechFeedback,
    isSpeakingSkipped,
    handleToggleRecordSpeech,
    handleSkipSpeaking,
    handleContinueSpeaking,
    verdict,
    handleContinue,
    handleRetryVerdict,
    handleDeferVerdict,
    handlePlayAudio,
    handleQuickCheck,
    handleEscalateMode,
    handleSwitchMode,
    handleJumpToWord,
    handleRestart,
  } = engine;

  // "Từ đã lưu" from the card (owner 2026-11-16), shared with the saved page.
  const savedWords = useSavedWords();
  const savedRow = currentWord ? savedWords.savedFor(currentWord.word) : undefined;
  const handleToggleSave = async () => {
    if (!currentWord) return;
    try {
      if (savedRow) {
        await savedWords.remove(savedRow.id);
        toast.success("Đã bỏ lưu");
      } else {
        await savedWords.save(currentWord.word);
        toast.success("Đã lưu vào Từ đã lưu");
      }
    } catch {
      toast.error("Không cập nhật được Từ đã lưu. Hãy thử lại.");
    }
  };

  // Ambience (owner 2026-11-08): lofi music and rain while studying, silent while
  // recording; the rainy forest behind the cards when the scene is on.
  const ambience = useAmbiencePrefs();
  const reduceMotion = Boolean(useReducedMotion());
  // Opened on a deck with nothing due: no word to ask, only where to go next.
  const nothingDue = dueReview && totalWordsCount === 0;
  useStudyAmbience(!isCompleted && !nothingDue, isRecording);
  const wasCompleted = useRef(isCompleted);
  useEffect(() => {
    if (isCompleted && !wasCompleted.current) studySound.play("done");
    wasCompleted.current = isCompleted;
  }, [isCompleted]);

  // Audio helper for drawer
  const handlePlayDrawerAudio = (word: string, audioUrl?: string, accent?: "us" | "uk") => {
    const targetAccent = accent || "us";
    void playWordAudio(word, audioUrl, targetAccent, settings.speechRate).then((result) => {
      if (result === "UNAVAILABLE") {
        toast.error(`Chưa có audio phát âm cho giọng ${targetAccent === "uk" ? "Anh" : "Mỹ"}.`);
      } else if (result === "ERROR") {
        toast.error("Không thể phát âm lúc này. Vui lòng thử lại.");
      }
    });
  };

  return (
    // Over the night forest the room reads in its dark theme, so every text keeps its contrast.
    <div
      className={`min-h-[100dvh] text-foreground flex flex-col justify-between selection:bg-sky-100 selection:text-sky-900 transition-colors duration-150 ${
        ambience.scene ? "dark scene-glass relative isolate" : "bg-background"
      }`}
    >
      {ambience.scene && <LofiForest reduce={reduceMotion} />}
      {/* 1. Top Navigation Bar with Pill Switcher & Live Progress */}
      <StudyTopHeader
        topicTitle={dueReview ? `${topic.title} · Ôn từ đến hạn` : topic.title}
        learnedCount={learnedCount}
        totalWordsCount={totalWordsCount}
        completionPercentage={completionPercentage}
        onOpenWordList={() => setIsWordListOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* 2. Main Active Canvas (Pulled up closer to header, no excessive vertical blank space) */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-12 short:pt-3 short:pb-4 phone-land:pt-2 phone-land:pb-4 flex flex-col items-center">
        {/* Sequential Stage Tab Pills */}
        {!isCompleted && !nothingDue && (
          <div className="w-full mb-6 short:mb-3 phone-land:mb-2">
            <StageTabIndicator
              currentMode={currentMode}
              onSelectMode={(mode) => handleSwitchMode(mode)}
              stages={isReviewItem ? REVIEW_STAGES : undefined}
            />
          </div>
        )}

        {/* Dynamic Animated Stage Container */}
        <div className="w-full flex items-center justify-center min-h-[440px] short:min-h-0 phone-land:min-h-0">
          <AnimatePresence mode="wait" custom={direction}>
            {nothingDue ? (
              <div className="w-full">
                <DueReviewDone topicId={topicId} topicTitle={topic.title} done={0} sessionXp={0} />
              </div>
            ) : isCompleted ? (
              <motion.div
                key="completion-screen"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full"
              >
                {dueReview ? (
                  <DueReviewDone
                    topicId={topicId}
                    topicTitle={topic.title}
                    done={dueDoneCount}
                    left={leftCount}
                    sessionXp={sessionXp}
                  />
                ) : (
                  <CompletionCelebration
                    totalWordsCount={totalWordsCount}
                    learnedCount={learnedCount}
                    reviewCount={reviewCount}
                    sessionXp={sessionXp}
                    onRestart={handleRestart}
                  />
                )}
              </motion.div>
            ) : verdict ? (
              <motion.div
                key={`${verdict.word.id}-verdict`}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full"
              >
                <WordVerdict
                  verdict={verdict}
                  onContinue={handleContinue}
                  onRetry={handleRetryVerdict}
                  onDefer={handleDeferVerdict}
                />
              </motion.div>
            ) : currentWord ? (
              <motion.div
                key={`${currentWord.id}-${currentMode}`}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full"
              >
                {currentMode === "FLASHCARD" && (
                  <FlashcardStage
                    word={currentWord}
                    isFlipped={isFlipped}
                    onFlip={() => {
                      setIsFlipped(!isFlipped);
                      playChime("flip");
                    }}
                    onPlayAudio={handlePlayAudio}
                    onQuickCheck={handleQuickCheck}
                    onEscalate={handleEscalateMode}
                    isSaved={Boolean(savedRow)}
                    saveBusy={savedWords.busy}
                    onToggleSave={() => void handleToggleSave()}
                  />
                )}

                {currentMode === "QUIZ" && (
                  <QuizStage
                    word={currentWord}
                    options={quizOptions}
                    selectedKey={selectedQuizKey}
                    answered={quizAnswered}
                    onSelectOption={handleSelectQuizOption}
                    onPlayAudio={handlePlayAudio}
                  />
                )}

                {currentMode === "TYPING" && (
                  <TypingStage
                    word={currentWord}
                    input={typingInput}
                    hintCount={typingHintCount}
                    feedback={typingFeedback}
                    onInputChange={setTypingInput}
                    onCheck={handleCheckTyping}
                    onRevealHint={handleRevealTypingHint}
                    quickCheck={isQuickCheck}
                  />
                )}

                {currentMode === "SPEAKING" && (
                  <SpeakingStage
                    word={currentWord}
                    isRecording={isRecording}
                    transcript={spokenTranscript}
                    score={speechScore}
                    feedback={speechFeedback}
                    isSkipped={isSpeakingSkipped}
                    onToggleRecord={handleToggleRecordSpeech}
                    onPlayAudio={handlePlayAudio}
                    onSkipSpeaking={handleSkipSpeaking}
                    onContinue={handleContinueSpeaking}
                  />
                )}
              </motion.div>
            ) : (
              <div className="text-center py-16 text-slate-600 dark:text-slate-400 text-sm font-semibold">
                Không tìm thấy từ vựng trong chủ đề
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* 3. Bottom Footer & Status Tracker */}
      <StudyFooter
        currentMode={currentMode}
        newCount={newCount}
        learnedCount={learnedCount}
        reviewCount={reviewCount}
        glass={ambience.scene}
        stages={isReviewItem ? REVIEW_STAGES : undefined}
        dueReview={dueReview}
      />

      {/* Slide-over Word List Drawer */}
      <WordListDrawer
        isOpen={isWordListOpen}
        onClose={() => setIsWordListOpen(false)}
        words={words}
        currentWordId={currentWord?.id}
        masteredIds={masteredIds}
        reviewIds={reviewIds}
        onSelectWord={(selected) => handleJumpToWord(selected.id)}
        onPlayAudio={handlePlayDrawerAudio}
      />

      {/* Settings Modal */}
      <StudySettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newVals) => setSettings((prev) => ({ ...prev, ...newVals }))}
      />
    </div>
  );
};
