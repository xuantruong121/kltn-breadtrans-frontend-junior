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
  taskType?: SpeakingTaskType | null;
  stimulusId?: number | null;
  category?: string | null;
  categoryId?: number | null;
  categoryTaxonomy?: SpeakingCategory | null;
  categoryLabel?: string | null;
  difficulty?: string | null;
  imageUrl?: string | null;
  audioUrl?: string | null;
  publicationStatus?: "DRAFT" | "PUBLISHED";
  order?: number;
}

type SpeakingTaskType =
  | "READ_ALOUD"
  | "DESCRIBE_PICTURE"
  | "RESPOND_TO_QUESTION"
  | "RESPOND_USING_INFORMATION"
  | "EXPRESS_OPINION"
  | "PRONUNCIATION_DRILL";

type SpeakingStimulus = {
  id: number;
  kind: "INFORMATION" | "IMAGE";
  title?: string | null;
  content?: string | null;
  imageUrl?: string | null;
  _count?: { exercises: number };
};

interface SpeakingPracticeSet {
  id: string;
  title: string;
  description?: string | null;
  level?: string | null;
  category?: string | null;
  categoryId?: number;
  categoryTaxonomy?: SpeakingCategory | null;
  publicationStatus: "DRAFT" | "PUBLISHED";
  exercises: SpeakingExercise[];
  createdAt?: string;
  updatedAt?: string;
}

interface SpeakingCategory {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
  allowPracticeSet: boolean;
  allowExercise: boolean;
  _count?: { practiceSets: number; exercises: number };
}

const LEVELS = ["A1-B1", "A2-B1", "A2-B2", "B1-B2", "B1-C1"];
const EXERCISE_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
const TASK_TYPES: Array<{ value: SpeakingTaskType; label: string }> = [
  { value: "READ_ALOUD", label: "Đọc thành tiếng" },
  { value: "DESCRIBE_PICTURE", label: "Mô tả hình ảnh" },
  { value: "RESPOND_TO_QUESTION", label: "Trả lời câu hỏi" },
  { value: "RESPOND_USING_INFORMATION", label: "Trả lời dựa trên thông tin" },
  { value: "EXPRESS_OPINION", label: "Trình bày ý kiến" },
  { value: "PRONUNCIATION_DRILL", label: "Bài luyện phát âm" },
];
const LEVEL_LABELS: Record<string, string> = {
  "A1-B1": "A1 – B1",
  "A2-B1": "A2 – B1",
  "A2-B2": "A2 – B2",
  "B1-B2": "B1 – B2",
  "B1-C1": "B1 – C1",
};
const STATUS_LABELS = { DRAFT: "Bản nháp", PUBLISHED: "Đã xuất bản" } as const;
const levelLabel = (level?: string | null) =>
  LEVEL_LABELS[level || ""] || level?.replace("-", " – ") || "Chưa phân loại";
const difficultyLabel = (difficulty?: string | null) =>
  ({ BEGINNER: "Cơ bản", INTERMEDIATE: "Trung cấp", ADVANCED: "Nâng cao" }[
    difficulty || ""
  ] || difficulty || "Chưa phân loại");
const categoryLabel = (categories: SpeakingCategory[], code?: string | null) =>
  categories.find((category) => category.code === code)?.name ||
  code ||
  "Chưa phân loại";

type SpeakingExerciseForm = {
  title: string;
  targetText: string;
  imageUrl: string;
  category: string;
  difficulty: string;
  taskType: SpeakingTaskType;
  stimulusId: number | null;
  categoryOverride: boolean;
};

type SpeakingExercisePayload = {
  title: string;
  targetText: string;
  category?: string | null;
  difficulty?: string;
  taskType: SpeakingTaskType;
  stimulusId?: number | null;
  imageUrl?: string | null;
};

type SpeakingPracticeSetSuggestion = {
  title: string;
  description: string;
  category: string;
  level: string;
};

type SpeakingExerciseSuggestion = {
  title: string;
  targetText: string;
  difficulty: string;
  taskType: SpeakingTaskType;
  excluded?: boolean;
};

type SpeakingFullDraft = {
  practiceSet: SpeakingPracticeSetSuggestion;
  exercises: SpeakingExerciseSuggestion[];
};

export default function AdminSpeakingPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "DRAFT" | "PUBLISHED"
  >("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [inlineCategoryOpen, setInlineCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryCode, setNewCategoryCode] = useState("");
  const [newCategoryAllowExercise, setNewCategoryAllowExercise] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingCategoryDescription, setEditingCategoryDescription] = useState("");

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
    category: "",
    level: "A1-B1",
  });

  // Exercise Create/Edit Modal
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] =
    useState<SpeakingExercise | null>(null);
  const [exerciseForm, setExerciseForm] = useState<SpeakingExerciseForm>({
    title: "",
    targetText: "",
    imageUrl: "",
    category: "",
    difficulty: "BEGINNER",
    taskType: "READ_ALOUD",
    stimulusId: null,
    categoryOverride: false,
  });
  const [practiceSetSuggestion, setPracticeSetSuggestion] =
    useState<SpeakingPracticeSetSuggestion | null>(null);
  const [exerciseSuggestions, setExerciseSuggestions] = useState<
    SpeakingExerciseSuggestion[]
  >([]);
  const [speakingFullDraft, setSpeakingFullDraft] =
    useState<SpeakingFullDraft | null>(null);
  const [speakingFullDraftCount, setSpeakingFullDraftCount] = useState(5);
  const [pendingFullDraftExercises, setPendingFullDraftExercises] = useState<
    SpeakingExerciseSuggestion[]
  >([]);

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

  const { data: categories = [] } =
    useQuery<SpeakingCategory[]>({
      queryKey: ["admin-speaking-categories"],
      queryFn: async () => {
        const res: any = await axiosClient.get(
          "/admin/skill-content/speaking/categories?includeInactive=true",
        );
        return Array.isArray(res) ? res : res?.data || [];
      },
    });

  const { data: stimuli = [] } = useQuery<SpeakingStimulus[]>({
    queryKey: ["admin-speaking-stimuli"],
    queryFn: async () => {
      const res: any = await axiosClient.get(
        "/admin/skill-content/speaking/stimuli",
      );
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const [newStimulusTitle, setNewStimulusTitle] = useState("");
  const [newStimulusContent, setNewStimulusContent] = useState("");

  const createStimulusMutation = useMutation({
    mutationFn: async () => {
      const response: any = await axiosClient.post(
        "/admin/skill-content/speaking/stimuli",
        {
          kind: "INFORMATION",
          title: newStimulusTitle.trim() || undefined,
          content: newStimulusContent.trim(),
        },
      );
      return response?.data || response;
    },
    onSuccess: (stimulus: SpeakingStimulus) => {
      setExerciseForm((current) => ({ ...current, stimulusId: stimulus.id }));
      setNewStimulusTitle("");
      setNewStimulusContent("");
      queryClient.invalidateQueries({ queryKey: ["admin-speaking-stimuli"] });
      toast.success("Đã tạo stimulus INFORMATION và chọn cho câu luyện.");
    },
    onError: (err: any) => {
      toast.error(getApiErrorMessage(err, "Không thể tạo stimulus INFORMATION."));
    },
  });

  const practiceSetCategories = categories.filter(
    (category) => category.isActive && category.allowPracticeSet,
  );
  const exerciseCategories = categories.filter(
    (category) => category.isActive && category.allowExercise,
  );
  const defaultPracticeSetCategory = practiceSetCategories[0]?.code || "";

  // Keep activeSet in sync when data updates
  const currentActiveSet = activeSet
    ? sets.find((s) => s.id === activeSet.id) || null
    : null;

  const createCategoryMutation = useMutation({
    mutationFn: async (source: "inline" | "management") => {
      const response: any = await axiosClient.post(
        "/admin/skill-content/speaking/categories",
        {
          name: newCategoryName.trim(),
          code: newCategoryCode.trim() || undefined,
          allowPracticeSet: true,
          allowExercise: newCategoryAllowExercise,
        },
      );
      return { source, category: response?.data || response };
    },
    onSuccess: ({ source, category }: { source: string; category: SpeakingCategory }) => {
      toast.success("Đã tạo phân loại Speaking.");
      queryClient.invalidateQueries({ queryKey: ["admin-speaking-categories"] });
      if (source === "inline") {
        setSetForm((current) => ({ ...current, category: category.code }));
        setInlineCategoryOpen(false);
      }
      setNewCategoryName("");
      setNewCategoryCode("");
      setNewCategoryAllowExercise(false);
    },
    onError: (err: any) => {
      toast.error(getApiErrorMessage(err, "Không thể tạo phân loại Speaking."));
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<SpeakingCategory>;
    }) => axiosClient.patch(`/admin/skill-content/speaking/categories/${id}`, data),
    onSuccess: () => {
      toast.success("Đã cập nhật phân loại Speaking.");
      setEditingCategoryId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-speaking-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-speaking-sets"] });
    },
    onError: (err: any) => {
      toast.error(getApiErrorMessage(err, "Không thể cập nhật phân loại Speaking."));
    },
  });

  const toggleCategory = (category: SpeakingCategory) => {
    updateCategoryMutation.mutate({
      id: category.id,
      data: { isActive: !category.isActive },
    });
  };

  // MUTATION: SAVE SET (CREATE OR UPDATE)
  const saveSetMutation = useMutation({
    mutationFn: async ({
      dto,
      exerciseCandidates,
    }: {
      dto: typeof setForm;
      exerciseCandidates: SpeakingExerciseSuggestion[];
    }) => {
      if (editingSet) {
        await axiosClient.patch(
          `/admin/skill-content/speaking/${editingSet.id}`,
          dto,
        );
      } else {
        const created: any = await axiosClient.post(
          "/admin/skill-content/speaking",
          dto,
        );
        const createdSet = created?.data || created;
        if (!createdSet?.id) throw new Error("Không nhận được mã bộ luyện mới.");
        const setId = createdSet.id as string;
        await Promise.all(
          exerciseCandidates.map((candidate) =>
            axiosClient.post(`/admin/skill-content/speaking/${setId}/exercises`, {
              title: candidate.title.trim(),
              targetText: candidate.targetText.trim(),
              taskType: candidate.taskType,
              difficulty: candidate.difficulty,
            }),
          ),
        );
        return created;
      }
      if (editingSet && exerciseCandidates.length) {
        await Promise.all(
          exerciseCandidates.map((candidate) =>
            axiosClient.post(
              `/admin/skill-content/speaking/${editingSet.id}/exercises`,
              {
                title: candidate.title.trim(),
                targetText: candidate.targetText.trim(),
                taskType: candidate.taskType,
                difficulty: candidate.difficulty,
              },
            ),
          ),
        );
      }
    },
    onSuccess: () => {
      toast.success(
        editingSet ? "Đã cập nhật bộ luyện nói!" : "Đã tạo bộ luyện nói mới!",
      );
      setIsSetModalOpen(false);
      setEditingSet(null);
      setPendingFullDraftExercises([]);
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

  const suggestPracticeSetMutation = useMutation({
    mutationFn: async () => {
      const fallbackTopic =
        categoryLabel(categories, setForm.category) ||
        "Luyện nói tiếng Anh";
      return axiosClient.post("/admin/speaking/ai/suggest-practice-set", {
        topic: setForm.title.trim() || setForm.description.trim() || fallbackTopic,
        level: setForm.level,
        category: setForm.category,
        currentTitle: setForm.title || undefined,
        currentDescription: setForm.description || undefined,
      });
    },
    onSuccess: (result: any) => {
      const suggestion = result?.data || result;
      setPracticeSetSuggestion(suggestion);
    },
    onError: (err: any) => {
      toast.error(getApiErrorMessage(err, "Không thể lấy gợi ý AI lúc này."));
    },
  });

  const suggestExercisesMutation = useMutation({
    mutationFn: async () => {
      if (!currentActiveSet) throw new Error("Chưa chọn bộ luyện nói.");
      return axiosClient.post("/admin/speaking/ai/suggest-exercises", {
        practiceSetTitle: currentActiveSet.title,
        practiceSetDescription: currentActiveSet.description || undefined,
        level: currentActiveSet.level || "BEGINNER",
        category: currentActiveSet.category || defaultPracticeSetCategory,
        currentTitle: exerciseForm.title || undefined,
        currentTargetText: exerciseForm.targetText || undefined,
        taskType: exerciseForm.taskType,
        existingExerciseTitles: currentActiveSet.exercises.map(
          (exercise) => exercise.title,
        ),
        count: 3,
      });
    },
    onSuccess: (result: any) => {
      const candidates = result?.data?.candidates || result?.candidates || [];
      setExerciseSuggestions(candidates);
    },
    onError: (err: any) => {
      toast.error(getApiErrorMessage(err, "Không thể lấy gợi ý AI lúc này."));
    },
  });

  const suggestSpeakingFullDraft = async () => {
    const topic = setForm.title.trim() || setForm.description.trim();
    if (!topic) {
      toast.error("Vui lòng nhập tên hoặc mục tiêu bộ luyện trước.");
      return;
    }
    try {
      const response: any = await axiosClient.post(
        "/admin/speaking/ai/full-draft",
        {
          topic,
          level: setForm.level,
          category: setForm.category,
          objective: setForm.description.trim() || undefined,
          count: speakingFullDraftCount,
        },
      );
      const data = response?.data || response;
      if (!data?.practiceSet || !Array.isArray(data.exercises)) {
        throw new Error("AI không trả về bản nháp Speaking hợp lệ.");
      }
      setSpeakingFullDraft({
        practiceSet: data.practiceSet,
        exercises: data.exercises.map((candidate: SpeakingExerciseSuggestion) => ({
          ...candidate,
          excluded: false,
        })),
      });
    } catch (error: any) {
      toast.error(
        getApiErrorMessage(error, "Không thể soạn full draft Speaking lúc này."),
      );
    }
  };

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
    const matchesCategory =
      categoryFilter === "ALL" || s.category === categoryFilter;
    const matchesStatus =
      statusFilter === "ALL" || s.publicationStatus === statusFilter;
    return matchesSearch && matchesLevel && matchesCategory && matchesStatus;
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
    setInlineCategoryOpen(false);
    setSetForm({
      title: "",
      description: "",
      category: defaultPracticeSetCategory,
      level: "A1-B1",
    });
    setPracticeSetSuggestion(null);
    setSpeakingFullDraft(null);
    setPendingFullDraftExercises([]);
    setIsSetModalOpen(true);
  };

  const openEditSet = (s: SpeakingPracticeSet) => {
    setEditingSet(s);
    setSetForm({
      title: s.title || "",
      description: s.description || "",
      category: s.category || defaultPracticeSetCategory,
      level: s.level || "BEGINNER",
    });
    setPracticeSetSuggestion(null);
    setSpeakingFullDraft(null);
    setPendingFullDraftExercises([]);
    setIsSetModalOpen(true);
  };

  const openAddExercise = (s: SpeakingPracticeSet) => {
    setActiveSet(s);
    setEditingExercise(null);
    setExerciseForm({
      title: "",
      targetText: "",
      imageUrl: "",
      category: s.category || defaultPracticeSetCategory,
      difficulty: "BEGINNER",
      taskType: "READ_ALOUD",
      stimulusId: null,
      categoryOverride: false,
    });
    setExerciseSuggestions([]);
    setIsExerciseModalOpen(true);
  };

  const openEditExercise = (ex: SpeakingExercise) => {
    setEditingExercise(ex);
    const parentCategory = currentActiveSet?.category || defaultPracticeSetCategory;
    setExerciseForm({
      title: ex.title || "",
      targetText: ex.targetText || "",
      imageUrl: ex.imageUrl || "",
      category: ex.category || parentCategory,
      difficulty: ex.difficulty || "BEGINNER",
      taskType: ex.taskType || "READ_ALOUD",
      stimulusId: ex.stimulusId ?? null,
      categoryOverride: Boolean(ex.categoryId && ex.categoryId !== currentActiveSet?.categoryId),
    });
    setExerciseSuggestions([]);
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
            Phân loại:
          </label>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-slate-400"
          >
            <option value="ALL">Tất cả phân loại</option>
            {categories.map((category) => (
              <option key={category.code} value={category.code}>
                {category.name}{category.isActive ? "" : " (đã tắt)"}
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

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <button
          type="button"
          onClick={() => setShowCategoryManagement((value) => !value)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-800"
        >
          <span>Quản lý phân loại Speaking</span>
          <span className="text-xs font-normal text-slate-500">
            {categories.length} phân loại · {showCategoryManagement ? "Thu gọn" : "Mở rộng"}
          </span>
        </button>
        {showCategoryManagement ? (
          <div className="border-t border-slate-100 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <input
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
                placeholder="Tìm theo tên hoặc mã phân loại..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-400 sm:max-w-sm"
              />
              <button
                type="button"
                onClick={() => {
                  setShowCategoryManagement(false);
                  openCreateSet();
                  setInlineCategoryOpen(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <Plus size={14} /> Thêm phân loại
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {categories
                .filter((category) => {
                  const query = categorySearch.trim().toLowerCase();
                  return (
                    !query ||
                    category.name.toLowerCase().includes(query) ||
                    category.code.toLowerCase().includes(query)
                  );
                })
                .map((category) => (
                  <div
                    key={category.id}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    {editingCategoryId === category.id ? (
                      <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                        <input
                          value={editingCategoryName}
                          onChange={(event) => setEditingCategoryName(event.target.value)}
                          aria-label={`Tên ${category.code}`}
                          className="rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-900"
                        />
                        <input
                          value={editingCategoryDescription}
                          onChange={(event) => setEditingCategoryDescription(event.target.value)}
                          aria-label={`Mô tả ${category.code}`}
                          placeholder="Mô tả"
                          className="rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-900"
                        />
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              updateCategoryMutation.mutate({
                                id: category.id,
                                data: {
                                  name: editingCategoryName,
                                  description: editingCategoryDescription,
                                },
                              })
                            }
                            className="rounded bg-slate-900 px-2 py-1 text-xs font-semibold text-white"
                          >
                            Lưu
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategoryId(null)}
                            className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-800">{category.name}</span>
                            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                              {category.code}
                            </code>
                            <span className={`rounded px-1.5 py-0.5 text-[11px] ${category.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                              {category.isActive ? "Đang dùng" : "Đã tắt"}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {category._count?.practiceSets || 0} bộ · {category._count?.exercises || 0} câu · {category.allowPracticeSet ? "Bộ luyện" : ""}{category.allowPracticeSet && category.allowExercise ? " · " : ""}{category.allowExercise ? "Câu luyện" : ""}
                          </p>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategoryId(category.id);
                              setEditingCategoryName(category.name);
                              setEditingCategoryDescription(category.description || "");
                            }}
                            className="rounded border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleCategory(category)}
                            className="rounded border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            {category.isActive ? "Tắt" : "Bật"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ) : null}
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
                        {categoryLabel(categories, set.category)}
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
                    {categoryLabel(categories, currentActiveSet.category)}
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
                            {difficultyLabel(ex.difficulty)}
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

            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-600">
                  AI chỉ gợi ý bản nháp theo thông tin đang nhập. Admin vẫn cần
                  xem lại, chỉnh sửa và tự lưu/xuất bản.
                </p>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                    Số câu
                    <input
                      aria-label="Số câu trong full draft Speaking"
                      type="number"
                      min={1}
                      max={10}
                      value={speakingFullDraftCount}
                      onChange={(event) =>
                        setSpeakingFullDraftCount(
                          Math.min(10, Math.max(1, Number(event.target.value) || 1)),
                        )
                      }
                      className="w-14 rounded-md border border-blue-200 bg-white px-2 py-1.5 text-center text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void suggestSpeakingFullDraft()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 disabled:opacity-60"
                  >
                    AI soạn bộ luyện
                  </button>
                  <button
                    type="button"
                    onClick={() => suggestPracticeSetMutation.mutate()}
                    disabled={suggestPracticeSetMutation.isPending}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {suggestPracticeSetMutation.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : null}
                    AI gợi ý bộ luyện
                  </button>
                </div>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!setForm.title.trim()) {
                  toast.error("Vui lòng nhập tên bộ luyện.");
                  return;
                }
                saveSetMutation.mutate({
                  dto: setForm,
                  exerciseCandidates: pendingFullDraftExercises.filter(
                    (candidate) => !candidate.excluded,
                  ),
                });
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
                      {levelLabel(lvl)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Chủ đề phân loại
                </label>
                <div className="mt-1 flex gap-2">
                  <select
                    value={setForm.category}
                    onChange={(e) =>
                      setSetForm({ ...setForm, category: e.target.value })
                    }
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                  >
                    {practiceSetCategories.map((category) => (
                      <option key={category.code} value={category.code}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setInlineCategoryOpen((value) => !value)}
                    className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    + Thêm phân loại
                  </button>
                </div>
                {inlineCategoryOpen ? (
                  <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50/60 p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={newCategoryName}
                        onChange={(event) => setNewCategoryName(event.target.value)}
                        placeholder="Tên phân loại mới"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                      />
                      <input
                        value={newCategoryCode}
                        onChange={(event) => setNewCategoryCode(event.target.value)}
                        placeholder="Mã (tuỳ chọn, ví dụ TRAVEL_TEST)"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                      />
                    </div>
                    <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-600">
                      <input
                        type="checkbox"
                        checked={newCategoryAllowExercise}
                        onChange={(event) => setNewCategoryAllowExercise(event.target.checked)}
                        className="rounded border-slate-300"
                      />
                      Cho phép dùng làm override cho câu luyện
                    </label>
                    <button
                      type="button"
                      disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                      onClick={() => createCategoryMutation.mutate("inline")}
                      className="mt-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Tạo và chọn phân loại
                    </button>
                  </div>
                ) : null}
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

            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-600">
                  AI chỉ gợi ý câu mẫu dạng văn bản theo bộ luyện hiện tại.
                  Không tạo âm thanh hay tự lưu nội dung.
                </p>
                <button
                  type="button"
                  onClick={() => suggestExercisesMutation.mutate()}
                  disabled={suggestExercisesMutation.isPending}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {suggestExercisesMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : null}
                  AI gợi ý câu luyện
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                Loại bài *
              </label>
              <select
                required
                value={exerciseForm.taskType}
                onChange={(e) =>
                  setExerciseForm({
                    ...exerciseForm,
                    taskType: e.target.value as SpeakingTaskType,
                    stimulusId:
                      e.target.value === "RESPOND_USING_INFORMATION"
                        ? exerciseForm.stimulusId
                        : null,
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              >
                {TASK_TYPES.map((task) => (
                  <option key={task.value} value={task.value}>
                    {task.label}
                  </option>
                ))}
              </select>
            </div>

            {exerciseForm.taskType === "DESCRIBE_PICTURE" && (
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  URL hình ảnh learner-visible *
                </label>
                <input
                  required
                  type="url"
                  value={exerciseForm.imageUrl}
                  onChange={(e) =>
                    setExerciseForm({ ...exerciseForm, imageUrl: e.target.value })
                  }
                  placeholder="https://.../toeic/shared/images/..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                />
              </div>
            )}

            {exerciseForm.taskType === "RESPOND_USING_INFORMATION" && (
              <div className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                <label className="text-xs font-semibold text-slate-700">
                  Thông tin dùng chung *
                </label>
                <select
                  required
                  value={exerciseForm.stimulusId ?? ""}
                  onChange={(e) =>
                    setExerciseForm({
                      ...exerciseForm,
                      stimulusId: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                >
                  <option value="">Chọn stimulus INFORMATION</option>
                  {stimuli
                    .filter((stimulus) => stimulus.kind === "INFORMATION")
                    .map((stimulus) => (
                      <option key={stimulus.id} value={stimulus.id}>
                        {stimulus.title || `Stimulus #${stimulus.id}`}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  Q8–Q10 phải cùng chọn một stimulus.
                </p>
                <div className="space-y-2 border-t border-blue-100 pt-2">
                  <p className="text-[11px] font-semibold text-slate-600">
                    Tạo stimulus mới dùng lại cho nhiều câu
                  </p>
                  <input
                    value={newStimulusTitle}
                    onChange={(e) => setNewStimulusTitle(e.target.value)}
                    placeholder="Tiêu đề thông tin"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-500"
                  />
                  <textarea
                    value={newStimulusContent}
                    onChange={(e) => setNewStimulusContent(e.target.value)}
                    rows={3}
                    placeholder="Ví dụ: Registration is at 9:00..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs leading-5 text-slate-900 outline-none focus:border-slate-500"
                  />
                  <button
                    type="button"
                    disabled={
                      createStimulusMutation.isPending ||
                      !newStimulusContent.trim()
                    }
                    onClick={() => createStimulusMutation.mutate()}
                    className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {createStimulusMutation.isPending
                      ? "Đang tạo..."
                      : "+ Tạo stimulus INFORMATION"}
                  </button>
                </div>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  !exerciseForm.title.trim() ||
                  !exerciseForm.targetText.trim() ||
                  !exerciseForm.taskType
                ) {
                  toast.error(
                    "Vui lòng nhập tiêu đề, loại bài và nội dung Speaking.",
                  );
                  return;
                }
                saveExerciseMutation.mutate({
                  setId: currentActiveSet.id,
                  dto: {
                    title: exerciseForm.title,
                    targetText: exerciseForm.targetText,
                    category: exerciseForm.categoryOverride
                      ? exerciseForm.category
                      : null,
                    difficulty: exerciseForm.difficulty,
                    taskType: exerciseForm.taskType,
                    stimulusId: exerciseForm.stimulusId,
                    imageUrl: exerciseForm.imageUrl || null,
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
                    {EXERCISE_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {difficultyLabel(lvl)}
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
                      {categoryLabel(categories, currentActiveSet.category)}
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
                      {exerciseCategories.map((category) => (
                        <option key={category.code} value={category.code}>
                          {category.name}
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
                            : currentActiveSet.category || defaultPracticeSetCategory,
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

      {speakingFullDraft && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="speaking-full-draft-title"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h3 id="speaking-full-draft-title" className="text-base font-bold text-slate-900">
                  Xem lại full draft bộ luyện Speaking
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Chỉnh sửa hoặc loại câu trước khi áp dụng. Chưa có dữ liệu nào được lưu; nút Lưu mới tạo Draft trong CMS.
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng full draft Speaking"
                onClick={() => setSpeakingFullDraft(null)}
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 py-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Tên bộ luyện
                    <input
                      value={speakingFullDraft.practiceSet.title}
                      onChange={(event) =>
                        setSpeakingFullDraft((current) =>
                          current
                            ? { ...current, practiceSet: { ...current.practiceSet, title: event.target.value } }
                            : current,
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Trình độ mục tiêu
                    <select
                      value={speakingFullDraft.practiceSet.level}
                      onChange={(event) =>
                        setSpeakingFullDraft((current) =>
                          current
                            ? { ...current, practiceSet: { ...current.practiceSet, level: event.target.value } }
                            : current,
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    >
                      {LEVELS.map((level) => <option key={level} value={level}>{levelLabel(level)}</option>)}
                    </select>
                  </label>
                </div>
                <label className="mt-3 block text-xs font-semibold text-slate-700">
                  Mô tả / mục tiêu
                  <textarea
                    rows={3}
                    value={speakingFullDraft.practiceSet.description}
                    onChange={(event) =>
                      setSpeakingFullDraft((current) =>
                        current
                          ? { ...current, practiceSet: { ...current.practiceSet, description: event.target.value } }
                          : current,
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Câu luyện ({speakingFullDraft.exercises.filter((candidate) => !candidate.excluded).length})</h4>
                  <p className="mt-1 text-xs text-slate-500">Mỗi câu vẫn là Draft và kế thừa category của bộ luyện.</p>
                </div>
              </div>
              <div className="space-y-3">
                {speakingFullDraft.exercises.map((candidate, index) => (
                  <div key={`${candidate.title}-${index}`} className={`rounded-xl border p-3 ${candidate.excluded ? "border-slate-200 bg-slate-50 opacity-60" : "border-slate-200 bg-white"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-slate-600">Câu {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => setSpeakingFullDraft((current) => current ? { ...current, exercises: current.exercises.map((item, itemIndex) => itemIndex === index ? { ...item, excluded: !item.excluded } : item) } : current)}
                        className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        {candidate.excluded ? "Khôi phục" : "Loại câu"}
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_150px]">
                      <label className="text-xs font-semibold text-slate-700">
                        Tiêu đề
                        <input
                          disabled={candidate.excluded}
                          value={candidate.title}
                          onChange={(event) => setSpeakingFullDraft((current) => current ? { ...current, exercises: current.exercises.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) } : current)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed"
                        />
                      </label>
                      <label className="text-xs font-semibold text-slate-700">
                        Độ khó câu
                        <select
                          disabled={candidate.excluded}
                          value={candidate.difficulty}
                          onChange={(event) => setSpeakingFullDraft((current) => current ? { ...current, exercises: current.exercises.map((item, itemIndex) => itemIndex === index ? { ...item, difficulty: event.target.value } : item) } : current)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed"
                        >
                          {EXERCISE_LEVELS.map((level) => <option key={level} value={level}>{difficultyLabel(level)}</option>)}
                        </select>
                      </label>
                    </div>
                    <label className="mt-3 block text-xs font-semibold text-slate-700">
                      Câu mẫu tiếng Anh
                      <textarea
                        rows={3}
                        disabled={candidate.excluded}
                        value={candidate.targetText}
                        onChange={(event) => setSpeakingFullDraft((current) => current ? { ...current, exercises: current.exercises.map((item, itemIndex) => itemIndex === index ? { ...item, targetText: event.target.value } : item) } : current)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono font-normal text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button type="button" onClick={() => setSpeakingFullDraft(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Bỏ qua</button>
              <button
                type="button"
                onClick={() => {
                  const activeExercises = speakingFullDraft.exercises.filter((candidate) => !candidate.excluded && candidate.title.trim() && candidate.targetText.trim());
                  if (!speakingFullDraft.practiceSet.title.trim() || !activeExercises.length) {
                    toast.error("Full draft cần tên bộ luyện và ít nhất một câu hợp lệ.");
                    return;
                  }
                  setSetForm({ ...speakingFullDraft.practiceSet });
                  setPendingFullDraftExercises(activeExercises);
                  setSpeakingFullDraft(null);
                  toast.success("Đã áp dụng full draft vào form. Chưa có dữ liệu nào được lưu.");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Áp dụng vào form <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {practiceSetSuggestion && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="speaking-set-suggestion-title"
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h3
                  id="speaking-set-suggestion-title"
                  className="text-base font-bold text-slate-900"
                >
                  Xem lại gợi ý bộ luyện
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Đây là bản nháp. Áp dụng chỉ điền vào form; nội dung chưa được
                  lưu hay xuất bản.
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng gợi ý bộ luyện"
                onClick={() => setPracticeSetSuggestion(null)}
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 py-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Tên bộ luyện
                </label>
                <input
                  value={practiceSetSuggestion.title}
                  onChange={(event) =>
                    setPracticeSetSuggestion({
                      ...practiceSetSuggestion,
                      title: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Mô tả
                </label>
                <textarea
                  rows={4}
                  value={practiceSetSuggestion.description}
                  onChange={(event) =>
                    setPracticeSetSuggestion({
                      ...practiceSetSuggestion,
                      description: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">
                  Trình độ
                  <select
                    value={practiceSetSuggestion.level}
                    onChange={(event) =>
                      setPracticeSetSuggestion({
                        ...practiceSetSuggestion,
                        level: event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  >
                    {LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {levelLabel(level)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Chủ đề
                  <select
                    value={practiceSetSuggestion.category}
                    onChange={(event) =>
                      setPracticeSetSuggestion({
                        ...practiceSetSuggestion,
                        category: event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  >
                    {practiceSetCategories.map((category) => (
                      <option key={category.code} value={category.code}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setPracticeSetSuggestion(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={() => {
                  setSetForm({ ...practiceSetSuggestion });
                  setPracticeSetSuggestion(null);
                  toast.success("Đã áp dụng bản nháp vào form. Hãy kiểm tra rồi lưu.");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Áp dụng vào form <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {exerciseSuggestions.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="speaking-exercise-suggestion-title"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h3
                  id="speaking-exercise-suggestion-title"
                  className="text-base font-bold text-slate-900"
                >
                  Xem lại gợi ý câu luyện
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Chỉnh sửa hoặc loại từng câu. Áp dụng một câu chỉ điền vào
                  form bên dưới, chưa tạo dữ liệu mới.
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng gợi ý câu luyện"
                onClick={() => setExerciseSuggestions([])}
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 py-4">
              {exerciseSuggestions.map((candidate, index) => (
                <div
                  key={`${candidate.title}-${index}`}
                  className={`rounded-xl border p-3 transition-colors ${
                    candidate.excluded
                      ? "border-slate-200 bg-slate-50 opacity-60"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-slate-700">
                      Gợi ý {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setExerciseSuggestions((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, excluded: !item.excluded }
                              : item,
                          ),
                        )
                      }
                      className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      {candidate.excluded ? "Khôi phục" : "Loại gợi ý"}
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_150px]">
                    <label className="text-xs font-semibold text-slate-700">
                      Tiêu đề
                      <input
                        disabled={candidate.excluded}
                        value={candidate.title}
                        onChange={(event) =>
                          setExerciseSuggestions((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, title: event.target.value }
                                : item,
                            ),
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed"
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate-700">
                      Cấp độ câu
                      <select
                        disabled={candidate.excluded}
                        value={candidate.difficulty}
                        onChange={(event) =>
                          setExerciseSuggestions((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, difficulty: event.target.value }
                                : item,
                            ),
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed"
                      >
                        {EXERCISE_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {difficultyLabel(level)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="mt-3 block text-xs font-semibold text-slate-700">
                    Câu mẫu tiếng Anh
                    <textarea
                      rows={3}
                      disabled={candidate.excluded}
                      value={candidate.targetText}
                      onChange={(event) =>
                        setExerciseSuggestions((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, targetText: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono font-normal text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed"
                    />
                  </label>
                  {!candidate.excluded && (
                    <button
                      type="button"
                      onClick={() => {
                        setExerciseForm({
                          title: candidate.title,
                          targetText: candidate.targetText,
                          imageUrl: "",
                          taskType: candidate.taskType,
                          stimulusId: null,
                          difficulty: candidate.difficulty,
                          category: currentActiveSet?.category || defaultPracticeSetCategory,
                          categoryOverride: false,
                        });
                        setExerciseSuggestions([]);
                        toast.success("Đã áp dụng gợi ý vào form. Hãy kiểm tra rồi lưu.");
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                      Áp dụng vào form <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setExerciseSuggestions([])}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Đóng
              </button>
            </div>
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
