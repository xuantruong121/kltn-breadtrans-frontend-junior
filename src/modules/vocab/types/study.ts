import { VocabWord } from "@/lib/api/services/vocab.service";

export type StudyMode = "FLASHCARD" | "QUIZ" | "TYPING" | "SPEAKING";

export interface QueueItem {
  word: VocabWord;
  mode: StudyMode;
  stepCount: number;
  incorrectAttempts?: number;
}

export interface QuizOption {
  id: string;
  key: "1" | "2" | "3" | "4";
  text: string;
  isCorrect: boolean;
}

export type SrsRating = "AGAIN" | "HARD" | "GOOD" | "EASY";

export interface SrsIntervalOption {
  rating: SrsRating;
  label: string;
  intervalText: string;
  badgeStyle: string;
  keyNumber: string;
}

export interface StudySettings {
  soundEnabled: boolean;
  speechRate: number; // 0.75, 1.0, 1.25
  autoPlayAudio: boolean;
  preferUkAccent: boolean;
}
