"use client";

import React, { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Coins,
  PlusCircle,
  MinusCircle,
  Users,
  Loader2,
  History,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { Button3D, Pagination } from "@/components/ui";
import toast from "react-hot-toast";

type ReconciliationRow = {
  userId: number;
  displayName: string;
  storedBalance: number;
  ledgerBalance: number;
  delta: number;
  status: "CONSISTENT" | "DRIFT_POSITIVE" | "DRIFT_NEGATIVE";
  lastTransactionAt: string | null;
};

type LedgerEntry = {
  id: number;
  userId: number;
  amount: number;
  source: string;
  reference: string | null;
  dateKey: string;
  balanceAfter: number;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
  user?: { id: number; profile?: { fullName?: string } | null };
};

const SOURCE_LABELS: Record<string, string> = {
  VOCAB_MASTERY: "Học từ vựng",
  QUIZ_FIRST_COMPLETION: "Hoàn thành Quiz (lần đầu)",
  TOEIC_COMPLETION: "Hoàn thành TOEIC",
  SPEAKING_SUBMISSION: "Luyện nói",
  GRAMMAR_COMPLETION: "Hoàn thành Ngữ pháp",
  CONTENT_COMPLETION: "Hoàn thành nội dung",
  DIAGNOSTIC_COMPLETION: "Bài kiểm tra đầu vào",
  DAILY_QUEST: "Nhiệm vụ hàng ngày",
  PET_FEED: "Cho thú cưng ăn",
  MARKET_PURCHASE: "Đổi quà",
  MARKET_REFUND: "Hoàn tiền đổi quà",
  ADMIN_ADJUSTMENT: "Admin điều chỉnh",
  ARENA_WIN: "Thắng Arena",
  ARENA_STAKE: "Đặt cược Arena",
  ARENA_REFUND: "Hoàn cược Arena",
  LEGACY_RECONCILIATION: "Đối soát dữ liệu cũ",
  SEED_FIXTURE: "Dữ liệu khởi tạo",
};

function sourceLabel(source: string) {
  return SOURCE_LABELS[source] || source;
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminCurrencyPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"ledger" | "adjust">("ledger");

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="bg-amber-500 p-3.5 rounded-2xl text-white shadow-sm">
          <Coins size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800">Sổ Bánh Mì</h1>
          <p className="text-slate-400 font-bold text-sm">
            Số dư, lịch sử giao dịch và điều chỉnh Bánh Mì của học viên
          </p>
        </div>
      </div>

      <div className="inline-flex items-center gap-2 bg-white p-1.5 rounded-2xl border-2 border-slate-200">
        <button
          onClick={() => setActiveTab("ledger")}
          className={`px-4 py-2 rounded-xl font-black text-sm transition-colors cursor-pointer ${
            activeTab === "ledger"
              ? "bg-amber-500 text-white shadow-xs"
              : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          Số dư & Lịch sử
        </button>
        <button
          onClick={() => setActiveTab("adjust")}
          className={`px-4 py-2 rounded-xl font-black text-sm transition-colors cursor-pointer ${
            activeTab === "adjust"
              ? "bg-amber-500 text-white shadow-xs"
              : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          Điều chỉnh
        </button>
      </div>

      {activeTab === "ledger" ? (
        <LedgerTab />
      ) : (
        <AdjustTab
          onAdjusted={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-ledger-summary"] });
            queryClient.invalidateQueries({ queryKey: ["admin-reconciliation"] });
            queryClient.invalidateQueries({ queryKey: ["admin-ledger-list"] });
            queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
          }}
        />
      )}
    </div>
  );
}

function LedgerTab() {
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [filterUserId, setFilterUserId] = useState<string>("");
  const [filterDirection, setFilterDirection] = useState<string>("");
  const [filterSource, setFilterSource] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["admin-ledger-summary"],
    queryFn: async () => {
      const res: any = await axiosClient.get("/market/ledger/summary");
      return res?.data ?? res;
    },
  });

  const { data: reconciliation, isLoading: isReconciliationLoading } = useQuery({
    queryKey: ["admin-reconciliation"],
    queryFn: async () => {
      const res: any = await axiosClient.get("/market/reconciliation");
      return res?.data ?? res;
    },
  });

  const { data: ledger, isLoading: isLedgerLoading } = useQuery({
    queryKey: [
      "admin-ledger-list",
      filterUserId,
      filterDirection,
      filterSource,
      filterDateFrom,
      filterDateTo,
      page,
    ],
    queryFn: async () => {
      const res: any = await axiosClient.get("/market/ledger", {
        params: {
          userId: filterUserId || undefined,
          direction: filterDirection || undefined,
          source: filterSource || undefined,
          dateFrom: filterDateFrom || undefined,
          dateTo: filterDateTo || undefined,
          page,
          limit: pageSize,
        },
      });
      return res?.data ?? res;
    },
  });

  const rows: ReconciliationRow[] = reconciliation?.rows || [];
  const entries: LedgerEntry[] = ledger?.data || [];

  return (
    <div className="space-y-6">
      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Tổng đang lưu hành"
          value={summary?.totalCurrentBalance}
          loading={isSummaryLoading}
          tone="amber"
        />
        <SummaryCard
          label="Tổng đã phát hành"
          value={summary?.totalIssued}
          loading={isSummaryLoading}
          tone="emerald"
        />
        <SummaryCard
          label="Tổng đã sử dụng"
          value={summary?.totalSpent}
          loading={isSummaryLoading}
          tone="rose"
        />
      </div>

      {/* LEARNER BALANCE TABLE */}
      <div className="bg-white rounded-[2rem] border-2 border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
          <Users className="text-sky-500" size={20} /> Học viên
        </h2>
        {isReconciliationLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-amber-500" size={32} />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 text-slate-400 font-bold text-sm">
            Chưa có học viên nào.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-slate-100 text-slate-400 font-black text-xs uppercase">
                  <th className="py-2.5 px-3">Học viên</th>
                  <th className="py-2.5 px-3 text-center">Số dư hiện tại</th>
                  <th className="py-2.5 px-3 text-center">Trạng thái đối soát</th>
                  <th className="py-2.5 px-3">Giao dịch gần nhất</th>
                  <th className="py-2.5 px-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <React.Fragment key={row.userId}>
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 font-black text-slate-800">
                        {row.displayName}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 bg-amber-100/90 text-amber-800 px-2.5 py-1 rounded-xl text-xs font-black border border-amber-300">
                          <Coins size={12} /> {row.storedBalance}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {row.status === "CONSISTENT" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-200">
                            <CheckCircle2 size={12} /> Khớp
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full border bg-rose-100 text-rose-800 border-rose-200">
                            <AlertTriangle size={12} /> Chênh lệch
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-400">
                        {formatDateTime(row.lastTransactionAt)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() =>
                            setExpandedUserId(
                              expandedUserId === row.userId ? null : row.userId,
                            )
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 font-extrabold text-xs rounded-xl border border-sky-200 transition-colors cursor-pointer"
                        >
                          <History size={13} />
                          Xem lịch sử
                          {expandedUserId === row.userId ? (
                            <ChevronUp size={13} />
                          ) : (
                            <ChevronDown size={13} />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedUserId === row.userId && (
                      <tr>
                        <td colSpan={5} className="bg-slate-50 px-3 py-4">
                          <UserLedgerHistory userId={row.userId} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* LEDGER LIST + FILTERS */}
      <div className="bg-white rounded-[2rem] border-2 border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
          <SlidersHorizontal className="text-amber-500" size={20} /> Toàn bộ giao dịch
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <select
            value={filterUserId}
            onChange={(e) => {
              setFilterUserId(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border-2 border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold outline-none"
          >
            <option value="">Tất cả học viên</option>
            {rows.map((r) => (
              <option key={r.userId} value={r.userId}>
                {r.displayName}
              </option>
            ))}
          </select>
          <select
            value={filterDirection}
            onChange={(e) => {
              setFilterDirection(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border-2 border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold outline-none"
          >
            <option value="">Tăng & Giảm</option>
            <option value="earning">Chỉ tăng</option>
            <option value="spending">Chỉ giảm</option>
          </select>
          <select
            value={filterSource}
            onChange={(e) => {
              setFilterSource(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border-2 border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold outline-none"
          >
            <option value="">Mọi nguồn</option>
            {Object.keys(SOURCE_LABELS).map((s) => (
              <option key={s} value={s}>
                {sourceLabel(s)}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => {
              setFilterDateFrom(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border-2 border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold outline-none"
          />
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => {
              setFilterDateTo(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border-2 border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold outline-none"
          />
        </div>

        {isLedgerLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-amber-500" size={32} />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-slate-400 font-bold text-sm">
            Không có giao dịch nào phù hợp bộ lọc.
          </div>
        ) : (
          <>
            <LedgerTable entries={entries} showUser />
            <Pagination
              currentPage={page}
              totalPages={ledger?.totalPages || 1}
              totalItems={ledger?.total}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  loading,
  tone,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
  tone: "amber" | "emerald" | "rose";
}) {
  const toneClass = {
    amber: "text-amber-600",
    emerald: "text-emerald-600",
    rose: "text-rose-600",
  }[tone];
  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 p-5">
      <p className="text-xs font-black text-slate-400 uppercase">{label}</p>
      <p className={`text-3xl font-black mt-1 ${toneClass}`}>
        {loading ? "…" : (value ?? 0).toLocaleString("vi-VN")}
      </p>
    </div>
  );
}

function LedgerTable({
  entries,
  showUser,
}: {
  entries: LedgerEntry[];
  showUser?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-slate-100 text-slate-400 font-black text-xs uppercase">
            <th className="py-2 px-3">Thời gian</th>
            {showUser && <th className="py-2 px-3">Học viên</th>}
            <th className="py-2 px-3 text-center">Biến động</th>
            <th className="py-2 px-3">Nguồn</th>
            <th className="py-2 px-3 text-center">Số dư sau</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((tx) => (
            <tr key={tx.id} className="hover:bg-slate-50/60">
              <td className="py-2.5 px-3 text-xs text-slate-400 whitespace-nowrap">
                {formatDateTime(tx.createdAt)}
              </td>
              {showUser && (
                <td className="py-2.5 px-3 font-bold text-slate-700">
                  {tx.user?.profile?.fullName || `Học viên #${tx.userId}`}
                </td>
              )}
              <td className="py-2.5 px-3 text-center">
                <span
                  className={`inline-flex items-center gap-1 font-black text-xs ${
                    tx.amount >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {tx.amount >= 0 ? (
                    <ArrowUpCircle size={13} />
                  ) : (
                    <ArrowDownCircle size={13} />
                  )}
                  {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}
                </span>
              </td>
              <td className="py-2.5 px-3 text-xs font-bold text-slate-600">
                {sourceLabel(tx.source)}
              </td>
              <td className="py-2.5 px-3 text-center text-xs font-black text-slate-700">
                {tx.balanceAfter}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserLedgerHistory({ userId }: { userId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-ledger-user-history", userId],
    queryFn: async () => {
      const res: any = await axiosClient.get(`/market/ledger/user/${userId}`);
      return res?.data ?? res;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="animate-spin text-amber-500" size={24} />
      </div>
    );
  }

  const entries: LedgerEntry[] = data?.transactions || [];
  if (entries.length === 0) {
    return (
      <p className="text-center text-xs text-slate-400 font-bold py-4">
        Học viên này chưa có giao dịch Bánh Mì nào.
      </p>
    );
  }

  return <LedgerTable entries={entries} />;
}

function AdjustTab({ onAdjusted }: { onAdjusted: () => void }) {
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");
  const [amount, setAmount] = useState<number>(50);
  const [reason, setReason] = useState<string>("");
  const [actionType, setActionType] = useState<"add" | "subtract">("add");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // One stable operation id per form "session" — reused across retries of
  // the same submit attempt, regenerated after a successful adjustment so
  // the next distinct adjustment is never silently deduped by the backend.
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  const { data: users, isLoading: isUsersLoading } = useQuery<any[]>({
    queryKey: ["admin-users-list"],
    queryFn: async () => {
      const res: any = await axiosClient.get("/admin/users?role=STUDENT");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async (payload: {
      userId: number;
      amount: number;
      reason: string;
      idempotencyKey: string;
    }) => {
      return axiosClient.post("/market/currency/adjust", payload);
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Đã điều chỉnh Bánh Mì thành công!");
      setReason("");
      setSelectedUserId("");
      idempotencyKeyRef.current = crypto.randomUUID();
      onAdjusted();
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

    const finalAmount =
      actionType === "add" ? Math.abs(amount) : -Math.abs(amount);
    adjustMutation.mutate({
      userId: Number(selectedUserId),
      amount: finalAmount,
      reason: reason.trim(),
      idempotencyKey: idempotencyKeyRef.current,
    });
  };

  return (
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
                  {u.profile?.fullName || u.email} (Hiện có:{" "}
                  {u.stats?.totalBanhRan ?? 0} Bánh Mì)
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
          <div className="space-y-4">
            {(() => {
              const totalPages = Math.ceil((users?.length || 0) / pageSize);
              const paginatedUsers = users?.slice(
                (currentPage - 1) * pageSize,
                currentPage * pageSize,
              );

              return (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-100 bg-slate-50 text-slate-400 font-black text-xs uppercase">
                          <th className="py-3 px-4">Họ và Tên</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4 text-center">
                            Số Dư Bánh Mì
                          </th>
                          <th className="py-3 px-4 text-right">Hành Động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-sm">
                        {paginatedUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/80">
                            <td className="py-3 px-4 font-black text-slate-800">
                              {u.profile?.fullName || "Chưa đặt tên"}
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-xs">
                              {u.email}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center gap-1 bg-amber-100/90 text-amber-800 px-2.5 py-1 rounded-xl text-xs font-black border border-amber-300">
                                <Coins size={12} aria-hidden="true" />{" "}
                                {u.stats?.totalBanhRan ?? 0}
                              </span>
                            </td>
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

                  <div className="pt-2">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={users?.length || 0}
                      pageSize={pageSize}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={(size) => {
                        setPageSize(size);
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                </>
              );
            })()}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400 font-bold">
            Chưa có học viên nào trong hệ thống.
          </div>
        )}
      </div>
    </div>
  );
}
