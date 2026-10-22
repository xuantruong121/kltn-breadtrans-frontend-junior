"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingBag,
  CheckCircle,
  XCircle,
  Loader2,
  Truck,
  AlertTriangle,
} from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import toast from "react-hot-toast";

export default function AdminMarketOrdersPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [failureFormOrderId, setFailureFormOrderId] = useState<number | null>(
    null,
  );
  const [failureReason, setFailureReason] = useState("");

  const { data: orders, isLoading } = useQuery<any[]>({
    queryKey: ["admin-market-orders"],
    queryFn: async () => {
      const res: any = await axiosClient.get("/market/orders");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number;
      status: "approved" | "rejected";
    }) => {
      return axiosClient.patch(`/market/orders/${id}/review`, { status });
    },
    onSuccess: (_, vars) => {
      toast.success(
        vars.status === "approved"
          ? "Đã phê duyệt đơn hàng!"
          : "Đã từ chối đơn hàng!",
      );
      queryClient.invalidateQueries({ queryKey: ["admin-market-orders"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Có lỗi xảy ra");
    },
  });

  const markFailedMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      return axiosClient.patch(`/market/orders/${id}/mark-fulfillment-failed`, {
        reason,
      });
    },
    onSuccess: () => {
      toast.success("Đã hoàn Bánh Mì cho học viên.");
      queryClient.invalidateQueries({ queryKey: ["admin-market-orders"] });
      setFailureFormOrderId(null);
      setFailureReason("");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Có lỗi xảy ra");
    },
  });

  const filteredOrders = orders?.filter((ord) => {
    if (statusFilter === "all") return true;
    return ord.status === statusFilter;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-rose-500 p-3.5 rounded-2xl text-white shadow-sm">
            <ShoppingBag size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800">
              Quản Lý Đơn Hàng Đổi Quà
            </h1>
            <p className="text-slate-400 font-bold text-sm">
              Xem và phê duyệt các yêu cầu đổi Bánh Mì lấy quà/voucher của học viên
            </p>
          </div>
        </div>

        {/* STATUS FILTER */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border-2 border-slate-200">
          {["all", "pending", "approved", "rejected"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs capitalize transition-colors cursor-pointer ${
                statusFilter === st
                  ? "bg-rose-500 text-white shadow-xs"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {st === "all"
                ? "Tất cả"
                : st === "pending"
                  ? "Chờ duyệt"
                  : st === "approved"
                    ? "Đã duyệt"
                    : "Từ chối"}
            </button>
          ))}
        </div>
      </div>

      {/* ORDERS TABLE / CARDS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-rose-500" size={40} />
          </div>
        ) : filteredOrders && filteredOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
                  <th className="py-4 px-6">Mã Đơn</th>
                  <th className="py-4 px-6">Học Viên</th>
                  <th className="py-4 px-6">Vật Phẩm & Địa Chỉ Giao</th>
                  <th className="py-4 px-6">Bánh Mì Trừ</th>
                  <th className="py-4 px-6">Thời Gian</th>
                  <th className="py-4 px-6">Trạng Thái</th>
                  <th className="py-4 px-6 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-sm">
                {filteredOrders.map((ord) => {
                  const itemsList = Array.isArray(ord.items)
                    ? ord.items
                        .map((i: any) => `${i.name} (x${i.quantity || 1})`)
                        .join(", ")
                    : "Vật phẩm";

                  const physical = ord.physicalRedemptions?.[0];

                  return (
                    <tr
                      key={ord.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-4 px-6 text-slate-400 font-mono text-xs">
                        #{ord.id}
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-slate-800 font-bold">
                          {ord.studentName ||
                            ord.user?.profile?.fullName ||
                            "Học viên"}
                        </div>
                        <div className="text-xs text-slate-400 font-normal">
                          {ord.user?.email}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-700 max-w-sm">
                        <div className="font-semibold">{itemsList}</div>
                        {physical && (
                          <div className="mt-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200/80 text-xs space-y-0.5">
                            <div className="flex items-center gap-1 font-bold text-amber-900">
                              <Truck size={12} className="text-amber-700 shrink-0" />
                              <span>
                                {physical.recipientName} ({physical.phone})
                              </span>
                            </div>
                            <div className="text-slate-600 font-normal text-[11px] leading-relaxed">
                              {physical.formattedAddress}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 font-black text-amber-600">
                        -{ord.totalBanh} Bánh Mì
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-400">
                        {new Date(ord.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full border ${
                            ord.status === "approved" || ord.status === "completed"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : ord.status === "rejected"
                                ? "bg-rose-100 text-rose-800 border-rose-200"
                                : ord.status === "refunded"
                                  ? "bg-slate-200 text-slate-700 border-slate-300"
                                  : "bg-amber-100 text-amber-800 border-amber-200"
                          }`}
                        >
                          {ord.status === "approved"
                            ? "Đã duyệt"
                            : ord.status === "completed"
                              ? "Hoàn tất"
                              : ord.status === "rejected"
                                ? "Từ chối"
                                : ord.status === "refunded"
                                  ? "Đã hoàn tiền"
                                  : "Chờ duyệt"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {ord.status === "pending" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              disabled={reviewMutation.isPending}
                              onClick={() =>
                                reviewMutation.mutate({
                                  id: ord.id,
                                  status: "approved",
                                })
                              }
                              className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors cursor-pointer shadow-xs"
                              title="Duyệt đơn"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              disabled={reviewMutation.isPending}
                              onClick={() =>
                                reviewMutation.mutate({
                                  id: ord.id,
                                  status: "rejected",
                                })
                              }
                              className="p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-colors cursor-pointer shadow-xs"
                              title="Từ chối"
                            >
                              <XCircle size={16} />
                            </button>
                          </div>
                        ) : ord.status === "approved" || ord.status === "completed" ? (
                          failureFormOrderId === ord.id ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <input
                                autoFocus
                                value={failureReason}
                                onChange={(e) => setFailureReason(e.target.value)}
                                placeholder="Lý do thất bại..."
                                className="w-40 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                              />
                              <button
                                disabled={
                                  markFailedMutation.isPending ||
                                  !failureReason.trim()
                                }
                                onClick={() =>
                                  markFailedMutation.mutate({
                                    id: ord.id,
                                    reason: failureReason.trim(),
                                  })
                                }
                                className="px-2 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold disabled:opacity-50 cursor-pointer"
                              >
                                Xác nhận
                              </button>
                              <button
                                onClick={() => {
                                  setFailureFormOrderId(null);
                                  setFailureReason("");
                                }}
                                className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                Huỷ
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setFailureFormOrderId(ord.id);
                                setFailureReason("");
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Đánh dấu giao/thực hiện thất bại và hoàn Bánh Mì"
                            >
                              <AlertTriangle size={14} />
                              Giao thất bại
                            </button>
                          )
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400 font-bold">
            Không có đơn hàng nào phù hợp với bộ lọc.
          </div>
        )}
      </div>
    </div>
  );
}
