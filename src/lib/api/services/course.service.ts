import axiosClient from "../axiosClient";

export interface Class {
  id: number;
  name: string;
  courseId: number;
  startDate?: string | null;
  endDate?: string | null;
  capacity?: number;
  tuitionFeeVnd?: number;
  status?: string;
  studentCount?: number;
  activeEnrollmentCount?: number;
  totalEnrollmentCount?: number;
  hasEnrollments?: boolean;
}

export type CourseSkill = "LISTENING" | "SPEAKING" | "READING" | "WRITING";

export interface CourseCurriculumActivity {
  id: string;
  sourceId: number | string;
  kind:
    | "LESSON"
    | "LISTENING"
    | "SPEAKING"
    | "READING"
    | "WRITING"
    | "TOEIC"
    | "GRAMMAR";
  skill: CourseSkill | null;
  title: string;
  description: string | null;
  route: string | null;
  required: boolean;
  published: boolean;
  hasQuestions: boolean;
  isPremiumContent: boolean;
  lessonId?: number;
  order?: number;
  speakingPracticeSetId?: string | null;
  completed?: boolean;
  unlocked?: boolean;
  lockedReason?: string | null;
}

export interface CourseCurriculumLesson {
  id: number;
  order: number;
  title: string;
  description: string | null;
  materials: Array<{
    id: number;
    title: string;
    fileUrl: string;
    fileType?: string | null;
    objective?: string | null;
    contentText?: string | null;
  }>;
  activities: CourseCurriculumActivity[];
}

export interface CourseCurriculum {
  version: 2;
  lessons: CourseCurriculumLesson[];
  requiredActivityCount: number;
  skillCoverage: Record<CourseSkill, number>;
  optionalActivityCount: number;
  readiness:
    | "READY"
    | "PARTIAL"
    | "EMPTY"
    | "BROKEN"
    | "FOCUSED"
    | "TOEIC"
    | "DEFERRED_TO_TOEIC_WORKFLOW";
  readinessReasons: string[];
}

export interface CourseProgress {
  requiredCompleted: number;
  requiredTotal: number;
  optionalCompleted: number;
  optionalTotal: number;
  percentage: number;
  isComplete: boolean;
  nextActivity: {
    id: string;
    lessonId?: number;
    route: string | null;
    title: string;
  } | null;
  activities: Array<{
    id: string;
    lessonId?: number;
    order?: number;
    kind: string;
    title: string;
    required: boolean;
    completed: boolean;
    route: string | null;
    unlocked?: boolean;
    lockedReason?: string | null;
  }>;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  thumbnail?: string;
  level: string; // e.g., "BEGINNER", "INTERMEDIATE"
  status?: string;
  classes?: Class[];
  curriculum?: CourseCurriculum;
  progress?: CourseProgress | null;
  canAccess?: boolean;
  accessSource?: "ADMIN" | "PRO_SUBSCRIPTION" | "LEGACY_PURCHASE" | null;
  requiresPro?: boolean;
  isStarted?: boolean;
  isCompleted?: boolean;
  lockedReason?: string | null;
  isSelfPaced?: boolean;
  learning?: CourseLearningProfile;
  quizzes?: Array<{
    id: number;
    title: string;
    type: string;
    isPremiumContent?: boolean;
  }>;
}

export interface CourseLearningProfile {
  introduction: string;
  objectives: string[];
  studyGuidance: string;
  mediaLabel: string;
  coverImage: string;
}

export interface CourseLessonDetail {
  courseId: number;
  lesson: CourseCurriculumLesson & {
    theory: { overview: string; keyPoints: string[] };
  };
  course: {
    id: number;
    title: string;
    level: string | null;
    learning?: CourseLearningProfile;
  };
  progress: CourseProgress | null;
  navigation: { previousLessonId: number | null; nextLessonId: number | null };
}

export interface Material {
  id: number;
  title: string;
  type: string;
  url: string;
}

export interface Lesson {
  id: number;
  title: string;
  content: string;
  orderIndex: number;
  materials?: Material[];
}

export interface ClassDetail extends Class {
  lessons: Lesson[];
  teacher?: {
    id: number;
    email: string;
    profile: {
      fullName: string;
    };
  };
}

export interface StudentLearningClass extends Class {
  enrollmentProgress: number;
  enrollmentStatus: "ACTIVE" | "COMPLETED";
  course: Pick<
    Course,
    "id" | "title" | "description" | "thumbnail" | "thumbnailUrl" | "level"
  >;
}

// ================= PUBLIC DISCOVERY (PHASE 3A & 3B) =================

export interface PublicTeacher {
  id: number | null;
  fullName: string;
  avatar: string | null;
  specialization?: string | null;
}

export interface PublicCourseCard {
  id: number;
  title: string;
  description: string | null;
  thumbnail: string | null;
  level: string | null;
  status: string;
  createdAt: string;
  teacher?: PublicTeacher;
  curriculumType?: string;
  canAccess: boolean;
  accessSource: "ADMIN" | "PRO_SUBSCRIPTION" | "LEGACY_PURCHASE" | null;
  requiresPro: boolean;
  isSelfPaced: boolean;
  learning?: CourseLearningProfile;
  curriculum?: CourseCurriculum;
}

export interface PublicClass {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  capacity: number | null;
  tuitionFeeVnd: number;
  currentEnrollmentCount: number;
  remainingSeats: number;
  isSoldOut: boolean;
  status: string;
  teacher?: PublicTeacher;
}

export interface PublicLessonOutline {
  id: number;
  title: string;
  description: string | null;
  order: number;
  activities: CourseCurriculumActivity[];
}

export interface PublicCourseDetail {
  id: number;
  title: string;
  description: string | null;
  thumbnail: string | null;
  level: string | null;
  status: string;
  createdAt: string;
  teacher?: PublicTeacher;
  lessons: PublicLessonOutline[];
  curriculumType?: string;
  classes?: PublicClass[];
  curriculum?: CourseCurriculum;
  canAccess: boolean;
  accessSource: "ADMIN" | "PRO_SUBSCRIPTION" | "LEGACY_PURCHASE" | null;
  requiresPro: boolean;
  isSelfPaced: boolean;
  learning?: CourseLearningProfile;
}

export interface EnrollResponseDto {
  enrollmentId: number;
  classId: number;
  status: "ACTIVE" | "PENDING_PAYMENT";
  tuitionFeeVnd: number;
  accessGranted: boolean;
  message: string;
  payos?: {
    intentId: number;
    type?: "PLAN" | "COURSE";
    orderCode: number;
    description: string;
    paymentLinkId: string | null;
    checkoutUrl: string | null;
    qrCode: string | null;
    bankBin: string | null;
    bankAccountNumber: string | null;
    bankAccountName: string | null;
    status: string;
    expiresAt: string | null;
  } | null;
}

export interface StudentCourseEnrollment {
  id: number;
  classId: number;
  status: "ACTIVE" | "PENDING_PAYMENT" | "COMPLETED" | "DROPPED";
  joinedAt: string;
}

export interface CourseV5LessonSummary {
  id: number;
  slug: string;
  order: number;
  title: string;
  summary: string;
  estimatedMinutes: number;
  difficulty: string | null;
  coverImage: string | null;
  exerciseCount: number;
  completed: boolean;
}

export interface CourseV5Overview {
  course: Pick<Course, "id" | "title" | "description" | "level"> & {
    learning?: CourseLearningProfile;
  };
  lessons: CourseV5LessonSummary[];
  progress: {
    completedLessons: number;
    totalLessons: number;
    percentage: number;
    isComplete: boolean;
  };
}

export interface CourseV5Section {
  id: number;
  order: number;
  type: string;
  heading: string;
  content: unknown;
  isRequired: boolean;
}

export interface CourseV5Exercise {
  id: number;
  slug: string;
  order: number;
  type: string;
  title: string;
  prompt: string;
  instructions: string | null;
  content: unknown;
  rubric: unknown;
  required: boolean;
  minimumScore: number | null;
  completed: boolean;
  questions: Array<{
    id: number;
    order: number;
    prompt: string;
    options: unknown;
  }>;
}

export interface CourseV5LessonDetail {
  courseId: number;
  course: Pick<Course, "id" | "title" | "level"> & {
    learning?: CourseLearningProfile;
  };
  lesson: {
    id: number;
    slug: string;
    order: number;
    title: string;
    summary: string;
    learningObjectives: unknown;
    estimatedMinutes: number;
    difficulty: string | null;
    coverImage: string | null;
    sections: CourseV5Section[];
    media: Array<{
      id: number;
      type: string;
      url: string;
      altText: string | null;
    }>;
    references: Array<{
      id: number;
      title: string;
      publisher: string | null;
      url: string;
      note: string | null;
    }>;
    exercises: CourseV5Exercise[];
  };
  navigation: {
    previousLessonId: number | null;
    nextLessonId: number | null;
    lessons: Array<{ id: number; order: number; title: string }>;
  };
}

export interface CourseV5SubmitResult {
  attemptId: number;
  score: number;
  maxScore: number;
  percentage: number;
  completed: boolean;
  feedback: Array<{
    questionId: number;
    answer: unknown;
    isCorrect: boolean;
    explanation: string;
  }>;
}

export const courseService = {
  getAllCourses: async (): Promise<Course[]> => {
    return await axiosClient.get("/courses");
  },

  getCourseById: async (id: number): Promise<Course> => {
    return await axiosClient.get(`/courses/${id}`);
  },

  getCourseProgress: async (id: number): Promise<CourseProgress> => {
    return await axiosClient.get(`/courses/${id}/progress`);
  },

  startCourse: async (
    id: number,
  ): Promise<{
    courseId: number;
    enrollmentId: number;
    accessSource: string;
    progress: CourseProgress;
  }> => {
    return await axiosClient.post(`/courses/${id}/start`);
  },

  getCourseActivityAccess: async (courseId: number, activityId: number) => {
    return await axiosClient.get(
      `/courses/${courseId}/activities/${activityId}/access`,
    );
  },

  getCourseLesson: async (
    courseId: number,
    lessonId: number,
  ): Promise<CourseLessonDetail> => {
    return await axiosClient.get(`/courses/${courseId}/lessons/${lessonId}`);
  },

  getCourseLearningOverview: async (
    courseId: number,
  ): Promise<CourseV5Overview> => {
    return await axiosClient.get(`/courses/${courseId}/learning`);
  },

  getCourseLearningLesson: async (
    courseId: number,
    lessonId: number,
  ): Promise<CourseV5LessonDetail> => {
    return await axiosClient.get(
      `/courses/${courseId}/learning/lessons/${lessonId}`,
    );
  },

  submitCourseLearningExercise: async (
    courseId: number,
    lessonId: number,
    exerciseId: number,
    answers: Array<{ questionId: number; answer: unknown }>,
  ): Promise<CourseV5SubmitResult> => {
    return await axiosClient.post(
      `/courses/${courseId}/learning/lessons/${lessonId}/exercises/${exerciseId}/submit`,
      { answers },
    );
  },

  getClassById: async (classId: number): Promise<ClassDetail> => {
    return await axiosClient.get(`/courses/classes/${classId}`);
  },

  getMyLearningClasses: async (): Promise<StudentLearningClass[]> => {
    return await axiosClient.get("/classes");
  },

  // Canonical Public Discovery APIs (Phase 3A)
  getPublicCatalog: async (): Promise<PublicCourseCard[]> => {
    return await axiosClient.get("/public/courses");
  },

  getPublicCourseDetail: async (id: number): Promise<PublicCourseDetail> => {
    return await axiosClient.get(`/public/courses/${id}`);
  },

  // Self-Enrollment APIs (Phase 3B)
  enrollInClass: async (classId: number): Promise<EnrollResponseDto> => {
    return await axiosClient.post(`/courses/classes/${classId}/enroll`);
  },

  getMyCourseEnrollments: async (
    courseId: number,
  ): Promise<StudentCourseEnrollment[]> => {
    return await axiosClient.get(`/courses/${courseId}/my-enrollments`);
  },
};
