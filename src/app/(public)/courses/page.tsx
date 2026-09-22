"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Search, ArrowRight, BookOpen, Calendar, AlertCircle } from "lucide-react";
import { courseService, PublicCourseCard } from "@/lib/api/services/course.service";

export default function PublicCoursesPage() {
  const [courses, setCourses] = useState<PublicCourseCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("ALL");

  useEffect(() => {
    let isMounted = true;
    courseService
      .getPublicCatalog()
      .then((data) => {
        if (isMounted) {
          setCourses(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error fetching catalog:", err);
        if (isMounted) {
          setError("Không thể tải danh sách khóa học lúc này. Vui lòng thử lại sau.");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesLevel =
        selectedLevel === "ALL" ||
        (c.level && c.level.toUpperCase() === selectedLevel.toUpperCase());

      return matchesSearch && matchesLevel;
    });
  }, [courses, searchQuery, selectedLevel]);

  const levelOptions = [
    { label: "Tất cả", value: "ALL" },
    { label: "Beginner", value: "BEGINNER" },
    { label: "Intermediate", value: "INTERMEDIATE" },
    { label: "Advanced", value: "ADVANCED" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* 1. Header */}
      <div className="space-y-4 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 dark:bg-blue-950/50 dark:border-blue-800/80 dark:text-blue-300 font-bold text-xs uppercase tracking-wider">
          Chương trình học chuẩn hóa
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Danh mục Khóa học
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
          Tìm kiếm và lựa chọn lộ trình đào tạo tiếng Anh phù hợp nhất với năng lực và mục tiêu học tập.
        </p>
      </div>

      {/* 2. Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Tìm theo tên khóa học hoặc nội dung..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-blue-600 transition-colors"
          />
        </div>

        {/* Level Pills */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mr-1 hidden sm:inline">Trình độ:</span>
          {levelOptions.map((opt) => {
            const isSelected = selectedLevel === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelectedLevel(opt.value)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-blue-600 text-white dark:bg-blue-500 shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-750 dark:hover:text-slate-200"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 rounded-2xl flex items-center gap-3">
          <AlertCircle size={20} className="shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* 4. Course Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div key={idx} className="h-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 animate-pulse space-y-4">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full w-24" />
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-3/4" />
              <div className="h-16 bg-slate-100 dark:bg-slate-850 rounded-lg w-full" />
              <div className="h-8 bg-slate-100 dark:bg-slate-850 rounded-xl w-full pt-4" />
            </div>
          ))}
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
            >
              <div className="space-y-4">
                {/* Badges row */}
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60 uppercase tracking-wide">
                    {course.level || "Cơ bản"}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <Calendar size={14} className="text-slate-400 dark:text-slate-500" />
                    <span>
                      {course.upcomingClassCount > 0
                        ? `${course.upcomingClassCount} gói học đang mở`
                        : "Đang cập nhật"}
                    </span>
                  </div>
                </div>

                {/* Course Title */}
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                  {course.title}
                </h2>

                {/* Description */}
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                  {course.description || "Khóa học được giảng dạy theo khung chuẩn, tập trung phát triển kỹ năng thực tế cho học viên."}
                </p>
              </div>

              {/* Card Footer */}
              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {/* Academic info */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 text-blue-600 dark:bg-blue-950/50 dark:border-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                    <BookOpen size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Tự học theo tiến độ
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Hỗ trợ học tập 24/7</span>
                  </div>
                </div>

                {/* Detail Link */}
                <Link
                  href={`/courses/${course.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-blue-600 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 transition-colors"
                >
                  Xem chi tiết
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto">
          <BookOpen className="mx-auto text-slate-300 dark:text-slate-600" size={48} />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Không tìm thấy khóa học phù hợp</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Hãy thử tìm kiếm với từ khóa khác hoặc bỏ chọn bộ lọc trình độ để xem thêm khóa học.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedLevel("ALL");
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 transition-colors cursor-pointer"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      )}
    </div>
  );
}
