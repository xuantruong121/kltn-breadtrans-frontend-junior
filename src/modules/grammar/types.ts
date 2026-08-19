export interface GrammarQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface GrammarLesson {
  id: string;
  title: string;
  duration: string;
  youtubeId: string;
  summaryNotes: string[];
  keyFormula: string;
  questions: GrammarQuestion[];
}

export interface GrammarTopic {
  id: string;
  title: string;
  level: string; // "Cơ bản" | "Trung cấp" | "Nâng cao"
  icon: string;
  color: string;
  lessons: GrammarLesson[];
}
