"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Plus, Search, Trash2, Volume2, X } from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import { Pagination } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { BTN_DANGER, BTN_PRIMARY, BTN_SECONDARY, BTN_SUCCESS } from "@/components/admin/cmsButtons";
import VocabWordForm, { type WordPayload } from "@/components/admin/vocab/VocabWordForm";
import {
  DICTIONARY_SOURCE,
  DICTIONARY_STATUS,
  POS_OPTIONS,
  entryToWord,
  type DictionaryEntry,
} from "@/components/admin/vocab/vocabCms";

type Status = DictionaryEntry["status"];
type EntryPage = {
  items: DictionaryEntry[];
  total: number;
  page: number;
  pageSize: number;
  statusCounts: Record<Status, number>;
};
type EntryDecks = { decks: Array<{ deckWordId: number; id: number; title: string }> };

const PAGE_SIZE = 25;
const SELECT =
  "min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200";
const STATUS_TABS: Array<{ value: Status | "ALL"; label: string }> = [
  { value: "ALL", label: "Tất cả" },
  { value: "PENDING_REVIEW", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Đã loại" },
];

const unwrap = <T,>(res: any): T => (res?.data ?? res) as T;

/**
 * Kho từ điển (F13): the one store every flashcard deck links and every
 * lookup reads. Words learners looked up in an external dictionary land here
 * as "Chờ duyệt" until an admin approves or rejects them.
 */
export default function AdminDictionaryPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "ALL">("ALL");
  const [source, setSource] = useState("ALL");
  const [pos, setPos] = useState("ALL");
  const [missing, setMissing] = useState("NONE");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [decksOf, setDecksOf] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DictionaryEntry | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const filters = {
    q: search || undefined,
    status: status === "ALL" ? undefined : status,
    source: source === "ALL" ? undefined : source,
    pos: pos === "ALL" ? undefined : pos,
    missing: missing === "NONE" ? undefined : missing,
  };
  const { data, isLoading, isFetching } = useQuery<EntryPage>({
    queryKey: ["admin-dictionary", filters, page],
    placeholderData: keepPreviousData,
    queryFn: async () =>
      unwrap<EntryPage>(
        await axiosClient.get("/admin/dictionary", {
          params: { ...filters, page, pageSize: PAGE_SIZE },
        }),
      ),
  });
  const entries = data?.items ?? [];
  const total = data?.total ?? 0;
  const counts = data?.statusCounts;
  const allCount = counts ? counts.APPROVED + counts.PENDING_REVIEW + counts.REJECTED : 0;
  const firstIndex = (page - 1) * PAGE_SIZE;
  const filtersActive =
    Boolean(search) || status !== "ALL" || source !== "ALL" || pos !== "ALL" || missing !== "NONE";

  const { data: deckUsage, isFetching: loadingDecks } = useQuery<EntryDecks>({
    queryKey: ["admin-dictionary-entry", decksOf],
    enabled: decksOf !== null,
    queryFn: async () => unwrap<EntryDecks>(await axiosClient.get(`/admin/dictionary/${decksOf}`)),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-dictionary"] });
  const filter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const review = async (entry: DictionaryEntry, action: "approve" | "reject") => {
    setBusyId(entry.id);
    try {
      await axiosClient.post(`/admin/dictionary/${entry.id}/${action}`);
      toast.success(action === "approve" ? `Đã duyệt "${entry.displayWord}".` : `Đã loại "${entry.displayWord}".`);
      refresh();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Không thể cập nhật mục này."));
    } finally {
      setBusyId(null);
    }
  };

  const saveEntry = (id: number | null) => (payload: WordPayload) =>
    id === null
      ? axiosClient.post("/admin/dictionary", payload)
      : axiosClient.patch(`/admin/dictionary/${id}`, payload);

  return (
    <main className="space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Kho từ điển</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Mỗi từ (theo loại từ) chỉ có một mục. Bộ flashcard, nút tra từ, luyện nói và Đấu trường
            đều đọc từ đây; sửa một mục là đổi ở mọi nơi dùng nó.
          </p>
        </div>
        <button type="button" onClick={() => setEditingId("new")} className={BTN_PRIMARY}>
          <Plus size={16} /> Thêm từ
        </button>
      </header>

      {editingId === "new" && (
        <section className="rounded-xl border border-blue-300 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-950">Từ mới trong kho</h2>
          <VocabWordForm
            word={null}
            save={saveEntry(null)}
            onSaved={(keepOpen) => {
              if (!keepOpen) setEditingId(null);
              refresh();
            }}
            onCancel={() => setEditingId(null)}
          />
        </section>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc theo trạng thái">
          {STATUS_TABS.map((tab) => {
            const active = status === tab.value;
            const count = tab.value === "ALL" ? allCount : counts?.[tab.value];
            return (
              <button
                key={tab.value}
                type="button"
                aria-pressed={active}
                onClick={() => filter(() => setStatus(tab.value))}
                className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {tab.label}
                {count !== undefined && (
                  <span
                    className={`rounded-md px-1.5 text-xs tabular-nums ${
                      active
                        ? "bg-white/15 text-white"
                        : tab.value === "PENDING_REVIEW" && count > 0
                          ? "bg-amber-100 text-amber-900"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <label className="relative block">
          <span className="sr-only">Tìm trong kho từ điển</span>
          <Search
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo từ hoặc nghĩa tiếng Việt..."
            className="min-h-11 w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </label>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Nguồn
            <select value={source} onChange={(e) => filter(() => setSource(e.target.value))} className={SELECT}>
              <option value="ALL">Tất cả</option>
              {Object.entries(DICTIONARY_SOURCE).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Loại từ
            <select value={pos} onChange={(e) => filter(() => setPos(e.target.value))} className={SELECT}>
              <option value="ALL">Tất cả</option>
              {POS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Còn thiếu
            <select value={missing} onChange={(e) => filter(() => setMissing(e.target.value))} className={SELECT}>
              <option value="NONE">Không lọc</option>
              <option value="ipa">Phiên âm</option>
              <option value="example">Câu ví dụ</option>
              <option value="audio">Audio</option>
            </select>
          </label>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-600">
            <span className="tabular-nums">
              {total} mục{isFetching && !isLoading ? " · đang tải" : ""}
            </span>
            {filtersActive && (
              <button
                type="button"
                onClick={() =>
                  filter(() => {
                    setQuery("");
                    setStatus("ALL");
                    setSource("ALL");
                    setPos("ALL");
                    setMissing("NONE");
                  })
                }
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
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1.6fr)_8rem_7rem_16rem] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 lg:grid">
            <span>Từ</span>
            <span>Nghĩa</span>
            <span>Nguồn</span>
            <span>Dùng ở</span>
            <span className="text-right">Thao tác</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {entries.length === 0 && (
              <li className="p-10 text-center text-sm text-slate-600">
                {filtersActive ? "Không có mục nào khớp bộ lọc." : "Kho từ điển chưa có mục nào."}
              </li>
            )}
            {entries.map((entry) => {
              const editing = editingId === entry.id;
              const used = entry.usedInDecks ?? 0;
              const badge = DICTIONARY_STATUS[entry.status];
              const busy = busyId === entry.id;
              return (
                  <li key={entry.id} className={`px-4 py-3 ${editing ? "bg-blue-50/40" : ""}`}>
                    <div className="grid gap-x-4 gap-y-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.6fr)_8rem_7rem_16rem] lg:items-center">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-baseline gap-x-2 text-base font-semibold text-slate-950">
                          {entry.displayWord}
                          <span className="text-sm font-normal text-slate-600">{entry.pos}</span>
                          {(entry.audioUs || entry.audioUk) && (
                            <Volume2 size={14} aria-label="Có audio" className="self-center text-slate-500" />
                          )}
                        </p>
                        <p className="text-sm text-slate-600">
                          {entry.ipaUs || <span className="text-amber-800">Chưa có phiên âm</span>}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-slate-900">{entry.meaningVi}</p>
                        {entry.exampleEn && (
                          <p className="mt-0.5 line-clamp-1 text-sm text-slate-600">{entry.exampleEn}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 lg:flex-col lg:items-start">
                        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${badge.tone}`}>
                          {badge.label}
                        </span>
                        <span className="text-xs text-slate-600">{DICTIONARY_SOURCE[entry.source]}</span>
                      </div>
                      <div>
                        {used ? (
                          <button
                            type="button"
                            onClick={() => setDecksOf(decksOf === entry.id ? null : entry.id)}
                            aria-expanded={decksOf === entry.id}
                            className="cursor-pointer text-sm font-semibold tabular-nums text-blue-700 underline-offset-4 hover:underline"
                          >
                            {used} bộ
                          </button>
                        ) : (
                          <span className="text-sm text-slate-600">Chỉ tra từ</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                        {entry.status !== "APPROVED" && (
                          <button
                            type="button"
                            onClick={() => void review(entry, "approve")}
                            disabled={busy}
                            className={BTN_SUCCESS}
                          >
                            <Check size={14} /> Duyệt
                          </button>
                        )}
                        {entry.status !== "REJECTED" && !used && (
                          <button
                            type="button"
                            onClick={() => void review(entry, "reject")}
                            disabled={busy}
                            title="Mục bị loại không còn hiện khi học viên tra từ"
                            className={BTN_SECONDARY}
                          >
                            <X size={14} /> Loại
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditingId(entry.id)}
                          disabled={editing}
                          className={BTN_SECONDARY}
                        >
                          {editing ? "Đang sửa" : "Sửa"}
                        </button>
                        {!used && (
                          <button
                            type="button"
                            onClick={() => setPendingDelete(entry)}
                            aria-label={`Xóa "${entry.displayWord}"`}
                            className={BTN_DANGER}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    {decksOf === entry.id && (
                      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                        {loadingDecks ? (
                          <span className="inline-flex items-center gap-2 text-slate-600">
                            <Loader2 size={14} className="animate-spin" /> Đang tải
                          </span>
                        ) : (
                          <p className="flex flex-wrap gap-x-3 gap-y-1">
                            <span className="text-slate-600">Nằm trong:</span>
                            {deckUsage?.decks.map((deck) => (
                              <Link
                                key={deck.deckWordId}
                                href={`/admin/vocab/${deck.id}`}
                                className="font-semibold text-blue-700 underline-offset-4 hover:underline"
                              >
                                {deck.title}
                              </Link>
                            ))}
                          </p>
                        )}
                      </div>
                    )}
                    {editing && (
                      <VocabWordForm
                        word={entryToWord(entry)}
                        save={saveEntry(entry.id)}
                        onSaved={() => {
                          setEditingId(null);
                          refresh();
                        }}
                        onCancel={() => setEditingId(null)}
                      />
                    )}
                  </li>
              );
            })}
          </ul>
        </section>
      )}

      {total > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm tabular-nums text-slate-600">
            {firstIndex + 1}–{Math.min(firstIndex + PAGE_SIZE, total)} / {total} mục
          </span>
          <Pagination currentPage={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} />
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          open={true}
          title="Xóa mục từ điển"
          description={`Xóa "${pendingDelete.displayWord}" (${pendingDelete.pos}) khỏi kho? Học viên tra từ này sẽ nhận kết quả từ từ điển ngoài.`}
          confirmLabel="Xóa"
          onConfirm={async () => {
            const entry = pendingDelete;
            setPendingDelete(null);
            try {
              await axiosClient.delete(`/admin/dictionary/${entry.id}`);
              toast.success("Đã xóa mục.");
              refresh();
            } catch (err: any) {
              toast.error(getApiErrorMessage(err, "Không thể xóa mục này."));
            }
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </main>
  );
}
