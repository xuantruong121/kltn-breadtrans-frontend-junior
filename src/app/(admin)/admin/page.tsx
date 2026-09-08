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
  FileText
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
    totalCourses: number;
    pendingCourses: number;
    totalEnrollments: number;
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

export default function AdminDashboardPage() {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const res: any = await axiosClient.get("/admin/dashboard-stats");
      return res?.data || res;
    },
  });

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
          sub: `+${data.stats.totalEnrollments.toLocaleString()} lượt ghi danh`,
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
          sub: data.stats.pendingCourses > 0 ? `${data.stats.pendingCourses} khóa chờ duyệt` : "Đã kiểm duyệt 100%",
          alert: data.stats.pendingCourses > 0,
        },
        {
          id: "gamification",
          name: "Điểm Thưởng Tích Lũy",
          value: `${data.gamification?.totalBreads?.toLocaleString() || "1,250"}`,
          unit: "Bánh Mì",
          icon: Coins,
          color: "text-amber-600",
          bg: "bg-amber-50",
          borderColor: "border-amber-100",
          sub: `Tổng ví học viên · ${data.gamification?.approvedOrders || 0} đổi quà xong`,
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
            <span className="font-semibold text-slate-800">{user?.email || "Admin"}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Hệ thống trực tuyến
          </div>

          <Link
            href="/admin/enroll"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <UserPlus size={14} strokeWidth={2} /> Ghi danh mới
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3 bg-white border border-slate-200/80 rounded-xl">
          <Loader2 className="animate-spin text-blue-600" size={36} />
          <p className="text-xs font-medium text-slate-500">Đang đồng bộ dữ liệu quản trị...</p>
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
                    <div className={`${stat.bg} ${stat.color} p-2 rounded-lg border ${stat.borderColor}`}>
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
                    <span className={`font-medium ${stat.alert ? "text-amber-700 font-semibold" : "text-slate-500"}`}>
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
                  <span className="font-semibold text-amber-900">Nội dung chờ duyệt:</span> Hiện có{" "}
                  <strong>{data.stats.pendingCourses}</strong> khóa học đang ở trạng thái chờ kiểm duyệt nội dung trước khi xuất bản.
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
                          Nhật Ký Hoạt Động
                        </h3>
                        <p className="text-[11px] text-slate-400">Thời gian thực hệ thống</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/70">
                      {data?.recentActivity?.length || 0} bản ghi
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {data?.recentActivity && data.recentActivity.length > 0 ? (
                      data.recentActivity.map((activity) => {
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
                        <p className="text-xs">Chưa có hoạt động nào được ghi nhận.</p>
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
                    href="/admin/enroll"
                    className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg border border-blue-200 transition-colors flex items-center justify-center gap-1 shadow-2xs"
                  >
                    Ghi danh <UserPlus size={13} strokeWidth={2} />
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
