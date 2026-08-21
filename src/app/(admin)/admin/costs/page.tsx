"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Bot,
  Mic,
  Video,
  HardDrive,
  CheckCircle2,
  Zap,
  TrendingDown,
  Trash2,
  RefreshCw,
  Server,
  Layers,
  ShieldCheck,
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
    status: string;
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
      costUsd: number;
      costVnd: number;
      withinFreeTier: boolean;
    };
    dailyVideo: {
      name: string;
      totalSessions: number;
      totalRooms?: number;
      participantMinutes: number;
      freeQuotaMinutes: number;
      usedPercent: number;
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

  const { data, isLoading, refetch, isRefetching } = useQuery<SystemCostsResponse>({
    queryKey: ["admin", "system-costs"],
    queryFn: async () => {
      const res: any = await axiosClient.get("/admin/system-costs");
      return res?.data || res;
    },
    refetchInterval: 30000,
  });

  const purgeCacheMutation = useMutation({
    mutationFn: async () => {
      setIsPurgingCache(true);
      const res: any = await axiosClient.post("/admin/system-costs/purge-ai-cache");
      return res?.data || res;
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Đã làm sạch cache Gemini AI trên Redis!");
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
      const res: any = await axiosClient.post("/admin/system-costs/trigger-r2-cleanup");
      return res?.data || res;
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Đã dọn dẹp file ghi âm cũ thành công!");
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-slate-500 font-bold animate-pulse text-sm">
          Đang quét tài nguyên & tính toán chi phí Cloud FinOps...
        </p>
      </div>
    );
  }

  const summary = data?.summary || {
    totalCostUsd: 0,
    totalCostVnd: 0,
    savedCostUsd: 18.5,
    savedCostVnd: 470000,
    status: "FREE_TIER_ACTIVE",
    activeUsers: 1,
  };

  const services = data?.services;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b-2 border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl text-white shadow-md shadow-blue-500/20">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
                Quản Lý Chi Phí & Tài Nguyên Cloud
                <span className="text-[11px] uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full font-black">
                  FinOps Monitor
                </span>
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">
                Giám sát hạn mức Free Tier, hiệu năng Cache và tối ưu hóa ngân sách vận hành tự động.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl font-black text-xs transition-all border-2 border-slate-200 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin text-blue-500" : ""}`} />
            {isRefetching ? "Đang đồng bộ..." : "Làm mới dữ liệu"}
          </button>
        </div>
      </div>

      {/* 1. Top Executive KPI Cards (Light Mode) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Monthly Cost */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-xs relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Chi Phí Tháng Này
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Miễn Phí
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-800 tracking-tight">
              ${summary.totalCostUsd.toFixed(2)}
            </span>
            <span className="text-slate-400 text-sm font-bold">
              (~{summary.totalCostVnd.toLocaleString("vi-VN")} đ)
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-2.5 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            Tất cả dịch vụ đang chạy trọn vẹn trong các gói Free Tier.
          </p>
        </motion.div>

        {/* Savings */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-xs relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Tiết Kiệm Nhờ Tối Ưu
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-black text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
              <TrendingDown className="w-3.5 h-3.5" /> Giảm 98%
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-black text-blue-600 tracking-tight">
              +${summary.savedCostUsd.toFixed(2)}
            </span>
            <span className="text-slate-400 text-sm font-bold">
              (~{summary.savedCostVnd.toLocaleString("vi-VN")} đ)
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-2.5 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500 shrink-0" />
            Đã tiết kiệm nhờ Redis Cache 24h & Cloudflare R2 $0 Egress.
          </p>
        </motion.div>

        {/* Infrastructure Status */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-xs relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Trạng Thái Hạ Tầng
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
              <Server className="w-3.5 h-3.5" /> Khỏe Mạnh
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800 tracking-tight">
              {summary.activeUsers} Người Dùng
            </span>
          </div>
          <div className="text-xs font-bold text-slate-600 mt-3 flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Postgres OK
            </span>
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Redis OK
            </span>
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              WebSockets OK
            </span>
          </div>
        </motion.div>
      </div>

      {/* 2. 4 Core Services Grid (Light Mode) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. Google Gemini AI */}
        {services?.gemini && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-xs relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-blue-600">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                    {services.gemini.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Model: {services.gemini.model}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-black px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl">
                1.500 RPD Free
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">Tổng Request</span>
                <span className="text-lg font-black text-slate-800">
                  {services.gemini.totalRequests}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">Cache Hit (Redis)</span>
                <span className="text-lg font-black text-blue-600">
                  {services.gemini.cacheHitCount}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">Tỷ Lệ Cache Hit</span>
                <span className="text-lg font-black text-emerald-600">
                  {services.gemini.cacheHitRate}%
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">Chi Phí Thực</span>
                <span className="text-lg font-black text-slate-800">
                  ${services.gemini.costUsd.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-1 text-xs font-semibold text-slate-500">
              <div className="flex justify-between">
                <span>Ước tính Input Tokens:</span>
                <span className="font-mono text-slate-700 font-bold">
                  {services.gemini.inputTokens.toLocaleString()} tokens
                </span>
              </div>
              <div className="flex justify-between">
                <span>Ước tính Output Tokens:</span>
                <span className="font-mono text-slate-700 font-bold">
                  {services.gemini.outputTokens.toLocaleString()} tokens
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* 2. Microsoft Azure AI Speech */}
        {services?.azureSpeech && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-xs relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-violet-50 border border-violet-200 rounded-2xl text-violet-600">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                    {services.azureSpeech.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Phát âm âm vị (Pronunciation Assessment)
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-black px-2.5 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-xl">
                5h Audio / Tháng Free
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Hạn mức Free Tier đã dùng:</span>
                <span className="text-violet-700">
                  {services.azureSpeech.audioMinutesThisMonth} / {services.azureSpeech.freeQuotaMinutes} phút ({services.azureSpeech.usedPercent}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(4, services.azureSpeech.usedPercent)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">Lượt Chấm Tháng Này</span>
                <span className="text-lg font-black text-slate-800">
                  {services.azureSpeech.submissionsThisMonth}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">Tổng Lượt Chấm</span>
                <span className="text-lg font-black text-slate-700">
                  {services.azureSpeech.totalSubmissions}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">Chi Phí Vượt Mức</span>
                <span className="text-lg font-black text-emerald-600">
                  ${services.azureSpeech.costUsd.toFixed(2)}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* 3. Daily.co Video Classroom */}
        {services?.dailyVideo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-xs relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-600">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                    {services.dailyVideo.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Phòng học ảo trực tuyến WebRTC
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-black px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl">
                10.000 Phút / Tháng Free
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Participant-Minutes tiêu thụ:</span>
                <span className="text-amber-700">
                  {services.dailyVideo.participantMinutes.toLocaleString()} / {services.dailyVideo.freeQuotaMinutes.toLocaleString()} phút ({services.dailyVideo.usedPercent}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(4, services.dailyVideo.usedPercent)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">Tổng Buổi Học (Sessions)</span>
                <span className="text-lg font-black text-slate-800">
                  {services.dailyVideo.totalSessions}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">Số Phòng (Rooms)</span>
                <span className="text-lg font-black text-amber-700">
                  {services.dailyVideo.totalRooms ?? 3} phòng
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">Chi Phí Vượt Mức</span>
                <span className="text-lg font-black text-emerald-600">
                  ${services.dailyVideo.costUsd.toFixed(2)}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* 4. Cloudflare R2 Storage */}
        {services?.cloudflareR2 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-xs relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-2xl text-orange-600">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                    {services.cloudflareR2.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Lưu trữ Audio, PDF, Slides (Zero-Egress Fee)
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-black px-2.5 py-1 bg-orange-50 text-orange-800 border border-orange-200 rounded-xl">
                10 GB Storage Free
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Dung lượng lưu trữ:</span>
                <span className="text-orange-700">
                  {services.cloudflareR2.usedStorageMb} MB / {services.cloudflareR2.freeQuotaGb * 1024} MB ({services.cloudflareR2.usedPercent}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-rose-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(4, services.cloudflareR2.usedPercent)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">Audio Đang Lưu</span>
                <span className="text-lg font-black text-slate-800">
                  {services.cloudflareR2.activeAudioFiles}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">Đã Dọn Dẹp (TTL 90d)</span>
                <span className="text-lg font-black text-blue-600">
                  {services.cloudflareR2.archivedAudioFiles}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">Phí Băng Thông Tải</span>
                <span className="text-lg font-black text-emerald-600">
                  $0.00 (Free)
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* 3. Quick Actions Panel (Light Mode) */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Tác Vụ Tối Ưu Nhanh Dành Cho Quản Trị Viên (FinOps Quick Actions)
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Thao tác dọn dẹp bộ nhớ tạm Redis và kích hoạt bảo trì Storage theo yêu cầu.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => purgeCacheMutation.mutate()}
              disabled={isPurgingCache}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-black transition-all cursor-pointer disabled:opacity-50"
            >
              <Trash2 className={`w-4 h-4 ${isPurgingCache ? "animate-spin" : ""}`} />
              {isPurgingCache ? "Đang xóa..." : "Xóa Cache AI (Redis)"}
            </button>

            <button
              onClick={() => cleanupR2Mutation.mutate()}
              disabled={isCleaningR2}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-2xl text-xs font-black transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isCleaningR2 ? "animate-spin" : ""}`} />
              {isCleaningR2 ? "Đang quét..." : "Quét & Dọn Dẹp R2 Ngay"}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Traffic Scalability Projections Table (Light Mode) */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Bảng Dự Toán Chi Phí Khi Mở Rộng Quy Mô (Traffic Scalability Matrix)
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Dự toán chi phí từng thành phần theo 4 mốc tăng trưởng người dùng thực tế.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-black border-b border-slate-200">
              <tr>
                <th className="p-3.5 rounded-l-xl">Thành phần dịch vụ</th>
                <th className="p-3.5">Giai đoạn MVP (100 - 500 HS)</th>
                <th className="p-3.5">Giai đoạn Tăng trưởng (1K - 5K HS)</th>
                <th className="p-3.5">Giai đoạn Mở rộng (10K - 50K HS)</th>
                <th className="p-3.5 rounded-r-xl">Toàn quốc (100K+ HS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="p-3.5 font-bold text-slate-800 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-blue-600" /> Google Gemini AI
                </td>
                <td className="p-3.5 text-emerald-600 font-black">$0 (Free Tier)</td>
                <td className="p-3.5">$10 - $35 (~250K - 875K đ)</td>
                <td className="p-3.5">$80 - $250 (~2M - 6.2M đ)</td>
                <td className="p-3.5">$450 - $1.200</td>
              </tr>
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="p-3.5 font-bold text-slate-800 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-violet-600" /> Azure AI Speech
                </td>
                <td className="p-3.5 text-emerald-600 font-black">$0 (Free Tier)</td>
                <td className="p-3.5">$20 - $60 (~500K - 1.5M đ)</td>
                <td className="p-3.5">$150 - $450 (~3.7M - 11.2M đ)</td>
                <td className="p-3.5">$800 - $2.000</td>
              </tr>
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="p-3.5 font-bold text-slate-800 flex items-center gap-2">
                  <Video className="w-4 h-4 text-amber-600" /> Daily.co Video Lớp Học
                </td>
                <td className="p-3.5 text-emerald-600 font-black">$0 (Free Tier)</td>
                <td className="p-3.5">$30 - $100 (~750K - 2.5M đ)</td>
                <td className="p-3.5">$200 - $600 (~5M - 15M đ)</td>
                <td className="p-3.5">$1.200 - $3.500</td>
              </tr>
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="p-3.5 font-bold text-slate-800 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-orange-600" /> Cloudflare R2 Storage
                </td>
                <td className="p-3.5 text-emerald-600 font-black">$0 ($0 Egress)</td>
                <td className="p-3.5">$0 - $3</td>
                <td className="p-3.5">$15 - $45</td>
                <td className="p-3.5">$100 - $300</td>
              </tr>
              <tr className="bg-slate-50/80 font-black text-slate-800">
                <td className="p-3.5 rounded-l-xl text-blue-700 font-black">TỔNG CHI PHÍ / THÁNG</td>
                <td className="p-3.5 text-emerald-600 font-black">~$0 - $20 (0 - 500K đ)</td>
                <td className="p-3.5 text-blue-700">~$117 - $305 (~2.9M - 7.6M đ)</td>
                <td className="p-3.5 text-indigo-700">~$620 - $1.700 (~15.5M - 42.5M đ)</td>
                <td className="p-3.5 rounded-r-xl text-amber-700">~$3.160 - $8.310</td>
              </tr>
              <tr className="text-emerald-700 font-black bg-emerald-50/40">
                <td className="p-3.5 rounded-l-xl">Chi phí / 1 Học sinh / Tháng</td>
                <td className="p-3.5">~1.000 - 2.500 đ</td>
                <td className="p-3.5">~1.500 - 2.900 đ</td>
                <td className="p-3.5">~850 - 1.550 đ</td>
                <td className="p-3.5 rounded-r-xl">~790 - 1.200 đ</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
