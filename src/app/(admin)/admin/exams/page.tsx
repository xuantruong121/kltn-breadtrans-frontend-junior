"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Plus,
  Loader2,
  Search,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
  Clock,
  ArrowUp,
  ArrowDown,
  X,
  Eye,
  Check,
  ShieldAlert,
  FileStack,
  Upload,
  ArrowRight,
} from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { Pagination } from "@/components/ui";
import { useAdminList } from "@/components/admin/useAdminList";
import { ADMIN_PAGE_SIZES } from "@/components/admin/adminList";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  ExamRetireAction,
  examStatusLabel,
} from "@/components/admin/exam/ExamRetireAction";
import ImageUploadField from "@/components/admin/ImageUploadField";
import { formAudioPreviewSrc } from "@/lib/toeic/adminGroupAudio";
import {
  ExamGroupCard,
  type ExamCardQuestion,
} from "@/components/admin/exam/ExamGroupCard";
import { examGroupLabel, type GroupAction } from "@/lib/examStudio/examGroupCard";
import AudioUploadField from "@/components/admin/AudioUploadField";
import ToeicSpeakingExamComposer from "@/components/admin/ToeicSpeakingExamComposer";
import ToeicWritingExamComposer from "@/components/admin/ToeicWritingExamComposer";
import {
  getPublishReadinessUi,
  getReadinessIssueLabel,
} from "@/lib/examStudio/readinessUi";
import { getApiErrorMessage } from "@/lib/utils/apiError";

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
  /** Signed URL for a migrated (private-bucket) clip; audioUrl then holds its key. */
  audioPlaybackUrl?: string | null;
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
  publicationStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sharedLrExams?: number;
  /** False when a 4-skill exam reads another exam's L&R. */
  lrEditable?: boolean;
  /** Part 1, Speaking and Writing slots that need a picture and have none. */
  missingImageCount?: number;
  missingImages?: Array<{
    section: "LR" | "SPEAKING" | "WRITING";
    label: string;
    brief: string | null;
    questionNumber?: number;
  }>;
  /** The AI draft still waits for review; false once it is applied. */
  aiReviewPending?: boolean;
  /** The one recording of the whole Listening section. */
  listeningMaster?: {
    state: "NOT_NEEDED" | "MISSING" | "STALE" | "READY";
    durationSeconds?: number;
    url?: string | null;
  } | null;
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
  updatedAt?: string;
  readinessSummary?: Array<{
    key: string;
    label: string;
    state: "READY" | "WARNING" | "INCOMPLETE";
    issueCount: number;
  }>;
  aiGenerationJobId?: string | null;
  validation?: {
    counts: Record<string, number>;
    issues: Array<{
      code: string;
      message: string;
      humanMessage?: string;
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
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "DRAFT" | "PUBLISHED" | "ARCHIVED"
  >("ALL");
  const [familyFilter, setFamilyFilter] = useState("ALL");
  const [variantFilter, setVariantFilter] = useState("ALL");
  const examIdFromUrl = Number(
    searchParams.get("exam") ?? searchParams.get("examId"),
  );
  const [selectedExamId, setSelectedExamId] = useState<number | null>(
    Number.isInteger(examIdFromUrl) && examIdFromUrl > 0 ? examIdFromUrl : null,
  );
  const [readyFilter, setReadyFilter] = useState<"ALL" | "READY" | "NOT_READY">(
    "ALL",
  );
  const [examSort, setExamSort] = useState<"UPDATED" | "TITLE" | "QUESTIONS">(
    "UPDATED",
  );
  const [activeTab, setActiveTab] = useState<
    "structure" | "speaking" | "writing" | "preflight" | "info"
  >("structure");
  // An exam holds 103 groups: open one Part, not all of them.
  const [activePartFilter, setActivePartFilter] = useState<number | "all">(1);
  const questionFromUrl = Number(searchParams.get("q"));
  const [pendingQuestion, setPendingQuestion] = useState<number | null>(
    Number.isInteger(questionFromUrl) && questionFromUrl > 0
      ? questionFromUrl
      : null,
  );
  const [focusedQuestion, setFocusedQuestion] = useState<number | null>(null);
  const [jumpInput, setJumpInput] = useState("");

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
        getApiErrorMessage(err, "Không thể tạo câu hỏi Part 5 lúc này."),
      );
    } finally {
      setIsAiPart5Loading(false);
    }
  };

  // 1. One page of exams; search, filters and sort run on the server.
  // 12 fills rows of 2, 3 and 4 cards.
  const examList = useAdminList<
    any,
    { total: number; published: number; learnerReady: number }
  >({
    key: "admin-exams",
    url: "/admin/exams",
    search: searchTerm,
    filters: {
      status: statusFilter,
      family: familyFilter,
      variant: variantFilter,
      ready: readyFilter,
      sort: examSort,
    },
    initialPageSize: 12,
  });
  const isExamsLoading = examList.isLoading;
  // The page resets itself when a filter changes.
  const setCurrentPage = examList.setPage;
  const totalExams = examList.facets?.total ?? 0;

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
      toast.error(getApiErrorMessage(err, "Không thể tạo bộ đề thi")),
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
      toast.error(getApiErrorMessage(err, "Không thể cập nhật đề thi")),
  });

  const buildMasterMutation = useMutation({
    mutationFn: async (id: number) =>
      axiosClient.post(`/admin/exams/${id}/listening-master`),
    onSuccess: () => {
      toast.success("Đã dựng audio Listening liền mạch.");
      queryClient.invalidateQueries({
        queryKey: ["admin-exam-detail", selectedExamId],
      });
    },
    onError: (err: any) =>
      toast.error(getApiErrorMessage(err, "Không dựng được audio liền mạch")),
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
      const msg = getApiErrorMessage(err, "Chưa đủ điều kiện xuất bản");
      const issues = err?.response?.data?.issues;
      if (Array.isArray(issues) && issues.length > 0) {
        toast.error(
          `${msg}:\n${issues
            .slice(0, 3)
            .map((i: any) => `• ${i.humanMessage ?? i.message}`)
            .join("\n")}`,
        );
      } else {
        toast.error(getApiErrorMessage(err, "Không thể xuất bản đề thi"));
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
      toast.error(getApiErrorMessage(err, "Không thể gỡ xuất bản")),
  });

  const refreshExam = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
    queryClient.invalidateQueries({
      queryKey: ["admin-exam-detail", selectedExamId],
    });
  };

  const deleteExamMutation = useMutation({
    mutationFn: async (id: number) => axiosClient.delete(`/admin/exams/${id}`),
    onSuccess: () => {
      toast.success("Đã xóa bộ đề thi!");
      setPendingDeleteExam(null);
      if (selectedExamId === pendingDeleteExam?.id) setSelectedExamId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
    },
    onError: (err: any) =>
      toast.error(getApiErrorMessage(err, "Không thể xóa đề thi")),
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
      toast.error(getApiErrorMessage(err, "Không thể lưu nhóm câu hỏi")),
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
        getApiErrorMessage(err, "Không thể tạo lại media. Bạn có thể tải tệp lên thủ công."),
      ),
  });

  const fillMissingImagesMutation = useMutation({
    mutationFn: async (examId: number) => {
      // The axios client already unwraps the response envelope.
      return (await axiosClient.post(
        `/admin/exams/${examId}/ai/images/fill-missing`,
      )) as unknown as { filled: string[]; missing: string[] };
    },
    onSuccess: ({ filled, missing }) => {
      if (missing.length)
        toast.error(
          `Đã có ảnh cho ${filled.length} ô. Còn thiếu: ${missing.join(", ")}.`,
        );
      else if (filled.length)
        toast.success(`Đã tìm được ảnh cho ${filled.length} ô.`);
      else toast.success("Đề không còn ô nào thiếu ảnh.");
      queryClient.invalidateQueries({
        queryKey: ["admin-exam-detail", selectedExamId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
    },
    onError: (err: any) =>
      toast.error(getApiErrorMessage(err, "Không thể tìm ảnh còn thiếu")),
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
        getApiErrorMessage(err, "Không thể tìm ảnh tự động lúc này."),
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
      toast.error(getApiErrorMessage(err, "Không thể chọn ảnh.")),
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
        getApiErrorMessage(err, "Không thể phân tích ảnh lúc này."),
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
      toast.error(getApiErrorMessage(err, "Không thể xóa nhóm câu hỏi")),
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
      toast.error(getApiErrorMessage(err, "Không thể lưu câu hỏi")),
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
      toast.error(getApiErrorMessage(err, "Không thể xóa câu hỏi")),
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

  const openAddQuestion = (group: ExamGroup) => {
    const numbers = (examDetail?.groups ?? []).flatMap((g) =>
      (g.questions ?? []).map((q) => q.questionNumber),
    );
    setTargetGroupIdForQuestion(group.id);
    setEditingQuestion(null);
    setQuestionForm({
      questionNumber: numbers.length ? Math.max(...numbers) + 1 : 1,
      text: "",
      options: group.part === 2 ? ["", "", ""] : ["", "", "", ""],
      correctIndex: 0,
      explanation: "",
    });
    setIsQuestionModalOpen(true);
  };

  const openEditQuestion = (group: ExamGroup, question: ExamCardQuestion) => {
    setTargetGroupIdForQuestion(group.id);
    setEditingQuestion(question as ExamQuestion);
    setQuestionForm({
      questionNumber: question.questionNumber,
      text: question.text || "",
      options: Array.isArray(question.options)
        ? [...question.options]
        : ["", "", "", ""],
      correctIndex: question.correctIndex,
      explanation: question.explanation || "",
    });
    setIsQuestionModalOpen(true);
  };

  const runGroupAction = (action: GroupAction, group: ExamGroup) => {
    if (action === "editContent") openGroupEditor(group);
    if (action === "findImage") openImageSearch(group);
    if (action === "questionFromImage") visionMutation.mutate(group.id);
    if (action === "regenerateAudio")
      regenerateMediaMutation.mutate({ groupId: group.id, kind: "audio" });
    if (action === "addQuestion") openAddQuestion(group);
    if (action === "deleteGroup")
      setPendingDeleteGroup({ id: group.id, part: group.part });
    if (action === "suggestQuestion") {
      setAiPart5TargetGroup(group);
      setAiPart5Candidates([]);
      setIsAiPart5ModalOpen(true);
    }
  };

  // Jump to a question: from the "Đến câu" box or back from the preview.
  useEffect(() => {
    if (!pendingQuestion || !examDetail?.groups) return;
    const target = pendingQuestion;
    const group = examDetail.groups.find((g) =>
      (g.questions ?? []).some((q) => q.questionNumber === target),
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingQuestion(null);
    if (!group) {
      toast.error(`Không tìm thấy câu ${target}.`);
      return;
    }
    setActiveTab("structure");
    setActivePartFilter(group.part);
    setFocusedQuestion(target);
    window.setTimeout(() => {
      document
        .getElementById(`exam-question-${target}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }, [pendingQuestion, examDetail]);

  const examFiltersActive =
    searchTerm.trim() !== "" ||
    statusFilter !== "ALL" ||
    familyFilter !== "ALL" ||
    variantFilter !== "ALL" ||
    readyFilter !== "ALL";
  const paginatedExams = examList.items;

  // -------------------------------------------------------------
  // RENDER: Exam Workspace / Editor when an exam is selected
  // -------------------------------------------------------------
  if (selectedExamId && examDetail) {
    const isPublished = examDetail.publicationStatus === "PUBLISHED";
    const groups = examDetail.groups || [];
    const allQuestions = groups.flatMap((g) => g.questions || []);
    const validation = examDetail.validation;
    const issues = validation?.issues || [];
    const publishReadiness = getPublishReadinessUi(
      examDetail.learnerReady,
      issues.length,
    );

    const focusReadinessIssue = (issue: (typeof issues)[number]) => {
      const targetGroup = issue.groupId
        ? groups.find((group) => group.id === issue.groupId)
        : undefined;
      setActiveTab("structure");
      if (!targetGroup) return;
      setActivePartFilter(targetGroup.part);
      requestAnimationFrame(() => {
        document
          .getElementById(`exam-group-${targetGroup.id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    };

    const visibleGroups =
      activePartFilter === "all"
        ? groups
        : groups.filter((g) => g.part === activePartFilter);

    const isDraft = examDetail.publicationStatus === "DRAFT";
    const master = examDetail.listeningMaster;
    const hasLr = examDetail.variantCode !== "TOEIC_SW";
    const hasTasks =
      examDetail.variantCode === "TOEIC_SW" ||
      examDetail.variantCode === "TOEIC_4_SKILLS";
    const lrEditable = hasLr && examDetail.lrEditable !== false;
    // An exam without L&R opens on Speaking.
    const tab = activeTab === "structure" && !hasLr ? "speaking" : activeTab;
    const readiness = examDetail.readiness;
    const tabStatus = (ready: boolean | undefined) =>
      ready ? (
        <CheckCircle2
          size={14}
          className="text-emerald-500"
          aria-label="Sẵn sàng"
        />
      ) : (
        <AlertTriangle
          size={14}
          className="text-amber-500"
          aria-label="Chưa đủ điều kiện"
        />
      );
    const tabClass = (selected: boolean) =>
      `inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
        selected
          ? "bg-slate-900 text-white"
          : "text-slate-600 hover:bg-slate-100"
      }`;

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
              <div className="flex flex-wrap items-center gap-2">
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
                  {examStatusLabel(examDetail.publicationStatus)}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {Math.round(examDetail.durationSeconds / 60)} phút ·{" "}
                {examDetail.totalQuestions || 0} câu ·{" "}
                {examDetail.attemptsCount || 0} lượt làm bài
              </p>
              {examDetail.description && (
                <p
                  title={examDetail.description}
                  className="mt-0.5 line-clamp-1 max-w-3xl text-sm text-slate-500"
                >
                  {examDetail.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/admin/exams/${examDetail.id}/learner-preview`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Eye size={15} /> Xem như học viên
            </a>
            {examDetail.aiGenerationJobId && examDetail.aiReviewPending && (
              <a
                href={`/admin/exams/ai/${examDetail.aiGenerationJobId}`}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Duyệt bản AI
              </a>
            )}
            {examDetail.publicationStatus === "ARCHIVED" ||
            (isPublished && examDetail.attemptsCount) ? (
              <ExamRetireAction
                examId={examDetail.id}
                status={examDetail.publicationStatus}
                sharedLrExams={examDetail.sharedLrExams}
                onChanged={refreshExam}
              />
            ) : isPublished ? (
              <button
                onClick={() => unpublishExamMutation.mutate(examDetail.id)}
                disabled={unpublishExamMutation.isPending}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Chuyển về bản nháp
              </button>
                ) : (
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex flex-wrap justify-end gap-2">
                    {(examDetail.missingImageCount ?? 0) > 0 && (
                      <button
                        onClick={() => fillMissingImagesMutation.mutate(examDetail.id)}
                        disabled={fillMissingImagesMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <ImageIcon size={15} />
                        {fillMissingImagesMutation.isPending
                          ? "Đang tìm ảnh..."
                          : `Tìm ${examDetail.missingImageCount} ảnh còn thiếu`}
                      </button>
                    )}
                    <button
                      onClick={() => publishExamMutation.mutate(examDetail.id)}
                      disabled={publishExamMutation.isPending || !publishReadiness.canPublish}
                      title={publishReadiness.helpText}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none"
                    >
                      {publishExamMutation.isPending ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={15} />
                      )}{" "}
                      {publishExamMutation.isPending
                        ? "Đang dựng audio và xuất bản..."
                        : publishReadiness.label}
                    </button>
                    </div>
                    {!publishReadiness.canPublish && (
                      <p className="max-w-[260px] text-right text-sm leading-4 text-slate-500">
                        {publishReadiness.helpText}
                      </p>
                    )}
                  </div>
                )}
          </div>
        </div>

        {(examDetail.missingImages?.length ?? 0) > 0 && (
          <section
            aria-label="Ảnh còn thiếu"
            className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          >
            <p className="font-semibold">
              Còn thiếu {examDetail.missingImages?.length} ảnh. Câu hỏi và đáp án vẫn đầy đủ; đề xuất bản được khi đủ ảnh.
            </p>
            <p className="mt-1">
              Bấm từng dòng để mở câu đó rồi tìm hoặc tải ảnh lên. Với Part 1, sau khi có ảnh hãy dùng &quot;Tạo lại câu từ ảnh&quot; để đáp án khớp ảnh.
            </p>
            <ul className="mt-2 space-y-1">
              {examDetail.missingImages?.map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    onClick={() => {
                      if (item.section === "LR" && item.questionNumber)
                        setPendingQuestion(item.questionNumber);
                      else
                        setActiveTab(item.section === "SPEAKING" ? "speaking" : "writing");
                    }}
                    className="text-left underline-offset-2 hover:underline"
                  >
                    <span className="font-semibold">{item.label}</span>
                    {item.brief ? `: ${item.brief}` : ""}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* WORKSPACE NAVIGATION TABS */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
          {hasLr && (
            <button
              onClick={() => setActiveTab("structure")}
              className={tabClass(tab === "structure")}
            >
              {hasTasks ? "Listening & Reading" : "Câu hỏi"} (
              {allQuestions.length})
              {hasTasks && tabStatus(readiness?.listeningReading)}
            </button>
          )}
          {hasTasks && (
            <>
              <button
                onClick={() => setActiveTab("speaking")}
                className={tabClass(tab === "speaking")}
              >
                Speaking ({readiness?.speakingCount || 0})
                {tabStatus(readiness?.speaking)}
              </button>
              <button
                onClick={() => setActiveTab("writing")}
                className={tabClass(tab === "writing")}
              >
                Writing ({readiness?.writingCount || 0})
                {tabStatus(readiness?.writing)}
              </button>
            </>
          )}
          <button
            onClick={() => setActiveTab("preflight")}
            className={tabClass(tab === "preflight")}
          >
            <span>Kiểm tra trước xuất bản</span>
            {issues.length > 0 ? (
              <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-xs font-bold text-white">
                {issues.length}
              </span>
            ) : (
              <span className="rounded-full bg-emerald-500 px-1.5 py-0.2 text-xs font-bold text-white">
                OK
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("info")}
            className={tabClass(tab === "info")}
          >
            Thông tin chung
          </button>
        </div>

        {!isDraft && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {examDetail.attemptsCount
              ? "Đề đã có lượt làm bài nên không sửa trực tiếp được, để giữ nguyên kết quả của học viên. Muốn sửa, hãy ngừng phát hành rồi nhân bản thành đề mới."
              : 'Đề đang xuất bản nên chỉ xem được. Muốn sửa, hãy bấm "Chuyển về bản nháp".'}
          </p>
        )}

        {tab === "speaking" && (
          <ToeicSpeakingExamComposer
            examId={examDetail.id}
            readOnly={!isDraft}
            onChanged={refreshExam}
          />
        )}
        {tab === "writing" && (
          <ToeicWritingExamComposer
            examId={examDetail.id}
            onChanged={refreshExam}
          />
        )}

        {/* TAB 1: QUESTIONS */}
        {tab === "structure" && (
          <div className="space-y-4">
            <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
              {TOEIC_PARTS.map((p) => {
                const count = groups
                  .filter((g) => g.part === p.part)
                  .reduce((sum, g) => sum + (g.questions?.length || 0), 0);
                return (
                  <button
                    key={p.part}
                    onClick={() => setActivePartFilter(p.part)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      activePartFilter === p.part
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Part {p.part} · {count} câu
                  </button>
                );
              })}
              <button
                onClick={() => setActivePartFilter("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activePartFilter === "all"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Tất cả
              </button>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const target = Number(jumpInput);
                  if (Number.isInteger(target) && target > 0)
                    setPendingQuestion(target);
                }}
                className="ml-auto"
              >
                <input
                  type="number"
                  min={1}
                  value={jumpInput}
                  onChange={(event) => setJumpInput(event.target.value)}
                  placeholder="Đến câu"
                  aria-label="Đến câu số"
                  className="w-24 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-400"
                />
              </form>
            </div>

            {master && master.state !== "NOT_NEEDED" && (
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    Audio cả phần Listening
                    <span className="ml-2 font-normal text-slate-600">
                      {master.state === "READY"
                        ? `Dài ${Math.round((master.durationSeconds ?? 0) / 60)} phút`
                        : master.state === "STALE"
                          ? "Audio câu hỏi đã đổi, hệ thống dựng lại khi xuất bản"
                          : "Chưa dựng, hệ thống tự dựng khi xuất bản"}
                    </span>
                  </p>
                  {isDraft && lrEditable && master.state !== "READY" && (
                    <button
                      onClick={() => buildMasterMutation.mutate(examDetail.id)}
                      disabled={buildMasterMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {buildMasterMutation.isPending && (
                        <Loader2 size={13} className="animate-spin" />
                      )}
                      {buildMasterMutation.isPending ? "Đang dựng..." : "Dựng ngay"}
                    </button>
                  )}
                </div>
                {master.url && (
                  <audio
                    controls
                    preload="none"
                    src={master.url}
                    aria-label="Audio cả phần Listening"
                    className="mt-2 h-9 w-full"
                  />
                )}
              </div>
            )}

            {!lrEditable && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Đề này dùng chung Listening & Reading với đề khác nên chỉ xem
                được ở đây.
              </p>
            )}

            {lrEditable && isDraft && allQuestions.length < 200 && (
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                <Plus size={15} /> Thêm nhóm câu hỏi
              </button>
            )}

            {visibleGroups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-600 dark:text-slate-400">
                Part này chưa có câu hỏi.
              </div>
            ) : (
              <div className="space-y-4">
                {visibleGroups.map((group) => (
                  <ExamGroupCard
                    key={group.id}
                    group={group}
                    readOnly={!lrEditable || !isDraft}
                    focusedQuestion={focusedQuestion}
                    busy={
                      regenerateMediaMutation.isPending ||
                      visionMutation.isPending
                    }
                    onAction={runGroupAction}
                    onEditQuestion={openEditQuestion}
                    onDeleteQuestion={(question) =>
                      setPendingDeleteQuestion({
                        id: question.id,
                        questionNumber: question.questionNumber,
                      })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PREFLIGHT CHECKLIST */}
        {tab === "preflight" && (
          <div className="space-y-6 max-w-3xl mx-auto py-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Báo cáo kiểm tra chất lượng đề thi
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
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
                  <span className="text-xs font-bold text-slate-600 uppercase dark:text-slate-400">
                    Tổng số câu hỏi
                  </span>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {allQuestions.length}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <span className="text-xs font-bold text-slate-600 uppercase dark:text-slate-400">
                    Số nhóm bài
                  </span>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {groups.length}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <span className="text-xs font-bold text-slate-600 uppercase dark:text-slate-400">
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
                  <span className="text-xs font-bold text-slate-600 uppercase dark:text-slate-400">
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
                      <button
                        key={idx}
                        type="button"
                        onClick={() => focusReadinessIssue(issue)}
                        className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 flex items-start gap-2"
                      >
                        <AlertTriangle
                          size={15}
                          className="text-rose-600 shrink-0 mt-0.5"
                        />
                        <div className="text-left">
                          <span className="font-semibold">
                            {getReadinessIssueLabel(issue)}
                          </span>
                          {issue.groupId && (
                            <span className="mt-1 block text-rose-700 underline underline-offset-2">
                              Mở đúng nhóm để hoàn thiện
                            </span>
                          )}
                        </div>
                      </button>
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
        {/* TAB 4: METADATA & INFO */}
        {tab === "info" && (
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
                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                    Tìm ảnh · Part 1
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">
                    Tìm ảnh cho {examGroupLabel(imageSearchGroup)}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Ảnh chỉ được lưu chính thức sau khi chọn, tải về server và
                    upload vào R2.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsImageSearchOpen(false)}
                  className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400"
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
                    <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600 dark:text-slate-400">
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
                        { }
                        <img
                          src={candidate.previewUrl}
                          alt={`Ảnh ${candidate.provider || "nguồn mở"} của ${candidate.author}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="space-y-2 p-3">
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <span className="truncate">
                            {candidate.provider || "Nguồn mở"} ·{" "}
                            {candidate.author}
                          </span>
                          <span className="shrink-0">
                            {candidate.width}×{candidate.height}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
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
                          <p className="text-sm text-slate-600 dark:text-slate-400">
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
                <p className="text-sm text-slate-600 dark:text-slate-400">
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
                    ? `Sửa ${examGroupLabel(editingGroup)}`
                    : "Thêm nhóm câu hỏi mới"}
                </h3>
                <button
                  onClick={() => setIsGroupModalOpen(false)}
                  className="rounded-lg p-1 text-slate-600 hover:text-slate-700 dark:text-slate-400"
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
                {!editingGroup && <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Part *
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
                          Part {p.part}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Thứ tự
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
                </div>}

                {groupForm.part <= 4 && (
                  <>
                    <div>
                      <AudioUploadField
                        label="Audio *"
                        value={groupForm.audioUrl}
                        previewUrl={formAudioPreviewSrc(groupForm.audioUrl, editingGroup)}
                        onChange={(url) =>
                          setGroupForm({ ...groupForm, audioUrl: url })
                        }
                        helperText="Tải file âm thanh đoạn hội thoại/bài nghe lên R2, hoặc dán URL bên ngoài."
                      />
                    </div>
                    {groupForm.part > 1 && <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Lời thoại
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
                        placeholder="Ví dụ: W: ... M: ..."
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs leading-relaxed text-slate-800 outline-none focus:border-slate-400"
                      />
                    </div>}
                  </>
                )}

                {groupForm.part === 1 && (
                  <>
                    <div>
                      <ImageUploadField
                        label="Ảnh *"
                        value={groupForm.imageUrl}
                        onChange={(url) =>
                          setGroupForm({ ...groupForm, imageUrl: url })
                        }
                        helperText="Tải ảnh mô tả cho Part 1 (PNG, JPG hoặc WEBP)."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Mô tả ảnh (dùng khi tìm ảnh)
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
                      Đoạn văn *
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
                  className="rounded-lg p-1 text-slate-600 hover:text-slate-700 dark:text-slate-400"
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
                        className="h-4 w-4 text-emerald-700 focus:ring-emerald-500 cursor-pointer dark:text-emerald-400"
                        title="Đánh dấu đáp án đúng"
                      />
                      <span className="w-5 text-xs font-bold text-slate-600 dark:text-slate-400">
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
                  <p className="text-sm text-slate-600 mt-0.5 dark:text-slate-400">
                    Nhóm #{aiPart5TargetGroup.groupOrder} • Hoàn thành câu
                    (Incomplete Sentences)
                  </p>
                </div>
                <button
                  onClick={() => setIsAiPart5ModalOpen(false)}
                  className="rounded-lg p-1 text-slate-600 hover:text-slate-700 dark:text-slate-400"
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
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-600 dark:text-slate-400">
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
                          className="text-slate-600 hover:text-rose-600 text-xs dark:text-slate-400"
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
                                className={`h-5 w-5 rounded text-xs font-bold flex items-center justify-center ${
                                  isCorrect
                                    ? "bg-emerald-700 text-white"
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
                                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
                                  Đúng
                                </span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-0.5 dark:text-slate-400">
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
    <main className="space-y-6 p-6">
      {/* HEADER */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Kho đề luyện</h1>
          <p className="mt-1 text-sm tabular-nums text-slate-600">
            {totalExams} đề ·{" "}
            {examList.facets?.published ?? 0}{" "}
            đã xuất bản ·{" "}
            {examList.facets?.learnerReady ?? 0} sẵn sàng cho học viên
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Plus size={16} /> Tạo thủ công
          </button>
          <Link
            href="/admin/exams/new"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            <FileStack size={16} /> AI soạn đề
          </Link>
        </div>
      </header>

      {/* FILTER & SEARCH */}
      <div className="space-y-3">
        <label className="relative block">
          <span className="sr-only">Tìm đề</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            size={18}
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mô tả đề..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="min-h-11 w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </label>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Kỳ thi
            <select
              value={familyFilter}
              onChange={(event) => {
                setFamilyFilter(event.target.value);
                setCurrentPage(1);
              }}
              className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            >
              <option value="ALL">Tất cả</option>
              <option value="TOEIC">TOEIC</option>
              <option value="IELTS">IELTS (sắp có)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Loại đề
            <select
              value={variantFilter}
              onChange={(event) => {
                setVariantFilter(event.target.value);
                setCurrentPage(1);
              }}
              className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            >
              <option value="ALL">Tất cả</option>
              <option value="TOEIC_LR">Listening &amp; Reading</option>
              <option value="TOEIC_SW">Speaking &amp; Writing</option>
              <option value="TOEIC_4_SKILLS">4 kỹ năng</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Trạng thái
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(
                  event.target.value as "ALL" | "DRAFT" | "PUBLISHED" | "ARCHIVED",
                );
                setCurrentPage(1);
              }}
              className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            >
              <option value="ALL">Tất cả</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="PUBLISHED">Đã xuất bản</option>
              <option value="ARCHIVED">Ngừng phát hành</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Sẵn sàng
            <select
              value={readyFilter}
              onChange={(event) => {
                setReadyFilter(event.target.value as typeof readyFilter);
                setCurrentPage(1);
              }}
              className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            >
              <option value="ALL">Tất cả</option>
              <option value="READY">Sẵn sàng cho học viên</option>
              <option value="NOT_READY">Còn thiếu</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Sắp xếp
            <select
              value={examSort}
              onChange={(event) => {
                setExamSort(event.target.value as typeof examSort);
                setCurrentPage(1);
              }}
              className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            >
              <option value="UPDATED">Mới sửa trước</option>
              <option value="TITLE">Tên A → Z</option>
              <option value="QUESTIONS">Nhiều câu trước</option>
            </select>
          </label>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-600">
            <span className="tabular-nums">
              {examList.total === totalExams
                ? `${examList.total} đề`
                : `Khớp ${examList.total}/${totalExams}`}
              {examList.isFetching && !isExamsLoading ? " · đang tải" : ""}
            </span>
            {examFiltersActive && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("ALL");
                  setFamilyFilter("ALL");
                  setVariantFilter("ALL");
                  setReadyFilter("ALL");
                  setCurrentPage(1);
                }}
                className="cursor-pointer font-semibold text-slate-900 underline-offset-4 hover:underline"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>
      </div>

      {/* EXAMS GRID */}
      {isExamsLoading ? (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="animate-spin text-slate-600" />
        </div>
      ) : paginatedExams && paginatedExams.length > 0 ? (
        <div className="space-y-6">
          {/* Cards fill the canvas in 320px-minimum columns (3 at 1440,
              4 at 1920) with one 16px gutter. */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-4">
            {paginatedExams.map((exam) => {
              const isPublished = exam.publicationStatus === "PUBLISHED";
              const parts = (
                (exam.readinessSummary ?? []) as NonNullable<
                  ExamDetail["readinessSummary"]
                >
              ).filter((row) =>
                ["listening", "reading", "speaking", "writing"].includes(row.key),
              );
              return (
                <article
                  key={exam.id}
                  className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300"
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-semibold text-slate-600">
                      {exam.familyCode || "TOEIC"} ·{" "}
                      {exam.variantCode
                        ? examVariantLabel(exam.variantCode)
                        : exam.type === "FULL_TEST"
                          ? "Đề đầy đủ"
                          : "Theo Part"}
                    </span>
                    <span
                      className={`ml-auto flex-none whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ${
                        isPublished
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {examStatusLabel(exam.publicationStatus)}
                    </span>
                  </div>
                  <h2 className="mt-3 line-clamp-2 font-semibold text-slate-950">
                    <button
                      type="button"
                      onClick={() => setSelectedExamId(exam.id)}
                      className="cursor-pointer text-left hover:text-blue-700"
                    >
                      {exam.title}
                    </button>
                  </h2>
                  {exam.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                      {exam.description}
                    </p>
                  )}
                  <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm tabular-nums text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={14} aria-hidden="true" />
                      {Math.round((exam.durationSeconds || 7200) / 60)} phút
                    </span>
                    <span>{exam.totalQuestions || 0} câu</span>
                    <span>{exam.attemptsCount || 0} lượt làm</span>
                  </p>
                  {parts.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                      {parts.map((part) => (
                        <li key={part.key} className="inline-flex items-center gap-1.5">
                          <span
                            aria-hidden="true"
                            className={`size-1.5 rounded-full ${
                              part.state === "READY"
                                ? "bg-emerald-500"
                                : part.state === "WARNING"
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                            }`}
                          />
                          {part.label}
                          {part.issueCount > 0 && (
                            <span className="text-slate-600 dark:text-slate-400">
                              ({part.issueCount})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-auto pt-4">
                    <div className="flex items-center gap-2 border-t border-slate-100 pt-3 text-sm">
                      <span
                        className={`font-semibold ${exam.learnerReady ? "text-emerald-700" : "text-amber-800"}`}
                      >
                        {exam.learnerReady ? "Sẵn sàng" : "Chưa sẵn sàng"}
                      </span>
                      {exam.updatedAt && (
                        <span className="text-xs tabular-nums text-slate-600 dark:text-slate-400">
                          · sửa {new Date(exam.updatedAt).toLocaleDateString("vi-VN")}
                        </span>
                      )}
                      <div className="ml-auto flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setPendingDeleteExam({
                              id: exam.id,
                              title: exam.title,
                            })
                          }
                          aria-label={`Xóa ${exam.title}`}
                          title="Xóa đề thi"
                          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400"
                        >
                          <Trash2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedExamId(exam.id)}
                          className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-lg px-2 font-semibold text-slate-900 hover:text-blue-700"
                        >
                          Mở <ArrowRight size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="pt-2">
            <Pagination
              currentPage={examList.page}
              totalPages={examList.totalPages}
              totalItems={examList.total}
              pageSize={examList.pageSize}
              onPageChange={examList.setPage}
              onPageSizeChange={examList.setPageSize}
              pageSizeOptions={ADMIN_PAGE_SIZES}
              alwaysShow
            />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-600 dark:text-slate-400">
          {totalExams
            ? "Không có đề nào khớp bộ lọc."
            : "Chưa có đề nào. Tạo đề thủ công hoặc nhờ AI soạn."}
        </div>
      )}

      {/* MODAL: CREATE EXAM */}
      {isExamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900">Tạo đề</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Hệ thống tự chọn cấu trúc phù hợp theo kỳ thi và loại đề.
                </p>
              </div>
              <button
                onClick={() => setIsExamModalOpen(false)}
                className="rounded-lg p-1 text-slate-600 hover:text-slate-700 dark:text-slate-400"
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
                  placeholder="VD: TOEIC Practice Test 01"
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
