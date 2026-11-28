"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Crown,
  FileText,
  Flame,
  Headphones,
  Layers,
  ListChecks,
  Mic,
  PenTool,
  RefreshCw,
  Target,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { BreadCoinIcon } from "@/components/ui/BreadCoinIcon";
import { StreakShieldIcon } from "@/components/ui/StreakShieldIcon";
import { useAuthStore } from "@/stores/authStore";
import {
  gamificationService,
  TodayQuestItem,
} from "@/lib/api/services/gamification.service";
import { userService, UserProfile } from "@/lib/api/services/user.service";
import { diagnosticBadgeLabel } from "@/lib/diagnostic/diagnosticUiLogic";
import {
  planService,
  PLAN_QUERY_KEYS,
  type EffectivePlan,
} from "@/lib/api/services/plan.service";
import { LevelChoiceCard } from "@/components/dashboard/LevelChoiceCard";
import { SkillLevelsCard } from "@/components/dashboard/SkillLevelsCard";
import { StarterRoadmapCard } from "@/components/learning-path/StarterRoadmapCard";
import { ProgressCard } from "@/components/learning-path/ProgressCard";
import { MistakesDashboardCard } from "@/components/mistakes/MistakesDashboardCard";
import { TodayPlanCard } from "@/components/learning-path/TodayPlanCard";
import { WeekPlanCard } from "@/components/learning-path/WeekPlanCard";
import { learningPathService } from "@/lib/api/services/learningPath.service";
import { ONBOARDING_SKIPPED_KEY, shouldOpenOnboarding } from "@/lib/learning-path/onboarding";
import { useRouter } from "next/navigation";
import { DashboardCompanionCard } from "@/modules/pet/components/DashboardCompanionCard";
import { PlanExpiryBanner } from "@/modules/subscription/components/PlanExpiryBanner";
import {
  canAccessFilterPeriod,
  clampPercentage,
  FILTER_PERIODS,
  type FilterPeriod,
  getVietnamDayOfWeek,
  getVietnamGreeting,
  learningSummaryParams,
  periodPhrase,
  resolveQuestAction,
  SKILL_DETAIL_CONFIGS,
  SKILL_TILE_ORDER,
  type SkillKey,
  weekDayState,
  type WeekDayState,
} from "./dashboardUtils";
import { formatStudyTime } from "@/lib/practice/studyTime";

const emptySubscribe = () => () => {};

/** "Tuần này" cells: a studied day is lit in the same amber as today done. */
const WEEK_DAY_CLASS: Record<WeekDayState, string> = {
  "today-done": "bg-amber-500 text-white font-black shadow-xs",
  "today-pending":
    "ring-2 ring-amber-400 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-black",
  studied:
    "bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-black",
  missed:
    "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold",
  future:
    "bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800 font-medium",
};

const WEEK_DAY_TEXT: Record<WeekDayState, (day: string) => string> = {
  "today-done": () => "Hôm nay: đã học",
  "today-pending": () => "Hôm nay: chưa học",
  studied: (day) => `${day}: đã học`,
  missed: (day) => `${day}: chưa học`,
  future: (day) => `${day}: chưa tới`,
};

function getQuestProgressText(item: TodayQuestItem): string {
  const target = item.targetValue ?? item.quest?.targetValue ?? 1;
  const current = Math.min(Math.max(0, item.currentValue ?? 0), target);
  const type = (item.type ?? item.quest?.type ?? "").toUpperCase();

  if (type === "LEARN_VOCAB" || type === "DO_VOCAB") {
    return `${current}/${target} từ`;
  }
  if (
    [
      "DO_LISTENING",
      "DO_READING",
      "DO_WRITING",
      "PERFECT_QUIZ",
      "COMPLETE_QUIZ",
      "DO_SPEAKING",
      "PRACTICE_SPEAKING",
    ].includes(type)
  ) {
    return `${current}/${target} bài`;
  }
  return `${current}/${target}`;
}

function getQuestCategoryMeta(type?: string) {
  const upper = (type || "").toUpperCase();
  switch (upper) {
    case "LEARN_VOCAB":
    case "DO_VOCAB":
      return {
        label: "Từ vựng",
        badgeClass: "bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        btnClass: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20",
        progressFill: "bg-amber-500",
        icon: BookOpen,
      };
    case "DO_LISTENING":
      return {
        label: "Luyện nghe",
        badgeClass: "bg-blue-100 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        btnClass: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20",
        progressFill: "bg-blue-500",
        icon: Headphones,
      };
    case "DO_READING":
      return {
        label: "Đọc hiểu",
        badgeClass: "bg-blue-100 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        btnClass: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20",
        progressFill: "bg-blue-500",
        icon: BookOpen,
      };
    case "DO_WRITING":
      return {
        label: "Luyện viết",
        badgeClass: "bg-blue-100 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        btnClass: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20",
        progressFill: "bg-blue-500",
        icon: PenTool,
      };
    case "PERFECT_QUIZ":
      return {
        label: "Làm đúng 100%",
        badgeClass: "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        btnClass: "bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-600/20",
        progressFill: "bg-emerald-500",
        icon: Target,
      };
    case "COMPLETE_QUIZ":
      return {
        label: "Luyện kỹ năng",
        badgeClass: "bg-blue-100 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        btnClass: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20",
        progressFill: "bg-blue-500",
        icon: CheckCircle2,
      };
    case "DO_SPEAKING":
    case "PRACTICE_SPEAKING":
      return {
        label: upper === "PRACTICE_SPEAKING" ? "Phát âm" : "Luyện nói",
        badgeClass: "bg-teal-100 dark:bg-teal-950/70 text-teal-900 dark:text-teal-300 border-teal-200 dark:border-teal-800",
        btnClass: "bg-teal-700 hover:bg-teal-800 text-white shadow-teal-600/20",
        progressFill: "bg-teal-500",
        icon: Mic,
      };
    default:
      return {
        label: "Bài học",
        badgeClass: "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        btnClass: "bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-600/20",
        progressFill: "bg-emerald-500",
        icon: CheckCircle2,
      };
  }
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
  const diagnosticBadge = diagnosticBadgeLabel(stats?.latestDiagnostic?.level);

  // Learning profile (F5): onboarding once, then the level card.
  const router = useRouter();
  const { data: learnerProfile } = useQuery({
    queryKey: ["learning-path-profile"],
    queryFn: learningPathService.getProfile,
    enabled,
    staleTime: 60_000,
  });
  useEffect(() => {
    let skipped = false;
    try {
      skipped = sessionStorage.getItem(ONBOARDING_SKIPPED_KEY) === "1";
    } catch {
      skipped = false;
    }
    if (shouldOpenOnboarding(learnerProfile, skipped)) router.replace("/onboarding");
  }, [learnerProfile, router]);

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


  const {
    data: dailyPractice,
  } = useQuery({
    queryKey: ["daily-practice", user?.id],
    queryFn: userService.getDailyPractice,
    enabled,
    staleTime: 30_000,
  });

  // 5. User Effective Subscription Plan
  const { data: effectivePlan } = useQuery<EffectivePlan>({
    queryKey: PLAN_QUERY_KEYS.effectivePlan,
    queryFn: planService.getEffectivePlan,
    enabled,
    staleTime: 60_000,
  });

  const userPlanCode = (effectivePlan?.plan?.code ?? "FREE").toUpperCase();

  // Query invalidation on external learning events
  useEffect(() => {
    const handleLearningEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-today", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-stats", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["my-pet", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["learning-summary"] });
      queryClient.invalidateQueries({ queryKey: ["daily-practice", user?.id] });
      queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.effectivePlan });
    };
    window.addEventListener("breadtrans:learning-event", handleLearningEvent);
    return () => window.removeEventListener("breadtrans:learning-event", handleLearningEvent);
  }, [queryClient, user?.id]);

  // Quests & Objectives Defensive Calculations
  const quests = useMemo(() => todayData?.quests ?? [], [todayData?.quests]);
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

  // Filter Period & Gating States
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("today");
  const [upgradePrompt, setUpgradePrompt] = useState<{
    isOpen: boolean;
    requiredTier: "PLUS" | "PRO";
    periodLabel: string;
  } | null>(null);

  // The upgrade dialog closes with Escape, as a modal should.
  useEffect(() => {
    if (!upgradePrompt?.isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setUpgradePrompt(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [upgradePrompt?.isOpen]);

  // Active Skill Dropdown State (Accordion detail expansion)
  const [activeDetailKey, setActiveDetailKey] = useState<SkillKey | null>(null);

  const handleToggleDetail = (key: SkillKey) => {
    setActiveDetailKey((prev) => (prev === key ? null : key));
  };

  // Custom Date Range State
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const customDays = useMemo(() => {
    if (!customStartDate || !customEndDate) return 7;
    const s = new Date(customStartDate).getTime();
    const e = new Date(customEndDate).getTime();
    if (isNaN(s) || isNaN(e) || e < s) return 1;
    return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
  }, [customStartDate, customEndDate]);

  const handleSelectPeriod = (periodKey: FilterPeriod) => {
    const cfg = FILTER_PERIODS.find((p) => p.key === periodKey);
    if (!cfg) return;

    if (canAccessFilterPeriod(periodKey, userPlanCode)) {
      setFilterPeriod(periodKey);
    } else {
      setUpgradePrompt({
        isOpen: true,
        requiredTier: cfg.requiredTier as "PLUS" | "PRO",
        periodLabel: cfg.label,
      });
    }
  };

  // "Kết quả học tập" from GET /users/me/learning-summary, the learner's own
  // rows (owner 2026-11-26: these figures were made up here, e.g. "1m" of
  // study with nothing done, or the month's XP as 40 % of all XP).
  const summaryParams = learningSummaryParams(filterPeriod, customStartDate, customEndDate);
  const customReady =
    filterPeriod !== "custom" || (Boolean(customStartDate) && Boolean(customEndDate) && customStartDate <= customEndDate);
  const { data: learningSummary } = useQuery({
    queryKey: ["learning-summary", summaryParams],
    queryFn: () => userService.getLearningSummary(summaryParams),
    enabled: canAccessFilterPeriod(filterPeriod, userPlanCode) && customReady,
  });
  const periodText = periodPhrase(filterPeriod);
  const totals = learningSummary?.totals;
  const formatCount = (n: number, unit: string) => `${n.toLocaleString("vi-VN")} ${unit}`;
  const studyDurationText = totals ? formatStudyTime(totals.studySeconds) : "—";
  const questionsPracticedText = totals ? formatCount(totals.questions, "câu") : "—";
  const vocabLearnedText = totals ? formatCount(totals.vocabMastered, "từ") : "—";
  const xpEarnedText = totals ? formatCount(totals.xp, "XP") : "—";

  const shieldCount = stats?.streakFreezes ?? 0;

  // The six tiles, each counting what it says (exams in "đề", lessons in "bài").
  const tileIcons: Record<SkillKey, typeof FileText> = {
    exam: FileText,
    reading: BookOpen,
    listening: Headphones,
    speaking: Mic,
    writing: PenTool,
    vocab: Layers,
  };
  const breakdownData = SKILL_TILE_ORDER.map((key) => {
    const cfg = SKILL_DETAIL_CONFIGS[key];
    const skill = learningSummary?.skills?.[cfg.summaryKey];
    return {
      key,
      label: cfg.label,
      count: skill ? formatCount(skill.count, cfg.unit) : "—",
      icon: tileIcons[key],
      href: cfg.ctaHref,
    };
  });

  // The open tile's detail, for the same period: time in its rooms, what was
  // done, the days with either, and today's quest for the skill when there is one.
  const activeSkillData = useMemo(() => {
    if (!activeDetailKey) return null;
    const cfg = SKILL_DETAIL_CONFIGS[activeDetailKey];
    const skill = learningSummary?.skills?.[cfg.summaryKey];
    const quest = quests.find((q) => cfg.questTypes.includes((q.type ?? q.quest?.type ?? "").toUpperCase()));
    const target = quest ? (quest.targetValue ?? quest.quest?.targetValue ?? 0) : 0;
    const current = quest ? (quest.currentValue ?? 0) : 0;
    return {
      ...cfg,
      quest: quest && target > 0 ? { text: `${current}/${target}`, percent: clampPercentage(current, target) } : null,
      timeText: skill ? formatStudyTime(skill.seconds) : "—",
      countText: skill ? formatCount(skill.count, cfg.unit) : "—",
      daysText: skill ? (learningSummary?.days ? `${skill.days}/${learningSummary.days} ngày` : `${skill.days} ngày`) : "—",
    };
  }, [activeDetailKey, learningSummary, quests]);

  const allQuestsCompleted = quests.length > 0 && safeCompleted === safeTotal && safeTotal > 0;

  // Consistent Vietnam Timezone Day & Greeting
  const greetingGreeting = useMemo(() => getVietnamGreeting(), []);
  const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const currentDayOfWeek = useMemo(
    () => getVietnamDayOfWeek(todayData?.dateKey),
    [todayData?.dateKey]
  );

  return (
    <div className="space-y-8 pb-16 font-['Quicksand',sans-serif]" id="dashboard">
      <PlanExpiryBanner />
      {/* ========================================================================= */}
      {/* 1. STUDENT HERO COMMAND CENTER (BreadTrans Clean Light Visual Language)   */}
      {/* ========================================================================= */}
      <section
        aria-label="Tổng quan học tập sinh viên"
        className="bg-white dark:bg-slate-900 relative overflow-hidden rounded-3xl border border-amber-200/90 dark:border-amber-900/50 p-6 sm:p-8 shadow-xs text-slate-800 dark:text-slate-200"
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
              href="/hub?tab=account-profile"
              aria-label="Mở hồ sơ cá nhân"
              className="group relative flex size-16 sm:size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl ring-2 ring-amber-400/40 border border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-950 text-2xl sm:text-3xl font-black text-amber-800 dark:text-amber-300 shadow-xs transition-transform hover:scale-105"
            >
              {isProfileLoading && !studentAvatar ? (
                <span className="size-full rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
              ) : studentAvatar ? (
                <img src={studentAvatar} alt={studentName || "Avatar"} className="size-full object-cover" />
              ) : (
                (studentName ? studentName.charAt(0).toUpperCase() : "H")
              )}
              {/* Online presence dot */}
              <span
                className="absolute bottom-1 right-1 size-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"
                title="Đang hoạt động"
                aria-hidden="true"
              />
            </Link>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/60 px-3 py-0.5 rounded-full border border-amber-300/80 dark:border-amber-800/60 shadow-2xs">
                  {isStatsLoading ? (
                    <span className="inline-block h-3.5 w-16 rounded bg-slate-200 dark:bg-slate-800 animate-pulse align-middle" />
                  ) : stats?.tier ? (
                    `Hạng ${stats.tier}`
                  ) : (
                    "Học viên BreadTrans"
                  )}
                </span>
                {diagnosticBadge && (
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-3 py-0.5 rounded-full border border-blue-200 dark:border-blue-800/60">
                    {diagnosticBadge}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                {greetingGreeting},
                {isProfileLoading && !studentName ? (
                  <span className="mt-1 block h-8 w-36 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                ) : (
                  <span className="block text-amber-800 dark:text-amber-400">{studentName || "Học viên"}!</span>
                )}
              </h1>

              {isProfileError && (
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                    Không thể đồng bộ hồ sơ máy chủ.
                  </span>
                  <button
                    type="button"
                    onClick={() => refetchProfile()}
                    className="inline-flex min-h-[44px] items-center gap-1 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 px-3 py-1 rounded-xl border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition cursor-pointer"
                  >
                    <RefreshCw size={12} aria-hidden="true" /> Tải lại hồ sơ
                  </button>
                </div>
              )}

              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                Luyện Nghe, Nói, Đọc, Viết và theo dõi tiến độ của bạn.
              </p>
            </div>
          </div>

          {/* Quick Metrics & 7-Day Habit Tracker */}
          <div className="flex flex-col gap-3 sm:items-end">
            {/* Streak shield (outside, left of the streak tile) + 3 Core Stats Badges */}
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {shieldCount > 0 && !isStatsLoading && !isStatsError && (
              <div
                className="flex shrink-0 flex-col items-center gap-0.5"
                title={`${shieldCount} khiên giữ chuỗi: lỡ một ngày học, 1 khiên tự được dùng để chuỗi không mất`}
              >
                <StreakShieldIcon count={shieldCount} className="h-9 w-8 sm:h-14 sm:w-[50px]" />
                <span className="text-xs font-bold text-blue-800 dark:text-blue-300" aria-hidden="true">
                  khiên
                </span>
                <span className="sr-only">{`${shieldCount} khiên giữ chuỗi`}</span>
              </div>
            )}
            <div className="grid flex-1 grid-cols-3 gap-2 sm:flex-none sm:gap-3">
              {/* Streak */}
              <div className="rounded-2xl border border-orange-200/90 dark:border-orange-900/50 bg-white/90 dark:bg-slate-900 px-2 py-3 sm:p-3.5 text-center shadow-2xs transition-all hover:border-orange-300 dark:hover:border-orange-700">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center justify-center gap-1">
                  <Flame size={14} className="text-orange-500 fill-orange-500" />
                  Chuỗi học
                </span>
                {isStatsLoading ? (
                  <span className="inline-block h-6 w-14 rounded bg-slate-200 dark:bg-slate-800 animate-pulse mt-1" />
                ) : isStatsError ? (
                  <span className="text-xs font-bold text-slate-600 mt-1 block dark:text-slate-400">Không khả dụng</span>
                ) : (
                  <strong className="mt-1 block text-base sm:text-xl font-black text-orange-700 dark:text-orange-400">
                    {stats?.streakCount ?? 0} ngày
                  </strong>
                )}
              </div>

              {/* Weekly EXP */}
              <div className="rounded-2xl border border-emerald-200/90 dark:border-emerald-900/50 bg-white/90 dark:bg-slate-900 px-2 py-3 sm:p-3.5 text-center shadow-2xs transition-all hover:border-emerald-300 dark:hover:border-emerald-700">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center justify-center gap-1">
                  <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400" />
                  Điểm tuần
                </span>
                {isStatsLoading ? (
                  <span className="inline-block h-6 w-14 rounded bg-slate-200 dark:bg-slate-800 animate-pulse mt-1" />
                ) : isStatsError ? (
                  <span className="text-xs font-bold text-slate-600 mt-1 block dark:text-slate-400">Không khả dụng</span>
                ) : (
                  <strong className="mt-1 block text-base sm:text-xl font-black text-emerald-700 dark:text-emerald-400">
                    {stats?.weeklyExp ?? 0} XP
                  </strong>
                )}
              </div>

              {/* Bánh Mì */}
              <Link
              href="/hub?tab=account-plan"
                className="rounded-2xl border border-amber-200/90 dark:border-amber-900/50 bg-white/90 dark:bg-slate-900 px-2 py-3 sm:p-3.5 text-center shadow-2xs transition-all hover:border-amber-300 dark:hover:border-amber-700 block group"
                title="Xem lịch sử và đổi quà Bánh Mì"
              >
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center justify-center gap-1 group-hover:text-amber-800 dark:group-hover:text-amber-300 transition-colors">
                  <BreadCoinIcon size={14} />
                  Bánh Mì
                </span>
                {isStatsLoading ? (
                  <span className="inline-block h-6 w-14 rounded bg-slate-200 dark:bg-slate-800 animate-pulse mt-1" />
                ) : isStatsError ? (
                  <span className="text-xs font-bold text-slate-600 mt-1 block dark:text-slate-400">Không khả dụng</span>
                ) : (
                  <strong className="mt-1 block text-base sm:text-xl font-black text-amber-700 dark:text-amber-400">
                    {stats?.totalBanhRan ?? 0}
                  </strong>
                )}
              </Link>
            </div>
            </div>

            {/* Error retry notice if stats failed */}
            {isStatsError && (
              <div className="rounded-2xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/90 dark:bg-rose-950/40 p-2.5 flex items-center justify-between gap-3 text-xs font-bold text-rose-800 dark:text-rose-300 self-stretch sm:self-auto shadow-2xs">
                <span className="flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
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
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/90 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs font-bold self-stretch sm:self-auto justify-between sm:justify-end shadow-2xs">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-bold hidden sm:inline">Tuần này:</span>
              <div className="flex items-center gap-1.5">
                {DAY_LABELS.map((day, idx) => {
                  const state = weekDayState(
                    idx,
                    currentDayOfWeek,
                    stats?.studiedDaysThisWeek,
                    safeCompleted > 0,
                  );
                  const dayName = idx < 6 ? `Thứ ${idx + 2}` : "Chủ nhật";
                  const label = WEEK_DAY_TEXT[state](dayName);
                  return (
                    <div
                      key={day}
                      className={`flex flex-col items-center justify-center size-6 sm:size-7 rounded-lg text-xs font-black transition-all ${WEEK_DAY_CLASS[state]}`}
                      title={label}
                    >
                      <span aria-hidden="true">{day}</span>
                      <span className="sr-only">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Subtle decorative divider */}
        <div className="relative my-6 sm:my-7 border-t border-amber-200/70 dark:border-slate-800" />

        {/* KẾT QUẢ HỌC TẬP Command Block */}
        <div className="relative space-y-4 sm:space-y-5">
          {/* Section Header & Period Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              KẾT QUẢ HỌC TẬP
            </h2>

            <div className="inline-flex max-w-full flex-wrap items-center gap-1 p-1 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              {FILTER_PERIODS.map((period) => {
                const isActive = filterPeriod === period.key;
                const requiresUpgrade = !canAccessFilterPeriod(period.key, userPlanCode);
                return (
                  <button
                    key={period.key}
                    type="button"
                    onClick={() => handleSelectPeriod(period.key)}
                    aria-pressed={isActive}
                    aria-label={
                      period.requiredTier !== "FREE"
                        ? `${period.label} (Yêu cầu gói ${period.requiredTier === "PLUS" ? "Plus trở lên" : "Pro"})`
                        : period.label
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "border border-blue-500 bg-blue-50/90 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-black shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <span>{period.label}</span>
                    {period.requiredTier !== "FREE" && (
                      <span
                        className={`inline-flex items-center ${
                          requiresUpgrade
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-amber-700 dark:text-amber-400"
                        }`}
                        title={
                          period.requiredTier === "PLUS"
                            ? "Yêu cầu gói Plus trở lên"
                            : "Yêu cầu gói Pro"
                        }
                      >
                        <Crown size={12} className="fill-amber-500 text-amber-500 shrink-0" aria-hidden="true" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Date Range Picker when Custom mode is selected */}
          {filterPeriod === "custom" && (
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
              <span className="text-slate-600 dark:text-slate-400">Khoảng thời gian:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                aria-label="Ngày bắt đầu tùy chỉnh"
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-slate-600 dark:text-slate-400">đến</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                aria-label="Ngày kết thúc tùy chỉnh"
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                ({customDays} ngày)
              </span>
            </div>
          )}

          {/* Row 1: 4 Summary Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Study Time */}
            <div className="flex flex-col items-start gap-2 min-[360px]:flex-row min-[360px]:items-center min-[360px]:gap-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-3 sm:p-3.5 shadow-2xs">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Clock size={20} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-lg lg:text-xl font-black text-slate-900 dark:text-slate-100">
                  {studyDurationText}
                </div>
                <div className="text-sm font-semibold leading-snug text-slate-600 dark:text-slate-400">
                  Thời gian học
                </div>
              </div>
            </div>

            {/* 2. Questions Practiced */}
            <div className="flex flex-col items-start gap-2 min-[360px]:flex-row min-[360px]:items-center min-[360px]:gap-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-3 sm:p-3.5 shadow-2xs">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <ListChecks size={20} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-lg lg:text-xl font-black text-slate-900 dark:text-slate-100">
                  {questionsPracticedText}
                </div>
                <div className="text-sm font-semibold leading-snug text-slate-600 dark:text-slate-400">
                  Câu đã luyện
                </div>
              </div>
            </div>

            {/* 3. Vocab Learned */}
            <div className="flex flex-col items-start gap-2 min-[360px]:flex-row min-[360px]:items-center min-[360px]:gap-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-3 sm:p-3.5 shadow-2xs">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <BookOpen size={20} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-lg lg:text-xl font-black text-slate-900 dark:text-slate-100">
                  {vocabLearnedText}
                </div>
                <div className="text-sm font-semibold leading-snug text-slate-600 dark:text-slate-400">
                  Từ vựng đã học
                </div>
              </div>
            </div>

            {/* The streak tile went (owner 2026-11-25); the streak stays in its own places. */}
            {/* 4. XP Earned */}
            <div className="flex flex-col items-start gap-2 min-[360px]:flex-row min-[360px]:items-center min-[360px]:gap-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-3 sm:p-3.5 shadow-2xs">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Target size={20} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-lg lg:text-xl font-black text-slate-900 dark:text-slate-100">
                  {xpEarnedText}
                </div>
                <div className="text-sm font-semibold leading-snug text-slate-600 dark:text-slate-400">
                  XP nhận được
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: 6 Skill Breakdown Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {breakdownData.map((item) => {
              const Icon = item.icon;
              const isActive = activeDetailKey === item.key;
              const Chevron = isActive ? ChevronUp : ChevronDown;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleToggleDetail(item.key)}
                  className={`group flex flex-col justify-between rounded-2xl p-3 sm:p-3.5 shadow-2xs transition-all cursor-pointer text-left ${
                    isActive
                      ? "border-2 border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 shadow-xs ring-2 ring-blue-500/20"
                      : "border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-xs"
                  }`}
                  aria-expanded={isActive}
                  aria-controls={`skill-detail-${item.key}`}
                  title={`Xem chi tiết ${item.label}`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <Icon
                        size={14}
                        className={
                          isActive
                            ? "text-blue-600 dark:text-blue-400 shrink-0"
                            : "text-slate-600 dark:text-slate-400 shrink-0"
                        }
                        aria-hidden="true"
                      />
                      <span className={`truncate ${isActive ? "text-blue-600 dark:text-blue-400 font-black" : ""}`}>
                        {item.label}
                      </span>
                    </span>
                    <Chevron
                      size={14}
                      className={
                        isActive
                          ? "text-blue-600 dark:text-blue-400 shrink-0"
                          : "text-slate-600 group-hover:translate-y-0.5 transition-transform shrink-0 dark:text-slate-400"
                      }
                      aria-hidden="true"
                    />
                  </div>
                  <div
                    className={`mt-2 text-base sm:text-lg font-black ${
                      isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-slate-100"
                    }`}
                  >
                    {item.count}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Expandable Progress Detail Panel (Accordion dropdown below Row 2) */}
          {activeSkillData && (
            <div
              id={`skill-detail-${activeSkillData.key}`}
              className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-4 sm:p-5 shadow-xs space-y-4 sm:space-y-5 animate-in fade-in duration-150"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
                  Chi tiết · {activeSkillData.title}
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveDetailKey(null)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer dark:text-slate-400"
                >
                  Đóng
                </button>
              </div>

              {/* Figures of the chosen period (owner 2026-11-26: the made-up parts table went). */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {activeSkillData.quest && (
                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3 flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Nhiệm vụ hôm nay</span>
                    <div>
                      <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                        {activeSkillData.quest.text}
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${activeSkillData.quest.percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                {[
                  { label: "Thời gian luyện", value: activeSkillData.timeText },
                  { label: activeSkillData.doneLabel, value: activeSkillData.countText },
                  { label: "Ngày có luyện", value: activeSkillData.daysText },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3 flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{item.label}</span>
                    <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                      {item.value}
                    </div>
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5">{periodText}</div>
                  </div>
                ))}
              </div>

              {/* Bottom CTA Button */}
              <div className="flex justify-end pt-1">
                <Link
                  href={activeSkillData.ctaHref}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-2xs hover:shadow-xs transition cursor-pointer"
                >
                  <span>{activeSkillData.ctaLabel}</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Modal Dialog yêu cầu nâng cấp gói */}
        {upgradePrompt?.isOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upgrade-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          >
            <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
              <button
                type="button"
                onClick={() => setUpgradePrompt(null)}
                className="absolute top-4 right-4 p-1 rounded-lg text-slate-600 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer dark:text-slate-400"
                aria-label="Đóng thông báo"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                  <Crown size={22} className="fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <span className="text-sm font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    {upgradePrompt.requiredTier === "PLUS" ? "Yêu cầu gói Plus trở lên" : "Yêu cầu gói Pro"}
                  </span>
                  <h3 id="upgrade-modal-title" className="text-xl font-black text-slate-900 dark:text-slate-100">
                    Mở khóa bộ lọc {upgradePrompt.periodLabel}
                  </h3>
                </div>
              </div>

              <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                {upgradePrompt.requiredTier === "PLUS" ? (
                  <>
                    Chế độ xem thống kê theo <strong>{upgradePrompt.periodLabel}</strong> dành riêng cho học viên đăng ký gói <strong>Plus</strong> hoặc <strong>Pro</strong>. Hãy nâng cấp để theo dõi tiến độ học tập tuần và tháng chi tiết.
                  </>
                ) : (
                  <>
                    Chế độ xem thống kê <strong>{upgradePrompt.periodLabel}</strong> dành riêng cho thành viên gói <strong>Pro</strong>. Nâng cấp ngay để mở khóa toàn bộ lịch sử học tập và tùy chỉnh mốc thời gian không giới hạn.
                  </>
                )}
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setUpgradePrompt(null)}
                  className="min-h-11 px-4 py-2 rounded-xl text-base font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Để sau
                </button>
                <Link
                  href="/plans"
                  onClick={() => setUpgradePrompt(null)}
                  className="inline-flex min-h-11 items-center gap-1.5 px-4 py-2 rounded-xl text-base font-black text-white bg-amber-500 hover:bg-amber-600 transition shadow-xs cursor-pointer"
                >
                  <span>Xem các gói</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 2. PLACEMENT TEST RECOMMENDATION BANNER                                   */}
      {/* ========================================================================= */}
      <LevelChoiceCard profile={learnerProfile} />
      <StarterRoadmapCard profile={learnerProfile} />
      <SkillLevelsCard profile={learnerProfile} />
      <WeekPlanCard enabled={enabled && Boolean(learnerProfile?.onboarded)} />
      <ProgressCard enabled={enabled && Boolean(learnerProfile?.onboarded)} />
      <MistakesDashboardCard enabled={enabled && Boolean(learnerProfile?.onboarded)} />
      <TodayPlanCard enabled={enabled && Boolean(learnerProfile?.onboarded)} />

      {/* ========================================================================= */}
      {/* 3. DAILY FOCUS BENTO HUB (Nhiệm Vụ 2 Cols + Thú Ảo 1 Col)              */}
      {/* ========================================================================= */}
      <section className="grid gap-6 lg:grid-cols-3" aria-labelledby="today-quests-heading">
        {/* Left Column: Today's Quests List (2 Cols) */}
        <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs lg:col-span-2 sm:p-7 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Mục Tiêu Mỗi Ngày
              </span>
              <h2 id="today-quests-heading" className="mt-1.5 text-xl font-black text-slate-900 dark:text-slate-100">
                Nhiệm vụ hôm nay
              </h2>
            </div>

            {!isTodayLoading && !isTodayError && (
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-black text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                  {safeCompleted}/{safeTotal} hoàn thành
                </span>
                {summary.earnedBanh > 0 && (
                  <span className="rounded-full bg-amber-50 dark:bg-amber-950/60 px-3 py-1 text-xs font-black text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs">
                    +{summary.earnedBanh} Bánh Mì hôm nay
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Daily Progress Energy Bar */}
          <div className="bg-slate-50 dark:bg-slate-900 space-y-1.5 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800">
            <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Zap size={15} className="text-emerald-600 fill-emerald-600 dark:text-emerald-400 dark:fill-emerald-400" />
                Tiến độ năng lượng ngày:
              </span>
              <strong className="text-emerald-700 dark:text-emerald-400 font-black">
                {isTodayLoading ? "-" : `${derivedDailyPercent}%`}
              </strong>
            </div>
            <div
              className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700"
              role="progressbar"
              aria-valuenow={derivedDailyPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Tiến độ năng lượng nhiệm vụ ngày"
            >
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${derivedDailyPercent}%` }}
              />
            </div>
          </div>

          {/* Quests Item List */}
          <div className="space-y-3">
            {isTodayLoading ? (
              <div className="space-y-3" role="status" aria-label="Đang tải nhiệm vụ hôm nay">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-7 shrink-0 rounded-xl bg-slate-200 dark:bg-slate-700" />
                        <div className="space-y-1.5">
                          <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-700" />
                          <div className="h-3 w-56 rounded bg-slate-100 dark:bg-slate-800" />
                        </div>
                      </div>
                      <div className="h-10 w-28 rounded-xl bg-slate-200 dark:bg-slate-700" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isTodayError ? (
              <div className="rounded-2xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/70 dark:bg-rose-950/30 p-5 text-center space-y-3">
                <AlertCircle size={24} className="mx-auto text-rose-500" aria-hidden="true" />
                <div>
                  <p className="text-sm font-bold text-rose-900 dark:text-rose-300">Không thể tải hoạt động hôm nay</p>
                  <p className="mt-0.5 text-sm text-rose-700 dark:text-rose-400">Đã xảy ra lỗi khi đồng bộ dữ liệu từ máy chủ.</p>
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
                const { actionLabel, actionUrl } = resolveQuestAction(item, dailyPractice?.items);
                const categoryMeta = getQuestCategoryMeta(item.type ?? questObj?.type);
                const CategoryIcon = categoryMeta.icon;

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border-2 p-4 transition-all ${
                      item.isCompleted
                        ? "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-2xs"
                        : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs"
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
                              className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${categoryMeta.badgeClass}`}
                            >
                              {categoryMeta.label}
                            </span>
                          </div>
                          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">{title}</h3>
                          {description && (
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 line-clamp-2">
                              {description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-xs font-black text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200/90 dark:border-amber-800/60 shadow-2xs">
                          +{rewardBanh} Bánh Mì
                        </span>

                        {item.isCompleted ? (
                          <span className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-100/80 dark:bg-emerald-950/60 px-3.5 text-xs font-black text-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 size={15} aria-hidden="true" className="text-emerald-600 dark:text-emerald-400" />
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
                      <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                        <span>
                          Tiến độ: <strong className="text-slate-800 dark:text-slate-200">{progressText}</strong>
                        </span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div
                        className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
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
              <p className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5 text-center text-sm font-semibold text-slate-600 dark:text-slate-400">
                Chưa có nhiệm vụ nào được thiết lập cho hôm nay.
              </p>
            )}

            {/* 100% Completed Celebration State */}
            {allQuestsCompleted && (
              <div className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-emerald-100/90 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-center text-sm font-black text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Xuất sắc! Bạn đã hoàn thành toàn bộ mục tiêu học tập hôm nay!</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 2D Companion Pet Card */}
        <DashboardCompanionCard className="lg:self-start" />
      </section>
    </div>
  );
}
