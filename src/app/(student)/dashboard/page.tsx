"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Flame,
  Headphones,
  Layers,
  Loader2,
  Mic,
  PenTool,
  RefreshCw,
  Target,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { courseService, StudentLearningClass } from "@/lib/api/services/course.service";
import {
  gamificationService,
  TodayQuestItem,
} from "@/lib/api/services/gamification.service";
import { userService } from "@/lib/api/services/user.service";
import { PlacementTestBanner } from "@/components/dashboard/PlacementTestBanner";

const SKILLS = [
  { title: "Luyện nghe", description: "Rèn nghe hiểu qua hội thoại và tình huống thực tế.", href: "/practice/listening", icon: Headphones, tone: "blue" },
  { title: "Luyện nói", description: "Ghi âm, luyện phản xạ và nhận góp ý phát âm chi tiết.", href: "/practice/speaking", icon: Mic, tone: "violet" },
  { title: "Luyện đọc", description: "Tìm ý chính và xử lý thông tin theo ngữ cảnh.", href: "/practice/reading", icon: BookOpen, tone: "emerald" },
  { title: "Luyện viết", description: "Viết câu, email và đoạn văn với gợi ý sửa lỗi tự động.", href: "/practice/writing", icon: PenTool, tone: "rose" },
] as const;

const TONE_STYLES = {
  blue: "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300",
  violet: "border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-300",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300",
  rose: "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300",
} as const;

function getQuestHref(questOrItem?: { type?: string }) {
  const type = questOrItem?.type;
  if (type === "LEARN_VOCAB" || type === "DO_VOCAB") return "/flashcard";
  if (type === "COMPLETE_QUIZ" || type === "DO_LISTENING") return "/practice/listening";
  if (type === "DO_SPEAKING") return "/practice/speaking";
  return "/practice";
}

function clampPercentage(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.min(100, Math.round((value / max) * 100));
}

function getQuestProgressText(item: TodayQuestItem): string {
  const target = item.targetValue ?? item.quest?.targetValue ?? 1;
  const current = Math.min(item.currentValue ?? 0, target);
  const type = (item.type ?? item.quest?.type ?? "").toUpperCase();

  if (type === "LEARN_VOCAB" || type === "DO_VOCAB") {
    return `${current}/${target} từ`;
  }
  if (
    type === "COMPLETE_QUIZ" ||
    type === "DO_LISTENING" ||
    type === "DO_SPEAKING" ||
    type === "COMPLETE_LESSON"
  ) {
    return `${current}/${target} bài`;
  }
  return `${current}/${target}`;
}

function resolveQuestAction(item: TodayQuestItem) {
  const fallbackHref = getQuestHref(item.quest || item);
  const actionLabel = item.actionLabel?.trim() || "Tiếp tục học";
  const actionUrl = item.actionUrl?.trim() || fallbackHref;
  return { actionLabel, actionUrl };
}

function LearningCourseCard({ learningClass }: { learningClass?: StudentLearningClass }) {
  if (!learningClass) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-2xs sm:p-8">
        <BookOpen className="mx-auto text-slate-400" size={28} aria-hidden="true" />
        <h3 className="mt-3 text-lg font-black text-slate-900">Bạn chưa có khóa học đang học</h3>
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-600">Khám phá lộ trình tự học phù hợp, hoặc bắt đầu bằng một bài luyện ngắn.</p>
        <Link href="/courses" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 text-sm font-extrabold text-white transition-colors hover:bg-amber-700">
          Khám phá khóa học <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    );
  }

  const progress = clampPercentage(learningClass.enrollmentProgress, 100);
  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-amber-200 bg-white p-6 shadow-2xs sm:flex-row sm:items-center sm:justify-between sm:p-7">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><BookOpen size={22} aria-hidden="true" /></span>
        <div>
          <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-amber-700">Lộ trình đang học</span>
          <h3 className="mt-1 text-lg font-black text-slate-900">{learningClass.course.title}</h3>
          <p className="mt-1 text-sm text-slate-600">{learningClass.name}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:min-w-56 sm:items-end">
        <div className="w-full sm:w-48">
          <div className="mb-1.5 flex justify-between text-xs font-bold text-slate-600"><span>Tiến độ nội dung</span><span>{progress}%</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${progress}%` }} /></div>
        </div>
        <Link href={`/classes/${learningClass.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-extrabold text-white transition-colors hover:bg-amber-700">
          Tiếp tục học <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const studentName = user?.profile?.fullName || user?.email?.split("@")[0] || "Học viên";
  const studentAvatar = user?.profile?.avatar;
  const enabled = user?.role === "STUDENT";

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: userService.getStats,
    enabled,
    staleTime: 60_000,
  });

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

  const { data: learningClasses, isLoading: areClassesLoading } = useQuery({
    queryKey: ["my-learning-classes", user?.id],
    queryFn: courseService.getMyLearningClasses,
    enabled,
    staleTime: 60_000,
  });

  // Query invalidation on learning events
  useEffect(() => {
    const handleLearningEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-today"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
    };
    window.addEventListener("breadtrans:learning-event", handleLearningEvent);
    return () => window.removeEventListener("breadtrans:learning-event", handleLearningEvent);
  }, [queryClient]);

  const quests = todayData?.quests ?? [];
  const activities = todayData?.activities ?? [];
  const summary = todayData?.summary ?? {
    completedCount: 0,
    totalCount: 0,
    progressPercent: 0,
    earnedXp: 0,
    earnedBanh: 0,
  };

  const completedQuestCount = summary.completedCount;
  const totalQuestCount = summary.totalCount;
  const dailyProgress = Math.min(100, Math.max(0, summary.progressPercent));
  const activeClass = learningClasses?.find((item) => item.enrollmentStatus === "ACTIVE");

  const firstIncompleteQuest = quests.find((q) => !q.isCompleted);
  const allQuestsCompleted = quests.length > 0 && completedQuestCount === totalQuestCount;

  return (
    <div className="space-y-8 pb-16 font-['Quicksand',sans-serif]" id="dashboard">
      <section className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-orange-50 p-6 shadow-2xs sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-amber-200/50 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/student/profile" aria-label="Mở hồ sơ cá nhân" className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-amber-200 bg-amber-600 text-2xl font-black text-white shadow-sm transition-transform hover:scale-105">
              {studentAvatar ? <img src={studentAvatar} alt="" className="size-full object-cover" /> : studentName.charAt(0).toUpperCase()}
            </Link>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-amber-800">Không gian học của bạn</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Chào {studentName}, cùng học tiếp nhé!</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">Theo dõi tiến độ thật từ hoạt động học tập của bạn.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-amber-100 rounded-2xl border border-amber-200 bg-white p-2 sm:p-3 shadow-2xs w-full sm:w-auto sm:min-w-80">
            <div className="px-1.5 sm:px-3 text-center"><span className="block text-xs font-bold text-slate-500">Chuỗi học</span><strong className="mt-1 block text-lg sm:text-xl font-black text-slate-900">{isStatsLoading ? "—" : `${stats?.streakCount ?? 0} ngày`}</strong></div>
            <div className="px-1.5 sm:px-3 text-center"><span className="block text-xs font-bold text-slate-500">Điểm tuần</span><strong className="mt-1 block text-lg sm:text-xl font-black text-slate-900">{isStatsLoading ? "—" : stats?.weeklyExp ?? 0}</strong></div>
            <Link href="/student/profile?tab=quotas" className="rounded-xl px-1.5 sm:px-3 text-center transition-colors hover:bg-amber-50"><span className="block text-xs font-bold text-slate-500">Bánh mì</span><strong className="mt-1 block text-lg sm:text-xl font-black text-amber-700">{isStatsLoading ? "—" : stats?.totalBanhRan ?? 0}</strong></Link>
          </div>
        </div>
      </section>

      {/* Placement Test Recommendation Banner */}
      <PlacementTestBanner hasCompleted={stats?.hasCompletedPlacementTest} />

      <section className="grid gap-6 lg:grid-cols-3" aria-labelledby="today-quests-heading">
        {/* Hoạt động hôm nay */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs lg:col-span-2 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-amber-700">HOẠT ĐỘNG HÔM NAY</p>
              <h2 id="today-quests-heading" className="mt-1 text-xl font-black text-slate-900">Nhiệm vụ hôm nay</h2>
            </div>
            {!isTodayLoading && !isTodayError && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-800">
                {completedQuestCount}/{totalQuestCount} hoàn thành
              </span>
            )}
          </div>

          <div className="mt-5 space-y-3">
            {isTodayLoading ? (
              <div className="space-y-3" role="status" aria-label="Đang tải nhiệm vụ hôm nay">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-6 shrink-0 rounded-full bg-slate-200" />
                        <div className="space-y-1.5">
                          <div className="h-4 w-40 rounded bg-slate-200" />
                          <div className="h-3 w-56 rounded bg-slate-100" />
                        </div>
                      </div>
                      <div className="h-10 w-24 rounded-xl bg-slate-200" />
                    </div>
                    <div className="mt-3.5 h-2 rounded-full bg-slate-100" />
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
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
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
                const progressPercent = typeof item.progressPercent === "number"
                  ? Math.min(100, Math.max(0, item.progressPercent))
                  : clampPercentage(item.currentValue, targetValue);
                const { actionLabel, actionUrl } = resolveQuestAction(item);

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 transition-colors ${
                      item.isCompleted ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-white hover:border-amber-200"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${
                            item.isCompleted
                              ? "bg-emerald-500 text-white"
                              : "border-2 border-amber-500 text-amber-700"
                          }`}
                          aria-hidden="true"
                        >
                          {item.isCompleted ? <CheckCircle2 size={16} /> : null}
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900">{title}</h3>
                          {description && <p className="mt-0.5 text-xs text-slate-600 line-clamp-1">{description}</p>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-xs font-extrabold text-amber-800">+{rewardBanh} Bánh Mì</span>
                        {item.isCompleted ? (
                          <span className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-100/80 px-3.5 py-1.5 text-xs font-black text-emerald-800">
                            <CheckCircle2 size={16} aria-hidden="true" className="text-emerald-600" />
                            Đã hoàn thành
                          </span>
                        ) : (
                          <Link
                            href={actionUrl}
                            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white transition hover:bg-amber-700 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:outline-none"
                          >
                            {actionLabel}
                            <ArrowRight size={14} aria-hidden="true" />
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="mt-3.5 space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span>Tiến độ: <strong className="text-slate-800">{progressText}</strong></span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div
                        className="h-2.5 overflow-hidden rounded-full bg-slate-100"
                        role="progressbar"
                        aria-valuenow={progressPercent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Tiến độ nhiệm vụ: ${title}`}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            item.isCompleted ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-600">
                Chưa có nhiệm vụ nào được thiết lập cho hôm nay.
              </p>
            )}

            {/* Factual Today Activities Log */}
            {!isTodayLoading && !isTodayError && (
              <div className="pt-2">
                {activities.length > 0 ? (
                  <p className="text-xs font-bold text-slate-500">
                    Đã ghi nhận {activities.length} hoạt động học tập trong ngày hôm nay.
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">
                    Bắt đầu một nhiệm vụ để ghi nhận hoạt động hôm nay.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mục tiêu hôm nay */}
        <aside className="flex flex-col justify-between rounded-3xl border border-amber-200 bg-amber-50/60 p-6 shadow-2xs sm:p-7">
          <div>
            <div className="flex items-center gap-2 text-amber-800">
              <Flame size={18} aria-hidden="true" />
              <h2 className="text-xs font-extrabold uppercase tracking-[0.14em]">Mục tiêu hôm nay</h2>
            </div>
            <h3 className="mt-3 text-xl font-black text-slate-900">Giữ nhịp học của bạn</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Hoàn thành các nhiệm vụ bên trái để duy trì nhịp học.
            </p>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-white p-4">
              <div className="flex justify-between text-sm font-bold text-slate-700">
                <span>{completedQuestCount}/{totalQuestCount} nhiệm vụ</span>
                <span>{isTodayLoading ? "—" : `${dailyProgress}%`}</span>
              </div>
              <div
                className="mt-2 h-3 overflow-hidden rounded-full bg-amber-100"
                role="progressbar"
                aria-valuenow={dailyProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Tiến độ mục tiêu hôm nay"
              >
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${dailyProgress}%` }}
                />
              </div>
              {summary.earnedBanh > 0 && (
                <p className="mt-2.5 text-xs font-bold text-amber-800">
                  Đã nhận +{summary.earnedBanh} Bánh Mì hôm nay
                </p>
              )}
            </div>
          </div>

          {allQuestsCompleted ? (
            <div className="mt-6 flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-100/90 px-4 py-2.5 text-center text-sm font-extrabold text-emerald-800">
              <CheckCircle2 size={18} aria-hidden="true" className="text-emerald-600" />
              Bạn đã hoàn thành toàn bộ nhiệm vụ hôm nay
            </div>
          ) : firstIncompleteQuest ? (
            <Link
              href={resolveQuestAction(firstIncompleteQuest).actionUrl}
              className="mt-6 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-amber-700 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {resolveQuestAction(firstIncompleteQuest).actionLabel} <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ) : (
            <div className="mt-6 flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-center text-sm font-bold text-slate-500">
              Chưa có nhiệm vụ nào hôm nay
            </div>
          )}
        </aside>
      </section>

      <section aria-labelledby="course-heading"><div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-amber-700">Lộ trình tự học</p><h2 id="course-heading" className="mt-1 text-2xl font-black text-slate-900">Khóa học đang học</h2></div><Link href="/my-courses" className="inline-flex min-h-11 items-center gap-1 text-sm font-extrabold text-slate-700 transition-colors hover:text-amber-800">Tất cả khóa học <ChevronRight size={16} aria-hidden="true" /></Link></div>{areClassesLoading ? <div className="flex min-h-36 items-center justify-center rounded-3xl border border-slate-200 bg-white text-sm font-semibold text-slate-500"><Loader2 className="mr-2 animate-spin" size={18} /> Đang tải khóa học…</div> : <LearningCourseCard learningClass={activeClass} />}</section>

      <section aria-labelledby="skills-heading"><div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-700">Bốn kỹ năng</p><h2 id="skills-heading" className="mt-1 text-2xl font-black text-slate-900">Hôm nay bạn muốn luyện gì?</h2></div><Link href="/practice" className="inline-flex min-h-11 items-center gap-1 text-sm font-extrabold text-slate-700 transition-colors hover:text-blue-700">Trung tâm kỹ năng <ChevronRight size={16} aria-hidden="true" /></Link></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{SKILLS.map((skill) => { const Icon = skill.icon; return <Link key={skill.href} href={skill.href} className={`group rounded-3xl border bg-white p-5 shadow-2xs transition hover:-translate-y-0.5 hover:shadow-md ${TONE_STYLES[skill.tone]}`}><span className={`flex size-11 items-center justify-center rounded-2xl border ${TONE_STYLES[skill.tone]}`}><Icon size={20} aria-hidden="true" /></span><h3 className="mt-4 font-black text-slate-900">{skill.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{skill.description}</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold">Vào luyện <ArrowRight size={15} aria-hidden="true" /></span></Link>; })}</div></section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Công cụ học bổ trợ"><Link href="/flashcard" className="group rounded-3xl border border-amber-200 bg-white p-6 shadow-2xs transition hover:border-amber-300 hover:shadow-md"><span className="flex size-12 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700"><Layers size={22} aria-hidden="true" /></span><h2 className="mt-4 text-lg font-black text-slate-900">Flashcard từ vựng</h2><p className="mt-2 text-sm leading-6 text-slate-600">Học và ôn từ mới bằng thẻ học theo chủ đề.</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold text-amber-700">Mở Flashcard <ArrowRight size={15} aria-hidden="true" /></span></Link><Link href="/grammar" className="group rounded-3xl border border-emerald-200 bg-white p-6 shadow-2xs transition hover:border-emerald-300 hover:shadow-md"><span className="flex size-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700"><ClipboardCheck size={22} aria-hidden="true" /></span><h2 className="mt-4 text-lg font-black text-slate-900">Luyện ngữ pháp</h2><p className="mt-2 text-sm leading-6 text-slate-600">Củng cố cấu trúc câu qua bài học và câu hỏi có giải thích.</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold text-emerald-700">Học ngữ pháp <ArrowRight size={15} aria-hidden="true" /></span></Link></section>

      <section className="rounded-3xl border border-orange-200 bg-gradient-to-r from-orange-50 via-white to-amber-50 p-6 shadow-2xs sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-8"><div className="flex gap-4"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white"><Target size={22} aria-hidden="true" /></span><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-orange-700">Khu vực luyện đề</p><h2 className="mt-1 text-xl font-black text-slate-900">Luyện đề TOEIC</h2><p className="mt-1 text-sm leading-6 text-slate-600">Làm đề 2 kỹ năng hoặc 4 kỹ năng, bấm giờ và xem kết quả theo từng đề.</p>{!isStatsLoading && <p className="mt-2 text-xs font-bold text-orange-800">{stats?.totalQuizzesDone ?? 0} bài kiểm tra đã hoàn thành</p>}</div></div><Link href="/practice/quizzes" className="mt-5 inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 text-sm font-extrabold text-white transition-colors hover:bg-orange-700 sm:mt-0">Vào kho đề <ArrowRight size={16} aria-hidden="true" /></Link></section>
    </div>
  );
}
