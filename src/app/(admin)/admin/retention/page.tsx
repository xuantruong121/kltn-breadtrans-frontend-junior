"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import {
  formatRate,
  formatWeek,
  type MetricRate,
  type RetentionMetrics,
} from "@/lib/admin/retentionMetrics";

const WEEK_OPTIONS = [4, 12, 26];

function RateCell({ value }: { value: MetricRate }) {
  const { percent, detail } = formatRate(value);
  return (
    <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
      <span className="font-semibold text-slate-900">{percent}</span>
      <span className="ml-2 text-xs text-slate-500">{detail}</span>
    </td>
  );
}

const TH = "px-5 py-3";
const HEAD_ROW =
  "border-b border-slate-200 bg-slate-100/75 text-left text-xs font-bold uppercase tracking-wider text-slate-700";

export default function RetentionPage() {
  const [weeks, setWeeks] = useState(12);
  const query = useQuery({
    queryKey: ["admin", "retention-metrics", weeks],
    queryFn: () =>
      axiosClient.get("/admin/retention-metrics", {
        params: { weeks },
      }) as Promise<RetentionMetrics>,
  });
  const data = query.data;
  const streak = data ? formatRate(data.streak) : null;

  return (
    <main className="mx-auto max-w-7xl space-y-6 pb-12">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Giữ chân & gia hạn
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Học viên có quay lại học không, và có mua tiếp gói khi hết hạn
            không. Tuần tính từ thứ Hai, theo giờ Việt Nam.
          </p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Khoảng thời gian">
          {WEEK_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={weeks === option}
              onClick={() => setWeeks(option)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                weeks === option
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {option} tuần
            </button>
          ))}
        </div>
      </header>

      {query.isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-slate-500" />
        </div>
      ) : query.isError || !data ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-rose-700 shadow-sm">
          <AlertCircle className="mx-auto mb-2 size-8" />
          Không tải được chỉ số giữ chân.
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Chuỗi học từ {data.streak.days} ngày trở lên
            </h2>
            <p className="mt-2 text-3xl font-bold tabular-nums text-slate-950">
              {streak?.percent}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {data.streak.hits}/{data.streak.eligible} học viên có học trong 30
              ngày qua
            </p>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Quay lại học theo tuần đăng ký
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Ngày N: học viên còn học vào ngày thứ N sau khi đăng ký hoặc
                muộn hơn. Ô có dấu gạch là nhóm chưa đủ ngày.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className={HEAD_ROW}>
                    <th className={TH}>Tuần đăng ký</th>
                    <th className={`${TH} text-right`}>Đăng ký</th>
                    <th className={`${TH} text-right`}>Ngày 1</th>
                    <th className={`${TH} text-right`}>Ngày 7</th>
                    <th className={`${TH} text-right`}>Ngày 30</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.cohorts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                        Không có học viên đăng ký trong {data.weeks} tuần qua.
                      </td>
                    </tr>
                  ) : (
                    data.cohorts.map((row) => (
                      <tr key={row.weekStart}>
                        <td className="px-5 py-3 font-medium text-slate-800">
                          {formatWeek(row.weekStart)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-800">
                          {row.signups}
                        </td>
                        <RateCell value={row.d1} />
                        <RateCell value={row.d7} />
                        <RateCell value={row.d30} />
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Gia hạn theo tuần hết hạn
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Chỉ tính gói học viên tự mua. Gia hạn: mua gói tiếp trước 7
                ngày sau khi hết hạn. Sớm: mua trước hoặc đúng ngày hết hạn,
                kể cả nâng Plus lên Pro. Quay lại: chưa gia hạn sau 7 ngày,
                mua lại trong 30 ngày.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className={HEAD_ROW}>
                    <th className={TH}>Tuần hết hạn</th>
                    <th className={`${TH} text-right`}>Hết hạn</th>
                    <th className={`${TH} text-right`}>Gia hạn</th>
                    <th className={`${TH} text-right`}>Sớm</th>
                    <th className={`${TH} text-right`}>Quay lại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.renewals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                        Không có gói nào hết hạn trong {data.weeks} tuần qua.
                      </td>
                    </tr>
                  ) : (
                    data.renewals.map((row) => (
                      <tr key={row.weekStart}>
                        <td className="px-5 py-3 font-medium text-slate-800">
                          {formatWeek(row.weekStart)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-800">
                          {row.ended}
                        </td>
                        <RateCell value={row.renewed} />
                        <RateCell value={row.early} />
                        <RateCell value={row.wonBack} />
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
