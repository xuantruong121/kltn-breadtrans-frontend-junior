"use client";

import React from "react";
import {
  Users,
  BookOpen,
  Clock,
  AlertTriangle,
  Loader2,
  ArrowRight,
  UserPlus,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  CreditCard,
  Headphones,
  PenTool,
  Layers,
  GraduationCap,
  Award,
  Mic,
  Inbox,
  Flag,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/lib/api/axiosClient";
import AdminAnalyticsChart from "@/components/admin/AdminAnalyticsChart";
import AdminContentBreakdown from "@/components/admin/AdminContentBreakdown";

type DashboardStats = {
  stats: {
    totalStudents: number;
    activeStudents: number;
    totalCourses: number;
    pendingCourses: number;
    totalEnrollments: number;
    activeEnrollments: number;
    pendingPayments: number;
    unreadSupportMessages: number;
    pendingSuggestions: number;
    openIssueReports: number;
  };
  monthlyTrends?: {
    month: string;
    enrollments: number;
    activityCount: number;
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

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

function getActivityIcon(type: string) {
  switch (type.toLowerCase()) {
    case "enrollment":
    case "enroll":
      return UserPlus;
    case "course":
    case "curriculum":
      return BookOpen;
    case "submission":
    case "exam":
      return FileText;
    case "approval":
    case "approve":
      return CheckCircle2;
    default:
      return Clock;
  }
}

export const AI_AUTHORING_DESTINATIONS = [
  {
    label: "Khóa học",
    description: "AI phân loại lộ trình và gợi ý các bài học phù hợp.",
    href: "/admin/courses",
    icon: BookOpen,
  },
  {
    label: "Bài nghe",
    description: "AI soạn nguồn nghe cùng câu hỏi nháp để Admin duyệt.",
    href: "/admin/listening",
    icon: Headphones,
  },
  {
    label: "Bài nói",
    description: "AI soạn bộ luyện và 1–10 câu nói nháp để Admin duyệt.",
    href: "/admin/speaking",
    icon: Mic,
  },
  {
    label: "Bài đọc",
    description: "AI soạn đoạn đọc cùng 1–10 câu hỏi nháp để Admin duyệt.",
    href: "/admin/reading",
    icon: FileText,
  },
  {
    label: "Bài viết",
    description: "AI gợi ý đề bài; ảnh Picture Task vẫn do Admin chọn.",
    href: "/admin/writing",
    icon: PenTool,
  },
  {
    label: "Từ vựng",
    description: "AI soạn chủ đề cùng 1–30 từ nháp để Admin duyệt.",
    href: "/admin/vocab",
    icon: Layers,
  },
  {
    label: "Ngữ pháp",
    description: "AI soạn chủ đề cùng 1–20 câu hỏi nháp để Admin duyệt.",
    href: "/admin/grammar",
    icon: GraduationCap,
  },
  {
    label: "Luyện đề",
    description: "Soạn và quản lý nội dung luyện đề.",
    href: "/admin/exams",
    icon: Award,
  },
] as const;

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const res: any = await axiosClient.get("/admin/dashboard-stats");
      return res?.data || res;
    },
  });

  const pendingTransactionsTotal =
    (data?.stats?.pendingPayments || 0) +
    (data?.gamification?.pendingOrders || 0);

  const visibleRecentActivity = data?.recentActivity || [];

  const STATS = data
    ? [
        {
          id: "students",
          name: "Học viên",
          value: data.stats.totalStudents.toLocaleString(),
          icon: Users,
          color: "text-blue-600",
          bg: "bg-blue-50",
          borderColor: "border-blue-100",
          sub: `${data.stats.activeStudents || 0} hoạt động trong 30 ngày`,
          href: "/admin/users",
        },
        {
          id: "courses",
          name: "Khóa học đã xuất bản",
          value: data.stats.totalCourses.toLocaleString(),
          icon: BookOpen,
          color: "text-indigo-600",
          bg: "bg-indigo-50",
          borderColor: "border-indigo-100",
          sub:
            data.stats.pendingCourses > 0
              ? `${data.stats.pendingCourses} khóa đang soạn thảo`
              : "100% đã công khai",
          alert: data.stats.pendingCourses > 0,
          href: "/admin/courses",
        },
        {
          id: "attention",
          name: "Nội dung cần xử lý",
          value: (data.stats.pendingCourses + data.stats.pendingSuggestions + data.stats.openIssueReports + pendingTransactionsTotal).toLocaleString(),
          icon: AlertTriangle,
          color: "text-amber-700",
          bg: "bg-amber-50",
          borderColor: "border-amber-100",
          sub: "Nội dung nháp, góp ý, lỗi và giao dịch",
          alert: true,
          href: "/admin/suggestions",
        },
        {
          id: "messages",
          name: "Tin nhắn chưa đọc",
          value: data.stats.unreadSupportMessages.toLocaleString(),
          icon: Inbox,
          color: "text-blue-700",
          bg: "bg-blue-50",
          borderColor: "border-blue-100",
          sub: data.stats.unreadSupportMessages ? "Cần phản hồi từ học viên" : "Không có tin nhắn mới",
          href: "/admin/messages",
        },
      ]
    : [];

  return (
    <div className="w-full max-w-[1720px] mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/70">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tổng quan</h1>
          <p className="text-slate-500 text-sm">
            Theo dõi hoạt động và các công việc cần xử lý.
          </p>
        </div>
      </div>

      <section
        aria-labelledby="ai-authoring-heading"
        className="border border-slate-200 bg-white p-5 shadow-xs"
      >
        <div className="border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2 text-slate-900">
              <FileText size={18} strokeWidth={2} aria-hidden="true" />
              <h2 id="ai-authoring-heading" className="text-base font-bold">
                Công cụ biên soạn
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Tạo hoặc chỉnh sửa nội dung học. Các bản nháp AI luôn cần được duyệt trước khi xuất bản.
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
          {AI_AUTHORING_DESTINATIONS.map((destination) => {
            const Icon = destination.icon;
            return (
              <Link
                key={destination.href}
                href={destination.href}
                className="group flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                <Icon size={16} strokeWidth={2} aria-hidden="true" className="shrink-0 text-slate-500 group-hover:text-blue-700" />
                <span className="min-w-0 truncate">{destination.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3 bg-white border border-slate-200/80 rounded-xl">
          <Loader2 className="animate-spin text-blue-600" size={36} />
          <p className="text-xs font-medium text-slate-500">
            Đang đồng bộ dữ liệu quản trị...
          </p>
        </div>
      ) : (
        <>
          {/* 2. TOP 4 METRIC STATS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <Link
                  key={stat.id}
                  href={stat.href}
                  className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {stat.name}
                    </span>
                    <div
                      className={`${stat.bg} ${stat.color} p-2 rounded-lg border ${stat.borderColor}`}
                    >
                      <Icon size={18} strokeWidth={2} />
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold tracking-tight text-slate-900">
                      {stat.value}
                    </span>
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span
                      className={`font-medium ${stat.alert ? "text-amber-700 font-semibold" : "text-slate-500"}`}
                    >
                      {stat.sub}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <section aria-labelledby="attention-heading" className="border border-slate-200 bg-white p-5 shadow-xs">
            <div className="border-b border-slate-100 pb-3">
              <h2 id="attention-heading" className="text-base font-bold text-slate-950">Cần xử lý</h2>
              <p className="mt-0.5 text-xs text-slate-500">Các việc được lấy từ dữ liệu vận hành hiện tại.</p>
            </div>
            <div className="mt-2 divide-y divide-slate-100">
              {[
                { count: data?.stats.unreadSupportMessages ?? 0, label: "tin nhắn chưa đọc", href: "/admin/messages", icon: Inbox },
                { count: data?.stats.pendingSuggestions ?? 0, label: "đề xuất đang chờ", href: "/admin/suggestions", icon: MessageSquare },
                { count: data?.stats.openIssueReports ?? 0, label: "báo cáo lỗi cần xem", href: "/admin/issue-reports", icon: Flag },
                { count: data?.stats.pendingCourses ?? 0, label: "khóa học ở trạng thái nháp", href: "/admin/courses", icon: BookOpen },
                { count: pendingTransactionsTotal, label: "giao dịch cần duyệt", href: "/admin/payments", icon: CreditCard },
              ].filter((item) => item.count > 0).map((item) => {
                const Icon = item.icon;
                return <Link key={item.href} href={item.href} className="flex min-h-12 items-center justify-between gap-4 py-2 text-sm hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><span className="flex items-center gap-3"><Icon size={16} className="text-slate-500" aria-hidden="true" /><span><strong className="text-slate-950">{item.count}</strong> <span className="text-slate-600">{item.label}</span></span></span><ArrowRight size={15} aria-hidden="true" /></Link>;
              })}
              {(data?.stats.unreadSupportMessages ?? 0) + (data?.stats.pendingSuggestions ?? 0) + (data?.stats.openIssueReports ?? 0) + (data?.stats.pendingCourses ?? 0) + pendingTransactionsTotal === 0 && <p className="py-4 text-sm text-slate-500">Không có công việc cần xử lý.</p>}
            </div>
          </section>

          {/* 4. MAIN WORKSPACE & STICKY ACTIVITY FEED */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: PRIMARY WORKSPACE (8 OF 12 COLS) */}
            <div className="xl:col-span-8 space-y-6">
              {/* INTERACTIVE ANALYTICS CHART & OPERATIONAL INSIGHTS */}
              <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
                <AdminAnalyticsChart data={data?.monthlyTrends} />
              </div>

              {/* CONTENT BREAKDOWN SECTION */}
              <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
                <AdminContentBreakdown data={data?.contentBreakdown} />
              </div>
            </div>

            {/* RIGHT COLUMN: STICKY AUDIT LOG & RECENT ACTIVITY (4 OF 12 COLS) */}
            <div className="xl:col-span-4 xl:sticky xl:top-6 space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/60">
                        <Clock size={16} strokeWidth={2} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Hoạt động gần đây
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Cập nhật nội dung và hoạt động hệ thống
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/70">
                      {visibleRecentActivity.length} bản ghi
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {visibleRecentActivity.length > 0 ? (
                      visibleRecentActivity.map((activity) => {
                        const Icon = getActivityIcon(activity.type);
                        return (
                          <div
                            key={activity.id}
                            className="flex gap-3 items-start pb-3 border-b border-slate-100 last:border-0 last:pb-0"
                          >
                            <div className="p-1.5 rounded-md bg-slate-100 text-slate-600 shrink-0 mt-0.5 border border-slate-200/60">
                              <Icon size={13} strokeWidth={2} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-800 leading-snug break-words">
                                {activity.message}
                              </p>
                              <span className="text-[11px] text-slate-400 mt-1 block">
                                {timeAgo(activity.createdAt)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12 text-slate-400">
                        <Clock size={24} className="mx-auto mb-2 opacity-40" />
                        <p className="text-xs">
                          Chưa có hoạt động nào được ghi nhận.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* QUICK NAV ACTIONS */}
                <div className="pt-3 border-t border-slate-100 flex gap-2">
                  <Link
                    href="/admin/users"
                    className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-1 shadow-2xs"
                  >
                    Quản lý học viên <ArrowUpRight size={13} strokeWidth={2} />
                  </Link>
                  <Link
                    href="/admin/issue-reports"
                    className="flex-1 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-xs rounded-lg border border-amber-200 transition-colors flex items-center justify-center gap-1 shadow-2xs"
                  >
                    Xử lý báo cáo <ArrowUpRight size={13} strokeWidth={2} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
