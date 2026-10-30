"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, Plus, Search, Send, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { VOCAB_LEVELS } from "@/components/admin/vocab/vocabCms";

type DeckSummary = {
  id: number;
  title: string;
  description?: string | null;
  level?: string | null;
  categoryName: string;
  totalWords: number;
  publicationStatus: "DRAFT" | "PUBLISHED";
  updatedAt?: string;
  _count?: { words?: number };
};

const SELECT =
  "min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200";
const ICON_BTN =
  "inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

const wordCount = (deck: DeckSummary) => deck._count?.words ?? deck.totalWords ?? 0;

export default function AdminVocabPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [level, setLevel] = useState("ALL");
  const [status, setStatus] = useState<"ALL" | "DRAFT" | "PUBLISHED">("ALL");
  const [sort, setSort] = useState<"NEWEST" | "TITLE" | "LEVEL" | "FEWEST">(
    "NEWEST",
  );
  const [pendingDelete, setPendingDelete] = useState<DeckSummary | null>(null);
  const [pendingLifecycle, setPendingLifecycle] = useState<DeckSummary | null>(
    null,
  );

  const { data: allTopics = [], isLoading } = useQuery<DeckSummary[]>({
    queryKey: ["admin-vocab-topics"],
    queryFn: async () => {
      const res: any = await axiosClient.get("/admin/vocab/topics");
      return (res?.data ?? res) || [];
    },
  });
  // The Speaking lookup dictionary is stored as a topic but is not a deck.
  const systemDictionaries = allTopics.filter(
    (deck) => deck.categoryName === "SYSTEM_DICTIONARY",
  );
  const decks = allTopics.filter(
    (deck) => deck.categoryName !== "SYSTEM_DICTIONARY",
  );
  const categories = [...new Set(decks.map((deck) => deck.categoryName))].sort();
  const published = decks.filter((d) => d.publicationStatus === "PUBLISHED").length;
  const levelRank = (d: DeckSummary) => {
    const i = (VOCAB_LEVELS as readonly string[]).indexOf(d.level ?? "");
    return i < 0 ? 99 : i;
  };
  const needle = query.trim().toLocaleLowerCase("vi");
  const visible = decks
    .filter(
      (deck) =>
        (!needle ||
          `${deck.title} ${deck.description ?? ""} ${deck.categoryName}`
            .toLocaleLowerCase("vi")
            .includes(needle)) &&
        (category === "ALL" || deck.categoryName === category) &&
        (level === "ALL" || (deck.level ?? "") === (level === "NONE" ? "" : level)) &&
        (status === "ALL" || deck.publicationStatus === status),
    )
    .sort((a, b) =>
      sort === "TITLE"
        ? a.title.localeCompare(b.title, "vi")
        : sort === "LEVEL"
          ? levelRank(a) - levelRank(b)
          : sort === "FEWEST"
            ? wordCount(a) - wordCount(b)
            : b.id - a.id,
    );
  const filtersActive =
    Boolean(needle) || category !== "ALL" || level !== "ALL" || status !== "ALL";
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-vocab-topics"] });

  return (
    <main className="space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Từ vựng & Flashcard</h1>
          <p className="mt-1 text-sm tabular-nums text-slate-600">
            {decks.length} bộ · {published} đã xuất bản · {decks.length - published} bản nháp
          </p>
        </div>
        <Link
          href="/admin/vocab/new"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <Plus size={16} /> Tạo bộ từ
        </Link>
      </header>

      <div className="space-y-3">
        <label className="relative block">
          <span className="sr-only">Tìm bộ từ</span>
          <Search
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên, mô tả, chuyên mục..."
            className="min-h-11 w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </label>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Chuyên mục
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={SELECT}>
              <option value="ALL">Tất cả</option>
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Trình độ
            <select value={level} onChange={(e) => setLevel(e.target.value)} className={SELECT}>
              <option value="ALL">Tất cả</option>
              {VOCAB_LEVELS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
              <option value="NONE">Chưa gắn</option>
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
              <option value="LEVEL">Trình độ A1 → C2</option>
              <option value="TITLE">Tên A → Z</option>
              <option value="FEWEST">Ít từ trước</option>
            </select>
          </label>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-600">
            <span className="tabular-nums">
              Hiện {visible.length}/{decks.length}
            </span>
            {filtersActive && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory("ALL");
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

      {systemDictionaries.map((dictionary) => (
        <p
          key={dictionary.id}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
        >
          <span className="font-semibold text-slate-900">{dictionary.title}</span>
          <span className="tabular-nums">{wordCount(dictionary)} mục</span>
          <span className="text-slate-600">
            Từ điển tra từ trong đề luyện Nói, không phải bộ flashcard.
          </span>
          <Link
            href={`/admin/vocab/${dictionary.id}`}
            className="ml-auto inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-blue-700"
          >
            Mở <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </p>
      ))}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      ) : (
        // Cards fill the canvas in 320px-minimum columns with one 16px gutter.
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-4">
          {visible.map((deck) => {
            const isPublished = deck.publicationStatus === "PUBLISHED";
            return (
              <article
                key={deck.id}
                className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300"
              >
                <div className="flex items-center gap-2">
                  {deck.level && (
                    <span className="flex-none rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-blue-800">
                      {deck.level}
                    </span>
                  )}
                  <span className="truncate text-xs text-slate-500">{deck.categoryName}</span>
                  <span
                    className={`ml-auto flex-none whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ${
                      isPublished ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {isPublished ? "Đã xuất bản" : "Bản nháp"}
                  </span>
                </div>
                <h2 className="mt-3 line-clamp-2 font-semibold text-slate-950">
                  <Link href={`/admin/vocab/${deck.id}`} className="hover:text-blue-700">
                    {deck.title}
                  </Link>
                </h2>
                {deck.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{deck.description}</p>
                )}
                <div className="mt-auto pt-4">
                  <div className="flex items-center gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600">
                    <span className="tabular-nums">{wordCount(deck)} từ</span>
                    <div className="ml-auto flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPendingLifecycle(deck)}
                        aria-label={`${isPublished ? "Chuyển về bản nháp" : "Xuất bản"} ${deck.title}`}
                        title={isPublished ? "Chuyển về bản nháp" : "Xuất bản"}
                        className={ICON_BTN}
                      >
                        <Send size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(deck)}
                        aria-label={`Xóa ${deck.title}`}
                        title="Xóa bộ từ"
                        className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={15} />
                      </button>
                      <Link
                        href={`/admin/vocab/${deck.id}`}
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
              {decks.length ? "Không có bộ từ nào khớp bộ lọc." : "Chưa có bộ từ nào. Bấm “Tạo bộ từ” để bắt đầu."}
            </p>
          )}
        </div>
      )}

      {pendingLifecycle && (
        <ConfirmDialog
          open={true}
          title={
            pendingLifecycle.publicationStatus === "PUBLISHED"
              ? "Chuyển bộ từ về bản nháp?"
              : "Xuất bản bộ từ?"
          }
          description={
            pendingLifecycle.publicationStatus === "PUBLISHED"
              ? "Học viên sẽ không thấy bộ này cho đến khi xuất bản lại."
              : "Bộ từ sẽ hiện trong Flashcard của học viên."
          }
          confirmLabel={
            pendingLifecycle.publicationStatus === "PUBLISHED" ? "Chuyển về bản nháp" : "Xuất bản"
          }
          onConfirm={async () => {
            const deck = pendingLifecycle;
            setPendingLifecycle(null);
            try {
              await axiosClient.post(
                `/admin/vocab/topics/${deck.id}/${deck.publicationStatus === "PUBLISHED" ? "unpublish" : "publish"}`,
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
          title="Xóa bộ từ"
          description={`Xóa bộ "${pendingDelete.title}" và mọi từ bên trong?`}
          confirmLabel="Xóa"
          onConfirm={async () => {
            const deck = pendingDelete;
            setPendingDelete(null);
            try {
              await axiosClient.delete(`/admin/vocab/topics/${deck.id}`);
              toast.success("Đã xóa bộ từ.");
              refresh();
            } catch (err: any) {
              toast.error(getApiErrorMessage(err, "Không thể xóa bộ từ."));
            }
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </main>
  );
}
