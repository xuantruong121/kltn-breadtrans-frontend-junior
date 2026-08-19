export interface FlashcardWord {
  id: string;
  word: string;
  ipa: string;
  mean: string;
  exampleEn: string;
  exampleVi: string;
  type: string; // n, v, adj, adv
  audio?: string;
}

export interface FlashcardLesson {
  id: number;
  title: string;
  description: string;
  words: FlashcardWord[];
}

export interface FlashcardBook {
  id: number;
  name: string;
  category: string;
  coverColor: string;
  icon: string;
  totalWords: number;
  lessons: FlashcardLesson[];
}

export type StudyMode = "flashcard" | "quiz" | "list";
