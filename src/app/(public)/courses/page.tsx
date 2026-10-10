"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  ArrowRight,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import {
  courseService,
  PublicCourseCard,
} from "@/lib/api/services/course.service";
import { getCourseCardMedia } from "@/lib/course/catalogVisual";

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
            onError={() => setMediaSrc(media.fallbackSrc)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400 dark:text-slate-500">
            <BookOpen size={42} aria-hidden="true" />
            <span className="sr-only">{media.alt}</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-slate-950/70 to-transparent px-5 pb-4 pt-12">
          <span className="rounded-full border border-white/40 bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-800">
            {course.level || "Cơ bản"}
          </span>
          <span className="rounded-full border border-white/30 bg-slate-950/65 px-3 py-1 text-[11px] font-semibold text-white">
            {course.canAccess ? "Được truy cập" : "Gói PRO"}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between p-6">
        <div className="space-y-3">
          <h2 className="line-clamp-2 text-xl font-bold tracking-tight text-slate-900 transition-colors group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
            {course.title}
          </h2>
          <p className="line-clamp-3 min-h-[4.5rem] text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {course.description ||
              "Khóa học được giảng dạy theo khung chuẩn, tập trung phát triển kỹ năng thực tế cho học viên."}
          </p>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300">
                <BookOpen size={16} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <span className="block truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                  Tự học theo tiến độ
                </span>
                <span className="block truncate text-[10px] font-medium text-slate-400 dark:text-slate-500">
                  Tự học theo lộ trình
                </span>
              </div>
            </div>
            <Link
              href={`/courses/${course.id}`}
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Xem chi tiết
              <ArrowRight size={14} aria-hidden="true" />
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
          setError(
            "Không thể tải danh sách khóa học lúc này. Vui lòng thử lại sau.",
          );
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
        (c.description &&
          c.description.toLowerCase().includes(searchQuery.toLowerCase()));

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
    <div className="mx-auto w-full max-w-[1680px] space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 2xl:px-10">
      {/* Compact catalog header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Danh mục Khóa học
        </h1>
        <p className="max-w-4xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
          Tìm kiếm và lựa chọn lộ trình đào tạo tiếng Anh phù hợp nhất với năng
          lực và mục tiêu học tập.
        </p>
      </div>

      {/* Search & level filters */}
      <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900 md:flex-row">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            size={18}
          />
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
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mr-1 hidden sm:inline">
            Trình độ:
          </span>
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto">
          <BookOpen
            className="mx-auto text-slate-300 dark:text-slate-600"
            size={48}
          />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Không tìm thấy khóa học phù hợp
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Hãy thử tìm kiếm với từ khóa khác hoặc bỏ chọn bộ lọc trình độ để
            xem thêm khóa học.
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
