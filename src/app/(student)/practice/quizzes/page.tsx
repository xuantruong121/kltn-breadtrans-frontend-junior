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
import { quizService, type Quiz } from "@/lib/api/services/quiz.service";
import { Pagination } from "@/components/ui";
import { useAuthStore } from "@/stores/authStore";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { PracticeLoadingScreen } from "@/components/practice/PracticeLoadingScreen";

const EMPTY_QUIZZES: Quiz[] = [];

export type CertificateId =
  | "ALL"
  | "TOEIC"
  | "IELTS"
  | "VSTEP"
  | "TOEFL"
  | "THPT_QG"
  | "CAMBRIDGE";

export type PaperFilter = "ALL" | "TWO_SKILL" | "FOUR_SKILL";

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
    name: "TOEIC ETS",
    fullName: "Test of English for International Communication",
    shortTag: "2 & 4 kỹ năng",
    status: "ACTIVE",
    badgeText: "Sẵn sàng làm bài",
    targetLevel: "Mục tiêu 450 - 990 điểm",
    description:
      "Bài thi đánh giá khả năng sử dụng tiếng Anh trong môi trường giao tiếp quốc tế và công việc, gồm định dạng 2 kỹ năng (Nghe - Đọc) và 4 kỹ năng chuẩn ETS.",
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
      badgeBg: "bg-emerald-50",
      badgeText: "text-emerald-700",
      badgeBorder: "border-emerald-200",
      tagBg: "bg-amber-50",
      tagText: "text-amber-800",
      accentBorder: "hover:border-amber-400",
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
      badgeBg: "bg-blue-50",
      badgeText: "text-blue-700",
      badgeBorder: "border-blue-200",
      tagBg: "bg-blue-50",
      tagText: "text-blue-800",
      accentBorder: "hover:border-blue-400",
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
      badgeBg: "bg-purple-50",
      badgeText: "text-purple-700",
      badgeBorder: "border-purple-200",
      tagBg: "bg-purple-50",
      tagText: "text-purple-800",
      accentBorder: "hover:border-purple-400",
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
      badgeBg: "bg-indigo-50",
      badgeText: "text-indigo-700",
      badgeBorder: "border-indigo-200",
      tagBg: "bg-indigo-50",
      tagText: "text-indigo-800",
      accentBorder: "hover:border-indigo-400",
    },
  },
  {
    id: "THPT_QG",
    code: "THPT Quốc Gia",
    name: "Tiếng Anh THPT QG",
    fullName: "Kỳ thi Tốt nghiệp THPT & Đánh giá năng lực Đại học",
    shortTag: "50 câu / 60 phút",
    status: "COMING_SOON",
    badgeText: "Đang biên soạn",
    targetLevel: "Mục tiêu 8.0 - 10.0 điểm",
    description:
      "Hệ thống đề thi phân loại cao bám sát ma trận đề thi chính thức của Bộ GD&ĐT cùng đề thi thử các trường THPT chuyên trên toàn quốc.",
    skills: [
      { label: "Ngữ âm & Trọng âm", icon: Headphones },
      { label: "Ngữ pháp & Từ vựng nâng cao", icon: Layers },
      { label: "Đọc điền & Đọc hiểu chuyên sâu", icon: BookOpen },
      { label: "Viết lại câu & Chức năng giao tiếp", icon: PenTool },
    ],
    examStructure: [
      "Ngữ âm, trọng âm, tìm lỗi sai và câu đồng nghĩa",
      "Cụm từ cố định (Collocations), Thành ngữ (Idioms)",
      "Bài đọc điền từ & 2 bài đọc hiểu phân hóa mạnh",
      "Ma trận nhận biết (40%), Thông hiểu (30%), Vận dụng cao (30%)",
    ],
    expectedFeatures: [
      "Giải thích chi tiết bẫy trắc nghiệm cho từng câu",
      "Báo cáo thống kê chuyên đề ngữ pháp còn yếu",
      "Bảng xếp hạng điểm thi đua top toàn quốc",
    ],
    roadmapDate: "Dự kiến: Quý 4/2026",
    theme: {
      tabActiveBg: "bg-amber-600 text-white",
      badgeBg: "bg-amber-50",
      badgeText: "text-amber-700",
      badgeBorder: "border-amber-200",
      tagBg: "bg-amber-50",
      tagText: "text-amber-800",
      accentBorder: "hover:border-amber-400",
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
      badgeBg: "bg-teal-50",
      badgeText: "text-teal-700",
      badgeBorder: "border-teal-200",
      tagBg: "bg-teal-50",
      tagText: "text-teal-800",
      accentBorder: "hover:border-teal-400",
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
    queryKey: ["toeic-papers"],
    queryFn: quizService.getToeicPapers,
  });

  const filteredQuizzes = useMemo(() => {
    if (!quizzes) return EMPTY_QUIZZES;
    const byFormat = quizzes.filter((quiz: any) => {
      if (paperFilter === "ALL") return true;
      return quiz.bilingualContent?.examFormat === paperFilter;
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

      {/* Modern Hero Hub Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 rounded-3xl p-6 sm:p-8 text-white shadow-md mb-8">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-xs px-3.5 py-1 rounded-full text-xs font-bold text-amber-50 shadow-2xs">
              <Target size={14} className="shrink-0" />
              <span>Hệ thống khảo thí &amp; luyện đề chuẩn quốc tế</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              Trung tâm luyện đề thi chứng chỉ
            </h1>

            <p className="text-sm text-amber-100/90 leading-relaxed">
              Khảo thí và luyện thi với hệ thống đề thi thử đa định dạng (TOEIC, IELTS, VSTEP, TOEFL, Cambridge, THPT Quốc Gia). Bấm giờ thi thật, phân tích điểm số và giải thích đáp án chi tiết.
            </p>

            {/* Quick KPI pills */}
            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-xs px-3 py-1 rounded-xl text-white">
                <CheckCircle2 size={13} className="text-emerald-300" />
                <span>TOEIC sẵn sàng thi</span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-xs px-3 py-1 rounded-xl text-white">
                <Clock size={13} className="text-amber-200" />
                <span>Bấm giờ theo format thi thực tế</span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-xs px-3 py-1 rounded-xl text-white">
                <Layers size={13} className="text-blue-200" />
                <span>5 chứng chỉ đang biên soạn</span>
              </span>
            </div>
          </div>

          {/* Quick Counter Box */}
          <div className="shrink-0 flex items-center lg:flex-col lg:items-end gap-3 text-right">
            <div className="bg-white/15 border border-white/20 px-5 py-3 rounded-2xl backdrop-blur-xs text-center w-full sm:w-auto min-w-[140px]">
              <div className="text-3xl font-black text-white leading-tight">
                {quizzes?.length || 2}
              </div>
              <div className="text-[11px] font-bold text-amber-100 uppercase tracking-wider mt-0.5">
                Đề thi khả dụng
              </div>
              <div className="mt-2 text-[10px] font-bold text-emerald-200 bg-emerald-950/30 px-2 py-0.5 rounded-full inline-block">
                Hệ thống TOEIC ETS
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Certificate Selector Navigation (Interactive Tab Bar) */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-wider px-1">
          <span>Chọn hệ thống chứng chỉ luyện thi</span>
          <span className="text-[11px] normal-case font-medium text-slate-400">
            {selectedCert === "ALL"
              ? "Đang hiển thị toàn bộ hệ sinh thái"
              : `Đang chọn: ${selectedCert}`}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {/* Option All */}
          <button
            type="button"
            onClick={() => {
              setSelectedCert("ALL");
              setCurrentPage(1);
            }}
            className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              selectedCert === "ALL"
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/15"
                : "bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"
            }`}
          >
            <Compass size={15} />
            <span>Tất cả chứng chỉ</span>
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
                className={`shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20"
                    : "bg-white border-slate-200/90 text-slate-700 hover:bg-amber-50/50 hover:border-amber-300 hover:text-amber-900"
                }`}
              >
                <span>{cert.name}</span>
                {isActive ? (
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                      isSelected
                        ? "bg-white/20 text-white border-white/30"
                        : `${cert.theme.badgeBg} ${cert.theme.badgeText} ${cert.theme.badgeBorder}`
                    }`}
                  >
                    Có đề thi
                  </span>
                ) : (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isSelected
                        ? "bg-white/20 text-white border-white/30"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    Sắp ra mắt
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
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="space-y-2.5 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${selectedCertMeta.theme.badgeBg} ${selectedCertMeta.theme.badgeText} ${selectedCertMeta.theme.badgeBorder}`}
                  >
                    <AlertCircle size={13} />
                    {selectedCertMeta.badgeText}
                  </span>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    {selectedCertMeta.targetLevel}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    Lộ trình: {selectedCertMeta.roadmapDate}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Bộ đề thi {selectedCertMeta.fullName}
                </h2>

                <p className="text-sm text-slate-600 leading-relaxed">
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
                  className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                    notifiedCerts.has(selectedCertMeta.id)
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  {notifiedCerts.has(selectedCertMeta.id) ? (
                    <>
                      <Check size={14} className="text-emerald-600" />
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
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Luyện đề TOEIC có sẵn</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Feature and Format Details Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
              {/* Column 1: Skills */}
              <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/70 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
                  <Award size={15} className="text-amber-600" />
                  <span>Kỹ năng đánh giá</span>
                </div>
                <div className="space-y-2">
                  {selectedCertMeta.skills.map((skill, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 text-xs font-bold text-slate-700 bg-white px-3 py-2 rounded-xl border border-slate-200/60"
                    >
                      <skill.icon size={14} className="text-slate-400 shrink-0" />
                      <span>{skill.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 2: Exam Structure */}
              <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/70 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
                  <FileText size={15} className="text-blue-600" />
                  <span>Cấu trúc đề thi dự kiến</span>
                </div>
                <ul className="space-y-2">
                  {selectedCertMeta.examStructure.map((struct, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-xs font-medium text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/60 leading-snug"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      <span>{struct}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Column 3: Simulator Features */}
              <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/70 space-y-3 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
                  <ShieldCheck size={15} className="text-emerald-600" />
                  <span>Tính năng đang phát triển</span>
                </div>
                <ul className="space-y-2">
                  {selectedCertMeta.expectedFeatures.map((feat, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-xs font-medium text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/60 leading-snug"
                    >
                      <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
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
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Format Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {([
                  ["ALL", "Tất cả đề"],
                  ["TWO_SKILL", "TOEIC 2 kỹ năng"],
                  ["FOUR_SKILL", "TOEIC 4 kỹ năng"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setPaperFilter(value);
                      setCurrentPage(1);
                    }}
                    className={`rounded-xl px-3.5 py-2 text-xs font-black transition-colors cursor-pointer ${
                      paperFilter === value
                        ? "bg-amber-500 text-white shadow-xs"
                        : "bg-slate-50 text-slate-600 hover:bg-amber-50 hover:text-amber-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64 shrink-0">
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
                  className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-medium text-slate-800"
                />
              </div>
            </div>

            {/* List Header Count & Timer info */}
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
              <span className="flex items-center gap-1.5">
                <BookmarkCheck size={14} className="text-amber-700" />
                <span>
                  {filteredQuizzes.length} đề thi TOEIC khả dụng
                  {paperFilter !== "ALL" &&
                    ` (${paperFilter === "TWO_SKILL" ? "2 kỹ năng" : "4 kỹ năng"})`}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                <Clock size={13} />
                <span>Bấm giờ theo format thi thực tế</span>
              </span>
            </div>

            {/* Loading / Cards Grid */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
                <Loader2 className="animate-spin text-amber-600 mb-3" size={32} />
                <p className="text-xs font-bold text-slate-500">
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
                    const examFormat = quiz.bilingualContent?.examFormat;
                    const isFourSkill = examFormat === "FOUR_SKILL";
                    const destination = isFourSkill
                      ? `/practice/toeic/bundle/${quiz.id}`
                      : `/practice/toeic/${quiz.bilingualContent?.examSetId || quiz.id}`;

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
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        onClick={handleCardSelect}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleCardSelect();
                          }
                        }}
                        className={`group relative rounded-2xl border p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${
                          isCompleted
                            ? "bg-emerald-50/30 border-emerald-200 hover:border-emerald-300 hover:shadow-md"
                            : "bg-white border-slate-200/80 hover:border-amber-400 hover:shadow-md"
                        }`}
                      >
                        <div>
                          {/* Top Row: Format Tag & Status */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span
                              className={`inline-flex items-center gap-1.5 text-[11px] font-black px-2.5 py-0.5 rounded-lg border ${
                                isFourSkill
                                  ? "bg-purple-50 text-purple-800 border-purple-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200/70"
                              }`}
                            >
                              <BookOpen size={12} />
                              <span>
                                {isFourSkill
                                  ? "TOEIC 4 Kỹ Năng (Full Bundle)"
                                  : "TOEIC 2 Kỹ Năng (L&R)"}
                              </span>
                            </span>

                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                                <CheckCircle2 size={13} />
                                <span>Đã hoàn thành</span>
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-slate-400">
                                Chưa làm
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-800 transition-colors line-clamp-2 leading-snug">
                            {quiz.title}
                          </h3>

                          {/* Skills Breakdown pill */}
                          <div className="mt-2.5 flex flex-wrap items-center gap-1 text-[10px] font-bold text-slate-500">
                            <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                              Listening
                            </span>
                            <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                              Reading
                            </span>
                            {isFourSkill && (
                              <>
                                <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                                  Speaking
                                </span>
                                <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                                  Writing
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Bottom Row: Metadata & Button */}
                        <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
                          <span className="flex items-center gap-1">
                            <BookOpen size={13} className="text-slate-400" />
                            <span>{questionCount} câu hỏi</span>
                          </span>

                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 group-hover:translate-x-0.5 transition-transform">
                            {isCompleted ? "Luyện lại" : "Bắt đầu làm bài"}
                            <ArrowRight size={13} />
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
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
                  <Target size={24} />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  {searchQuery || paperFilter !== "ALL"
                    ? "Không tìm thấy đề thi phù hợp"
                    : "Chưa có đề thi nào trong danh mục này"}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery
                    ? "Hãy thử tìm kiếm với từ khóa khác hoặc bỏ chọn bộ lọc."
                    : "Các bộ đề thi mới sẽ sớm được cập nhật trên hệ thống."}
                </p>
              </div>
            )}
          </div>

          {/* If "ALL" is selected, also showcase the upcoming certificates catalog */}
          {selectedCert === "ALL" && (
            <div className="pt-6 border-t border-slate-200/80 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <GraduationCap size={20} className="text-amber-600" />
                    <span>Hệ sinh thái chứng chỉ đang biên soạn</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Các bộ đề thi thử quốc tế đang được đội ngũ chuyên gia hoàn thiện ngân hàng đề và hệ thống chấm điểm tự động.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {CERTIFICATES.filter((c) => c.status === "COMING_SOON").map(
                  (cert) => {
                    const isRegistered = notifiedCerts.has(cert.id);

                    return (
                      <div
                        key={cert.id}
                        className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg border ${cert.theme.badgeBg} ${cert.theme.badgeText} ${cert.theme.badgeBorder}`}
                            >
                              {cert.badgeText}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {cert.roadmapDate}
                            </span>
                          </div>

                          <div>
                            <h3 className="text-base font-bold text-slate-900 leading-snug">
                              {cert.name}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                              {cert.description}
                            </p>
                          </div>

                          {/* Skill badges */}
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            {cert.skills.slice(0, 3).map((s, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md"
                              >
                                {s.label.split(" (")[0]}
                              </span>
                            ))}
                            {cert.skills.length > 3 && (
                              <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md">
                                +{cert.skills.length - 3}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedCert(cert.id)}
                            className="text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <span>Xem lộ trình</span>
                            <ChevronRight size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleNotifyMe(cert.id, cert.name)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                              isRegistered
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            {isRegistered ? (
                              <>
                                <Check size={12} className="text-emerald-600" />
                                <span>Đã nhận tin</span>
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
        targetRoute={authGate.destination || "/practice/quizzes"}
        onOpenLogin={() => router.push("/login")}
        onOpenRegister={() => router.push("/register")}
      />
    </div>
  );
}
