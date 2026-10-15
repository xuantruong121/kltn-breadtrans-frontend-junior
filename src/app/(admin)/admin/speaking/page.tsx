"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mic,
  Plus,
  Loader2,
  Search,
  Trash2,
  Edit2,
  Send,
  X,
  Layers,
  ArrowRight,
} from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { Pagination } from "@/components/ui";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getApiErrorMessage } from "@/lib/utils/apiError";

interface SpeakingExercise {
  id: number;
  title: string;
  targetText: string;
  category?: string | null;
  difficulty?: string | null;
  imageUrl?: string | null;
  audioUrl?: string | null;
  publicationStatus?: "DRAFT" | "PUBLISHED";
  order?: number;
}

interface SpeakingPracticeSet {
  id: string;
  title: string;
  description?: string | null;
  level?: string | null;
  category?: string | null;
  publicationStatus: "DRAFT" | "PUBLISHED";
  exercises: SpeakingExercise[];
  createdAt?: string;
  updatedAt?: string;
}

const CATEGORIES = [
  { value: "COMMUNICATION", label: "Giao tiếp hàng ngày (Communication)" },
  { value: "BUSINESS", label: "Tiếng Anh công sở (Business)" },
  { value: "ACADEMIC", label: "Học thuật & Thuyết trình (Academic)" },
  { value: "DAILY_LIFE", label: "Đời sống & Gia đình (Daily Life)" },
  { value: "TRAVEL", label: "Du lịch & Nhà hàng (Travel)" },
  { value: "INTERVIEW", label: "Phỏng vấn xin việc (Interview)" },
];

const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: "Cơ bản",
  INTERMEDIATE: "Trung cấp",
  ADVANCED: "Nâng cao",
};
const STATUS_LABELS = { DRAFT: "Bản nháp", PUBLISHED: "Đã xuất bản" } as const;
const levelLabel = (level?: string | null) =>
  LEVEL_LABELS[level || ""] || level?.replace("-", " – ") || "Chưa phân loại";

type SpeakingExerciseForm = {
  title: string;
  targetText: string;
  category: string;
  difficulty: string;
  categoryOverride: boolean;
};

type SpeakingExercisePayload = {
  title: string;
  targetText: string;
  category?: string;
  difficulty?: string;
};

export default function AdminSpeakingPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "DRAFT" | "PUBLISHED"
  >("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Set selected for detail viewing/editing exercises
  const [activeSet, setActiveSet] = useState<SpeakingPracticeSet | null>(null);

  // Set Create/Edit Modal
  const [isSetModalOpen, setIsSetModalOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<SpeakingPracticeSet | null>(
    null,
  );
  const [setForm, setSetForm] = useState({
    title: "",
    description: "",
    category: "COMMUNICATION",
    level: "BEGINNER",
  });

  // Exercise Create/Edit Modal
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] =
    useState<SpeakingExercise | null>(null);
  const [exerciseForm, setExerciseForm] = useState<SpeakingExerciseForm>({
    title: "",
    targetText: "",
    category: "COMMUNICATION",
    difficulty: "BEGINNER",
    categoryOverride: false,
  });

  // Delete confirmations
  const [pendingDeleteSet, setPendingDeleteSet] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [pendingDeleteExercise, setPendingDeleteExercise] = useState<{
    setId: string;
    exerciseId: number;
    title: string;
  } | null>(null);
  const [pendingLifecycle, setPendingLifecycle] =
    useState<SpeakingPracticeSet | null>(null);

  // QUERY SPEAKING PRACTICE SETS
  const { data: sets = [], isLoading } = useQuery<SpeakingPracticeSet[]>({
    queryKey: ["admin-speaking-sets"],
    queryFn: async () => {
      const res: any = await axiosClient.get("/admin/skill-content/speaking");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  // Keep activeSet in sync when data updates
  const currentActiveSet = activeSet
    ? sets.find((s) => s.id === activeSet.id) || null
    : null;

  // MUTATION: SAVE SET (CREATE OR UPDATE)
  const saveSetMutation = useMutation({
    mutationFn: async (dto: typeof setForm) => {
      if (editingSet) {
        return axiosClient.patch(
          `/admin/skill-content/speaking/${editingSet.id}`,
          dto,
        );
      } else {
        return axiosClient.post("/admin/skill-content/speaking", dto);
      }
    },
    onSuccess: () => {
      toast.success(
        editingSet ? "Đã cập nhật bộ luyện nói!" : "Đã tạo bộ luyện nói mới!",
      );
      setIsSetModalOpen(false);
      setEditingSet(null);
      queryClient.invalidateQueries({ queryKey: ["admin-speaking-sets"] });
    },
    onError: (err: any) => {
      toast.error(getApiErrorMessage(err, "Không thể lưu bộ luyện nói."));
    },
  });

  // MUTATION: DELETE SET
  const deleteSetMutation = useMutation({
    mutationFn: async (id: string) => {
      return axiosClient.delete(`/admin/skill-content/speaking/${id}`);
    },
    onSuccess: () => {
      toast.success("Đã xóa bộ luyện nói!");
      if (activeSet?.id === pendingDeleteSet?.id) {
        setActiveSet(null);
      }
      setPendingDeleteSet(null);
      queryClient.invalidateQueries({ queryKey: ["admin-speaking-sets"] });
    },
    onError: (err: any) => {
      toast.error(getApiErrorMessage(err, "Không thể xóa bộ luyện nói."));
    },
  });

  // MUTATION: PUBLISH SET
  const publishSetMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "DRAFT" | "PUBLISHED";
    }) => {
      return axiosClient.post(`/admin/skill-content/speaking/${id}/publish`, {
        status,
      });
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.status === "PUBLISHED"
          ? "Đã xuất bản bộ luyện nói thành công!"
          : "Đã chuyển bộ luyện nói về bản nháp!",
      );
      queryClient.invalidateQueries({ queryKey: ["admin-speaking-sets"] });
    },
    onError: (err: any) => {
      toast.error(
        getApiErrorMessage(err, "Không thể thay đổi trạng thái xuất bản."),
      );
    },
  });

  // MUTATION: SAVE EXERCISE (CREATE OR UPDATE)
  const saveExerciseMutation = useMutation({
    mutationFn: async ({
      setId,
      dto,
    }: {
      setId: string;
      dto: SpeakingExercisePayload;
    }) => {
      if (editingExercise) {
        return axiosClient.patch(
          `/admin/skill-content/speaking/${setId}/exercises/${editingExercise.id}`,
          dto,
        );
      } else {
        return axiosClient.post(
          `/admin/skill-content/speaking/${setId}/exercises`,
          dto,
        );
      }
    },
    onSuccess: () => {
      toast.success(
        editingExercise
          ? "Đã cập nhật câu luyện nói!"
          : "Đã thêm câu luyện mới!",
      );
      setIsExerciseModalOpen(false);
      setEditingExercise(null);
      queryClient.invalidateQueries({ queryKey: ["admin-speaking-sets"] });
    },
    onError: (err: any) => {
      toast.error(getApiErrorMessage(err, "Không thể lưu câu luyện nói."));
    },
  });

  // MUTATION: DELETE EXERCISE
  const deleteExerciseMutation = useMutation({
    mutationFn: async ({
      setId,
      exerciseId,
    }: {
      setId: string;
      exerciseId: number;
    }) => {
      return axiosClient.delete(
        `/admin/skill-content/speaking/${setId}/exercises/${exerciseId}`,
      );
    },
    onSuccess: () => {
      toast.success("Đã xóa câu luyện nói!");
      setPendingDeleteExercise(null);
      queryClient.invalidateQueries({ queryKey: ["admin-speaking-sets"] });
    },
    onError: (err: any) => {
      toast.error(getApiErrorMessage(err, "Không thể xóa câu luyện nói."));
    },
  });

  // Filter sets
  const filteredSets = sets.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.category || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = levelFilter === "ALL" || s.level === levelFilter;
    const matchesStatus =
      statusFilter === "ALL" || s.publicationStatus === statusFilter;
    return matchesSearch && matchesLevel && matchesStatus;
  });
  const levelOptions = Array.from(
    new Set(
      sets
        .map((set) => set.level)
        .filter((level): level is string => Boolean(level)),
    ),
  ).sort();

  const totalPages = Math.ceil(filteredSets.length / pageSize) || 1;
  const paginatedSets = filteredSets.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const openCreateSet = () => {
    setEditingSet(null);
    setSetForm({
      title: "",
      description: "",
      category: "COMMUNICATION",
      level: "BEGINNER",
    });
    setIsSetModalOpen(true);
  };

  const openEditSet = (s: SpeakingPracticeSet) => {
    setEditingSet(s);
    setSetForm({
      title: s.title || "",
      description: s.description || "",
      category: s.category || "COMMUNICATION",
      level: s.level || "BEGINNER",
    });
    setIsSetModalOpen(true);
  };

  const openAddExercise = (s: SpeakingPracticeSet) => {
    setActiveSet(s);
    setEditingExercise(null);
    setExerciseForm({
      title: "",
      targetText: "",
      category: s.category || "COMMUNICATION",
      difficulty: LEVELS.includes(s.level || "")
        ? s.level || "BEGINNER"
        : "BEGINNER",
      categoryOverride: false,
    });
    setIsExerciseModalOpen(true);
  };

  const openEditExercise = (ex: SpeakingExercise) => {
    setEditingExercise(ex);
    const parentCategory = currentActiveSet?.category || "COMMUNICATION";
    setExerciseForm({
      title: ex.title || "",
      targetText: ex.targetText || "",
      category: ex.category || parentCategory,
      difficulty: ex.difficulty || "BEGINNER",
      categoryOverride: Boolean(ex.category && ex.category !== parentCategory),
    });
    setIsExerciseModalOpen(true);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Mic size={14} className="text-slate-700" /> Skill CMS · Speaking
            Studio
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Quản Lý Bộ Luyện Phát Âm (Speaking CMS)
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Mô hình cấu trúc: Mỗi Bộ luyện (Practice Set) chứa nhiều Câu luyện
            nói (Speaking Exercises) được đánh giá theo chuẩn Azure.
          </p>
        </div>

        <button
          onClick={openCreateSet}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
        >
          <Plus size={15} /> Tạo bộ luyện
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative flex-1 min-w-60">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Tìm kiếm bộ luyện nói theo tên, chủ đề..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">
            Trình độ:
          </label>
          <select
            value={levelFilter}
            onChange={(e) => {
              setLevelFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-slate-400"
          >
            <option value="ALL">Tất cả trình độ</option>
            {levelOptions.map((level) => (
              <option key={level} value={level}>
                {levelLabel(level)}
              </option>
            ))}
          </select>
          <label className="text-xs font-medium text-slate-500">
            Trạng thái:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-slate-400"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="PUBLISHED">Đã xuất bản</option>
          </select>
        </div>
      </div>

      {/* PRACTICE SETS LIST */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      ) : paginatedSets.length > 0 ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {paginatedSets.map((set) => (
              <div
                key={set.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                        {levelLabel(set.level)}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        {CATEGORIES.find((item) => item.value === set.category)
                          ?.label ||
                          set.category ||
                          "Tổng quát"}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900">
                      {set.title}
                    </h2>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {set.description || "Chưa có mô tả cho bộ luyện tập này."}
                    </p>
                  </div>

                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold shrink-0 ${
                      set.publicationStatus === "PUBLISHED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {STATUS_LABELS[set.publicationStatus]}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">
                    {set.exercises?.length || 0} câu luyện
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveSet(set)}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                    >
                      Mở bộ luyện <ArrowRight size={13} />
                    </button>
                    <button
                      onClick={() => openEditSet(set)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Edit2 size={13} /> Chỉnh sửa
                    </button>
                    <button
                      onClick={() => setPendingLifecycle(set)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Send size={13} />{" "}
                      {set.publicationStatus === "PUBLISHED"
                        ? "Chuyển về bản nháp"
                        : "Xuất bản"}
                    </button>
                    <button
                      onClick={() =>
                        setPendingDeleteSet({ id: set.id, title: set.title })
                      }
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-colors"
                      title="Xóa bộ"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pt-2">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
          <Layers size={32} className="mx-auto mb-2 text-slate-300" />
          Chưa có bộ luyện nói nào phù hợp. Hãy nhấn &quot;Tạo bộ luyện nói
          mới&quot; để bắt đầu.
        </div>
      )}

      {/* DETAIL MODAL / DRAWER: MANAGE CHILD EXERCISES OF A SET */}
      {currentActiveSet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
                    {currentActiveSet.level || "BEGINNER"}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {currentActiveSet.category || "COMMUNICATION"}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                      currentActiveSet.publicationStatus === "PUBLISHED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {currentActiveSet.publicationStatus}
                  </span>
                </div>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {currentActiveSet.title}
                </h2>
                <p className="text-xs text-slate-500">
                  Danh sách câu luyện nói học viên sẽ thực hành lần lượt trong
                  bộ này.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAddExercise(currentActiveSet)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                >
                  <Plus size={14} /> Thêm câu luyện
                </button>
                <button
                  onClick={() => setActiveSet(null)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {currentActiveSet.publicationStatus === "PUBLISHED" &&
            currentActiveSet.exercises.some(
              (exercise) => exercise.publicationStatus === "DRAFT",
            ) ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-900">
                <p className="font-semibold">
                  Có câu luyện đang ở trạng thái Bản nháp.
                </p>
                <p className="mt-0.5 text-amber-800">
                  Các câu này chưa xuất hiện với học viên. Bộ luyện xuất bản
                  theo cả bộ; hãy chuyển bộ về bản nháp, kiểm tra nội dung rồi
                  xuất bản lại để đưa các câu mới vào runtime học viên.
                </p>
              </div>
            ) : null}

            {/* EXERCISES LIST */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {currentActiveSet.exercises &&
              currentActiveSet.exercises.length > 0 ? (
                currentActiveSet.exercises.map((ex, idx) => (
                  <div
                    key={ex.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-60">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-100 text-xs font-bold text-slate-700">
                        #{idx + 1}
                      </span>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            {ex.title}
                          </h3>
                          <span className="rounded bg-slate-50 px-1.5 py-0.2 text-[11px] font-medium text-slate-600 border border-slate-200">
                            {levelLabel(ex.difficulty)}
                          </span>
                          <span
                            className={`rounded border px-1.5 py-0.2 text-[11px] font-semibold ${
                              ex.publicationStatus === "PUBLISHED"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-amber-200 bg-amber-50 text-amber-800"
                            }`}
                          >
                            {STATUS_LABELS[ex.publicationStatus ?? "DRAFT"]}
                          </span>
                        </div>
                        <p className="text-sm font-mono text-slate-800 bg-slate-50 px-3 py-1.5 rounded border border-slate-100">
                          &quot;{ex.targetText}&quot;
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditExercise(ex)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Edit2 size={12} /> Chỉnh sửa
                      </button>
                      <button
                        onClick={() =>
                          setPendingDeleteExercise({
                            setId: currentActiveSet.id,
                            exerciseId: ex.id,
                            title: ex.title,
                          })
                        }
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-colors"
                        title="Xóa câu luyện"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
                  <Mic size={36} className="text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">
                    Chưa có câu luyện nói nào
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Hãy nhấn &quot;Thêm câu luyện mới&quot; để bổ sung câu mẫu
                    tiếng Anh cho học viên luyện tập và chấm điểm Azure.
                  </p>
                  <button
                    onClick={() => openAddExercise(currentActiveSet)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                  >
                    <Plus size={14} /> Thêm câu luyện đầu tiên
                  </button>
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="flex items-center justify-between border-t border-slate-100 p-4 text-xs text-slate-500 bg-slate-50/50 rounded-b-2xl">
              <span>
                Đang quản lý bộ: <strong>{currentActiveSet.title}</strong>
              </span>
              <button
                onClick={() => setActiveSet(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT SET MODAL */}
      {isSetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingSet ? "Chỉnh sửa bộ luyện" : "Tạo bộ luyện"}
              </h3>
              <button
                onClick={() => setIsSetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!setForm.title.trim()) {
                  toast.error("Vui lòng nhập tên bộ luyện.");
                  return;
                }
                saveSetMutation.mutate(setForm);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Tên bộ luyện nói *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Giao tiếp thường ngày — Trình độ A1"
                  value={setForm.title}
                  onChange={(e) =>
                    setSetForm({ ...setForm, title: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Trình độ mục tiêu
                </label>
                <select
                  value={setForm.level}
                  onChange={(e) =>
                    setSetForm({ ...setForm, level: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                >
                  {LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Chủ đề phân loại
                </label>
                <select
                  value={setForm.category}
                  onChange={(e) =>
                    setSetForm({ ...setForm, category: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Mô tả ngắn
                </label>
                <textarea
                  rows={3}
                  placeholder="Giới thiệu mục tiêu luyện phát âm của bộ bài tập này..."
                  value={setForm.description}
                  onChange={(e) =>
                    setSetForm({ ...setForm, description: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSetModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saveSetMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saveSetMutation.isPending ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : null}
                  {editingSet ? "Lưu thay đổi" : "Tạo bộ luyện"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT EXERCISE MODAL */}
      {isExerciseModalOpen && currentActiveSet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingExercise ? "Chỉnh sửa câu luyện" : "Thêm câu luyện"}
              </h3>
              <button
                onClick={() => setIsExerciseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  !exerciseForm.title.trim() ||
                  !exerciseForm.targetText.trim()
                ) {
                  toast.error(
                    "Vui lòng nhập đầy đủ tiêu đề và câu mẫu tiếng Anh.",
                  );
                  return;
                }
                saveExerciseMutation.mutate({
                  setId: currentActiveSet.id,
                  dto: {
                    title: exerciseForm.title,
                    targetText: exerciseForm.targetText,
                    ...(exerciseForm.categoryOverride
                      ? { category: exerciseForm.category }
                      : {}),
                    difficulty: exerciseForm.difficulty,
                  },
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Tiêu đề câu luyện *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Giới thiệu bản thân và nghề nghiệp"
                  value={exerciseForm.title}
                  onChange={(e) =>
                    setExerciseForm({ ...exerciseForm, title: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Câu mẫu tiếng Anh (Target Text) *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ví dụ: Hello, my name is Alex and I am a software engineer."
                  value={exerciseForm.targetText}
                  onChange={(e) =>
                    setExerciseForm({
                      ...exerciseForm,
                      targetText: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 outline-none focus:border-slate-500"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Học viên sẽ ghi âm câu này. Hệ thống Azure sẽ chấm điểm
                  Accuracy, Fluency, Completeness, PronScore.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700">
                    Cấp độ
                  </label>
                  <select
                    value={exerciseForm.difficulty}
                    onChange={(e) =>
                      setExerciseForm({
                        ...exerciseForm,
                        difficulty: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                  >
                    {LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {levelLabel(lvl)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Cấp độ chi tiết của câu; bộ luyện dùng dải trình độ tổng quát.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">
                    Chủ đề
                  </label>
                  {!exerciseForm.categoryOverride ? (
                    <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {CATEGORIES.find(
                        (item) => item.value === currentActiveSet.category,
                      )?.label || currentActiveSet.category || "Tổng quát"}
                      <span className="ml-1 text-xs text-slate-400">
                        · kế thừa từ bộ luyện
                      </span>
                    </div>
                  ) : (
                    <select
                      value={exerciseForm.category}
                      onChange={(e) =>
                        setExerciseForm({
                          ...exerciseForm,
                          category: e.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  )}
                  <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                    <input
                      type="checkbox"
                      checked={exerciseForm.categoryOverride}
                      onChange={(e) =>
                        setExerciseForm({
                          ...exerciseForm,
                          categoryOverride: e.target.checked,
                          category: e.target.checked
                            ? exerciseForm.category
                            : currentActiveSet.category || "COMMUNICATION",
                        })
                      }
                      className="rounded border-slate-300"
                    />
                    Dùng chủ đề riêng cho câu này
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExerciseModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saveExerciseMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saveExerciseMutation.isPending ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : null}
                  {editingExercise ? "Lưu thay đổi" : "Thêm câu luyện"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE SET */}
      {pendingDeleteSet && (
        <ConfirmDialog
          open={true}
          title="Xóa bộ luyện nói"
          description={`Bạn có chắc muốn xóa bộ luyện "${pendingDeleteSet.title}"? Mọi câu luyện nói bên trong sẽ bị xóa.`}
          confirmLabel="Xác nhận xóa"
          onConfirm={() => deleteSetMutation.mutate(pendingDeleteSet.id)}
          onCancel={() => setPendingDeleteSet(null)}
        />
      )}

      {pendingLifecycle && (
        <ConfirmDialog
          open={true}
          title={
            pendingLifecycle.publicationStatus === "PUBLISHED"
              ? "Chuyển bộ luyện về bản nháp?"
              : "Xuất bản bộ luyện?"
          }
          description={
            pendingLifecycle.publicationStatus === "PUBLISHED"
              ? "Bộ luyện sẽ không còn hiển thị cho người học cho đến khi được xuất bản lại."
              : "Bộ luyện và các câu luyện bên trong sẽ hiển thị cho người học."
          }
          confirmLabel={
            pendingLifecycle.publicationStatus === "PUBLISHED"
              ? "Chuyển về bản nháp"
              : "Xuất bản"
          }
          onConfirm={() => {
            publishSetMutation.mutate({
              id: pendingLifecycle.id,
              status:
                pendingLifecycle.publicationStatus === "PUBLISHED"
                  ? "DRAFT"
                  : "PUBLISHED",
            });
            setPendingLifecycle(null);
          }}
          onCancel={() => setPendingLifecycle(null)}
        />
      )}

      {/* CONFIRM DELETE EXERCISE */}
      {pendingDeleteExercise && (
        <ConfirmDialog
          open={true}
          title="Xóa câu luyện nói"
          description={`Bạn có chắc muốn xóa câu "${pendingDeleteExercise.title}" khỏi bộ luyện?`}
          confirmLabel="Xác nhận xóa"
          onConfirm={() =>
            deleteExerciseMutation.mutate({
              setId: pendingDeleteExercise.setId,
              exerciseId: pendingDeleteExercise.exerciseId,
            })
          }
          onCancel={() => setPendingDeleteExercise(null)}
        />
      )}
    </div>
  );
}
