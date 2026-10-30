"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  ClipboardPaste,
  Loader2,
  Plus,
  Save,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import {
  BTN_AI,
  BTN_DANGER,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_SUCCESS,
} from "../cmsButtons";
import VocabStagePreview from "./VocabStagePreview";
import VocabWordForm, { type AdminVocabWord } from "./VocabWordForm";
import {
  VOCAB_LEVELS,
  cefrToCourseLevel,
  parseVocabPaste,
  vocabDeckChecklist,
} from "./vocabCms";

type Deck = {
  id: number;
  title: string;
  description?: string | null;
  level?: string | null;
  categoryName: string;
  isPro?: boolean;
  publicationStatus: "DRAFT" | "PUBLISHED";
  words: AdminVocabWord[];
};

type DeckForm = {
  title: string;
  description: string;
  level: string;
  categoryName: string;
  isPro: boolean;
};

type DraftWord = {
  word: string;
  meaning: string;
  pos?: string;
  ipaUs?: string;
  ipaUk?: string;
  exampleEn?: string;
  exampleVi?: string;
  chosen: boolean;
};

const FIELD =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";
const ICON_BTN =
  "inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40";

const unwrap = <T,>(value: any): T => (value?.data ?? value) as T;

export default function VocabDeckEditor({ id }: { id?: number }) {
  const { data: deck, isLoading } = useQuery<Deck>({
    queryKey: ["admin-vocab-topic-detail", id],
    enabled: Boolean(id),
    queryFn: async () =>
      unwrap<Deck>(await axiosClient.get(`/admin/vocab/topics/${id}`)),
  });
  if (id && (isLoading || !deck))
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="animate-spin text-slate-500" />
      </div>
    );
  return <DeckBody key={deck?.id ?? "new"} deck={deck ?? null} />;
}

function DeckBody({ deck }: { deck: Deck | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: allDecks = [] } = useQuery<Array<{ categoryName: string }>>({
    queryKey: ["admin-vocab-topics"],
    queryFn: async () =>
      unwrap<Array<{ categoryName: string }>>(
        await axiosClient.get("/admin/vocab/topics"),
      ) || [],
  });
  const categories = [...new Set(allDecks.map((d) => d.categoryName))].sort();

  const initial: DeckForm = {
    title: deck?.title ?? "",
    description: deck?.description ?? "",
    level: deck?.level ?? "",
    categoryName: deck?.categoryName ?? "",
    isPro: deck?.isPro ?? false,
  };
  const [savedForm, setSavedForm] = useState(initial);
  const [form, setForm] = useState(initial);
  const dirty = JSON.stringify(form) !== JSON.stringify(savedForm);
  const words = useMemo(
    () => (deck?.words ?? []).slice().sort((a, b) => a.order - b.order || a.id - b.id),
    [deck],
  );
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [panel, setPanel] = useState<"paste" | "ai" | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [aiCount, setAiCount] = useState(10);
  const [aiWords, setAiWords] = useState<DraftWord[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminVocabWord | null>(
    null,
  );
  const [confirmLifecycle, setConfirmLifecycle] = useState(false);
  const published = deck?.publicationStatus === "PUBLISHED";

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["admin-vocab-topic-detail", deck?.id],
    });
    queryClient.invalidateQueries({ queryKey: ["admin-vocab-topics"] });
  };

  const visible = query.trim()
    ? words.filter((w) =>
        `${w.word} ${w.meaning}`
          .toLocaleLowerCase("vi")
          .includes(query.trim().toLocaleLowerCase("vi")),
      )
    : words;
  const nextOrder = (words.at(-1)?.order ?? 0) + 1;
  const pasted = parseVocabPaste(
    pasteText,
    words.map((w) => w.word),
  );
  const pastedReady = pasted.filter((row) => !row.error && !row.duplicate);
  const checklist = vocabDeckChecklist({ title: form.title, words });
  const doneCount = checklist.filter((item) => item.done).length;
  const previewWord =
    words.find((w) => w.id === previewId) ?? words[0] ?? null;

  const saveDeck = async () => {
    if (!form.title.trim()) {
      toast.error("Cần nhập tên bộ từ.");
      return;
    }
    setBusy(true);
    const dto = {
      title: form.title.trim(),
      description: form.description.trim(),
      ...(form.level ? { level: form.level } : {}),
      categoryName: form.categoryName.trim() || "600 TỪ VỰNG TOEIC",
      isPro: form.isPro,
    };
    try {
      if (deck) {
        await axiosClient.patch(`/admin/vocab/topics/${deck.id}`, dto);
        setSavedForm(form);
        toast.success("Đã lưu bộ từ.");
        refresh();
      } else {
        const created = unwrap<{ id: number }>(
          await axiosClient.post("/admin/vocab/topics", dto),
        );
        setSavedForm(form);
        toast.success("Đã tạo bộ từ. Giờ thêm từ vào bộ.");
        queryClient.invalidateQueries({ queryKey: ["admin-vocab-topics"] });
        router.replace(`/admin/vocab/${created.id}`);
      }
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Không thể lưu bộ từ."));
    } finally {
      setBusy(false);
    }
  };

  /** Sequential, so the words keep the order they were given in. */
  const addWords = async (
    rows: Array<Omit<DraftWord, "chosen">>,
    label: string,
  ) => {
    if (!deck || !rows.length) return 0;
    setBusy(true);
    let added = 0;
    try {
      for (const [index, row] of rows.entries()) {
        setProgress(`${label} ${index + 1}/${rows.length}`);
        await axiosClient.post(`/admin/vocab/topics/${deck.id}/words`, {
          word: row.word.trim(),
          meaning: row.meaning.trim(),
          pos: row.pos || "noun",
          ipaUs: row.ipaUs?.trim() || undefined,
          ipaUk: row.ipaUk?.trim() || undefined,
          exampleEn: row.exampleEn?.trim() || undefined,
          exampleVi: row.exampleVi?.trim() || undefined,
          order: nextOrder + index,
        });
        added++;
      }
      toast.success(`Đã thêm ${added} từ.`);
    } catch (err: any) {
      toast.error(
        getApiErrorMessage(err, `Dừng ở từ thứ ${added + 1}; ${added} từ đã thêm.`),
      );
    } finally {
      setProgress(null);
      setBusy(false);
      refresh();
    }
    return added;
  };

  const askAi = async () => {
    const topic = form.title.trim();
    if (!topic) {
      toast.error("Cần tên bộ từ để AI biết chủ đề.");
      return;
    }
    setBusy(true);
    try {
      const data = unwrap<any>(
        await axiosClient.post("/admin/vocab/ai/full-draft", {
          topic,
          level: cefrToCourseLevel(form.level),
          context: form.description.trim() || undefined,
          count: aiCount,
        }),
      );
      const known = new Set(words.map((w) => w.word.toLowerCase()));
      setAiWords(
        (data?.words ?? []).map((w: any) => ({
          word: String(w.word ?? ""),
          meaning: String(w.meaning ?? ""),
          pos: w.pos,
          ipaUs: w.ipaUs,
          ipaUk: w.ipaUk,
          exampleEn: w.exampleEn,
          exampleVi: w.exampleVi,
          chosen: !known.has(String(w.word ?? "").toLowerCase()),
        })),
      );
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Không thể lấy gợi ý AI lúc này."));
    } finally {
      setBusy(false);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    if (!deck) return;
    const ids = words.map((w) => w.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    try {
      await axiosClient.post(`/admin/vocab/topics/${deck.id}/reorder-words`, {
        wordIds: ids,
      });
      refresh();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Không thể đổi thứ tự."));
    }
  };

  const changeLifecycle = async () => {
    if (!deck) return;
    setBusy(true);
    try {
      await axiosClient.post(
        `/admin/vocab/topics/${deck.id}/${published ? "unpublish" : "publish"}`,
      );
      toast.success(published ? "Đã chuyển về bản nháp." : "Đã xuất bản bộ từ.");
      refresh();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Không thể đổi trạng thái."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="space-y-6 p-6">
      <Link
        href="/admin/vocab"
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={16} /> Danh sách
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">
            {deck ? deck.title : "Tạo bộ từ vựng"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {deck
              ? `${published ? "Đã xuất bản" : "Bản nháp"} · ${words.length} từ`
              : "Bộ từ mới, chưa lưu"}{" "}
            · {doneCount}/{checklist.length} mục sẵn sàng
            {dirty && " · có thay đổi chưa lưu"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void saveDeck()}
            disabled={busy}
            className={BTN_SECONDARY}
          >
            <Save size={16} /> {deck ? "Lưu" : "Tạo bộ từ"}
          </button>
          {deck && (
            <button
              type="button"
              onClick={() => setConfirmLifecycle(true)}
              disabled={busy}
              className={BTN_SUCCESS}
            >
              <Send size={16} />
              {published ? "Chuyển về bản nháp" : "Kiểm tra & xuất bản"}
            </button>
          )}
        </div>
      </header>

      {published && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Bộ đang hiển thị cho học viên: sửa từ có hiệu lực ngay. Từ đã có học
          viên học thì không đổi được chữ và nghĩa.
        </p>
      )}

      {/* Two columns from 1280px: the deck and its words on the left; a
          400px rail with the checklist and the 4-step preview (24px gap). */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-start-1">
          <h2 className="font-semibold text-slate-950">Thông tin bộ từ</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
            <label className="text-sm font-medium text-slate-800">
              Tên bộ từ
              <input
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                placeholder="Ví dụ: Office & Meetings"
                className={FIELD}
              />
            </label>
            <label className="text-sm font-medium text-slate-800">
              Trình độ
              <select
                value={form.level}
                onChange={(event) =>
                  setForm({ ...form, level: event.target.value })
                }
                className={FIELD}
              >
                <option value="">Chưa chọn</option>
                {VOCAB_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-800">
              Chuyên mục
              <input
                list="vocab-categories"
                value={form.categoryName}
                onChange={(event) =>
                  setForm({ ...form, categoryName: event.target.value })
                }
                placeholder="Chọn hoặc gõ chuyên mục mới"
                className={FIELD}
              />
              <datalist id="vocab-categories">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={form.isPro}
                onChange={(event) =>
                  setForm({ ...form, isPro: event.target.checked })
                }
                className="size-4 rounded border-slate-300"
              />
              Chỉ cho gói PRO
            </label>
            <label className="text-sm font-medium text-slate-800 md:col-span-2">
              Mô tả ngắn (hiện trên thẻ bộ từ của học viên)
              <textarea
                rows={2}
                maxLength={500}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="Ví dụ: Từ vựng để họp, ghi biên bản và sắp lịch."
                className={FIELD}
              />
            </label>
          </div>
        </section>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:col-start-2 xl:row-span-2 xl:row-start-1">
          <section
            aria-labelledby="vocab-checklist-heading"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="vocab-checklist-heading" className="font-semibold text-slate-950">
                Trước khi xuất bản
              </h2>
              <span className="text-sm tabular-nums text-slate-500">
                {doneCount}/{checklist.length}
              </span>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {checklist.map((entry) => (
                <li key={entry.label} className="flex items-center gap-2">
                  {entry.done ? (
                    <CheckCircle2 size={16} className="flex-none text-emerald-600" aria-hidden="true" />
                  ) : (
                    <Circle size={16} className="flex-none text-slate-300" aria-hidden="true" />
                  )}
                  <span className={entry.done ? "text-slate-600" : "font-medium text-slate-900"}>
                    {entry.label}
                  </span>
                  <span className="sr-only">{entry.done ? "(đã xong)" : "(chưa xong)"}</span>
                </li>
              ))}
            </ul>
          </section>

          {previewWord && (
            <section
              aria-labelledby="vocab-steps-heading"
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 id="vocab-steps-heading" className="font-semibold text-slate-950">
                4 bước học: {previewWord.word}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Học viên học mỗi từ qua 4 bước này. Bấm một từ trong danh sách
                để xem.
              </p>
              <div className="mt-3">
                <VocabStagePreview key={previewWord.id} word={previewWord} words={words} />
              </div>
            </section>
          )}
        </aside>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-start-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-950">
              Từ vựng{" "}
              <span className="font-normal tabular-nums text-slate-500">{words.length}</span>
            </h2>
            {deck && words.length > 0 && (
              <label className="relative w-full max-w-xs">
                <span className="sr-only">Tìm trong bộ</span>
                <Search
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm từ hoặc nghĩa"
                  className="min-h-10 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </label>
            )}
          </div>

          {!deck ? (
            <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
              Tạo bộ từ trước, sau đó thêm từ ngay tại đây: từng từ, dán cả danh
              sách, hoặc nhờ AI gợi ý.
            </p>
          ) : (
            <>
              <ol className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {visible.length === 0 && (
                  <li className="p-5 text-sm text-slate-600">
                    {words.length ? "Không có từ nào khớp." : "Chưa có từ nào. Thêm bên dưới."}
                  </li>
                )}
                {visible.map((word) => {
                  const index = words.indexOf(word);
                  const editing = editingId === word.id;
                  return (
                    <li
                      key={word.id}
                      className={`px-4 py-3 ${editing ? "bg-blue-50/40" : previewWord?.id === word.id ? "bg-slate-50" : ""}`}
                    >
                      <div className="flex flex-wrap items-start gap-3">
                        <span className="w-6 flex-none pt-0.5 text-right text-xs tabular-nums text-slate-500">
                          {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPreviewId(word.id)}
                          className="min-w-0 flex-1 cursor-pointer text-left"
                          title="Xem 4 bước học của từ này"
                        >
                          <p className="font-semibold text-slate-950">
                            {word.word}{" "}
                            <span className="text-xs font-normal text-slate-500">
                              {word.pos} {word.ipaUs && `· ${word.ipaUs}`}
                            </span>
                          </p>
                          <p className="text-sm text-slate-700">{word.meaning}</p>
                          {word.exampleEn && (
                            <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">
                              {word.exampleEn}
                            </p>
                          )}
                        </button>
                        <div className="flex flex-none items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void move(index, -1)}
                            disabled={busy || Boolean(query) || index === 0}
                            aria-label={`Đưa "${word.word}" lên trước`}
                            className={ICON_BTN}
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void move(index, 1)}
                            disabled={busy || Boolean(query) || index === words.length - 1}
                            aria-label={`Đưa "${word.word}" xuống sau`}
                            className={ICON_BTN}
                          >
                            <ChevronDown size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(word.id);
                              setPreviewId(word.id);
                            }}
                            disabled={editing}
                            className={BTN_SECONDARY}
                          >
                            {editing ? "Đang sửa" : "Sửa"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDelete(word)}
                            aria-label={`Xóa "${word.word}"`}
                            className={BTN_DANGER}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {editing && (
                        <VocabWordForm
                          topicId={deck.id}
                          word={word}
                          level={form.level}
                          nextOrder={nextOrder}
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
              </ol>

              {progress && (
                <p className="mt-3 inline-flex items-center gap-2 text-sm tabular-nums text-slate-700">
                  <Loader2 size={14} className="animate-spin" /> {progress}
                </p>
              )}

              <div className="mt-4 border-t border-slate-100 pt-4">
                {editingId === "new" && (
                  <div className="mb-4 rounded-lg border border-blue-300 bg-blue-50/30 p-4">
                    <p className="text-sm font-semibold text-slate-900">Từ mới</p>
                    <VocabWordForm
                      topicId={deck.id}
                      word={null}
                      level={form.level}
                      nextOrder={nextOrder}
                      onSaved={(keepOpen) => {
                        if (!keepOpen) setEditingId(null);
                        refresh();
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                )}

                {panel === "paste" && (
                  <div className="mb-4 rounded-lg border border-blue-300 bg-blue-50/30 p-4">
                    <label className="block text-sm font-semibold text-slate-900">
                      Dán nhiều từ
                      <span className="mt-0.5 block text-xs font-normal text-slate-600">
                        Mỗi dòng một từ: <code>từ | nghĩa | loại từ | câu ví dụ | dịch</code>.
                        Dán thẳng từ Excel/Google Sheets cũng được (cột cách nhau bằng
                        Tab). Chỉ có từ và nghĩa thì viết <code>agenda - chương trình họp</code>.
                      </span>
                      <textarea
                        rows={6}
                        value={pasteText}
                        onChange={(event) => setPasteText(event.target.value)}
                        placeholder={"agenda | chương trình họp | noun | Let's stick to the agenda.\npostpone - hoãn lại"}
                        className={FIELD}
                      />
                    </label>
                    {pasted.length > 0 && (
                      <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-sm">
                        {pasted.map((row) => (
                          <li key={row.line} className="flex flex-wrap items-baseline gap-2">
                            <span className="w-6 text-right text-xs tabular-nums text-slate-500">
                              {row.line}
                            </span>
                            <span className="font-semibold text-slate-900">{row.word || "—"}</span>
                            <span className="text-slate-700">{row.meaning || "—"}</span>
                            <span className="text-xs text-slate-500">{row.pos}</span>
                            {row.error ? (
                              <span className="text-rose-700">{row.error}</span>
                            ) : row.duplicate ? (
                              <span className="text-amber-800">Đã có trong bộ, bỏ qua</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy || !pastedReady.length}
                        onClick={async () => {
                          if (await addWords(pastedReady, "Đang thêm")) {
                            setPasteText("");
                            setPanel(null);
                          }
                        }}
                        className={BTN_PRIMARY}
                      >
                        <Plus size={16} /> Thêm {pastedReady.length} từ
                      </button>
                      <button type="button" onClick={() => setPanel(null)} className={BTN_SECONDARY}>
                        Hủy
                      </button>
                    </div>
                  </div>
                )}

                {panel === "ai" && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/40 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        AI gợi ý từ cho “{form.title || "bộ này"}”
                      </p>
                      <label className="ml-auto flex items-center gap-1.5 text-sm text-slate-600">
                        Số từ
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={aiCount}
                          onChange={(event) =>
                            setAiCount(Math.min(30, Math.max(1, Number(event.target.value) || 1)))
                          }
                          className="min-h-10 w-16 rounded-lg border border-slate-300 px-2 text-center text-sm"
                        />
                      </label>
                      <button type="button" disabled={busy} onClick={() => void askAi()} className={BTN_AI}>
                        {busy && !progress && <Loader2 size={14} className="animate-spin" />}
                        {aiWords.length ? "Gợi ý lại" : "Gợi ý"}
                      </button>
                    </div>
                    {aiWords.length > 0 && (
                      <>
                        <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto text-sm">
                          {aiWords.map((row, index) => (
                            <li key={`${row.word}-${index}`}>
                              <label className="flex cursor-pointer items-baseline gap-2">
                                <input
                                  type="checkbox"
                                  checked={row.chosen}
                                  onChange={() =>
                                    setAiWords((rows) =>
                                      rows.map((r, i) => (i === index ? { ...r, chosen: !r.chosen } : r)),
                                    )
                                  }
                                  className="size-4 translate-y-0.5"
                                />
                                <span className="font-semibold text-slate-900">{row.word}</span>
                                <span className="text-slate-700">{row.meaning}</span>
                                <span className="text-xs text-slate-500">{row.pos}</span>
                              </label>
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          disabled={busy || !aiWords.some((r) => r.chosen)}
                          onClick={async () => {
                            if (
                              await addWords(
                                aiWords.filter((r) => r.chosen),
                                "Đang thêm",
                              )
                            ) {
                              setAiWords([]);
                              setPanel(null);
                            }
                          }}
                          className={`${BTN_PRIMARY} mt-3`}
                        >
                          <Plus size={16} /> Thêm {aiWords.filter((r) => r.chosen).length} từ đã chọn
                        </button>
                      </>
                    )}
                  </div>
                )}

                {editingId !== "new" && (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setEditingId("new")} className={BTN_SECONDARY}>
                      <Plus size={16} /> Thêm từ
                    </button>
                    <button type="button" onClick={() => setPanel(panel === "paste" ? null : "paste")} className={BTN_SECONDARY}>
                      <ClipboardPaste size={16} /> Dán nhiều từ
                    </button>
                    <button type="button" onClick={() => setPanel(panel === "ai" ? null : "ai")} className={BTN_AI}>
                      Thêm từ bằng AI
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirmLifecycle}
        title={published ? "Chuyển bộ từ về bản nháp?" : "Xuất bản bộ từ?"}
        description={
          published
            ? "Học viên sẽ không thấy bộ này cho đến khi xuất bản lại."
            : "Bộ từ sẽ hiện trong Flashcard của học viên."
        }
        confirmLabel={published ? "Chuyển về bản nháp" : "Xuất bản"}
        onConfirm={() => {
          setConfirmLifecycle(false);
          void changeLifecycle();
        }}
        onCancel={() => setConfirmLifecycle(false)}
      />
      {pendingDelete && deck && (
        <ConfirmDialog
          open={true}
          title="Xóa từ"
          description={`Xóa "${pendingDelete.word}" khỏi bộ?`}
          confirmLabel="Xóa"
          onConfirm={async () => {
            try {
              await axiosClient.delete(`/admin/vocab/topics/${deck.id}/words/${pendingDelete.id}`);
              toast.success("Đã xóa từ.");
              refresh();
            } catch (err: any) {
              toast.error(getApiErrorMessage(err, "Không thể xóa từ."));
            } finally {
              setPendingDelete(null);
            }
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </main>
  );
}
