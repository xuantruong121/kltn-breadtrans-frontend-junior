"use client";

import { motion } from "framer-motion";
import { Users, BookOpen, UserCheck, Clock, AlertCircle, TrendingUp } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/lib/api/axiosClient";
import { Loader2 } from "lucide-react";

type DashboardStats = {
  stats: {
    totalStudents: number;
    totalTeachers: number;
    totalCourses: number;
    pendingCourses: number;
    totalEnrollments: number;
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
      const res = await axiosClient.get("/admin/dashboard-stats");
      return res.data;
    },
  });

  const STATS = data
    ? [
        {
          id: 1, name: "Tổng Học Viên", value: data.stats.totalStudents.toLocaleString(),
          icon: Users, color: "text-blue-500", bg: "bg-blue-100",
          sub: `+ ${data.stats.totalEnrollments} ghi danh`,
        },
        {
          id: 2, name: "Giáo Viên", value: data.stats.totalTeachers.toLocaleString(),
          icon: UserCheck, color: "text-green-500", bg: "bg-green-100",
          sub: "Đang giảng dạy",
        },
        {
          id: 3, name: "Khóa Học Đang Mở", value: data.stats.totalCourses.toLocaleString(),
          icon: BookOpen, color: "text-purple-500", bg: "bg-purple-100",
          sub: `${data.stats.pendingCourses} chờ duyệt`,
        },
        {
          id: 4, name: "Tổng Ghi Danh", value: data.stats.totalEnrollments.toLocaleString(),
          icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-100",
          sub: "Trên toàn hệ thống",
        },
      ]
    : [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Tổng quan (Dashboard)</h1>
        <p className="text-slate-500 mt-1">
          Chào mừng Quản trị viên <span className="font-semibold text-blue-600">{user?.email || ""}</span> quay trở lại hệ thống BreadTrans!
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-600" size={48} />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {STATS.map((stat, index) => (
              <motion.div
                key={stat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className={`${stat.bg} ${stat.color} p-3 rounded-xl`}>
                    <stat.icon size={22} />
                  </div>
                  <h3 className="text-slate-500 font-medium text-sm">{stat.name}</h3>
                </div>
                <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
              </motion.div>
            ))}
          </div>

          {/* Pending Courses Alert */}
          {data && data.stats.pendingCourses > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 mb-6"
            >
              <AlertCircle size={20} className="text-amber-500 flex-shrink-0" />
              <p className="text-amber-800 text-sm font-medium">
                Có <strong>{data.stats.pendingCourses}</strong> khóa học đang chờ duyệt.{" "}
                <a href="/admin/courses" className="underline hover:text-amber-900">Xem ngay →</a>
              </p>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart placeholder */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-h-[350px] flex flex-col">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-purple-500" /> Thống kê tổng quan
              </h3>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{data?.stats.totalStudents}</p>
                  <p className="text-xs text-blue-500 mt-1 font-medium">Học viên</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{data?.stats.totalTeachers}</p>
                  <p className="text-xs text-green-500 mt-1 font-medium">Giáo viên</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-purple-700">{data?.stats.totalCourses}</p>
                  <p className="text-xs text-purple-500 mt-1 font-medium">Khóa học</p>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center mt-4">
                <p className="text-slate-400 text-sm">Biểu đồ sẽ được thêm vào phiên bản tiếp theo</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Clock size={20} className="text-blue-500" /> Hoạt động gần đây
              </h3>
              <div className="space-y-3">
                {data?.recentActivity && data.recentActivity.length > 0 ? (
                  data.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex gap-3 items-start pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                      <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-slate-700">{activity.message}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{timeAgo(activity.createdAt)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm text-center py-6">Chưa có hoạt động nào</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
