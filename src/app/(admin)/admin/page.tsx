"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import AdminAnalyticsChart from "@/components/admin/AdminAnalyticsChart";
import AdminContentBreakdown from "@/components/admin/AdminContentBreakdown";
import { getRangeLabel, type ContentBreakdown } from "@/components/admin/adminDashboardChartUtils";
import { formatVnd } from "@/modules/subscription/planLogic";

type DashboardRange = "30d" | "6m" | "12m";

type DashboardStats = {
  range: DashboardRange;
  stats: {
    totalStudents: number;
    activeStudents: number;
    pendingPayments: number;
    unreadSupportMessages: number;
    pendingSuggestions: number;
    openIssueReports: number;
  };
  /** Revenue and purchases of the chosen range; subscriptions live now. */
  finance?: {
    totalRevenueVnd: number;
    completedPurchasesCount: number;
    activeSubscriptionsCount: number;
  };
  monthlyTrends?: {
    month: string;
    activityCount: number;
    revenueVnd?: number;
  }[];
  contentBreakdown?: Partial<ContentBreakdown>;
  /** Orders of the chosen range; pending orders and the Bánh Mì held are current. */
  gamification?: {
    totalBreads: number;
    totalOrders: number;
    approvedOrders: number;
    pendingOrders: number;
  };
};

interface AttentionItem {
  count: number;
  label: string;
  href: string;
  badgeColor: string;
  actionLabel: string;
}

const RANGE_OPTIONS: { value: DashboardRange; label: string }[] = [
  { value: "30d", label: "30 ngày" },
  { value: "6m", label: "6 tháng" },
  { value: "12m", label: "12 tháng" },
];

const CARD =
  "flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:border-slate-300 dark:hover:border-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600";

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
  const rangeText = getRangeLabel(data?.range ?? range).toLowerCase();

  const rawAttentionItems: AttentionItem[] = [
    {
      count: data?.stats.pendingPayments ?? 0,
      label: "giao dịch nâng cấp gói cần đối soát",
      href: "/admin/plan-purchases",
      badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      actionLabel: "Duyệt đơn",
    },
    {
      count: data?.gamification?.pendingOrders ?? 0,
      label: "yêu cầu đổi quà bưu điện/voucher chờ duyệt",
      href: "/admin/market",
      badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      actionLabel: "Xử lý kho",
    },
    {
      count: data?.stats.openIssueReports ?? 0,
      label: "báo cáo sự cố từ người học cần xử lý",
      href: "/admin/issue-reports",
      badgeColor: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      actionLabel: "Kiểm tra",
    },
    {
      count: data?.stats.unreadSupportMessages ?? 0,
      label: "tin nhắn hỗ trợ học viên chưa đọc",
      href: "/admin/messages",
      badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      actionLabel: "Phản hồi",
    },
    {
      count: data?.stats.pendingSuggestions ?? 0,
      label: "đề xuất & góp ý từ học viên đang chờ",
      href: "/admin/suggestions",
      badgeColor: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
      actionLabel: "Đọc góp ý",
    },
  ];

  const attentionItems = rawAttentionItems.filter((item) => item.count > 0);
  const attentionTotal = attentionItems.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 pb-12">
      {/* 1. HEADER & CONTROLS */}
      <header className="flex flex-col gap-4 border-b border-slate-200 dark:border-slate-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-100">
            Tổng quan vận hành
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Theo dõi dữ liệu thực tế hệ thống, tình hình tài chính và xử lý các tác vụ tồn đọng.
          </p>
        </div>

        <div className="flex items-center gap-3">
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

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Làm mới dữ liệu tổng quan"
            title="Làm mới dữ liệu"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 shadow-xs transition hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-wait"
          >
            <RefreshCw size={15} className={isFetching ? "animate-spin text-blue-600" : ""} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* 2. LOADING STATE */}
      {isLoading ? (
        <div className="space-y-6" aria-label="Đang tải dữ liệu tổng quan">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, idx) => (
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
          {/* 3. THREE KEY FIGURES: plain labels, no icon tiles (owner 2026-11-26). */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Chỉ số vận hành trọng yếu">
            <Link href="/admin/users" className={CARD}>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Học viên</p>
                <p className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tabular-nums text-slate-950 dark:text-slate-100">
                    {data.stats.totalStudents.toLocaleString("vi-VN")}
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">tài khoản</span>
                </p>
              </div>
              <p className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3 text-sm text-slate-600 dark:text-slate-400">
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {data.stats.activeStudents.toLocaleString("vi-VN")}
                </span>{" "}
                hoạt động trong {rangeText}
              </p>
            </Link>

            <Link href="/admin/plan-purchases" className={CARD}>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Doanh thu gói nâng cấp, {rangeText}
                </p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-950 dark:text-slate-100">
                  {formatVnd(data.finance?.totalRevenueVnd ?? 0)}
                </p>
              </div>
              <p className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3 text-sm text-slate-600 dark:text-slate-400">
                {(data.finance?.completedPurchasesCount ?? 0).toLocaleString("vi-VN")} lượt mua ·{" "}
                {(data.finance?.activeSubscriptionsCount ?? 0).toLocaleString("vi-VN")} gói đang hoạt động ·{" "}
                <span
                  className={
                    data.stats.pendingPayments > 0 ? "font-semibold text-amber-700 dark:text-amber-400" : undefined
                  }
                >
                  {data.stats.pendingPayments} đơn chờ duyệt
                </span>
              </p>
            </Link>

            <Link href="/admin/market" className={CARD}>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Bánh Mì học viên đang giữ</p>
                <p className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tabular-nums text-slate-950 dark:text-slate-100">
                    {(data.gamification?.totalBreads ?? 0).toLocaleString("vi-VN")}
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">Bánh Mì</span>
                </p>
              </div>
              <p className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3 text-sm text-slate-600 dark:text-slate-400">
                {(data.gamification?.totalOrders ?? 0).toLocaleString("vi-VN")} lượt đổi quà trong {rangeText} ·{" "}
                <span
                  className={
                    (data.gamification?.pendingOrders ?? 0) > 0
                      ? "font-semibold text-amber-700 dark:text-amber-400"
                      : undefined
                  }
                >
                  {data.gamification?.pendingOrders ?? 0} đơn chờ duyệt
                </span>
              </p>
            </Link>
          </section>

          {/* 4. TRIAGE: ACTIONABLE QUEUE ("CẦN XỬ LÝ") */}
          <section
            id="needs-attention"
            aria-labelledby="needs-attention-heading"
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
          >
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-5 py-3.5">
              <h2 id="needs-attention-heading" className="text-base font-semibold text-slate-950 dark:text-slate-100">
                Cần xử lý
              </h2>
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
                {attentionItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex min-h-14 items-center justify-between gap-4 px-5 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
                  >
                    <p className="text-sm text-slate-900 dark:text-slate-100">
                      <span
                        className={`mr-2 inline-block rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums ${item.badgeColor}`}
                      >
                        {item.count}
                      </span>
                      {item.label}
                    </p>
                    <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-blue-700 dark:text-blue-400 group-hover:underline">
                      {item.actionLabel}
                      <ArrowRight size={14} aria-hidden="true" />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="flex items-center gap-3 px-5 py-5 text-sm text-slate-600 dark:text-slate-300">
                <CheckCircle2 size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                Không có việc nào đang chờ xử lý.
              </p>
            )}
          </section>

          {/* 5. TRENDS (8 cols) + CONTENT ON THE SYSTEM (4 cols). The shortcut
              list went: the sidebar already has every page (owner 2026-11-26). */}
          <div className="grid items-start gap-6 xl:grid-cols-12">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm xl:col-span-8">
              <AdminAnalyticsChart data={data.monthlyTrends} range={data.range ?? range} />
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm xl:col-span-4">
              <AdminContentBreakdown data={data.contentBreakdown} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
