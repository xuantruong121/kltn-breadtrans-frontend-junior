"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Loader2,
  Search,
  ArrowRight,
  Target,
  GraduationCap,
  Award,
  Layers,
  Bell,
  Check,
  Compass,
  FileText,
  AlertCircle,
  ChevronRight,
  Headphones,
  Mic,
  PenTool,
  BookmarkCheck,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { examService } from "@/lib/api/services/exam.service";
import { Pagination } from "@/components/ui";
import { useAuthStore } from "@/stores/authStore";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { PracticeLoadingScreen } from "@/components/practice/PracticeLoadingScreen";

const EMPTY_QUIZZES: any[] = [];

export type CertificateId =
  | "ALL"
  | "TOEIC"
  | "IELTS"
  | "VSTEP"
  | "TOEFL"
  | "CAMBRIDGE";

export type PaperFilter = "ALL" | "TOEIC_LR" | "TOEIC_SW" | "TOEIC_4_SKILLS";

export interface CertificateMeta {
  id: CertificateId;
  code: string;
  name: string;
  fullName: string;
  shortTag: string;
  status: "ACTIVE" | "COMING_SOON";
  badgeText: string;
  targetLevel: string;
  description: string;
  skills: { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[];
  examStructure: string[];
  expectedFeatures: string[];
  roadmapDate: string;
  theme: {
    tabActiveBg: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    tagBg: string;
    tagText: string;
    accentBorder: string;
  };
}

const CERTIFICATES: CertificateMeta[] = [
  {
    id: "TOEIC",
    code: "TOEIC",
    name: "TOEIC Practice",
    fullName: "Test of English for International Communication",
    shortTag: "2 & 4 kỹ năng",
    status: "ACTIVE",
    badgeText: "Sẵn sàng làm bài",
    targetLevel: "Mục tiêu 450 - 990 điểm",
    description:
      "Đề luyện tập tham khảo mô phỏng cấu trúc TOEIC cho giao tiếp quốc tế và công việc, gồm L&R và bundle 4 kỹ năng kết hợp L&R với S&W. Nội dung không phải đề thi chính thức do ETS phát hành.",
    skills: [
      { label: "Nghe hiểu (Listening)", icon: Headphones },
      { label: "Đọc hiểu (Reading)", icon: BookOpen },
      { label: "Nói (Speaking)", icon: Mic },
      { label: "Viết (Writing)", icon: PenTool },
    ],
    examStructure: [
      "Listening: 100 câu / 45 phút (Part 1 - 4)",
      "Reading: 100 câu / 75 phút (Part 5 - 7)",
      "Speaking: 11 câu hỏi / 20 phút (mô phỏng)",
      "Writing: 8 bài tập / 60 phút (mô phỏng)",
    ],
    expectedFeatures: [
      "Bấm giờ thi chuẩn xác theo từng phần",
      "Đáp án và giải thích chi tiết từng câu",
      "Lưu lịch sử và phân tích độ chính xác",
      "Hệ thống cộng thưởng Bánh Mì khi hoàn thành",
    ],
    roadmapDate: "Đã phát hành",
    theme: {
      tabActiveBg: "bg-amber-500 text-white",
      badgeBg: "bg-emerald-50 dark:bg-emerald-950/60",
      badgeText: "text-emerald-700 dark:text-emerald-300",
      badgeBorder: "border-emerald-200 dark:border-emerald-800/60",
      tagBg: "bg-amber-50 dark:bg-amber-950/60",
      tagText: "text-amber-800 dark:text-amber-300",
      accentBorder: "hover:border-amber-400 dark:hover:border-amber-600",
    },
  },
  {
    id: "IELTS",
    code: "IELTS",
    name: "IELTS Academic",
    fullName: "International English Language Testing System",
    shortTag: "Academic & General",
    status: "COMING_SOON",
    badgeText: "Đang biên soạn",
    targetLevel: "Mục tiêu Band 5.0 - 8.5+",
    description:
      "Hệ thống kiểm tra tiếng Anh học thuật quốc tế hàng đầu dành cho du học sinh và xét tuyển đại học. Mô phỏng dạng thi máy (Computer-delivered IELTS).",
    skills: [
      { label: "Listening (40 câu / 30 phút)", icon: Headphones },
      { label: "Academic Reading (40 câu / 60 phút)", icon: BookOpen },
      { label: "Academic Writing (Task 1 & 2 / 60 phút)", icon: PenTool },
      { label: "Speaking (3 Parts tương tác)", icon: Mic },
    ],
    examStructure: [
      "Listening: 4 Sections đa dạng ngữ điệu Anh, Mỹ, Úc",
      "Reading: 3 bài đọc dài với dạng bài True/False/Not Given, Matching",
      "Writing: Miêu tả biểu đồ Task 1 & Bài luận Task 2",
      "Speaking: Phỏng vấn trực tiếp với trợ lý giọng nói",
    ],
    expectedFeatures: [
      "Trình đọc bài đọc phân đôi màn hình (Split screen) chuẩn thi máy",
      "Bộ audio đa giọng đọc bản xứ chất lượng phòng thi",
      "Chấm điểm bài viết tự động theo 4 tiêu chí chuẩn IELTS",
      "Dự kiến ra mắt đợt đầu: Quý 4/2026",
    ],
    roadmapDate: "Dự kiến: Quý 4/2026",
    theme: {
      tabActiveBg: "bg-blue-600 text-white",
      badgeBg: "bg-blue-50 dark:bg-blue-950/60",
      badgeText: "text-blue-700 dark:text-blue-300",
      badgeBorder: "border-blue-200 dark:border-blue-800/60",
      tagBg: "bg-blue-50 dark:bg-blue-950/60",
      tagText: "text-blue-800 dark:text-blue-300",
      accentBorder: "hover:border-blue-400 dark:hover:border-blue-600",
    },
  },
  {
    id: "VSTEP",
    code: "VSTEP",
    name: "VSTEP (Bậc 3-5)",
    fullName: "Vietnamese Standardized Test of English Proficiency",
    shortTag: "B1 • B2 • C1",
    status: "COMING_SOON",
    badgeText: "Đang biên soạn",
    targetLevel: "Khung 6 bậc Việt Nam (B1 - C1)",
    description:
      "Định dạng bài thi chuẩn hóa của Bộ Giáo dục & Đào tạo phục vụ chuẩn đầu ra đại học, cao học, tuyển dụng công chức và thăng hạng chức danh nghề nghiệp.",
    skills: [
      { label: "Nghe hiểu (3 phần / 40 phút)", icon: Headphones },
      { label: "Đọc hiểu (4 bài / 60 phút)", icon: BookOpen },
      { label: "Viết thư & luận (60 phút)", icon: PenTool },
      { label: "Vấn đáp 3 phần (12 phút)", icon: Mic },
    ],
    examStructure: [
      "Listening: 35 câu trắc nghiệm 4 lựa chọn",
      "Reading: 40 câu hỏi đọc hiểu văn bản học thuật & thực tế",
      "Writing: Task 1 (viết thư 120 từ) & Task 2 (bài luận 250 từ)",
      "Speaking: Tương tác xã hội, thảo luận giải pháp, phát triển chủ đề",
    ],
    expectedFeatures: [
      "Mô phỏng 100% giao diện thi trên máy tính của các trường đại học",
      "Quy đổi điểm thi tự động ra các bậc B1, B2, C1",
      "Bộ câu hỏi mẫu bám sát ngân hàng đề khảo thí quốc gia",
      "Hệ thống ghi âm phòng thi Speaking đạt chuẩn",
    ],
    roadmapDate: "Dự kiến: Quý 4/2026",
    theme: {
      tabActiveBg: "bg-purple-600 text-white",
      badgeBg: "bg-purple-50 dark:bg-purple-950/60",
      badgeText: "text-purple-700 dark:text-purple-300",
      badgeBorder: "border-purple-200 dark:border-purple-800/60",
      tagBg: "bg-purple-50 dark:bg-purple-950/60",
      tagText: "text-purple-800 dark:text-purple-300",
      accentBorder: "hover:border-purple-400 dark:hover:border-purple-600",
    },
  },
  {
    id: "TOEFL",
    code: "TOEFL iBT",
    name: "TOEFL iBT",
    fullName: "Test of English as a Foreign Language (Internet-based Test)",
    shortTag: "Định dạng mới 2023",
    status: "COMING_SOON",
    badgeText: "Đang biên soạn",
    targetLevel: "Thang điểm 0 - 120",
    description:
      "Bài thi chuẩn hóa đánh giá tiếng Anh học thuật cấp độ đại học tại Bắc Mỹ. Áp dụng định dạng rút gọn hiện đại dưới 2 giờ của viện khảo thí ETS.",
    skills: [
      { label: "Reading (20 câu / 35 phút)", icon: BookOpen },
      { label: "Listening (28 câu / 36 phút)", icon: Headphones },
      { label: "Speaking (4 tasks / 16 phút)", icon: Mic },
      { label: "Writing for Academic Discussion (29 phút)", icon: PenTool },
    ],
    examStructure: [
      "Reading: 2 bài đọc trích từ giáo trình đại học",
      "Listening: 3 bài giảng và 2 đoạn hội thoại sinh viên",
      "Speaking: 1 bài độc lập & 3 bài tích hợp",
      "Writing: Bài viết thảo luận học thuật mới (10 phút)",
    ],
    expectedFeatures: [
      "Cấu trúc đề thi mới nhất rút ngắn thời gian làm bài",
      "Công cụ chấm điểm mô phỏng thuật toán SpeechRater & e-rater",
      "Ngân hàng đề thi thử tổng hợp từ các kì thi chính thức",
    ],
    roadmapDate: "Dự kiến: Quý 1/2027",
    theme: {
      tabActiveBg: "bg-indigo-600 text-white",
      badgeBg: "bg-indigo-50 dark:bg-indigo-950/60",
      badgeText: "text-indigo-700 dark:text-indigo-300",
      badgeBorder: "border-indigo-200 dark:border-indigo-800/60",
      tagBg: "bg-indigo-50 dark:bg-indigo-950/60",
      tagText: "text-indigo-800 dark:text-indigo-300",
      accentBorder: "hover:border-indigo-400 dark:hover:border-indigo-600",
    },
  },
  {
    id: "CAMBRIDGE",
    code: "Cambridge",
    name: "Cambridge FCE / CAE",
    fullName: "Cambridge English Qualifications (B2 First / C1 Advanced)",
    shortTag: "CEFR B2 • C1",
    status: "COMING_SOON",
    badgeText: "Đang biên soạn",
    targetLevel: "B2 First & C1 Advanced",
    description:
      "Chứng chỉ quốc tế giá trị trọn đời của Đại học Cambridge. Bộ đề đánh giá toàn diện năng lực ngôn ngữ theo khung tham chiếu châu Âu.",
    skills: [
      { label: "Reading & Use of English (75 phút)", icon: BookOpen },
      { label: "Writing (2 tasks / 80 phút)", icon: PenTool },
      { label: "Listening (40 phút)", icon: Headphones },
      { label: "Speaking theo cặp (14 phút)", icon: Mic },
    ],
    examStructure: [
      "Use of English: Multiple-choice cloze, Open cloze, Word formation",
      "Key word transformation: Biến đổi câu giữ nguyên nghĩa",
      "Writing: Essay bắt buộc & Bài viết tự chọn (Review/Article/Letter)",
      "Speaking: Phỏng vấn theo cặp 2 thí sinh cùng giám khảo",
    ],
    expectedFeatures: [
      "Dạng bài Use of English kinh điển độc quyền",
      "Thang điểm Cambridge English Scale chuẩn hóa",
      "Bài giải thích chuyên sâu ngữ pháp CEFR",
    ],
    roadmapDate: "Dự kiến: Quý 1/2027",
    theme: {
      tabActiveBg: "bg-teal-600 text-white",
      badgeBg: "bg-teal-50 dark:bg-teal-950/60",
      badgeText: "text-teal-700 dark:text-teal-300",
      badgeBorder: "border-teal-200 dark:border-teal-800/60",
      tagBg: "bg-teal-50 dark:bg-teal-950/60",
      tagText: "text-teal-800 dark:text-teal-300",
      accentBorder: "hover:border-teal-400 dark:hover:border-teal-600",
    },
  },
];

export default function ExamPracticeHubPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedCert, setSelectedCert] = useState<CertificateId>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [searchQuery, setSearchQuery] = useState("");
  const [paperFilter, setPaperFilter] = useState<PaperFilter>("ALL");
  const [launchingDestination, setLaunchingDestination] = useState<string | null>(null);
  const [notifiedCerts, setNotifiedCerts] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [authGate, setAuthGate] = useState<{
    open: boolean;
    title?: string;
    destination?: string;
  }>({ open: false });

  // Handle auto-dismiss toast
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Handle launch animation
  useEffect(() => {
    if (!launchingDestination) return;

    let animId2: number;
    const animId1 = requestAnimationFrame(() => {
      animId2 = requestAnimationFrame(() => {
        router.push(launchingDestination);
      });
    });

    return () => {
      cancelAnimationFrame(animId1);
      if (animId2) cancelAnimationFrame(animId2);
    };
  }, [launchingDestination, router]);

  const { data: quizzes, isLoading } = useQuery({
    queryKey: ["exam-products"],
    queryFn: examService.getPublished,
  });

  const filteredQuizzes = useMemo(() => {
    if (!quizzes) return EMPTY_QUIZZES;
    const byFormat = quizzes.filter((quiz: any) => {
      if (paperFilter === "ALL") return true;
      const rawFormat = quiz.bilingualContent?.examFormat;
      const format = rawFormat === "TWO_SKILL" ? "TOEIC_LR" : rawFormat === "SPEAKING_WRITING" ? "TOEIC_SW" : rawFormat === "FOUR_SKILL" ? "TOEIC_4_SKILLS" : rawFormat;
      return format === paperFilter;
    });
    if (!searchQuery.trim()) return byFormat;
    const q = searchQuery.toLowerCase().trim();
    return byFormat.filter((quiz: any) =>
      quiz.title?.toLowerCase().includes(q)
    );
  }, [quizzes, searchQuery, paperFilter]);

  const totalPages = Math.ceil((filteredQuizzes.length || 0) / pageSize);
  const paginatedQuizzes = filteredQuizzes.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const selectedCertMeta = useMemo(() => {
    if (selectedCert === "ALL") return null;
    return CERTIFICATES.find((c) => c.id === selectedCert) || null;
  }, [selectedCert]);

  // Load persisted registered certificate waitlists
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const storageKey = user?.id
          ? `breadtrans_notified_certs_${user.id}`
          : "breadtrans_notified_certs";
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setNotifiedCerts(new Set(parsed));
          }
        }
      } catch {
        // ignore localStorage parse errors
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [user?.id]);

  const handleNotifyMe = (certId: string, certName: string) => {
    setNotifiedCerts((prev) => {
      const next = new Set(prev);
      const isAlreadyRegistered = next.has(certId);
      if (isAlreadyRegistered) {
        next.delete(certId);
        setToastMessage(
          `Đã hủy đăng ký nhận thông báo cho đề thi ${certName}.`
        );
      } else {
        next.add(certId);
        setToastMessage(
          `Đã ghi nhận đăng ký! Bạn sẽ nhận được thông báo ngay khi đề thi ${certName} mở làm bài.`
        );
      }
      try {
        const storageKey = user?.id
          ? `breadtrans_notified_certs_${user.id}`
          : "breadtrans_notified_certs";
        localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
      } catch {
        // ignore storage write errors
      }
      return next;
    });
  };

  if (launchingDestination) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center py-12">
        <PracticeLoadingScreen skill="listening" className="max-w-4xl" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4 sm:px-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 right-4 sm:right-8 z-50 max-w-md bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-slate-700 flex items-start gap-3"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Check size={16} />
            </div>
            <div className="flex-1 text-xs leading-relaxed font-medium">
              {toastMessage}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Breadcrumb */}
      <div className="mb-4 pt-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
          <Link href="/dashboard" className="hover:text-amber-800 transition-colors">
            Trang chủ học viên
          </Link>
          <ChevronRight size={13} />
          <span className="text-slate-600 font-bold">Luyện đề thi chứng chỉ</span>
        </div>
      </div>

      {/* Page introduction: factual, content-first, not a marketing hero. */}
      <section className="mb-8 border-b border-slate-200/80 pb-6 dark:border-slate-800">
        <div className="max-w-2xl">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Khảo thí & Luyện đề
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Luyện đề thi chứng chỉ
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Chọn định dạng bài thi chuẩn hóa, làm bài theo đúng áp lực thời gian quy định và xem lại phân tích đáp án chi tiết.
          </p>
        </div>
      </section>

      {/* Certificate Selector Navigation (Interactive Tab Bar) */}
      <div className="mb-8 space-y-2.5">
        <div className="flex items-center justify-between gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="uppercase tracking-wider">Định dạng chứng chỉ</span>
          <span>
            {selectedCert === "ALL"
              ? "Tất cả định dạng"
              : `Đang chọn: ${selectedCertMeta?.name || selectedCert}`}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200/80 pb-3 dark:border-slate-800 scrollbar-none">
          {/* Option All */}
          <button
            type="button"
            onClick={() => {
              setSelectedCert("ALL");
              setCurrentPage(1);
            }}
            className={`shrink-0 flex min-h-9 items-center gap-2 rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 cursor-pointer ${
              selectedCert === "ALL"
                ? "border-slate-900 bg-slate-900 text-white dark:border-amber-500 dark:bg-amber-500 dark:text-slate-950"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
            }`}
          >
            <Compass size={14} />
            <span>Tất cả</span>
          </button>

          {/* Individual Certificates */}
          {CERTIFICATES.map((cert) => {
            const isSelected = selectedCert === cert.id;
            const isActive = cert.status === "ACTIVE";

            return (
              <button
                key={cert.id}
                type="button"
                onClick={() => {
                  setSelectedCert(cert.id);
                  setCurrentPage(1);
                }}
                className={`shrink-0 flex min-h-9 items-center gap-2 px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer border rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${
                  isSelected
                    ? "border-slate-900 bg-slate-900 text-white dark:border-amber-500 dark:bg-amber-500 dark:text-slate-950"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>{cert.name}</span>
                {isActive ? (
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      isSelected
                        ? "bg-white/20 text-white dark:bg-slate-950/20 dark:text-slate-950"
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    }`}
                  >
                    Có sẵn
                  </span>
                ) : (
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      isSelected
                        ? "bg-white/20 text-white dark:bg-slate-950/20 dark:text-slate-950"
                        : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                    }`}
                  >
                    Dự kiến
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* CASE 1: SPECIFIC IN-DEVELOPMENT CERTIFICATE SELECTED       */}
      {/* ========================================================= */}
      {selectedCertMeta && selectedCertMeta.status === "COMING_SOON" ? (
        <motion.div
          key={selectedCertMeta.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Certificate Overview Showcase Banner */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-2.5 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${selectedCertMeta.theme.badgeBg} ${selectedCertMeta.theme.badgeText} ${selectedCertMeta.theme.badgeBorder}`}
                  >
                    <AlertCircle size={13} />
                    {selectedCertMeta.badgeText}
                  </span>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md">
                    {selectedCertMeta.targetLevel}
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Lộ trình: {selectedCertMeta.roadmapDate}
                  </span>
                </div>

                <h2 className="text-2xl font-bold text-slate-950 dark:text-slate-50 tracking-tight">
                  Bộ đề thi {selectedCertMeta.fullName}
                </h2>

                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {selectedCertMeta.description}
                </p>
              </div>

              {/* Action register notification */}
              <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    handleNotifyMe(selectedCertMeta.id, selectedCertMeta.name)
                  }
                  className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    notifiedCerts.has(selectedCertMeta.id)
                      ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                      : "bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700"
                  }`}
                >
                  {notifiedCerts.has(selectedCertMeta.id) ? (
                    <>
                      <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
                      <span>Đã đăng ký nhận tin</span>
                    </>
                  ) : (
                    <>
                      <Bell size={14} />
                      <span>Nhận thông báo khi có đề</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCert("TOEIC")}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Luyện đề TOEIC có sẵn</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Feature and Format Details Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-6">
              {/* Column 1: Skills */}
              <div className="bg-slate-50/70 dark:bg-slate-850/70 rounded-lg p-4 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  <Award size={15} className="text-amber-700 dark:text-amber-400" />
                  <span>Kỹ năng đánh giá</span>
                </div>
                <div className="space-y-2">
                  {selectedCertMeta.skills.map((skill, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-3 py-2 rounded-md border border-slate-200/60 dark:border-slate-800"
                    >
                      <skill.icon size={14} className="text-slate-400 shrink-0" />
                      <span>{skill.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 2: Exam Structure */}
              <div className="bg-slate-50/70 dark:bg-slate-850/70 rounded-lg p-4 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  <FileText size={15} className="text-slate-700 dark:text-slate-300" />
                  <span>Cấu trúc bài thi</span>
                </div>
                <ul className="space-y-2">
                  {selectedCertMeta.examStructure.map((struct, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-md border border-slate-200/60 dark:border-slate-800 leading-snug"
                    >
                      <ChevronRight size={14} className="text-amber-600 mt-0.5 shrink-0" />
                      <span>{struct}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Column 3: Expected Features */}
              <div className="bg-slate-50/70 dark:bg-slate-850/70 rounded-lg p-4 border border-slate-200/80 dark:border-slate-800 space-y-3 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  <ShieldCheck size={15} className="text-emerald-700 dark:text-emerald-400" />
                  <span>Tính năng đang phát triển</span>
                </div>
                <ul className="space-y-2">
                  {selectedCertMeta.expectedFeatures.map((feat, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-md border border-slate-200/60 dark:border-slate-800 leading-snug"
                    >
                      <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        /* ========================================================= */
        /* CASE 2: TOEIC OR ALL CERTIFICATES (SHOW REAL EXAM CARDS)  */
        /* ========================================================= */
        <div className="space-y-8">
          {/* Active TOEIC Exam Section */}
          <div className="space-y-5">
            {/* Filter Bar & Controls */}
            <div className="border-y border-slate-200 py-3 dark:border-slate-800 sm:flex sm:items-center sm:justify-between sm:gap-6">
              {/* Format Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {([
                  ["ALL", "Tất cả"],
                  ["TOEIC_LR", "TOEIC L&R"],
                  ["TOEIC_SW", "TOEIC S&W"],
                  ["TOEIC_4_SKILLS", "TOEIC 4 kỹ năng"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setPaperFilter(value);
                      setCurrentPage(1);
                    }}
                    className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 cursor-pointer ${
                      paperFilter === value
                        ? "border-slate-900 bg-slate-900 text-white dark:border-amber-500 dark:bg-amber-500"
                        : "border-transparent bg-transparent text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative mt-3 w-full shrink-0 sm:mt-0 sm:w-72">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Tìm kiếm đề thi..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="min-h-10 w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-amber-950 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* List Header & Timer info */}
            <div className="flex items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                <BookmarkCheck size={16} className="text-amber-700 dark:text-amber-400" />
                <span>
                  {paperFilter === "ALL"
                    ? "Đề thi TOEIC mô phỏng chuẩn ETS"
                    : paperFilter === "TOEIC_LR"
                      ? "Đề thi TOEIC Listening & Reading"
                      : paperFilter === "TOEIC_SW"
                        ? "Đề thi TOEIC Speaking & Writing"
                        : "Đề thi TOEIC 4 kỹ năng"}
                </span>
              </span>
              <span className="hidden items-center gap-1.5 text-xs text-slate-500 sm:inline-flex dark:text-slate-400">
                <Clock size={13} />
                <span>Bấm giờ tự động theo thời gian thực tế</span>
              </span>
            </div>

            {/* Loading / Cards Grid */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <Loader2 className="animate-spin text-amber-600 dark:text-amber-400 mb-3" size={28} />
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Đang tải danh sách đề thi...
                </p>
              </div>
            ) : filteredQuizzes.length > 0 ? (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {paginatedQuizzes.map((quiz: any, index: number) => {
                    const isCompleted = quiz.isCompleted;
                    const questionCount =
                      quiz.questionsCount || quiz._count?.questions || 0;
                    const rawFormat = quiz.bilingualContent?.examFormat;
                    const examFormat = rawFormat === "TWO_SKILL" ? "TOEIC_LR" : rawFormat === "SPEAKING_WRITING" ? "TOEIC_SW" : rawFormat === "FOUR_SKILL" ? "TOEIC_4_SKILLS" : rawFormat;
                    const isFourSkill = examFormat === "TOEIC_4_SKILLS";
                    const isSpeakingWriting = examFormat === "TOEIC_SW";
                    const destination = `/exams/${quiz.id}`;
                    const formatLabel = isFourSkill ? "TOEIC 4 kỹ năng" : isSpeakingWriting ? "TOEIC S&W" : "TOEIC L&R";
                    const skillLabels = isFourSkill ? ["Listening", "Reading", "Speaking", "Writing"] : isSpeakingWriting ? ["Speaking", "Writing"] : ["Listening", "Reading"];
                    const detailsLabel = isFourSkill ? "L&R + S&W" : isSpeakingWriting ? "11 Speaking · 8 Writing" : "200 câu · 120 phút";
                    const fallbackDescription = isFourSkill
                      ? "Bài thi tổng hợp 4 kỹ năng kết hợp Nghe, Đọc, Nói và Viết trong một buổi thi hoàn chỉnh. Đánh giá toàn diện năng lực giao tiếp môi trường quốc tế."
                      : isSpeakingWriting
                        ? "Mô phỏng 11 câu hỏi Nói và 8 bài tập Viết theo chuẩn khảo thí. Hệ thống ghi âm trực tiếp và đánh giá tiêu chí phát âm, ngữ pháp."
                        : "Mô phỏng bài thi Nghe và Đọc 200 câu bao quát Part 1–7. Chấm điểm tự động theo thang 990 kèm giải thích chi tiết từng câu.";
                    const cardDescription = quiz.description?.trim() || fallbackDescription;

                    const handleCardSelect = () => {
                      if (!user) {
                        setAuthGate({ open: true, title: quiz.title, destination });
                      } else {
                        if (launchingDestination) return;
                        setLaunchingDestination(destination);
                      }
                    };

                    return (
                      <motion.div
                        key={quiz.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`${quiz.title}. ${
                          isCompleted ? "Đã hoàn thành" : "Chưa làm"
                        }. ${questionCount} câu hỏi.`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={handleCardSelect}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleCardSelect();
                          }
                        }}
                        className={`group relative flex min-h-[250px] flex-col justify-between rounded-xl border bg-white p-5 cursor-pointer transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 ${
                          isCompleted
                            ? "border-emerald-200/90 dark:border-emerald-900/40 hover:border-emerald-400"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600"
                        }`}
                      >
                        <div>
                          {/* Top Row: Format Tag & Status */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${
                                isFourSkill
                                  ? "bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60"
                                  : isSpeakingWriting
                                    ? "bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60"
                                    : "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/60"
                              }`}
                            >
                              {isFourSkill ? (
                                <Award size={13} />
                              ) : isSpeakingWriting ? (
                                <Mic size={13} />
                              ) : (
                                <Headphones size={13} />
                              )}
                              <span>{formatLabel}</span>
                            </span>

                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/40">
                                <CheckCircle2 size={13} />
                                <span>Đã hoàn thành</span>
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                                Chưa làm
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <h3 className="text-base font-bold text-slate-950 dark:text-slate-100 group-hover:text-amber-800 dark:group-hover:text-amber-400 transition-colors line-clamp-2 leading-snug">
                            {quiz.title}
                          </h3>
                          <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">
                            {cardDescription}
                          </p>

                          {/* Skill Chips */}
                          <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
                            {skillLabels.map((skill) => (
                              <span
                                key={skill}
                                className="inline-flex items-center text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Bottom Row: Metadata & Button */}
                        <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <Clock size={13} className="text-slate-400" />
                            <span>{detailsLabel}</span>
                          </span>

                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-semibold group-hover:bg-amber-600 dark:group-hover:bg-amber-500 dark:group-hover:text-slate-950 transition-colors">
                            <span>{isCompleted ? "Luyện lại" : "Bắt đầu làm bài"}</span>
                            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pt-2">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={filteredQuizzes.length}
                      pageSize={pageSize}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={(size) => {
                        setPageSize(size);
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
                  <Target size={22} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {searchQuery || paperFilter !== "ALL"
                    ? "Không tìm thấy đề thi phù hợp"
                    : "Chưa có đề thi nào trong danh mục này"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {searchQuery
                    ? "Hãy thử tìm kiếm với từ khóa khác hoặc bỏ chọn bộ lọc."
                    : "Các bộ đề thi mới sẽ sớm được cập nhật trên hệ thống."}
                </p>
              </div>
            )}
          </div>

          {/* If "ALL" is selected, showcase the upcoming certificates catalog */}
          {selectedCert === "ALL" && (
            <div className="pt-8 border-t border-slate-200/80 dark:border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                    <Compass size={17} className="text-slate-700 dark:text-slate-300" />
                    <span>Định dạng chứng chỉ đang phát triển</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Kế hoạch mở rộng ngân hàng câu hỏi mô phỏng cho các chứng chỉ quốc tế tiếp theo.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {CERTIFICATES.filter((c) => c.status === "COMING_SOON").map(
                  (cert) => {
                    const isRegistered = notifiedCerts.has(cert.id);

                    return (
                      <div
                        key={cert.id}
                        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-4.5 flex flex-col justify-between hover:border-slate-350 dark:hover:border-slate-700 hover:shadow-xs transition-all"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              {cert.code}
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              {cert.roadmapDate}
                            </span>
                          </div>

                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                              {cert.name}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                              {cert.description}
                            </p>
                          </div>

                          {/* Skill badges */}
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            {cert.skills.slice(0, 3).map((s, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded"
                              >
                                {s.label.split(" (")[0]}
                              </span>
                            ))}
                            {cert.skills.length > 3 && (
                              <span className="text-[10px] font-medium text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-1.5 py-0.5 rounded">
                                +{cert.skills.length - 3}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedCert(cert.id)}
                            className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>Chi tiết</span>
                            <ChevronRight size={12} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleNotifyMe(cert.id, cert.name)}
                            className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                              isRegistered
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                          >
                            {isRegistered ? (
                              <>
                                <Check size={12} className="text-emerald-600" />
                                <span>Đã đăng ký</span>
                              </>
                            ) : (
                              <>
                                <Bell size={12} />
                                <span>Nhận tin</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Login Auth Gate Modal */}
      <AuthGateModal
        isOpen={authGate.open}
        onClose={() => setAuthGate({ open: false })}
        targetLabel={
          authGate.title ? `đề thi "${authGate.title}"` : "đề thi này"
        }
        targetRoute={authGate.destination || "/exams"}
        onOpenLogin={() => router.push("/login")}
        onOpenRegister={() => router.push("/register")}
      />
    </div>
  );
}
