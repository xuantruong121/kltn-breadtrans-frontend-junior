"use client";

import React, { useState } from "react";
import {
  Cpu,
  Mic,
  HardDrive,
  Trash2,
  RefreshCw,
  DollarSign,
  ShieldCheck,
  Users,
  CheckCircle2,
  AlertCircle,
  Database,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient from "@/lib/api/axiosClient";
import toast from "react-hot-toast";

type SystemCostsResponse = {
  summary: {
    totalCostUsd: number;
    totalCostVnd: number;
    savedCostUsd: number;
    savedCostVnd: number;
    status: "MEASURED" | "PARTIAL" | "UNAVAILABLE";
    activeUsers: number;
  };
  services: {
    gemini: {
      name: string;
      model: string;
      totalRequests: number;
      cachedEntries: number;
      cacheHitCount: number;
      cacheHitRate: number;
      inputTokens: number;
      outputTokens: number;
      costUsd: number;
      costVnd: number;
      freeTierStatus: string;
      withinFreeTier: boolean;
    };
    azureSpeech: {
      name: string;
      totalSubmissions: number;
      submissionsThisMonth: number;
      audioMinutesThisMonth: number;
      freeQuotaMinutes: number;
      usedPercent: number;
      ttsCharactersThisMonth: number;
      freeTtsCharacters: number;
      ttsUsedPercent: number;
      costUsd: number;
      costVnd: number;
      withinFreeTier: boolean;
    };
    cloudflareR2: {
      name: string;
      activeAudioFiles: number;
      archivedAudioFiles: number;
      totalMaterials: number;
      usedStorageMb: number;
      usedStorageGb: number;
      fileCount: number;
      /** False when a bucket could not be read: the total is too low. */
      storageComplete: boolean;
      freeQuotaGb: number;
      usedPercent: number;
      egressCostUsd: number;
      costUsd: number;
      costVnd: number;
      withinFreeTier: boolean;
    };
  };
};

export default function AdminCostsPage() {
  const queryClient = useQueryClient();
  const [isPurgingCache, setIsPurgingCache] = useState(false);
  const [isCleaningR2, setIsCleaningR2] = useState(false);

  const { data, isLoading, isError, refetch, isRefetching } =
    useQuery<SystemCostsResponse>({
      queryKey: ["admin", "system-costs"],
      queryFn: async () => {
        const res: unknown = await axiosClient.get("/admin/system-costs");
        const parsed = res as { data?: SystemCostsResponse } | SystemCostsResponse;
        return "data" in parsed && parsed.data ? parsed.data : (parsed as SystemCostsResponse);
      },
      refetchInterval: 30000,
    });

  const purgeCacheMutation = useMutation({
    mutationFn: async () => {
      setIsPurgingCache(true);
      const res: unknown = await axiosClient.post(
        "/admin/system-costs/purge-ai-cache",
      );
      const parsed = res as { message?: string; data?: { message?: string } };
      return parsed?.data?.message || parsed?.message || "Đã xóa bộ nhớ đệm.";
    },
    onSuccess: (message: string) => {
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ["admin", "system-costs"] });
    },
    onError: () => {
      toast.error("Không thể xóa cache. Vui lòng thử lại!");
    },
    onSettled: () => {
      setIsPurgingCache(false);
    },
  });

  const cleanupR2Mutation = useMutation({
    mutationFn: async () => {
      setIsCleaningR2(true);
      const res: unknown = await axiosClient.post(
        "/admin/system-costs/trigger-r2-cleanup",
      );
      const parsed = res as { message?: string; data?: { message?: string } };
      return parsed?.data?.message || parsed?.message || "Đã dọn dẹp file ghi âm cũ thành công!";
    },
    onSuccess: (message: string) => {
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ["admin", "system-costs"] });
    },
    onError: () => {
      toast.error("Lỗi khi dọn dẹp R2. Vui lòng kiểm tra lại cấu hình!");
    },
    onSettled: () => {
      setIsCleaningR2(false);
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1500px] space-y-6 pb-12 animate-pulse">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
          <div className="space-y-2">
            <div className="h-7 w-64 rounded-md bg-slate-200" />
            <div className="h-4 w-96 rounded-md bg-slate-100" />
          </div>
          <div className="h-10 w-36 rounded-lg bg-slate-200" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="h-32 rounded-xl border border-slate-200 bg-slate-50" />
          <div className="h-32 rounded-xl border border-slate-200 bg-slate-50" />
          <div className="h-32 rounded-xl border border-slate-200 bg-slate-50" />
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="h-72 rounded-xl border border-slate-200 bg-slate-50" />
          <div className="h-72 rounded-xl border border-slate-200 bg-slate-50" />
          <div className="h-72 rounded-xl border border-slate-200 bg-slate-50" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-4xl py-12">
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-600" />
          <h2 className="mt-2 text-base font-semibold text-rose-950">
            Không thể tải dữ liệu chi phí & tài nguyên Cloud
          </h2>
          <p className="mt-1 text-sm text-rose-700">
            Vui lòng kiểm tra kết nối với hệ thống backend hoặc thử lại sau.
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-rose-700 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Thử tải lại
          </button>
        </div>
      </div>
    );
  }

  const summary = data.summary || {
    totalCostUsd: 0,
    totalCostVnd: 0,
    savedCostUsd: 0,
    savedCostVnd: 0,
    status: "UNAVAILABLE" as const,
    activeUsers: 0,
  };

  const services = data.services;
  const hasCostEstimate = summary.status !== "UNAVAILABLE";
  const withinFreeTier =
    (services?.azureSpeech?.withinFreeTier ?? true) &&
    (services?.cloudflareR2?.withinFreeTier ?? true);

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-6 pb-12">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              Chi phí & Tài nguyên Cloud
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Telemetry
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Giám sát mức tiêu thụ hạn mức Free Tier và chi phí vận hành thực tế của các dịch vụ đám mây (FinOps).
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-xs transition-all hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98] disabled:opacity-50 cursor-pointer sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 text-slate-600 ${isRefetching ? "animate-spin" : ""}`} />
          <span>{isRefetching ? "Đang đồng bộ..." : "Làm mới dữ liệu"}</span>
        </button>
      </header>

      {/* Top 3 KPI Summary Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Thống kê tổng quan chi phí">
        {/* Card 1: Actual Cost */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Chi phí Gemini đã đo
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-950 font-mono tabular-nums">
              {hasCostEstimate ? `$${summary.totalCostUsd.toFixed(2)}` : "$0.00"}
            </span>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200/50">
              Ước tính
            </span>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-600">
            {hasCostEstimate
              ? `≈ ${summary.totalCostVnd.toLocaleString("vi-VN")} đ · Cộng dồn theo token từ khi bật đo, không riêng tháng này`
              : "Chưa phát sinh chi phí ngoài Free Tier"}
          </p>
        </div>

        {/* Card 2: Free Tier Coverage */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Trạng thái Free Tier
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-3xl font-bold tracking-tight font-mono tabular-nums ${
                withinFreeTier ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {withinFreeTier ? "Trong hạn mức" : "Vượt hạn mức"}
            </span>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-600">
            {withinFreeTier
              ? "Azure Speech và Cloudflare R2 đang trong hạn mức miễn phí tháng này."
              : "Azure Speech hoặc Cloudflare R2 đã dùng hết hạn mức miễn phí tháng này."}
          </p>
        </div>

        {/* Card 3: Active Learners Scale */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Quy mô người dùng
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-950 font-mono tabular-nums">
              {summary.activeUsers}
            </span>
            <span className="text-xs font-medium text-slate-500">tài khoản</span>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-600">
            Hạ tầng đáp ứng mượt mà giai đoạn kiểm thử và bảo vệ đồ án tốt nghiệp.
          </p>
        </div>
      </section>

      {/* Services Grid (3 columns for perfect balance) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold tracking-tight text-slate-900">
            Chi tiết 3 dịch vụ Cloud đang tích hợp
          </h2>
          <span className="text-xs font-medium text-slate-500">
            Tự động cập nhật mỗi 30 giây
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Card 1: Google Gemini Generative AI */}
          {services?.gemini && (
            <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-slate-300">
              <div>
                {/* Provider Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <Cpu className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Google Gemini
                      </h3>
                      <p className="text-xs font-medium text-slate-500 font-mono">
                        {services.gemini.model}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    1.500 req/ngày (Free)
                  </span>
                </div>

                {/* Primary Cost Box */}
                <div className="mt-4 rounded-lg border border-slate-200/70 bg-slate-50/80 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">
                      Chi phí ước tính:
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-950 tabular-nums">
                      ${services.gemini.costUsd.toFixed(4)} USD
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span>Quy đổi VND:</span>
                    <span className="font-medium text-slate-700 font-mono">
                      ≈ {services.gemini.costVnd.toLocaleString("vi-VN")} đ
                    </span>
                  </div>
                </div>

                {/* 2x2 Metric Grid */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Tổng Request
                    </p>
                    <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                      {services.gemini.totalRequests}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Redis Cache
                    </p>
                    <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                      {services.gemini.cachedEntries}{" "}
                      <span className="text-xs font-normal text-slate-500">keys</span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Input Tokens
                    </p>
                    <p className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
                      {services.gemini.inputTokens.toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Output Tokens
                    </p>
                    <p className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
                      {services.gemini.outputTokens.toLocaleString("vi-VN")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer status */}
              <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Bộ nhớ đệm giúp giảm số lượt gọi dịch vụ AI.</span>
              </div>
            </div>
          )}

          {/* Card 2: Microsoft Azure AI Speech */}
          {services?.azureSpeech && (
            <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-slate-300">
              <div>
                {/* Provider Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                      <Mic className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Azure AI Speech
                      </h3>
                      <p className="text-xs font-medium text-slate-500">
                        Chấm phát âm và giọng đọc (TTS)
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                    5 giờ + 0,5 triệu ký tự/tháng (Free)
                  </span>
                </div>

                {/* Usage Progress Box */}
                <div className="mt-4 rounded-lg border border-slate-200/70 bg-slate-50/80 p-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Chấm phát âm tháng này:
                    </span>
                    <span className="font-mono font-bold text-slate-950 tabular-nums">
                      {services.azureSpeech.audioMinutesThisMonth} / {services.azureSpeech.freeQuotaMinutes} phút ({services.azureSpeech.usedPercent}%)
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        services.azureSpeech.usedPercent > 80 ? "bg-amber-500" : "bg-blue-600"
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(services.azureSpeech.usedPercent > 0 ? 3 : 0, services.azureSpeech.usedPercent))}%`,
                      }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>Còn lại trong hạn mức:</span>
                    <span className="font-semibold text-emerald-700">
                      {Math.max(0, services.azureSpeech.freeQuotaMinutes - services.azureSpeech.audioMinutesThisMonth).toLocaleString("vi-VN")} phút miễn phí
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Giọng đọc (TTS) tháng này:
                    </span>
                    <span className="font-mono font-bold text-slate-950 tabular-nums">
                      {services.azureSpeech.ttsCharactersThisMonth.toLocaleString("vi-VN")} / {services.azureSpeech.freeTtsCharacters.toLocaleString("vi-VN")} ký tự ({services.azureSpeech.ttsUsedPercent}%)
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        services.azureSpeech.ttsUsedPercent > 80 ? "bg-amber-500" : "bg-blue-600"
                      }`}
                      style={{
                        width: `${Math.max(services.azureSpeech.ttsCharactersThisMonth > 0 ? 3 : 0, services.azureSpeech.ttsUsedPercent)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* 2x2 Metric Grid */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Bài nộp Nói tháng này
                    </p>
                    <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                      {services.azureSpeech.submissionsThisMonth}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Tổng bài nộp Nói
                    </p>
                    <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                      {services.azureSpeech.totalSubmissions}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Thời lượng chấm
                    </p>
                    <p className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
                      {services.azureSpeech.audioMinutesThisMonth}{" "}
                      <span className="text-xs font-normal text-slate-500">phút</span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Chi phí phát sinh
                    </p>
                    <p className="mt-1 font-mono text-base font-bold text-emerald-700 tabular-nums">
                      $0.00{" "}
                      <span className="text-xs font-normal text-slate-500">(Gói Free)</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer status */}
              <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Phút chấm gồm bài luyện Nói và bài đầu vào. Ký tự TTS gồm audio Nghe và giọng đọc mẫu.</span>
              </div>
            </div>
          )}

          {/* Card 3: Cloudflare R2 Object Storage */}
          {services?.cloudflareR2 && (
            <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-slate-300">
              <div>
                {/* Provider Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                      <HardDrive className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Cloudflare R2
                      </h3>
                      <p className="text-xs font-medium text-slate-500">
                        Object Storage (0 phí egress)
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    10 GB lưu trữ (Free)
                  </span>
                </div>

                {/* Storage Progress Box */}
                <div className="mt-4 rounded-lg border border-slate-200/70 bg-slate-50/80 p-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Dung lượng đã dùng:
                    </span>
                    <span className="font-mono font-bold text-slate-950 tabular-nums">
                      {services.cloudflareR2.usedStorageMb.toFixed(1)} / {(services.cloudflareR2.freeQuotaGb * 1024).toLocaleString("vi-VN")} MB ({services.cloudflareR2.usedPercent}%)
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        services.cloudflareR2.usedPercent > 80 ? "bg-amber-500" : "bg-emerald-600"
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(services.cloudflareR2.usedPercent > 0 ? 3 : 0, services.cloudflareR2.usedPercent))}%`,
                      }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>Dung lượng còn trống:</span>
                    <span className="font-semibold text-emerald-700">
                      {(services.cloudflareR2.freeQuotaGb - services.cloudflareR2.usedStorageGb).toFixed(2)} GB miễn phí
                    </span>
                  </div>
                </div>

                {/* 2x2 Metric Grid */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Ghi âm học viên
                    </p>
                    <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                      {services.cloudflareR2.activeAudioFiles}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Đã dọn dẹp (TTL 90d)
                    </p>
                    <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                      {services.cloudflareR2.archivedAudioFiles}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Tổng file đang lưu
                    </p>
                    <p className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
                      {services.cloudflareR2.fileCount.toLocaleString("vi-VN")}{" "}
                      <span className="text-xs font-normal text-slate-500">file</span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Phí Egress (Tải ra)
                    </p>
                    <p className="mt-1 font-mono text-base font-bold text-emerald-700 tabular-nums">
                      $0.00{" "}
                      <span className="text-xs font-normal text-slate-500">(Miễn phí)</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer status */}
              <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                {services.cloudflareR2.storageComplete ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                )}
                <span>
                  {services.cloudflareR2.storageComplete
                    ? "Tính cả bucket công khai, riêng tư và sao lưu; đo lại mỗi 10 phút."
                    : "Chưa đọc được đủ các bucket, dung lượng thật có thể cao hơn."}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Maintenance Controls */}
      <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Tác vụ bảo trì bộ nhớ & lưu trữ
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Dọn bộ nhớ đệm và các bản ghi âm cũ để giảm chi phí lưu trữ.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => purgeCacheMutation.mutate()}
              disabled={isPurgingCache}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/70 px-3.5 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 hover:border-rose-300 active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isPurgingCache ? "Đang xóa bộ nhớ đệm..." : "Xóa bộ nhớ đệm"}</span>
            </button>
            <button
              type="button"
              onClick={() => cleanupR2Mutation.mutate()}
              disabled={isCleaningR2}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isCleaningR2 ? "animate-spin" : ""}`} />
              <span>{isCleaningR2 ? "Đang quét R2..." : "Dọn dẹp R2 (> 90 ngày)"}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Scalability Projection Table */}
      <section className="rounded-xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Dự toán chi phí khi mở rộng quy mô (Unit Economics)
              </h2>
              <p className="text-xs text-slate-600">
                Mô hình tài chính điện toán đám mây theo 4 mốc tăng trưởng người dùng (tính toán bảo vệ đồ án KLTN & triển khai thực tế).
              </p>
            </div>
            <span className="self-start sm:self-auto rounded-md bg-slate-200/70 px-2.5 py-1 text-xs font-semibold text-slate-700 font-mono">
              Tỷ giá quy đổi: 25.400 đ / USD
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/75 text-slate-700 font-bold uppercase tracking-wider text-xs">
                <th className="px-5 py-3.5">Thành phần</th>
                <th className="px-4 py-3.5 bg-blue-50/50 text-blue-950 border-x border-blue-200/60">
                  <div className="flex items-center gap-1.5">
                    <span>MVP (100–500 HS)</span>
                    <span className="rounded bg-blue-600 px-1.5 py-0.2 text-xs font-bold text-white uppercase tracking-tight">
                      Hiện tại
                    </span>
                  </div>
                </th>
                <th className="px-4 py-3.5">Tăng trưởng (1K–5K HS)</th>
                <th className="px-4 py-3.5">Mở rộng (10K–50K HS)</th>
                <th className="px-4 py-3.5">Toàn quốc (100K+ HS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              <tr className="hover:bg-slate-50/60 transition">
                <td className="px-5 py-3.5 font-bold text-slate-900">Google Gemini (LLM)</td>
                <td className="px-4 py-3.5 bg-blue-50/30 font-semibold text-emerald-700 border-x border-blue-200/40">
                  $0 (Free Tier 1.5K req/ngày)
                </td>
                <td className="px-4 py-3.5 font-mono text-slate-800">$10–35 (~250K–875K đ)</td>
                <td className="px-4 py-3.5 font-mono text-slate-800">$80–250 (~2M–6,2M đ)</td>
                <td className="px-4 py-3.5 font-mono text-slate-800">$450–1.200</td>
              </tr>
              <tr className="hover:bg-slate-50/60 transition">
                <td className="px-5 py-3.5 font-bold text-slate-900">Azure AI Speech</td>
                <td className="px-4 py-3.5 bg-blue-50/30 font-semibold text-emerald-700 border-x border-blue-200/40">
                  $0 (Free Tier 5 giờ, 0,5 triệu ký tự)
                </td>
                <td className="px-4 py-3.5 font-mono text-slate-800">$20–60 (~500K–1,5M đ)</td>
                <td className="px-4 py-3.5 font-mono text-slate-800">$150–450 (~3,7M–11,2M đ)</td>
                <td className="px-4 py-3.5 font-mono text-slate-800">$800–2.000</td>
              </tr>
              <tr className="hover:bg-slate-50/60 transition">
                <td className="px-5 py-3.5 font-bold text-slate-900">Cloudflare R2</td>
                <td className="px-4 py-3.5 bg-blue-50/30 font-semibold text-emerald-700 border-x border-blue-200/40">
                  $0 (0 phí egress · 10 GB Free)
                </td>
                <td className="px-4 py-3.5 font-mono text-slate-800">$0–3 (~0–76K đ)</td>
                <td className="px-4 py-3.5 font-mono text-slate-800">$15–45 (~380K–1,1M đ)</td>
                <td className="px-4 py-3.5 font-mono text-slate-800">$100–300</td>
              </tr>
              <tr className="bg-slate-100/90 font-bold text-slate-950 border-t-2 border-slate-200">
                <td className="px-5 py-4 text-sm">Tổng chi phí / tháng</td>
                <td className="px-4 py-4 bg-blue-100/60 text-blue-950 border-x border-blue-200/60 font-mono text-sm">
                  ~$0–20 (0–500K đ)
                </td>
                <td className="px-4 py-4 font-mono text-slate-900 text-sm">
                  ~$117–305 (~2,9M–7,6M đ)
                </td>
                <td className="px-4 py-4 font-mono text-slate-900 text-sm">
                  ~$620–1.700 (~15,5M–42,5M đ)
                </td>
                <td className="px-4 py-4 font-mono text-slate-900 text-sm">
                  ~$3.160–8.310
                </td>
              </tr>
              <tr className="bg-slate-50/70 font-semibold text-slate-800">
                <td className="px-5 py-3.5">Chi phí / học sinh / tháng</td>
                <td className="px-4 py-3.5 bg-blue-50/40 text-blue-900 border-x border-blue-200/40 font-mono">
                  ~1.000–2.500 đ
                </td>
                <td className="px-4 py-3.5 font-mono text-slate-700">~1.500–2.900 đ</td>
                <td className="px-4 py-3.5 font-mono text-slate-700">~850–1.550 đ</td>
                <td className="px-4 py-3.5 font-mono text-slate-700">~790–1.200 đ</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
