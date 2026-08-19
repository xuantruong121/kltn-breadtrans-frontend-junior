"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Coins, PlusCircle, MinusCircle, Users, Loader2, ArrowRight } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { Button3D } from "@/components/ui";
import toast from "react-hot-toast";

export default function AdminCurrencyPage() {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");
  const [amount, setAmount] = useState<number>(50);
  const [reason, setReason] = useState<string>("");
  const [actionType, setActionType] = useState<"add" | "subtract">("add");

  const { data: users, isLoading: isUsersLoading } = useQuery<any[]>({
    queryKey: ["admin-users-list"],
    queryFn: async () => {
      const res: any = await axiosClient.get("/admin/users?role=STUDENT");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async (payload: { userId: number; amount: number; reason: string }) => {
      return axiosClient.post("/market/currency/adjust", payload);
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Đã điều chỉnh Bánh Mì thành công!");
      setReason("");
      setSelectedUserId("");
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Có lỗi xảy ra");
    },
  });

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error("Vui lòng chọn học viên!");
      return;
    }
    if (!reason.trim()) {
      toast.error("Vui lòng nhập lý do điều chỉnh!");
      return;
    }

    const finalAmount = actionType === "add" ? Math.abs(amount) : -Math.abs(amount);
    adjustMutation.mutate({
      userId: Number(selectedUserId),
      amount: finalAmount,
      reason: reason.trim(),
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <div className="bg-amber-500 p-3.5 rounded-2xl text-white shadow-sm">
          <Coins size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800">Quản Lý Bánh Mì Học Viên</h1>
          <p className="text-slate-400 font-bold text-sm">
            Thưởng hoặc phạt trừ Bánh Mì thủ công và theo dõi danh sách học viên
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FORM ADJUSTMENT (LEFT 1/3) */}
        <div className="bg-white rounded-[2.5rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] p-6 space-y-5">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Coins className="text-amber-500" /> Điều Chỉnh Bánh Mì
          </h2>

          <form onSubmit={handleAdjustSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase mb-1 block">
                Chọn Học Viên
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(Number(e.target.value) || "")}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-amber-400"
              >
                <option value="">-- Chọn học viên --</option>
                {users?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.profile?.fullName || u.email} (ID: #{u.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black text-slate-500 uppercase mb-1 block">
                Loại Thao Tác
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActionType("add")}
                  className={`p-3 rounded-xl border-2 font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    actionType === "add"
                      ? "bg-emerald-500 text-white border-emerald-600 shadow-xs"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  <PlusCircle size={16} /> Cộng Bánh Mì
                </button>
                <button
                  type="button"
                  onClick={() => setActionType("subtract")}
                  className={`p-3 rounded-xl border-2 font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    actionType === "subtract"
                      ? "bg-rose-500 text-white border-rose-600 shadow-xs"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  <MinusCircle size={16} /> Trừ Bánh Mì
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-slate-500 uppercase mb-1 block">
                Số Lượng Bánh Mì
              </label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-black text-lg text-amber-600 outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-black text-slate-500 uppercase mb-1 block">
                Lý Do
              </label>
              <textarea
                rows={3}
                placeholder="VD: Thưởng hoàn thành xuất sắc thử thách tuần..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-amber-400"
              />
            </div>

            <Button3D
              type="submit"
              variant={actionType === "add" ? "green" : "orange"}
              size="md"
              className="w-full"
              disabled={adjustMutation.isPending}
            >
              {adjustMutation.isPending ? "Đang xử lý..." : "Xác Nhận Thực Hiện"}
            </Button3D>
          </form>
        </div>

        {/* USERS LIST (RIGHT 2/3) */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] p-6 space-y-4">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Users className="text-sky-500" /> Danh Sách Học Viên
          </h2>

          {isUsersLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-amber-500" size={36} />
            </div>
          ) : users && users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-100 bg-slate-50 text-slate-400 font-black text-xs uppercase">
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Họ và Tên</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4 text-right">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-sm">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 text-slate-400 font-mono text-xs">#{u.id}</td>
                      <td className="py-3 px-4 font-black text-slate-800">
                        {u.profile?.fullName || "Chưa đặt tên"}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs">{u.email}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedUserId(u.id)}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-extrabold text-xs rounded-xl border border-amber-200 transition-colors cursor-pointer"
                        >
                          Chọn điều chỉnh
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 font-bold">
              Chưa có học viên nào trong hệ thống.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
