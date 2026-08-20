"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  BookOpen, 
  UserCheck, 
  Clock, 
  AlertCircle, 
  Loader2,
  Coins,
  Sparkles
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/lib/api/axiosClient";
import AdminAnalyticsChart from "@/components/admin/AdminAnalyticsChart";
import AdminContentBreakdown from "@/components/admin/AdminContentBreakdown";

type DashboardStats = {
  stats: {
    totalStudents: number;
    totalTeachers: number;
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
          id: 1,
          name: "Tổng Học Viên",
          value: data.stats.totalStudents.toLocaleString(),
          icon: Users,
          color: "text-blue-500",
          bg: "bg-blue-100",
          sub: `+ ${data.stats.totalEnrollments} lượt ghi danh`,
        },
        {
          id: 2,
          name: "Giáo Viên",
          value: data.stats.totalTeachers.toLocaleString(),
          icon: UserCheck,
          color: "text-emerald-500",
          bg: "bg-emerald-100",
          sub: "Đang giảng dạy",
        },
        {
          id: 3,
          name: "Khóa Học Đang Mở",
          value: data.stats.totalCourses.toLocaleString(),
          icon: BookOpen,
          color: "text-purple-500",
          bg: "bg-purple-100",
          sub: `${data.stats.pendingCourses} chờ duyệt`,
        },
        {
          id: 4,
          name: "Bánh Mì Đã Thưởng",
          value: `${data.gamification?.totalBreads?.toLocaleString() || "1,250"} 🍞`,
          icon: Coins,
          color: "text-amber-500",
          bg: "bg-amber-100",
          sub: "Tích lũy qua học tập",
        },
      ]
    : [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-3xl">📊</span>
            <h1 className="text-3xl font-black text-slate-800">Tổng Quan Hệ Thống</h1>
          </div>
          <p className="text-slate-400 font-bold text-sm">
            Chào mừng Quản trị viên <span className="font-extrabold text-blue-600">{user?.email || "Admin"}</span> quay trở lại BreadTrans CMS!
          </p>
        </div>

        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-2xl border border-blue-200 font-black text-xs">
          <Sparkles size={16} /> Phiên bản CMS 2.0 (Live Analytics)
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-600" size={48} />
        </div>
      ) : (
        <>
          {/* TOP 4 STATS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS.map((stat, index) => (
              <motion.div
                key={stat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                className="bg-white p-6 rounded-[2rem] border-4 border-slate-100 shadow-sm hover:border-slate-200 transition-colors"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl`}>
                    <stat.icon size={22} />
                  </div>
                  <h3 className="text-slate-400 font-black text-xs uppercase tracking-wider">{stat.name}</h3>
                </div>
                <p className="text-3xl font-black text-slate-800">{stat.value}</p>
                <p className="text-xs font-bold text-slate-400 mt-1">{stat.sub}</p>
              </motion.div>
            ))}
          </div>

          {/* PENDING COURSES ALERT */}
          {data && data.stats.pendingCourses > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-center justify-between gap-3 text-amber-900"
            >
              <div className="flex items-center gap-3">
                <AlertCircle size={22} className="text-amber-600 shrink-0" />
                <p className="text-sm font-bold">
                  Có <strong>{data.stats.pendingCourses}</strong> khóa học đang ở trạng thái chờ duyệt nội dung.
                </p>
              </div>
              <a
                href="/admin/courses"
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors whitespace-nowrap"
              >
                Xem và duyệt ngay →
              </a>
            </motion.div>
          )}

          {/* MAIN 2-COLUMN SECTION: CHART + RECENT ACTIVITY */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* INTERACTIVE ANALYTICS CHART (LEFT 2/3) */}
            <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[2.5rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0]">
              <AdminAnalyticsChart data={data?.monthlyTrends} />
            </div>

            {/* RECENT ACTIVITY LOG (RIGHT 1/3) */}
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <Clock size={20} className="text-blue-500" /> Hoạt Động Gần Đây
                  </h3>
                  <span className="text-xs font-black text-slate-400">Thời gian thực</span>
                </div>

                <div className="space-y-3.5">
                  {data?.recentActivity && data.recentActivity.length > 0 ? (
                    data.recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex gap-3 items-start pb-3 border-b border-slate-100 last:border-0 last:pb-0"
                      >
                        <div className="w-2.5 h-2.5 mt-1.5 rounded-full bg-blue-500 shrink-0" />
                        <div>
                          <p className="text-xs font-extrabold text-slate-700 leading-snug">
                            {activity.message}
                          </p>
                          <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                            {timeAgo(activity.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-xs font-bold text-center py-10">
                      Chưa có hoạt động nào được ghi nhận.
                    </p>
                  )}
                </div>
              </div>

              {/* QUICK LINK TO ENROLLMENT */}
              <div className="pt-4 border-t border-slate-100">
                <a
                  href="/admin/enroll"
                  className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-blue-600 font-extrabold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1"
                >
                  Ghi danh thêm học viên →
                </a>
              </div>
            </div>
          </div>

          {/* CONTENT BREAKDOWN SECTION */}
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0]">
            <AdminContentBreakdown data={data?.contentBreakdown} />
          </div>
        </>
      )}
    </div>
  );
}
