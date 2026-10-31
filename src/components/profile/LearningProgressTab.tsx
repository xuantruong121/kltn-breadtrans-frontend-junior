"use client";

import { COURSES_ENABLED } from "@/lib/featureFlags";
import Link from "next/link";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Headphones,
  Mic,
  PenTool,
  TrendingUp,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import {
  userService,
  type SkillProgressSummary,
} from "@/lib/api/services/user.service";
import { courseService, type CourseV5Overview } from "@/lib/api/services/course.service";
import { courseLessonPath } from "@/lib/course/navigation";
import {
  computeWeeklyActivity,
  groupRecentActivities,
  getSkillDisplayMetrics,
  getLearnerMilestones,
  formatFriendlyDate,
} from "./learningProgressLogic";
import { levelLabel } from "@/lib/ui/displayLabels";

const SKILL_THEME: Record<
  SkillProgressSummary["skill"],
  {
    icon: typeof Headphones;
    accentText: string;
    accentBg: string;
    progressBar: string;
  }
> = {
  LISTENING: {
    icon: Headphones,
    accentText: "text-blue-600 dark:text-blue-400",
    accentBg: "bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/60",
    progressBar: "bg-blue-600 dark:bg-blue-500",
  },
  SPEAKING: {
    icon: Mic,
    accentText: "text-teal-600 dark:text-teal-400",
    accentBg: "bg-teal-50 dark:bg-teal-950/40 border-teal-100 dark:border-teal-900/60",
    progressBar: "bg-teal-600 dark:bg-teal-500",
  },
  READING: {
    icon: BookOpen,
    accentText: "text-emerald-600 dark:text-emerald-400",
    accentBg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/60",
    progressBar: "bg-emerald-600 dark:bg-emerald-500",
  },
  WRITING: {
    icon: PenTool,
    accentText: "text-rose-600 dark:text-rose-400",
    accentBg: "bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/60",
    progressBar: "bg-rose-600 dark:bg-rose-500",
  },
};

const STATUS_BADGE_STYLE: Record<
  "emerald" | "amber" | "slate" | "blue",
  string
> = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  amber: "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
  slate: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  blue: "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
};

export function LearningProgressTab() {
  const user = useAuthStore((state) => state.user);
  const [showAllActivities, setShowAllActivities] = useState(false);

  // 1. Skill progress
  const {
    data: skillsData,
    isLoading: isSkillsLoading,
    isError: isSkillsError,
  } = useQuery({
    queryKey: ["account-learning-progress", user?.id],
    queryFn: userService.getSkillProgress,
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  });

  // 2. Learning history
  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["account-learning-history", user?.id],
    queryFn: () => userService.getLearningHistory(),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  });

  // 3. User stats (streak, mastered vocab)
  const { data: statsData } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: userService.getStats,
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });

  // 4. Canonical Course V5 progress. Enrollment.progress is legacy class data,
  // not the learner's actual lesson completion record.
  const { data: courseOverviews } = useQuery({
    queryKey: ["course-v5-learning-progress", user?.id],
    queryFn: async (): Promise<CourseV5Overview[]> => {
      const catalog = await courseService.getPublicCatalog();
      const accessibleCourses = catalog.filter((course) => course.canAccess);
      return Promise.all(
        accessibleCourses.map((course) =>
          courseService.getCourseLearningOverview(course.id),
        ),
      );
    },
    enabled: COURSES_ENABLED && Boolean(user?.id),
    staleTime: 60_000,
  });

  const learningCourses = useMemo(
    () =>
      (courseOverviews ?? []).filter(
        (course) => course.progress.totalLessons > 0,
      ),
    [courseOverviews],
  );

  // 5. Daily practice recommendations (fallback for Continue Learning)
  const { data: dailyPractice } = useQuery({
    queryKey: ["daily-practice", user?.id],
    queryFn: userService.getDailyPractice,
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });

  const skills = useMemo(() => skillsData?.skills ?? [], [skillsData?.skills]);
  const overall = skillsData?.overall;

  // Compute Weekly Activity (7 days)
  const weeklyActivity = useMemo(
    () => computeWeeklyActivity(historyData?.activities ?? []),
    [historyData?.activities],
  );

  // Group Recent Activities
  const groupedActivities = useMemo(
    () => groupRecentActivities(historyData?.activities ?? []),
    [historyData?.activities],
  );

  // Extract Truthful Milestones
  const milestones = useMemo(
    () => getLearnerMilestones(statsData, overall?.completedItems ?? 0),
    [statsData, overall?.completedItems],
  );

  // Resumable Continue Learning Item
  const resumableItem = useMemo(() => {
    // Priority 1: unfinished Course V5 lesson with a learner-safe route.
    if (learningCourses.length > 0) {
      const activeUnfinished = learningCourses.find(
        (course) =>
          course.progress.totalLessons > 0 && !course.progress.isComplete,
      );
      if (activeUnfinished) {
        const nextLesson = activeUnfinished.lessons.find(
          (lesson) => !lesson.completed,
        );
        return {
          type: "COURSE" as const,
          badge: "Khóa học đang học",
          title: activeUnfinished.course.title,
          subtitle: `${activeUnfinished.progress.completedLessons}/${activeUnfinished.progress.totalLessons} bài học đã hoàn thành`,
          progress: activeUnfinished.progress.percentage,
          route: nextLesson
            ? courseLessonPath(activeUnfinished.course.id, nextLesson.id)
            : `/my-courses/${activeUnfinished.course.id}`,
          ctaText: "Tiếp tục học",
        };
      }
    }

    // Priority 2: Unfinished daily practice item
    if (dailyPractice?.items && dailyPractice.items.length > 0) {
      const pendingPractice = dailyPractice.items.find((item) => !item.isCompleted);
      if (pendingPractice) {
        return {
          type: "PRACTICE" as const,
          badge: "Luyện tập hôm nay",
          title: pendingPractice.title,
          subtitle: pendingPractice.reasonLabel,
          progress: null,
          route: pendingPractice.route,
          ctaText: "Luyện tập ngay",
        };
      }
    }

    // Fallback: General discovery
    return {
      type: "DISCOVERY" as const,
      badge: "Sẵn sàng học tiếp",
      title: "Chọn nội dung để tiếp tục luyện tập",
      subtitle: "Chọn một trong bốn kỹ năng bên dưới hoặc luyện một đề TOEIC.",
      progress: null,
      route: "/exams",
      ctaText: "Luyện đề TOEIC",
    };
  }, [dailyPractice, learningCourses]);

  if (isSkillsLoading && isHistoryLoading) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-6 pb-12 animate-pulse" aria-label="Đang tải tiến độ học tập">
        <div className="h-8 w-60 rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
        <div className="h-36 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (isSkillsError) {
    return (
      <div className="mx-auto max-w-[1200px] rounded-xl border border-rose-200 bg-rose-50/60 p-6 text-sm font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
        Không thể tải dữ liệu tiến độ học tập. Vui lòng thử lại sau.
      </div>
    );
  }

  const streak = statsData?.streakCount ?? overall?.currentStreak ?? 0;
  const completedTotal = overall?.completedItems ?? 0;
  const masteredVocab = statsData?.masteredVocabCount ?? 0;
  const latestDateDisplay = formatFriendlyDate(historyData?.activities?.[0]?.occurredAt);

  const visibleActivities = showAllActivities
    ? groupedActivities
    : groupedActivities.slice(0, 6);

  return (
    <div className="mx-auto max-w-[1200px] space-y-7 pb-12">
      {/* 1. Top Header */}
      <header className="border-b border-slate-200/80 pb-4 dark:border-slate-800">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Tiến độ học tập
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Theo dõi quá trình học và tiếp tục từ nơi bạn đã dừng lại.
            </p>
          </div>
          {streak > 0 && (
            <div className="mt-2 inline-flex items-center gap-1.5 self-start rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-300 sm:mt-0 sm:self-auto">
              <Flame className="h-4 w-4 text-amber-500" />
              <span>Chuỗi {streak} ngày</span>
            </div>
          )}
        </div>
      </header>

      {/* 2. Overview Summary Strip */}
      <section aria-label="Tổng quan tiến độ" className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Bài luyện đã hoàn thành</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
            {completedTotal}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Tổng bài luyện thuộc bốn kỹ năng
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Chuỗi học</span>
            <Flame className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
            {streak} <span className="text-xs font-normal text-slate-500">ngày</span>
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {streak > 0 ? "Duy trì đều đặn" : "Bắt đầu bài học hôm nay"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Từ đã ghi nhớ</span>
            <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
            {masteredVocab}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Từ vựng qua bài ôn SRS
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Học gần nhất</span>
            <Clock className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            {latestDateDisplay}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Thời điểm tương tác cuối
          </p>
        </div>
      </section>

      {/* 3. Continue Learning — High Priority */}
      <section aria-labelledby="continue-learning-title">
        <div className="bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200/90 p-5 shadow-xs dark:border-blue-900/60">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-100/70 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-blue-700 dark:border-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                  {resumableItem.badge}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Gợi ý tiếp theo
                </span>
              </div>
              <h2
                id="continue-learning-title"
                className="text-lg font-bold text-slate-950 dark:text-white truncate"
              >
                {resumableItem.title}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                {resumableItem.subtitle}
              </p>

              {resumableItem.progress != null && (
                <div className="pt-1 max-w-md">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    <span>Tiến độ khóa học</span>
                    <span className="font-mono tabular-nums">{resumableItem.progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-500 dark:bg-blue-500"
                      style={{ width: `${Math.min(100, Math.max(4, resumableItem.progress))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <Link
              href={resumableItem.route}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-[0.98] dark:bg-blue-600 dark:hover:bg-blue-500 sm:self-center"
            >
              <span>{resumableItem.ctaText}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Four Skills Section */}
      <section aria-labelledby="skills-heading" className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="skills-heading" className="text-base font-bold text-slate-900 dark:text-slate-100">
              Bốn kỹ năng cốt lõi
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tổng hợp tiến độ và đánh giá năng lực thực tế qua các bài luyện.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {skills.map((skill) => {
            const theme = SKILL_THEME[skill.skill];
            const metrics = getSkillDisplayMetrics(skill);
            const Icon = theme.icon;

            return (
              <article
                key={skill.skill}
                className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <div>
                  {/* Skill Card Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${theme.accentBg} ${theme.accentText}`}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {skill.title}
                        </h3>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {skill.categoryLabel}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE_STYLE[metrics.statusColor]}`}
                    >
                      {metrics.statusLabel}
                    </span>
                  </div>

                  {/* Primary & Progress */}
                  <div className="mt-4 flex items-baseline justify-between gap-2">
                    <div>
                      <p className="font-mono text-2xl font-bold tracking-tight text-slate-950 tabular-nums dark:text-white">
                        {metrics.primaryValue}
                      </p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {metrics.primarySub}
                      </p>
                    </div>
                    {metrics.percent > 0 && (
                      <span className="font-mono text-sm font-bold text-slate-700 tabular-nums dark:text-slate-300">
                        {metrics.percent}%
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${theme.progressBar}`}
                      style={{
                        width: `${Math.min(100, Math.max(metrics.percent > 0 ? 3 : 0, metrics.percent))}%`,
                      }}
                    />
                  </div>

                  {/* Secondary score label */}
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-medium">{metrics.scoreText}</span>
                    {skill.trend && skill.trend !== "INSUFFICIENT_DATA" && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <TrendingUp className="h-3 w-3 text-slate-400" />
                        {skill.trend === "IMPROVING"
                          ? "Chiều hướng tăng"
                          : skill.trend === "DECLINING"
                            ? "Cần chú ý"
                            : "Phong độ ổn định"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action */}
                <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <Link
                    href={metrics.ctaHref}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-600 transition dark:text-slate-300 dark:hover:text-blue-400"
                  >
                    <span>{metrics.ctaLabel}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 5. Course Progress & Weekly Activity (Balanced Split Layout) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Course Progress (7 cols) */}
        {COURSES_ENABLED && (
        <section
          aria-labelledby="course-progress-heading"
          className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h2
                  id="course-progress-heading"
                  className="text-base font-bold text-slate-900 dark:text-slate-100"
                >
                  Tiến độ khóa học
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tiến độ bài học thực tế trong các khóa học bạn có quyền truy cập.
                </p>
              </div>
              <Link
                href="/courses"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Xem tất cả
              </Link>
            </div>

            {learningCourses.length > 0 ? (
              <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                {learningCourses.slice(0, 3).map((item) => {
                  const nextLesson = item.lessons.find((lesson) => !lesson.completed);
                  const courseRoute = nextLesson
                    ? courseLessonPath(item.course.id, nextLesson.id)
                    : `/my-courses/${item.course.id}`;
                  return (
                  <div key={item.course.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            {item.course.title}
                          </h3>
                          {item.course.level && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {levelLabel(item.course.level)}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                          {item.progress.completedLessons}/{item.progress.totalLessons} bài học đã hoàn thành
                        </p>
                      </div>
                      <Link
                        href={courseRoute}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Vào học <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>

                    <div className="mt-2.5">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                        <span>Hoàn thành</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {item.progress.percentage}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(item.progress.percentage ? 4 : 0, item.progress.percentage))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 p-6 text-center dark:border-slate-700">
                <BookOpen className="h-8 w-8 text-slate-400" />
                <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Bạn chưa có khóa học nào để theo dõi
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                  Khám phá danh mục khóa học để bắt đầu một lộ trình học có cấu trúc.
                </p>
                <Link
                  href="/courses"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  Khám phá khóa học
                </Link>
              </div>
            )}
          </div>
        </section>
        )}

        {/* Weekly Activity (5 cols) */}
        <section
          aria-labelledby="weekly-activity-heading"
          className={`${COURSES_ENABLED ? "lg:col-span-5" : "lg:col-span-12"} flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900`}
        >
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h2
                  id="weekly-activity-heading"
                  className="text-base font-bold text-slate-900 dark:text-slate-100"
                >
                  Hoạt động học tập
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tất cả hoạt động học tập được ghi nhận trong 7 ngày gần nhất.
                </p>
              </div>
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                {weeklyActivity.activeDaysCount}/7 ngày
              </span>
            </div>

            {/* 7-day bar strip */}
            <div className="mt-6 flex h-28 items-end justify-between gap-2 px-1">
              {weeklyActivity.days.map((day, idx) => (
                <div key={idx} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className="relative w-full rounded-t-md transition-all duration-300 group"
                    style={{
                      height: `${day.percentage}%`,
                    }}
                  >
                    <div
                      className={`h-full w-full rounded-t-md transition ${
                        day.isActive
                          ? "bg-blue-600 hover:bg-blue-500 dark:bg-blue-500"
                          : "bg-slate-200 dark:bg-slate-800"
                      }`}
                    />
                    {/* Tooltip on hover */}
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center justify-center rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white pointer-events-none whitespace-nowrap shadow-xs dark:bg-slate-100 dark:text-slate-900 z-10">
                      {day.count} hoạt động
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      day.isActive
                        ? "text-slate-900 dark:text-slate-100 font-bold"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {day.dayLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400 text-center border-t border-slate-100 pt-3 dark:border-slate-800">
            {weeklyActivity.totalActivitiesThisWeek > 0
              ? `${weeklyActivity.totalActivitiesThisWeek} hoạt động trong tuần`
              : "Chưa có hoạt động học tập nào trong tuần này"}
          </p>
        </section>
      </div>

      {/* 6. Recent Milestones (If real achievements exist) */}
      {milestones.length > 0 && (
        <section aria-labelledby="milestones-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            <h2 id="milestones-heading" className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Thành tựu gần đây
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {milestones.map((m) => (
              <div
                key={m.id}
                className="flex items-start gap-3 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {m.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {m.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. Recent Learning Activity (Grouped & Filtered) */}
      <section
        aria-labelledby="recent-activity-heading"
        className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h2
              id="recent-activity-heading"
              className="text-base font-bold text-slate-900 dark:text-slate-100"
            >
              Hoạt động gần đây
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {groupedActivities.length} mốc hoạt động
          </span>
        </div>

        {visibleActivities.length > 0 ? (
          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {visibleActivities.map((act) => (
              <div key={act.id} className="flex items-start gap-3 py-3 first:pt-1 last:pb-1">
                <CheckCircle2
                  className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 truncate text-xs font-bold text-slate-900 dark:text-slate-100" title={act.subject ?? act.title}>
                      {act.subject ?? act.title}
                    </p>
                    {act.count > 1 && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.2 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        x{act.count}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {act.subject ? `${act.title} · ${act.detail}` : act.detail}
                  </p>
                </div>
                <time
                  className="shrink-0 text-xs font-medium text-slate-400 dark:text-slate-500 font-mono"
                  dateTime={act.occurredAt}
                >
                  {act.dateDisplay}
                </time>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-dashed border-slate-200 p-4 text-xs font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <Clock className="h-4 w-4" />
            <span>Hoạt động học tập của bạn sẽ xuất hiện tại đây sau khi hoàn thành bài luyện.</span>
          </div>
        )}

        {groupedActivities.length > 6 && (
          <div className="mt-3 border-t border-slate-100 pt-3 text-center dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAllActivities((prev) => !prev)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
            >
              {showAllActivities
                ? "Thu gọn hoạt động"
                : `Xem thêm ${groupedActivities.length - 6} hoạt động khác`}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
