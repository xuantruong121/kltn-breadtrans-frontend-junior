"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Flame,
  Gift,
  Headphones,
  Heart,
  Layers,
  Loader2,
  Mic,
  PenTool,
  RefreshCw,
  ShieldCheck,
  Smile,
  TrendingUp,
  Trophy,
  Utensils,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/stores/authStore";
import { courseService, StudentLearningClass } from "@/lib/api/services/course.service";
import {
  gamificationService,
  Pet,
  TodayQuestItem,
} from "@/lib/api/services/gamification.service";
import { userService, SkillProgressSummary, UserProfile } from "@/lib/api/services/user.service";
import { PlacementTestBanner } from "@/components/dashboard/PlacementTestBanner";
import { getSpeciesIdFromPetName, PET_SPECIES_LIST } from "@/modules/pet/types";
import {
  clampPercentage,
  getVietnamDayOfWeek,
  getVietnamGreeting,
  getTypeSpecificQuestFallback,
  isSafeInternalRoute,
} from "./dashboardUtils";

const emptySubscribe = () => () => {};

// --- 4-SKILLS CONFIGURATION (BreadTrans Core Curriculum) ---
const SKILLS_CONFIG = [
  {
    key: "LISTENING" as const,
    title: "Luyện nghe",
    description: "Rèn luyện khả năng nghe hiểu qua đàm thoại, độc thoại và ngữ cảnh đời sống thực tế.",
    href: "/practice/listening",
    icon: Headphones,
    tone: "blue",
    borderClass: "border-blue-200/90 hover:border-blue-300",
    bgClass: "bg-blue-50/70 text-blue-700",
    progressClass: "bg-blue-500",
    badgeClass: "bg-blue-100/90 text-blue-800 border-blue-200",
    btnClass: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  {
    key: "SPEAKING" as const,
    title: "Luyện nói",
    description: "Luyện phát âm chuẩn xác, ngữ điệu tự nhiên và phản xạ giao tiếp tiếng Anh tự tin.",
    href: "/practice/speaking",
    icon: Mic,
    tone: "violet",
    borderClass: "border-violet-200/90 hover:border-violet-300",
    bgClass: "bg-violet-50/70 text-violet-700",
    progressClass: "bg-violet-500",
    badgeClass: "bg-violet-100/90 text-violet-800 border-violet-200",
    btnClass: "bg-violet-600 hover:bg-violet-700 text-white",
  },
  {
    key: "READING" as const,
    title: "Luyện đọc",
    description: "Nâng cao tốc độ đọc hiểu, vốn từ vựng học thuật và kỹ năng nắm bắt ý chính đoạn văn.",
    href: "/practice/reading",
    icon: BookOpen,
    tone: "emerald",
    borderClass: "border-emerald-200/90 hover:border-emerald-300",
    bgClass: "bg-emerald-50/70 text-emerald-700",
    progressClass: "bg-emerald-500",
    badgeClass: "bg-emerald-100/90 text-emerald-800 border-emerald-200",
    btnClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  {
    key: "WRITING" as const,
    title: "Luyện viết",
    description: "Thực hành viết câu chuẩn ngữ pháp, email công sở và bài luận với gợi ý chi tiết.",
    href: "/practice/writing",
    icon: PenTool,
    tone: "rose",
    borderClass: "border-rose-200/90 hover:border-rose-300",
    bgClass: "bg-rose-50/70 text-rose-700",
    progressClass: "bg-rose-500",
    badgeClass: "bg-rose-100/90 text-rose-800 border-rose-200",
    btnClass: "bg-rose-600 hover:bg-rose-700 text-white",
  },
];

function getQuestProgressText(item: TodayQuestItem): string {
  const target = item.targetValue ?? item.quest?.targetValue ?? 1;
  const current = Math.min(Math.max(0, item.currentValue ?? 0), target);
  const type = (item.type ?? item.quest?.type ?? "").toUpperCase();

  if (type === "LEARN_VOCAB" || type === "DO_VOCAB") {
    return `${current}/${target} từ`;
  }
  if (
    type === "DO_LISTENING" ||
    type === "COMPLETE_QUIZ" ||
    type === "DO_SPEAKING" ||
    type === "PRACTICE_SPEAKING" ||
    type === "COMPLETE_LESSON"
  ) {
    return `${current}/${target} bài`;
  }
  return `${current}/${target}`;
}

function resolveQuestAction(item: TodayQuestItem) {
  const questObj = item.quest || item;
  const type = (item.type ?? questObj?.type ?? "").toUpperCase();
  const candidateUrl = item.actionUrl?.trim() || "";
  const candidateLabel = item.actionLabel?.trim() || "";

  // Guard against legacy backend actionUrl incorrectly pointing COMPLETE_QUIZ to listening
  if (type === "COMPLETE_QUIZ" && candidateUrl === "/practice/listening") {
    return {
      actionLabel:
        candidateLabel === "Luyện nghe" ? "Làm bài kiểm tra" : (candidateLabel || "Làm bài kiểm tra"),
      actionUrl: "/practice/quizzes",
    };
  }

  if (candidateUrl && isSafeInternalRoute(candidateUrl)) {
    return {
      actionLabel: candidateLabel || "Tiếp tục học",
      actionUrl: candidateUrl,
    };
  }

  const fallback = getTypeSpecificQuestFallback(type);
  return {
    actionLabel: candidateLabel || fallback.actionLabel,
    actionUrl: fallback.actionUrl,
  };
}

function getQuestCategoryMeta(type?: string) {
  const upper = (type || "").toUpperCase();
  switch (upper) {
    case "LEARN_VOCAB":
    case "DO_VOCAB":
      return {
        label: "Từ vựng",
        badgeClass: "bg-amber-100 text-amber-900 border-amber-200",
        btnClass: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20",
        progressFill: "bg-amber-500",
        icon: BookOpen,
      };
    case "DO_LISTENING":
      return {
        label: "Luyện nghe",
        badgeClass: "bg-blue-100 text-blue-900 border-blue-200",
        btnClass: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20",
        progressFill: "bg-blue-500",
        icon: Headphones,
      };
    case "COMPLETE_QUIZ":
      return {
        label: "Bài kiểm tra",
        badgeClass: "bg-indigo-100 text-indigo-900 border-indigo-200",
        btnClass: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20",
        progressFill: "bg-indigo-500",
        icon: CheckCircle2,
      };
    case "DO_SPEAKING":
    case "PRACTICE_SPEAKING":
      return {
        label: "Luyện nói",
        badgeClass: "bg-violet-100 text-violet-900 border-violet-200",
        btnClass: "bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/20",
        progressFill: "bg-violet-500",
        icon: Mic,
      };
    default:
      return {
        label: "Bài học",
        badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-200",
        btnClass: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20",
        progressFill: "bg-emerald-500",
        icon: CheckCircle2,
      };
  }
}

// --- SUB-COMPONENT: ACTIVE LEARNING COURSE CARD ---
interface LearningCourseCardProps {
  learningClass?: StudentLearningClass;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

function LearningCourseCard({
  learningClass,
  isLoading = false,
  isError = false,
  onRetry,
}: LearningCourseCardProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs animate-pulse space-y-4"
        role="status"
        aria-label="Đang tải khóa học"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="size-14 rounded-2xl bg-slate-200 shrink-0" />
            <div className="space-y-2">
              <div className="h-4 w-28 rounded bg-slate-200" />
              <div className="h-5 w-48 rounded bg-slate-200" />
              <div className="h-3 w-36 rounded bg-slate-100" />
            </div>
          </div>
          <div className="space-y-2 sm:w-56">
            <div className="h-3 w-24 rounded bg-slate-100" />
            <div className="h-3 rounded-full bg-slate-200" />
            <div className="h-10 rounded-2xl bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-6 text-center space-y-3 shadow-xs">
        <AlertCircle size={24} className="mx-auto text-rose-500" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold text-rose-900">Không thể tải lộ trình khóa học</p>
          <p className="mt-0.5 text-xs text-rose-700">Đã xảy ra lỗi khi kết nối tới máy chủ khóa học.</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 cursor-pointer"
          >
            <RefreshCw size={14} aria-hidden="true" /> Thử lại
          </button>
        )}
      </div>
    );
  }

  if (!learningClass) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-amber-200/90 bg-gradient-to-br from-amber-50/40 via-white to-orange-50/20 p-6 text-center shadow-xs sm:p-8">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 border border-amber-200">
          <BookOpen size={28} aria-hidden="true" />
        </div>
        <h3 className="mt-3 text-lg font-black text-slate-900">Bạn chưa ghi danh khóa học nào</h3>
        <p className="mx-auto mt-1 max-w-md text-xs sm:text-sm leading-relaxed text-slate-600">
          Khám phá các khóa học tiếng Anh toàn diện 4 kỹ năng hoặc luyện thi TOEIC để có lộ trình rõ ràng và tiến bộ nhanh hơn mỗi tuần.
        </p>
        <Link
          href="/courses"
          className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-amber-600 px-6 text-xs sm:text-sm font-black text-white shadow-xs transition-all hover:bg-amber-700 hover:scale-[1.02] active:scale-95 cursor-pointer"
        >
          <span>Khám phá danh mục khóa học</span>
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    );
  }

  const progress = clampPercentage(learningClass.enrollmentProgress ?? 0, 100);
  const isCompleted = learningClass.enrollmentStatus === "COMPLETED";

  return (
    <div className="flex flex-col gap-5 rounded-3xl border-2 border-amber-200/90 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-7 transition-colors hover:border-amber-300">
      <div className="flex items-start gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 border border-amber-200">
          <BookOpen size={26} aria-hidden="true" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                isCompleted
                  ? "text-emerald-800 bg-emerald-100/80 border-emerald-200"
                  : "text-amber-800 bg-amber-100/80 border-amber-200"
              }`}
            >
              {isCompleted ? "Đã hoàn thành khóa" : "Lộ trình đang học"}
            </span>
            <span className="text-xs font-extrabold text-slate-500">
              {learningClass.course?.level || "Mọi cấp độ"}
            </span>
          </div>
          <h3 className="mt-1.5 text-lg sm:text-xl font-black text-slate-900 leading-snug">
            {learningClass.course?.title || learningClass.name}
          </h3>
          <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-600">{learningClass.name}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 sm:min-w-64 sm:items-end border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100">
        <div className="w-full sm:w-56 space-y-1.5">
          <div className="flex justify-between text-xs font-bold text-slate-600">
            <span>Tiến độ bài học</span>
            <span className="text-amber-800 font-black">{progress}%</span>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Tiến độ bài học của khóa"
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isCompleted ? "bg-emerald-500" : "bg-amber-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <Link
          href={`/classes/${learningClass.id}`}
          className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-amber-600 px-5 text-xs sm:text-sm font-black text-white shadow-xs transition-all hover:bg-amber-700 hover:scale-[1.02] active:scale-95 cursor-pointer"
        >
          <span>{isCompleted ? "Ôn lại bài học" : "Tiếp tục học"}</span>
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

// --- MAIN DASHBOARD COMPONENT ---
export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isReady = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const enabled = isReady && !!user?.id && user?.role === "STUDENT";

  // 1. Authoritative User Profile
  const {
    data: userProfile,
    isLoading: isProfileLoading,
    isError: isProfileError,
    refetch: refetchProfile,
  } = useQuery<UserProfile>({
    queryKey: ["user-profile", user?.id],
    queryFn: userService.getProfile,
    enabled,
    staleTime: 60_000,
  });

  const studentName =
    userProfile?.profile?.fullName ||
    user?.profile?.fullName ||
    (user?.email ? user.email.split("@")[0] : "");
  const studentAvatar =
    userProfile?.profile?.avatar ||
    userProfile?.profile?.avatarUrl ||
    user?.profile?.avatar ||
    user?.profile?.avatarUrl;

  // 2. User Learning Stats (Streak, EXP, Bánh Mì, Tier)
  const {
    data: stats,
    isLoading: isStatsLoading,
    isError: isStatsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: userService.getStats,
    enabled,
    staleTime: 60_000,
  });

  // 3. Today's Dashboard Quests & Activities
  const {
    data: todayData,
    isLoading: isTodayLoading,
    isError: isTodayError,
    refetch: refetchToday,
  } = useQuery({
    queryKey: ["dashboard-today", user?.id],
    queryFn: gamificationService.getDashboardToday,
    enabled,
    staleTime: 30_000,
  });

  // 4. Learning Classes
  const {
    data: learningClasses,
    isLoading: areClassesLoading,
    isError: isClassesError,
    refetch: refetchClasses,
  } = useQuery({
    queryKey: ["my-learning-classes", user?.id],
    queryFn: courseService.getMyLearningClasses,
    enabled,
    staleTime: 60_000,
  });

  // 5. Pet Companion Data
  const {
    data: pet,
    isLoading: isPetLoading,
    isError: isPetError,
    refetch: refetchPet,
  } = useQuery<Pet | null>({
    queryKey: ["my-pet", user?.id],
    queryFn: gamificationService.getMyPet,
    enabled,
    staleTime: 30_000,
  });

  // 6. 4-Skills Summary Data
  const {
    data: skillsSummary,
    isLoading: isSkillsLoading,
    isError: isSkillsError,
    refetch: refetchSkills,
  } = useQuery({
    queryKey: ["user-skills-summary", user?.id],
    queryFn: userService.getSkillsSummary,
    enabled,
    staleTime: 60_000,
  });

  // Feed Pet Mutation
  const feedPetMutation = useMutation({
    mutationFn: gamificationService.feedPet,
    onSuccess: (updatedPet) => {
      queryClient.invalidateQueries({ queryKey: ["my-pet", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-stats", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["market-balance"] });

      if (pet && updatedPet.level > pet.level) {
        toast.success(
          `Chúc mừng! Thú cưng đã thăng cấp lên Cấp ${updatedPet.level}! (-10 Bánh Mì, +50 EXP)`
        );
      } else {
        toast.success(
          "Thú cưng đã được cho ăn no nê! (-10 Bánh Mì, +50 EXP Thú Cưng, +20 Vui vẻ)"
        );
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Không thể cho thú cưng ăn lúc này!");
    },
  });

  // Query invalidation on external learning events
  useEffect(() => {
    const handleLearningEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-today", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-stats", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["my-pet", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-skills-summary", user?.id] });
    };
    window.addEventListener("breadtrans:learning-event", handleLearningEvent);
    return () => window.removeEventListener("breadtrans:learning-event", handleLearningEvent);
  }, [queryClient, user?.id]);

  // Quests & Objectives Defensive Calculations
  const quests = todayData?.quests ?? [];
  const summary = todayData?.summary ?? {
    completedCount: 0,
    totalCount: 0,
    progressPercent: 0,
    earnedXp: 0,
    earnedBanh: 0,
  };

  const safeTotal = Math.max(0, Number(summary.totalCount) || 0);
  const safeCompleted = Math.max(
    0,
    Math.min(Number(summary.completedCount) || 0, safeTotal)
  );

  const derivedDailyPercent =
    safeTotal > 0 ? Math.round((safeCompleted / safeTotal) * 100) : 0;

  // Development-only check for backend agreement
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" &&
      todayData?.summary &&
      typeof todayData.summary.progressPercent === "number" &&
      todayData.summary.progressPercent !== derivedDailyPercent
    ) {
      console.warn("[Dashboard] Daily objectives progressPercent mismatch:", {
        backend: todayData.summary.progressPercent,
        derived: derivedDailyPercent,
        completedCount: safeCompleted,
        totalCount: safeTotal,
      });
    }
  }, [todayData, derivedDailyPercent, safeCompleted, safeTotal]);

  // Course selection: prefer ACTIVE (most recent), fallback to most recent COMPLETED
  const displayedClass = useMemo(() => {
    if (!learningClasses || learningClasses.length === 0) return undefined;
    const active = learningClasses.filter((c) => c.enrollmentStatus === "ACTIVE");
    if (active.length > 0) {
      return [...active].sort((a, b) => {
        const timeA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const timeB = b.startDate ? new Date(b.startDate).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return b.id - a.id;
      })[0];
    }
    const completed = learningClasses.filter((c) => c.enrollmentStatus === "COMPLETED");
    if (completed.length > 0) {
      return [...completed].sort((a, b) => {
        const timeA = a.endDate ? new Date(a.endDate).getTime() : 0;
        const timeB = b.endDate ? new Date(b.endDate).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return b.id - a.id;
      })[0];
    }
    return undefined;
  }, [learningClasses]);

  const allQuestsCompleted = quests.length > 0 && safeCompleted === safeTotal && safeTotal > 0;

  // Consistent Vietnam Timezone Day & Greeting
  const greetingGreeting = useMemo(() => getVietnamGreeting(), []);
  const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const currentDayOfWeek = useMemo(
    () => getVietnamDayOfWeek(todayData?.dateKey),
    [todayData?.dateKey]
  );

  // Pet details strictly from API (No placeholder defaults)
  const petSpeciesId = pet ? getSpeciesIdFromPetName(pet.name) : undefined;
  const currentSpecies = useMemo(() => {
    if (!petSpeciesId) return null;
    return PET_SPECIES_LIST.find((s) => s.id === petSpeciesId) || PET_SPECIES_LIST[0];
  }, [petSpeciesId]);

  const petHealthSafe = pet ? Math.min(100, Math.max(0, pet.health ?? 0)) : 0;
  const petHappinessSafe = pet ? Math.min(100, Math.max(0, pet.happiness ?? 0)) : 0;
  const petHungerText = petHealthSafe >= 70 ? "No nê (Sẵn sàng)" : "Cần nạp năng lượng";

  return (
    <div className="space-y-8 pb-16 font-['Quicksand',sans-serif]" id="dashboard">
      {/* ========================================================================= */}
      {/* 1. STUDENT HERO COMMAND CENTER (BreadTrans Clean Light Visual Language)   */}
      {/* ========================================================================= */}
      <section
        aria-label="Tổng quan học tập sinh viên"
        className="relative overflow-hidden rounded-3xl border border-amber-200/90 bg-gradient-to-br from-white via-amber-50/40 to-orange-50/20 p-6 sm:p-8 shadow-xs text-slate-800"
      >
        {/* Subtle decorative warmth */}
        <div
          className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-amber-400/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -left-20 -bottom-24 size-80 rounded-full bg-orange-400/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Student Profile Identity */}
          <div className="flex items-center gap-4 sm:gap-5">
            <Link
              href="/student/profile"
              aria-label="Mở hồ sơ cá nhân"
              className="group relative flex size-16 sm:size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl ring-2 ring-amber-400/40 border border-amber-300 bg-amber-100 text-2xl sm:text-3xl font-black text-amber-800 shadow-xs transition-transform hover:scale-105"
            >
              {isProfileLoading && !studentAvatar ? (
                <span className="size-full rounded-2xl bg-slate-200 animate-pulse" />
              ) : studentAvatar ? (
                <img src={studentAvatar} alt={studentName || "Avatar"} className="size-full object-cover" />
              ) : (
                (studentName ? studentName.charAt(0).toUpperCase() : "H")
              )}
              {/* Online presence dot */}
              <span
                className="absolute bottom-1 right-1 size-3.5 rounded-full bg-emerald-500 ring-2 ring-white"
                title="Đang hoạt động"
                aria-hidden="true"
              />
            </Link>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 bg-amber-100/90 px-3 py-0.5 rounded-full border border-amber-300/80 shadow-2xs">
                  {isStatsLoading ? (
                    <span className="inline-block h-3.5 w-16 rounded bg-slate-200 animate-pulse align-middle" />
                  ) : stats?.tier ? (
                    `Hạng ${stats.tier}`
                  ) : (
                    "Học viên BreadTrans"
                  )}
                </span>
                {stats?.latestDiagnostic?.level && (
                  <span className="text-[11px] font-bold text-indigo-900 bg-indigo-50 px-3 py-0.5 rounded-full border border-indigo-200">
                    Trình độ: {stats.latestDiagnostic.level}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900">
                {greetingGreeting},{" "}
                {isProfileLoading && !studentName ? (
                  <span className="inline-block h-8 w-36 rounded bg-slate-200 animate-pulse align-middle" />
                ) : (
                  <span className="text-amber-800">{studentName || "Học viên"}</span>
                )}
                !
              </h1>

              {isProfileError && (
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-xs font-semibold text-rose-600">
                    Không thể đồng bộ hồ sơ máy chủ.
                  </span>
                  <button
                    type="button"
                    onClick={() => refetchProfile()}
                    className="inline-flex min-h-[44px] items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-xl border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                  >
                    <RefreshCw size={12} aria-hidden="true" /> Tải lại hồ sơ
                  </button>
                </div>
              )}

              <p className="text-xs sm:text-sm font-semibold text-slate-600 max-w-xl leading-relaxed">
                Luyện tiếng Anh toàn diện theo 4 kỹ năng: Nghe, Nói, Đọc và Viết. Theo dõi tiến độ học tập và duy trì nhịp rèn luyện mỗi ngày.
              </p>
            </div>
          </div>

          {/* Quick Metrics & 7-Day Habit Tracker */}
          <div className="flex flex-col gap-3 sm:items-end">
            {/* 3 Core Stats Badges */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Streak */}
              <div className="rounded-2xl border border-orange-200/90 bg-white/90 p-3 sm:p-3.5 text-center shadow-2xs transition-all hover:border-orange-300">
                <span className="text-[11px] font-bold text-slate-600 flex items-center justify-center gap-1">
                  <Flame size={14} className="text-orange-500 fill-orange-500" />
                  Chuỗi học
                </span>
                {isStatsLoading ? (
                  <span className="inline-block h-6 w-14 rounded bg-slate-200 animate-pulse mt-1" />
                ) : isStatsError ? (
                  <span className="text-xs font-bold text-slate-400 mt-1 block">Không khả dụng</span>
                ) : (
                  <strong className="mt-1 block text-lg sm:text-xl font-black text-orange-600">
                    {stats?.streakCount ?? 0} ngày
                  </strong>
                )}
              </div>

              {/* Weekly EXP */}
              <div className="rounded-2xl border border-emerald-200/90 bg-white/90 p-3 sm:p-3.5 text-center shadow-2xs transition-all hover:border-emerald-300">
                <span className="text-[11px] font-bold text-slate-600 flex items-center justify-center gap-1">
                  <TrendingUp size={14} className="text-emerald-600" />
                  Điểm tuần
                </span>
                {isStatsLoading ? (
                  <span className="inline-block h-6 w-14 rounded bg-slate-200 animate-pulse mt-1" />
                ) : isStatsError ? (
                  <span className="text-xs font-bold text-slate-400 mt-1 block">Không khả dụng</span>
                ) : (
                  <strong className="mt-1 block text-lg sm:text-xl font-black text-emerald-700">
                    {stats?.weeklyExp ?? 0} EXP
                  </strong>
                )}
              </div>

              {/* Bánh Mì */}
              <Link
                href="/student/profile?tab=quotas"
                className="rounded-2xl border border-amber-200/90 bg-white/90 p-3 sm:p-3.5 text-center shadow-2xs transition-all hover:border-amber-300 block group"
                title="Xem lịch sử và đổi quà Bánh Mì"
              >
                <span className="text-[11px] font-bold text-slate-600 flex items-center justify-center gap-1 group-hover:text-amber-800 transition-colors">
                  <Gift size={14} className="text-amber-600" />
                  Bánh mì
                </span>
                {isStatsLoading ? (
                  <span className="inline-block h-6 w-14 rounded bg-slate-200 animate-pulse mt-1" />
                ) : isStatsError ? (
                  <span className="text-xs font-bold text-slate-400 mt-1 block">Không khả dụng</span>
                ) : (
                  <strong className="mt-1 block text-lg sm:text-xl font-black text-amber-700">
                    {stats?.totalBanhRan ?? 0}
                  </strong>
                )}
              </Link>
            </div>

            {/* Error retry notice if stats failed */}
            {isStatsError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-2.5 flex items-center justify-between gap-3 text-xs font-bold text-rose-800 self-stretch sm:self-auto shadow-2xs">
                <span className="flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-rose-600 shrink-0" />
                  Không thể đồng bộ chỉ số học tập
                </span>
                <button
                  type="button"
                  onClick={() => refetchStats()}
                  className="inline-flex min-h-[44px] items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-xl transition cursor-pointer shrink-0"
                >
                  <RefreshCw size={12} /> Thử lại
                </button>
              </div>
            )}

            {/* 7-Day Weekly Habit Flame Tracker (Vietnam Day Aligned) */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/90 border border-slate-200/90 text-xs font-bold self-stretch sm:self-auto justify-between sm:justify-end shadow-2xs">
              <span className="text-[11px] text-slate-500 font-bold hidden sm:inline">Tuần này:</span>
              <div className="flex items-center gap-1.5">
                {DAY_LABELS.map((day, idx) => {
                  const isPastOrToday = idx <= currentDayOfWeek;
                  const isToday = idx === currentDayOfWeek;
                  return (
                    <div
                      key={day}
                      className={`flex flex-col items-center justify-center size-6 sm:size-7 rounded-lg text-[10px] font-black transition-all ${
                        isToday
                          ? safeCompleted > 0
                            ? "bg-amber-500 text-white font-black shadow-xs"
                            : "ring-2 ring-amber-400 bg-amber-50 text-amber-800 font-black"
                          : isPastOrToday
                            ? "bg-slate-100 text-slate-700 border border-slate-200 font-bold"
                            : "bg-slate-50 text-slate-400 border border-slate-100 font-medium"
                      }`}
                      title={isToday ? "Hôm nay (Giờ Việt Nam)" : `Thứ ${day}`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
              {stats?.streakFreezes ? (
                <span
                  className="inline-flex items-center gap-1 text-[11px] text-amber-800 font-bold ml-1 pl-2.5 border-l border-slate-200"
                  title={`Bạn đang có ${stats.streakFreezes} khiên bảo vệ chuỗi`}
                >
                  <ShieldCheck size={13} className="text-amber-600" />
                  <span>{stats.streakFreezes} khiên</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. PLACEMENT TEST RECOMMENDATION BANNER                                   */}
      {/* ========================================================================= */}
      {!isStatsLoading && !stats?.hasCompletedPlacementTest && (
        <PlacementTestBanner hasCompleted={false} />
      )}

      {/* ========================================================================= */}
      {/* 3. DAILY FOCUS BENTO HUB (Nhiệm Vụ 2 Cols + Thú Cưng 1 Col)              */}
      {/* ========================================================================= */}
      <section className="grid gap-6 lg:grid-cols-3" aria-labelledby="today-quests-heading">
        {/* Left Column: Today's Quests List (2 Cols) */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs lg:col-span-2 sm:p-7 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Mục Tiêu Mỗi Ngày
              </span>
              <h2 id="today-quests-heading" className="mt-1.5 text-xl font-black text-slate-900">
                Nhiệm vụ hôm nay
              </h2>
            </div>

            {!isTodayLoading && !isTodayError && (
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-800 border border-slate-200">
                  {safeCompleted}/{safeTotal} hoàn thành
                </span>
                {summary.earnedBanh > 0 && (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800 border border-amber-200 shadow-2xs">
                    +{summary.earnedBanh} Bánh Mì hôm nay
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Daily Progress Energy Bar */}
          <div className="space-y-1.5 bg-gradient-to-r from-slate-50 via-emerald-50/25 to-teal-50/20 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Zap size={15} className="text-emerald-600 fill-emerald-600" />
                Tiến độ năng lượng ngày:
              </span>
              <strong className="text-emerald-700 font-black">
                {isTodayLoading ? "—" : `${derivedDailyPercent}%`}
              </strong>
            </div>
            <div
              className="h-3 overflow-hidden rounded-full bg-slate-100 border border-slate-200/80"
              role="progressbar"
              aria-valuenow={derivedDailyPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Tiến độ năng lượng nhiệm vụ ngày"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 transition-all duration-300"
                style={{ width: `${derivedDailyPercent}%` }}
              />
            </div>
          </div>

          {/* Quests Item List */}
          <div className="space-y-3">
            {isTodayLoading ? (
              <div className="space-y-3" role="status" aria-label="Đang tải nhiệm vụ hôm nay">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-7 shrink-0 rounded-xl bg-slate-200" />
                        <div className="space-y-1.5">
                          <div className="h-4 w-40 rounded bg-slate-200" />
                          <div className="h-3 w-56 rounded bg-slate-100" />
                        </div>
                      </div>
                      <div className="h-10 w-28 rounded-xl bg-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isTodayError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 text-center space-y-3">
                <AlertCircle size={24} className="mx-auto text-rose-500" aria-hidden="true" />
                <div>
                  <p className="text-sm font-bold text-rose-900">Không thể tải hoạt động hôm nay</p>
                  <p className="mt-0.5 text-xs text-rose-700">Đã xảy ra lỗi khi đồng bộ dữ liệu từ máy chủ.</p>
                </div>
                <button
                  type="button"
                  onClick={() => refetchToday()}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 cursor-pointer"
                >
                  <RefreshCw size={14} aria-hidden="true" /> Thử lại
                </button>
              </div>
            ) : quests.length > 0 ? (
              quests.map((item) => {
                const questObj = item.quest || item;
                const targetValue = item.targetValue ?? questObj?.targetValue ?? 1;
                const title = item.title ?? questObj?.title ?? "Nhiệm vụ học tập";
                const description = item.description ?? questObj?.description ?? "";
                const rewardBanh = item.rewardBanh ?? questObj?.rewardBanh ?? 0;
                const progressText = getQuestProgressText(item);
                const progressPercent =
                  typeof item.progressPercent === "number"
                    ? Math.min(100, Math.max(0, item.progressPercent))
                    : clampPercentage(item.currentValue, targetValue);
                const { actionLabel, actionUrl } = resolveQuestAction(item);
                const categoryMeta = getQuestCategoryMeta(item.type ?? questObj?.type);
                const CategoryIcon = categoryMeta.icon;

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border-2 p-4 transition-all ${
                      item.isCompleted
                        ? "border-emerald-200 bg-emerald-50/20 shadow-2xs"
                        : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-xl ${
                            item.isCompleted
                              ? "bg-emerald-500 text-white shadow-xs"
                              : `${categoryMeta.badgeClass} shadow-2xs`
                          }`}
                          aria-hidden="true"
                        >
                          {item.isCompleted ? <CheckCircle2 size={16} /> : <CategoryIcon size={15} />}
                        </span>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${categoryMeta.badgeClass}`}
                            >
                              {categoryMeta.label}
                            </span>
                          </div>
                          <h3 className="text-sm font-black text-slate-900">{title}</h3>
                          {description && (
                            <p className="text-xs font-semibold text-slate-500 line-clamp-1">
                              {description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-xs font-black text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/90 shadow-2xs">
                          +{rewardBanh} Bánh Mì
                        </span>

                        {item.isCompleted ? (
                          <span className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-100/80 px-3.5 text-xs font-black text-emerald-800">
                            <CheckCircle2 size={15} aria-hidden="true" className="text-emerald-600" />
                            Đã hoàn thành
                          </span>
                        ) : (
                          <Link
                            href={actionUrl}
                            className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl ${categoryMeta.btnClass} px-4 text-xs font-black shadow-xs transition-all hover:scale-[1.02] active:scale-95 cursor-pointer`}
                          >
                            <span>{actionLabel}</span>
                            <ArrowRight size={13} aria-hidden="true" />
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Progress indicator */}
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span>
                          Tiến độ: <strong className="text-slate-800">{progressText}</strong>
                        </span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div
                        className="h-2 overflow-hidden rounded-full bg-slate-100"
                        role="progressbar"
                        aria-valuenow={progressPercent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Tiến độ nhiệm vụ: ${title}`}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            item.isCompleted ? "bg-emerald-500" : categoryMeta.progressFill
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center text-xs sm:text-sm font-semibold text-slate-600">
                Chưa có nhiệm vụ nào được thiết lập cho hôm nay.
              </p>
            )}

            {/* 100% Completed Celebration State */}
            {allQuestsCompleted && (
              <div className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-emerald-100/90 border border-emerald-300 text-center text-xs sm:text-sm font-black text-emerald-800">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>Xuất sắc! Bạn đã hoàn thành toàn bộ mục tiêu học tập hôm nay!</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Mini Pet Companion Widget (1 Col) */}
        <aside className="rounded-3xl border border-slate-200/90 bg-gradient-to-b from-amber-50/40 via-white to-orange-50/20 p-6 sm:p-7 shadow-xs flex flex-col space-y-4 h-fit lg:self-start">
          {/* Pet Card Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Heart size={16} className="text-rose-500 fill-rose-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Thú Cưng Đồng Hành
              </h3>
            </div>
            {pet && (
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-100/90 text-amber-900 border border-amber-200">
                Cấp {pet.level}
              </span>
            )}
          </div>

          {/* Pet Widget Body: Loading vs Error vs Empty vs Content */}
          {isPetLoading ? (
            <div className="space-y-3.5 animate-pulse" role="status" aria-label="Đang tải dữ liệu thú cưng">
              <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-white border border-slate-100">
                <div className="size-16 rounded-2xl bg-slate-200 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-28 rounded bg-slate-200" />
                  <div className="h-3 w-36 rounded bg-slate-100" />
                  <div className="h-2 w-20 rounded bg-slate-100" />
                </div>
              </div>
              <div className="h-16 rounded-2xl bg-slate-100" />
              <div className="h-11 rounded-2xl bg-slate-200" />
            </div>
          ) : isPetError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-center space-y-2.5">
              <AlertCircle size={20} className="mx-auto text-rose-500" />
              <p className="text-xs font-bold text-rose-900">Không thể tải thông tin thú cưng</p>
              <button
                type="button"
                onClick={() => refetchPet()}
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-rose-700 cursor-pointer"
              >
                <RefreshCw size={13} /> Thử lại
              </button>
            </div>
          ) : !pet ? (
            /* Honest Empty State for learners with no pet */
            <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 p-5 text-center space-y-3">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 border border-amber-200">
                <Heart size={22} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">Chưa nhận thú cưng</h4>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Chọn một người bạn đồng hành để cùng rèn luyện tiếng Anh mỗi ngày và mở khóa nhiều phần thưởng hấp dẫn.
                </p>
              </div>
              <Link
                href="/pet"
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-black transition-all shadow-xs cursor-pointer"
              >
                <span>Nhận thú cưng ngay</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            /* Real Pet Data Display */
            <>
              {/* Pet Visual & Status */}
              <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-white border border-amber-200/70 shadow-2xs">
                <div className="size-16 rounded-2xl bg-gradient-to-br from-amber-100 via-orange-100/70 to-amber-200/40 flex items-center justify-center text-3xl border border-amber-300/80 shrink-0 shadow-xs">
                  <span>{currentSpecies?.icon || "🐾"}</span>
                </div>
                <div className="min-w-0">
                  <h4 className="text-base font-black text-slate-900 truncate">
                    {currentSpecies?.speciesName || pet.name}
                  </h4>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    {currentSpecies?.title || "Bạn đồng hành học tập"}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span
                      className={`size-2 rounded-full ${
                        petHealthSafe >= 70 ? "bg-emerald-500 animate-pulse" : "bg-orange-500"
                      }`}
                    />
                    <span className="text-[11px] font-bold text-slate-700">{petHungerText}</span>
                  </div>
                </div>
              </div>

              {/* Pet Quote Speech Bubble */}
              {currentSpecies?.quote && (
                <div className="relative rounded-2xl bg-amber-50/90 border border-amber-200/80 p-3 text-xs font-semibold text-amber-900 shadow-2xs">
                  <span className="block not-italic text-[10px] font-black uppercase text-amber-700 tracking-wider mb-0.5">
                    Lời nhắn từ {currentSpecies.name}:
                  </span>
                  &ldquo;{currentSpecies.quote}&rdquo;
                </div>
              )}

              {/* Health & Happiness Gauges */}
              <div className="space-y-2.5 text-xs font-bold text-slate-700 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="flex items-center gap-1 text-slate-600">
                      <Heart size={12} className="text-rose-500 fill-rose-500" /> Sức khỏe (Health)
                    </span>
                    <span className="text-rose-700 font-extrabold">{petHealthSafe}%</span>
                  </div>
                  <div
                    className="h-2 rounded-full bg-slate-100 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={petHealthSafe}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Sức khỏe thú cưng"
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-300"
                      style={{ width: `${petHealthSafe}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="flex items-center gap-1 text-slate-600">
                      <Smile size={12} className="text-amber-600" /> Vui vẻ (Happiness)
                    </span>
                    <span className="text-amber-700 font-extrabold">{petHappinessSafe}%</span>
                  </div>
                  <div
                    className="h-2 rounded-full bg-slate-100 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={petHappinessSafe}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Độ vui vẻ thú cưng"
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-300"
                      style={{ width: `${petHappinessSafe}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Pet Buff description */}
              {currentSpecies?.buff && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/90 text-[11px] font-bold text-amber-900 shadow-2xs">
                  <span className="font-black text-amber-800">Hiệu ứng đồng hành:</span>{" "}
                  {currentSpecies.buff}
                </div>
              )}

              {/* Action Buttons: Quick Feed & Full Pet Room */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => feedPetMutation.mutate()}
                  disabled={feedPetMutation.isPending || (stats?.totalBanhRan ?? 0) < 10}
                  className={`w-full inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl text-xs sm:text-sm font-black transition-all shadow-md cursor-pointer ${
                    (stats?.totalBanhRan ?? 0) < 10
                      ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                      : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white shadow-orange-500/20"
                  }`}
                  type="button"
                >
                  {feedPetMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Đang cho ăn...</span>
                    </>
                  ) : (
                    <>
                      <Utensils size={15} />
                      <span>Cho thú cưng ăn (10 Bánh Mì)</span>
                    </>
                  )}
                </button>

                {(stats?.totalBanhRan ?? 0) < 10 ? (
                  <p className="text-center text-[11px] font-bold text-rose-600">
                    Cần 10 Bánh Mì để cho ăn (Hiện có: {stats?.totalBanhRan ?? 0})
                  </p>
                ) : (
                  <p className="text-center text-[10px] font-semibold text-slate-500">
                    Tiêu hao 10 Bánh Mì • Thú cưng nhận +50 EXP & +20 Vui vẻ
                  </p>
                )}

                <Link
                  href="/pet"
                  className="w-full inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                >
                  <span>Vào phòng thú cưng 3D</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </>
          )}
        </aside>
      </section>

      {/* ========================================================================= */}
      {/* 4. ACTIVE LEARNING COURSE PATH                                            */}
      {/* ========================================================================= */}
      <section aria-labelledby="course-heading" className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-800 bg-amber-100/70 px-2.5 py-0.5 rounded-full border border-amber-200">
              Lộ Trình Tự Học
            </span>
            <h2 id="course-heading" className="mt-1.5 text-xl sm:text-2xl font-black text-slate-900">
              Khóa học đang học
            </h2>
          </div>
          <Link
            href="/my-courses"
            className="inline-flex min-h-[44px] items-center gap-1 text-xs sm:text-sm font-black text-slate-700 transition-colors hover:text-amber-800 cursor-pointer"
          >
            <span>Tất cả khóa học</span>
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <LearningCourseCard
          learningClass={displayedClass}
          isLoading={areClassesLoading}
          isError={isClassesError}
          onRetry={() => refetchClasses()}
        />
      </section>

      {/* ========================================================================= */}
      {/* 5. 4-SKILLS DYNAMIC MATRIX (Strict Real Data from GET /users/skills-summary) */}
      {/* ========================================================================= */}
      <section aria-labelledby="skills-heading" className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-blue-800 bg-blue-100/70 px-2.5 py-0.5 rounded-full border border-blue-200">
              Bốn Kỹ Năng Cốt Lõi
            </span>
            <h2 id="skills-heading" className="mt-1.5 text-xl sm:text-2xl font-black text-slate-900">
              Luyện tiếng Anh theo 4 kỹ năng
            </h2>
          </div>
          <Link
            href="/practice"
            className="inline-flex min-h-[44px] items-center gap-1 text-xs sm:text-sm font-black text-slate-700 transition-colors hover:text-blue-700 cursor-pointer"
          >
            <span>Trung tâm kỹ năng</span>
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </div>

        {isSkillsError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-6 text-center space-y-3">
            <AlertCircle size={24} className="mx-auto text-rose-500" />
            <div>
              <p className="text-sm font-bold text-rose-900">Không thể tải ma trận kỹ năng</p>
              <p className="mt-0.5 text-xs text-rose-700">Đã xảy ra sự cố khi kết nối tới máy chủ dữ liệu kỹ năng.</p>
            </div>
            <button
              type="button"
              onClick={() => refetchSkills()}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 cursor-pointer"
            >
              <RefreshCw size={14} /> Thử lại
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {SKILLS_CONFIG.map((skill) => {
              const Icon = skill.icon;
              const apiSkill: SkillProgressSummary | undefined = skillsSummary?.skills?.find(
                (s) => s.skill === skill.key
              );

              // Strict Real Values (Zero static fallbacks)
              const totalCount = apiSkill?.totalItems ?? 0;
              const completedCount = apiSkill?.completedItems ?? 0;
              const progressPercent = apiSkill
                ? Math.min(100, Math.max(0, Number(apiSkill.progressPercent) || 0))
                : 0;
              const levelTag = apiSkill?.levelRange?.trim() || "Chưa cập nhật";
              const unitLabel = apiSkill?.unitLabel?.trim() || "bài";

              if (isSkillsLoading) {
                return (
                  <div
                    key={skill.href}
                    className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between animate-pulse space-y-4"
                    role="status"
                    aria-label={`Đang tải ${skill.title}`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="size-12 rounded-2xl bg-slate-200" />
                        <div className="h-5 w-20 rounded-full bg-slate-200" />
                      </div>
                      <div className="h-5 w-28 rounded bg-slate-200" />
                      <div className="h-3 w-48 rounded bg-slate-100" />
                      <div className="h-2 rounded-full bg-slate-100" />
                    </div>
                    <div className="h-10 rounded-xl bg-slate-200" />
                  </div>
                );
              }

              return (
                <div
                  key={skill.href}
                  className={`group rounded-3xl border-2 bg-white p-5 shadow-xs flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-md ${skill.borderClass}`}
                >
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex size-12 items-center justify-center rounded-2xl border ${skill.bgClass} ${skill.borderClass}`}
                      >
                        <Icon size={22} aria-hidden="true" />
                      </span>
                      <span
                        className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${skill.badgeClass}`}
                      >
                        {levelTag}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900">{skill.title}</h3>
                      <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed">
                        {skill.description}
                      </p>
                    </div>

                    {/* Skill Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-500">
                        <span>
                          {totalCount > 0
                            ? `Tiến độ: ${completedCount}/${totalCount} ${unitLabel}`
                            : "Chưa có bài luyện trong danh mục"}
                        </span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div
                        className="h-2 rounded-full bg-slate-100 overflow-hidden"
                        role="progressbar"
                        aria-valuenow={progressPercent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Tiến độ ${skill.title}`}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${skill.progressClass}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100">
                    <Link
                      href={skill.href}
                      className={`w-full inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-xs font-black transition-all shadow-2xs hover:scale-[1.02] active:scale-95 cursor-pointer ${skill.btnClass}`}
                    >
                      <span>Vào luyện tập</span>
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 6. PRACTICE & TOOLS BENTO HUB (TOEIC Arena, Flashcard SRS & Grammar)      */}
      {/* ========================================================================= */}
      <section aria-labelledby="tools-heading" className="space-y-4">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-orange-800 bg-orange-100/70 px-2.5 py-0.5 rounded-full border border-orange-200">
            Trung Tâm Luyện Đề &amp; Công Cụ Bổ Trợ
          </span>
          <h2 id="tools-heading" className="mt-1.5 text-xl sm:text-2xl font-black text-slate-900">
            Luyện đề TOEIC &amp; Tăng tốc ghi nhớ
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {/* Card 1: ETS TOEIC Simulation Arena */}
          <div className="rounded-3xl border-2 border-orange-200/90 bg-gradient-to-br from-orange-50/70 via-white to-amber-50/40 p-6 shadow-xs flex flex-col justify-between hover:border-orange-300 transition-colors">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-xs">
                  <Trophy size={22} aria-hidden="true" />
                </span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-200">
                  Format ETS 2024
                </span>
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900">Đấu Trường Luyện Đề TOEIC</h3>
                <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed">
                  Thi thử 200 câu bấm giờ 120 phút mô phỏng áp lực phòng thi thực tế. Báo cáo điểm mạnh yếu từng Part.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white border border-orange-200/80 text-xs font-bold text-slate-700 space-y-1">
                <p className="flex justify-between">
                  <span>Đề thi đã hoàn thành:</span>
                  {isStatsLoading ? (
                    <span className="inline-block h-4 w-12 rounded bg-slate-200 animate-pulse" />
                  ) : isStatsError ? (
                    <strong className="text-slate-400 font-bold">—</strong>
                  ) : (
                    <strong className="text-orange-800 font-black">
                      {stats?.totalQuizzesDone ?? 0} bộ đề
                    </strong>
                  )}
                </p>
                <p className="flex justify-between text-slate-500">
                  <span>Độ chính xác trung bình:</span>
                  {isStatsLoading ? (
                    <span className="inline-block h-4 w-12 rounded bg-slate-200 animate-pulse" />
                  ) : isStatsError ? (
                    <strong className="text-slate-400 font-bold">—</strong>
                  ) : (
                    <strong className="text-slate-900 font-bold">
                      {stats?.quizAccuracy ? `${stats.quizAccuracy}%` : "Chưa có bài thi"}
                    </strong>
                  )}
                </p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-orange-100">
              <Link
                href="/practice/quizzes"
                className="w-full inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-black text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
              >
                <span>Vào phòng thi ETS</span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Card 2: Spaced Repetition Flashcards */}
          <div className="rounded-3xl border-2 border-amber-200/90 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/30 p-6 shadow-xs flex flex-col justify-between hover:border-amber-300 transition-colors">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xs">
                  <Layers size={22} aria-hidden="true" />
                </span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  Thuật toán SRS Leitner
                </span>
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900">Flashcard Ghi Nhớ Siêu Tốc</h3>
                <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed">
                  Lặp ngắt quãng thông minh: từ nào hay quên sẽ được nhắc lại thường xuyên hơn để ghi nhớ vĩnh viễn.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white border border-amber-200/80 text-xs font-bold text-slate-700 space-y-1">
                <p className="flex justify-between">
                  <span>Từ vựng đã làm chủ:</span>
                  {isStatsLoading ? (
                    <span className="inline-block h-4 w-12 rounded bg-slate-200 animate-pulse" />
                  ) : isStatsError ? (
                    <strong className="text-slate-400 font-bold">—</strong>
                  ) : (
                    <strong className="text-amber-800 font-black">
                      {stats?.masteredVocabCount ?? 0} từ
                    </strong>
                  )}
                </p>
                <p className="flex justify-between text-slate-500">
                  <span>Kho từ học thuật:</span>
                  <strong className="text-slate-900 font-bold">3.000+ từ công sở</strong>
                </p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-amber-100">
              <Link
                href="/flashcard"
                className="w-full inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
              >
                <span>Ôn từ vựng ngay</span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Card 3: 24 Core Grammar Topics */}
          <div className="rounded-3xl border-2 border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/30 p-6 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-colors">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
                  <BookOpen size={22} aria-hidden="true" />
                </span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                  Sơ đồ tư duy
                </span>
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900">24 Chuyên Đề Ngữ Pháp</h3>
                <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed">
                  Bản đồ tư duy tóm tắt cấu trúc ngữ pháp trọng tâm, ví dụ thực chiến và bài tập giải thích chi tiết.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white border border-emerald-200/80 text-xs font-bold text-slate-700 space-y-1">
                <p className="flex justify-between">
                  <span>Chuyên đề trọng tâm:</span>
                  <strong className="text-emerald-800 font-black">24 chủ điểm</strong>
                </p>
                <p className="flex justify-between text-slate-500">
                  <span>Bám sát format:</span>
                  <strong className="text-slate-900 font-bold">TOEIC Part 5 - 6</strong>
                </p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-emerald-100">
              <Link
                href="/grammar"
                className="w-full inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
              >
                <span>Học ngữ pháp</span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
