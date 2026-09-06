import axiosClient from "../axiosClient";

export interface Class {
  id: number;
  name: string;
  courseId: number;
  teacherId: number;
  startDate?: string | null;
  endDate?: string | null;
  capacity?: number;
  tuitionFeeVnd?: number;
  status?: string;
  meetingLink?: string | null;
  studentCount?: number;
  activeEnrollmentCount?: number;
  totalEnrollmentCount?: number;
  hasEnrollments?: boolean;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  thumbnail?: string;
  level: string; // e.g., "BEGINNER", "INTERMEDIATE"
  status?: string;
  teacherId?: number;
  classes?: Class[];
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
  teacher: {
    id: number;
    email: string;
    profile: {
      fullName: string;
    };
  };
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
  teacher: PublicTeacher;
  upcomingClassCount: number;
}

export interface PublicClass {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  capacity: number;
  tuitionFeeVnd: number;
  currentEnrollmentCount: number;
  remainingSeats: number;
  isSoldOut: boolean;
  status: string;
  teacher: PublicTeacher;
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
  teacher: PublicTeacher;
  lessons: PublicLessonOutline[];
  classes: PublicClass[];
}

export interface EnrollResponseDto {
  enrollmentId: number;
  classId: number;
  status: 'ACTIVE' | 'PENDING_PAYMENT';
  tuitionFeeVnd: number;
  accessGranted: boolean;
  message: string;
}

export interface StudentCourseEnrollment {
  id: number;
  classId: number;
  status: 'ACTIVE' | 'PENDING_PAYMENT' | 'COMPLETED' | 'DROPPED';
  joinedAt: string;
}

export const courseService = {
  getAllCourses: async (): Promise<Course[]> => {
    return await axiosClient.get("/courses");
  },
  
  getCourseById: async (id: number): Promise<Course> => {
    return await axiosClient.get(`/courses/${id}`);
  },

  getClassById: async (classId: number): Promise<ClassDetail> => {
    return await axiosClient.get(`/courses/classes/${classId}`);
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
