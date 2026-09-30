"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Clock,
  Route,
  Milestone,
  Headphones,
  Gift,
  Mic,
  Trophy,
  Flame,
  Volume2,
  Play,
  Award,
  Zap,
  Star,
  Check,
  Target,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { QuickLoginModal } from "@/components/auth/QuickLoginModal";
import { QuickRegisterModal } from "@/components/auth/QuickRegisterModal";
import { motion } from "framer-motion";

// --- DATA CONSTANTS ---

const ROADMAP_STEPS = [
  {
    step: "01",
    title: "Chẩn đoán năng lực 5 phút",
    desc: "Làm bài test thích ứng thông minh để xác định chính xác trình độ CEFR (A1 - C1) và các lỗ hổng phát âm, từ vựng ban đầu.",
    badge: "Miễn phí 100%",
    icon: Target,
  },
  {
    step: "02",
    title: "Thiết kế lộ trình mục tiêu tối ưu",
    desc: "Hệ thống tự động phân bổ khối lượng học tập theo mục tiêu điểm số và quỹ thời gian thực tế của riêng bạn.",
    badge: "Cá nhân hóa",
    icon: Milestone,
  },
  {
    step: "03",
    title: "Luyện 4 kỹ năng & Sửa lỗi tức thì",
    desc: "Rèn luyện Nghe, Nói, Đọc, Viết có trợ lý học tập đồng hành 24/7, phát hiện từng âm vị sai và gợi ý sửa lỗi trong 2 giây.",
    badge: "Phản hồi thời gian thực",
    icon: Zap,
  },
  {
    step: "04",
    title: "Thi thử ETS & Bứt phá điểm số",
    desc: "Cọ xát phòng thi 200 câu áp lực bấm giờ thực tế, khắc phục triệt để bẫy đề thi và tự tin đạt chứng chỉ mơ ước.",
    badge: "Chuẩn format 2024",
    icon: Trophy,
  },
];

const CURRICULUM_COURSES = [
  {
    id: "toeic-mastery",
    category: "toeic",
    title: "Luyện Thi TOEIC Bứt Phá 750+",
    desc: "Khóa học trọng điểm gồm 120 chủ đề trọng tâm, chiến lược xử lý Part 1-7 và ngân hàng 50 đề thi thử ETS có phân tích đáp án chi tiết.",
    level: "Intermediate",
    lessonsCount: "120 bài học",
    duration: "60 giờ",
    highlight: "Khóa học trọng tâm",
    link: "/practice/quizzes",
  },
  {
    id: "workplace-comm",
    category: "comm",
    title: "Tiếng Anh Giao Tiếp Công Sở & Phỏng Vấn",
    desc: "Luyện phản xạ viết email chuyên nghiệp, hội thoại đàm phán, thuyết trình dự án và trả lời phỏng vấn trôi chảy cùng gia sư đồng hành.",
    level: "All Levels",
    lessonsCount: "60 bài giảng",
    duration: "40 giờ",
    highlight: "Giao tiếp thực tế",
    link: "/courses",
  },
  {
    id: "pronunciation-lab",
    category: "comm",
    title: "Chỉnh Phát Âm Chuẩn Âm Vị IPA & Ngữ Điệu",
    desc: "Chuyên sâu 44 âm IPA quốc tế, nối âm, nuốt âm, trọng âm từ và ngữ điệu câu với công nghệ đối sánh giọng đọc bản xứ.",
    level: "Beginner",
    lessonsCount: "44 bài luyện",
    duration: "25 giờ",
    highlight: "Nhận diện âm vị",
    link: "/practice/speaking",
  },
  {
    id: "grammar-vocab-srs",
    category: "vocab",
    title: "Hệ Thống 3000 Từ Vựng Cốt Lõi & 24 Chuyên Đề Ngữ Pháp",
    desc: "Bộ thẻ Flashcard ghi nhớ ngắt quãng SRS kết hợp 24 sơ đồ tư duy ngữ pháp giúp nắm chắc cấu trúc câu mà không cần học vẹt.",
    level: "All Levels",
    lessonsCount: "3000 từ • 24 chủ điểm",
    duration: "Không giới hạn",
    highlight: "Thuật toán SRS",
    link: "/flashcard",
  },
];

const TESTIMONIALS = [
  {
    name: "Nguyễn Tuấn Anh",
    role: "Sinh viên năm cuối ĐH Bách Khoa",
    tag: "TOEIC 450 → 820",
    timeframe: "Sau 70 ngày",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    quote:
      "Trước đây mình rất sợ phần Nghe Part 3, 4 vì tốc độ nói quá nhanh. Nhờ tính năng luyện nghe ngắt câu và giải thích bẫy đề thi của BreadTrans, mình đã nâng từ 450 lên 820 điểm để kịp nộp hồ sơ tốt nghiệp.",
  },
  {
    name: "Trần Thị Minh Thư",
    role: "Chuyên viên Kiểm toán Deloitte",
    tag: "Phát âm 62% → 96%",
    timeframe: "Sau 45 ngày",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    quote:
      "Đi làm bận rộn không có thời gian tới trung tâm, mình chọn BreadTrans vì có thể luyện nói bất cứ lúc nào. AI chỉ rõ mình nuốt âm đuôi ở đâu, hướng dẫn uốn lưỡi rất tỉ mỉ, bây giờ mình tự tin họp với đối tác nước ngoài.",
  },
  {
    name: "Lê Hoàng Đức",
    role: "Kỹ sư Phần mềm FPT Software",
    tag: "Chuỗi học 90 ngày Streak",
    timeframe: "Học mỗi ngày",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    quote:
      "Cơ chế nuôi thú cưng ảo và kiếm Bánh Mì làm mình nghiện học thực sự. Mỗi ngày chỉ cần 20 phút hoàn thành nhiệm vụ là cảm giác như đang chơi game mà tiếng Anh lại tiến bộ trông thấy.",
  },
];

const COMPARISON_ROWS = [
  {
    feature: "Thời gian & Không gian học tập",
    traditional: "Cố định theo lịch trung tâm, mất thời gian di chuyển",
    selfStudy: "Dễ chán nản, hay trì hoãn, không có người đốc thúc",
    breadtrans: "Linh hoạt 24/7 mọi lúc mọi nơi trên mọi thiết bị",
  },
  {
    feature: "Chấm phát âm & Sửa bài nói",
    traditional: "Giáo viên sửa chung cả lớp, ít cơ hội được nói riêng",
    selfStudy: "Tự ghi âm nghe lại, không biết đúng sai âm vị",
    breadtrans: "Chấm chi tiết từng âm vị, ngữ điệu chuẩn xác trong 2 giây",
  },
  {
    feature: "Thi thử TOEIC chuẩn ETS",
    traditional: "1-2 buổi thi thử mỗi khóa, trả kết quả sau vài ngày",
    selfStudy: "Làm sách photo, tự tra đáp án, không rõ bẫy đề",
    breadtrans: "200+ bộ đề bấm giờ thực tế, phân tích lỗ hổng tức thì",
  },
  {
    feature: "Động lực duy trì thói quen",
    traditional: "Phụ thuộc vào điểm danh, dễ bỏ dở khi bận",
    selfStudy: "Bỏ cuộc sau 1-2 tuần đầu tiên",
    breadtrans: "Thú cưng đồng hành, chuỗi Streak rực lửa, đổi quà Bánh Mì",
  },
  {
    feature: "Chi phí đầu tư",
    traditional: "Từ 5.000.000đ - 12.000.000đ / khóa",
    selfStudy: "Mua sách vở, tài liệu rải rác không hệ thống",
    breadtrans: "Bắt đầu miễn phí 100%, tiết kiệm 90% chi phí",
  },
];

const FAQ_LIST = [
  {
    q: "BreadTrans có hoàn toàn miễn phí để bắt đầu học không?",
    a: "Hoàn toàn miễn phí! Bạn có thể đăng ký tài khoản trong 30 giây để làm bài kiểm tra trình độ 5 phút, nhận ngay 50 Bánh Mì tân thủ và trải nghiệm các bài luyện tập 4 kỹ năng cơ bản mà không cần nhập thẻ ngân hàng.",
  },
  {
    q: "Hệ thống chấm điểm phát âm và ngữ điệu hoạt động như thế nào?",
    a: "Hệ thống sẽ lắng nghe và đối chiếu trực tiếp giọng đọc của bạn với chuẩn phát âm bản ngữ. Bạn sẽ biết ngay mình đọc đúng hay sai ở từng từ, có bị nuốt âm đuôi hay sai trọng âm không, đồng thời nhận được hướng dẫn cụ thể cách đặt lưỡi và mở khẩu hình để chỉnh lại thật chuẩn.",
  },
  {
    q: "Đề thi thử TOEIC trên BreadTrans có sát với đề thi thật ETS không?",
    a: "Toàn bộ ngân hàng đề thi thử trên BreadTrans được biên soạn bám sát cấu trúc đề thi TOEIC mới nhất của ETS (2024), đầy đủ 200 câu hỏi trong 120 phút (Part 1 đến Part 7), có đồng hồ đếm ngược đồng bộ và hệ thống phân tích chi tiết bẫy đề thi cho từng câu hỏi.",
  },
  {
    q: "Bánh Mì trong hệ thống dùng để làm gì và làm sao để tích lũy?",
    a: "Bánh Mì là điểm thưởng bạn nhận được khi chăm chỉ học tập trên BreadTrans. Cứ mỗi khi hoàn thành bài học, giữ vững chuỗi ngày học liên tục hoặc đạt điểm cao trong bài thi, bạn sẽ được cộng thêm Bánh Mì. Bạn có thể dùng Bánh Mì để nuôi thú cưng đồng hành tăng cấp, mở khóa đề thi nâng cao hoặc đổi quà trong Cửa hàng.",
  },
  {
    q: "Tôi có thể học BreadTrans trên điện thoại di động không?",
    a: "Hoàn toàn được! BreadTrans hoạt động mượt mà trên mọi thiết bị từ iPhone, Android đến máy tính bảng và laptop. Bạn cũng có thể dễ dàng thêm BreadTrans ra màn hình chính điện thoại như một ứng dụng thông thường để vào học tiện lợi mọi lúc mọi nơi.",
  },
];

const BASE_WAVE_HEIGHTS = [40, 70, 30, 90, 60, 100, 45, 80, 50, 95, 30, 65, 85, 40, 75, 50];
const PLAYING_WAVE_HEIGHTS = [75, 45, 80, 35, 95, 60, 90, 50, 85, 70, 60, 95, 45, 80, 55, 90];

// --- MAIN LANDING PAGE COMPONENT ---

export default function PublicLandingPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Auth Gate state
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [targetLabel, setTargetLabel] = useState("bài học");
  const [targetRoute, setTargetRoute] = useState("/dashboard");

  // Quick modals state
  const [quickLoginOpen, setQuickLoginOpen] = useState(false);
  const [quickRegisterOpen, setQuickRegisterOpen] = useState(false);

  // Interactive Test-Drive Widget State
  const [calcLevel, setCalcLevel] = useState<"BEGINNER" | "INTERMEDIATE" | "ADVANCED">("BEGINNER");
  const [calcTarget, setCalcTarget] = useState<600 | 750 | 850>(600);

  // Curriculum Filter Tab
  const [activeCourseTab, setActiveCourseTab] = useState<"all" | "toeic" | "comm" | "vocab">("all");

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Simulated Speaking Demo Playing State
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);

  // Protected Action Handler
  const handleProtectedAction = (label: string, route: string) => {
    if (user) {
      router.push(route);
    } else {
      setTargetLabel(label);
      setTargetRoute(route);
      setAuthGateOpen(true);
    }
  };

  const openDirectLogin = (label = "bài học", route = "/dashboard") => {
    setTargetLabel(label);
    setTargetRoute(route);
    setQuickLoginOpen(true);
  };

  const openDirectRegister = (label = "tài khoản học viên", route = "/dashboard") => {
    setTargetLabel(label);
    setTargetRoute(route);
    setQuickRegisterOpen(true);
  };

  // Dynamic estimate calculation for interactive widget
  const getCalculationResult = () => {
    if (calcLevel === "BEGINNER") {
      if (calcTarget === 600) {
        return { weeks: 10, dailyMins: 30, listeningP: "Part 1, 2 (Trọng âm & Ngắt nghỉ)", readingP: "Part 5 (Ngữ pháp cơ bản)", examSet: "ETS 2024 Starter" };
      }
      if (calcTarget === 750) {
        return { weeks: 16, dailyMins: 45, listeningP: "Part 1, 2, 3 (Hội thoại ngắn)", readingP: "Part 5, 6 (Điền từ & Đọc hiểu đoạn)", examSet: "ETS 2024 Intensive" };
      }
      return { weeks: 24, dailyMins: 60, listeningP: "Full Part 1-4 (Phản xạ tốc độ cao)", readingP: "Full Part 5-7 (Đoạn kép & Ba)", examSet: "ETS 2024 Mastery 850+" };
    }
    if (calcLevel === "INTERMEDIATE") {
      if (calcTarget === 600) {
        return { weeks: 4, dailyMins: 25, listeningP: "Speed-up Part 2 & Phản xạ bẫy", readingP: "Part 5 (Từ loại & Cụm collocation)", examSet: "ETS 2024 Quick Sprint" };
      }
      if (calcTarget === 750) {
        return { weeks: 8, dailyMins: 40, listeningP: "Paraphrase Part 3, 4 chuyên sâu", readingP: "Part 6, 7 (Kỹ thuật Skimming/Scanning)", examSet: "ETS 2024 High-Scorer" };
      }
      return { weeks: 14, dailyMins: 50, listeningP: "Distractor & Giọng đa vùng US/UK/AU", readingP: "Triple Passage Part 7 tốc độ", examSet: "ETS 2024 Advanced 850+" };
    }
    // ADVANCED (700+)
    if (calcTarget === 600) {
      return { weeks: 2, dailyMins: 20, listeningP: "Luyện lướt tổng hợp Part 1-4", readingP: "Rà soát bẫy đề Part 5-7", examSet: "ETS 2024 Fast Review (Đã đạt chuẩn)" };
    }
    if (calcTarget === 750) {
      return { weeks: 4, dailyMins: 30, listeningP: "Tối ưu hóa điểm số Part 3, 4", readingP: "Khắc phục bẫy ngữ nghĩa Part 7", examSet: "ETS 2024 Intensive Sprint" };
    }
    return { weeks: 6, dailyMins: 40, listeningP: "Accent Variation US/UK/AU/NZ", readingP: "Speed Reading Part 7 (Đoạn 3 bài)", examSet: "ETS 2024 Elite 900+ Master" };
  };

  const calcResult = getCalculationResult();

  const filteredCourses =
    activeCourseTab === "all"
      ? CURRICULUM_COURSES
      : CURRICULUM_COURSES.filter((c) => c.category === activeCourseTab);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  // Real Web Speech API audio playback for pronunciation demo
  const DEMO_SPEECH_TEXT = "Could you please send me the financial report by tomorrow?";

  const toggleDemoPlay = () => {
    if (typeof window === "undefined") return;

    if (isPlayingDemo) {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingDemo(false);
      return;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(DEMO_SPEECH_TEXT);
      utterance.lang = "en-US";
      utterance.rate = 0.92;
      utterance.pitch = 1.0;

      try {
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(
          (v) =>
            v.lang === "en-US" ||
            v.lang.replace("-", "_") === "en_US" ||
            v.name.includes("US") ||
            v.name.includes("Samantha") ||
            v.name.includes("Google US") ||
            v.name.includes("Natural")
        );
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      } catch {
        // Fallback to default voice
      }

      utterance.onstart = () => {
        setIsPlayingDemo(true);
      };
      utterance.onend = () => {
        setIsPlayingDemo(false);
      };
      utterance.onerror = () => {
        setIsPlayingDemo(false);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      // Graceful fallback simulation if browser lacks speechSynthesis
      setIsPlayingDemo(true);
      setTimeout(() => setIsPlayingDemo(false), 2600);
    }
  };

  // Clean up any ongoing speech synthesis when unmounting
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div className="min-h-full bg-background text-foreground antialiased selection:bg-amber-600 selection:text-white font-['Quicksand',sans-serif] transition-colors duration-150">
      {/* ========================================================================= */}
      {/* 1. DYNAMIC ASYMMETRIC HERO SECTION (Anti-Center Bias, High Energy)       */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden pt-6 sm:pt-10 pb-16 lg:pb-24 border-b border-amber-100/60 dark:border-slate-800/60 bg-gradient-to-b from-amber-50/70 via-[#fdfbf7] to-[#fbfaf8] dark:from-slate-900/90 dark:via-slate-900 dark:to-background">
        {/* Subtle Ambient Decorative Glows */}
        <div
          className="pointer-events-none absolute -left-20 top-0 size-96 rounded-full bg-amber-200/30 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute right-0 top-1/4 size-96 rounded-full bg-orange-100/40 blur-3xl"
          aria-hidden="true"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Core Value Proposition & CTAs (7 Cols) */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-7">
              {/* Product Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/80 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-900/60 text-amber-900 dark:text-amber-300 text-xs font-black tracking-wide shadow-2xs">
                <Zap className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 fill-amber-600 dark:fill-amber-400" aria-hidden="true" />
                <span>Nền tảng Học Tiếng Anh &amp; Luyện Thi TOEIC AI Thế Hệ Mới</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-black text-slate-900 dark:text-slate-100 leading-[1.24] sm:leading-[1.18] text-balance">
                Chinh phục Tiếng Anh &amp; Bứt phá TOEIC cùng{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 dark:from-amber-400 dark:via-orange-400 dark:to-amber-500">
                  Gia sư AI thông minh
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg font-semibold leading-relaxed max-w-2xl">
                Học tập phản xạ 4 kỹ năng Nghe - Nói - Đọc - Viết, chấm phát âm chi tiết từng âm vị, cọ xát
                hơn 200+ bộ đề thi ETS chuẩn hóa và duy trì cảm hứng bền bỉ cùng thú cưng đồng hành mỗi ngày.
              </p>

              {/* Call-to-Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                {user ? (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white font-black text-base shadow-card transition-all cursor-pointer"
                  >
                    <span>Vào bàn học tập của bạn</span>
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                ) : (
                  <motion.button
                    onClick={() => openDirectRegister("tài khoản học viên", "/dashboard")}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-base shadow-[0_6px_0_0_#c2410c] active:translate-y-[6px] active:shadow-none transition-all cursor-pointer"
                    type="button"
                  >
                    <span>Bắt đầu học miễn phí ngay</span>
                    <ArrowRight size={18} aria-hidden="true" />
                  </motion.button>
                )}

                <button
                  onClick={() => handleProtectedAction("bài kiểm tra chẩn đoán trình độ", "/diagnostic")}
                  className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white dark:bg-slate-850 hover:bg-amber-50/60 dark:hover:bg-slate-800 border-2 border-amber-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-base transition-colors cursor-pointer shadow-2xs"
                  type="button"
                >
                  <Clock size={18} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  <span>Làm test chẩn đoán 5 phút</span>
                </button>
              </div>

              {!user && (
                <div className="pt-0.5">
                  <button
                    onClick={() => openDirectLogin("bài học", "/dashboard")}
                    className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors underline underline-offset-4 cursor-pointer"
                    type="button"
                  >
                    Đã có tài khoản học viên? Đăng nhập ngay →
                  </button>
                </div>
              )}


            </div>

            {/* Right Column: Live Interactive Product Showcase Card (5 Cols) */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Decorative Background Offset */}
                <div
                  className="absolute inset-0 bg-gradient-to-tr from-amber-300 to-orange-400 rounded-3xl rotate-2 scale-[1.02] opacity-30 dark:opacity-15 blur-xs"
                  aria-hidden="true"
                />

                {/* Main Interactive Showcase Card */}
                <div className="relative bg-white dark:bg-slate-900 border-2 border-amber-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-7 pt-7 sm:pt-8 shadow-card space-y-5">
                  {/* Card Header: Live AI Status */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex size-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full size-3 bg-emerald-500" />
                      </span>
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                        BreadTrans AI Tutor
                      </span>
                    </div>
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                      Chấm điểm âm vị thời gian thực
                    </span>
                  </div>

                  {/* Practice Prompt Preview */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Câu luyện nói thực chiến:
                    </span>
                    <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-slate-800/60 border border-amber-200/80 dark:border-slate-700">
                      <p className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        &ldquo;Could you please send me the financial report by tomorrow?&rdquo;
                      </p>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 italic">
                        (Bạn có thể gửi cho tôi bản báo cáo tài chính trước ngày mai không?)
                      </p>
                    </div>
                  </div>

                  {/* Simulated Waveform & Audio Playback */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-3">
                    <button
                      onClick={toggleDemoPlay}
                      className={`size-11 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-all cursor-pointer ${
                        isPlayingDemo
                          ? "bg-amber-700 text-white ring-4 ring-amber-300 dark:ring-amber-800 scale-95"
                          : "bg-amber-600 hover:bg-amber-700 text-white hover:scale-105 active:scale-95"
                      }`}
                      title={isPlayingDemo ? "Bấm để dừng phát âm" : "Bấm để nghe phát âm mẫu chuẩn US"}
                      aria-label={isPlayingDemo ? "Dừng phát âm mẫu" : "Nghe thử phát âm mẫu chuẩn bản xứ"}
                      type="button"
                    >
                      {isPlayingDemo ? (
                        <Volume2 size={20} className="animate-pulse" />
                      ) : (
                        <Play size={20} className="ml-0.5" />
                      )}
                    </button>

                    {/* Animated Waveform Bars */}
                    <div className="flex-1 flex items-center gap-1 justify-center h-8" aria-hidden="true">
                      {BASE_WAVE_HEIGHTS.map((h, i) => (
                        <span
                          key={i}
                          className={`w-1 rounded-full transition-all duration-300 ${
                            isPlayingDemo ? "bg-amber-600 animate-pulse" : "bg-slate-300 dark:bg-slate-600"
                          }`}
                          style={{
                            height: isPlayingDemo ? `${PLAYING_WAVE_HEIGHTS[i]}%` : `${h}%`,
                          }}
                        />
                      ))}
                    </div>

                    <span className="text-xs font-black text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg shrink-0">
                      Chuẩn US 100%
                    </span>
                  </div>

                  {/* Phoneme Breakdown Chips */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Phân tích từng từ &amp; âm vị:
                    </span>
                    <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                        Could [kʊd] 99%
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                        please [pliːz] 98%
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                        financial [faɪˈnænʃl] 96%
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                        report 97%
                      </span>
                    </div>
                  </div>

                  {/* Interactive Result Badges Footer */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-amber-50/50 dark:bg-slate-800/60 border border-amber-200/60 dark:border-slate-700/60">
                      <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Phát âm</span>
                      <strong className="text-base font-black text-emerald-700 dark:text-emerald-400">98%</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-50/50 dark:bg-slate-800/60 border border-amber-200/60 dark:border-slate-700/60">
                      <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Trôi chảy</span>
                      <strong className="text-base font-black text-amber-700 dark:text-amber-400">95 / 100</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-50/50 dark:bg-slate-800/60 border border-amber-200/60 dark:border-slate-700/60">
                      <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Dự đoán TOEIC</span>
                      <strong className="text-base font-black text-blue-700 dark:text-blue-400">820+</strong>
                    </div>
                  </div>
                </div>

                {/* Floating Micro-Badge: Daily Streak */}
                <div
                  className="hidden sm:flex absolute -top-4 -left-2 sm:-left-4 bg-white dark:bg-slate-850 border border-amber-200/90 dark:border-slate-700 rounded-2xl px-3.5 py-2 shadow-soft items-center gap-2 z-20 transition-transform hover:scale-105"
                  aria-hidden="true"
                >
                  <div className="size-6 rounded-lg bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                    <Flame size={14} className="fill-orange-500" />
                  </div>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                    Chuỗi <span className="text-orange-600 dark:text-orange-400 font-extrabold">14 ngày</span>
                    <span className="hidden md:inline ml-1 text-[11px] font-bold text-orange-700 dark:text-orange-300">(+350 XP &amp; Bánh Mì)</span>
                    <span className="inline md:hidden ml-1 text-[11px] font-bold text-orange-700 dark:text-orange-300">(+350 XP)</span>
                  </p>
                </div>

                {/* Floating Micro-Badge: Pet Companion */}
                <div
                  className="hidden sm:flex absolute -top-4 -right-2 sm:-right-4 bg-white dark:bg-slate-850 border border-amber-200/90 dark:border-slate-700 rounded-2xl px-3.5 py-2 shadow-soft items-center gap-2 z-20 transition-transform hover:scale-105"
                  aria-hidden="true"
                >
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                    Thú cưng: <span className="text-amber-700 dark:text-amber-400 font-extrabold">Cấp 5 (No bụng)</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* ========================================================================= */}
      {/* 3. CORE FEATURE BENTO GRID (4 Trụ Cột Đột Phá)                            */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 space-y-8">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto gap-3.5 sm:gap-4.5">
          <span className="inline-flex items-center text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/50 px-3.5 py-1.5 rounded-full border border-amber-200 dark:border-amber-900/60">
            Trụ Cột Đột Phá
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-slate-100 leading-snug sm:leading-[1.36] text-balance">
            Mọi công cụ bạn cần để làm chủ tiếng Anh &amp; TOEIC
          </h2>
          <p className="text-sm sm:text-base font-semibold text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl text-pretty">
            Tạm biệt phương pháp học nhồi nhét truyền thống. BreadTrans kết hợp AI phân tích âm vị,
            đấu trường luyện đề chuẩn ETS và động lực gamification giữ lửa mỗi ngày.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: AI Speaking & Pronunciation Lab (Spans 2 cols) */}
          <div className="md:col-span-2 bg-gradient-to-br from-violet-50/50 via-white to-amber-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-850 border border-violet-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-soft hover:border-violet-300 dark:hover:border-slate-700 transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="size-14 rounded-2xl bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 flex items-center justify-center border border-violet-200 dark:border-violet-900/60">
                  <Mic size={28} aria-hidden="true" />
                </div>
                <span className="px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-950/50 text-violet-800 dark:text-violet-300 border border-violet-200 dark:border-violet-900/60 text-xs font-black">
                  Công nghệ Gemini &amp; Speech-to-Phoneme
                </span>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                  Phòng Luyện Nói &amp; Chấm Điểm Âm Vị Tức Thì
                </h3>
                <p className="text-sm sm:text-base font-semibold text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  Không còn mơ hồ về phát âm của mình. Hệ thống nhận diện từng âm vị (Phonemes) bạn đọc sai
                  như các âm khó /θ/, /ð/, /ʃ/, /tʃ/, đo lường ngữ điệu và hướng dẫn khẩu hình sửa lỗi ngay lập tức.
                </p>
              </div>

              {/* Visual Feature Pill list */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                  <span className="text-xs font-extrabold text-violet-800 dark:text-violet-300 block">Độ chính xác âm học</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Đối chiếu trực tiếp với phát âm US/UK chuẩn</span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                  <span className="text-xs font-extrabold text-violet-800 dark:text-violet-300 block">Sửa lỗi trong 2s</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Phản hồi ngữ điệu và trọng âm không độ trễ</span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                  <span className="text-xs font-extrabold text-violet-800 dark:text-violet-300 block">Đổi giọng &amp; Tốc độ</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Lựa chọn 0.75x, 0.9x, 1x và chất giọng linh hoạt</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Hơn 500+ bài tập hội thoại thực tế</span>
              <button
                onClick={() => handleProtectedAction("phòng luyện nói", "/practice/speaking")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs transition-colors shadow-2xs cursor-pointer"
                type="button"
              >
                <span>Thử luyện nói ngay</span>
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Card 2: ETS Simulation TOEIC Arena (1 Col) */}
          <div className="bg-gradient-to-br from-blue-50/50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-850 border border-blue-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-soft hover:border-blue-300 dark:hover:border-slate-700 transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="size-14 rounded-2xl bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 flex items-center justify-center border border-blue-200 dark:border-blue-900/60">
                  <Trophy size={28} aria-hidden="true" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 text-xs font-black">
                  Format ETS 2024
                </span>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
                  Đấu Trường Thi Thử TOEIC 200 Câu
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  Trải nghiệm áp lực làm bài 120 phút với đồng hồ đếm ngược đồng bộ server.
                  Báo cáo phân tích điểm mạnh - điểm yếu từng Part 1 đến Part 7 tự động.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 space-y-1.5 text-xs font-bold">
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span>Listening Part 1-4</span>
                  <span className="text-blue-700 dark:text-blue-400">100 câu • 45 phút</span>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span>Reading Part 5-7</span>
                  <span className="text-blue-700 dark:text-blue-400">100 câu • 75 phút</span>
                </div>
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">200+ đề thi có giải</span>
              <button
                onClick={() => handleProtectedAction("phòng thi TOEIC", "/practice/quizzes")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs transition-colors shadow-2xs cursor-pointer"
                type="button"
              >
                <span>Làm đề ETS</span>
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Card 3: Spaced Repetition Flashcards & Grammar (1 Col) */}
          <div className="bg-gradient-to-br from-emerald-50/50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-850 border border-emerald-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-soft hover:border-emerald-300 dark:hover:border-slate-700 transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="size-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center border border-emerald-200 dark:border-emerald-900/60">
                  <BookOpen size={28} aria-hidden="true" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 text-xs font-black">
                  Thuật toán SRS Leitner
                </span>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
                  Ghi Nhớ Siêu Tốc &amp; 24 Chuyên Đề Ngữ Pháp
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  Luyện từ vựng theo chu kỳ ngắt quãng thông minh: từ nào hay quên sẽ tự động lặp lại nhiều hơn.
                  Bản đồ tư duy 24 chủ điểm ngữ pháp cốt lõi bám sát kỳ thi.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 space-y-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <p className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>3.000+ từ vựng học thuật &amp; công sở</span>
                </p>
                <p className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Sơ đồ tư duy ngữ pháp tương tác</span>
                </p>
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Đã thuộc &amp; Yêu thích</span>
              <button
                onClick={() => handleProtectedAction("kho từ vựng flashcard", "/flashcard")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-colors shadow-2xs cursor-pointer"
                type="button"
              >
                <span>Học từ vựng</span>
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Card 4: Gamification & Pet Companion (Spans 2 cols) */}
          <div className="md:col-span-2 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-850 border border-amber-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-soft hover:border-amber-300 dark:hover:border-slate-700 transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="size-14 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 flex items-center justify-center border border-amber-200 dark:border-amber-900/60 text-2xl font-black">
                  <span>🍞</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 text-xs font-black">
                  Học Mà Chơi • Chơi Mà Tiến Bộ
                </span>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                  Hệ Thống Gamification &amp; Thú Cưng Học Tập (Pet Companion)
                </h3>
                <p className="text-sm sm:text-base font-semibold text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  Nuôi thú cưng học tập ảo: mỗi bài luyện Nghe, Nói, Flashcard bạn hoàn thành sẽ là một phần ăn
                  giúp Pet tăng cấp và mở khóa diện mạo mới. Thu thập điểm Bánh Mì đổi quà và thi đua trên Bảng xếp hạng tuần.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-amber-200/70 dark:border-slate-700 shadow-2xs">
                  <span className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Flame size={16} className="text-orange-600 dark:text-orange-400 fill-orange-500" />
                    Chuỗi Streak rực lửa
                  </span>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Duy trì thói quen học tập không ngắt quãng</p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-amber-200/70 dark:border-slate-700 shadow-2xs">
                  <span className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Award size={16} className="text-amber-600 dark:text-amber-400" />
                    Đấu trường 1v1 Arena
                  </span>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">So tài từ vựng và ngữ pháp nhanh cùng bạn bè</p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-amber-200/70 dark:border-slate-700 shadow-2xs">
                  <span className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Gift size={16} className="text-amber-600 dark:text-amber-400" />
                    Cửa Hàng Đổi Quà
                  </span>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Dùng Bánh Mì đổi avatar, freeze streak và voucher</p>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Tặng ngay 50 Bánh Mì cho tân thủ</span>
              <button
                onClick={() => handleProtectedAction("đấu trường và cửa hàng", "/arena")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs transition-colors shadow-2xs cursor-pointer"
                type="button"
              >
                <span>Khám phá đấu trường</span>
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. INTERACTIVE TEST-DRIVE WIDGET (Dự Đoán Lộ Trình & Điểm Số TOEIC)       */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20">
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-3xl p-6 sm:p-10 text-white shadow-card relative overflow-hidden">
          {/* Decorative Pattern Background */}
          <div
            className="pointer-events-none absolute -right-20 -bottom-20 size-80 rounded-full bg-white/10 blur-2xl"
            aria-hidden="true"
          />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Column: Selector Form (6 Cols) */}
            <div className="lg:col-span-6 space-y-6">
              <div className="flex flex-col items-start gap-3 sm:gap-4">
                <span className="inline-flex items-center text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-white/20 border border-white/30 text-amber-100">
                  Công Cụ Tương Tác Miễn Phí
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white leading-snug sm:leading-[1.36] text-balance">
                  Ước Tính Lộ Trình &amp; Điểm Số TOEIC Của Bạn
                </h2>
                <p className="text-amber-100 text-sm sm:text-base font-semibold leading-relaxed text-pretty">
                  Chọn trình độ xuất phát và band điểm mục tiêu để hệ thống tính toán thời gian và khối lượng học tập tối ưu nhất.
                </p>
              </div>

              {/* Step 1: Current Level */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wide text-amber-200">
                  1. Trình độ hiện tại của bạn:
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { id: "BEGINNER", label: "Mất gốc / 350" },
                    { id: "INTERMEDIATE", label: "Trung bình 500" },
                    { id: "ADVANCED", label: "Khá 700+" },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      onClick={() => setCalcLevel(lvl.id as "BEGINNER" | "INTERMEDIATE" | "ADVANCED")}
                      className={`p-3 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer text-center ${
                        calcLevel === lvl.id
                          ? "bg-white dark:bg-amber-400 text-amber-900 dark:text-amber-950 shadow-md scale-[1.02]"
                          : "bg-white/15 text-white hover:bg-white/25 border border-white/20"
                      }`}
                      type="button"
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Target Score */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wide text-amber-200">
                  2. Mục tiêu TOEIC mong muốn:
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { val: 600, label: "600+ (Tốt nghiệp)" },
                    { val: 750, label: "750+ (Đi làm)" },
                    { val: 850, label: "850+ (Master)" },
                  ].map((sc) => (
                    <button
                      key={sc.val}
                      onClick={() => setCalcTarget(sc.val as 600 | 750 | 850)}
                      className={`p-3 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer text-center ${
                        calcTarget === sc.val
                          ? "bg-white dark:bg-amber-400 text-amber-900 dark:text-amber-950 shadow-md scale-[1.02]"
                          : "bg-white/15 text-white hover:bg-white/25 border border-white/20"
                      }`}
                      type="button"
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Calculated Dynamic Result Card (6 Cols) */}
            <div className="lg:col-span-6">
              <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5 border-2 border-amber-200 dark:border-slate-800">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Route className="text-amber-600 dark:text-amber-400 size-5" />
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Lộ Trình Đề Xuất Cá Nhân Hóa</h3>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                    Tỷ lệ đạt 96.2%
                  </span>
                </div>

                {/* Calculation Outputs Grid */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-slate-800/60 border border-amber-200/80 dark:border-slate-700">
                    <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Thời gian dự kiến</span>
                    <strong className="text-2xl font-black text-amber-800 dark:text-amber-300 tracking-tight">
                      {calcResult.weeks} tuần
                    </strong>
                    <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                      ~ {calcResult.dailyMins} phút luyện tập / ngày
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-slate-800/60 border border-amber-200/80 dark:border-slate-700">
                    <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Bộ đề thực chiến</span>
                    <strong className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight block">
                      {calcResult.examSet}
                    </strong>
                    <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                      200 câu chuẩn ETS bấm giờ
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700">
                  <p className="flex items-center gap-2">
                    <Headphones size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Trọng tâm Nghe: <strong>{calcResult.listeningP}</strong></span>
                  </p>
                  <p className="flex items-center gap-2">
                    <BookOpen size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Trọng tâm Đọc: <strong>{calcResult.readingP}</strong></span>
                  </p>
                </div>

                <motion.button
                  onClick={() => {
                    if (user) {
                      router.push("/dashboard");
                    } else {
                      openDirectRegister("lộ trình cá nhân hóa", "/dashboard");
                    }
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-sm sm:text-base py-3.5 rounded-2xl shadow-[0_6px_0_0_#c2410c] active:translate-y-[6px] active:shadow-none transition-all cursor-pointer"
                  type="button"
                >
                  <span>Bắt đầu theo lộ trình này miễn phí</span>
                  <ArrowRight size={18} aria-hidden="true" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. THE 4-STEP LEARNING JOURNEY (Lộ Trình Vàng)                           */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 space-y-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto gap-3.5 sm:gap-4.5">
          <span className="inline-flex items-center text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/50 px-3.5 py-1.5 rounded-full border border-amber-200 dark:border-amber-900/60">
            Hành Trình Chinh Phục
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-slate-100 leading-snug sm:leading-[1.36] text-balance">
            4 Bước Đơn Giản Để Bứt Phá Năng Lực Tiếng Anh
          </h2>
          <p className="text-sm sm:text-base font-semibold text-slate-600 dark:text-slate-300 leading-relaxed text-pretty max-w-2xl">
            Từng bước đi rõ ràng, có đo lường cụ thể, không lo học lan man mất định hướng.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {ROADMAP_STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-soft relative group hover:border-amber-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl sm:text-3xl font-black text-amber-600/30 dark:text-amber-500/30 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {step.step}
                    </span>
                    <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                      {step.badge}
                    </span>
                  </div>

                  <div className="size-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center">
                    <Icon size={22} aria-hidden="true" />
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 leading-snug">{step.title}</h3>
                  <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. CURRICULUM & SKILL EXPLORER (Xem Trước Giáo Trình)                     */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col items-start gap-2.5 sm:gap-3.5">
            <span className="inline-flex items-center text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/50 px-3.5 py-1.5 rounded-full border border-amber-200 dark:border-amber-900/60">
              Giáo Trình Thực Chiến
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-slate-100 leading-snug sm:leading-[1.36] text-balance">
              Khám phá các lộ trình học tiêu biểu
            </h2>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed text-pretty">
              Được thiết kế bài bản theo từng mục tiêu: thi chứng chỉ, giao tiếp công sở hoặc củng cố gốc tiếng Anh.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            {[
              { id: "all", label: "Tất cả" },
              { id: "toeic", label: "Luyện thi TOEIC" },
              { id: "comm", label: "Giao tiếp công sở" },
              { id: "vocab", label: "Từ vựng & Ngữ pháp" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCourseTab(tab.id as "all" | "toeic" | "comm" | "vocab")}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
                  activeCourseTab === tab.id
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200 dark:border-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Course Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-soft hover:border-amber-300 dark:hover:border-slate-700 transition-colors group"
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                    {course.highlight}
                  </span>
                  <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">{course.level}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                  {course.title}
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">{course.desc}</p>
                <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 pt-1">
                  <span>{course.lessonsCount}</span>
                  <span>•</span>
                  <span>{course.duration}</span>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Link
                  href="/courses"
                  className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors"
                >
                  Xem chi tiết giáo trình
                </Link>
                <button
                  onClick={() => handleProtectedAction(course.title, course.link)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs transition-colors shadow-2xs cursor-pointer"
                  type="button"
                >
                  <span>Bắt đầu học</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. REAL LEARNER TRANSFORMATIONS (Đánh Giá Học Viên)                       */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 space-y-8">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto gap-3.5 sm:gap-4.5">
          <span className="inline-flex items-center text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/50 px-3.5 py-1.5 rounded-full border border-amber-200 dark:border-amber-900/60">
            Câu Chuyện Thành Công
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-slate-100 leading-snug sm:leading-[1.36] text-balance">
            Học viên nói gì về trải nghiệm cùng BreadTrans?
          </h2>
          <p className="text-sm sm:text-base font-semibold text-slate-600 dark:text-slate-300 leading-relaxed text-pretty max-w-2xl">
            Hơn 10.000 học viên đã vượt qua nỗi sợ tiếng Anh và đạt được chứng chỉ mong muốn.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((item, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-soft space-y-5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-1" aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={15} className="fill-amber-500 text-amber-500" />
                    ))}
                  </div>
                  <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                    {item.tag}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 leading-relaxed italic">
                  &ldquo;{item.quote}&rdquo;
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="size-11 rounded-full bg-amber-600 text-white font-black flex items-center justify-center text-sm shrink-0 overflow-hidden">
                  {item.avatar ? (
                    <img src={item.avatar} alt={item.name} className="size-full object-cover" />
                  ) : (
                    item.name.charAt(0)
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">{item.name}</h3>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{item.role}</p>
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">{item.timeframe}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. WHY BREADTRANS? (Bảng So Sánh Toàn Diện)                               */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 space-y-8">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto gap-3.5 sm:gap-4.5">
          <span className="inline-flex items-center text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/50 px-3.5 py-1.5 rounded-full border border-amber-200 dark:border-amber-900/60">
            Sự Khác Biệt
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-slate-100 leading-snug sm:leading-[1.36] text-balance">
            Tại sao BreadTrans là lựa chọn thông minh hơn?
          </h2>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed text-pretty max-w-2xl">
            Bảng đối chiếu minh bạch giữa học truyền thống, tự học và giải pháp toàn diện tại BreadTrans.
          </p>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80 text-xs uppercase tracking-wider font-black text-slate-600 dark:text-slate-300">
                <th className="p-4 sm:p-5">Tiêu chí so sánh</th>
                <th className="p-4 sm:p-5 text-slate-500 dark:text-slate-400">Trung tâm truyền thống</th>
                <th className="p-4 sm:p-5 text-slate-500 dark:text-slate-400">Tự học tự phát</th>
                <th className="p-4 sm:p-5 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 font-black border-l border-amber-200 dark:border-amber-900/50">
                  Nền tảng BreadTrans
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
              {COMPARISON_ROWS.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-4 sm:p-5 font-black text-slate-900 dark:text-slate-100">{row.feature}</td>
                  <td className="p-4 sm:p-5 text-slate-500 dark:text-slate-400">{row.traditional}</td>
                  <td className="p-4 sm:p-5 text-slate-500 dark:text-slate-400">{row.selfStudy}</td>
                  <td className="p-4 sm:p-5 bg-amber-50/40 dark:bg-amber-950/20 font-extrabold text-amber-900 dark:text-amber-300 border-l border-amber-200 dark:border-amber-900/50">
                    <div className="flex items-center gap-2">
                      <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[3]" />
                      <span>{row.breadtrans}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="sm:hidden text-xs font-semibold text-slate-400 dark:text-slate-500 text-center">
          ← Vuốt ngang để xem toàn bộ bảng so sánh →
        </p>
      </section>

      {/* ========================================================================= */}
      {/* 9. FAQ ACCORDION (Giải Đáp Thắc Mắc)                                      */}
      {/* ========================================================================= */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 space-y-8">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto gap-3.5 sm:gap-4.5">
          <span className="inline-flex items-center text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/50 px-3.5 py-1.5 rounded-full border border-amber-200 dark:border-amber-900/60">
            Hỗ Trợ &amp; Giải Đáp
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 leading-snug sm:leading-[1.36] text-balance">
            Câu hỏi thường gặp trước khi bắt đầu
          </h2>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed text-pretty max-w-2xl">
            Mọi điều bạn cần biết về phương pháp học và chính sách tại BreadTrans.
          </p>
        </div>

        <div className="space-y-3.5">
          {FAQ_LIST.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden transition-colors shadow-2xs"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between p-5 text-left font-black text-slate-900 dark:text-slate-100 text-sm sm:text-base hover:text-amber-700 dark:hover:text-amber-400 transition-colors cursor-pointer"
                  type="button"
                  aria-expanded={isOpen}
                >
                  <span className="pr-4">{faq.q}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 transition-transform duration-200 text-slate-400 dark:text-slate-500 ${
                      isOpen ? "rotate-180 text-amber-600 dark:text-amber-400" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-0 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 mt-1">
                    <p className="pt-3">{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. HIGH-CONVERTING BOTTOM CTA BANNER                                     */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-3xl p-8 sm:p-12 text-center text-white shadow-card space-y-6 relative overflow-hidden">
          <div
            className="pointer-events-none absolute -left-10 -top-10 size-60 rounded-full bg-white/10 blur-2xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -right-10 -bottom-10 size-60 rounded-full bg-white/10 blur-2xl"
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center text-center gap-3.5 sm:gap-4.5">
            <span className="inline-flex items-center text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-white/20 border border-white/30 text-amber-100">
              Khởi Đầu Vững Chắc Cùng BreadTrans
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white leading-snug sm:leading-[1.36] text-balance">
              Sẵn sàng bứt phá trình độ Tiếng Anh của bạn ngay hôm nay?
            </h2>
            <p className="text-amber-100 text-sm sm:text-base font-semibold max-w-2xl mx-auto leading-relaxed text-pretty">
              Đăng ký tài khoản miễn phí trong 30 giây, nhận ngay 50 Bánh Mì tân thủ và bắt đầu
              bài kiểm tra chẩn đoán năng lực 5 phút để nhận lộ trình cá nhân hóa.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-300 font-black text-base hover:bg-amber-50 dark:hover:bg-slate-800 shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  <span>Vào bàn học tập của bạn</span>
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              ) : (
                <button
                  onClick={() => openDirectRegister("tài khoản học viên", "/dashboard")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-300 font-black text-base hover:bg-amber-50 dark:hover:bg-slate-800 shadow-lg active:scale-95 transition-all cursor-pointer"
                  type="button"
                >
                  <span>Đăng ký học miễn phí ngay</span>
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              )}

              <Link
                href="/courses"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/30 text-white font-extrabold text-base transition-colors cursor-pointer"
              >
                <span>Xem danh mục khóa học</span>
              </Link>
            </div>

            <p className="text-xs font-bold text-amber-200/90 pt-2">
              Không mất phí khởi tạo • Không ràng buộc • Bảo mật thông tin 100%
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 11. AUTH MODALS INTEGRATION                                               */}
      {/* ========================================================================= */}
      <AuthGateModal
        isOpen={authGateOpen}
        onClose={() => setAuthGateOpen(false)}
        targetLabel={targetLabel}
        targetRoute={targetRoute}
        onOpenLogin={() => {
          setAuthGateOpen(false);
          setQuickLoginOpen(true);
        }}
        onOpenRegister={() => {
          setAuthGateOpen(false);
          setQuickRegisterOpen(true);
        }}
      />

      <QuickLoginModal
        isOpen={quickLoginOpen}
        onClose={() => setQuickLoginOpen(false)}
        targetLabel={targetLabel}
        targetRoute={targetRoute}
        onSwitchToRegister={() => {
          setQuickLoginOpen(false);
          setQuickRegisterOpen(true);
        }}
      />

      <QuickRegisterModal
        isOpen={quickRegisterOpen}
        onClose={() => setQuickRegisterOpen(false)}
        targetLabel={targetLabel}
        targetRoute={targetRoute}
        onSwitchToLogin={() => {
          setQuickRegisterOpen(false);
          setQuickLoginOpen(true);
        }}
      />
    </div>
  );
}
