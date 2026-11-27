"use client";

import { ADMIN_CARD, ADMIN_CARD_GRID } from "@/components/admin/cmsStyles";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import type {
  AdminListSort,
  PublicationFilter,
} from "@/components/admin/adminListToolbarLogic";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, Send, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { vocabListBlocker } from "@/components/admin/vocab/vocabCms";
import { Pagination } from "@/components/ui";
import { useAdminList } from "@/components/admin/useAdminList";
import { ADMIN_PAGE_SIZES } from "@/components/admin/adminList";
import { AiCreateDialog } from "@/components/admin/AiCreateDialog";
import VocabDocumentImport from "@/components/admin/vocab/VocabDocumentImport";
import { PRACTICE_LEVEL_OPTIONS } from "@/lib/learning-path/practiceLevel";
import { deckLevelLabel } from "@/modules/flashcard/flashcardLogic";

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
  /** What the server's publish would refuse, in the checklist's words. */
  publishProblems?: string[];
};

const ICON_BTN =
  "inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

const wordCount = (deck: DeckSummary) => deck._count?.words ?? deck.totalWords ?? 0;

export default function AdminVocabPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [aiCreating, setAiCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [level, setLevel] = useState("ALL");
  const [status, setStatus] = useState<PublicationFilter>("ALL");
  const [sort, setSort] = useState<AdminListSort>("NEWEST");
  const [pendingDelete, setPendingDelete] = useState<DeckSummary | null>(null);
  const [pendingLifecycle, setPendingLifecycle] = useState<DeckSummary | null>(
    null,
  );

  // One page from the server; search, filters and sort run there too.
  const list = useAdminList<
    DeckSummary,
    { total: number; published: number; categories: string[] }
  >({
    key: "admin-vocab-topics",
    url: "/admin/vocab/topics",
    search: query,
    filters: { category, level, status, sort },
  });
  const visible = list.items;
  const isLoading = list.isLoading;
  const totalDecks = list.facets?.total ?? 0;
  const published = list.facets?.published ?? 0;
  const categories = list.facets?.categories ?? [];
  const filtersActive =
    Boolean(query.trim()) || category !== "ALL" || level !== "ALL" || status !== "ALL";
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-vocab-topics"] });

  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        title="Từ vựng & Flashcard"
        stats={`${totalDecks} bộ · ${published} đã xuất bản · ${totalDecks - published} bản nháp`}
        fromDocument={{ label: "Tạo từ tài liệu", onClick: () => setImporting(true) }}
        ai={{ label: "Tạo bằng AI", onClick: () => setAiCreating(true) }}
        create={{ label: "Tạo bộ từ", href: "/admin/vocab/new" }}
      />

      {importing && <VocabDocumentImport onClose={() => setImporting(false)} />}
      {aiCreating && (
        <AiCreateDialog
          title="Tạo bộ từ bằng AI"
          nameLabel="Chủ đề của bộ từ"
          namePlaceholder="Ví dụ: Từ vựng họp hành"
          countLabel="Số từ"
          maxCount={30}
          defaultCount={15}
          levels={[...PRACTICE_LEVEL_OPTIONS]}
          // QA 2026-11-22: the category was forced; the admin picks it, and
          // the list's category filter, when one is on, fills it in.
          category={{
            options: categories,
            initial: category === "ALL" ? "" : category,
          }}
          onClose={() => setAiCreating(false)}
          onCreate={async ({ name, level, count, category: categoryName }) => {
            try {
              const created = (await axiosClient.post("/admin/vocab/topics", {
                title: name,
                description: "",
                level,
                categoryName,
                isPro: false,
              })) as unknown as { id: number };
              refresh();
              router.push(`/admin/vocab/${created.id}?ai=${count}`);
            } catch (err) {
              toast.error(getApiErrorMessage(err, "Không tạo được bộ từ."));
            }
          }}
        />
      )}

      <AdminListToolbar
        content="vocab"
        searchLabel="Tìm bộ từ"
        search={query}
        onSearchChange={setQuery}
        status={{ value: status, onChange: setStatus }}
        level={{
          value: level,
          onChange: setLevel,
          options: [
            ...PRACTICE_LEVEL_OPTIONS,
            { value: "NONE", label: "Chưa gắn" },
          ],
        }}
        extra={{
          label: "Chuyên mục",
          value: category,
          onChange: setCategory,
          options: categories.map((name) => ({ value: name, label: name })),
        }}
        sort={{ value: sort, onChange: setSort }}
        total={list.facets?.total}
        matched={list.total}
        fetching={list.isFetching}
        filtersActive={filtersActive}
        onClearFilters={() => {
          setQuery("");
          setCategory("ALL");
          setLevel("ALL");
          setStatus("ALL");
        }}
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-slate-500" size={32} />
        </div>
      ) : (
        // Cards fill the canvas in 320px-minimum columns with one 16px gutter.
        <div className={ADMIN_CARD_GRID}>
          {visible.map((deck) => {
            const isPublished = deck.publicationStatus === "PUBLISHED";
            // The deck editor's checklist: the icon shows only when publishing can run.
            const blocker = vocabListBlocker({ ...deck, wordCount: wordCount(deck) });
            return (
              <article
                key={deck.id}
                className={ADMIN_CARD}
              >
                <div className="flex items-center gap-2">
                  {deck.level && (
                    <span className="flex-none rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-blue-800">
                      {deckLevelLabel(deck.level)}
                    </span>
                  )}
                  <span className="truncate text-xs text-slate-600 dark:text-slate-400">{deck.categoryName}</span>
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
                {blocker && (
                  <p className="mt-2 text-sm text-amber-800">Chưa xuất bản được. {blocker}</p>
                )}
                <div className="mt-auto pt-4">
                  <div className="flex items-center gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600">
                    <span className="tabular-nums">{wordCount(deck)} từ</span>
                    <div className="ml-auto flex items-center gap-1.5">
                      {blocker ? (
                        // Hidden, not faded; the card says why above.
                        <span className="size-9" aria-hidden="true" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPendingLifecycle(deck)}
                          aria-label={`${isPublished ? "Chuyển về bản nháp" : "Xuất bản"} ${deck.title}`}
                          title={isPublished ? "Chuyển về bản nháp" : "Xuất bản"}
                          className={ICON_BTN}
                        >
                          <Send size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPendingDelete(deck)}
                        aria-label={`Xóa ${deck.title}`}
                        title="Xóa bộ từ"
                        className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400"
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
            <p className="col-span-full text-sm text-slate-600">
              {totalDecks ? "Không có bộ từ nào khớp bộ lọc." : "Chưa có bộ từ nào. Bấm “Tạo bộ từ” để bắt đầu."}
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
    </div>
  );
}
