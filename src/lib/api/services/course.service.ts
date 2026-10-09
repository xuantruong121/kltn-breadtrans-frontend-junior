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
  kind: "LESSON" | "LISTENING" | "SPEAKING" | "READING" | "WRITING";
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
  nextActivity: { id: string; route: string | null; title: string } | null;
  activities: Array<{
    id: string;
    lessonId?: number;
    order?: number;
    kind: string;
    title: string;
    required: boolean;
    completed: boolean;
    route: string | null;
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
  quizzes?: Array<{
    id: number;
    title: string;
    type: string;
    isPremiumContent?: boolean;
  }>;
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
  upcomingClassCount: number;
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
  classes: PublicClass[];
  curriculum?: CourseCurriculum;
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
