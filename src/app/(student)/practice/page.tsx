"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  BookMarked,
  CheckCircle2,
  Compass,
  Flame,
  History,
  Layers,
  Play,
  RotateCcw,
  ShieldCheck,
  Swords,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { useToeicStore } from "@/stores/toeicStore";
import { userService, type SkillProgressSummary } from "@/lib/api/services/user.service";
import { gamificationService } from "@/lib/api/services/gamification.service";
import {
  ArenaSwords3d,
  BakeryBanhRan3d,
  ExamStopwatch3d,
  FlashSprint3d,
  ListeningHeadphones3d,
  ReadingBooklet3d,
  SpeakingMic3d,
  WritingQuill3d,
} from "./Practice3dIcons";

const emptySubscribe = () => () => {};

const SKILL_THEMES: Record<
  string,
  {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    hoverBorder: string;
    glowClass: string;
    badgeTheme: string;
    titleHover: string;
    barColor: string;
    tagBg: string;
    tagText: string;
    btnClass: string;
    btnLabel: string;
    href: string;
    description: string;
  }
> = {
  LISTENING: {
    icon: ListeningHeadphones3d,
    hoverBorder: "hover:border-blue-300 dark:hover:border-blue-700",
    glowClass: "from-blue-400/10 to-indigo-400/20 dark:from-blue-500/10 dark:to-indigo-500/10",
    badgeTheme: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/50 dark:text-blue-300",
    titleHover: "group-hover:text-blue-700 dark:group-hover:text-blue-400",
    barColor: "bg-blue-600",
    tagBg: "bg-blue-50 dark:bg-blue-950/60",
    tagText: "text-blue-700 dark:text-blue-300",
    btnClass: "bg-blue-600 shadow-[0_3px_0_0_#1d4ed8] hover:shadow-[0_1px_0_0_#1d4ed8]",
    btnLabel: "Vào phòng nghe",
    href: "/practice/listening",
    description: "Hình ảnh, Hỏi - Đáp, Hội thoại ngắn và Độc thoại. Luyện nghe với audio đa giọng đọc chuẩn US, UK, Úc.",
  },
  READING: {
    icon: ReadingBooklet3d,
    hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-700",
    glowClass: "from-emerald-400/10 to-teal-400/20 dark:from-emerald-500/10 dark:to-teal-500/10",
    badgeTheme: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300",
    titleHover: "group-hover:text-emerald-700 dark:group-hover:text-emerald-400",
    barColor: "bg-emerald-600",
    tagBg: "bg-emerald-50 dark:bg-emerald-950/60",
    tagText: "text-emerald-700 dark:text-emerald-300",
    btnClass: "bg-emerald-600 shadow-[0_3px_0_0_#047857] hover:shadow-[0_1px_0_0_#047857]",
    btnLabel: "Luyện đọc hiểu",
    href: "/practice/reading",
    description: "Điền câu, Hoàn thành văn bản, Đọc hiểu đoạn đơn & kép. Rèn chiến thuật scan/skim và bẫy ngữ pháp.",
  },
  SPEAKING: {
    icon: SpeakingMic3d,
    hoverBorder: "hover:border-violet-300 dark:hover:border-violet-700",
    glowClass: "from-violet-400/10 to-purple-400/20 dark:from-violet-500/10 dark:to-purple-500/10",
    badgeTheme: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/60 dark:bg-violet-950/50 dark:text-violet-300",
    titleHover: "group-hover:text-violet-700 dark:group-hover:text-violet-400",
    barColor: "bg-violet-600",
    tagBg: "bg-violet-50 dark:bg-violet-950/60",
    tagText: "text-violet-700 dark:text-violet-300",
    btnClass: "bg-violet-600 shadow-[0_3px_0_0_#6d28d9] hover:shadow-[0_1px_0_0_#6d28d9]",
    btnLabel: "Luyện nói với AI",
    href: "/practice/speaking",
    description: "Read Aloud, Describe Picture, Respond to Questions. Đánh giá phát âm chuẩn IPA, độ trôi chảy và ngữ điệu.",
  },
  WRITING: {
    icon: WritingQuill3d,
    hoverBorder: "hover:border-rose-300 dark:hover:border-rose-700",
    glowClass: "from-rose-400/10 to-red-400/20 dark:from-rose-500/10 dark:to-red-500/10",
    badgeTheme: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-300",
    titleHover: "group-hover:text-rose-700 dark:group-hover:text-rose-400",
    barColor: "bg-rose-600",
    tagBg: "bg-rose-50 dark:bg-rose-950/60",
    tagText: "text-rose-700 dark:text-rose-300",
    btnClass: "bg-rose-600 shadow-[0_3px_0_0_#be123c] hover:shadow-[0_1px_0_0_#be123c]",
    btnLabel: "Vào xưởng viết",
    href: "/practice/writing",
    description: "Viết câu theo tranh, Viết email phản hồi và Bài luận quan điểm. AI sửa lỗi diễn đạt và nâng cấp vốn từ học thuật.",
  },
};

const DEFAULT_SKILLS: SkillProgressSummary[] = [
  {
    skill: "LISTENING",
    title: "Listening Studio",
    categoryLabel: "Part 1 – Part 4",
    totalItems: 0,
    completedItems: 0,
    progressPercent: 0,
    levelRange: "B1 - C1",
    badge: "Tốc độ 1.0x–1.5x",
    unitLabel: "Bài luyện",
  },
  {
    skill: "READING",
    title: "Reading Mastery",
    categoryLabel: "Part 5 – Part 7",
    totalItems: 0,
    completedItems: 0,
    progressPercent: 0,
    levelRange: "A2 - C1",
    badge: "Dịch song ngữ",
    unitLabel: "Bài đọc",
  },
  {
    skill: "SPEAKING",
    title: "Speaking AI Lab",
    categoryLabel: "Azure AI Speech",
    totalItems: 0,
    completedItems: 0,
    progressPercent: 0,
    levelRange: "B1 - C1",
    badge: "Chấm IPA tức thì",
    unitLabel: "Tình huống",
  },
  {
    skill: "WRITING",
    title: "Writing AI Tutor",
    categoryLabel: "Structured AI",
    totalItems: 0,
    completedItems: 0,
    progressPercent: 0,
    levelRange: "B1 - C1",
    badge: "Góp ý từng câu",
    unitLabel: "Đề bài",
  },
];

export default function PracticeHubPage() {
  const isHydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const { user } = useAuthStore();
  const { breads, streak } = useGamificationStore();
  const { attemptId, answers, timeRemaining } = useToeicStore();

  // Derive ongoing attempt directly from store when hydrated
  const activeAttempt =
    isHydrated && attemptId
      ? {
          id: attemptId,
          answeredCount: answers ? Object.keys(answers).length : 0,
          minutesLeft: timeRemaining ? Math.ceil(timeRemaining / 60) : null,
        }
      : null;

  const studentName =
    user?.profile?.fullName ||
    (user?.email ? user.email.split("@")[0] : "Học viên");

  // Real backend skills summary query
  const {
    data: skillsSummary,
    isLoading: isSkillsLoading,
    isError: isSkillsError,
    refetch: refetchSkillsSummary,
  } = useQuery({
    queryKey: ["user-skills-summary", user?.id],
    queryFn: userService.getSkillsSummary,
    enabled: isHydrated && !!user,
    staleTime: 30_000,
  });

  // Real backend gamification dashboard today query
  const {
    data: dashboardToday,
    isLoading: isDashboardLoading,
    isError: isDashboardError,
    refetch: refetchDashboardToday,
  } = useQuery({
    queryKey: ["gamification-dashboard-today", user?.id],
    queryFn: gamificationService.getDashboardToday,
    enabled: isHydrated && !!user,
    staleTime: 30_000,
  });

  // Real backend user profile query (to get targetScore truthfully)
  const { data: userProfileData } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: userService.getProfile,
    enabled: isHydrated && !!user,
    staleTime: 60_000,
  });

  const skillsList: SkillProgressSummary[] =
    skillsSummary?.skills && skillsSummary.skills.length > 0
      ? skillsSummary.skills
      : DEFAULT_SKILLS;

  // Authoritative Overall 4-Skill Progress
  const overallProgress = skillsSummary?.overall ?? {
    completedItems: 0,
    totalItems: 0,
    progressPercent: 0,
  };

  // Truthful User Target Score (no invented default)
  const userTargetScore =
    userProfileData?.profile?.targetScore?.trim() ||
    user?.profile?.targetScore?.trim() ||
    null;

  // Daily gamification metrics
  const dailySummary = dashboardToday?.summary;
  const quests = dashboardToday?.quests || [];
  const firstIncompleteQuest = quests.find((q) => !q.isCompleted);
  const allQuestsCompleted = quests.length > 0 && quests.every((q) => q.isCompleted);

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      {/* ========================================================================= */}
      {/* 1. HERO HUB: DAILY QUEST & READINESS TRACKER                              */}
      {/* ========================================================================= */}
      <section
        aria-label="Trung tâm tiến độ học tập"
        className="relative overflow-hidden rounded-3xl border border-amber-200/70 dark:border-amber-900/40 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-950/30 dark:via-orange-950/20 p-6 shadow-xs sm:p-8 md:p-9"
      >
        {/* Soft Ambient Mesh Background Lights */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-amber-400/15 dark:bg-amber-500/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-16 size-72 rounded-full bg-orange-400/10 dark:bg-orange-500/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left Column: Greeting & Target Progress Ring */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Circular Overall 4-Skill Progress Gauge SVG */}
            {isSkillsLoading && !skillsSummary ? (
              <div className="relative flex size-24 shrink-0 items-center justify-center rounded-2xl bg-white/90 dark:bg-slate-900/90 p-2 shadow-xs ring-1 ring-amber-200/80 dark:ring-amber-800/60 animate-pulse">
                <div className="size-16 rounded-full bg-amber-100/70 dark:bg-slate-800" />
              </div>
            ) : (
              <div
                role="progressbar"
                aria-label="Tiến độ tổng thể 4 kỹ năng"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={overallProgress.progressPercent}
                className="relative flex size-24 shrink-0 items-center justify-center rounded-2xl bg-white/90 dark:bg-slate-900/90 p-2 shadow-xs ring-1 ring-amber-200/80 dark:ring-amber-800/60"
              >
                <svg className="size-20 -rotate-90 transform" viewBox="0 0 64 64" aria-hidden="true">
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    stroke="#fef3c7"
                    strokeWidth="5"
                    fill="transparent"
                    className="stroke-amber-100 dark:stroke-slate-800"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    stroke="#ea580c"
                    strokeWidth="5"
                    strokeDasharray={163.36}
                    strokeDashoffset={163.36 * (1 - Math.min(100, Math.max(0, overallProgress.progressPercent)) / 100)}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000 ease-out stroke-orange-600 dark:stroke-amber-500"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                    {overallProgress.progressPercent}%
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
                    Tiến độ
                  </span>
                </div>
              </div>
            )}

            <div>
              {userTargetScore ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 dark:border-amber-800/70 bg-amber-100/70 dark:bg-amber-950/60 px-3 py-1 text-xs font-bold text-amber-900 dark:text-amber-300">
                  <Target size={14} className="text-amber-700 dark:text-amber-400" aria-hidden="true" />
                  <span>Mục tiêu cá nhân: {userTargetScore}</span>
                </div>
              ) : (
                <Link
                  href="/student/profile"
                  className="inline-flex min-h-[32px] items-center gap-2 rounded-full border border-amber-300/80 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-950/60 px-3 py-1 text-xs font-bold text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
                >
                  <Target size={14} className="text-amber-700 dark:text-amber-400" aria-hidden="true" />
                  <span>Thiết lập mục tiêu học tập</span>
                </Link>
              )}
              <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                Chào mừng trở lại, {studentName}!
              </h1>
              <p className="mt-1 text-sm sm:text-base font-medium text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                Tiến độ 4 kỹ năng: <span className="font-bold text-slate-900 dark:text-slate-200">{overallProgress.completedItems}/{overallProgress.totalItems}</span> bài đã hoàn thành ({overallProgress.progressPercent}%). Rèn luyện Nghe, Đọc, Nói, Viết để nâng cao trình độ tiếng Anh toàn diện.
              </p>
            </div>
          </div>

          {/* Right Column: Gamified Status Badges */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Streak Counter */}
            <div className="flex flex-1 sm:flex-initial min-w-[140px] items-center gap-3 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-white/95 dark:bg-slate-900/95 px-4 py-3 shadow-xs">
              <div className="flex size-11 items-center justify-center rounded-xl bg-orange-500 text-white shadow-xs">
                <Flame size={22} className="animate-pulse" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Chuỗi học
                </p>
                <p className="text-base font-black text-slate-900 dark:text-slate-100 leading-tight">
                  {isHydrated ? streak : 1} Ngày
                </p>
              </div>
            </div>

            {/* Bánh Mì / EXP Counter */}
            <div className="flex flex-1 sm:flex-initial min-w-[140px] items-center gap-3 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-white/95 dark:bg-slate-900/95 px-4 py-3 shadow-xs">
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                <BakeryBanhRan3d size={24} />
              </div>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Tài sản & Cấp
                </p>
                <p className="text-base font-black text-amber-700 dark:text-amber-400 leading-tight">
                  {isHydrated ? breads : 0} Bánh Mì
                </p>
              </div>
            </div>

            {/* Daily Practice Goal Mini Card */}
            {isDashboardLoading ? (
              <div className="flex w-full sm:w-auto sm:min-w-[200px] flex-col justify-center rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-white/95 dark:bg-slate-900/95 px-4 py-2.5 shadow-xs animate-pulse">
                <div className="h-4 w-28 rounded bg-slate-100 dark:bg-slate-800" />
                <div className="mt-2 h-2 w-full rounded bg-slate-100 dark:bg-slate-800" />
                <div className="mt-1 h-3 w-20 rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            ) : isDashboardError ? (
              <div className="flex w-full sm:w-auto sm:min-w-[200px] flex-col justify-center rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/90 dark:bg-rose-950/60 px-4 py-2.5 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-300">
                  <span>Lỗi tải mục tiêu</span>
                  <button
                    onClick={() => refetchDashboardToday()}
                    className="inline-flex min-h-[36px] items-center gap-1 text-[11px] font-extrabold text-rose-800 dark:text-rose-300 underline hover:no-underline cursor-pointer focus-visible:outline-2 focus-visible:outline-rose-600"
                    aria-label="Thử lại tải mục tiêu ngày"
                  >
                    <RotateCcw size={12} /> Thử lại
                  </button>
                </div>
              </div>
            ) : !dailySummary || dailySummary.totalCount === 0 ? (
              <div className="flex w-full sm:w-auto sm:min-w-[200px] flex-col justify-center rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-white/95 dark:bg-slate-900/95 px-4 py-2.5 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-slate-400" aria-hidden="true" />
                    Mục tiêu ngày
                  </span>
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Chưa có nhiệm vụ hôm nay
                </p>
              </div>
            ) : (
              <div className="flex w-full sm:w-auto sm:min-w-[200px] flex-col justify-center rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-white/95 dark:bg-slate-900/95 px-4 py-2.5 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    Mục tiêu ngày
                  </span>
                  <span className="font-extrabold text-amber-800 dark:text-amber-400">
                    {dailySummary.completedCount}/{dailySummary.totalCount} nhiệm vụ
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Tiến độ nhiệm vụ hôm nay"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={dailySummary.progressPercent}
                  className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, dailySummary.progressPercent))}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  {dailySummary.completedCount >= dailySummary.totalCount
                    ? "Đã hoàn thành toàn bộ nhiệm vụ hôm nay!"
                    : `${dailySummary.progressPercent}% • Còn ${dailySummary.totalCount - dailySummary.completedCount} nhiệm vụ`}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. QUICK RESUME BANNER: "TIẾP TỤC BÀI ĐANG DỞ" / DAILY QUEST HERO CTA     */}
      {/* ========================================================================= */}
      {activeAttempt ? (
        <section
          aria-label="Tiếp tục bài đang dở"
          className="relative overflow-hidden rounded-2xl border-2 border-emerald-300 dark:border-emerald-800/70 bg-emerald-50/90 dark:bg-emerald-950/40 p-4 sm:p-5 shadow-xs transition-all hover:border-emerald-400 dark:hover:border-emerald-700"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="relative flex size-3.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-3.5 rounded-full bg-emerald-600" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Tiếp tục bài đang dở
                </p>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  Bài thi TOEIC mô phỏng #{activeAttempt.id}
                </h3>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                  Đã làm {activeAttempt.answeredCount} câu hỏi • {activeAttempt.minutesLeft ? `Còn khoảng ${activeAttempt.minutesLeft} phút` : "Thời gian đang được đồng bộ"}
                </p>
              </div>
            </div>

            <Link
              href={`/practice/toeic/attempts/${activeAttempt.id}`}
              className="relative inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white shadow-[0_3px_0_0_#047857] hover:shadow-[0_1px_0_0_#047857] hover:translate-y-[2px] active:shadow-none active:translate-y-[3px] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              Tiếp tục ngay <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : isDashboardLoading ? (
        <section
          aria-label="Đang tải gợi ý nhiệm vụ"
          className="relative overflow-hidden rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-white/80 dark:bg-slate-900/80 p-4 sm:p-5 shadow-2xs animate-pulse"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800" />
              <div className="space-y-2">
                <div className="h-3 w-32 rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-4 w-48 rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-3 w-64 rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            </div>
            <div className="h-10 w-36 rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        </section>
      ) : isDashboardError ? (
        <section
          aria-label="Lỗi tải gợi ý nhiệm vụ"
          className="relative overflow-hidden rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/40 p-4 sm:p-5 shadow-2xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                <AlertCircle size={20} aria-hidden="true" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-800 dark:text-rose-300">
                  Nhiệm vụ hôm nay
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                  Không thể tải danh sách nhiệm vụ
                </h3>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Đã có lỗi khi kết nối máy chủ. Bạn có thể bấm thử lại để tiếp tục.
                </p>
              </div>
            </div>
            <button
              onClick={() => refetchDashboardToday()}
              className="relative inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs sm:text-sm font-black text-white shadow-[0_3px_0_0_#9f1239] hover:shadow-[0_1px_0_0_#9f1239] hover:translate-y-[2px] active:shadow-none active:translate-y-[3px] transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
            >
              <RotateCcw size={15} aria-hidden="true" />
              Thử lại
            </button>
          </div>
        </section>
      ) : firstIncompleteQuest ? (
        <section
          aria-label="Nhiệm vụ gợi ý hôm nay"
          className="relative overflow-hidden rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-white/90 dark:bg-slate-900/90 p-4 sm:p-5 shadow-2xs backdrop-blur-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
                <Zap size={20} aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Nhiệm vụ gợi ý hôm nay
                  </span>
                  {firstIncompleteQuest.rewardXP ? (
                    <span className="rounded-full bg-amber-100 dark:bg-amber-950/70 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                      +{firstIncompleteQuest.rewardXP} XP
                    </span>
                  ) : null}
                  {firstIncompleteQuest.rewardBanh ? (
                    <span className="rounded-full bg-orange-100 dark:bg-orange-950/70 px-2 py-0.5 text-[10px] font-bold text-orange-800 dark:text-orange-300">
                      +{firstIncompleteQuest.rewardBanh} Bánh
                    </span>
                  ) : null}
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 mt-0.5">
                  {firstIncompleteQuest.title || "Luyện tập nhiệm vụ hàng ngày"}
                </h3>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  {firstIncompleteQuest.description ||
                    "Hoàn thành bài tập để nhận điểm kinh nghiệm và bánh mì."}
                </p>
              </div>
            </div>

            <Link
              href={firstIncompleteQuest.actionUrl || "#skills-section"}
              className="relative inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs sm:text-sm font-black text-white shadow-[0_3px_0_0_#c2410c] hover:shadow-[0_1px_0_0_#c2410c] hover:translate-y-[2px] active:shadow-none active:translate-y-[3px] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
            >
              {firstIncompleteQuest.actionLabel || "Bắt đầu ngay"}{" "}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : allQuestsCompleted ? (
        <section
          aria-label="Đã hoàn thành nhiệm vụ hôm nay"
          className="relative overflow-hidden rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/80 dark:bg-emerald-950/40 p-4 sm:p-5 shadow-2xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 size={20} aria-hidden="true" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Tuyệt vời!
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                  Bạn đã hoàn thành tất cả nhiệm vụ hôm nay!
                </h3>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Hãy tiếp tục duy trì phong độ bằng cách luyện thêm các kỹ năng chuyên sâu bên dưới.
                </p>
              </div>
            </div>

            <Link
              href="#skills-section"
              className="relative inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-black text-white shadow-[0_3px_0_0_#047857] hover:shadow-[0_1px_0_0_#047857] hover:translate-y-[2px] active:shadow-none active:translate-y-[3px] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              Xem phòng luyện kỹ năng <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : (
        <section
          aria-label="Khám phá phòng luyện kỹ năng"
          className="relative overflow-hidden rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-white/90 dark:bg-slate-900/90 p-4 sm:p-5 shadow-2xs backdrop-blur-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
                <Compass size={20} aria-hidden="true" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Rèn luyện kỹ năng
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                  Luyện tập 4 kỹ năng tiếng Anh
                </h3>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Chọn phòng Nghe, Đọc, Nói hoặc Viết để bắt đầu bài học hôm nay.
                </p>
              </div>
            </div>

            <Link
              href="#skills-section"
              className="relative inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs sm:text-sm font-black text-white shadow-[0_3px_0_0_#c2410c] hover:shadow-[0_1px_0_0_#c2410c] hover:translate-y-[2px] active:shadow-none active:translate-y-[3px] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
            >
              Vào luyện tập ngay <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 3. CORE MODALITIES: ASYMMETRIC GRID                                      */}
      {/* ========================================================================= */}
      <section aria-labelledby="core-practice-heading" className="space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
            <Target size={15} aria-hidden="true" />
            <span>Khu vực luyện thi tiêu chuẩn</span>
          </div>
          <h2 id="core-practice-heading" className="mt-1 text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
            Chọn phương thức luyện tập hôm nay
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
            Được cấu trúc theo chuẩn đề thi quốc tế ETS kết hợp công nghệ chấm phản hồi thông minh.
          </p>
        </div>

        {/* Asymmetric Top Row: Hero Featured Card (Span 2) + Flash Sprint Card (Span 1) */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Card 1: Hero Featured Card - Luyện Đề TOEIC Mô Phỏng (Span 2) */}
          <div className="relative group bg-white dark:bg-slate-900 rounded-3xl border-2 border-amber-200/80 dark:border-amber-900/40 hover:border-amber-400 dark:hover:border-amber-700 p-6 sm:p-8 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden lg:col-span-2">
            {/* Ambient Background Glow on Hover */}
            <div
              className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-gradient-to-br from-amber-400/20 via-orange-400/10 to-transparent dark:from-amber-500/10 dark:via-orange-500/5 blur-3xl group-hover:scale-125 transition-transform duration-500"
              aria-hidden="true"
            />

            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-4 max-w-xl">
                {/* Anti-AI Pill Tags */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/50 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-300">
                    Format ETS 2026
                  </span>
                  <span className="rounded-full border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/50 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">
                    Bấm giờ chuẩn thi thật
                  </span>
                  <span className="rounded-full border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
                    <ShieldCheck size={13} aria-hidden="true" /> Chống gian lận 3 lớp
                  </span>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    Luyện Đề TOEIC Mô Phỏng
                  </h3>
                  <p className="mt-2 text-sm sm:text-base font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                    Trải nghiệm trọn vẹn áp lực phòng thi thật. Làm đề 2 kỹ năng (Listening & Reading) hoặc bài thi thu gọn Mini-Test với thuật toán dự đoán band điểm tức thì.
                  </p>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-3 gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cấu trúc</p>
                    <p className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">200 Câu hỏi</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thời lượng</p>
                    <p className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">120 Phút</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chấm điểm</p>
                    <p className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400">Thang 990</p>
                  </div>
                </div>
              </div>

              {/* 3D Stopwatch Illustration Artwork */}
              <div className="relative shrink-0 flex items-center justify-center self-center md:self-auto py-2">
                <ExamStopwatch3d size={110} className="filter drop-shadow-md group-hover:scale-105 transition-transform duration-300" />
              </div>
            </div>

            {/* Action Bar */}
            <div className="relative mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Kho gồm 15+ bộ đề cập nhật liên tục từ ETS & Hacker TOEIC
              </span>
              <Link
                href="/practice/quizzes"
                className="relative inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 py-3.5 text-sm sm:text-base font-black tracking-wide text-white shadow-[0_4px_0_0_#c2410c] hover:shadow-[0_2px_0_0_#c2410c] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] transition-all"
              >
                <Play size={17} fill="currentColor" aria-hidden="true" />
                Bắt đầu thi thử ngay
              </Link>
            </div>
          </div>

          {/* Card 2: Flash 5-Phút Daily Sprint (Span 1) */}
          <div className="relative group bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-100 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-600 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div
              className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-gradient-to-br from-amber-400/10 to-orange-400/20 dark:from-amber-500/10 dark:to-orange-500/10 blur-2xl group-hover:scale-150 transition-transform duration-500"
              aria-hidden="true"
            />

            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-orange-200 dark:border-orange-900/60 bg-orange-50 dark:bg-orange-950/50 px-2.5 py-1 text-xs font-bold text-orange-800 dark:text-orange-300">
                  Luyện nhanh 5 phút
                </span>
                <FlashSprint3d size={44} className="group-hover:scale-110 transition-transform duration-300" />
              </div>

              <h3 className="mt-4 text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Flash 5-Phút: Phản Xạ Nhanh
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                Bận rộn? Giải nhanh 5 câu hỏi trắc nghiệm ngẫu nhiên để duy trì nhịp phản xạ âm thanh và nhận ngay +20 EXP.
              </p>

              <div className="mt-5 space-y-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 p-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Số câu:</span>
                  <span className="font-extrabold text-slate-900 dark:text-slate-100">5 câu ngẫu nhiên</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Phần thưởng:</span>
                  <span className="font-extrabold text-amber-700 dark:text-amber-400">+5 Bánh Mì / bài</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-2">
              <Link
                href="/practice/quizzes?mode=sprint"
                className="relative flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-4 py-3 text-sm font-black text-white shadow-[0_4px_0_0_#9a3412] hover:shadow-[0_2px_0_0_#9a3412] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] transition-all"
              >
                <Zap size={16} aria-hidden="true" />
                Vào làm 5 câu nhanh
              </Link>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. THE 4 SKILL LABS: SPECIALIZED MODULES                                 */}
        {/* ========================================================================= */}
        <div id="skills-section" className="pt-4 scroll-mt-6">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-700 dark:text-blue-400">
                <BookMarked size={15} aria-hidden="true" />
                <span>Phòng Luyện Kỹ Năng Chuyên Sâu</span>
              </div>
              <h3 className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">
                Luyện Tập Chuyên Sâu 4 Kỹ Năng
              </h3>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Chọn kỹ năng cần bứt phá điểm số trong kỳ này
            </p>
          </div>

          {isSkillsError ? (
            <div className="rounded-3xl border-2 border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/40 p-6 sm:p-8 text-center">
              <p className="text-base font-bold text-rose-800 dark:text-rose-300">
                Không thể tải dữ liệu tiến độ 4 kỹ năng
              </p>
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                Vui lòng kiểm tra kết nối mạng hoặc thử lại.
              </p>
              <button
                onClick={() => refetchSkillsSummary()}
                className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs sm:text-sm font-black text-white shadow-[0_3px_0_0_#9f1239] hover:shadow-[0_1px_0_0_#9f1239] hover:translate-y-[2px] active:shadow-none active:translate-y-[3px] transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
              >
                <RotateCcw size={14} /> Thử lại
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {isSkillsLoading && !skillsSummary ? (
                // 4 Skeleton loading cards with matching dimensions
                Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="rounded-3xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs flex flex-col justify-between min-h-[380px] animate-pulse"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="h-6 w-24 rounded-full bg-slate-100 dark:bg-slate-800" />
                        <div className="size-13 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                      </div>
                      <div className="h-6 w-36 rounded-lg bg-slate-100 dark:bg-slate-800" />
                      <div className="space-y-2">
                        <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-800" />
                        <div className="h-4 w-3/4 rounded bg-slate-100 dark:bg-slate-800" />
                      </div>
                      <div className="pt-4 space-y-2">
                        <div className="flex justify-between">
                          <div className="h-3 w-20 rounded bg-slate-100 dark:bg-slate-800" />
                          <div className="h-3 w-8 rounded bg-slate-100 dark:bg-slate-800" />
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800" />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <div className="h-5 w-16 rounded-md bg-slate-100 dark:bg-slate-800" />
                        <div className="h-5 w-20 rounded-md bg-slate-100 dark:bg-slate-800" />
                      </div>
                    </div>
                    <div className="h-11 w-full rounded-xl bg-slate-100 dark:bg-slate-800 mt-6" />
                  </div>
                ))
              ) : (
                skillsList.map((skill) => {
                  const theme = SKILL_THEMES[skill.skill] || SKILL_THEMES.LISTENING;
                  const Icon = theme.icon;
                  const isZeroState = skill.progressPercent === 0;

                  return (
                    <div
                      key={skill.skill}
                      className={`relative group bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-100 dark:border-slate-800 ${theme.hoverBorder} p-6 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden`}
                    >
                      {/* Hover Glow */}
                      <div
                        className={`pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-gradient-to-br ${theme.glowClass} blur-2xl group-hover:scale-150 transition-transform duration-500`}
                        aria-hidden="true"
                      />

                      <div>
                        {/* Top Header */}
                        <div className="flex items-center justify-between">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${theme.badgeTheme}`}>
                            {skill.categoryLabel}
                          </span>
                          <Icon size={52} className="group-hover:scale-110 transition-transform duration-300" />
                        </div>

                        {/* Title & Description */}
                        <h4 className={`mt-4 text-xl font-black text-slate-900 dark:text-slate-100 ${theme.titleHover} transition-colors`}>
                          {skill.title}
                        </h4>
                        <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                          {theme.description}
                        </p>

                        {/* Mastery Bar with Real % */}
                        <div className="mt-5 space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-500 dark:text-slate-400">Tiến độ kỹ năng</span>
                            {isZeroState ? (
                              <span className="inline-flex items-center gap-1.5 text-slate-400 font-extrabold">
                                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                                  Bắt đầu ngay
                                </span>
                                0%
                              </span>
                            ) : (
                              <span className={`${theme.tagText} font-extrabold`}>
                                {skill.progressPercent}%
                              </span>
                            )}
                          </div>
                          <div
                            role="progressbar"
                            aria-label={`Tiến độ kỹ năng ${skill.title}`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={skill.progressPercent}
                            className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                          >
                            <div
                              className={`h-full rounded-full ${theme.barColor} transition-all duration-700 ease-out`}
                              style={{ width: `${Math.min(100, Math.max(skill.progressPercent, 0))}%` }}
                            />
                          </div>
                        </div>

                        {/* Real Dynamic Sub-tags */}
                        <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] font-bold">
                          <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-slate-600 dark:text-slate-300">
                            {skill.totalItems} {skill.unitLabel}
                          </span>
                          <span className={`rounded-md ${theme.tagBg} px-2 py-0.5 ${theme.tagText}`}>
                            {skill.badge}
                          </span>
                          <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-slate-600 dark:text-slate-300">
                            Level {skill.levelRange}
                          </span>
                        </div>
                      </div>

                      {/* CTA Button */}
                      <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <Link
                          href={theme.href}
                          className={`relative flex w-full items-center justify-center gap-2 rounded-xl ${theme.btnClass} px-4 py-2.5 text-sm font-black text-white hover:translate-y-[2px] active:shadow-none active:translate-y-[3px] transition-all`}
                        >
                          {theme.btnLabel} <ArrowRight size={15} aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. GAMIFIED ARENA & COMPANION STUDY TOOLKIT                              */}
      {/* ========================================================================= */}
      <section aria-labelledby="companion-heading" className="space-y-6 pt-4">
        {/* Featured Arena Banner */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-amber-300 dark:border-amber-800/70 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-100/40 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/20 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm">
                <ArenaSwords3d size={48} />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-950/70 px-2.5 py-0.5 text-xs font-black text-amber-900 dark:text-amber-300">
                  <Trophy size={13} className="text-amber-700 dark:text-amber-400" aria-hidden="true" />
                  Đấu Trường Học Viên
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                  Đấu Trường PvP: Thi Đấu Bấm Giờ Trực Tiếp
                </h3>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 max-w-2xl">
                  Thách đấu 1v1 đối kháng thời gian thực cùng bạn học toàn hệ thống. Tích lũy điểm xếp hạng để mở khóa danh hiệu và nhận thưởng Bánh Mì.
                </p>
              </div>
            </div>

            <Link
              href="/arena"
              className="relative inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3.5 text-sm font-black text-white shadow-[0_4px_0_0_#c2410c] hover:shadow-[0_2px_0_0_#c2410c] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] transition-all"
            >
              <Swords size={18} aria-hidden="true" />
              Tham gia đấu trường
            </Link>
          </div>
        </div>

        {/* 4 Companion Toolkit Cards */}
        <div>
          <h3 id="companion-heading" className="text-xl font-black text-slate-900 dark:text-slate-100 mb-4">
            Công Cụ Bổ Trợ Nền Tảng
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Tool 1: Flashcard */}
            <Link
              href="/flashcard"
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md transition duration-200"
            >
              <div>
                <div className="flex size-11 items-center justify-center rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                  <Layers size={20} aria-hidden="true" />
                </div>
                <h4 className="mt-3 text-base font-black text-slate-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                  Flashcard Từ Vựng
                </h4>
                <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                  Thuật toán Spaced Repetition SM-2 ôn tập lặp lại ngắt quãng 3,000 từ vựng TOEIC.
                </p>
              </div>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-amber-700 dark:text-amber-400">
                Mở bộ thẻ <ArrowRight size={13} aria-hidden="true" />
              </span>
            </Link>

            {/* Tool 2: Grammar */}
            <Link
              href="/grammar"
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-md transition duration-200"
            >
              <div>
                <div className="flex size-11 items-center justify-center rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                  <BookMarked size={20} aria-hidden="true" />
                </div>
                <h4 className="mt-3 text-base font-black text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                  Ngữ Pháp Tiếng Anh
                </h4>
                <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                  Hệ thống 24 chuyên đề ngữ pháp trọng tâm đề thi kèm bài giải thích chi tiết.
                </p>
              </div>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                Học ngữ pháp <ArrowRight size={13} aria-hidden="true" />
              </span>
            </Link>

            {/* Tool 3: Diagnostic */}
            <Link
              href="/diagnostic"
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition duration-200"
            >
              <div>
                <div className="flex size-11 items-center justify-center rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
                  <Compass size={20} aria-hidden="true" />
                </div>
                <h4 className="mt-3 text-base font-black text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                  Kiểm Tra Đầu Vào
                </h4>
                <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                  Bài test ngắn 25 phút xác định trình độ xuất phát và gợi ý lộ trình phù hợp.
                </p>
              </div>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-blue-700 dark:text-blue-400">
                Làm bài test <ArrowRight size={13} aria-hidden="true" />
              </span>
            </Link>

            {/* Tool 4: History */}
            <Link
              href="/history"
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-md transition duration-200"
            >
              <div>
                <div className="flex size-11 items-center justify-center rounded-xl border border-violet-200 dark:border-violet-900/60 bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-400">
                  <History size={20} aria-hidden="true" />
                </div>
                <h4 className="mt-3 text-base font-black text-slate-900 dark:text-slate-100 group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">
                  Lịch Sử Luyện Tập
                </h4>
                <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                  Theo dõi biểu đồ phong độ, tỷ lệ chính xác và xem lại các câu đã làm sai.
                </p>
              </div>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-violet-700 dark:text-violet-400">
                Xem lịch sử <ArrowRight size={13} aria-hidden="true" />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
