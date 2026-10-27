"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { X, Search, Loader2, Award, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import {
  adminSubscriptionService,
  type AdminLearnerLookup,
} from "@/lib/api/services/admin-subscription.service";
import { getApiErrorMessage } from "@/lib/utils/apiError";

interface AdminGrantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedLearner?: { id: number; email: string; fullName?: string | null } | null;
}

export function AdminGrantModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedLearner,
}: AdminGrantModalProps) {
  const [selectedStudent, setSelectedStudent] = useState<AdminLearnerLookup | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPlanVersionId, setSelectedPlanVersionId] = useState<number | null>(null);
  const [durationPreset, setDurationPreset] = useState<number>(30);
  const [customDays, setCustomDays] = useState<string>("");
  const [reason, setReason] = useState("");
  const operationIdRef = useRef<string>("");

  useEffect(() => {
    if (isOpen) {
      operationIdRef.current = `grant-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(studentSearch.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [studentSearch]);

  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ["admin-active-plans"],
    queryFn: adminSubscriptionService.getActivePlans,
    enabled: isOpen,
  });

  const effectivePlanVersionId = selectedPlanVersionId ?? (plans[0]?.currentVersionId || null);

  const activeStudent =
    selectedStudent ??
    (preselectedLearner
      ? {
          id: preselectedLearner.id,
          email: preselectedLearner.email,
          fullName: preselectedLearner.fullName ?? null,
          activeSubscription: null,
        }
      : null);

  const { data: learners = [], isFetching: searchingLearners } = useQuery({
    queryKey: ["admin-search-learners", debouncedSearch],
    queryFn: () => adminSubscriptionService.searchLearners(debouncedSearch || undefined),
    enabled: isOpen && !activeStudent && debouncedSearch.length >= 2,
  });

  const grantMutation = useMutation({
    mutationFn: async () => {
      if (!activeStudent) throw new Error("Chưa chọn học viên");
      if (!effectivePlanVersionId) throw new Error("Chưa chọn gói nâng cấp");
      if (!reason.trim()) throw new Error("Lý do tặng gói không được để trống");

      const days = durationPreset === -1 ? parseInt(customDays, 10) : durationPreset;
      if (!days || days <= 0) throw new Error("Thời hạn gói không hợp lệ");

      return await adminSubscriptionService.grant({
        studentId: activeStudent.id,
        planVersionId: effectivePlanVersionId,
        durationDays: days,
        reason: reason.trim(),
        idempotencyKey: operationIdRef.current,
      });
    },
    onSuccess: () => {
      toast.success("Tặng gói cho học viên thành công.");
      setReason("");
      setSelectedStudent(null);
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      const msg =
        getApiErrorMessage(err, "Không thể tặng gói cho học viên.");
      toast.error(msg);
    },
  });

  if (!isOpen) return null;

  const durationDays = durationPreset === -1 ? parseInt(customDays, 10) || 0 : durationPreset;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <Award size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Tặng gói cho học viên</h2>
              <p className="text-xs text-slate-500">
                Cấp quyền trực tiếp mà không qua cổng thanh toán.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            grantMutation.mutate();
          }}
          className="mt-4 space-y-4 text-sm"
        >
          {/* Section 1: Learner Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Học viên nhận gói <span className="text-rose-500">*</span>
            </label>
            {activeStudent ? (
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <p className="font-semibold text-slate-800">
                    {activeStudent.fullName || "Chưa đặt tên"}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">{activeStudent.email}</p>
                </div>
                {!preselectedLearner && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudent(null);
                      setStudentSearch("");
                    }}
                    className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
                  >
                    Đổi học viên
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Nhập tối thiểu 2 ký tự email hoặc tên..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  {searchingLearners && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin size-4 text-slate-400" />
                  )}
                </div>

                {learners.length > 0 && (
                  <ul className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white shadow-sm">
                    {learners.map((learner) => {
                      const hasActive = !!learner.activeSubscription;
                      return (
                        <li key={learner.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedStudent(learner)}
                            className="w-full text-left p-2.5 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                          >
                            <div>
                              <p className="font-medium text-slate-800">
                                {learner.fullName || "Chưa đặt tên"}
                              </p>
                              <p className="text-xs text-slate-400 font-mono">{learner.email}</p>
                            </div>
                            {hasActive ? (
                              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Đang có gói
                              </span>
                            ) : (
                              <span className="text-xs text-blue-600 font-medium">Chọn</span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Plan Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Gói nâng cấp <span className="text-rose-500">*</span>
            </label>
            {loadingPlans ? (
              <div className="flex items-center gap-2 text-slate-400 py-2">
                <Loader2 size={16} className="animate-spin" /> Đang tải danh sách gói...
              </div>
            ) : (
              <select
                value={effectivePlanVersionId ?? ""}
                onChange={(e) => setSelectedPlanVersionId(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {plans.map((p) => (
                  <option key={p.currentVersionId} value={p.currentVersionId}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Section 3: Duration Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Thời hạn cấp quyền <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[7, 30, 90, 180].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setDurationPreset(days)}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    durationPreset === days
                      ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {days} ngày
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDurationPreset(-1)}
                className={`py-1.5 px-3 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  durationPreset === -1
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Tùy chỉnh số ngày
              </button>
              {durationPreset === -1 && (
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  placeholder="Nhập số ngày"
                  className="w-32 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              )}
            </div>
          </div>

          {/* Section 4: Reason (Audit requirement) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lý do tặng gói (Bắt buộc kiểm toán) <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Học bổng học viên xuất sắc tháng 10, tài khoản hỗ trợ kiểm thử, v.v."
              className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Summary Banner */}
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-start gap-2">
            <Calendar size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Thời hạn dự kiến:</p>
              <p className="mt-0.5 text-blue-800">
                Cấp quyền có hiệu lực ngay từ hôm nay trong vòng{" "}
                <span className="font-bold">{durationDays} ngày</span>. Thao tác này được lưu vết kiểm toán và không tạo giao dịch thanh toán.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={grantMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={
                grantMutation.isPending ||
                !activeStudent ||
                !effectivePlanVersionId ||
                !reason.trim() ||
                durationDays <= 0
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {grantMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Đang cấp quyền...
                </>
              ) : (
                "Xác nhận tặng gói"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
