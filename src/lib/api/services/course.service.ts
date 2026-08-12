import axiosClient from "../axiosClient";

export interface Class {
  id: number;
  name: string;
  courseId: number;
  teacherId: number;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  level: string; // e.g., "BEGINNER", "INTERMEDIATE"
  price: number;
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
    }
  };
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
  }
};
