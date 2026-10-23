"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  FilePlus2,
  Flag,
  Inbox,
  MessageSquare,
  RefreshCw,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import AdminAnalyticsChart from "@/components/admin/AdminAnalyticsChart";
import AdminContentBreakdown from "@/components/admin/AdminContentBreakdown";
import { getRangeLabel } from "@/components/admin/adminDashboardChartUtils";
import { UserAvatarWithFrame } from "@/components/ui";
import { formatVnd } from "@/modules/subscription/planLogic";

type DashboardRange = "30d" | "6m" | "12m";

type DashboardStats = {
  range: DashboardRange;
  stats: {
    totalStudents: number;
    activeStudents: number;
    totalCourses: number;
    pendingCourses: number;
    totalEnrollments?: number;
    activeEnrollments?: number;
    pendingPayments: number;
    unreadSupportMessages: number;
    pendingSuggestions: number;
    openIssueReports: number;
  };
  finance?: {
    totalRevenueVnd: number;
    completedPurchasesCount: number;
    activeSubscriptionsCount: number;
  };
  monthlyTrends?: {
    month: string;
    enrollments: number;
    activityCount: number;
    revenueVnd?: number;
  }[];
  contentBreakdown?: {
    vocab: number;
    grammar: number;
    quizzes: number;
    speaking: number;
    media: number;
  };
  gamification?: {
    totalBreads: number;
    totalOrders: number;
    approvedOrders: number;
    pendingOrders: number;
  };
  recentActivity: {
    id: number;
    type: string;
    message: string;
    avatar: string | null;
    createdAt: string;
  }[];
};

interface AttentionItem {
  count: number;
  label: string;
  href: string;
  icon: LucideIcon;
  badgeColor: string;
  actionLabel: string;
}

interface QuickActionItem {
  label: string;
  detail: string;
  href: string;
  icon: LucideIcon;
}

const RANGE_OPTIONS: { value: DashboardRange; label: string }[] = [
  { value: "30d", label: "30 ngày" },
  { value: "6m", label: "6 tháng" },
  { value: "12m", label: "12 tháng" },
];

const QUICK_ACTIONS: QuickActionItem[] = [
  {
    label: "Course Studio",
    detail: "Biên soạn khóa học & bài học",
    href: "/admin/courses",
    icon: BookOpen,
  },
  {
    label: "Exam CMS",
    detail: "Quản lý đề luyện thi TOEIC",
    href: "/admin/exams",
    icon: FilePlus2,
  },
  {
    label: "Quản lý học viên",
    detail: "Tra cứu hồ sơ & tiến độ học",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "Hộp thư hỗ trợ",
    detail: "Giải đáp thắc mắc người học",
    href: "/admin/messages",
    icon: Inbox,
  },
  {
    label: "Chi phí & Hiệu ứng",
    detail: "Giám sát AI tokens & TTS",
    href: "/admin/costs",
    icon: Coins,
  },
  {
    label: "Cửa hàng & Quà tặng",
    detail: "Duyệt đổi quà & quản lý vật phẩm",
    href: "/admin/market",
    icon: ShoppingBag,
  },
];

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diffMs) || diffMs < 0) return "vừa xong";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export default function AdminDashboardPage() {
  const [range, setRange] = useState<DashboardRange>("6m");
  const { data, isLoading, isFetching, isError, refetch } = useQuery<DashboardStats>({
    queryKey: ["admin-dashboard", range],
    queryFn: async () => {
      const response: unknown = await axiosClient.get("/admin/dashboard-stats", {
        params: { range },
      });
      return (response as { data?: DashboardStats }).data ?? (response as DashboardStats);
    },
  });

  const totalContentItems = data?.contentBreakdown
    ? data.contentBreakdown.vocab +
      data.contentBreakdown.grammar +
      data.contentBreakdown.quizzes +
      data.contentBreakdown.speaking +
      data.contentBreakdown.media
    : 0;

  const rawAttentionItems: AttentionItem[] = [
    {
      count: data?.stats.pendingPayments ?? 0,
      label: "giao dịch nâng cấp gói cần đối soát",
      href: "/admin/plan-purchases",
      icon: CreditCard,
      badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      actionLabel: "Duyệt đơn",
    },
    {
      count: data?.gamification?.pendingOrders ?? 0,
      label: "yêu cầu đổi quà bưu điện/voucher chờ duyệt",
      href: "/admin/market",
      icon: ShoppingBag,
      badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      actionLabel: "Xử lý kho",
    },
    {
      count: data?.stats.openIssueReports ?? 0,
      label: "báo cáo sự cố từ người học cần xử lý",
      href: "/admin/issue-reports",
      icon: Flag,
      badgeColor: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      actionLabel: "Kiểm tra",
    },
    {
      count: data?.stats.unreadSupportMessages ?? 0,
      label: "tin nhắn hỗ trợ học viên chưa đọc",
      href: "/admin/messages",
      icon: Inbox,
      badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      actionLabel: "Phản hồi",
    },
    {
      count: data?.stats.pendingSuggestions ?? 0,
      label: "đề xuất & góp ý từ học viên đang chờ",
      href: "/admin/suggestions",
      icon: MessageSquare,
      badgeColor: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
      actionLabel: "Đọc góp ý",
    },
    {
      count: data?.stats.pendingCourses ?? 0,
      label: "khóa học đang ở trạng thái bản nháp",
      href: "/admin/courses",
      icon: BookOpen,
      badgeColor: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
      actionLabel: "Biên tập",
    },
  ];

  const attentionItems = rawAttentionItems.filter((item) => item.count > 0);


  const attentionTotal = attentionItems.reduce((sum, item) => sum + item.count, 0);

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-6 pb-12">
      {/* 1. HEADER & CONTROLS */}
      <header className="flex flex-col gap-4 border-b border-slate-200 dark:border-slate-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-100">
            Tổng quan vận hành
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Theo dõi dữ liệu thực tế hệ thống, tình hình tài chính và xử lý các tác vụ tồn đọng.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Segmented Control Range */}
          <div
            role="group"
            aria-label="Khoảng thời gian dữ liệu"
            className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-800/80 p-0.5"
          >
            {RANGE_OPTIONS.map((opt) => {
              const active = range === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRange(opt.value)}
                  aria-pressed={active}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    active
                      ? "bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-100 font-semibold shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Làm mới dữ liệu tổng quan"
            title="Làm mới dữ liệu"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 shadow-xs transition hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={isFetching ? "animate-spin text-blue-600" : ""}
              aria-hidden="true"
            />
          </button>
        </div>
      </header>

      {/* 2. LOADING STATE */}
      {isLoading ? (
        <div className="space-y-6" aria-label="Đang tải dữ liệu tổng quan">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, idx) => (
              <div
                key={idx}
                className="h-36 animate-pulse rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"
              />
            ))}
          </div>
          <div className="h-28 animate-pulse rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50" />
          <div className="grid gap-6 xl:grid-cols-12">
            <div className="h-96 animate-pulse rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 xl:col-span-8" />
            <div className="h-96 animate-pulse rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 xl:col-span-4" />
          </div>
        </div>
      ) : isError || !data ? (
        /* ERROR STATE */
        <section
          className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-6"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div>
              <h2 className="font-semibold text-rose-950 dark:text-rose-200">
                Không thể tải dữ liệu tổng quan vận hành
              </h2>
              <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">
                Không thể lấy dữ liệu thống kê từ máy chủ lúc này. Vui lòng kiểm tra kết nối mạng hoặc thử lại.
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 dark:bg-slate-100 px-4 py-2 text-sm font-semibold text-white dark:text-slate-900 transition hover:bg-slate-800 dark:hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <RefreshCw size={14} /> Thử tải lại
              </button>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* 3. FOUR CORE OPERATIONAL PILLARS */}
          <section
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            aria-label="Chỉ số vận hành trọng yếu"
          >
            {/* PILLAR 1: HỌC VIÊN */}
            <Link
              href="/admin/users"
              className="group flex flex-col justify-between rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Học viên hệ thống
                  </span>
                  <div className="flex size-8 items-center justify-center rounded-lg border border-blue-100 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                    <Users size={16} />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-bold tracking-tight tabular-nums text-slate-950 dark:text-slate-100">
                    {data.stats.totalStudents.toLocaleString("vi-VN")}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">tài khoản</span>
                </div>
              </div>
              <div className="mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {data.stats.activeStudents.toLocaleString("vi-VN")}
                </span>{" "}
                hoạt động trong {getRangeLabel(range).toLowerCase()} ·{" "}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {(data.stats.activeEnrollments ?? data.stats.totalEnrollments ?? 0).toLocaleString("vi-VN")}
                </span>{" "}
                đang học lớp
              </div>
            </Link>

            {/* PILLAR 2: DOANH THU & GÓI HỌC */}
            <Link
              href="/admin/plan-purchases"
              className="group flex flex-col justify-between rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Doanh thu gói học
                  </span>
                  <div className="flex size-8 items-center justify-center rounded-lg border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                    <CreditCard size={16} />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-bold tracking-tight tabular-nums text-slate-950 dark:text-slate-100">
                    {formatVnd(data.finance?.totalRevenueVnd ?? 0)}
                  </span>
                </div>
              </div>
              <div className="mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {(data.finance?.activeSubscriptionsCount ?? 0).toLocaleString("vi-VN")}
                </span>{" "}
                gói Plus/Pro kích hoạt ·{" "}
                <span
                  className={
                    data.stats.pendingPayments > 0
                      ? "font-semibold text-amber-600 dark:text-amber-400"
                      : "text-slate-600 dark:text-slate-400"
                  }
                >
                  {data.stats.pendingPayments > 0
                    ? `${data.stats.pendingPayments} đơn chờ duyệt`
                    : "0 đơn chờ duyệt"}
                </span>
              </div>
            </Link>

            {/* PILLAR 3: KHO NỘI DUNG */}
            <Link
              href="/admin/courses"
              className="group flex flex-col justify-between rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Khóa học xuất bản
                  </span>
                  <div className="flex size-8 items-center justify-center rounded-lg border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                    <BookOpen size={16} />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-bold tracking-tight tabular-nums text-slate-950 dark:text-slate-100">
                    {data.stats.totalCourses.toLocaleString("vi-VN")}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">khóa học</span>
                </div>
              </div>
              <div className="mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {totalContentItems.toLocaleString("vi-VN")}
                </span>{" "}
                bài học & câu hỏi ·{" "}
                <span className="text-slate-600 dark:text-slate-400">
                  {data.stats.pendingCourses > 0
                    ? `${data.stats.pendingCourses} bản nháp`
                    : "Đã xuất bản toàn bộ"}
                </span>
              </div>
            </Link>

            {/* PILLAR 4: KINH TẾ BÁNH MÌ & CỬA HÀNG */}
            <Link
              href="/admin/market"
              className="group flex flex-col justify-between rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Bánh Mì lưu hành
                  </span>
                  <div className="flex size-8 items-center justify-center rounded-lg border border-amber-100 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                    <ShoppingBag size={16} />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-bold tracking-tight tabular-nums text-slate-950 dark:text-slate-100">
                    {(data.gamification?.totalBreads ?? 0).toLocaleString("vi-VN")}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">bánh</span>
                </div>
              </div>
              <div className="mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {(data.gamification?.totalOrders ?? 0).toLocaleString("vi-VN")}
                </span>{" "}
                lượt đổi quà ·{" "}
                <span
                  className={
                    (data.gamification?.pendingOrders ?? 0) > 0
                      ? "font-semibold text-amber-600 dark:text-amber-400"
                      : "text-slate-600 dark:text-slate-400"
                  }
                >
                  {(data.gamification?.pendingOrders ?? 0) > 0
                    ? `${data.gamification?.pendingOrders} đơn chờ duyệt`
                    : "0 đơn tồn đọng"}
                </span>
              </div>
            </Link>
          </section>

          {/* 4. TRIAGE: ACTIONABLE QUEUE ("CẦN XỬ LÝ") */}
          <section
            id="needs-attention"
            aria-labelledby="needs-attention-heading"
            className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden"
          >
            <header className="flex items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                <h2
                  id="needs-attention-heading"
                  className="text-sm font-bold tracking-tight text-slate-950 dark:text-slate-100"
                >
                  Cần xử lý
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                  — Danh sách tác vụ ưu tiên theo nghiệp vụ
                </span>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  attentionTotal > 0
                    ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
                    : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
                }`}
              >
                {attentionTotal} việc tồn đọng
              </span>
            </header>

            {attentionItems.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {attentionItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex min-h-14 items-center justify-between gap-4 px-5 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="flex size-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:text-slate-950 dark:group-hover:text-slate-100">
                          <Icon size={16} aria-hidden="true" />
                        </div>
                        <div className="text-sm text-slate-700 dark:text-slate-300">
                          <span
                            className={`inline-block mr-2 rounded-md px-2 py-0.5 text-xs font-mono font-bold border tabular-nums ${item.badgeColor}`}
                          >
                            {item.count}
                          </span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {item.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
                        <span>{item.actionLabel}</span>
                        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-3 px-5 py-5 text-sm text-slate-600 dark:text-slate-300">
                <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Hệ thống vận hành ổn định — không có tác vụ tồn đọng cần xử lý lúc này.</span>
              </div>
            )}
          </section>

          {/* 5. MAIN DATA SECTION: CHART & BREAKDOWN (8 cols) + ACTIVITY & SHORTCUTS (4 cols) */}
          <div className="grid items-start gap-6 xl:grid-cols-12">
            {/* LEFT COLUMN: TRENDS & CURRICULUM */}
            <div className="space-y-6 xl:col-span-8">
              {/* INTERACTIVE METRIC CHART */}
              <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs">
                <AdminAnalyticsChart
                  data={data.monthlyTrends}
                  range={data.range ?? range}
                />
              </div>

              {/* CURRICULUM CONTENT BREAKDOWN */}
              <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs">
                <AdminContentBreakdown data={data.contentBreakdown} />
              </div>
            </div>

            {/* RIGHT COLUMN: RECENT ACTIVITY & QUICK ACTIONS */}
            <aside className="space-y-6 xl:col-span-4 xl:sticky xl:top-6">
              {/* RECENT ACTIVITY CARD */}
              <section
                aria-labelledby="recent-activity-heading"
                className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs"
              >
                <header className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <h2
                      id="recent-activity-heading"
                      className="text-base font-bold text-slate-950 dark:text-slate-100"
                    >
                      Hoạt động gần đây
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Lượt cấp quyền và ghi danh khóa học mới
                    </p>
                  </div>
                  <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                    {data.recentActivity.length} sự kiện
                  </span>
                </header>

                {data.recentActivity.length > 0 ? (
                  <ol className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {data.recentActivity.map((activity) => (
                      <li key={activity.id} className="flex items-start gap-3 py-3.5 first:pt-4">
                        <UserAvatarWithFrame
                          size="sm"
                          avatarUrl={activity.avatar}
                          overrideFrame={null}
                          overrideBadge={null}
                          className="shrink-0 mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs leading-5 text-slate-800 dark:text-slate-200 line-clamp-2">
                            {activity.message}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                            <Clock size={12} />
                            <time dateTime={activity.createdAt}>{timeAgo(activity.createdAt)}</time>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                    Chưa có lượt cấp quyền truy cập trong kỳ này.
                  </div>
                )}
              </section>

              {/* QUICK LAUNCHPAD SHORTCUTS */}
              <section
                aria-labelledby="quick-actions-heading"
                className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs"
              >
                <div className="mb-3.5">
                  <h2
                    id="quick-actions-heading"
                    className="text-base font-bold text-slate-950 dark:text-slate-100"
                  >
                    Lối tắt tác vụ
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Các phân hệ quản trị vận hành thường dùng
                  </p>
                </div>

                <div className="grid gap-2">
                  {QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link
                        key={action.href}
                        href={action.href}
                        className="group flex items-center justify-between gap-3 rounded-lg border border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3 transition hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex size-7 items-center justify-center rounded-md bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-2xs group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            <Icon size={15} aria-hidden="true" />
                          </div>
                          <div>
                            <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {action.label}
                            </span>
                            <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                              {action.detail}
                            </span>
                          </div>
                        </div>
                        <ArrowUpRight
                          size={14}
                          className="shrink-0 text-slate-400 transition group-hover:text-slate-700 dark:group-hover:text-slate-200"
                          aria-hidden="true"
                        />
                      </Link>
                    );
                  })}
                </div>
              </section>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
