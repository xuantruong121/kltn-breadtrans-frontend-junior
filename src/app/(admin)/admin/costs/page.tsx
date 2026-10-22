"use client";

import React, { useState } from "react";
import {
  Cpu,
  Mic,
  HardDrive,
  Trash2,
  RefreshCw,
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

  const { data, isLoading, refetch, isRefetching } =
    useQuery<SystemCostsResponse>({
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
      const res: any = await axiosClient.post(
        "/admin/system-costs/purge-ai-cache",
      );
      return res?.data || res;
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Đã làm sạch cache dữ liệu trên Redis!");
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
      const res: any = await axiosClient.post(
        "/admin/system-costs/trigger-r2-cleanup",
      );
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
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-500" />
        <p className="text-sm text-slate-500">Đang tải dữ liệu chi phí...</p>
      </div>
    );
  }

  const summary = data?.summary || {
    totalCostUsd: 0,
    totalCostVnd: 0,
    savedCostUsd: 0,
    savedCostVnd: 0,
    status: "UNAVAILABLE" as const,
    activeUsers: 0,
  };

  const services = data?.services;
  const hasCostEstimate = summary.status !== "UNAVAILABLE";

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Chi phí & tài nguyên Cloud
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi hạn mức Free Tier và chi phí thực tế của các dịch vụ bên ngoài.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="inline-flex items-center gap-1.5 self-start rounded-md border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 cursor-pointer sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          {isRefetching ? "Đang làm mới..." : "Làm mới dữ liệu"}
        </button>
      </div>

      {/* Summary — one container split by dividers, no icon chips */}
      <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0 rounded-lg border border-slate-200 bg-white">
        <div className="p-5">
          <p className="text-xs text-slate-500">Chi phí tháng này</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
            {hasCostEstimate ? `$${summary.totalCostUsd.toFixed(2)}` : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {hasCostEstimate
              ? `≈ ${summary.totalCostVnd.toLocaleString("vi-VN")} đ · chỉ gồm Gemini (ước tính theo token thực tế)`
              : "Chưa có dữ liệu sử dụng để ước tính"}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs text-slate-500">Tiết kiệm nhờ Free Tier</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">—</p>
          <p className="mt-1 text-xs text-slate-500">
            Chưa có số liệu billing thật của nhà cung cấp để so sánh
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs text-slate-500">Người dùng trong hệ thống</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
            {summary.activeUsers}
          </p>
          <p className="mt-1 text-xs text-slate-500">Tổng tài khoản đã đăng ký</p>
        </div>
      </div>

      {/* Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {services?.gemini && (
          <ServiceCard
            icon={<Cpu size={16} className="text-slate-500" />}
            name={services.gemini.name}
            meta={`Model: ${services.gemini.model}`}
            quotaLabel="1.500 request/ngày (Free)"
          >
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Tổng request" value={services.gemini.totalRequests} />
              <Stat label="Mục cache (Redis)" value={services.gemini.cachedEntries} />
              <Stat
                label="Input tokens"
                value={services.gemini.inputTokens.toLocaleString("vi-VN")}
              />
              <Stat
                label="Output tokens"
                value={services.gemini.outputTokens.toLocaleString("vi-VN")}
              />
            </dl>
            <p className="mt-4 text-xs text-slate-500">
              Chi phí ước tính theo đơn giá token thực:{" "}
              <span className="font-medium tabular-nums text-slate-900">
                ${services.gemini.costUsd.toFixed(4)}
              </span>
            </p>
          </ServiceCard>
        )}

        {services?.azureSpeech && (
          <ServiceCard
            icon={<Mic size={16} className="text-slate-500" />}
            name={services.azureSpeech.name}
            meta="Pronunciation Assessment"
            quotaLabel="5 giờ audio/tháng (Free)"
          >
            <UsageBar
              label="Hạn mức đã dùng"
              used={services.azureSpeech.audioMinutesThisMonth}
              total={services.azureSpeech.freeQuotaMinutes}
              unit="phút"
              percent={services.azureSpeech.usedPercent}
            />
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <Stat
                label="Lượt chấm tháng này"
                value={services.azureSpeech.submissionsThisMonth}
              />
              <Stat label="Tổng lượt chấm" value={services.azureSpeech.totalSubmissions} />
            </dl>
          </ServiceCard>
        )}

        {services?.cloudflareR2 && (
          <ServiceCard
            icon={<HardDrive size={16} className="text-slate-500" />}
            name={services.cloudflareR2.name}
            meta="Lưu trữ audio, PDF, slide (không phí egress)"
            quotaLabel="10 GB lưu trữ/tháng (Free)"
          >
            <UsageBar
              label="Dung lượng đã dùng"
              used={services.cloudflareR2.usedStorageMb}
              total={services.cloudflareR2.freeQuotaGb * 1024}
              unit="MB"
              percent={services.cloudflareR2.usedPercent}
            />
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <Stat label="File audio đang lưu" value={services.cloudflareR2.activeAudioFiles} />
              <Stat label="Đã dọn dẹp (TTL 90 ngày)" value={services.cloudflareR2.archivedAudioFiles} />
            </dl>
          </ServiceCard>
        )}
      </div>

      {/* Quick actions */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-medium text-slate-900">Tác vụ bảo trì</h2>
            <p className="mt-1 text-xs text-slate-500">
              Dọn bộ nhớ tạm Redis và file ghi âm cũ trên R2 theo yêu cầu.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => purgeCacheMutation.mutate()}
              disabled={isPurgingCache}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              <Trash2 size={14} />
              {isPurgingCache ? "Đang xoá..." : "Xoá cache Redis"}
            </button>
            <button
              onClick={() => cleanupR2Mutation.mutate()}
              disabled={isCleaningR2}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={14} className={isCleaningR2 ? "animate-spin" : ""} />
              {isCleaningR2 ? "Đang dọn..." : "Dọn dẹp R2"}
            </button>
          </div>
        </div>
      </div>

      {/* Scalability projection table */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-medium text-slate-900">
            Dự toán chi phí khi mở rộng quy mô
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Ước tính theo 4 mốc tăng trưởng người dùng — dùng cho kế hoạch, không phải số liệu đo thật
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-500">
              <tr>
                <th className="px-5 py-2.5 font-normal">Thành phần</th>
                <th className="px-4 py-2.5 font-normal">MVP (100–500 HS)</th>
                <th className="px-4 py-2.5 font-normal">Tăng trưởng (1K–5K HS)</th>
                <th className="px-4 py-2.5 font-normal">Mở rộng (10K–50K HS)</th>
                <th className="px-4 py-2.5 font-normal">Toàn quốc (100K+ HS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              <tr>
                <td className="px-5 py-3 font-medium text-slate-900">Gemini (LLM)</td>
                <td className="px-4 py-3 text-emerald-700">$0 (Free Tier)</td>
                <td className="px-4 py-3">$10–35 (~250K–875K đ)</td>
                <td className="px-4 py-3">$80–250 (~2M–6,2M đ)</td>
                <td className="px-4 py-3">$450–1.200</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-medium text-slate-900">Azure Speech</td>
                <td className="px-4 py-3 text-emerald-700">$0 (Free Tier)</td>
                <td className="px-4 py-3">$20–60 (~500K–1,5M đ)</td>
                <td className="px-4 py-3">$150–450 (~3,7M–11,2M đ)</td>
                <td className="px-4 py-3">$800–2.000</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-medium text-slate-900">Cloudflare R2</td>
                <td className="px-4 py-3 text-emerald-700">$0 (0 phí egress)</td>
                <td className="px-4 py-3">$0–3</td>
                <td className="px-4 py-3">$15–45</td>
                <td className="px-4 py-3">$100–300</td>
              </tr>
              <tr className="bg-slate-50 font-medium text-slate-900">
                <td className="px-5 py-3">Tổng chi phí / tháng</td>
                <td className="px-4 py-3">~$0–20 (0–500K đ)</td>
                <td className="px-4 py-3">~$117–305 (~2,9M–7,6M đ)</td>
                <td className="px-4 py-3">~$620–1.700 (~15,5M–42,5M đ)</td>
                <td className="px-4 py-3">~$3.160–8.310</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-medium text-slate-900">
                  Chi phí / học sinh / tháng
                </td>
                <td className="px-4 py-3">~1.000–2.500 đ</td>
                <td className="px-4 py-3">~1.500–2.900 đ</td>
                <td className="px-4 py-3">~850–1.550 đ</td>
                <td className="px-4 py-3">~790–1.200 đ</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ServiceCard({
  icon,
  name,
  meta,
  quotaLabel,
  children,
}: {
  icon: React.ReactNode;
  name: string;
  meta: string;
  quotaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {icon}
          <div>
            <h3 className="text-sm font-medium text-slate-900">{name}</h3>
            <p className="text-xs text-slate-500">{meta}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
          {quotaLabel}
        </span>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold tabular-nums text-slate-900">
        {value}
      </dd>
    </div>
  );
}

function UsageBar({
  label,
  used,
  total,
  unit,
  percent,
}: {
  label: string;
  used: number;
  total: number;
  unit: string;
  percent: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className="font-medium tabular-nums text-slate-900">
          {used} / {total} {unit} ({percent}%)
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slate-900"
          style={{ width: `${Math.min(100, Math.max(percent > 0 ? 2 : 0, percent))}%` }}
        />
      </div>
    </div>
  );
}
