"use client";

import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useVocabStudyEngine } from "../hooks/useVocabStudyEngine";
import { StudyTopHeader } from "./StudyTopHeader";
import { StageTabIndicator } from "./StageTabIndicator";
import { FlashcardStage } from "./FlashcardStage";
import { QuizStage } from "./QuizStage";
import { TypingStage } from "./TypingStage";
import { SpeakingStage } from "./SpeakingStage";
import { StudyFooter } from "./StudyFooter";
import { WordListDrawer } from "./WordListDrawer";
import { StudySettingsModal } from "./StudySettingsModal";
import { CompletionCelebration } from "./CompletionCelebration";
import { playChime, playWordAudio } from "../utils/audio";
import { LofiForest } from "./LofiForest";
import { studySound } from "../sound/studySound";
import { useAmbiencePrefs, useStudyAmbience } from "../sound/useStudyAmbience";

import { VocabTopic, VocabTopicDetail } from "@/lib/api/services/vocab.service";

interface VocabStudyRoomProps {
  topic: VocabTopic | VocabTopicDetail;
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

export const VocabStudyRoom: React.FC<VocabStudyRoomProps> = ({ topic }) => {
  const [isWordListOpen, setIsWordListOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const topicId = "id" in topic ? topic.id : (topic as any).topicId;
  const words = topic.words || [];

  const engine = useVocabStudyEngine({
    topicId: topicId,
    initialWords: words,
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
    handleCheckTyping,
    handleRevealTypingHint,
    isRecording,
    spokenTranscript,
    speechScore,
    speechFeedback,
    isSpeakingSkipped,
    handleToggleRecordSpeech,
    handleSkipSpeaking,
    handleSrsRate,
    handlePlayAudio,
    handleMarkMastered,
    handleEscalateMode,
    handleSwitchMode,
    handleJumpToWord,
    handleRestart,
  } = engine;

  // Ambience (owner 2026-11-08): lofi music and rain while studying, silent while
  // recording; the rainy forest behind the cards when the scene is on.
  const ambience = useAmbiencePrefs();
  const reduceMotion = Boolean(useReducedMotion());
  useStudyAmbience(!isCompleted, isRecording);
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
        ambience.scene ? "dark study-glass relative isolate" : "bg-background"
      }`}
    >
      {ambience.scene && <LofiForest reduce={reduceMotion} />}
      {/* 1. Top Navigation Bar with Pill Switcher & Live Progress */}
      <StudyTopHeader
        topicTitle={topic.title}
        learnedCount={learnedCount}
        totalWordsCount={totalWordsCount}
        completionPercentage={completionPercentage}
        onOpenWordList={() => setIsWordListOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* 2. Main Active Canvas (Pulled up closer to header, no excessive vertical blank space) */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-12 flex flex-col items-center">
        {/* Sequential Stage Tab Pills */}
        {!isCompleted && (
          <div className="w-full mb-6">
            <StageTabIndicator
              currentMode={currentMode}
              onSelectMode={(mode) => handleSwitchMode(mode)}
            />
          </div>
        )}

        {/* Dynamic Animated Stage Container */}
        <div className="w-full flex items-center justify-center min-h-[440px]">
          <AnimatePresence mode="wait" custom={direction}>
            {isCompleted ? (
              <motion.div
                key="completion-screen"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full"
              >
                <CompletionCelebration
                  totalWordsCount={totalWordsCount}
                  learnedCount={learnedCount}
                  reviewCount={reviewCount}
                  onRestart={handleRestart}
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
                    onMarkMastered={handleMarkMastered}
                    onEscalate={handleEscalateMode}
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
                    onRateSrs={handleSrsRate}
                    onSkipSpeaking={handleSkipSpeaking}
                    onSkip={handleMarkMastered}
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
