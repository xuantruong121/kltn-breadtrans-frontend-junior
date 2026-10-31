"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  ArrowRight,
  BookOpen,
  AlertCircle,
  RotateCw,
} from "lucide-react";
import {
  courseService,
  PublicCourseCard,
} from "@/lib/api/services/course.service";
import { getCourseCardMedia } from "@/lib/course/catalogVisual";
import { getCourseLevelFilterKey } from "@/lib/course/courseLevel";
import { levelLabel } from "@/lib/ui/displayLabels";

function CourseCard({ course }: { course: PublicCourseCard }) {
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const media = getCourseCardMedia(course);
  const activeMediaSrc = mediaSrc ?? media.src;

  return (
    <article className="group flex min-h-[470px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-slate-800">
        {activeMediaSrc ? (
          <Image
            src={activeMediaSrc}
            alt={media.alt}
            fill
            sizes="(min-width: 1536px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.025]"
            onError={() => setMediaSrc(null)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400 dark:text-slate-500">
            <BookOpen size={42} aria-hidden="true" />
            <span className="sr-only">{media.alt}</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-slate-950/70 to-transparent px-5 pb-4 pt-12">
          <span className="rounded-full border border-white/40 bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-800">
            {levelLabel(course.level) || "Cơ bản"}
          </span>
          <span className="rounded-full border border-white/30 bg-slate-950/65 px-3 py-1 text-xs font-semibold text-white">
            {course.canAccess ? "Được truy cập" : "Gói PRO"}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between p-6">
        <div className="space-y-3">
          <h2 className="line-clamp-2 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 transition-colors group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
            {course.title}
          </h2>
          <p className="line-clamp-3 min-h-[4.5rem] text-base leading-relaxed text-slate-600 dark:text-slate-400">
            {course.description ||
              "Khóa học được giảng dạy theo khung chuẩn, tập trung phát triển kỹ năng thực tế cho học viên."}
          </p>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300">
                <BookOpen size={18} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-200">
                  Tự học theo tiến độ
                </span>
                <span className="block truncate text-xs font-medium text-slate-400 dark:text-slate-500">
                  Tự học theo lộ trình
                </span>
              </div>
            </div>
            <Link
              href={`/courses/${course.id}`}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Xem chi tiết
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function PublicCoursesPage() {
  const [courses, setCourses] = useState<PublicCourseCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("ALL");

  const loadCourses = useCallback(() => {
    setIsLoading(true);
    setError(null);
    courseService
      .getPublicCatalog()
      .then((data) => {
        setCourses(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching catalog:", err);
        setError(
          "Không thể tải danh sách khóa học lúc này. Vui lòng thử lại sau.",
        );
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description &&
          c.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesLevel =
        selectedLevel === "ALL" ||
        getCourseLevelFilterKey(c.level) === selectedLevel;

      return matchesSearch && matchesLevel;
    });
  }, [courses, searchQuery, selectedLevel]);

  const levelOptions = [
    { label: "Tất cả", value: "ALL" },
    { label: "Cơ bản", value: "BEGINNER" },
    { label: "Trung cấp", value: "INTERMEDIATE" },
    { label: "Nâng cao", value: "ADVANCED" },
  ];

  return (
    <div className="w-full space-y-6 px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8">
      {/* Compact catalog header */}
      <div className="space-y-2.5">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Danh sách khóa học
        </h1>
        <p className="max-w-4xl text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-300">
          Tìm kiếm và lựa chọn lộ trình đào tạo tiếng Anh phù hợp nhất với năng
          lực và mục tiêu học tập.
        </p>
      </div>

      {/* Search & level filters */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 md:flex-row">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            size={20}
          />
          <input
            type="text"
            placeholder="Tìm theo tên khóa học hoặc nội dung..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-base font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-blue-600 transition-colors"
          />
        </div>

        {/* Level Pills */}
        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500 mr-1 hidden sm:inline">
            Trình độ:
          </span>
          {levelOptions.map((opt) => {
            const isSelected = selectedLevel === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelectedLevel(opt.value)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shrink-0 cursor-pointer ${
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
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 rounded-2xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button
            type="button"
            onClick={loadCourses}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900/70 text-red-800 dark:text-red-200 transition-colors cursor-pointer disabled:opacity-60"
          >
            <RotateCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span>Tải lại</span>
          </button>
        </div>
      )}

      {/* 4. Course Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="h-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 animate-pulse space-y-4"
            >
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full w-24" />
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-3/4" />
              <div className="h-16 bg-slate-100 dark:bg-slate-850 rounded-lg w-full" />
              <div className="h-8 bg-slate-100 dark:bg-slate-850 rounded-xl w-full pt-4" />
            </div>
          ))}
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-4 max-w-lg mx-auto">
          <BookOpen
            className="mx-auto text-slate-300 dark:text-slate-600"
            size={48}
          />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {error ? "Không thể tải danh sách khóa học" : "Không tìm thấy khóa học phù hợp"}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {error
              ? "Hệ thống gặp sự cố kết nối. Vui lòng bấm nút bên dưới để tải lại."
              : "Hãy thử tìm kiếm với từ khóa khác hoặc bấm tải lại để làm mới danh sách khóa học."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedLevel("ALL");
                loadCourses();
              }}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 transition-colors cursor-pointer shadow-xs disabled:opacity-60"
            >
              <RotateCw size={13} className={isLoading ? "animate-spin" : ""} />
              <span>Tải lại</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
