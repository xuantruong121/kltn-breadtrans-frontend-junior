"use client";

import React, { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { Pagination } from "@/components/ui";
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
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Sổ Bánh Mì</h1>
        <p className="mt-1 text-sm text-slate-500">
          Số dư, lịch sử giao dịch và điều chỉnh Bánh Mì của học viên
        </p>
      </div>

      <div className="flex items-center gap-6 border-b border-slate-200">
        {(
          [
            { id: "ledger", label: "Số dư & Lịch sử" },
            { id: "adjust", label: "Điều chỉnh" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`-mb-px border-b-2 px-1 py-3 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === tab.id
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
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
      {/* SUMMARY — one container split by dividers, no icon chips */}
      <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0 rounded-lg border border-slate-200 bg-white">
        <SummaryCell
          label="Tổng đang lưu hành"
          value={summary?.totalCurrentBalance}
          loading={isSummaryLoading}
        />
        <SummaryCell
          label="Tổng đã phát hành"
          value={summary?.totalIssued}
          loading={isSummaryLoading}
        />
        <SummaryCell
          label="Tổng đã sử dụng"
          value={summary?.totalSpent}
          loading={isSummaryLoading}
        />
      </div>

      {/* LEARNER BALANCE TABLE */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-medium text-slate-900">Học viên</h2>
        </div>
        {isReconciliationLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-slate-400" size={24} />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            Chưa có học viên nào.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-slate-400">
                  <th className="py-2.5 px-5 font-normal">Học viên</th>
                  <th className="py-2.5 px-5 font-normal text-right">Số dư hiện tại</th>
                  <th className="py-2.5 px-5 font-normal">Trạng thái đối soát</th>
                  <th className="py-2.5 px-5 font-normal">Giao dịch gần nhất</th>
                  <th className="py-2.5 px-5 font-normal text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <React.Fragment key={row.userId}>
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-5 font-medium text-slate-900">
                        {row.displayName}
                      </td>
                      <td className="py-3 px-5 text-right font-medium tabular-nums text-slate-900">
                        {row.storedBalance}
                      </td>
                      <td className="py-3 px-5">
                        {row.status === "CONSISTENT" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            <CheckCircle2 size={12} /> Khớp
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                            <AlertTriangle size={12} /> Chênh lệch
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-xs text-slate-400">
                        {formatDateTime(row.lastTransactionAt)}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <button
                          onClick={() =>
                            setExpandedUserId(
                              expandedUserId === row.userId ? null : row.userId,
                            )
                          }
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
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
                        <td colSpan={5} className="bg-slate-50 px-5 py-4">
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
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-medium text-slate-900">Toàn bộ giao dịch</h2>
        </div>

        <div className="grid grid-cols-2 gap-2 px-5 pt-4 sm:grid-cols-5">
          <select
            value={filterUserId}
            onChange={(e) => {
              setFilterUserId(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-slate-400"
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
            className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-slate-400"
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
            className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-slate-400"
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
            className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-slate-400"
          />
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => {
              setFilterDateTo(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-slate-400"
          />
        </div>

        <div className="p-5">
          {isLedgerLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-slate-400" size={24} />
            </div>
          ) : entries.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              Không có giao dịch nào phù hợp bộ lọc.
            </div>
          ) : (
            <>
              <LedgerTable entries={entries} showUser />
              <div className="pt-4">
                <Pagination
                  currentPage={page}
                  totalPages={ledger?.totalPages || 1}
                  totalItems={ledger?.total}
                  pageSize={pageSize}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCell({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
}) {
  return (
    <div className="p-5">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
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
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-slate-400">
            <th className="py-2 pr-3 font-normal">Thời gian</th>
            {showUser && <th className="py-2 pr-3 font-normal">Học viên</th>}
            <th className="py-2 pr-3 font-normal text-right">Biến động</th>
            <th className="py-2 pr-3 font-normal">Nguồn</th>
            <th className="py-2 pr-3 font-normal text-right">Số dư sau</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((tx) => (
            <tr key={tx.id} className="hover:bg-slate-50">
              <td className="py-2.5 pr-3 text-xs text-slate-400 whitespace-nowrap">
                {formatDateTime(tx.createdAt)}
              </td>
              {showUser && (
                <td className="py-2.5 pr-3 font-medium text-slate-700">
                  {tx.user?.profile?.fullName || `Học viên #${tx.userId}`}
                </td>
              )}
              <td
                className={`py-2.5 pr-3 text-right tabular-nums font-medium ${
                  tx.amount >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}
              </td>
              <td className="py-2.5 pr-3 text-xs text-slate-600">
                {sourceLabel(tx.source)}
              </td>
              <td className="py-2.5 pr-3 text-right tabular-nums text-xs font-medium text-slate-700">
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
        <Loader2 className="animate-spin text-slate-400" size={20} />
      </div>
    );
  }

  const entries: LedgerEntry[] = data?.transactions || [];
  if (entries.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-slate-400">
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* FORM ADJUSTMENT (LEFT 1/3) */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="text-base font-medium text-slate-900">Điều chỉnh Bánh Mì</h2>

        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Học viên
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(Number(e.target.value) || "")}
              className="w-full rounded-md border border-slate-200 p-2.5 text-sm text-slate-800 outline-none focus:border-slate-400"
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
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Loại thao tác
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActionType("add")}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  actionType === "add"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Cộng Bánh Mì
              </button>
              <button
                type="button"
                onClick={() => setActionType("subtract")}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  actionType === "subtract"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Trừ Bánh Mì
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Số lượng Bánh Mì
            </label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full rounded-md border border-slate-200 p-2.5 text-sm font-medium tabular-nums text-slate-900 outline-none focus:border-slate-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Lý do
            </label>
            <textarea
              rows={3}
              placeholder="VD: Thưởng hoàn thành xuất sắc thử thách tuần..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-md border border-slate-200 p-2.5 text-sm text-slate-800 outline-none focus:border-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={adjustMutation.isPending}
            className="w-full rounded-md bg-slate-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
          >
            {adjustMutation.isPending ? "Đang xử lý..." : "Xác nhận thực hiện"}
          </button>
        </form>
      </div>

      {/* USERS LIST (RIGHT 2/3) */}
      <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-medium text-slate-900">Danh sách học viên</h2>
        </div>

        {isUsersLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-slate-400" size={28} />
          </div>
        ) : users && users.length > 0 ? (
          <div>
            {(() => {
              const totalPages = Math.ceil((users?.length || 0) / pageSize);
              const paginatedUsers = users?.slice(
                (currentPage - 1) * pageSize,
                currentPage * pageSize,
              );

              return (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-xs text-slate-400">
                          <th className="py-2.5 px-5 font-normal">Họ và tên</th>
                          <th className="py-2.5 px-5 font-normal">Email</th>
                          <th className="py-2.5 px-5 font-normal text-right">
                            Số dư Bánh Mì
                          </th>
                          <th className="py-2.5 px-5 font-normal text-right">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50">
                            <td className="py-3 px-5 font-medium text-slate-900">
                              {u.profile?.fullName || "Chưa đặt tên"}
                            </td>
                            <td className="py-3 px-5 text-xs text-slate-500">
                              {u.email}
                            </td>
                            <td className="py-3 px-5 text-right font-medium tabular-nums text-slate-900">
                              {u.stats?.totalBanhRan ?? 0}
                            </td>
                            <td className="py-3 px-5 text-right">
                              <button
                                onClick={() => setSelectedUserId(u.id)}
                                className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                              >
                                Chọn điều chỉnh
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="px-5 pb-4 pt-2">
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
          <div className="py-12 text-center text-sm text-slate-400">
            Chưa có học viên nào trong hệ thống.
          </div>
        )}
      </div>
    </div>
  );
}
