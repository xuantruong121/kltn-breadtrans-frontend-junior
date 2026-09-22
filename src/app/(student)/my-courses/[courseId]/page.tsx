"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, PlayCircle, Star, Users } from "lucide-react";
import { courseService } from "@/lib/api/services/course.service";
import { BackButton } from "@/components/ui";
import { use } from "react";

export default function CourseDetailPage(props: { params: Promise<{ courseId: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const courseId = parseInt(params.courseId);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => courseService.getCourseById(courseId),
    enabled: !isNaN(courseId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <Loader2 className="animate-spin text-junior-green" size={48} />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center p-12">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Không tìm thấy khóa học</h2>
        <button onClick={() => router.back()} className="mt-4 text-junior-blue font-bold cursor-pointer">Quay lại</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <div className="mb-6">
        <BackButton label="Quay lại danh sách khóa học" href="/my-courses" />
      </div>

      {/* Hero Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm mb-8">
        <div className="h-64 bg-junior-green/10 relative">
          {course.thumbnailUrl ? (
            <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-junior-green to-teal-500" />
          )}
          <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-4 py-2 rounded-xl text-junior-orange font-bold flex items-center gap-2 shadow-sm border border-slate-200/50 dark:border-slate-700/50">
            <Star size={20} fill="currentColor" /> {course.level || "ALL LEVEL"}
          </div>
        </div>
        <div className="p-8">
          <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-4">{course.title}</h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 font-medium mb-6">
            {course.description || "Đây là một khóa học tuyệt vời dành cho bạn. Hãy khám phá ngay nhé!"}
          </p>
          <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 font-bold">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
              <Users size={20} /> {(course.classes?.length || 0)} Lớp học
            </div>
          </div>
        </div>
      </div>

      {/* Classes List */}
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">Danh sách Lớp học</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {course.classes && course.classes.length > 0 ? (
          course.classes.map((c, index) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
            >
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{c.name}</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mb-4">
                  Tham gia vào lớp học này để xem các bài giảng chi tiết nhé.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Link href={`/classes/${c.id}`} className="w-full">
                  <button className="flex items-center justify-center gap-2 bg-sky-100 dark:bg-sky-950/50 text-junior-blue dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-900/50 transition-colors font-bold p-3 rounded-xl w-full cursor-pointer">
                    <PlayCircle size={20} /> Xem Tài Liệu
                  </button>
                </Link>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full bg-slate-50 dark:bg-slate-850 p-8 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-center">
            <p className="text-slate-500 dark:text-slate-400 font-medium">Khóa học này chưa có lớp nào được mở.</p>
          </div>
        )}
      </div>
    </div>
  );
}
