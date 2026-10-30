"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  FileText,
  ImageIcon,
  Loader2,
  Plus,
  Save,
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
  BTN_SECONDARY,
  BTN_SUCCESS,
} from "../cmsButtons";
import SpeakingExerciseForm from "./SpeakingExerciseForm";
import {
  EXERCISE_LEVELS,
  LEVELS,
  STATUS_LABELS,
  TASK_TYPES,
  categoryLabel,
  difficultyLabel,
  levelLabel,
  unwrap,
  type SpeakingCategory,
  type SpeakingExerciseSuggestion,
  type SpeakingFullDraft,
  type SpeakingPracticeSet,
  type SpeakingPracticeSetSuggestion,
  type SpeakingStimulus,
} from "./speakingCmsShared";
import {
  countBy,
  describeValidationError,
  speakingSetChecklist,
} from "./speakingSetStatus";

type SetForm = {
  title: string;
  description: string;
  category: string;
  level: string;
};

const FIELD =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50";
const ICON_BTN =
  "inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40";
const taskTypeLabel = (value?: string | null) =>
  TASK_TYPES.find((task) => task.value === value)?.label ?? value ?? "—";

/** Loads the set, then renders the editor once (keyed by id) so its form starts from the saved values. */
export default function SpeakingSetEditor({ id }: { id?: string }) {
  const { data: set, isLoading } = useQuery<SpeakingPracticeSet>({
    queryKey: ["admin-speaking-set", id],
    enabled: Boolean(id),
    queryFn: async () =>
      unwrap<SpeakingPracticeSet>(
        await axiosClient.get(`/admin/skill-content/speaking/${id}`),
      ),
  });
  if (id && (isLoading || !set))
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="animate-spin text-slate-500" />
      </div>
    );
  return <EditorBody key={set?.id ?? "new"} set={set ?? null} />;
}

function EditorBody({ set }: { set: SpeakingPracticeSet | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery<SpeakingCategory[]>({
    queryKey: ["admin-speaking-categories"],
    queryFn: async () =>
      unwrap<SpeakingCategory[]>(
        await axiosClient.get(
          "/admin/skill-content/speaking/categories?includeInactive=true",
        ),
      ) || [],
  });
  const { data: stimuli = [] } = useQuery<SpeakingStimulus[]>({
    queryKey: ["admin-speaking-stimuli"],
    queryFn: async () =>
      unwrap<SpeakingStimulus[]>(
        await axiosClient.get("/admin/skill-content/speaking/stimuli"),
      ) || [],
  });
  const { data: validation } = useQuery<{ valid: boolean; errors: string[] }>(
    {
      queryKey: ["admin-speaking-validate", set?.id],
      enabled: Boolean(set),
      queryFn: async () =>
        unwrap(
          await axiosClient.get(
            `/admin/skill-content/speaking/${set!.id}/validate`,
          ),
        ),
    },
  );

  const practiceSetCategories = categories.filter(
    (category) => category.isActive && category.allowPracticeSet,
  );
  const defaultCategory = practiceSetCategories[0]?.code || "";
  const exercises = (set?.exercises ?? [])
    .slice()
    .sort(
      (a, b) =>
        (a.order ?? Number.MAX_SAFE_INTEGER) -
          (b.order ?? Number.MAX_SAFE_INTEGER) || a.id - b.id,
    );
  const published = set?.publicationStatus === "PUBLISHED";

  const initialForm: SetForm = {
    title: set?.title ?? "",
    description: set?.description ?? "",
    category: set?.category ?? "",
    level: set?.level ?? "A1-A2",
  };
  const [savedForm, setSavedForm] = useState<SetForm>(initialForm);
  const [form, setForm] = useState<SetForm>(initialForm);
  const dirty = JSON.stringify(form) !== JSON.stringify(savedForm);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [autoSuggest, setAutoSuggest] = useState(false);
  const [setSuggestion, setSetSuggestion] =
    useState<SpeakingPracticeSetSuggestion | null>(null);
  const [fullDraft, setFullDraft] = useState<SpeakingFullDraft | null>(null);
  const [fullDraftCount, setFullDraftCount] = useState(5);
  const [pendingExercises, setPendingExercises] = useState<
    SpeakingExerciseSuggestion[]
  >([]);
  const [inlineCategoryOpen, setInlineCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [confirmLifecycle, setConfirmLifecycle] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    id: number;
    title: string;
  } | null>(null);

  // Leaving with unsaved set details asks first.
  useEffect(() => {
    if (!dirty && !pendingExercises.length) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pendingExercises.length]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-speaking-set", set?.id] });
    queryClient.invalidateQueries({
      queryKey: ["admin-speaking-validate", set?.id],
    });
    queryClient.invalidateQueries({ queryKey: ["admin-speaking-sets"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const dto = { ...form, category: form.category || defaultCategory };
      let setId = set?.id;
      if (setId) {
        await axiosClient.patch(`/admin/skill-content/speaking/${setId}`, dto);
      } else {
        const created = unwrap<{ id: string }>(
          await axiosClient.post("/admin/skill-content/speaking", dto),
        );
        if (!created?.id) throw new Error("Không nhận được mã bộ luyện mới.");
        setId = created.id;
      }
      const base = exercises.length;
      for (const [index, candidate] of pendingExercises.entries()) {
        await axiosClient.post(
          `/admin/skill-content/speaking/${setId}/exercises`,
          {
            title: candidate.title.trim(),
            targetText: candidate.targetText.trim(),
            taskType: candidate.taskType,
            difficulty: candidate.difficulty,
            order: base + index + 1,
          },
        );
      }
      return { setId, dto };
    },
    onSuccess: ({ setId, dto }) => {
      toast.success(set ? "Đã lưu bộ luyện." : "Đã tạo bộ luyện.");
      setSavedForm(dto);
      setForm(dto);
      setPendingExercises([]);
      refresh();
      if (!set) router.replace(`/admin/speaking/${setId}`);
    },
    onError: (err: any) => {
      toast.error(getApiErrorMessage(err, "Không thể lưu bộ luyện nói."));
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () =>
      axiosClient.post(`/admin/skill-content/speaking/${set!.id}/publish`, {
        status: published ? "DRAFT" : "PUBLISHED",
      }),
    onSuccess: () => {
      toast.success(
        published ? "Đã chuyển về bản nháp." : "Đã xuất bản bộ luyện.",
      );
      refresh();
    },
    onError: (err: any) => {
      toast.error(
        getApiErrorMessage(err, "Không thể thay đổi trạng thái xuất bản."),
      );
    },
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: async (exerciseId: number) =>
      axiosClient.delete(
        `/admin/skill-content/speaking/${set!.id}/exercises/${exerciseId}`,
      ),
    onSuccess: () => {
      toast.success("Đã xóa câu luyện.");
      setPendingDelete(null);
      refresh();
    },
    onError: (err: any) => {
      toast.error(getApiErrorMessage(err, "Không thể xóa câu luyện."));
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (exerciseIds: number[]) =>
      axiosClient.patch(
        `/admin/skill-content/speaking/${set!.id}/exercises/reorder`,
        { exerciseIds },
      ),
    onSuccess: refresh,
    onError: (err: any) => {
      toast.error(getApiErrorMessage(err, "Không thể đổi thứ tự câu luyện."));
    },
  });

  const move = (index: number, direction: -1 | 1) => {
    const ids = exercises.map((exercise) => exercise.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderMutation.mutate(ids);
  };

  const suggestSetMutation = useMutation({
    mutationFn: async () =>
      axiosClient.post("/admin/speaking/ai/suggest-practice-set", {
        topic:
          form.title.trim() ||
          form.description.trim() ||
          categoryLabel(categories, form.category || defaultCategory),
        level: form.level,
        category: form.category || defaultCategory,
        currentTitle: form.title || undefined,
        currentDescription: form.description || undefined,
      }),
    onSuccess: (result: any) => setSetSuggestion(unwrap(result)),
    onError: (err: any) => {
      toast.error(getApiErrorMessage(err, "Không thể lấy gợi ý AI lúc này."));
    },
  });

  const fullDraftMutation = useMutation({
    mutationFn: async () => {
      const topic = form.title.trim() || form.description.trim();
      if (!topic) throw new Error("Nhập tên hoặc mục tiêu bộ luyện trước.");
      const data = unwrap<any>(
        await axiosClient.post("/admin/speaking/ai/full-draft", {
          topic,
          level: form.level,
          category: form.category || defaultCategory,
          objective: form.description.trim() || undefined,
          count: fullDraftCount,
        }),
      );
      if (!data?.practiceSet || !Array.isArray(data.exercises))
        throw new Error("AI không trả về bản nháp hợp lệ.");
      return data as SpeakingFullDraft;
    },
    onSuccess: (data) =>
      setFullDraft({
        practiceSet: data.practiceSet,
        exercises: data.exercises.map((candidate) => ({
          ...candidate,
          excluded: false,
        })),
      }),
    onError: (err: any) => {
      toast.error(
        err instanceof Error && !("response" in err)
          ? err.message
          : getApiErrorMessage(err, "Không thể soạn bản nháp lúc này."),
      );
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async () =>
      unwrap<SpeakingCategory>(
        await axiosClient.post("/admin/skill-content/speaking/categories", {
          name: newCategoryName.trim(),
          allowPracticeSet: true,
          allowExercise: false,
        }),
      ),
    onSuccess: (category) => {
      queryClient.invalidateQueries({
        queryKey: ["admin-speaking-categories"],
      });
      setForm((current) => ({ ...current, category: category.code }));
      setNewCategoryName("");
      setInlineCategoryOpen(false);
      toast.success("Đã tạo và chọn phân loại.");
    },
    onError: (err: any) => {
      toast.error(getApiErrorMessage(err, "Không thể tạo phân loại."));
    },
  });

  const checklist = speakingSetChecklist({ title: form.title, exercises });
  const doneCount = checklist.filter((item) => item.done).length;
  const serverErrors = (validation?.errors ?? []).map((error) =>
    describeValidationError(error, exercises),
  );
  const draftLocked = exercises.length > 0 || published;
  const busy = saveMutation.isPending || publishMutation.isPending;

  return (
    <main className="space-y-6 p-6">
      <Link
        href="/admin/speaking"
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={16} /> Danh sách
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">
            {set ? set.title : "Tạo bộ luyện nói"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {set
              ? `Trạng thái: ${STATUS_LABELS[set.publicationStatus] ?? set.publicationStatus}`
              : "Bộ luyện mới, chưa lưu"}{" "}
            · {doneCount}/{checklist.length} mục sẵn sàng
            {dirty && " · có thay đổi chưa lưu"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (!form.title.trim()) {
                toast.error("Cần nhập tên bộ luyện.");
                return;
              }
              saveMutation.mutate();
            }}
            disabled={busy || published}
            className={BTN_SECONDARY}
          >
            {saveMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {set ? "Lưu" : "Tạo bộ luyện"}
          </button>
          {set && (
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
          Bộ đang hiển thị cho học viên. Chuyển về bản nháp để sửa nội dung.
        </p>
      )}

      {/* Two columns from 1280px: the set and its exercises on the left; a
          400px rail with the checklist and the overview (24px gap). */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-start-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-950">Thông tin bộ luyện</h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => suggestSetMutation.mutate()}
                disabled={suggestSetMutation.isPending || published}
                title="AI gợi ý tên, mô tả, trình độ và phân loại; bạn xem lại trước khi dùng."
                className={BTN_SECONDARY}
              >
                {suggestSetMutation.isPending && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                Gợi ý tên & mô tả
              </button>
              {!draftLocked && (
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                  Số câu
                  <input
                    aria-label="Số câu trong bản nháp AI"
                    type="number"
                    min={1}
                    max={10}
                    value={fullDraftCount}
                    onChange={(event) =>
                      setFullDraftCount(
                        Math.min(10, Math.max(1, Number(event.target.value) || 1)),
                      )
                    }
                    className="min-h-10 w-16 rounded-lg border border-slate-300 px-2 text-center text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </label>
              )}
              <button
                type="button"
                onClick={() => fullDraftMutation.mutate()}
                disabled={draftLocked || fullDraftMutation.isPending}
                title={
                  draftLocked
                    ? "Bộ đã có câu luyện — dùng ‘Thêm câu luyện bằng AI’"
                    : "Dùng Tên và Trình độ bên dưới; bản nháp hiện ra để xem lại."
                }
                className={BTN_AI}
              >
                {fullDraftMutation.isPending && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                Soạn cả bộ bằng AI
              </button>
            </div>
          </div>
          {exercises.length > 0 && !published && (
            <p className="mt-2 text-sm text-slate-500">
              Bộ đã có câu luyện — dùng ‘Thêm câu luyện bằng AI’ ở mục Câu
              luyện.
            </p>
          )}

          {setSuggestion && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/40 p-4">
              <p className="text-sm font-semibold text-slate-900">
                Gợi ý từ AI
              </p>
              <p className="mt-2 font-semibold text-slate-900">
                {setSuggestion.title}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {setSuggestion.description}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {levelLabel(setSuggestion.level)} ·{" "}
                {categoryLabel(categories, setSuggestion.category)}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setForm({ ...setSuggestion });
                    setSetSuggestion(null);
                  }}
                  className={BTN_SECONDARY}
                >
                  Dùng gợi ý này
                </button>
                <button
                  type="button"
                  onClick={() => setSetSuggestion(null)}
                  className="cursor-pointer px-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                  Bỏ qua
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-800">
              Tên bộ luyện
              <input
                value={form.title}
                disabled={published}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                placeholder="Ví dụ: Giao tiếp nơi công sở"
                className={FIELD}
              />
            </label>
            <label className="text-sm font-medium text-slate-800">
              Trình độ
              <select
                value={form.level}
                disabled={published}
                onChange={(event) =>
                  setForm({ ...form, level: event.target.value })
                }
                className={FIELD}
              >
                {LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {levelLabel(level)}
                  </option>
                ))}
              </select>
            </label>
            <div className="text-sm font-medium text-slate-800 md:col-span-2">
              <label htmlFor="speaking-set-category">Phân loại</label>
              <div className="mt-1 flex gap-2">
                <select
                  id="speaking-set-category"
                  value={form.category || defaultCategory}
                  disabled={published}
                  onChange={(event) =>
                    setForm({ ...form, category: event.target.value })
                  }
                  className={`${FIELD} mt-0 min-w-0 flex-1`}
                >
                  {practiceSetCategories.map((category) => (
                    <option key={category.code} value={category.code}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={published}
                  onClick={() => setInlineCategoryOpen((open) => !open)}
                  className={BTN_SECONDARY}
                >
                  <Plus size={14} /> Phân loại mới
                </button>
              </div>
              {inlineCategoryOpen && (
                <div className="mt-2 flex gap-2">
                  <input
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    placeholder="Tên phân loại"
                    aria-label="Tên phân loại mới"
                    className={`${FIELD} mt-0 min-w-0 flex-1`}
                  />
                  <button
                    type="button"
                    disabled={
                      !newCategoryName.trim() ||
                      createCategoryMutation.isPending
                    }
                    onClick={() => createCategoryMutation.mutate()}
                    className={BTN_SECONDARY}
                  >
                    Tạo và chọn
                  </button>
                </div>
              )}
            </div>
            <label className="text-sm font-medium text-slate-800 md:col-span-2">
              Mô tả
              <textarea
                rows={3}
                value={form.description}
                disabled={published}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="Mục tiêu của bộ luyện, tình huống học viên sẽ nói."
                className={FIELD}
              />
            </label>
          </div>

          {fullDraft && (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">
                  Bản nháp AI: {fullDraft.practiceSet.title}
                </p>
                <p className="text-sm text-slate-600">
                  Bỏ chọn câu không dùng, rồi áp dụng. Chưa có gì được lưu.
                </p>
              </div>
              <ul className="mt-3 space-y-2">
                {fullDraft.exercises.map((candidate, index) => (
                  <li
                    key={`${candidate.title}-${index}`}
                    className={`flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 ${candidate.excluded ? "opacity-50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={!candidate.excluded}
                      aria-label={`Dùng câu ${index + 1}`}
                      onChange={() =>
                        setFullDraft((current) =>
                          current
                            ? {
                                ...current,
                                exercises: current.exercises.map(
                                  (item, itemIndex) =>
                                    itemIndex === index
                                      ? { ...item, excluded: !item.excluded }
                                      : item,
                                ),
                              }
                            : current,
                        )
                      }
                      className="mt-1 size-4 flex-none"
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">
                        {taskTypeLabel(candidate.taskType)} ·{" "}
                        {difficultyLabel(candidate.difficulty)}
                      </p>
                      <p className="font-semibold text-slate-900">
                        {candidate.title}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-700">
                        {candidate.targetText}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const chosen = fullDraft.exercises.filter(
                      (candidate) =>
                        !candidate.excluded &&
                        candidate.title.trim() &&
                        candidate.targetText.trim(),
                    );
                    if (!chosen.length) {
                      toast.error("Chọn ít nhất một câu.");
                      return;
                    }
                    setForm({ ...fullDraft.practiceSet });
                    setPendingExercises(chosen);
                    setFullDraft(null);
                  }}
                  className={BTN_SECONDARY}
                >
                  Áp dụng bản nháp
                </button>
                <button
                  type="button"
                  onClick={() => setFullDraft(null)}
                  className="cursor-pointer px-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                  Bỏ qua
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:col-start-2 xl:row-span-2 xl:row-start-1">
          <section
            aria-labelledby="speaking-checklist-heading"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2
                id="speaking-checklist-heading"
                className="font-semibold text-slate-950"
              >
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
                    <CheckCircle2
                      size={16}
                      className="flex-none text-emerald-600"
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle
                      size={16}
                      className="flex-none text-slate-300"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={
                      entry.done ? "text-slate-600" : "font-medium text-slate-900"
                    }
                  >
                    {entry.label}
                  </span>
                  <span className="sr-only">
                    {entry.done ? "(đã xong)" : "(chưa xong)"}
                  </span>
                </li>
              ))}
            </ul>
            {serverErrors.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-sm font-semibold text-rose-700">
                  Máy chủ sẽ chặn xuất bản vì:
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-rose-700">
                  {serverErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {exercises.length > 0 && (
            <section
              aria-labelledby="speaking-overview-heading"
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2
                id="speaking-overview-heading"
                className="font-semibold text-slate-950"
              >
                Tổng quan bộ
              </h2>
              <dl className="mt-3 space-y-1.5 text-sm">
                {countBy(exercises, "taskType").map(([value, count]) => (
                  <div key={value} className="flex justify-between gap-3">
                    <dt className="text-slate-600">{taskTypeLabel(value)}</dt>
                    <dd className="tabular-nums text-slate-900">{count}</dd>
                  </div>
                ))}
              </dl>
              <dl className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
                {EXERCISE_LEVELS.map((level) => (
                  <div key={level} className="flex justify-between gap-3">
                    <dt className="text-slate-600">{difficultyLabel(level)}</dt>
                    <dd className="tabular-nums text-slate-900">
                      {exercises.filter((e) => e.difficulty === level).length}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </aside>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-start-1">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-semibold text-slate-950">
              Câu luyện{" "}
              <span className="font-normal tabular-nums text-slate-500">
                {exercises.length}
              </span>
            </h2>
            <p className="text-sm text-slate-500">
              Học viên làm lần lượt theo thứ tự này. Bấm Sửa để sửa ngay tại câu.
            </p>
          </div>

          {pendingExercises.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/40 p-3 text-sm text-slate-700">
              {pendingExercises.length} câu từ bản nháp AI sẽ được thêm khi bấm{" "}
              {set ? "Lưu" : "Tạo bộ luyện"}.
            </div>
          )}

          {!set ? (
            <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
              Tạo bộ luyện trước, sau đó thêm câu luyện ngay tại đây.
            </p>
          ) : (
            <>
              <ol className="mt-4 space-y-3">
                {exercises.length === 0 && (
                  <li className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                    Chưa có câu luyện. Thêm câu đầu tiên bên dưới.
                  </li>
                )}
                {exercises.map((exercise, index) => {
                  const editing = editingId === exercise.id;
                  const stimulus = stimuli.find(
                    (item) => item.id === exercise.stimulusId,
                  );
                  return (
                    <li
                      key={exercise.id}
                      className={`rounded-lg border p-4 transition-colors ${
                        editing
                          ? "border-blue-400 ring-2 ring-blue-100"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex flex-wrap items-start gap-3">
                        <span className="flex size-7 flex-none items-center justify-center rounded-md bg-slate-100 text-xs font-semibold tabular-nums text-slate-700">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-slate-500">
                            {taskTypeLabel(exercise.taskType)} ·{" "}
                            {difficultyLabel(exercise.difficulty)}
                          </p>
                          <h3 className="mt-0.5 font-semibold text-slate-950">
                            {exercise.title}
                          </h3>
                          <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-slate-700">
                            {exercise.targetText}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            {exercise.imageUrl && (
                              <span className="inline-flex items-center gap-1">
                                <ImageIcon size={14} aria-hidden="true" /> Có
                                ảnh
                              </span>
                            )}
                            {stimulus && (
                              <span className="inline-flex items-center gap-1">
                                <FileText size={14} aria-hidden="true" />{" "}
                                {stimulus.title || `Thông tin #${stimulus.id}`}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                aria-hidden="true"
                                className={`size-1.5 rounded-full ${exercise.audioUrl ? "bg-emerald-500" : "bg-slate-300"}`}
                              />
                              {exercise.audioUrl
                                ? "Có audio mẫu"
                                : "Chưa có audio mẫu"}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-none items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => move(index, -1)}
                            disabled={
                              published ||
                              index === 0 ||
                              reorderMutation.isPending
                            }
                            aria-label={`Đưa câu ${index + 1} lên trước`}
                            title="Lên trước"
                            className={ICON_BTN}
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => move(index, 1)}
                            disabled={
                              published ||
                              index === exercises.length - 1 ||
                              reorderMutation.isPending
                            }
                            aria-label={`Đưa câu ${index + 1} xuống sau`}
                            title="Xuống sau"
                            className={ICON_BTN}
                          >
                            <ChevronDown size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAutoSuggest(false);
                              setEditingId(exercise.id);
                            }}
                            disabled={published || editing}
                            className={BTN_SECONDARY}
                          >
                            {editing ? "Đang sửa" : "Sửa"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingDelete({
                                id: exercise.id,
                                title: exercise.title,
                              })
                            }
                            disabled={published}
                            aria-label={`Xóa câu ${index + 1}`}
                            className={BTN_DANGER}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {editing && (
                        <SpeakingExerciseForm
                          set={set}
                          exercise={exercise}
                          categories={categories}
                          stimuli={stimuli}
                          defaultCategory={defaultCategory}
                          onDone={() => setEditingId(null)}
                        />
                      )}
                    </li>
                  );
                })}
              </ol>

              <div className="mt-4 border-t border-slate-100 pt-4">
                {editingId === "new" ? (
                  <div className="rounded-lg border border-blue-300 bg-blue-50/30 p-4">
                    <SpeakingExerciseForm
                      set={set}
                      exercise={null}
                      categories={categories}
                      stimuli={stimuli}
                      defaultCategory={defaultCategory}
                      autoSuggest={autoSuggest}
                      onDone={() => {
                        setEditingId(null);
                        setAutoSuggest(false);
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={published}
                      onClick={() => {
                        setAutoSuggest(false);
                        setEditingId("new");
                      }}
                      className={BTN_SECONDARY}
                    >
                      <Plus size={16} /> Thêm câu luyện
                    </button>
                    <button
                      type="button"
                      disabled={published}
                      onClick={() => {
                        setAutoSuggest(true);
                        setEditingId("new");
                      }}
                      title="AI gợi ý 3 câu theo bộ luyện; bạn chọn rồi sửa trước khi thêm."
                      className={BTN_AI}
                    >
                      Thêm câu luyện bằng AI
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
        title={published ? "Chuyển bộ luyện về bản nháp?" : "Xuất bản bộ luyện?"}
        description={
          published
            ? "Bộ luyện sẽ không còn hiển thị cho học viên cho đến khi được xuất bản lại."
            : "Bộ luyện và các câu luyện bên trong sẽ hiển thị cho học viên."
        }
        confirmLabel={published ? "Chuyển về bản nháp" : "Xuất bản"}
        onConfirm={() => {
          setConfirmLifecycle(false);
          publishMutation.mutate();
        }}
        onCancel={() => setConfirmLifecycle(false)}
      />
      {pendingDelete && (
        <ConfirmDialog
          open={true}
          title="Xóa câu luyện"
          description={`Xóa câu "${pendingDelete.title}" khỏi bộ luyện?`}
          confirmLabel="Xóa"
          onConfirm={() => deleteExerciseMutation.mutate(pendingDelete.id)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </main>
  );
}
