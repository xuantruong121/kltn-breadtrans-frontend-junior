import { VocabWord } from "@/lib/api/services/vocab.service";

export type StudyMode = "FLASHCARD" | "QUIZ" | "TYPING" | "SPEAKING";

export interface QueueItem {
  word: VocabWord;
  mode: StudyMode;
  stepCount: number;
  /** "Kiểm tra nhanh" (owner 2026-11-26): quiz and typing only, then the grade. */
  quickCheck?: boolean;
  /** A due word under review (owner 2026-11-27): asked by the quiz and the typing, never shown first. */
  review?: boolean;
}

export interface QuizOption {
  id: string;
  key: "1" | "2" | "3" | "4";
  text: string;
  isCorrect: boolean;
}

export interface StudySettings {
  soundEnabled: boolean;
  speechRate: number; // 0.75, 1.0, 1.25
  autoPlayAudio: boolean;
  preferUkAccent: boolean;
}
