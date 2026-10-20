"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Plus,
  Loader2,
  Search,
  Trash2,
  Edit2,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  Image as ImageIcon,
  FileText,
  Clock,
  ArrowUp,
  ArrowDown,
  X,
  Eye,
  Check,
  ShieldAlert,
  FileStack,
  RefreshCw,
  Upload,
  ImageOff,
} from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { Pagination } from "@/components/ui";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import ImageUploadField from "@/components/admin/ImageUploadField";
import AudioUploadField from "@/components/admin/AudioUploadField";
import ToeicSpeakingExamComposer from "@/components/admin/ToeicSpeakingExamComposer";

const TOEIC_PARTS = [
  { part: 1, label: "Part 1: Mô tả hình ảnh (Photographs)", type: "LISTENING" },
  {
    part: 2,
    label: "Part 2: Hỏi - Đáp (Question - Response)",
    type: "LISTENING",
  },
  {
    part: 3,
    label: "Part 3: Hội thoại ngắn (Short Conversations)",
    type: "LISTENING",
  },
  { part: 4, label: "Part 4: Bài nói ngắn (Short Talks)", type: "LISTENING" },
  {
    part: 5,
    label: "Part 5: Hoàn thành câu (Incomplete Sentences)",
    type: "READING",
  },
  {
    part: 6,
    label: "Part 6: Điền đoạn văn (Text Completion)",
    type: "READING",
  },
  {
    part: 7,
    label: "Part 7: Đọc hiểu văn bản (Reading Comprehension)",
    type: "READING",
  },
];

interface ExamQuestion {
  id: number;
  groupId: number;
  questionNumber: number;
  text?: string | null;
  options: string[];
  correctIndex: number;
  explanation?: string | null;
}

interface ExamGroup {
  id: number;
  examId: number;
  part: number;
  groupOrder: number;
  imageUrl?: string | null;
  audioUrl?: string | null;
  passageText?: string | null;
  transcriptText?: string | null;
  imageBrief?: string | null;
  mediaMetadata?: {
    audio?: {
      stale?: boolean;
      status?: "READY" | "FAILED" | "MISSING";
      errorCode?: string;
      source?: string;
    };
    image?: {
      stale?: boolean;
      status?: "READY" | "FAILED" | "MISSING";
      errorCode?: string;
      source?: string;
      provider?: string;
      author?: string;
      authorUrl?: string;
      upstreamSource?: string;
      license?: string;
      licenseVersion?: string;
      licenseUrl?: string;
      attribution?: string;
      sourcePageUrl?: string;
      questionStatus?: string;
      questionImageHash?: string;
      sceneSummary?: string;
    };
  } | null;
  questions: ExamQuestion[];
}

interface ExamDetail {
  id: number;
  title: string;
  description?: string | null;
  type: "FULL_TEST" | "PRACTICE_BY_PART";
  difficulty: "easy" | "medium" | "hard";
  durationSeconds: number;
  totalQuestions?: number;
  totalGroups?: number;
  publicationStatus: "DRAFT" | "PUBLISHED";
  familyCode?: string;
  variantCode?: string;
  readiness?: {
    listeningReading?: boolean;
    speaking?: boolean;
    writing?: boolean;
    speakingCount?: number;
    speakingExpected?: number;
    writingCount?: number;
    writingExpected?: number;
  };
  groups: ExamGroup[];
  attemptsCount?: number;
  learnerReady?: boolean;
  validation?: {
    counts: Record<string, number>;
    issues: Array<{
      code: string;
      message: string;
      groupId?: number;
      questionId?: number;
    }>;
  };
}

const examVariantLabel = (variant?: string) =>
  ({
    TOEIC_LR: "Listening & Reading",
    TOEIC_SW: "Speaking & Writing",
    TOEIC_4_SKILLS: "4 kỹ năng",
  })[variant || ""] ||
  variant ||
  "Loại đề";

export default function AdminExamsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "DRAFT" | "PUBLISHED"
  >("ALL");
  const [familyFilter, setFamilyFilter] = useState("ALL");
  const [variantFilter, setVariantFilter] = useState("ALL");
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(9);
  const [activeTab, setActiveTab] = useState<
    "structure" | "preflight" | "preview" | "info"
  >("structure");
  const [activePartFilter, setActivePartFilter] = useState<number | "all">(
    "all",
  );

  // Modals & Confirm states
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ExamGroup | null>(null);
  const [targetGroupIdForQuestion, setTargetGroupIdForQuestion] = useState<
    number | null
  >(null);
  const [editingQuestion, setEditingQuestion] = useState<ExamQuestion | null>(
    null,
  );

  const [pendingDeleteExam, setPendingDeleteExam] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const [pendingDeleteGroup, setPendingDeleteGroup] = useState<{
    id: number;
    part: number;
  } | null>(null);
  const [pendingDeleteQuestion, setPendingDeleteQuestion] = useState<{
    id: number;
    questionNumber: number;
  } | null>(null);

  // Form states: Exam
  const [examForm, setExamForm] = useState({
    title: "",
    description: "",
    familyCode: "TOEIC",
    variantCode: "TOEIC_LR",
    type: "PRACTICE_BY_PART" as "FULL_TEST" | "PRACTICE_BY_PART",
    difficulty: "medium" as "easy" | "medium" | "hard",
    durationMinutes: 45,
  });

  // Form states: Group
  const [groupForm, setGroupForm] = useState({
    part: 1,
    groupOrder: 1,
    audioUrl: "",
    imageUrl: "",
    passageText: "",
    transcriptText: "",
    imageBrief: "",
  });

  // Form states: Question
  const [questionForm, setQuestionForm] = useState({
    questionNumber: 1,
    text: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    explanation: "",
  });
  const [imageSearchGroup, setImageSearchGroup] = useState<ExamGroup | null>(
    null,
  );
  const [imageSearchQuery, setImageSearchQuery] = useState("");
  const [imageSearchCandidates, setImageSearchCandidates] = useState<any[]>([]);
  const [isImageSearchOpen, setIsImageSearchOpen] = useState(false);

  // Contextual AI state: Exam TOEIC Part 5
  const [isAiPart5ModalOpen, setIsAiPart5ModalOpen] = useState(false);
  const [isAiPart5Loading, setIsAiPart5Loading] = useState(false);
  const [aiPart5TargetGroup, setAiPart5TargetGroup] =
    useState<ExamGroup | null>(null);
  const [aiPart5Topic, setAiPart5Topic] = useState("");
  const [aiPart5GrammarFocus, setAiPart5GrammarFocus] = useState("");
  const [aiPart5Count, setAiPart5Count] = useState(5);
  const [aiPart5Candidates, setAiPart5Candidates] = useState<
    Array<{
      prompt: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    }>
  >([]);

  const handleGenerateAiPart5 = async () => {
    setIsAiPart5Loading(true);
    try {
      const res: any = await axiosClient.post("/admin/exams/ai/suggest-part5", {
        topic: aiPart5Topic.trim() || examDetail?.title || undefined,
        grammarFocus: aiPart5GrammarFocus.trim() || undefined,
        count: Number(aiPart5Count),
      });
      const data = res?.data || res;
      if (Array.isArray(data?.candidates)) {
        setAiPart5Candidates(data.candidates);
        toast.success(
          `AI đã gợi ý ${data.candidates.length} câu hỏi TOEIC Part 5 nháp`,
        );
      } else {
        toast.error("Không nhận được câu hỏi hợp lệ từ AI");
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Không thể tạo câu hỏi Part 5 lúc này.",
      );
    } finally {
      setIsAiPart5Loading(false);
    }
  };

  // 1. Query all exams

  const { data: exams, isLoading: isExamsLoading } = useQuery<any[]>({
    queryKey: ["admin-exams"],
    queryFn: async () => {
      const res: any = await axiosClient.get("/admin/exams");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  // 2. Query single exam detail
  const { data: examDetail, isLoading: isDetailLoading } = useQuery<ExamDetail>(
    {
      queryKey: ["admin-exam-detail", selectedExamId],
      queryFn: async () => {
        if (!selectedExamId) return null;
        const res: any = await axiosClient.get(
          `/admin/exams/${selectedExamId}`,
        );
        return res?.data || res;
      },
      enabled: !!selectedExamId,
    },
  );

  // Mutations
  const createExamMutation = useMutation({
    mutationFn: async (dto: any) =>
      axiosClient.post("/admin/exams", {
        ...dto,
        durationSeconds: dto.durationMinutes * 60,
      }),
    onSuccess: (data: any) => {
      toast.success("Tạo bộ đề thi mới thành công!");
      setIsExamModalOpen(false);
      setExamForm({
        title: "",
        description: "",
        familyCode: "TOEIC",
        variantCode: "TOEIC_LR",
        type: "PRACTICE_BY_PART",
        difficulty: "medium",
        durationMinutes: 45,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
      if (data?.id) setSelectedExamId(data.id);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Không thể tạo bộ đề thi"),
  });

  const updateExamMutation = useMutation({
    mutationFn: async ({ id, dto }: { id: number; dto: any }) =>
      axiosClient.patch(`/admin/exams/${id}`, dto),
    onSuccess: () => {
      toast.success("Cập nhật thông tin đề thi thành công!");
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-exam-detail", selectedExamId],
      });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Không thể cập nhật đề thi"),
  });

  const publishExamMutation = useMutation({
    mutationFn: async (id: number) =>
      axiosClient.post(`/admin/exams/${id}/publish`),
    onSuccess: () => {
      toast.success("Đã xuất bản bộ đề thi cho học viên!");
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-exam-detail", selectedExamId],
      });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      const issues = err?.response?.data?.issues;
      if (Array.isArray(issues) && issues.length > 0) {
        toast.error(
          `${msg || "Chưa đủ điều kiện xuất bản"}:\n${issues
            .slice(0, 3)
            .map((i: any) => `• ${i.message}`)
            .join("\n")}`,
        );
      } else {
        toast.error(msg || "Không thể xuất bản đề thi");
      }
    },
  });

  const unpublishExamMutation = useMutation({
    mutationFn: async (id: number) =>
      axiosClient.post(`/admin/exams/${id}/unpublish`),
    onSuccess: () => {
      toast.success("Đã chuyển đề thi về bản nháp!");
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-exam-detail", selectedExamId],
      });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Không thể gỡ xuất bản"),
  });

  const deleteExamMutation = useMutation({
    mutationFn: async (id: number) => axiosClient.delete(`/admin/exams/${id}`),
    onSuccess: () => {
      toast.success("Đã xóa bộ đề thi!");
      setPendingDeleteExam(null);
      if (selectedExamId === pendingDeleteExam?.id) setSelectedExamId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Không thể xóa đề thi"),
  });

  const saveGroupMutation = useMutation({
    mutationFn: async (dto: any) => {
      if (!selectedExamId) return;
      if (editingGroup) {
        return axiosClient.patch(
          `/admin/exams/${selectedExamId}/groups/${editingGroup.id}`,
          dto,
        );
      }
      return axiosClient.post(`/admin/exams/${selectedExamId}/groups`, dto);
    },
    onSuccess: () => {
      toast.success(
        editingGroup
          ? "Cập nhật nhóm câu hỏi thành công!"
          : "Thêm nhóm câu hỏi mới thành công!",
      );
      setIsGroupModalOpen(false);
      setEditingGroup(null);
      queryClient.invalidateQueries({
        queryKey: ["admin-exam-detail", selectedExamId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Không thể lưu nhóm câu hỏi"),
  });

  const regenerateMediaMutation = useMutation({
    mutationFn: async ({
      groupId,
      kind,
    }: {
      groupId: number;
      kind: "image" | "audio";
    }) => {
      if (!selectedExamId) return;
      return axiosClient.post(
        `/admin/exams/${selectedExamId}/ai/groups/${groupId}/media/${kind}/regenerate`,
      );
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.kind === "image"
          ? "Đã tạo lại ảnh cho nhóm câu hỏi."
          : "Đã tạo lại audio cho nhóm câu hỏi.",
      );
      queryClient.invalidateQueries({
        queryKey: ["admin-exam-detail", selectedExamId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ||
          "Không thể tạo lại media. Bạn có thể tải tệp lên thủ công.",
      ),
  });

  const imageSearchMutation = useMutation({
    mutationFn: async ({
      group,
      query,
    }: {
      group: ExamGroup;
      query: string;
    }) => {
      if (!selectedExamId) return null;
      const res: any = await axiosClient.get(
        `/admin/exams/${selectedExamId}/ai/groups/${group.id}/image-search`,
        { params: { query, limit: 5 } },
      );
      return res?.data || res;
    },
    onSuccess: (data) => {
      setImageSearchCandidates(
        Array.isArray(data?.candidates) ? data.candidates : [],
      );
      if (!data?.candidates?.length)
        toast.error(
          "Không tìm thấy ảnh phù hợp. Bạn có thể tải ảnh lên thủ công.",
        );
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message || "Không thể tìm ảnh tự động lúc này.",
      ),
  });

  const selectImageMutation = useMutation({
    mutationFn: async (candidateId: string) => {
      if (!selectedExamId || !imageSearchGroup) return null;
      return axiosClient.post(
        `/admin/exams/${selectedExamId}/ai/groups/${imageSearchGroup.id}/image-search/select`,
        { candidateId },
      );
    },
    onSuccess: (res: any) => {
      const data = res?.data || res;
      toast.success(
        data?.error
          ? "Đã lưu ảnh; câu hỏi cần xử lý thủ công."
          : "Đã lưu ảnh và tạo câu hỏi Part 1 nháp.",
      );
      setIsImageSearchOpen(false);
      queryClient.invalidateQueries({
        queryKey: ["admin-exam-detail", selectedExamId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Không thể chọn ảnh."),
  });

  const visionMutation = useMutation({
    mutationFn: async (groupId: number) => {
      if (!selectedExamId) return null;
      return axiosClient.post(
        `/admin/exams/${selectedExamId}/ai/groups/${groupId}/image-vision`,
      );
    },
    onSuccess: () => {
      toast.success("Đã phân tích ảnh và tạo câu hỏi Part 1 nháp.");
      queryClient.invalidateQueries({
        queryKey: ["admin-exam-detail", selectedExamId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message || "Không thể phân tích ảnh lúc này.",
      ),
  });

  const openImageSearch = (group: ExamGroup) => {
    setImageSearchGroup(group);
    setImageSearchQuery(group.imageBrief || "workers meeting office");
    setImageSearchCandidates([]);
    setIsImageSearchOpen(true);
  };

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      if (!selectedExamId) return;
      return axiosClient.delete(
        `/admin/exams/${selectedExamId}/groups/${groupId}`,
      );
    },
    onSuccess: () => {
      toast.success("Đã xóa nhóm câu hỏi!");
      setPendingDeleteGroup(null);
      queryClient.invalidateQueries({
        queryKey: ["admin-exam-detail", selectedExamId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Không thể xóa nhóm câu hỏi"),
  });

  const saveQuestionMutation = useMutation({
    mutationFn: async (dto: any) => {
      if (!selectedExamId) return;
      const groupId = targetGroupIdForQuestion || editingQuestion?.groupId;
      if (!groupId) return;
      if (editingQuestion) {
        return axiosClient.patch(
          `/admin/exams/${selectedExamId}/groups/${groupId}/questions/${editingQuestion.id}`,
          dto,
        );
      }
      return axiosClient.post(
        `/admin/exams/${selectedExamId}/groups/${groupId}/questions`,
        dto,
      );
    },
    onSuccess: () => {
      toast.success(
        editingQuestion
          ? "Cập nhật câu hỏi thành công!"
          : "Thêm câu hỏi mới thành công!",
      );
      setIsQuestionModalOpen(false);
      setEditingQuestion(null);
      setTargetGroupIdForQuestion(null);
      queryClient.invalidateQueries({
        queryKey: ["admin-exam-detail", selectedExamId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Không thể lưu câu hỏi"),
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async ({
      groupId,
      questionId,
    }: {
      groupId: number;
      questionId: number;
    }) => {
      if (!selectedExamId) return;
      return axiosClient.delete(
        `/admin/exams/${selectedExamId}/groups/${groupId}/questions/${questionId}`,
      );
    },
    onSuccess: () => {
      toast.success("Đã xóa câu hỏi!");
      setPendingDeleteQuestion(null);
      queryClient.invalidateQueries({
        queryKey: ["admin-exam-detail", selectedExamId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Không thể xóa câu hỏi"),
  });

  const openGroupEditor = (group: ExamGroup) => {
    setEditingGroup(group);
    setGroupForm({
      part: group.part,
      groupOrder: group.groupOrder,
      audioUrl: group.audioUrl || "",
      imageUrl: group.imageUrl || "",
      passageText: group.passageText || "",
      transcriptText: group.transcriptText || "",
      imageBrief: group.imageBrief || "",
    });
    setIsGroupModalOpen(true);
  };

  const filteredExams = exams?.filter(
    (e) =>
      (e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === "ALL" || e.publicationStatus === statusFilter) &&
      (familyFilter === "ALL" || e.familyCode === familyFilter) &&
      (variantFilter === "ALL" || e.variantCode === variantFilter),
  );
  const totalPages = Math.ceil((filteredExams?.length || 0) / pageSize);
  const paginatedExams = filteredExams?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // -------------------------------------------------------------
  // RENDER: Exam Workspace / Editor when an exam is selected
  // -------------------------------------------------------------
  if (selectedExamId && examDetail) {
    if (examDetail.variantCode && examDetail.variantCode !== "TOEIC_LR") {
      const readiness = examDetail.readiness;
      const isPublished = examDetail.publicationStatus === "PUBLISHED";
      const sections = [
        {
          label: "Listening & Reading",
          count: examDetail.totalQuestions || 0,
          expected: 200,
          ready: readiness?.listeningReading,
        },
        {
          label: "Speaking",
          count: readiness?.speakingCount || 0,
          expected: readiness?.speakingExpected || 11,
          ready: readiness?.speaking,
        },
        {
          label: "Writing",
          count: readiness?.writingCount || 0,
          expected: readiness?.writingExpected || 8,
          ready: readiness?.writing,
        },
      ].filter(
        (section) =>
          section.expected > 0 &&
          (examDetail.variantCode === "TOEIC_4_SKILLS" ||
            section.label !== "Listening & Reading"),
      );
      return (
        <main className="mx-auto max-w-5xl space-y-6 p-6">
          <button
            onClick={() => setSelectedExamId(null)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
          >
            <ArrowLeft size={16} /> Quay lại kho đề
          </button>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">
                  {examDetail.familyCode} ·{" "}
                  {examVariantLabel(examDetail.variantCode)}
                </p>
                <h1 className="mt-2 text-2xl font-bold text-slate-950">
                  {examDetail.title}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {examDetail.description || "Chưa có mô tả."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                  {isPublished ? "Đã xuất bản" : "Bản nháp"}
                </span>
                {isPublished ? (
                  <button
                    onClick={() => unpublishExamMutation.mutate(examDetail.id)}
                    disabled={unpublishExamMutation.isPending}
                    className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Chuyển về bản nháp
                  </button>
                ) : (
                  <button
                    onClick={() => publishExamMutation.mutate(examDetail.id)}
                    disabled={publishExamMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <CheckCircle2 size={15} /> Xuất bản đề thi
                  </button>
                )}
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {sections.map((section) => (
                <div
                  key={section.label}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-sm font-bold text-slate-900">
                    {section.label}
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {section.count}/{section.expected}
                  </p>
                  <p
                    className={`mt-1 text-xs font-semibold ${section.ready ? "text-emerald-600" : "text-amber-600"}`}
                  >
                    {section.ready ? "Sẵn sàng" : "Chưa đủ điều kiện"}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Nguồn Speaking/Writing là nội bộ của đề thi. Bản nháp chưa hiển
              thị cho học viên và chỉ được xuất bản khi đủ cấu trúc chuẩn.
            </p>
          </section>
          {(examDetail.variantCode === "TOEIC_SW" ||
            examDetail.variantCode === "TOEIC_4_SKILLS") && (
            <ToeicSpeakingExamComposer
              examId={examDetail.id}
              onChanged={() =>
                queryClient.invalidateQueries({
                  queryKey: ["admin-exam-detail", selectedExamId],
                })
              }
            />
          )}
        </main>
      );
    }
    const isPublished = examDetail.publicationStatus === "PUBLISHED";
    const groups = examDetail.groups || [];
    const allQuestions = groups.flatMap((g) => g.questions || []);
    const validation = examDetail.validation;
    const issues = validation?.issues || [];

    const visibleGroups =
      activePartFilter === "all"
        ? groups
        : groups.filter((g) => g.part === activePartFilter);

    return (
      <main className="mx-auto max-w-6xl space-y-6 p-6">
        {/* TOP BAR */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedExamId(null)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
              title="Quay lại danh sách"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">
                  {examDetail.title}
                </h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isPublished
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {isPublished ? "Đã xuất bản" : "Bản nháp"}
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {examDetail.type === "FULL_TEST"
                    ? "Full Test (200 câu)"
                    : "Luyện tập theo Part"}
                </span>
              </div>
              {examDetail.description && (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  {examDetail.description}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-0.5">
                Thời lượng: {Math.round(examDetail.durationSeconds / 60)} phút ·{" "}
                {groups.length} nhóm · {allQuestions.length} câu hỏi ·{" "}
                {examDetail.attemptsCount || 0} lượt làm bài
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isPublished ? (
              <button
                onClick={() => unpublishExamMutation.mutate(examDetail.id)}
                disabled={unpublishExamMutation.isPending}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Chuyển về bản nháp
              </button>
            ) : (
              <button
                onClick={() => publishExamMutation.mutate(examDetail.id)}
                disabled={publishExamMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <CheckCircle2 size={15} /> Xuất bản đề thi
              </button>
            )}
          </div>
        </div>

        {/* WORKSPACE NAVIGATION TABS */}
        <div className="flex gap-2 border-b border-slate-200 pb-1">
          <button
            onClick={() => setActiveTab("structure")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "structure"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Cấu trúc & Câu hỏi ({allQuestions.length})
          </button>
          <button
            onClick={() => setActiveTab("preflight")}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "preflight"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>Kiểm tra tiền xuất bản</span>
            {issues.length > 0 ? (
              <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[11px] font-bold text-white">
                {issues.length}
              </span>
            ) : (
              <span className="rounded-full bg-emerald-500 px-1.5 py-0.2 text-[11px] font-bold text-white">
                OK
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "preview"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Xem trước đề thi
          </button>
          <button
            onClick={() => setActiveTab("info")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "info"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Thông tin chung
          </button>
        </div>

        {/* TAB 1: STRUCTURE & QUESTIONS */}
        {activeTab === "structure" && (
          <div className="space-y-5">
            {/* PART FILTER PILLS */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActivePartFilter("all")}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                    activePartFilter === "all"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Tất cả Part ({groups.length} nhóm)
                </button>
                {TOEIC_PARTS.map((p) => {
                  const partGroupCount = groups.filter(
                    (g) => g.part === p.part,
                  ).length;
                  const partQuestionCount = groups
                    .filter((g) => g.part === p.part)
                    .reduce((sum, g) => sum + (g.questions?.length || 0), 0);
                  return (
                    <button
                      key={p.part}
                      onClick={() => setActivePartFilter(p.part)}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                        activePartFilter === p.part
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      Part {p.part} ({partGroupCount} nhóm · {partQuestionCount}{" "}
                      câu)
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  setEditingGroup(null);
                  setGroupForm({
                    part: activePartFilter === "all" ? 1 : activePartFilter,
                    groupOrder: groups.length + 1,
                    audioUrl: "",
                    imageUrl: "",
                    passageText: "",
                    transcriptText: "",
                    imageBrief: "",
                  });
                  setIsGroupModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
              >
                <Plus size={15} /> Thêm nhóm câu hỏi (Group)
              </button>
            </div>

            {/* GROUPS LIST */}
            {visibleGroups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
                Chưa có nhóm câu hỏi nào trong phần này. Hãy nhấn &quot;Thêm
                nhóm câu hỏi (Group)&quot; để bắt đầu.
              </div>
            ) : (
              <div className="space-y-5">
                {visibleGroups.map((group) => {
                  const partInfo = TOEIC_PARTS.find(
                    (p) => p.part === group.part,
                  );
                  return (
                    <div
                      key={group.id}
                      className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 hover:border-slate-300 transition-colors"
                    >
                      {/* GROUP HEADER */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-slate-900 px-2.5 py-0.5 text-xs font-bold text-white">
                              Part {group.part}
                            </span>
                            <span className="text-sm font-bold text-slate-800">
                              {partInfo?.label}
                            </span>
                            <span className="text-xs text-slate-500">
                              · Thứ tự #{group.groupOrder}
                            </span>
                          </div>

                          {/* MEDIA BADGES */}
                          <div className="flex items-center gap-3 pt-0.5 text-xs text-slate-500">
                            {group.audioUrl ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                                <Volume2 size={13} /> Có audio stimulus
                              </span>
                            ) : group.part <= 4 ? (
                              <span className="inline-flex items-center gap-1 text-rose-500 font-medium">
                                <AlertTriangle size={13} /> Thiếu audio Part 1-4
                              </span>
                            ) : null}

                            {group.mediaMetadata?.audio?.stale && (
                              <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                                <AlertTriangle size={13} /> Audio cần tạo lại
                              </span>
                            )}

                            {group.imageUrl ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                                <ImageIcon size={13} /> Có hình ảnh minh họa
                              </span>
                            ) : group.part === 1 ? (
                              <span className="inline-flex items-center gap-1 text-rose-500 font-medium">
                                <AlertTriangle size={13} /> Thiếu ảnh Part 1
                              </span>
                            ) : null}

                            {group.mediaMetadata?.image?.stale && (
                              <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                                <AlertTriangle size={13} /> Ảnh cần tạo lại
                              </span>
                            )}

                            {group.passageText ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                                <FileText size={13} /> Có đoạn văn (
                                {group.passageText.length} ký tự)
                              </span>
                            ) : group.part >= 6 ? (
                              <span className="inline-flex items-center gap-1 text-rose-500 font-medium">
                                <AlertTriangle size={13} /> Thiếu đoạn văn Part
                                6-7
                              </span>
                            ) : null}
                          </div>
                          {(group.part === 1 && !group.imageUrl) ||
                          (group.part <= 4 && !group.audioUrl) ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                              <AlertTriangle size={14} className="shrink-0" />
                              <span className="font-medium">
                                Draft còn media cần bổ sung trước khi xuất bản.
                              </span>
                              {group.part === 1 && !group.imageUrl && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      regenerateMediaMutation.mutate({
                                        groupId: group.id,
                                        kind: "image",
                                      })
                                    }
                                    disabled={regenerateMediaMutation.isPending}
                                    className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2.5 py-1 font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                                  >
                                    <RefreshCw size={12} /> Tạo lại bằng AI
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openGroupEditor(group)}
                                    className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2.5 py-1 font-semibold text-amber-800 hover:bg-amber-100"
                                  >
                                    <Upload size={12} /> Tải ảnh lên
                                  </button>
                                </>
                              )}
                              {group.part <= 4 && !group.audioUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    regenerateMediaMutation.mutate({
                                      groupId: group.id,
                                      kind: "audio",
                                    })
                                  }
                                  disabled={regenerateMediaMutation.isPending}
                                  className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2.5 py-1 font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                                >
                                  <RefreshCw size={12} /> Tạo lại audio
                                </button>
                              )}
                            </div>
                          ) : null}
                        </div>

                        {/* EXPLICIT GROUP ACTION BUTTONS */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setTargetGroupIdForQuestion(group.id);
                              setEditingQuestion(null);
                              const nextQNum =
                                allQuestions.length > 0
                                  ? Math.max(
                                      ...allQuestions.map(
                                        (q) => q.questionNumber,
                                      ),
                                    ) + 1
                                  : 1;
                              setQuestionForm({
                                questionNumber: nextQNum,
                                text: "",
                                options:
                                  group.part === 2
                                    ? ["", "", ""]
                                    : ["", "", "", ""],
                                correctIndex: 0,
                                explanation: "",
                              });
                              setIsQuestionModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 hover:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                          >
                            <Plus size={13} /> Thêm câu hỏi
                          </button>
                          {group.part === 5 && (
                            <button
                              type="button"
                              onClick={() => {
                                setAiPart5TargetGroup(group);
                                setAiPart5Candidates([]);
                                setIsAiPart5ModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors"
                            >
                              AI gợi ý câu hỏi TOEIC Part 5
                            </button>
                          )}
                          {group.part === 1 && (
                            <>
                              <button
                                type="button"
                                onClick={() => openImageSearch(group)}
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100"
                              >
                                <Search size={12} />{" "}
                                {group.imageUrl ? "Tìm ảnh khác" : "Tìm ảnh"}
                              </button>
                              {group.imageUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    visionMutation.mutate(group.id)
                                  }
                                  disabled={visionMutation.isPending}
                                  className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-100 disabled:opacity-50"
                                >
                                  <RefreshCw
                                    size={12}
                                    className={
                                      visionMutation.isPending
                                        ? "animate-spin"
                                        : ""
                                    }
                                  />{" "}
                                  Tạo câu hỏi từ ảnh
                                </button>
                              )}
                            </>
                          )}
                          <button
                            onClick={() => {
                              setEditingGroup(group);
                              setGroupForm({
                                part: group.part,
                                groupOrder: group.groupOrder,
                                audioUrl: group.audioUrl || "",
                                imageUrl: group.imageUrl || "",
                                passageText: group.passageText || "",
                                transcriptText: group.transcriptText || "",
                                imageBrief: group.imageBrief || "",
                              });
                              setIsGroupModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors"
                            title="Sửa nhóm câu hỏi"
                          >
                            <Edit2 size={12} /> Sửa nhóm
                          </button>
                          <button
                            onClick={() =>
                              setPendingDeleteGroup({
                                id: group.id,
                                part: group.part,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:border-rose-200 hover:bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors"
                            title="Xóa nhóm câu hỏi"
                          >
                            <Trash2 size={13} /> Xóa nhóm
                          </button>
                        </div>
                      </div>

                      {/* PASSAGE TEXT EXCERPT IF PRESENT */}
                      {group.passageText && (
                        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-700 max-h-40 overflow-y-auto whitespace-pre-line font-serif leading-relaxed">
                          {group.passageText}
                        </div>
                      )}

                      {/* QUESTIONS IN GROUP */}
                      {group.questions && group.questions.length > 0 ? (
                        <div className="space-y-3 pt-1">
                          {group.questions.map((q) => (
                            <div
                              key={q.id}
                              className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 text-xs space-y-2.5"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2.5">
                                  <span className="font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded text-xs shrink-0 shadow-2xs">
                                    Câu {q.questionNumber}
                                  </span>
                                  <p className="font-semibold text-sm text-slate-900 leading-snug">
                                    {q.text || "—"}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => {
                                      setTargetGroupIdForQuestion(group.id);
                                      setEditingQuestion(q);
                                      setQuestionForm({
                                        questionNumber: q.questionNumber,
                                        text: q.text || "",
                                        options: Array.isArray(q.options)
                                          ? [...q.options]
                                          : ["", "", "", ""],
                                        correctIndex: q.correctIndex,
                                        explanation: q.explanation || "",
                                      });
                                      setIsQuestionModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                    title="Sửa câu hỏi"
                                  >
                                    <Edit2 size={12} /> Sửa
                                  </button>
                                  <button
                                    onClick={() =>
                                      setPendingDeleteQuestion({
                                        id: q.id,
                                        questionNumber: q.questionNumber,
                                      })
                                    }
                                    className="rounded border border-slate-200 bg-white p-1 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-colors"
                                    title="Xóa câu hỏi"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>

                              {/* OPTIONS ROW */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                                {q.options.map((opt, optIdx) => {
                                  const isCorrect = optIdx === q.correctIndex;
                                  return (
                                    <div
                                      key={optIdx}
                                      className={`rounded-md px-3 py-1.5 text-xs font-medium flex items-center justify-between ${
                                        isCorrect
                                          ? "bg-emerald-50 text-emerald-950 border border-emerald-300 font-bold"
                                          : "bg-white text-slate-700 border border-slate-200"
                                      }`}
                                    >
                                      <span className="truncate">
                                        ({String.fromCharCode(65 + optIdx)}){" "}
                                        {opt}
                                      </span>
                                      {isCorrect && (
                                        <Check
                                          size={12}
                                          className="text-emerald-600 shrink-0"
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {q.explanation && (
                                <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded border border-slate-100">
                                  Giải thích: {q.explanation}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic py-2">
                          Nhóm này chưa có câu hỏi nào. Hãy nhấn &quot;+ Thêm
                          câu hỏi&quot; để bổ sung câu hỏi vào nhóm.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PREFLIGHT CHECKLIST */}
        {activeTab === "preflight" && (
          <div className="space-y-6 max-w-3xl mx-auto py-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Báo cáo kiểm tra chất lượng đề thi
                  </h2>
                  <p className="text-xs text-slate-500">
                    Hệ thống tự động kiểm tra tính toàn vẹn của âm thanh, hình
                    ảnh, đoạn văn và bộ đáp án.
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                      issues.length === 0
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {issues.length === 0
                      ? "✓ Sẵn sàng xuất bản"
                      : `⚠ Có ${issues.length} cảnh báo`}
                  </span>
                </div>
              </div>

              {/* STATS BREAKDOWN */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    Tổng số câu hỏi
                  </span>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {allQuestions.length}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    Số nhóm bài
                  </span>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {groups.length}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    Phần Listening
                  </span>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {
                      groups
                        .filter((g) => g.part <= 4)
                        .flatMap((g) => g.questions || []).length
                    }{" "}
                    câu
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    Phần Reading
                  </span>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {
                      groups
                        .filter((g) => g.part >= 5)
                        .flatMap((g) => g.questions || []).length
                    }{" "}
                    câu
                  </p>
                </div>
              </div>

              {/* ISSUES LIST */}
              {issues.length > 0 ? (
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                    Các mục cần hoàn thiện trước khi xuất bản:
                  </h3>
                  <div className="space-y-2">
                    {issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 flex items-start gap-2"
                      >
                        <AlertTriangle
                          size={15}
                          className="text-rose-600 shrink-0 mt-0.5"
                        />
                        <div>
                          <span className="font-bold font-mono">
                            [{issue.code}]
                          </span>{" "}
                          {issue.message}
                          {issue.groupId && (
                            <span className="text-rose-700 ml-1">
                              (Nhóm ID: {issue.groupId})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 flex items-center gap-3">
                  <CheckCircle2
                    size={20}
                    className="text-emerald-600 shrink-0"
                  />
                  <div>
                    <p className="font-bold">Đề thi hoàn hảo!</p>
                    <p className="text-emerald-700 mt-0.5">
                      Toàn bộ media, hình ảnh, đoạn văn và bảng đáp án đều hợp
                      lệ. Bạn có thể xuất bản đề thi ngay bây giờ.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PREVIEW */}
        {activeTab === "preview" && (
          <div className="space-y-6 max-w-3xl mx-auto py-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {examDetail.type === "FULL_TEST"
                    ? "TOEIC Full Test"
                    : "Luyện đề theo Part"}
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mt-2">
                  {examDetail.title}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Mô phỏng giao diện làm bài thi của học viên · Thời lượng:{" "}
                  {Math.round(examDetail.durationSeconds / 60)} phút
                </p>
              </div>

              {groups.map((group, idx) => (
                <div
                  key={group.id}
                  className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-5"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-sm text-slate-900">
                      Part {group.part} · Nhóm #{idx + 1}
                    </span>
                    <span className="text-xs text-slate-500">
                      {group.questions?.length || 0} câu hỏi
                    </span>
                  </div>

                  {group.imageUrl ? (
                    <div className="max-w-md mx-auto overflow-hidden rounded-lg border border-slate-200">
                      <img
                        src={group.imageUrl}
                        alt="Stimulus"
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  ) : group.part === 1 ? (
                    <div
                      role="status"
                      aria-live="polite"
                      className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-6 text-center text-amber-900"
                    >
                      <ImageOff size={28} className="text-amber-600" />
                      <div>
                        <p className="text-sm font-semibold">
                          Chưa có hình ảnh
                        </p>
                        <p className="mt-1 text-xs leading-5 text-amber-800">
                          Nội dung đã được tạo thành công. Ảnh chưa được tạo hoặc
                          tìm thấy. Bạn có thể bổ sung ảnh trước khi xuất bản.
                        </p>
                        {group.imageBrief && (
                          <p className="mt-2 rounded-md bg-white/70 p-2 text-left text-xs text-slate-600">
                            <span className="font-semibold">Image brief:</span>{" "}
                            {group.imageBrief}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            regenerateMediaMutation.mutate({
                              groupId: group.id,
                              kind: "image",
                            })
                          }
                          disabled={regenerateMediaMutation.isPending}
                          className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                        >
                          <RefreshCw size={13} /> Tạo lại bằng AI
                        </button>
                        <button
                          type="button"
                          onClick={() => openGroupEditor(group)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                        >
                          <Upload size={13} /> Tải ảnh lên
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {group.audioUrl ? (
                    <div className="rounded-lg bg-white border border-slate-200 p-3">
                      <audio
                        controls
                        src={group.audioUrl}
                        className="w-full h-8"
                      />
                    </div>
                  ) : group.part <= 4 ? (
                    <div
                      role="status"
                      aria-live="polite"
                      className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Volume2 size={16} className="text-amber-600" />
                        Chưa có audio stimulus; transcript vẫn được giữ trong
                        Draft.
                      </span>
                      <button
                        type="button"
                        onClick={() => openGroupEditor(group)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-300 bg-white px-2.5 py-1 font-semibold text-amber-900 hover:bg-amber-100"
                      >
                        <Upload size={12} /> Tải audio lên
                      </button>
                    </div>
                  ) : null}

                  {group.passageText && (
                    <div className="rounded-lg bg-white border border-slate-200 p-4 text-xs font-serif leading-relaxed text-slate-800 whitespace-pre-line">
                      {group.passageText}
                    </div>
                  )}

                  <div className="space-y-4 pt-2">
                    {group.questions?.map((q) => (
                      <div
                        key={q.id}
                        className="space-y-2 bg-white p-4 rounded-lg border border-slate-200"
                      >
                        <p className="font-bold text-xs text-slate-900">
                          Câu {q.questionNumber}. {q.text}
                        </p>
                        <div className="space-y-1.5 pl-2">
                          {q.options.map((opt, optIdx) => (
                            <label
                              key={optIdx}
                              className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer"
                            >
                              <input
                                type="radio"
                                name={`q-${q.id}`}
                                className="text-slate-900"
                              />
                              <span>
                                ({String.fromCharCode(65 + optIdx)}) {opt}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: METADATA & INFO */}
        {activeTab === "info" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateExamMutation.mutate({
                id: examDetail.id,
                dto: {
                  title: examDetail.title,
                  type: examDetail.type,
                  difficulty: examDetail.difficulty,
                  durationSeconds: examDetail.durationSeconds,
                  description: examDetail.description,
                },
              });
            }}
            className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên bộ đề thi *
              </label>
              <input
                type="text"
                value={examDetail.title}
                onChange={(e) => {
                  queryClient.setQueryData(
                    ["admin-exam-detail", selectedExamId],
                    {
                      ...examDetail,
                      title: e.target.value,
                    },
                  );
                }}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Định dạng đề
                </label>
                <select
                  value={examDetail.type}
                  onChange={(e) => {
                    queryClient.setQueryData(
                      ["admin-exam-detail", selectedExamId],
                      {
                        ...examDetail,
                        type: e.target.value as any,
                      },
                    );
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
                >
                  <option value="PRACTICE_BY_PART">Luyện tập theo Part</option>
                  <option value="FULL_TEST">
                    Full Test (200 câu TOEIC chuẩn)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Độ khó
                </label>
                <select
                  value={examDetail.difficulty}
                  onChange={(e) => {
                    queryClient.setQueryData(
                      ["admin-exam-detail", selectedExamId],
                      {
                        ...examDetail,
                        difficulty: e.target.value as any,
                      },
                    );
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
                >
                  <option value="easy">Dễ (Easy)</option>
                  <option value="medium">Trung bình (Medium)</option>
                  <option value="hard">Khó (Hard)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Thời lượng (phút)
              </label>
              <input
                type="number"
                min={5}
                max={240}
                value={Math.round(examDetail.durationSeconds / 60)}
                onChange={(e) => {
                  queryClient.setQueryData(
                    ["admin-exam-detail", selectedExamId],
                    {
                      ...examDetail,
                      durationSeconds: Number(e.target.value) * 60,
                    },
                  );
                }}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mô tả bộ đề thi
              </label>
              <textarea
                rows={3}
                value={examDetail.description || ""}
                onChange={(e) => {
                  queryClient.setQueryData(
                    ["admin-exam-detail", selectedExamId],
                    {
                      ...examDetail,
                      description: e.target.value,
                    },
                  );
                }}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
              />
            </div>

            <div className="flex items-center justify-end pt-3">
              <button
                type="submit"
                disabled={updateExamMutation.isPending}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {updateExamMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        )}

        {isImageSearchOpen && imageSearchGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Tìm ảnh · Part 1
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">
                    Tìm ảnh cho nhóm #{imageSearchGroup.groupOrder}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Ảnh chỉ được lưu chính thức sau khi chọn, tải về server và
                    upload vào R2.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsImageSearchOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                className="mt-5 flex flex-col gap-2 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  imageSearchMutation.mutate({
                    group: imageSearchGroup,
                    query: imageSearchQuery,
                  });
                }}
              >
                <label htmlFor="image-search-query" className="sr-only">
                  Từ khóa tìm ảnh
                </label>
                <input
                  id="image-search-query"
                  value={imageSearchQuery}
                  onChange={(event) => setImageSearchQuery(event.target.value)}
                  placeholder="Ví dụ: office workers arranging documents"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="submit"
                  disabled={imageSearchMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {imageSearchMutation.isPending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Search size={15} />
                  )}
                  {imageSearchMutation.isPending
                    ? "Đang tìm và phân tích ảnh..."
                    : "Tìm ảnh"}
                </button>
              </form>

              <div className="mt-5" aria-live="polite">
                {imageSearchMutation.isPending && (
                  <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                    Đang tìm ảnh, kiểm tra độ phù hợp và chuẩn bị ứng viên...
                  </p>
                )}
                {!imageSearchMutation.isPending &&
                  imageSearchCandidates.length === 0 && (
                    <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                      Nhập từ khóa rồi chọn “Tìm ảnh”. Hệ thống sẽ thử nguồn
                      miễn phí dự phòng trước khi bạn cần tải ảnh thủ công.
                    </p>
                  )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {imageSearchCandidates.map((candidate) => (
                    <article
                      key={candidate.id}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="aspect-[4/3] bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={candidate.previewUrl}
                          alt={`Ảnh ${candidate.provider || "nguồn mở"} của ${candidate.author}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="space-y-2 p-3">
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                          <span className="truncate">
                            {candidate.provider || "Nguồn mở"} ·{" "}
                            {candidate.author}
                          </span>
                          <span className="shrink-0">
                            {candidate.width}×{candidate.height}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Giấy phép: {candidate.license || "Cần Admin rà soát"}
                          {candidate.licenseVersion
                            ? ` ${candidate.licenseVersion}`
                            : ""}
                          {candidate.source
                            ? ` · Nguồn gốc: ${candidate.source}`
                            : ""}
                        </p>
                        {candidate.analysis ? (
                          <div
                            className={`rounded-md px-2.5 py-2 text-xs ${candidate.analysis.status === "SUITABLE" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}
                          >
                            <p className="font-semibold">
                              {candidate.analysis.status === "SUITABLE"
                                ? `Phù hợp · ${Math.round(candidate.analysis.score * 100)}%`
                                : candidate.analysis.status ===
                                    "ANALYSIS_FAILED"
                                  ? "Chưa có kết luận AI"
                                  : "AI đánh giá chưa tối ưu"}
                            </p>
                            <p className="mt-1 line-clamp-2">
                              {candidate.analysis.status === "SUITABLE"
                                ? candidate.analysis.sceneSummary
                                : candidate.analysis.status ===
                                    "ANALYSIS_FAILED"
                                  ? "Admin cần kiểm tra ảnh và câu hỏi trước khi xuất bản."
                                  : candidate.analysis.rejectionReasons?.join(
                                      ", ",
                                    )}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">
                            Chưa có phân tích tự động; Admin vẫn có thể xem và
                            chọn ảnh.
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            selectImageMutation.mutate(candidate.id)
                          }
                          disabled={selectImageMutation.isPending}
                          className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 ${candidate.analysis?.status === "UNSUITABLE" ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"}`}
                          aria-label={
                            candidate.analysis?.status === "UNSUITABLE"
                              ? "Chọn và tiếp tục với ảnh AI đánh giá chưa tối ưu"
                              : "Chọn ảnh này"
                          }
                        >
                          {selectImageMutation.isPending ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Check size={13} />
                          )}{" "}
                          {candidate.analysis?.status === "UNSUITABLE"
                            ? "Chọn và tiếp tục"
                            : "Chọn ảnh này"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500">
                  Nguồn/contributor được lưu trong metadata để Admin rà soát
                  trước khi xuất bản.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsImageSearchOpen(false);
                    openGroupEditor(imageSearchGroup);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Upload size={13} /> Tải ảnh lên thủ công
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ADD / EDIT GROUP */}
        {isGroupModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900">
                  {editingGroup
                    ? "Chỉnh sửa nhóm câu hỏi"
                    : "Thêm nhóm câu hỏi mới"}
                </h3>
                <button
                  onClick={() => setIsGroupModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveGroupMutation.mutate(groupForm);
                }}
                className="space-y-3.5 text-sm"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Part TOEIC *
                    </label>
                    <select
                      value={groupForm.part}
                      onChange={(e) =>
                        setGroupForm({
                          ...groupForm,
                          part: Number(e.target.value),
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400"
                    >
                      {TOEIC_PARTS.map((p) => (
                        <option key={p.part} value={p.part}>
                          Part {p.part} ({p.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Thứ tự nhóm
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={groupForm.groupOrder}
                      onChange={(e) =>
                        setGroupForm({
                          ...groupForm,
                          groupOrder: Number(e.target.value),
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                {groupForm.part <= 4 && (
                  <>
                    <div>
                      <AudioUploadField
                        label={`Tệp âm thanh nghe (Part ${groupForm.part}) *`}
                        value={groupForm.audioUrl}
                        onChange={(url) =>
                          setGroupForm({ ...groupForm, audioUrl: url })
                        }
                        helperText="Tải file âm thanh đoạn hội thoại/bài nghe lên R2, hoặc dán URL bên ngoài."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Transcript chuẩn (dùng để kiểm tra audio)
                      </label>
                      <textarea
                        rows={4}
                        value={groupForm.transcriptText}
                        onChange={(e) =>
                          setGroupForm({
                            ...groupForm,
                            transcriptText: e.target.value,
                          })
                        }
                        placeholder="Ví dụ: Woman: ...\nMan: ..."
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs leading-relaxed text-slate-800 outline-none focus:border-slate-400"
                      />
                    </div>
                  </>
                )}

                {groupForm.part === 1 && (
                  <>
                    <div>
                      <ImageUploadField
                        label="Hình ảnh bài thi (Part 1 Photo) *"
                        value={groupForm.imageUrl}
                        onChange={(url) =>
                          setGroupForm({ ...groupForm, imageUrl: url })
                        }
                        helperText="Tải ảnh mô tả cho Part 1. Hệ thống lưu trực tiếp lên Cloudflare R2."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Mô tả ảnh gốc (AI regeneration)
                      </label>
                      <textarea
                        rows={3}
                        value={groupForm.imageBrief}
                        onChange={(e) =>
                          setGroupForm({
                            ...groupForm,
                            imageBrief: e.target.value,
                          })
                        }
                        placeholder="Mô tả cảnh không có chữ để có thể tạo lại ảnh đúng ngữ cảnh"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs leading-relaxed text-slate-800 outline-none focus:border-slate-400"
                      />
                    </div>
                  </>
                )}

                {groupForm.part >= 6 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Đoạn văn đọc hiểu (Part 6–7) *
                    </label>
                    <textarea
                      rows={6}
                      placeholder="Dán nội dung đoạn văn, email, bài báo..."
                      value={groupForm.passageText}
                      onChange={(e) =>
                        setGroupForm({
                          ...groupForm,
                          passageText: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400 text-xs font-serif leading-relaxed"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsGroupModalOpen(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={saveGroupMutation.isPending}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {saveGroupMutation.isPending
                      ? "Đang lưu..."
                      : editingGroup
                        ? "Cập nhật"
                        : "Thêm mới"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD / EDIT QUESTION */}
        {isQuestionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900">
                  {editingQuestion
                    ? `Chỉnh sửa câu hỏi #${editingQuestion.questionNumber}`
                    : "Thêm câu hỏi mới"}
                </h3>
                <button
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (questionForm.options.some((o) => !o.trim())) {
                    toast.error("Vui lòng điền đủ tất cả phương án!");
                    return;
                  }
                  saveQuestionMutation.mutate(questionForm);
                }}
                className="space-y-3.5 text-sm"
              >
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Số thứ tự câu *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={questionForm.questionNumber}
                      onChange={(e) =>
                        setQuestionForm({
                          ...questionForm,
                          questionNumber: Number(e.target.value),
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Câu hỏi (prompt)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. What is the topic of the meeting?"
                      value={questionForm.text}
                      onChange={(e) =>
                        setQuestionForm({
                          ...questionForm,
                          text: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Các lựa chọn & Đáp án đúng *
                  </label>
                  {questionForm.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="examCorrectAnswer"
                        checked={questionForm.correctIndex === idx}
                        onChange={() =>
                          setQuestionForm({
                            ...questionForm,
                            correctIndex: idx,
                          })
                        }
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        title="Đánh dấu đáp án đúng"
                      />
                      <span className="w-5 text-xs font-bold text-slate-500">
                        ({String.fromCharCode(65 + idx)})
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...questionForm.options];
                          newOpts[idx] = e.target.value;
                          setQuestionForm({
                            ...questionForm,
                            options: newOpts,
                          });
                        }}
                        placeholder={`Lựa chọn ${String.fromCharCode(65 + idx)}`}
                        required
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giải thích chi tiết (tùy chọn)
                  </label>
                  <textarea
                    rows={2}
                    value={questionForm.explanation}
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        explanation: e.target.value,
                      })
                    }
                    placeholder="Giải thích đáp án cho học viên xem lại sau khi nộp bài..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400 text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsQuestionModalOpen(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={saveQuestionMutation.isPending}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {saveQuestionMutation.isPending
                      ? "Đang lưu..."
                      : editingQuestion
                        ? "Cập nhật"
                        : "Thêm mới"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: AI TOEIC PART 5 GENERATOR & REVIEW */}
        {isAiPart5ModalOpen && aiPart5TargetGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900">
                    AI gợi ý câu hỏi TOEIC Part 5
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Nhóm #{aiPart5TargetGroup.groupOrder} • Hoàn thành câu
                    (Incomplete Sentences)
                  </p>
                </div>
                <button
                  onClick={() => setIsAiPart5ModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Chủ đề từ vựng (tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={aiPart5Topic}
                      onChange={(e) => setAiPart5Topic(e.target.value)}
                      placeholder="e.g. Office, Marketing, Travel, Finance"
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Trọng tâm ngữ pháp (tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={aiPart5GrammarFocus}
                      onChange={(e) => setAiPart5GrammarFocus(e.target.value)}
                      placeholder="e.g. Word forms, Prepositions, Tenses, Conjunctions"
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-slate-800 outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <label className="font-semibold text-slate-700">
                      Số câu:
                    </label>
                    <select
                      value={aiPart5Count}
                      onChange={(e) => setAiPart5Count(Number(e.target.value))}
                      disabled={isAiPart5Loading}
                      className="rounded-lg border border-slate-200 px-3 py-1 text-slate-800 outline-none"
                    >
                      <option value={3}>3 câu</option>
                      <option value={5}>5 câu (chuẩn)</option>
                      <option value={10}>10 câu</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={isAiPart5Loading}
                    onClick={handleGenerateAiPart5}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  >
                    {isAiPart5Loading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : null}
                    {aiPart5Candidates.length > 0
                      ? "AI gợi ý lại"
                      : "AI gợi ý câu hỏi nháp"}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
                {aiPart5Candidates.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
                    Nhấn "AI gợi ý câu hỏi nháp" để AI đề xuất các câu hỏi luyện
                    tập format TOEIC Part 5 với chỗ trống và 4 phương án.
                  </div>
                ) : (
                  aiPart5Candidates.map((candidate, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-bold text-slate-800">
                          Câu {idx + 1}:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setAiPart5Candidates((prev) =>
                              prev.filter((_, i) => i !== idx),
                            );
                          }}
                          className="text-slate-400 hover:text-rose-600 text-[11px]"
                        >
                          Bỏ qua
                        </button>
                      </div>
                      <input
                        type="text"
                        value={candidate.prompt}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAiPart5Candidates((prev) =>
                            prev.map((c, i) =>
                              i === idx ? { ...c, prompt: val } : c,
                            ),
                          );
                        }}
                        className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        {candidate.options.map((opt, optIdx) => {
                          const letter =
                            ["A", "B", "C", "D"][optIdx] || String(optIdx);
                          const isCorrect = candidate.correctIndex === optIdx;
                          return (
                            <div
                              key={optIdx}
                              className={`flex items-center gap-1.5 rounded border px-2 py-1.5 bg-white ${
                                isCorrect
                                  ? "border-emerald-500 ring-1 ring-emerald-200"
                                  : "border-slate-200"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setAiPart5Candidates((prev) =>
                                    prev.map((c, i) =>
                                      i === idx
                                        ? { ...c, correctIndex: optIdx }
                                        : c,
                                    ),
                                  );
                                }}
                                className={`h-5 w-5 rounded text-[11px] font-bold flex items-center justify-center ${
                                  isCorrect
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                                title="Đặt làm đáp án đúng"
                              >
                                {letter}
                              </button>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAiPart5Candidates((prev) =>
                                    prev.map((c, i) =>
                                      i === idx
                                        ? {
                                            ...c,
                                            options: c.options.map((o, oi) =>
                                              oi === optIdx ? val : o,
                                            ),
                                          }
                                        : c,
                                    ),
                                  );
                                }}
                                className="flex-1 bg-transparent text-xs text-slate-800 outline-none"
                              />
                              {isCorrect ? (
                                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
                                  Đúng
                                </span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Giải thích:
                        </label>
                        <input
                          type="text"
                          value={candidate.explanation}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAiPart5Candidates((prev) =>
                              prev.map((c, i) =>
                                i === idx ? { ...c, explanation: val } : c,
                              ),
                            );
                          }}
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none"
                        />
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setTargetGroupIdForQuestion(aiPart5TargetGroup.id);
                            setEditingQuestion(null);
                            const nextQNum =
                              allQuestions.length > 0
                                ? Math.max(
                                    ...allQuestions.map(
                                      (q) => q.questionNumber,
                                    ),
                                  ) + 1
                                : 1;
                            setQuestionForm({
                              questionNumber: nextQNum,
                              text: candidate.prompt,
                              options: [...candidate.options],
                              correctIndex: candidate.correctIndex,
                              explanation: candidate.explanation,
                            });
                            setIsAiPart5ModalOpen(false);
                            setIsQuestionModalOpen(true);
                            toast.success(
                              "Đã áp dụng câu hỏi Part 5 vào form. Bạn có thể kiểm tra và bấm Thêm câu hỏi.",
                            );
                          }}
                          className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                        >
                          Áp dụng vào form
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAiPart5ModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRM DELETE EXAM */}
        <ConfirmDialog
          open={!!pendingDeleteExam}
          title="Xác nhận xóa bộ đề thi"
          description={`Bạn có chắc chắn muốn xóa bộ đề thi "${pendingDeleteExam?.title}"? Toàn bộ các nhóm câu hỏi và câu hỏi sẽ bị xóa. Nếu đề thi đã có lượt làm bài của học viên, hệ thống sẽ từ chối để bảo toàn kết quả thi.`}
          confirmLabel="Xóa đề thi"
          isPending={deleteExamMutation.isPending}
          onConfirm={() => {
            if (pendingDeleteExam)
              deleteExamMutation.mutate(pendingDeleteExam.id);
          }}
          onCancel={() => setPendingDeleteExam(null)}
        />

        {/* CONFIRM DELETE GROUP */}
        <ConfirmDialog
          open={!!pendingDeleteGroup}
          title="Xác nhận xóa nhóm câu hỏi"
          description={`Bạn có chắc chắn muốn xóa nhóm câu hỏi Part ${pendingDeleteGroup?.part}? Toàn bộ câu hỏi thuộc nhóm này sẽ bị xóa. Nếu đề đã có học viên thi, hệ thống sẽ từ chối.`}
          confirmLabel="Xóa nhóm"
          isPending={deleteGroupMutation.isPending}
          onConfirm={() => {
            if (pendingDeleteGroup)
              deleteGroupMutation.mutate(pendingDeleteGroup.id);
          }}
          onCancel={() => setPendingDeleteGroup(null)}
        />

        {/* CONFIRM DELETE QUESTION */}
        <ConfirmDialog
          open={!!pendingDeleteQuestion}
          title="Xác nhận xóa câu hỏi"
          description={`Bạn có chắc chắn muốn xóa câu hỏi số ${pendingDeleteQuestion?.questionNumber}? Nếu câu hỏi đã có lượt làm bài trong lịch sử thi, hệ thống sẽ từ chối để bảo toàn kết quả thi.`}
          confirmLabel="Xóa câu hỏi"
          isPending={deleteQuestionMutation.isPending}
          onConfirm={() => {
            if (pendingDeleteQuestion && targetGroupIdForQuestion) {
              deleteQuestionMutation.mutate({
                groupId: targetGroupIdForQuestion,
                questionId: pendingDeleteQuestion.id,
              });
            } else if (pendingDeleteQuestion) {
              const foundGroup = groups.find((g) =>
                g.questions?.some((q) => q.id === pendingDeleteQuestion.id),
              );
              if (foundGroup) {
                deleteQuestionMutation.mutate({
                  groupId: foundGroup.id,
                  questionId: pendingDeleteQuestion.id,
                });
              }
            }
          }}
          onCancel={() => setPendingDeleteQuestion(null)}
        />
      </main>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Exam Sets Catalog / List Page
  // -------------------------------------------------------------
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      {/* HEADER */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-500">
            NỘI DUNG HỌC / LUYỆN ĐỀ
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            Kho đề luyện
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý các bộ đề theo kỳ thi, loại đề và trạng thái sẵn sàng.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/admin/exams/new"
            className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 shadow-sm transition hover:border-amber-400 hover:bg-amber-100"
          >
            <FileStack size={16} /> AI tạo đề
          </a>
          <button
            onClick={() => {
              setExamForm({
                title: "",
                description: "",
                familyCode: "TOEIC",
                variantCode: "TOEIC_LR",
                type: "PRACTICE_BY_PART",
                difficulty: "medium",
                durationMinutes: 45,
              });
              setIsExamModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus size={16} /> Tạo đề
          </button>
        </div>
      </header>

      {/* FILTER & SEARCH */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            size={17}
          />
          <input
            type="text"
            placeholder="Tìm kiếm bộ đề thi theo tên hoặc mô tả..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-400 shadow-xs"
          />
        </div>
        <select
          aria-label="Lọc kỳ thi"
          value={familyFilter}
          onChange={(event) => {
            setFamilyFilter(event.target.value);
            setCurrentPage(1);
          }}
          className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-400 sm:w-40"
        >
          <option value="ALL">Tất cả kỳ thi</option>
          <option value="TOEIC">TOEIC</option>
          <option value="IELTS">IELTS (Coming soon)</option>
        </select>
        <select
          aria-label="Lọc loại đề"
          value={variantFilter}
          onChange={(event) => {
            setVariantFilter(event.target.value);
            setCurrentPage(1);
          }}
          className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-400 sm:w-48"
        >
          <option value="ALL">Tất cả loại đề</option>
          <option value="TOEIC_LR">Listening &amp; Reading</option>
          <option value="TOEIC_SW">Speaking &amp; Writing</option>
          <option value="TOEIC_4_SKILLS">4 kỹ năng</option>
        </select>
        <select
          aria-label="Lọc trạng thái"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(
              event.target.value as "ALL" | "DRAFT" | "PUBLISHED",
            );
            setCurrentPage(1);
          }}
          className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-400 sm:w-48"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="DRAFT">Bản nháp</option>
          <option value="PUBLISHED">Đã xuất bản</option>
        </select>
      </div>

      {/* EXAMS GRID */}
      {isExamsLoading ? (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="animate-spin text-slate-600" />
        </div>
      ) : paginatedExams && paginatedExams.length > 0 ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedExams.map((exam) => {
              const isPublished = exam.publicationStatus === "PUBLISHED";
              return (
                <article
                  key={exam.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {exam.familyCode || "TOEIC"} ·{" "}
                        {exam.variantCode
                          ? examVariantLabel(exam.variantCode)
                          : exam.type === "FULL_TEST"
                            ? "Đề đầy đủ"
                            : "Theo Part"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          isPublished
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {isPublished ? "Đã xuất bản" : "Bản nháp"}
                      </span>
                    </div>

                    <div>
                      <h2 className="font-bold text-slate-900 leading-snug">
                        {exam.title}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                        {exam.description || "Chưa có mô tả cho bộ đề thi này."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5 text-xs text-slate-500">
                    <div className="flex items-center gap-1 font-semibold text-slate-600">
                      <Clock size={13} />{" "}
                      {Math.round((exam.durationSeconds || 7200) / 60)} phút ·{" "}
                      {exam.totalQuestions || 0} câu
                    </div>
                    <span
                      className={`text-[11px] font-semibold ${exam.learnerReady ? "text-emerald-600" : "text-amber-600"}`}
                    >
                      {exam.learnerReady ? "Sẵn sàng" : "Chưa sẵn sàng"}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedExamId(exam.id)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
                      >
                        Quản lý đề
                      </button>
                      <button
                        onClick={() =>
                          setPendingDeleteExam({
                            id: exam.id,
                            title: exam.title,
                          })
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Xóa đề thi"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center pt-2">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
          Không tìm thấy bộ đề thi nào. Hãy tạo bộ đề đầu tiên!
        </div>
      )}

      {/* MODAL: CREATE EXAM */}
      {isExamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900">Tạo đề</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Hệ thống tự chọn cấu trúc phù hợp theo kỳ thi và loại đề.
                </p>
              </div>
              <button
                onClick={() => setIsExamModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createExamMutation.mutate(examForm);
              }}
              className="space-y-3.5 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên bộ đề thi *
                </label>
                <input
                  type="text"
                  value={examForm.title}
                  onChange={(e) =>
                    setExamForm({ ...examForm, title: e.target.value })
                  }
                  placeholder="e.g. ETS TOEIC Practice Test 01"
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kỳ thi
                  </label>
                  <select
                    value={examForm.familyCode}
                    onChange={(e) =>
                      setExamForm({
                        ...examForm,
                        familyCode: e.target.value,
                        variantCode: "TOEIC_LR",
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400"
                  >
                    <option value="TOEIC">TOEIC</option>
                    <option value="IELTS" disabled>
                      IELTS (Coming soon)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Loại sản phẩm
                  </label>
                  <select
                    value={examForm.variantCode}
                    onChange={(e) =>
                      setExamForm({ ...examForm, variantCode: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400"
                  >
                    <option value="TOEIC_LR">Listening & Reading</option>
                    <option value="TOEIC_SW">Speaking & Writing</option>
                    <option value="TOEIC_4_SKILLS">4 kỹ năng</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Loại đề
                  </label>
                  <select
                    value={examForm.type}
                    onChange={(e) =>
                      setExamForm({ ...examForm, type: e.target.value as any })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400"
                  >
                    <option value="PRACTICE_BY_PART">
                      Luyện tập theo Part
                    </option>
                    <option value="FULL_TEST">Full Test 200 câu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Độ khó
                  </label>
                  <select
                    value={examForm.difficulty}
                    onChange={(e) =>
                      setExamForm({
                        ...examForm,
                        difficulty: e.target.value as any,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400"
                  >
                    <option value="easy">Dễ (Easy)</option>
                    <option value="medium">Trung bình (Medium)</option>
                    <option value="hard">Khó (Hard)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Thời lượng làm bài (phút)
                </label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={examForm.durationMinutes}
                  onChange={(e) =>
                    setExamForm({
                      ...examForm,
                      durationMinutes: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả (tùy chọn)
                </label>
                <textarea
                  rows={2}
                  value={examForm.description}
                  onChange={(e) =>
                    setExamForm({ ...examForm, description: e.target.value })
                  }
                  placeholder="Mô tả nguồn gốc hoặc phạm vi bài thi..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExamModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={createExamMutation.isPending}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {createExamMutation.isPending
                    ? "Đang tạo..."
                    : "Tạo bản nháp"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE EXAM */}
      <ConfirmDialog
        open={!!pendingDeleteExam}
        title="Xác nhận xóa bộ đề thi"
        description={`Bạn có chắc chắn muốn xóa bộ đề thi "${pendingDeleteExam?.title}"? Toàn bộ các nhóm câu hỏi và câu hỏi sẽ bị xóa. Nếu đề thi đã có lượt làm bài của học viên, hệ thống sẽ từ chối để bảo toàn kết quả thi.`}
        confirmLabel="Xóa đề thi"
        isPending={deleteExamMutation.isPending}
        onConfirm={() => {
          if (pendingDeleteExam)
            deleteExamMutation.mutate(pendingDeleteExam.id);
        }}
        onCancel={() => setPendingDeleteExam(null)}
      />
    </main>
  );
}
