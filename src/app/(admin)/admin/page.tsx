"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CreditCard,
  FilePlus2,
  Flag,
  Inbox,
  MessageSquare,
  Users,
} from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import AdminAnalyticsChart from "@/components/admin/AdminAnalyticsChart";
import AdminContentBreakdown from "@/components/admin/AdminContentBreakdown";
import { getRangeLabel } from "@/components/admin/adminDashboardChartUtils";

type DashboardRange = "30d" | "6m" | "12m";

type DashboardStats = {
  range: DashboardRange;
  stats: {
    totalStudents: number;
    activeStudents: number;
    totalCourses: number;
    pendingCourses: number;
    pendingPayments: number;
    unreadSupportMessages: number;
    pendingSuggestions: number;
    openIssueReports: number;
  };
  monthlyTrends?: { month: string; enrollments: number; activityCount: number }[];
  contentBreakdown?: { vocab: number; grammar: number; quizzes: number; speaking: number; media: number };
  gamification?: { pendingOrders: number };
  recentActivity: { id: number; type: string; message: string; avatar: string | null; createdAt: string }[];
};

const RANGE_OPTIONS: { value: DashboardRange; label: string }[] = [
  { value: "30d", label: "30 ngày" },
  { value: "6m", label: "6 tháng" },
  { value: "12m", label: "12 tháng" },
];

const QUICK_ACTIONS = [
  { label: "Tạo khóa học", detail: "Mở Course Studio", href: "/admin/courses", icon: BookOpen },
  { label: "Tạo đề luyện tập", detail: "Mở Exam CMS", href: "/admin/exams", icon: FilePlus2 },
  { label: "Xem hộp thư", detail: "Phản hồi học viên", href: "/admin/messages", icon: Inbox },
  { label: "Quản lý học viên", detail: "Tìm và theo dõi tiến độ", href: "/admin/users", icon: Users },
];

function timeAgo(dateStr: string) {
  const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} giờ trước` : `${Math.floor(hours / 24)} ngày trước`;
}

export default function AdminDashboardPage() {
  const [range, setRange] = useState<DashboardRange>("6m");
  const { data, isLoading, isError, refetch } = useQuery<DashboardStats>({
    queryKey: ["admin-dashboard", range],
    queryFn: async () => {
      const response: unknown = await axiosClient.get("/admin/dashboard-stats", { params: { range } });
      return (response as { data?: DashboardStats }).data ?? (response as DashboardStats);
    },
  });

  const pendingTransactions = (data?.stats.pendingPayments ?? 0) + (data?.gamification?.pendingOrders ?? 0);
  const attentionItems = [
    { count: data?.stats.openIssueReports ?? 0, label: "báo cáo lỗi cần xem", href: "/admin/issue-reports", icon: Flag },
    { count: data?.stats.unreadSupportMessages ?? 0, label: "tin nhắn chưa đọc", href: "/admin/messages", icon: Inbox },
    { count: data?.stats.pendingSuggestions ?? 0, label: "đề xuất đang chờ", href: "/admin/suggestions", icon: MessageSquare },
    { count: data?.stats.pendingCourses ?? 0, label: "khóa học ở trạng thái nháp", href: "/admin/courses", icon: BookOpen },
    { count: pendingTransactions, label: "giao dịch gói cần duyệt", href: "/admin/plan-purchases", icon: CreditCard },
  ].filter((item) => item.count > 0);
  const attentionTotal = attentionItems.reduce((sum, item) => sum + item.count, 0);
  const stats = data ? [
    { label: "Học viên", value: data.stats.totalStudents, detail: `${data.stats.activeStudents} hoạt động trong ${getRangeLabel(range).toLowerCase()}`, href: "/admin/users", icon: Users },
    { label: "Khóa học đã xuất bản", value: data.stats.totalCourses, detail: data.stats.pendingCourses ? `${data.stats.pendingCourses} khóa đang là bản nháp` : "Không có khóa học đang là bản nháp", href: "/admin/courses", icon: BookOpen },
    { label: "Việc cần xử lý", value: attentionTotal, detail: attentionTotal ? "Mở danh sách ưu tiên" : "Không có việc tồn đọng", href: "#needs-attention", icon: AlertTriangle },
    { label: "Tin nhắn chưa đọc", value: data.stats.unreadSupportMessages, detail: data.stats.unreadSupportMessages ? "Cần phản hồi học viên" : "Không có tin nhắn mới", href: "/admin/messages", icon: Inbox },
  ] : [];

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-6 pb-12">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Tổng quan vận hành</h1>
          <p className="mt-1 text-sm text-slate-500">Theo dõi tình hình hệ thống và xử lý các việc đang chờ.</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          Khoảng dữ liệu
          <select
            value={range}
            onChange={(event) => setRange(event.target.value as DashboardRange)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            aria-label="Chọn khoảng dữ liệu Dashboard"
          >
            {RANGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </header>

      {isLoading ? (
        <div className="space-y-5" aria-label="Đang tải dữ liệu Dashboard">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-36 animate-pulse border border-slate-200 bg-slate-50" />)}</div>
          <div className="grid gap-6 xl:grid-cols-12"><div className="h-96 animate-pulse border border-slate-200 bg-slate-50 xl:col-span-8" /><div className="h-72 animate-pulse border border-slate-200 bg-slate-50 xl:col-span-4" /></div>
        </div>
      ) : isError || !data ? (
        <section className="border border-slate-200 bg-white p-6" aria-live="polite">
          <h2 className="font-semibold text-slate-950">Không thể tải dữ liệu tổng quan</h2>
          <p className="mt-1 text-sm text-slate-500">Hãy thử tải lại. Các khu vực quản trị khác vẫn hoạt động độc lập.</p>
          <button type="button" onClick={() => refetch()} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">Thử lại</button>
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Chỉ số vận hành">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return <Link key={stat.label} href={stat.href} className="group border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
                <div className="flex items-start justify-between gap-3"><p className="text-sm font-medium text-slate-600">{stat.label}</p><Icon size={18} className="text-slate-500" aria-hidden="true" /></div>
                <p className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">{stat.value.toLocaleString()}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500 group-hover:text-slate-700">{stat.detail}</p>
              </Link>;
            })}
          </section>

          <section id="needs-attention" aria-labelledby="needs-attention-heading" className="border-y border-slate-200 bg-white py-1">
            <header className="flex items-baseline justify-between gap-3 px-4 py-3 sm:px-5"><div><h2 id="needs-attention-heading" className="font-semibold text-slate-950">Cần xử lý</h2><p className="mt-0.5 text-sm text-slate-500">Các việc hiện có, sắp theo mức độ cần xem trước.</p></div><span className="text-sm text-slate-500">{attentionTotal} việc</span></header>
            {attentionItems.length ? <div className="divide-y divide-slate-100">{attentionItems.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 sm:px-5"><span className="flex items-center gap-3"><Icon size={17} className="text-slate-500" aria-hidden="true" /><span className="text-sm text-slate-700"><strong className="font-semibold text-slate-950">{item.count}</strong> {item.label}</span></span><ArrowRight size={16} className="text-slate-400" aria-hidden="true" /></Link>; })}</div> : <div className="flex items-center gap-2 px-4 py-4 text-sm text-slate-600 sm:px-5"><CheckCircle2 size={17} className="text-emerald-600" aria-hidden="true" />Không có công việc cần xử lý.</div>}
          </section>

          <div className="grid items-start gap-6 xl:grid-cols-12">
            <div className="space-y-6 xl:col-span-8">
              <div className="border border-slate-200 bg-white p-5 sm:p-6"><AdminAnalyticsChart data={data.monthlyTrends} range={data.range ?? range} /></div>
              <div className="border border-slate-200 bg-white p-5 sm:p-6"><AdminContentBreakdown data={data.contentBreakdown} /></div>
            </div>
            <aside className="space-y-6 xl:col-span-4 xl:sticky xl:top-6">
              <section aria-labelledby="recent-activity-heading" className="border border-slate-200 bg-white p-5">
                <header className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4"><div><h2 id="recent-activity-heading" className="font-semibold text-slate-950">Hoạt động gần đây</h2><p className="mt-1 text-sm text-slate-500">Các lượt cấp quyền truy cập mới trong kỳ.</p></div><span className="text-sm text-slate-500">{data.recentActivity.length}</span></header>
                {data.recentActivity.length ? <ol className="divide-y divide-slate-100">{data.recentActivity.map((activity) => <li key={activity.id} className="py-4 first:pt-4"><p className="text-sm leading-6 text-slate-700">{activity.message}</p><time className="mt-1 block text-xs text-slate-500" dateTime={activity.createdAt}>{timeAgo(activity.createdAt)}</time></li>)}</ol> : <p className="py-6 text-sm text-slate-500">Chưa có lượt cấp quyền truy cập trong kỳ này.</p>}
              </section>
            </aside>
          </div>

          <section aria-labelledby="quick-actions-heading">
            <div className="mb-3"><h2 id="quick-actions-heading" className="font-semibold text-slate-950">Thao tác nhanh</h2><p className="mt-1 text-sm text-slate-500">Bốn điểm vào dành cho các tác vụ quản trị thường dùng.</p></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{QUICK_ACTIONS.map((action) => { const Icon = action.icon; return <Link key={action.href} href={action.href} className="group flex min-h-20 items-center justify-between gap-4 border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"><span><span className="block text-sm font-semibold text-slate-900">{action.label}</span><span className="mt-1 block text-xs text-slate-500">{action.detail}</span></span><Icon size={18} className="shrink-0 text-slate-500 transition group-hover:text-slate-800" aria-hidden="true" /></Link>; })}</div>
          </section>
        </>
      )}
    </main>
  );
}
