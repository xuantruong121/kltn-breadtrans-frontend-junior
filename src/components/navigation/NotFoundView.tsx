"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  Home,
  ArrowLeft,
  Compass,
  Search,
  BookOpen,
  Headphones,
  Layers,
  Trophy,
  ArrowRight,
  MapPinOff,
} from "lucide-react";
import { AppHeader } from "@/components/navigation/AppHeader";
import { AppFooter } from "@/components/navigation/AppFooter";
import { BackToTop } from "@/components/navigation/BackToTop";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";

interface RecoveryDestination {
  title: string;
  badge: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

const RECOVERY_DESTINATIONS: RecoveryDestination[] = [
  {
    title: "Luyện đề thi TOEIC",
    badge: "Kho đề chuẩn ETS",
    description: "Hàng chục bộ đề có bấm giờ, đáp án chi tiết và phân tích năng lực.",
    href: "/exams",
    icon: BookOpen,
    iconBg: "bg-blue-50 dark:bg-blue-950/50",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    title: "Luyện 4 kỹ năng",
    badge: "Nghe - Nói - Đọc - Viết",
    description: "Luyện nghe chép chính tả, luyện phát âm chuẩn, đọc hiểu và viết câu.",
    href: "/listening",
    icon: Headphones,
    iconBg: "bg-amber-50 dark:bg-amber-950/50",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    title: "Flashcard từ vựng",
    badge: "Thuật toán Spaced Repetition",
    description: "Ôn tập ngắt quãng thông minh giúp khắc sâu từ mới vào trí nhớ dài hạn.",
    href: "/flashcard",
    icon: Layers,
    iconBg: "bg-emerald-50 dark:bg-emerald-950/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    title: "Đấu trường xếp hạng",
    badge: "Thử thách kiến thức",
    description: "So tài từ vựng tốc độ cao với các học viên khác và nhận bánh rán.",
    href: "/arena",
    icon: Trophy,
    iconBg: "bg-orange-50 dark:bg-orange-950/50",
    iconColor: "text-orange-600 dark:text-orange-400",
  },
];

const SUGGESTED_QUICK_CHIPS = [
  { label: "Luyện đề TOEIC", href: "/exams" },
  { label: "Luyện nghe hiểu", href: "/listening" },
  { label: "Luyện phát âm", href: "/speaking" },
  { label: "Flashcard từ vựng", href: "/flashcard" },
  { label: "Đấu trường", href: "/arena" },
];

export function NotFoundView() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const shouldReduceMotion = useReducedMotion();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    if (query.includes("toeic") || query.includes("đề") || query.includes("exam")) {
      router.push("/exams");
    } else if (query.includes("nghe") || query.includes("listen")) {
      router.push("/listening");
    } else if (
      query.includes("nói") ||
      query.includes("phát âm") ||
      query.includes("speak")
    ) {
      router.push("/speaking");
    } else if (query.includes("đọc") || query.includes("read")) {
      router.push("/reading");
    } else if (query.includes("viết") || query.includes("write")) {
      router.push("/writing");
    } else if (
      query.includes("từ") ||
      query.includes("vựng") ||
      query.includes("flashcard") ||
      query.includes("vocab")
    ) {
      router.push("/flashcard");
    } else if (
      query.includes("đấu trường") ||
      query.includes("bảng xếp hạng") ||
      query.includes("arena")
    ) {
      router.push("/arena");
    } else if (query.includes("khóa học") || query.includes("course")) {
      router.push("/courses");
    } else {
      router.push(`/exams?q=${encodeURIComponent(query)}`);
    }
  };

  const floatAnimation = shouldReduceMotion
    ? {}
    : {
        y: [0, -8, 0],
        transition: {
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut" as const,
        },
      };

  const shadowAnimation = shouldReduceMotion
    ? {}
    : {
        scale: [1, 0.88, 1],
        opacity: [0.35, 0.2, 0.35],
        transition: {
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut" as const,
        },
      };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-amber-600 selection:text-white transition-colors duration-150 font-['Quicksand',sans-serif]">
      <AppHeader />

      <main className="flex-1 w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col justify-center pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-12">
        {/* Top Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Messaging & Action */}
          <div className="lg:col-span-7 flex flex-col items-start space-y-5">
            {/* 1. Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs sm:text-sm font-bold tracking-wide uppercase">
              <Compass className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Mã lỗi 404 • Trang không tìm thấy</span>
            </div>

            {/* 2. Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              Ổ bánh mì này đã{" "}
              <span className="text-amber-600 dark:text-amber-500 underline decoration-amber-400/60 dark:decoration-amber-500/50 decoration-wavy decoration-2 underline-offset-4">
                bay đi mất
              </span>{" "}
              rồi!
            </h1>

            {/* 3. Subtext (Exactly 19 words, <= 20 words) */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
              Đường dẫn truy cập có thể đã đổi hoặc không tồn tại. Hãy để BreadTrans đồng hành cùng bạn!
            </p>

            {/* 4. Primary & Secondary CTAs */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto pt-1">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md shadow-amber-600/20 active:scale-[0.98] transition-all"
              >
                <Home className="w-4 h-4" />
                <span>Về trang chủ</span>
              </Link>

              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm border border-slate-200 dark:border-slate-700 active:scale-[0.98] transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại</span>
              </button>
            </div>

            {/* Quick Search & Topic Navigation */}
            <div className="w-full max-w-xl pt-3">
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <label htmlFor="not-found-search-input" className="sr-only">
                  Tìm kiếm trên BreadTrans
                </label>
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  id="not-found-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm kỹ năng, đề thi hoặc từ vựng..."
                  className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all shadow-xs"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Tìm ngay
                </button>
              </form>

              {/* Quick Jump Tags */}
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mr-1">
                  Gợi ý:
                </span>
                {SUGGESTED_QUICK_CHIPS.map((chip) => (
                  <Link
                    key={chip.href}
                    href={chip.href}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 dark:bg-slate-800/80 dark:hover:bg-amber-950/60 dark:text-slate-300 dark:hover:text-amber-300 border border-slate-200/60 dark:border-slate-700/60 transition-colors"
                  >
                    {chip.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Custom BreadTrans 404 Visual */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-sm sm:max-w-md p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-amber-50/70 via-white to-amber-100/40 dark:from-slate-900/90 dark:via-slate-900/60 dark:to-slate-950 border border-amber-200/70 dark:border-slate-800 shadow-sm flex flex-col items-center">
              {/* Soft Ambient Warm Backdrop */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-400/15 dark:bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Floating Bread Motif Illustration */}
              <motion.div
                animate={floatAnimation}
                className="relative z-10 flex items-center justify-center gap-2 sm:gap-3 py-4"
              >
                {/* Digit "4" */}
                <span className="font-black text-6xl sm:text-7xl md:text-8xl text-amber-600 dark:text-amber-500 tracking-tighter select-none">
                  4
                </span>

                {/* Loaf of Bread as the "0" */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 flex items-center justify-center shrink-0">
                  <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full drop-shadow-md"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="bt-bread-crust" x1="10%" y1="0%" x2="90%" y2="100%">
                        <stop offset="0%" stopColor="#F59E0B" />
                        <stop offset="45%" stopColor="#EA580C" />
                        <stop offset="100%" stopColor="#C2410C" />
                      </linearGradient>
                      <linearGradient id="bt-bread-slash" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#FEF3C7" />
                        <stop offset="100%" stopColor="#FDE68A" />
                      </linearGradient>
                    </defs>

                    {/* Artisan Bread Loaf Contour */}
                    <path
                      d="M18 50C18 32 32 18 50 18C68 18 82 32 82 50C82 68 68 82 50 82C32 82 18 68 18 50Z"
                      fill="url(#bt-bread-crust)"
                    />

                    {/* Crust Slash Cuts */}
                    <path
                      d="M34 38C38 46 40 56 36 64"
                      stroke="url(#bt-bread-slash)"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M50 34C54 44 55 58 50 68"
                      stroke="url(#bt-bread-slash)"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M66 38C70 46 72 56 68 64"
                      stroke="url(#bt-bread-slash)"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                    />

                    {/* Warm Crust Highlight */}
                    <path
                      d="M26 44C34 28 66 28 74 44"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      strokeOpacity="0.4"
                      strokeLinecap="round"
                    />
                  </svg>

                  {/* Tiny Compass Pin on Loaf */}
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs border border-white dark:border-slate-900">
                    <Compass className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Digit "4" */}
                <span className="font-black text-6xl sm:text-7xl md:text-8xl text-amber-600 dark:text-amber-500 tracking-tighter select-none">
                  4
                </span>
              </motion.div>

              {/* Loaf Shadow */}
              <motion.div
                animate={shadowAnimation}
                className="w-36 sm:w-44 h-4 bg-amber-950/20 dark:bg-black/40 rounded-full blur-xs mt-1"
              />

              {/* Status Badge */}
              <div className="mt-6 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-2xs">
                <MapPinOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Trang không nằm trên bản đồ học tập</span>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom Section: Recovery Destinations */}
        <section className="mt-12 sm:mt-16 pt-8 border-t border-slate-200 dark:border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Các điểm đến phổ biến
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Chọn một khu vực học tập để tiếp tục hành trình nâng cao phản xạ tiếng Anh của bạn.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {RECOVERY_DESTINATIONS.map((destination) => {
              const Icon = destination.icon;
              return (
                <Link
                  key={destination.href}
                  href={destination.href}
                  className="group relative p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 hover:border-amber-400 dark:hover:border-amber-500/50 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${destination.iconBg} ${destination.iconColor}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {destination.badge}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {destination.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {destination.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
                    <span>Khám phá ngay</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <AppFooter />
      <BackToTop />
      <MobileBottomNav />
    </div>
  );
}
