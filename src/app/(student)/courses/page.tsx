"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BookOpen, Loader2, ArrowRight, Users, Calendar,
  Video, UserCircle, Clock, AlertCircle
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import axiosClient from "@/lib/api/axiosClient";

type EnrolledClass = {
  classId: number;
  className: string;
  classStatus: string;
  meetingLink: string | null;
  startDate: string | null;
  endDate: string | null;
  progress: number;
  enrollmentStatus: string;
  joinedAt: string;
  studentCount: number;
  teacher: { id: number; email: string; profile: { fullName: string; avatar: string | null } | null } | null;
  course: {
    id: number; title: string; thumbnail: string | null; description: string | null; level: string | null;
  };
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Đang học", className: "bg-green-100 text-green-700" },
  UPCOMING: { label: "Sắp khai giảng", className: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Đã kết thúc", className: "bg-slate-100 text-slate-600" },
};

const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: "Cơ bản", INTERMEDIATE: "Trung cấp", ADVANCED: "Nâng cao",
};

export default function CoursesPage() {
  const { user } = useAuthStore();

  const { data: classes, isLoading, error } = useQuery<EnrolledClass[]>({
    queryKey: ["my-enrolled-classes", user?.id],
    queryFn: async () => {
      const res = await axiosClient.get("/courses");
      return res.data;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <Loader2 className="animate-spin text-junior-green" size={48} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-junior-green p-4 rounded-2xl text-white">
          <BookOpen size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-slate-800">Lớp học của tôi</h1>
          <p className="text-slate-500 font-medium mt-1">
            {classes && classes.length > 0
              ? `Bạn đang tham gia ${classes.length} lớp học.`
              : "Chưa có lớp học nào được ghi danh."}
          </p>
        </div>
      </div>

      {/* Classes Grid */}
      {classes && classes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls, index) => {
            const badge = STATUS_BADGE[cls.classStatus] || { label: cls.classStatus, className: "bg-slate-100 text-slate-600" };
            return (
              <motion.div
                key={cls.classId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-[2rem] border-4 border-slate-200 overflow-hidden shadow-sm flex flex-col"
              >
                {/* Thumbnail */}
                <div className="h-44 bg-sky-100 relative overflow-hidden">
                  {cls.course.thumbnail ? (
                    <img src={cls.course.thumbnail} alt={cls.course.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen size={60} className="text-sky-200" />
                    </div>
                  )}
                  {/* Status badge */}
                  <div className={`absolute top-3 left-3 px-3 py-1 rounded-xl text-xs font-bold ${badge.className}`}>
                    {badge.label}
                  </div>
                  {/* Level badge */}
                  {cls.course.level && (
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-xl text-slate-600 font-bold text-xs">
                      {LEVEL_LABEL[cls.course.level] || cls.course.level}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col">
                  {/* Course name */}
                  <p className="text-xs font-bold text-junior-blue uppercase tracking-wide mb-1">{cls.course.title}</p>
                  {/* Class name */}
                  <h3 className="text-xl font-bold text-slate-800 mb-3 line-clamp-2">{cls.className}</h3>

                  {/* Teacher */}
                  <div className="flex items-center gap-2 mb-2">
                    <UserCircle size={16} className="text-slate-400 flex-shrink-0" />
                    <span className="text-sm text-slate-500 truncate">
                      {cls.teacher?.profile?.fullName || cls.teacher?.email || "Chưa có giáo viên"}
                    </span>
                  </div>

                  {/* Students */}
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={16} className="text-slate-400 flex-shrink-0" />
                    <span className="text-sm text-slate-500">{cls.studentCount} học viên</span>
                    {cls.startDate && (
                      <>
                        <span className="text-slate-300 mx-1">•</span>
                        <Calendar size={14} className="text-slate-400" />
                        <span className="text-sm text-slate-500">
                          {new Date(cls.startDate).toLocaleDateString("vi-VN")}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Tiến độ học</span>
                      <span className="font-bold text-junior-green">{cls.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <motion.div
                        className="bg-junior-green h-2.5 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${cls.progress}%` }}
                        transition={{ delay: index * 0.08 + 0.3, duration: 0.8 }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-auto flex flex-col gap-2">
                    <Link href={`/courses/${cls.course.id}?classId=${cls.classId}`} className="w-full">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full btn-green-3d flex items-center justify-center gap-2 bg-junior-green text-white font-bold p-3 rounded-xl"
                      >
                        Vào Học <ArrowRight size={20} strokeWidth={3} />
                      </motion.button>
                    </Link>

                    {cls.meetingLink && (
                      <a href={cls.meetingLink} target="_blank" rel="noopener noreferrer" className="w-full">
                        <button className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm">
                          <Video size={16} className="text-blue-500" /> Vào Phòng học Online
                        </button>
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-12 rounded-[2rem] border-4 border-slate-200 text-center"
        >
          <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5">
            <BookOpen size={36} className="text-slate-300" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Chưa có lớp học nào</h2>
          <p className="text-slate-500 font-medium max-w-sm mx-auto">
            Bạn chưa được ghi danh vào lớp học nào. Vui lòng liên hệ với quản trị viên để được thêm vào lớp học.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-3 rounded-xl border border-amber-200 max-w-sm mx-auto">
            <AlertCircle size={16} />
            <span>Liên hệ Admin nếu bạn đã đóng học phí nhưng chưa được vào lớp.</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
