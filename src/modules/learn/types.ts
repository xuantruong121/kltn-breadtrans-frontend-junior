export interface ContentExercise {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface ContentMaterialLinks {
  youtubeId?: string;
  thumbnail?: string;
  duration?: string;
  level?: string;
  description?: string;
}

export interface ContentTopic {
  id: number;
  topicId: string;
  category: 'movie' | 'music' | 'grammar';
  title: string;
  order: number;
  materialLinks?: ContentMaterialLinks;
  exercises?: ContentExercise[];
  createdAt?: string;
  updatedAt?: string;
}
