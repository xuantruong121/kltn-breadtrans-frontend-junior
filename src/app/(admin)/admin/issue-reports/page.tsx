"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  Search,
  XCircle,
} from "lucide-react";
import {
  issueReportService,
  type IssueReportItem,
  type IssueReportStatus,
} from "@/lib/api/services/issue-report.service";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import toast from "react-hot-toast";

const statusLabels: Record<IssueReportStatus, string> = {
  NEW: "Mới",
  IN_REVIEW: "Đang xử lý",
  RESOLVED: "Đã xử lý",
  REJECTED: "Từ chối",
  DUPLICATE: "Trùng lặp",
};
const areaLabels: Record<string, string> = {
  LISTENING: "Luyện nghe",
  SPEAKING: "Luyện nói",
  READING: "Luyện đọc",
  WRITING: "Luyện viết",
  VOCABULARY: "Từ vựng",
  GRAMMAR: "Ngữ pháp",
  TOEIC: "TOEIC",
  OTHER: "Khác",
};

export default function IssueReportsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<IssueReportStatus | "">("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<IssueReportItem | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const query = useQuery({
    queryKey: ["admin-issue-reports", status, search],
    queryFn: () =>
      issueReportService.list({
        status: status || undefined,
        search: search || undefined,
      }),
  });
  const update = useMutation({
    mutationFn: (input: {
      id: number;
      status: IssueReportStatus;
      resolutionNote: string;
    }) =>
      issueReportService.update(input.id, {
        status: input.status,
        resolutionNote: input.resolutionNote,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-issue-reports"] });
      setSelected(null);
      setResolutionNote("");
      toast.success("Đã cập nhật báo lỗi.");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Không thể cập nhật báo lỗi.")),
  });
  const items = query.data?.data ?? [];

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-rose-600">
            Vận hành
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Báo cáo lỗi
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tiếp nhận và xử lý phản hồi từ học viên.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Mới:{" "}
          <strong className="text-slate-900">
            {query.data?.counts?.NEW ?? 0}
          </strong>
        </div>
      </header>
      <section className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <label className="relative min-w-[260px] flex-1">
          <span className="sr-only">Tìm báo cáo</span>
          <Search
            className="absolute left-3 top-3.5 text-slate-400"
            size={18}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã hoặc mô tả..."
            className="min-h-11 w-full rounded-xl border border-slate-300 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as IssueReportStatus | "")}
          className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </section>
      {query.isError && (
        <div
          role="alert"
          className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          Không tải được danh sách báo lỗi. Vui lòng thử lại.
        </div>
      )}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Mã</th>
                <th className="px-4 py-3">Khu vực</th>
                <th className="px-4 py-3">Mô tả</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thời gian</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {query.isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    <Loader2 className="mx-auto animate-spin" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    Chưa có báo lỗi phù hợp.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {item.reportCode}
                    </td>
                    <td className="px-4 py-3">
                      {areaLabels[item.area] ?? item.area}
                    </td>
                    <td className="max-w-[360px] truncate px-4 py-3 text-slate-600">
                      {item.description}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {statusLabels[item.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(item.createdAt).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(item);
                          setResolutionNote(item.resolutionNote ?? "");
                        }}
                        className="inline-flex min-h-10 items-center gap-1 rounded-lg px-3 font-semibold text-blue-600 hover:bg-blue-50"
                      >
                        Xem <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-detail-title"
            className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-rose-600">
                  {selected.reportCode}
                </p>
                <h2
                  id="report-detail-title"
                  className="mt-1 text-xl font-bold text-slate-900"
                >
                  {areaLabels[selected.area] ?? selected.area}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Đóng chi tiết"
                className="grid min-h-11 min-w-11 place-items-center rounded-xl hover:bg-slate-100"
              >
                <XCircle size={20} />
              </button>
            </div>
            <dl className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm">
              <div>
                <dt className="font-semibold text-slate-500">Phân loại</dt>
                <dd className="text-slate-900">{selected.category}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Mức độ</dt>
                <dd className="text-slate-900">
                  {selected.impact === "BLOCKING"
                    ? "Không thể tiếp tục"
                    : "Không cản trở việc học"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Mô tả</dt>
                <dd className="whitespace-pre-wrap text-slate-900">
                  {selected.description}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Người gửi</dt>
                <dd className="text-slate-900">
                  {selected.reporter?.profile?.fullName ??
                    selected.reporter?.email ??
                    "Không rõ"}
                </dd>
              </div>
            </dl>
            <label className="mt-5 block text-sm font-semibold text-slate-800">
              Ghi chú xử lý
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                rows={4}
                className="mt-1.5 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Ghi lại cách đã xử lý hoặc lý do từ chối..."
              />
            </label>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={update.isPending}
                onClick={() =>
                  update.mutate({
                    id: selected.id,
                    status: "IN_REVIEW",
                    resolutionNote,
                  })
                }
                className="min-h-11 rounded-xl border border-blue-200 px-4 font-semibold text-blue-700 hover:bg-blue-50"
              >
                Đang xử lý
              </button>
              <button
                type="button"
                disabled={update.isPending || resolutionNote.trim().length < 5}
                onClick={() =>
                  update.mutate({
                    id: selected.id,
                    status: "RESOLVED",
                    resolutionNote,
                  })
                }
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 size={17} />
                Đã xử lý
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
