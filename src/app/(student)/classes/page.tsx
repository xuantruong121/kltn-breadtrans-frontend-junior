"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, Users, Calendar, Video, Clock, ArrowRight, Loader2, Sparkles, GraduationCap } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { Button3D } from "@/components/ui";

const MOCK_CLASSES = [
  {
    id: 1,
    name: "Lớp Tiếng Anh Giao Tiếp Junior A1",
    course: { title: "Tiếng Anh Khởi Động Cho Thiếu Nhi" },
    teacher: { fullName: "Cô Mai Anh" },
    schedule: "Thứ 3 - Thứ 5 (19:30 - 21:00)",
    nextSession: {
      title: "Buổi 5: Luyện phát âm phụ âm và từ vựng trường học",
      startTime: "2026-08-22T19:30:00",
      meetingLink: "https://meet.google.com/abc-defg-hij",
    },
    totalStudents: 15,
    completedLessons: 4,
    totalLessons: 12,
  },
  {
    id: 2,
    name: "Lớp Luyện Kỹ Năng Đọc & Viết TOEIC Junior",
    course: { title: "Chinh Phục Ngữ Pháp & Đọc Hiểu Song Ngữ" },
    teacher: { fullName: "Thầy Hoàng Long" },
    schedule: "Thứ 7 - Chủ Nhật (09:00 - 10:30)",
    nextSession: {
      title: "Buổi 2: Các thì căn bản và mẹo làm Part 5",
      startTime: "2026-08-23T09:00:00",
      meetingLink: "https://meet.google.com/xyz-uvwx-rst",
    },
    totalStudents: 12,
    completedLessons: 1,
    totalLessons: 10,
  },
];

export default function StudentClassesPage() {
  const { data: serverClasses, isLoading } = useQuery<any[]>({
    queryKey: ["my-enrolled-classes"],
    queryFn: async () => {
      try {
        const res: any = await axiosClient.get("/classes");
        return res?.data || res || [];
      } catch {
        return [];
      }
    },
  });

  const classes = (serverClasses && serverClasses.length > 0) ? serverClasses : MOCK_CLASSES;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-[2rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🏫</span>
            <h1 className="text-3xl font-black text-slate-800">Lớp Học Của Tôi</h1>
          </div>
          <p className="font-bold text-slate-400 text-sm">
            Theo dõi lịch học, tham gia phòng học trực tuyến và nộp bài tập về nhà
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-sky-500" size={48} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {classes.map((cls) => {
            const progress = Math.round(((cls.completedLessons || 1) / (cls.totalLessons || 10)) * 100);

            return (
              <motion.div
                key={cls.id}
                whileHover={{ y: -4 }}
                className="bg-white rounded-[2.5rem] border-4 border-slate-200 shadow-[0_10px_0_0_#e2e8f0] p-6 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="bg-blue-100 text-blue-800 font-extrabold text-xs px-3 py-1 rounded-full border border-blue-200">
                      {cls.course?.title || "Khóa học"}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400 text-xs font-bold">
                      <Users size={14} /> {cls.totalStudents || 12} bạn
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-slate-800 leading-snug mb-1">
                      {cls.name}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                      <GraduationCap size={14} className="text-emerald-500" /> Giáo viên: {cls.teacher?.fullName || "Giáo viên BreadTrans"}
                    </p>
                  </div>

                  {/* Schedule & Next Session Card */}
                  <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-black text-sky-800 uppercase tracking-wider">
                      <Calendar size={14} className="text-sky-600" /> {cls.schedule || "Lịch học linh hoạt"}
                    </div>
                    {cls.nextSession && (
                      <div>
                        <p className="text-xs font-bold text-slate-600 line-clamp-1">
                          👉 Buổi tới: {cls.nextSession.title}
                        </p>
                        {cls.nextSession.meetingLink && (
                          <a
                            href={cls.nextSession.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 mt-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-xs transition-colors"
                          >
                            <Video size={14} /> Vào phòng Meet ngay
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                      <span>Tiến độ bài học</span>
                      <span className="text-slate-700 font-extrabold">{cls.completedLessons || 1} / {cls.totalLessons || 10} bài</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="bg-junior-green h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t-2 border-slate-100 mt-4 flex items-center justify-end">
                  <Link href={`/classes/${cls.id}`} className="w-full">
                    <Button3D variant="blue" size="md" className="w-full">
                      Vào lớp học <ArrowRight size={18} />
                    </Button3D>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
