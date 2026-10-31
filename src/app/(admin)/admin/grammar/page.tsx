"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, Lock, Plus, Search, Send, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import {
  GRAMMAR_LEVELS,
  grammarLevelLabel,
} from "@/components/admin/grammar/grammarCms";
import { Pagination } from "@/components/ui";
import { useAdminList } from "@/components/admin/useAdminList";
import { ADMIN_PAGE_SIZES } from "@/components/admin/adminList";

type TopicSummary = {
  id: number;
  title: string;
  description?: string | null;
  level?: string | null;
  keyFormula?: string | null;
  totalQuestions?: number;
  /** Attempts by learners; content is locked once there is one. */
  learnerAttemptCount?: number;
  publicationStatus: "DRAFT" | "PUBLISHED";
};

const SELECT =
  "min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200";
const ICON_BTN =
  "inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

export default function AdminGrammarPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("ALL");
  const [status, setStatus] = useState<"ALL" | "DRAFT" | "PUBLISHED">("ALL");
  const [sort, setSort] = useState<"NEWEST" | "TITLE" | "LEVEL" | "FEWEST">(
    "NEWEST",
  );
  const [pendingDelete, setPendingDelete] = useState<TopicSummary | null>(null);
  const [pendingLifecycle, setPendingLifecycle] =
    useState<TopicSummary | null>(null);

  // One page from the server; search, filters and sort run there too.
  const list = useAdminList<
    TopicSummary,
    { total: number; published: number; locked: number }
  >({
    key: "admin-grammar-topics",
    url: "/admin/grammar/topics",
    search: query,
    filters: { level, status, sort },
  });
  const visible = list.items;
  const isLoading = list.isLoading;
  const totalTopics = list.facets?.total ?? 0;
  const published = list.facets?.published ?? 0;
  const filtersActive = Boolean(query.trim()) || level !== "ALL" || status !== "ALL";
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-grammar-topics"] });

  return (
    <main className="space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Ngữ pháp</h1>
          <p className="mt-1 text-sm tabular-nums text-slate-600">
            {totalTopics} chủ đề · {published} đã xuất bản ·{" "}
            {totalTopics - published} bản nháp
            {list.facets?.locked ? ` · ${list.facets.locked} đã có học viên làm` : ""}
          </p>
        </div>
        <Link
          href="/admin/grammar/new"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <Plus size={16} /> Tạo chủ đề
        </Link>
      </header>

      <div className="space-y-3">
        <label className="relative block">
          <span className="sr-only">Tìm chủ đề</span>
          <Search
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên, lý thuyết, công thức..."
            className="min-h-11 w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </label>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Trình độ
            <select value={level} onChange={(e) => setLevel(e.target.value)} className={SELECT}>
              <option value="ALL">Tất cả</option>
              {GRAMMAR_LEVELS.map((value) => (
                <option key={value.value} value={value.value}>
                  {value.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Trạng thái
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className={SELECT}
            >
              <option value="ALL">Tất cả</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="PUBLISHED">Đã xuất bản</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Sắp xếp
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={SELECT}>
              <option value="NEWEST">Mới tạo trước</option>
              <option value="LEVEL">Trình độ thấp → cao</option>
              <option value="TITLE">Tên A → Z</option>
              <option value="FEWEST">Ít câu hỏi trước</option>
            </select>
          </label>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-600">
            <span className="tabular-nums">
              {list.total === totalTopics
                ? `${list.total} chủ đề`
                : `Khớp ${list.total}/${totalTopics}`}
              {list.isFetching && !isLoading ? " · đang tải" : ""}
            </span>
            {filtersActive && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setLevel("ALL");
                  setStatus("ALL");
                }}
                className="cursor-pointer font-semibold text-slate-900 underline-offset-4 hover:underline"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      ) : (
        // Cards fill the canvas in 320px-minimum columns with one 16px gutter.
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-4">
          {visible.map((topic) => {
            const isPublished = topic.publicationStatus === "PUBLISHED";
            return (
              <article
                key={topic.id}
                className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300"
              >
                <div className="flex items-center gap-2">
                  {topic.level && (
                    <span className="flex-none rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-blue-800">
                      {grammarLevelLabel(topic.level)}
                    </span>
                  )}
                  {topic.keyFormula && (
                    <span className="truncate text-xs text-slate-500">
                      {topic.keyFormula}
                    </span>
                  )}
                  <span
                    className={`ml-auto flex-none whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ${
                      isPublished
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {isPublished ? "Đã xuất bản" : "Bản nháp"}
                  </span>
                </div>
                <h2 className="mt-3 line-clamp-2 font-semibold text-slate-950">
                  <Link href={`/admin/grammar/${topic.id}`} className="hover:text-blue-700">
                    {topic.title}
                  </Link>
                </h2>
                {topic.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                    {topic.description}
                  </p>
                )}
                <div className="mt-auto pt-4">
                  <div className="flex items-center gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      {topic.totalQuestions ?? 0} câu hỏi
                      {topic.learnerAttemptCount ? (
                        <span
                          className="inline-flex items-center gap-1 text-amber-800"
                          title="Đã có học viên làm: đề bài, phương án và đáp án đã khoá"
                        >
                          · <Lock size={13} aria-hidden="true" />
                          {topic.learnerAttemptCount} lượt học viên
                        </span>
                      ) : null}
                    </span>
                    <div className="ml-auto flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPendingLifecycle(topic)}
                        aria-label={`${isPublished ? "Chuyển về bản nháp" : "Xuất bản"} ${topic.title}`}
                        title={isPublished ? "Chuyển về bản nháp" : "Xuất bản"}
                        className={ICON_BTN}
                      >
                        <Send size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(topic)}
                        aria-label={`Xóa ${topic.title}`}
                        title="Xóa chủ đề"
                        className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={15} />
                      </button>
                      <Link
                        href={`/admin/grammar/${topic.id}`}
                        className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 font-semibold text-slate-900 hover:text-blue-700"
                      >
                        Mở <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
          {!visible.length && (
            <p className="col-span-full rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-600">
              {totalTopics
                ? "Không có chủ đề nào khớp bộ lọc."
                : "Chưa có chủ đề nào. Bấm “Tạo chủ đề” để bắt đầu."}
            </p>
          )}
        </div>
      )}

      <Pagination
        currentPage={list.page}
        totalPages={list.totalPages}
        totalItems={list.total}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        pageSizeOptions={ADMIN_PAGE_SIZES}
        alwaysShow
      />

      {pendingLifecycle && (
        <ConfirmDialog
          open={true}
          title={
            pendingLifecycle.publicationStatus === "PUBLISHED"
              ? "Chuyển chủ đề về bản nháp?"
              : "Xuất bản chủ đề?"
          }
          description={
            pendingLifecycle.publicationStatus === "PUBLISHED"
              ? "Học viên sẽ không thấy chủ đề này cho đến khi xuất bản lại."
              : "Chủ đề sẽ hiện trong mục Ngữ pháp của học viên."
          }
          confirmLabel={
            pendingLifecycle.publicationStatus === "PUBLISHED"
              ? "Chuyển về bản nháp"
              : "Xuất bản"
          }
          onConfirm={async () => {
            const topic = pendingLifecycle;
            setPendingLifecycle(null);
            try {
              await axiosClient.post(
                `/grammar/topics/${topic.id}/${topic.publicationStatus === "PUBLISHED" ? "unpublish" : "publish"}`,
              );
              toast.success("Đã cập nhật trạng thái.");
              refresh();
            } catch (err: any) {
              toast.error(getApiErrorMessage(err, "Không thể đổi trạng thái."));
            }
          }}
          onCancel={() => setPendingLifecycle(null)}
        />
      )}
      {pendingDelete && (
        <ConfirmDialog
          open={true}
          title="Xóa chủ đề"
          description={`Xóa chủ đề "${pendingDelete.title}" và mọi câu hỏi bên trong?`}
          confirmLabel="Xóa"
          onConfirm={async () => {
            const topic = pendingDelete;
            setPendingDelete(null);
            try {
              await axiosClient.delete(`/grammar/topics/${topic.id}`);
              toast.success("Đã xóa chủ đề.");
              refresh();
            } catch (err: any) {
              toast.error(getApiErrorMessage(err, "Không thể xóa chủ đề."));
            }
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </main>
  );
}
