"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
  BookOpen,
  Loader2,
  ArrowRight,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import axiosClient from "@/lib/api/axiosClient";
import {
  paymentService,
  StudentPayment,
} from "@/lib/api/services/payment.service";
import { PaymentDetailModal } from "@/modules/payment/components/PaymentDetailModal";
import { StatusBadge } from "@/components/ui/StatusBadge";

type EnrolledClass = {
  classId: number;
  className: string;
  classStatus: string;
  startDate: string | null;
  endDate: string | null;
  progress: number;
  enrollmentStatus: string;
  tuitionFeeVnd?: number;
  joinedAt: string;
  studentCount: number;
  course: {
    id: number;
    title: string;
    thumbnail: string | null;
    description: string | null;
    level: string | null;
  };
};

type TabFilter = "ALL" | "ACTIVE" | "PENDING_PAYMENT" | "COMPLETED";

export default function MyCoursesPage() {
  const { user } = useAuthStore();
  const [selectedTab, setSelectedTab] = useState<TabFilter>("ALL");
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [selectedEnrollmentStatus, setSelectedEnrollmentStatus] = useState<
    "ACTIVE" | "PENDING_PAYMENT" | "COMPLETED" | "DROPPED" | undefined
  >(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const { data: classes, isLoading } = useQuery<EnrolledClass[]>({
    queryKey: ["my-enrolled-classes", user?.id],
    queryFn: async () => {
      const res = await axiosClient.get("/courses");
      return (res as unknown as EnrolledClass[]) || [];
    },
    enabled: !!user && user.role === "STUDENT",
  });

  const { data: payments } = useQuery<StudentPayment[]>({
    queryKey: ["my-payments", user?.id],
    queryFn: paymentService.getMyPayments,
    enabled: !!user && user.role === "STUDENT",
  });

  const paymentMap = useMemo(() => {
    const map = new Map<number, StudentPayment>();
    if (payments) {
      for (const p of payments) {
        map.set(p.class.id, p);
      }
    }
    return map;
  }, [payments]);

  const allEnrolled = useMemo(() => classes || [], [classes]);

  const filteredClasses = useMemo(() => {
    if (selectedTab === "ALL") return allEnrolled;
    if (selectedTab === "ACTIVE") {
      return allEnrolled.filter((c) => c.enrollmentStatus === "ACTIVE");
    }
    if (selectedTab === "PENDING_PAYMENT") {
      return allEnrolled.filter((c) => c.enrollmentStatus === "PENDING_PAYMENT");
    }
    if (selectedTab === "COMPLETED") {
      return allEnrolled.filter(
        (c) => c.enrollmentStatus === "COMPLETED" || c.progress >= 100
      );
    }
    return allEnrolled;
  }, [allEnrolled, selectedTab]);

  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentClasses = filteredClasses.slice(indexOfFirstItem, indexOfLastItem);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Header & Summary */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider">
            <GraduationCap size={15} /> Thư viện khóa học của bạn
          </div>
          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Khóa học của tôi
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Quản lý lộ trình học tập, theo dõi tiến độ bài giảng và truy cập vào không gian học.
          </p>
        </div>

        <Link
          href="/courses"
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-700 shadow-2xs hover:border-blue-300 hover:text-blue-600"
        >
          Khám phá thêm khóa học <ArrowRight size={14} />
        </Link>
      </div>

      {/* 2. Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { key: "ALL", label: "Tất cả khóa học", count: allEnrolled.length },
          {
            key: "ACTIVE",
            label: "Đang học",
            count: allEnrolled.filter((c) => c.enrollmentStatus === "ACTIVE").length,
          },
          {
            key: "PENDING_PAYMENT",
            label: "Chờ thanh toán",
            count: allEnrolled.filter((c) => c.enrollmentStatus === "PENDING_PAYMENT").length,
          },
          {
            key: "COMPLETED",
            label: "Đã hoàn thành",
            count: allEnrolled.filter(
              (c) => c.enrollmentStatus === "COMPLETED" || c.progress >= 100
            ).length,
          },
        ].map((tab) => {
          const isActive = selectedTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setSelectedTab(tab.key as TabFilter);
                setCurrentPage(1);
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Courses Grid */}
      {currentClasses.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentClasses.map((cls) => {
              const payment = paymentMap.get(cls.classId);
              const isPending = cls.enrollmentStatus === "PENDING_PAYMENT";
              const isCompleted =
                cls.enrollmentStatus === "COMPLETED" || cls.progress >= 100;

              return (
                <div
                  key={cls.classId}
                  className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <div>
                    {/* Header: Level & Status badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                        {cls.course?.level || "Cơ bản"}
                      </span>
                      <StatusBadge status={cls.enrollmentStatus} size="sm" />
                    </div>

                    {/* Course Title */}
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      {cls.course?.title || "Khóa học"}
                    </p>
                    <h3 className="mt-1 text-lg font-extrabold text-slate-900 line-clamp-2">
                      {cls.className}
                    </h3>

                    {/* Meta info */}
                    <p className="mt-2 text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {cls.course?.description ||
                        "Lộ trình tự học theo bài giảng tuần tự, bài tập thực hành và hướng dẫn chi tiết."}
                    </p>

                    {/* Progress Bar or Payment Info */}
                    <div className="mt-6 pt-4 border-t border-slate-100">
                      {isPending ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                            <span>Học phí:</span>
                            <span>
                              {new Intl.NumberFormat("vi-VN").format(
                                payment?.amountVnd ?? cls.tuitionFeeVnd ?? 0
                              )}{" "}
                              đ
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-700">
                            {payment?.status === "REPORTED"
                              ? "Đã báo chuyển khoản. Quản trị viên đang duyệt."
                              : "Vui lòng hoàn tất thanh toán để mở khóa toàn bộ bài học."}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                            <span>Tiến độ nội dung</span>
                            <span className="text-blue-600 font-extrabold">
                              {cls.progress}%
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, cls.progress)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Primary Action CTA */}
                  <div className="mt-6 pt-4">
                    {isPending ? (
                      payment ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPaymentId(payment.id);
                            setSelectedEnrollmentStatus(
                              cls.enrollmentStatus as any
                            );
                          }}
                          className="w-full inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 text-xs font-extrabold text-white shadow-xs transition hover:bg-amber-600 cursor-pointer"
                        >
                          <CreditCard size={15} />
                          {payment.status === "REPORTED"
                            ? "Xem trạng thái chuyển khoản"
                            : "Xem hướng dẫn thanh toán"}
                        </button>
                      ) : (
                        <div className="w-full rounded-2xl bg-amber-50 p-2.5 text-center text-xs font-bold text-amber-800 border border-amber-200">
                          Chờ thông tin thanh toán
                        </div>
                      )
                    ) : isCompleted ? (
                      <Link
                        href={`/classes/${cls.classId}`}
                        className="w-full inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-800 shadow-2xs transition hover:bg-slate-50 hover:text-blue-600"
                      >
                        Xem lại bài học <ArrowRight size={14} />
                      </Link>
                    ) : (
                      <Link
                        href={`/classes/${cls.classId}`}
                        className="w-full inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-xs transition hover:bg-blue-700"
                      >
                        Tiếp tục học <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`h-9 w-9 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      currentPage === i + 1
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      ) : (
        /* Empty State */
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center max-w-lg mx-auto space-y-4">
          <BookOpen className="mx-auto text-slate-300" size={44} />
          <h3 className="text-lg font-extrabold text-slate-900">
            {selectedTab === "ALL"
              ? "Bạn chưa đăng ký khóa học nào"
              : "Không có khóa học trong mục này"}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Khám phá các lộ trình tự học tiếng Anh và luyện đề TOEIC để bắt đầu nâng cao trình độ của bạn ngay hôm nay.
          </p>
          <div className="pt-2">
            <Link
              href="/courses"
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-orange-600 px-5 py-2.5 text-xs font-extrabold text-white transition hover:bg-orange-700"
            >
              Khám phá khóa học <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* Payment Detail Modal */}
      {selectedPaymentId && (
        <PaymentDetailModal
          paymentId={selectedPaymentId}
          onClose={() => {
            setSelectedPaymentId(null);
            setSelectedEnrollmentStatus(undefined);
          }}
          enrollmentStatus={selectedEnrollmentStatus}
        />
      )}
    </div>
  );
}
