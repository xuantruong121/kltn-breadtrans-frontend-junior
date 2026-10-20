"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Users,
  BookOpen,
  Clock,
  AlertTriangle,
  Loader2,
  Coins,
  TrendingUp,
  LayoutDashboard,
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
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
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

const AI_AUTHORING_DESTINATIONS = [
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
    label: "TOEIC Part 5",
    description: "AI chỉ gợi ý câu hỏi Part 5, không áp dụng cho các Part khác.",
    href: "/admin/exams",
    icon: Award,
  },
] as const;

export default function AdminDashboardPage() {
  const { user } = useAuthStore();

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

  const visibleRecentActivity =
    data?.recentActivity?.filter(
      (activity) => !["enrollment", "enroll"].includes(activity.type.toLowerCase()),
    ) || [];

  const STATS = data
    ? [
        {
          id: "students",
          name: "Tổng Học Viên",
          value: data.stats.totalStudents.toLocaleString(),
          icon: Users,
          color: "text-blue-600",
          bg: "bg-blue-50",
          borderColor: "border-blue-100",
          sub: `${data.stats.activeStudents || 0} hoạt động trong 30 ngày`,
          trendPositive: true,
        },
        {
          id: "courses",
          name: "Khóa Học Đang Mở",
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
        },
        {
          id: "commerce",
          name: "Giao Dịch Cần Duyệt",
          value: pendingTransactionsTotal.toLocaleString(),
          icon: CreditCard,
          color: "text-amber-600",
          bg: "bg-amber-50",
          borderColor: "border-amber-100",
          sub: `${data.stats.pendingPayments || 0} thanh toán · ${data.gamification?.pendingOrders || 0} đơn quà chờ duyệt`,
          alert: pendingTransactionsTotal > 0,
        },
        {
          id: "gamification",
          name: "Điểm Thưởng Tích Lũy",
          value: (data.gamification?.totalBreads ?? 0).toLocaleString(),
          unit: "Bánh Mì",
          icon: Coins,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
          borderColor: "border-emerald-100",
          sub: `Tổng ví học viên · ${data.gamification?.approvedOrders || 0} đơn đổi quà xong`,
        },
      ]
    : [];

  return (
    <div className="w-full max-w-[1720px] mx-auto space-y-6 pb-12">
      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/70">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-lg bg-slate-900 text-white shadow-xs">
              <LayoutDashboard size={20} strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Tổng Quan Hệ Thống
            </h1>
          </div>
          <p className="text-slate-500 text-sm">
            Bảng điều khiển quản trị BreadTrans CMS &middot; Tài khoản:{" "}
            <span className="font-semibold text-slate-800">
              {user?.email || "Admin"}
            </span>
          </p>
        </div>
      </div>

      <section
        aria-labelledby="ai-authoring-heading"
        className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-5 shadow-xs"
      >
        <div className="flex flex-col gap-3 border-b border-amber-200/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-900">
              <FileText size={18} strokeWidth={2} aria-hidden="true" />
              <h2 id="ai-authoring-heading" className="text-base font-bold">
                AI hỗ trợ soạn nội dung
              </h2>
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              AI tạo nội dung gợi ý để hỗ trợ biên soạn. Admin cần kiểm tra/chỉnh sửa trước khi lưu. Nội dung không tự động xuất bản.
            </p>
          </div>
          <span className="shrink-0 self-start rounded-md border border-amber-200 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900">
            Chọn Studio để bắt đầu
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {AI_AUTHORING_DESTINATIONS.map((destination) => {
            const Icon = destination.icon;
            return (
              <Link
                key={destination.href}
                href={destination.href}
                className="group min-h-28 rounded-lg border border-slate-200 bg-white p-3.5 transition-colors hover:border-amber-300 hover:bg-amber-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
              >
                <div className="flex items-start gap-3">
                  <span className="rounded-md border border-slate-200 bg-slate-50 p-2 text-slate-700 transition-colors group-hover:border-amber-200 group-hover:bg-amber-100/60 group-hover:text-amber-900">
                    <Icon size={16} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">
                      {destination.label}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {destination.description}
                    </span>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-800">
                      Mở Studio <ArrowRight size={13} strokeWidth={2} aria-hidden="true" />
                    </span>
                  </span>
                </div>
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
            {STATS.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all"
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
                    {stat.unit && (
                      <span className="text-xs font-semibold text-slate-500">
                        {stat.unit}
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span
                      className={`font-medium ${stat.alert ? "text-amber-700 font-semibold" : "text-slate-500"}`}
                    >
                      {stat.sub}
                    </span>
                    {stat.trendPositive && (
                      <span className="text-emerald-600 flex items-center gap-0.5 font-semibold text-[11px]">
                        <TrendingUp size={12} strokeWidth={2} /> Hoạt động
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* 3. PENDING APPROVAL ALERT */}
          {data && data.stats.pendingCourses > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg shrink-0">
                  <AlertTriangle size={18} strokeWidth={2} />
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-amber-900">
                    Nội dung chờ duyệt:
                  </span>{" "}
                  Hiện có <strong>{data.stats.pendingCourses}</strong> khóa học
                  đang ở trạng thái chờ kiểm duyệt nội dung trước khi xuất bản.
                </div>
              </div>
              <Link
                href="/admin/courses"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors whitespace-nowrap self-end sm:self-auto"
              >
                Xét duyệt ngay <ArrowRight size={14} strokeWidth={2} />
              </Link>
            </motion.div>
          )}

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
