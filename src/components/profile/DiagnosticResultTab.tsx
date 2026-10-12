"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  GraduationCap,
  Headphones,
  HelpCircle,
  Loader2,
  Mic,
  PenTool,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  diagnosticService,
  DiagnosticPracticeRecommendation,
  DiagnosticResult,
} from "@/lib/api/services/diagnostic.service";
import { formatPlacementLevel, formatSkillName } from "@/lib/diagnostic/diagnosticUiLogic";

export function DiagnosticResultTab() {
  const {
    data: assessment,
    isLoading: isLoadingAssessment,
  } = useQuery({
    queryKey: ["diagnostic-current"],
    queryFn: diagnosticService.getCurrent,
    refetchOnMount: "always",
  });

  const {
    data: latestResult,
    isLoading: isLoadingResult,
  } = useQuery({
    queryKey: ["diagnostic-latest-result"],
    queryFn: diagnosticService.getLatestResult,
    refetchOnMount: "always",
  });

  const isLoading = isLoadingAssessment || isLoadingResult;

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="animate-spin text-violet-600" size={32} />
      </div>
    );
  }

  const hasCompleted = Boolean(latestResult || assessment?.hasCompleted);
  const inProgress = Boolean(assessment?.inProgressAttempt && !hasCompleted);

  // ── STATE 1: NEVER STARTED ──────────────────────────────────────────
  if (!hasCompleted && !inProgress) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
            <Target size={24} />
          </div>
          <h2 className="mt-4 text-2xl font-black text-slate-900 dark:text-slate-100">
            Đánh giá năng lực đầu vào
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Bài đánh giá gồm 52 nhiệm vụ (Ngữ pháp & Từ vựng, Đọc hiểu, Nghe hiểu, Nói và Viết) giúp hệ thống xác định chính xác trình độ khởi điểm của bạn và đề xuất các bài luyện tập phù hợp.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-850">
              <span className="text-xs font-bold text-slate-500">Thời lượng</span>
              <p className="mt-1 font-extrabold text-slate-800 dark:text-slate-200">
                Khoảng 35–50 phút
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-850">
              <span className="text-xs font-bold text-slate-500">Cấu trúc</span>
              <p className="mt-1 font-extrabold text-slate-800 dark:text-slate-200">
                48 câu trắc nghiệm + 4 bài thực hành
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-850">
              <span className="text-xs font-bold text-slate-500">Mục đích</span>
              <p className="mt-1 font-extrabold text-slate-800 dark:text-slate-200">
                Gợi ý bài học cá nhân hóa
              </p>
            </div>
          </div>

          <div className="mt-8">
            <Link
              href="/diagnostic"
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-violet-600 px-6 text-sm font-extrabold text-white transition hover:bg-violet-700"
            >
              Làm bài đánh giá đầu vào <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── STATE 2: IN PROGRESS ────────────────────────────────────────────
  if (inProgress) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6 shadow-xs dark:border-amber-900/60 dark:bg-amber-950/30 sm:p-8">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
            <Clock size={24} />
          </div>
          <h2 className="mt-4 text-2xl font-black text-slate-900 dark:text-slate-100">
            Bạn đang có bài đánh giá chưa hoàn thành
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Tiến độ làm bài của bạn đã được hệ thống lưu tự động. Bạn có thể tiếp tục làm bài bất kỳ lúc nào để nhận kết quả đánh giá năng lực.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/diagnostic"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-600 px-5 text-sm font-extrabold text-white hover:bg-amber-700"
            >
              Tiếp tục bài đánh giá <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── STATE 3: COMPLETED SAVED RESULT ─────────────────────────────────
  if (!latestResult) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="animate-spin text-violet-600" size={32} />
      </div>
    );
  }

  const result: DiagnosticResult = latestResult;
  const completedDate = result.completedAt || result.submittedAt;
  const formattedDate = completedDate
    ? new Date(completedDate).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "Gần đây";

  const practiceItems: DiagnosticPracticeRecommendation[] =
    result.practiceRecommendations || [];

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 size={14} /> Đã hoàn thành đánh giá
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400">
            <Calendar size={13} /> {formattedDate}
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Trình độ khởi điểm ước tính
            </span>
            <h2 className="mt-1 text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100">
              {formatPlacementLevel(result.level)}
            </h2>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              Kết quả này được dùng để gợi ý điểm bắt đầu học tập và bài luyện phù hợp trên BreadTrans, không thay thế chứng chỉ CEFR chính thức.
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end rounded-2xl bg-slate-50 p-4 dark:bg-slate-850">
            <span className="text-xs font-bold text-slate-500">Phần trắc nghiệm</span>
            <span className="mt-0.5 text-2xl font-black text-slate-900 dark:text-slate-100">
              {result.correctCount} / {result.totalCount} câu đúng
            </span>
            <span className="text-xs font-extrabold text-emerald-600">
              {result.percentage}% độ chính xác
            </span>
          </div>
        </div>

        {/* Speaking / Writing Evidence Note */}
        {result.productiveTaskCount ? (
          <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/70 p-4 text-xs leading-6 text-violet-900 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-200">
            <div className="flex items-center gap-2 font-black text-violet-800 dark:text-violet-300">
              <Mic size={15} /> Bằng chứng kỹ năng Nói &amp; Viết
            </div>
            <div className="mt-1.5 space-y-1">
              <p>
                <span className="font-bold">Nói: </span>
                {result.speakingEvidenceCount && result.speakingEvidenceCount > 0
                  ? `Đã ghi nhận ${result.speakingEvidenceCount}/2 nhiệm vụ${result.speakingScore !== null ? ` (Điểm phát âm: ${result.speakingScore}/100)` : ""}.`
                  : "Chưa đủ dữ liệu để đưa ra nhận định; điểm xếp lớp hiện dựa trên 48 câu trắc nghiệm khách quan."}
              </p>
              <p>
                <span className="font-bold">Viết: </span>
                Đã ghi nhận 2 nhiệm vụ tự luận vào hồ sơ học tập để theo dõi tiến độ.
              </p>
            </div>
          </div>
        ) : null}

        {/* Skill Profiles Breakdown */}
        {result.skillProfiles && result.skillProfiles.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Kết quả theo kỹ năng
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {result.skillProfiles.map((profile) => (
                <div
                  key={profile.skill}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-850"
                >
                  <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                    {formatSkillName(profile.skill)}
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    {profile.percentage !== null
                      ? `${profile.percentage}% (${profile.correctCount}/${profile.totalCount})`
                      : "Chưa đủ dữ liệu"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths & Weaknesses */}
        <div className="mt-6 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2 dark:border-slate-800">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Điểm mạnh
            </h4>
            <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
              {result.strengths && result.strengths.length > 0
                ? result.strengths.map(formatSkillName).join(", ")
                : "Chưa ghi nhận kỹ năng nổi trội từ kết quả hiện tại."}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Nên củng cố
            </h4>
            <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
              {result.weaknesses && result.weaknesses.length > 0
                ? result.weaknesses.map(formatSkillName).join(", ")
                : "Chưa ghi nhận kỹ năng cần ưu tiên cải thiện."}
            </p>
          </div>
        </div>
      </div>

      {/* Practice Recommendations */}
      {practiceItems.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-violet-600 dark:text-violet-400" />
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
              Bài luyện đề xuất
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Được gợi ý riêng theo kết quả phân tích điểm mạnh và điểm cần củng cố của bạn.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {practiceItems.map((rec) => (
              <Link
                key={rec.id}
                href={rec.route}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 transition-all hover:border-violet-500 hover:shadow-sm dark:border-slate-800 dark:bg-slate-850 dark:hover:border-violet-500"
              >
                <div>
                  <span className="inline-block rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                    {rec.badge}
                  </span>
                  <h4 className="mt-2 text-sm font-black text-slate-900 group-hover:text-violet-600 dark:text-slate-100 dark:group-hover:text-violet-400">
                    {rec.title}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-5">
                    {rec.description}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400">
                  <span>Luyện tập ngay</span>
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Answer Review Link CTA */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          Bạn muốn đối chiếu chi tiết từng câu trả lời và xem giải thích?
        </span>
        <Link
          href="/diagnostic"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-violet-600 hover:underline dark:text-violet-400"
        >
          <span>Xem lại toàn bộ bài làm</span>
          <ExternalLink size={13} />
        </Link>
      </div>
    </div>
  );
}
