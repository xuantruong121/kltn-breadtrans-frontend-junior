"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AdminImageThumb } from "@/components/admin/AdminImageThumb";
import { speakingSetDisplayTitle } from "@/lib/catalog/displayTitles";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  FileText,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
  Volume2,
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
import { TrackTagField } from "../TrackTagField";
import { TRACK_FIELD_COPY } from "../skillCmsStatus";
import { ADMIN_LEARNING_TRACKS_KEY, useLearningTracks } from "@/lib/learning-path/useLearningTracks";
import { TERMS } from "@/lib/ui/terms";
import SpeakingExerciseForm from "./SpeakingExerciseForm";
import {
  EXERCISE_LEVELS,
  LEVELS,
  STATUS_LABELS,
  TASK_TYPES,
  difficultyLabel,
  levelLabel,
  unwrap,
  type SpeakingExerciseSuggestion,
  type SpeakingFullDraft,
  type SpeakingPracticeSet,
  type SpeakingPracticeSetSuggestion,
  type SpeakingStimulus,
} from "./speakingCmsShared";
import {
  countBy,
  describeValidationError,
  referenceAudioWarning,
  speakingSetChecklist,
} from "./speakingSetStatus";
import {
  addDraftExercises,
  draftExerciseProblem,
  draftFailureToast,
  formAfterDraft,
  type DraftFailure,
} from "./speakingDraftLogic";

/**
 * Drafted exercises the server refused, per set. A new set hands them over
 * to the editor it opens next, so the page that lists them is the saved set.
 */
const draftFailuresKey = (setId?: string) => ["admin-speaking-draft-failures", setId];

type SetForm = {
  title: string;
  description: string;
  level: string;
};

/** The set fields of an AI suggestion or draft; its track is kept apart. */
const setFormOf = ({ title, description, level }: SetForm): SetForm => ({ title, description, level });

const FIELD =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50";
const ICON_BTN =
  "inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed";
const taskTypeLabel = (value?: string | null) =>
  TASK_TYPES.find((task) => task.value === value)?.label ?? value ?? "—";

/** Loads the set, then renders the editor once (keyed by id) so its form starts from the saved values. */
export default function SpeakingSetEditor({ id }: { id?: string }) {
  const { data: set, isLoading, isError, error } = useQuery<SpeakingPracticeSet>({
    queryKey: ["admin-speaking-set", id],
    enabled: Boolean(id),
    retry: false,
    queryFn: async () =>
      unwrap<SpeakingPracticeSet>(
        await axiosClient.get(`/admin/skill-content/speaking/${id}`),
      ),
  });
  // A wrong or deleted id used to spin forever (admin review 2026-11-17).
  if (id && isError)
    return (
      <div className="max-w-xl py-10">
        <h1 className="text-xl font-semibold text-slate-900">Không mở được bộ luyện nói</h1>
        <p className="mt-2 text-sm text-slate-600">
          {getApiErrorMessage(error, "Không tải được bộ luyện này.")} Bộ luyện có thể đã bị xoá,
          hoặc đường dẫn không đúng.
        </p>
        <Link
          href="/admin/speaking"
          className="mt-4 inline-block text-sm font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-800"
        >
          Về danh sách bộ luyện nói
        </Link>
      </div>
    );
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
  // Opened from "Tạo bằng AI" on the list (owner 2026-11-19): the AI needs a name first.
  const searchParams = useSearchParams();
  const aiStart = !set && searchParams.get("ai") === "1";
  useEffect(() => {
    if (aiStart) document.getElementById("speaking-set-title")?.focus();
  }, [aiStart]);

  // Lĩnh vực replaces Phân loại (2026-11-21): the AI drafts for an active
  // track, and a set created from such a draft is tagged with it.
  const { data: activeTracks = [] } = useLearningTracks();
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
  /** The track the AI writes for; "" is "Không chọn". */
  const [aiTrack, setAiTrack] = useState("");
  /** The track of the AI suggestion or draft in the form, tagged when the new set is created. */
  const [draftTrack, setDraftTrack] = useState<string | null>(null);
  const trackName = (code: string) => activeTracks.find((track) => track.code === code)?.name ?? code;
  const [confirmLifecycle, setConfirmLifecycle] = useState(false);
  const [playing, setPlaying] = useState<{ id: number; url: string } | null>(
    null,
  );
  const [audioBusyId, setAudioBusyId] = useState<number | null>(null);
  const [audioBatch, setAudioBatch] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: number;
    title: string;
  } | null>(null);
  /**
   * After a save that added drafted exercises: how many exercises the set
   * has once reloaded, then their reference audio is made. A new set arrives
   * with ?audio=1 (owner 2026-11-25).
   */
  const [autoAudioAt, setAutoAudioAt] = useState<number | null>(
    set && searchParams.get("audio") === "1" ? 0 : null,
  );
  // Strict mode runs an effect twice: the audio is made once.
  const autoAudioStarted = useRef(false);

  // Leaving with unsaved set details asks first.
  useEffect(() => {
    if (!dirty && !pendingExercises.length) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pendingExercises.length]);

  // Filled only by saveMutation below; never fetched.
  const { data: draftFailures = [] } = useQuery<DraftFailure[]>({
    queryKey: draftFailuresKey(set?.id),
    queryFn: () => [],
    enabled: false,
    staleTime: Infinity,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-speaking-set", set?.id] });
    queryClient.invalidateQueries({
      queryKey: ["admin-speaking-validate", set?.id],
    });
    queryClient.invalidateQueries({ queryKey: ["admin-speaking-sets"] });
  };

  /** The set this page created, until the router opens its editor. */
  const [createdId, setCreatedId] = useState<string | null>(null);
  const saveMutation = useMutation({
    mutationFn: async () => {
      const dto = setFormOf(form);
      // A set created a moment ago is saved again, never created twice.
      let setId = set?.id ?? createdId ?? undefined;
      let tagError: unknown = null;
      if (setId) {
        await axiosClient.patch(`/admin/skill-content/speaking/${setId}`, dto);
      } else {
        const created = unwrap<{ id: string }>(
          await axiosClient.post("/admin/skill-content/speaking", dto),
        );
        if (!created?.id) throw new Error("Không nhận được mã bộ luyện mới.");
        setId = created.id;
        setCreatedId(created.id);
        // Creating a set takes no track: tag it with the draft's one. The set
        // exists either way, so a refusal here is reported, not thrown.
        if (draftTrack) {
          try {
            await axiosClient.put(`/admin/skill-content/speaking/${setId}/tracks`, {
              tracks: [draftTrack],
            });
          } catch (error) {
            tagError = error;
          }
        }
      }
      // The set exists from here on: a refused exercise is reported, not
      // thrown, so the page moves to the saved set and cannot create it twice
      // (QA 2026-11-22).
      const failures = await addDraftExercises(
        pendingExercises,
        exercises.length,
        (body) => axiosClient.post(`/admin/skill-content/speaking/${setId}/exercises`, body),
        (error) => getApiErrorMessage(error, "Không thể thêm câu luyện này."),
      );
      const added = pendingExercises.length - failures.length;
      return { setId, dto, tagError, failures, added };
    },
    onSuccess: ({ setId, dto, tagError, failures, added }) => {
      toast.success(set ? "Đã lưu bộ luyện." : "Đã tạo bộ luyện.");
      // Drafted exercises go on to get their reference audio (owner
      // 2026-11-25), as a saved Listening lesson makes its audio.
      if (set && added > 0) setAutoAudioAt(exercises.length + added);
      if (tagError) toast.error(getApiErrorMessage(tagError, TRACK_FIELD_COPY.saveError));
      const failureToast = draftFailureToast(failures);
      if (failureToast) toast.error(failureToast, { duration: 8000 });
      queryClient.setQueryData<DraftFailure[]>(draftFailuresKey(setId), failures);
      setSavedForm(dto);
      setForm(dto);
      setPendingExercises([]);
      setDraftTrack(null);
      refresh();
      // The Lĩnh vực page counts the sets tagged with each track.
      if (!set && draftTrack) queryClient.invalidateQueries({ queryKey: ADMIN_LEARNING_TRACKS_KEY });
      if (!set) router.replace(`/admin/speaking/${setId}${added > 0 ? "?audio=1" : ""}`);
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

  /** The learner endpoint returns a public or signed URL, admins included. */
  const playReference = async (exerciseId: number) => {
    try {
      const data = unwrap<{ audioUrl?: string | null }>(
        await axiosClient.get(`/speaking/exercises/${exerciseId}`),
      );
      if (!data?.audioUrl) {
        toast.error("Câu này chưa có audio mẫu.");
        return;
      }
      setPlaying({ id: exerciseId, url: data.audioUrl });
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Không thể phát audio mẫu."));
    }
  };

  /** Azure reads the sample sentence; the clip replaces the old reference. */
  const makeReference = async (exerciseId: number, quiet = false) => {
    setAudioBusyId(exerciseId);
    try {
      await axiosClient.post(
        `/admin/skill-content/speaking/${set!.id}/exercises/${exerciseId}/reference-audio`,
      );
      if (!quiet) toast.success("Đã tạo audio mẫu.");
      return true;
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Không thể tạo audio mẫu."));
      return false;
    } finally {
      setAudioBusyId(null);
    }
  };

  const makeMissingReferences = async (ids: number[]) => {
    let made = 0;
    for (const [index, exerciseId] of ids.entries()) {
      setAudioBatch({ done: index, total: ids.length });
      if (!(await makeReference(exerciseId, true))) break;
      made++;
    }
    setAudioBatch(null);
    if (made) toast.success(`Đã tạo audio mẫu cho ${made} câu.`);
    refresh();
  };

  const move = (index: number, direction: -1 | 1) => {
    const ids = exercises.map((exercise) => exercise.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderMutation.mutate(ids);
  };

  const suggestSetMutation = useMutation({
    mutationFn: async () => {
      const topic = form.title.trim() || form.description.trim() || (aiTrack ? trackName(aiTrack) : "");
      if (!topic) throw new Error("Nhập tên, mô tả hoặc chọn lĩnh vực trước.");
      return axiosClient.post("/admin/speaking/ai/suggest-practice-set", {
        topic,
        level: form.level,
        track: aiTrack || undefined,
        currentTitle: form.title || undefined,
        currentDescription: form.description || undefined,
      });
    },
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
          track: aiTrack || undefined,
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

  const checklist = speakingSetChecklist({ title: form.title, exercises });
  const doneCount = checklist.filter((item) => item.done).length;
  const serverErrors = (validation?.errors ?? []).map((error) =>
    describeValidationError(error, exercises),
  );
  const draftLocked = exercises.length > 0 || published;
  const missingAudio = exercises
    .filter((exercise) => !exercise.audioUrl)
    .map((exercise) => exercise.id);
  const audioWarning = set ? referenceAudioWarning(exercises) : null;
  const busy = saveMutation.isPending || publishMutation.isPending;

  // The saved set has its drafted exercises: make their reference audio.
  useEffect(() => {
    if (autoAudioAt === null || autoAudioStarted.current || !set || audioBatch) return;
    if (exercises.length < autoAudioAt) return;
    autoAudioStarted.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- runs once per save, then clears
    setAutoAudioAt(null);
    if (searchParams.get("audio") === "1")
      router.replace(`/admin/speaking/${set.id}`, { scroll: false });
    void (missingAudio.length ? makeMissingReferences(missingAudio) : Promise.resolve()).finally(() => {
      autoAudioStarted.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the helpers are rebuilt each render; run when the saved set is ready
  }, [autoAudioAt, set, exercises.length, audioBatch]);

  const save = () => {
    if (!form.title.trim()) {
      toast.error("Cần nhập tên bộ luyện.");
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="space-y-6 p-6">
      <Link
        href="/admin/speaking"
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400"
      >
        <ArrowLeft size={16} /> Danh sách
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">
            {set
              ? speakingSetDisplayTitle(set.id, set.title)
              : "Tạo bộ luyện nói"}
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
            onClick={save}
            disabled={busy}
            // An applied AI draft waits for Lưu: it is the next step (owner 2026-11-25).
            className={`${pendingExercises.length ? BTN_PRIMARY : BTN_SECONDARY} ${published ? "invisible" : ""}`}
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

      {pendingExercises.length > 0 && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
        >
          <p className="text-sm text-amber-900">
            <span className="font-semibold">Bản nháp AI đã vào biểu mẫu nhưng chưa được lưu.</span>{" "}
            Bấm {set ? "Lưu" : "Tạo bộ luyện"} để lưu bộ cùng {pendingExercises.length} câu luyện. Audio
            mẫu sẽ tự tạo sau khi lưu.
          </p>
          <button type="button" onClick={save} disabled={busy} className={BTN_PRIMARY}>
            <Save size={16} /> Lưu ngay
          </button>
        </div>
      )}

      {/* Two columns from 1280px: the set and its exercises on the left; a
          400px rail with the checklist and the overview (24px gap). */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start [&>*]:min-w-0">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-start-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-950">Thông tin bộ luyện</h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => suggestSetMutation.mutate()}
                disabled={suggestSetMutation.isPending}
                title="AI gợi ý tên, mô tả và trình độ; bạn xem lại trước khi dùng."
                className={`${BTN_SECONDARY} ${published ? "invisible" : ""}`}
              >
                {suggestSetMutation.isPending && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                Gợi ý tên & mô tả
              </button>
              {!published && (
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                  {TERMS.track}
                  <select
                    aria-label="Lĩnh vực cho gợi ý và bản nháp AI"
                    value={aiTrack}
                    onChange={(event) => setAiTrack(event.target.value)}
                    className="min-h-10 max-w-56 rounded-lg border border-slate-300 bg-white px-2 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="">Không chọn</option>
                    {activeTracks.map((track) => (
                      <option key={track.code} value={track.code}>
                        {track.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
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
                disabled={fullDraftMutation.isPending}
                title={
                  draftLocked
                    ? "Bộ đã có câu luyện — dùng ‘Thêm câu luyện bằng AI’"
                    : "Dùng Tên và Trình độ bên dưới; bản nháp hiện ra để xem lại."
                }
                className={`${BTN_AI} ${draftLocked ? "invisible" : ""}`}
              >
                {fullDraftMutation.isPending && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                Soạn cả bộ bằng AI
              </button>
            </div>
          </div>
          {aiStart && (
            <p className="mt-2 text-sm text-amber-800">
              Nhập tên bộ (chủ đề) và trình độ bên dưới, rồi bấm “Soạn cả bộ bằng AI”.
            </p>
          )}
          {exercises.length > 0 && !published && (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
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
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {levelLabel(setSuggestion.level)}
                {setSuggestion.track && ` · ${trackName(setSuggestion.track)}`}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setForm(setFormOf(setSuggestion));
                    setDraftTrack(setSuggestion.track ?? null);
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
                id="speaking-set-title"
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
            {!set && draftTrack && (
              <p className="text-sm text-slate-600 md:col-span-2">
                Khi tạo, bộ luyện được gắn lĩnh vực {trackName(draftTrack)} như bản nháp AI.
              </p>
            )}
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
                {fullDraft.exercises.map((candidate, index) => {
                  // The server would refuse it: no checkbox, the reason instead.
                  const problem = draftExerciseProblem(candidate);
                  return (
                    <li
                      key={`${candidate.title}-${index}`}
                      className={`flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 ${candidate.excluded && !problem ? "opacity-50" : ""}`}
                    >
                      {problem ? (
                        <AlertTriangle
                          size={16}
                          strokeWidth={2}
                          className="mt-1 flex-none text-amber-600"
                          aria-hidden="true"
                        />
                      ) : (
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
                      )}
                      <div className="min-w-0">
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {taskTypeLabel(candidate.taskType)} ·{" "}
                          {difficultyLabel(candidate.difficulty)}
                        </p>
                        <p className="font-semibold text-slate-900">
                          {candidate.title}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-700">
                          {candidate.targetText}
                        </p>
                        {problem && (
                          <p className="mt-1 text-sm font-medium text-amber-800">
                            Không thêm được: {problem}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const chosen = fullDraft.exercises.filter(
                      (candidate) =>
                        !candidate.excluded && !draftExerciseProblem(candidate),
                    );
                    if (!chosen.length) {
                      toast.error("Chọn ít nhất một câu lưu được.");
                      return;
                    }
                    // The name and description the admin typed stay (owner 2026-11-25).
                    setForm((current) => formAfterDraft(current, fullDraft.practiceSet));
                    setDraftTrack(fullDraft.practiceSet.track ?? null);
                    setPendingExercises(chosen);
                    setFullDraft(null);
                    toast.success(
                      `Đã đưa bản nháp vào biểu mẫu, chưa lưu. Bấm ${set ? "Lưu" : "Tạo bộ luyện"} để lưu bộ.`,
                    );
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

        <aside className="space-y-6 xl:sticky xl:top-6 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
          {set && (
            <TrackTagField
              domain="speaking"
              id={set.id}
              tracks={set.tracks ?? []}
              listKey="admin-speaking-sets"
            />
          )}

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
              <span className="text-sm tabular-nums text-slate-600 dark:text-slate-400">
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
            {audioWarning && (
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                {/* Optional help for learners: a warning, not a failed item. */}
                <p className="flex items-center gap-2 text-sm text-amber-800">
                  <AlertTriangle
                    size={16}
                    strokeWidth={2}
                    className="flex-none text-amber-600"
                    aria-hidden="true"
                  />
                  <span>
                    {audioWarning}{" "}
                    <span className="text-slate-600">(không chặn xuất bản)</span>
                  </span>
                </p>
                {!published &&
                  (audioBatch ? (
                    <p className="inline-flex items-center gap-2 text-sm tabular-nums text-slate-700">
                      <Loader2 size={14} className="animate-spin" /> Đang tạo
                      audio mẫu {audioBatch.done + 1}/{audioBatch.total}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void makeMissingReferences(missingAudio)}
                      title="Giọng đọc máy đọc câu mẫu của từng câu chưa có audio, lần lượt."
                      className={BTN_SECONDARY}
                    >
                      <Volume2 size={16} /> Tạo audio mẫu cho{" "}
                      {missingAudio.length} câu
                    </button>
                  ))}
              </div>
            )}
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
              <span className="font-medium tabular-nums text-slate-600 dark:text-slate-400">
                {exercises.length}
              </span>
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Học viên làm lần lượt theo thứ tự này. Bấm Sửa để sửa ngay tại câu.
            </p>
          </div>

          {pendingExercises.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/40 p-3 text-sm text-slate-700">
              {pendingExercises.length} câu từ bản nháp AI sẽ được thêm khi bấm{" "}
              {set ? "Lưu" : "Tạo bộ luyện"}.
            </div>
          )}

          {draftFailures.length > 0 && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-rose-200 bg-rose-50/40 p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-rose-800">
                  {draftFailures.length} câu từ bản nháp AI chưa được thêm
                </p>
                <button
                  type="button"
                  onClick={() =>
                    queryClient.setQueryData<DraftFailure[]>(draftFailuresKey(set?.id), [])
                  }
                  className="cursor-pointer text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                  Ẩn
                </button>
              </div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-rose-800">
                {draftFailures.map((failure, index) => (
                  <li key={`${failure.title}-${index}`}>
                    “{failure.title}”: {failure.reason}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-slate-600">
                Bộ luyện đã được lưu. Thêm lại các câu này bằng “Thêm câu luyện”.
              </p>
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
                        {exercise.imageUrl && (
                          <AdminImageThumb
                            src={exercise.imageUrl}
                            alt={exercise.title}
                            className="h-40 w-full"
                          />
                        )}
                        <span className="flex size-7 flex-none items-center justify-center rounded-md bg-slate-100 text-xs font-semibold tabular-nums text-slate-700">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-[1_1_12rem]">
                          <p className="text-sm text-slate-600">
                            {taskTypeLabel(exercise.taskType)} ·{" "}
                            {difficultyLabel(exercise.difficulty)}
                          </p>
                          <h3 className="mt-0.5 font-semibold text-slate-950">
                            {exercise.title}
                          </h3>
                          <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-slate-700">
                            {exercise.targetText}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                            {stimulus && (
                              <span className="inline-flex items-center gap-1">
                                <FileText size={14} aria-hidden="true" />{" "}
                                {stimulus.title || `Thông tin #${stimulus.id}`}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                aria-hidden="true"
                                className={`size-1.5 rounded-full ${exercise.audioUrl ? "bg-emerald-500" : "bg-amber-500"}`}
                              />
                              {exercise.audioUrl
                                ? "Có audio mẫu"
                                : "Cần tạo audio mẫu"}
                            </span>
                            {exercise.audioUrl && (
                              <button
                                type="button"
                                onClick={() => void playReference(exercise.id)}
                                className="inline-flex min-h-8 cursor-pointer items-center gap-1 font-semibold text-slate-700 hover:text-blue-700"
                              >
                                <Volume2 size={14} aria-hidden="true" /> Nghe
                                thử
                              </button>
                            )}
                            {!published && (
                              <button
                                type="button"
                                disabled={audioBusyId === exercise.id || Boolean(audioBatch)}
                                onClick={async () => {
                                  if (await makeReference(exercise.id)) refresh();
                                }}
                                className="inline-flex min-h-8 cursor-pointer items-center gap-1 font-semibold text-slate-700 hover:text-blue-700 disabled:cursor-not-allowed"
                              >
                                {audioBusyId === exercise.id && (
                                  <Loader2 size={14} className="animate-spin" />
                                )}
                                {exercise.audioUrl
                                  ? "Tạo lại audio mẫu"
                                  : "Tạo audio mẫu"}
                              </button>
                            )}
                          </div>
                          {playing?.id === exercise.id && (
                            <audio
                              controls
                              autoPlay
                              src={playing.url}
                              className="mt-2 w-full max-w-md"
                              aria-label={`Audio mẫu câu ${index + 1}`}
                            />
                          )}
                        </div>
                        <div className="flex flex-none items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => move(index, -1)}
                            disabled={reorderMutation.isPending}
                            aria-label={`Đưa câu ${index + 1} lên trước`}
                            title="Lên trước"
                            className={`${ICON_BTN} ${published || index === 0 ? "invisible" : ""}`}
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => move(index, 1)}
                            disabled={reorderMutation.isPending}
                            aria-label={`Đưa câu ${index + 1} xuống sau`}
                            title="Xuống sau"
                            className={`${ICON_BTN} ${published || index === exercises.length - 1 ? "invisible" : ""}`}
                          >
                            <ChevronDown size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAutoSuggest(false);
                              setEditingId(exercise.id);
                            }}
                            disabled={editing}
                            className={`${BTN_SECONDARY} ${published ? "invisible" : ""}`}
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
                            aria-label={`Xóa câu ${index + 1}`}
                            className={`${BTN_DANGER} ${published ? "invisible" : ""}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {editing && (
                        <SpeakingExerciseForm
                          set={set}
                          exercise={exercise}
                          stimuli={stimuli}
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
                      stimuli={stimuli}
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
                      onClick={() => {
                        setAutoSuggest(false);
                        setEditingId("new");
                      }}
                      className={`${BTN_SECONDARY} ${published ? "invisible" : ""}`}
                    >
                      <Plus size={16} /> Thêm câu luyện
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAutoSuggest(true);
                        setEditingId("new");
                      }}
                      title="AI gợi ý 3 câu theo bộ luyện; bạn chọn rồi sửa trước khi thêm."
                      className={`${BTN_AI} ${published ? "invisible" : ""}`}
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
    </div>
  );
}
