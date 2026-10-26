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
  Milestone,
  Gift,
  Mic,
  Trophy,
  Flame,
  Volume2,
  Play,
  Award,
  Zap,
  Target,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { QuickLoginModal } from "@/components/auth/QuickLoginModal";
import { QuickRegisterModal } from "@/components/auth/QuickRegisterModal";
import { motion } from "framer-motion";

// --- DATA CONSTANTS ---

// Every statement here must match what the product actually does. No learner
// counts, success rates, testimonials or exam-board claims: BreadTrans writes
// its own practice material and its results are internal practice indicators.
const ROADMAP_STEPS = [
  {
    step: "01",
    title: "Làm bài kiểm tra đầu vào",
    desc: "Trả lời bộ câu hỏi đầu vào để thấy kỹ năng nào đang mạnh, kỹ năng nào cần luyện thêm. Kết quả là ước lượng nội bộ để gợi ý bài luyện, không phải chứng chỉ hay cấp độ CEFR.",
    badge: "Miễn phí",
    icon: Target,
  },
  {
    step: "02",
    title: "Nhận gợi ý bài luyện",
    desc: "Từ những câu bạn làm sai, hệ thống gợi ý bài luyện cho kỹ năng còn yếu. Bạn vẫn có thể chọn bất kỳ bài nào trong thư viện.",
    badge: "Theo kết quả của bạn",
    icon: Milestone,
  },
  {
    step: "03",
    title: "Luyện Nghe, Nói, Đọc, Viết",
    desc: "Bài Nghe và Đọc được chấm ngay sau khi nộp. Bài Nói được chấm phát âm từng từ, bài Viết nhận nhận xét tự động theo tiêu chí.",
    badge: "Phản hồi tự động",
    icon: Zap,
  },
  {
    step: "04",
    title: "Luyện đề theo cấu trúc TOEIC",
    desc: "Làm đề Nghe & Đọc 200 câu trong 120 phút có đồng hồ, rồi xem lại đáp án và giải thích. Đề do BreadTrans biên soạn; điểm là chỉ số luyện tập, không phải điểm thi chính thức.",
    badge: "Có giới hạn thời gian",
    icon: Trophy,
  },
];

const FAQ_LIST = [
  {
    q: "BreadTrans có miễn phí để bắt đầu không?",
    a: "Có. Bạn đăng ký bằng email, không cần thẻ ngân hàng, rồi làm bài kiểm tra đầu vào và các bài luyện được đánh dấu miễn phí. Một số bài và khóa học cần gói PLUS hoặc PRO; các bài đó hiển thị nhãn khóa rõ ràng.",
  },
  {
    q: "Bài Nói được chấm như thế nào?",
    a: "Bạn đọc theo câu mẫu và ghi âm. Hệ thống nhận dạng giọng nói rồi chấm độ chính xác của từng từ cùng độ trôi chảy, đánh dấu những từ nên luyện lại. Trước khi ghi âm, bạn có thể nghe câu mẫu ở tốc độ 0.75×, 0.9× hoặc 1×.",
  },
  {
    q: "Đề luyện TOEIC trên BreadTrans có phải đề thi thật không?",
    a: "Không. Đề do BreadTrans tự biên soạn theo cấu trúc bài thi TOEIC Nghe & Đọc (Part 1 đến Part 7, 200 câu, 120 phút). BreadTrans không liên kết với ETS và không cấp chứng chỉ; điểm hiển thị chỉ dùng để theo dõi tiến bộ khi luyện tập.",
  },
  {
    q: "Bánh Mì dùng để làm gì?",
    a: "Bánh Mì là điểm thưởng nhận được khi hoàn thành bài luyện và nhiệm vụ; lần đầu hoàn thành bài kiểm tra đầu vào được thưởng 50 Bánh Mì (tính trong giới hạn thưởng mỗi ngày). Bạn dùng Bánh Mì để cho thú cưng ăn hoặc đổi vật phẩm trong Cửa hàng, ví dụ khung avatar, vé bảo vệ chuỗi học và một số quà tặng.",
  },
  {
    q: "Tôi có học được trên điện thoại không?",
    a: "Có. BreadTrans chạy trên trình duyệt, giao diện co giãn theo màn hình điện thoại, máy tính bảng và máy tính. Hiện chưa có ứng dụng cài đặt riêng.",
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
                <span>Nền tảng Tự học Tiếng Anh theo Kỹ năng, Lộ trình &amp; Mục tiêu Chứng chỉ</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-black text-slate-900 dark:text-slate-100 leading-[1.24] sm:leading-[1.18] text-balance">
                Tự học Tiếng Anh theo lộ trình, chinh phục từng mục tiêu cùng{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 dark:from-amber-400 dark:via-orange-400 dark:to-amber-500">
                  Gia sư AI thông minh
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg font-semibold leading-relaxed max-w-2xl">
                Rèn luyện từng kỹ năng Nghe - Nói - Đọc - Viết theo cấp độ và chủ đề, học theo khóa học có lộ trình,
                luyện đề theo các format chứng chỉ đang hỗ trợ (trong đó có TOEIC) và duy trì cảm hứng cùng AI, Gamification.
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
                  <span>Làm bài kiểm tra đầu vào</span>
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
                      Ví dụ minh họa
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

                  </div>

                  {/* Phoneme Breakdown Chips */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Kết quả chấm từng từ (minh họa):
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
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-amber-50/50 dark:bg-slate-800/60 border border-amber-200/60 dark:border-slate-700/60">
                      <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Phát âm</span>
                      <strong className="text-base font-black text-emerald-700 dark:text-emerald-400">98%</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-50/50 dark:bg-slate-800/60 border border-amber-200/60 dark:border-slate-700/60">
                      <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Trôi chảy</span>
                      <strong className="text-base font-black text-amber-700 dark:text-amber-400">95 / 100</strong>
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
            Tính năng chính
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-slate-100 leading-snug sm:leading-[1.36] text-balance">
            Mọi công cụ bạn cần để làm chủ tiếng Anh &amp; mục tiêu chứng chỉ
          </h2>
          <p className="text-sm sm:text-base font-semibold text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl text-pretty">
            Luyện từng kỹ năng với phản hồi tự động, học theo khóa học, luyện đề theo cấu trúc TOEIC,
            và giữ thói quen học bằng Bánh Mì, thú cưng và bảng xếp hạng.
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
                  Đánh giá phát âm tự động
                </span>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                  Luyện Nói &amp; Chấm Phát Âm Từng Từ
                </h3>
                <p className="text-sm sm:text-base font-semibold text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  Đọc theo câu mẫu và ghi âm. Hệ thống chấm độ chính xác của từng từ và độ trôi chảy,
                  đánh dấu những từ nên luyện lại, và lưu lại các lần nói để bạn so sánh.
                </p>
              </div>

              {/* Visual Feature Pill list */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                  <span className="text-xs font-extrabold text-violet-800 dark:text-violet-300 block">Chấm từng từ</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Điểm chính xác cho mỗi từ trong câu</span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                  <span className="text-xs font-extrabold text-violet-800 dark:text-violet-300 block">Lưu lịch sử</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Xem lại các lần nói trước của bạn</span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                  <span className="text-xs font-extrabold text-violet-800 dark:text-violet-300 block">Nghe mẫu</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tốc độ 0.75×, 0.9×, 1×, giọng US hoặc UK</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Bài luyện theo chủ đề và cấp độ</span>
              <button
                onClick={() => handleProtectedAction("phòng luyện nói", "/speaking")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs transition-colors shadow-2xs cursor-pointer"
                type="button"
              >
                <span>Thử luyện nói ngay</span>
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Card 2: Certificate-format exam arena (1 Col) */}
          <div className="bg-gradient-to-br from-blue-50/50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-850 border border-blue-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-soft hover:border-blue-300 dark:hover:border-slate-700 transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="size-14 rounded-2xl bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 flex items-center justify-center border border-blue-200 dark:border-blue-900/60">
                  <Trophy size={28} aria-hidden="true" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 text-xs font-black">
                  TOEIC Nghe &amp; Đọc
                </span>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
                  Luyện Đề Theo Cấu Trúc TOEIC
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  Đề 200 câu làm trong 120 phút, đồng hồ do máy chủ tính. Sau khi nộp, xem lại từng câu kèm
                  đáp án và giải thích. Đề do BreadTrans biên soạn, không phải đề thi chính thức.
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
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Có giải thích từng câu</span>
              <button
                onClick={() => handleProtectedAction("phòng thi theo format chứng chỉ", "/exams")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs transition-colors shadow-2xs cursor-pointer"
                type="button"
              >
                <span>Luyện đề TOEIC</span>
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
                  Ôn tập theo lịch
                </span>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
                  Flashcard Từ Vựng &amp; Chuyên Đề Ngữ Pháp
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  Học từ vựng theo chủ đề bằng thẻ lật; từ chưa thuộc được đưa lại để ôn sau những khoảng
                  thời gian tăng dần. Luyện ngữ pháp theo chuyên đề với câu hỏi được chấm và giải thích.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 space-y-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <p className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Từ vựng theo chủ đề, có phát âm và ví dụ</span>
                </p>
                <p className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Bài tập ngữ pháp có giải thích</span>
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
                  <Gift size={28} strokeWidth={1.75} aria-hidden="true" />
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
                  Hoàn thành bài luyện để nhận Bánh Mì, dùng Bánh Mì cho thú cưng ăn để thú cưng lên cấp,
                  hoặc đổi vật phẩm trong Cửa hàng. Điểm tích lũy được xếp hạng theo tuần.
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
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Dùng Bánh Mì đổi khung avatar, vé bảo vệ chuỗi học và quà tặng</p>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Bảng xếp hạng cập nhật theo tuần</span>
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
      {/* 5. THE 4-STEP LEARNING JOURNEY (Lộ Trình Vàng)                           */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 space-y-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto gap-3.5 sm:gap-4.5">
          <span className="inline-flex items-center text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/50 px-3.5 py-1.5 rounded-full border border-amber-200 dark:border-amber-900/60">
            Hành Trình Chinh Phục
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-slate-100 leading-snug sm:leading-[1.36] text-balance">
            Bắt đầu với BreadTrans trong 4 bước
          </h2>
          <p className="text-sm sm:text-base font-semibold text-slate-600 dark:text-slate-300 leading-relaxed text-pretty max-w-2xl">
            Bắt đầu từ bài kiểm tra đầu vào, rồi luyện theo kỹ năng bạn cần nhất.
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
              Bắt đầu luyện tiếng Anh với BreadTrans
            </h2>
            <p className="text-amber-100 text-sm sm:text-base font-semibold max-w-2xl mx-auto leading-relaxed text-pretty">
              Đăng ký tài khoản miễn phí, làm bài kiểm tra đầu vào và nhận gợi ý bài luyện
              cho những kỹ năng bạn cần cải thiện.
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
              Đăng ký miễn phí • Không cần thẻ ngân hàng
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
