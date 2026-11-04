"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import {
  PROVIDER_NAMES,
  averageSeconds,
  formatTokens,
  formatUsd,
  okShare,
  type AiReviewCosts,
} from "@/lib/admin/aiReviewCosts";

const DAY_OPTIONS = [1, 7, 30];
const TH = "px-4 py-3";

/**
 * Tokens, calls and estimated paid-tier cost of the AI answer review, per
 * provider and model, from GET /admin/system-costs/ai-review.
 */
export function AiReviewCostsSection() {
  const [days, setDays] = useState(7);
  const query = useQuery({
    queryKey: ["admin", "ai-review-costs", days],
    queryFn: () =>
      axiosClient.get("/admin/system-costs/ai-review", {
        params: { days },
      }) as Promise<AiReviewCosts>,
  });
  const data = query.data;
  const spent = data?.spent.filter((s) => s.until) ?? [];
  const neuronDays = data?.perDay.filter((d) => d.cloudflareNeurons > 0) ?? [];

  return (
    <section
      aria-labelledby="ai-review-costs-title"
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="ai-review-costs-title" className="text-base font-bold text-slate-900">
            AI kiểm định đáp án theo nhà cung cấp
          </h2>
          <p className="mt-1 max-w-3xl text-xs text-slate-600">
            Token và lượt gọi của bước AI giải thử và viết giải thích cho đề TOEIC do AI soạn.
            Chi phí là ước tính theo giá gói trả phí niêm yết, để thấy mức chi khi rời gói miễn
            phí; chưa tính bước AI viết đề.
          </p>
        </div>
        <div className="flex shrink-0 gap-2" role="group" aria-label="Khoảng thời gian">
          {DAY_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={days === option}
              onClick={() => setDays(option)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                days === option
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {option === 1 ? "Hôm nay" : `${option} ngày`}
            </button>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-5 animate-spin text-slate-500" />
        </div>
      ) : query.isError || !data ? (
        <div className="p-6 text-center text-sm text-rose-700">
          <AlertCircle className="mx-auto mb-2 size-6" />
          Không tải được số liệu AI kiểm định.
        </div>
      ) : (
        <>
          {spent.length > 0 && (
            <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-900">
              Đang tạm bỏ qua vì hết hạn mức:{" "}
              {spent
                .map(
                  (s) =>
                    `${PROVIDER_NAMES[s.provider] ?? s.provider} (đến ${new Date(
                      s.until as string,
                    ).toLocaleString("vi-VN")})`,
                )
                .join(", ")}
            </div>
          )}
          {!data.telemetryAvailable && (
            <p className="border-b border-slate-200 px-5 py-3 text-xs text-slate-600">
              Redis chưa kết nối nên chưa có bộ đếm.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead>
                <tr className="whitespace-nowrap border-b border-slate-200 bg-slate-100/75 font-bold uppercase tracking-wider text-slate-700">
                  <th className={`${TH} pl-5`}>Nhà cung cấp / model</th>
                  <th className={`${TH} text-right`}>Lượt gọi</th>
                  <th className={`${TH} text-right`}>Đạt</th>
                  <th className={`${TH} text-right`}>Sai định dạng</th>
                  <th className={`${TH} text-right`}>Hết hạn mức / lỗi</th>
                  <th className={`${TH} text-right`}>Token vào / ra</th>
                  <th className={`${TH} text-right`}>TB / lượt</th>
                  <th className={`${TH} pr-5 text-right`}>Ước tính nếu trả phí</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data.models.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                      Chưa có lượt AI kiểm định nào trong khoảng này.
                    </td>
                  </tr>
                ) : (
                  data.models.map((row) => {
                    const share = okShare(row);
                    return (
                      <tr key={`${row.provider}|${row.model}`}>
                        <td className={`${TH} pl-5`}>
                          <div className="font-semibold text-slate-900">
                            {PROVIDER_NAMES[row.provider] ?? row.provider}
                          </div>
                          <div className="font-mono text-slate-500">{row.model}</div>
                        </td>
                        <td className={`${TH} text-right tabular-nums`}>{row.requests}</td>
                        <td className={`${TH} text-right tabular-nums`}>
                          {row.ok}
                          {share !== null && (
                            <span className="ml-1 text-slate-500">
                              ({Math.round(share * 100)}%)
                            </span>
                          )}
                        </td>
                        <td className={`${TH} text-right tabular-nums`}>{row.invalid}</td>
                        <td className={`${TH} text-right tabular-nums`}>{row.unavailable}</td>
                        <td className={`${TH} whitespace-nowrap text-right tabular-nums`}>
                          {row.tokensMissing ? (
                            <span className="text-amber-700">không có số liệu</span>
                          ) : (
                            <>
                              {formatTokens(row.inputTokens)} / {formatTokens(row.outputTokens)}
                            </>
                          )}
                          {row.neurons !== null && (
                            <div className="text-slate-500">
                              {formatTokens(row.neurons)} Neurons{" "}
                              {row.neuronsMeasured ? "(đo)" : "(ước tính)"}
                            </div>
                          )}
                        </td>
                        <td className={`${TH} text-right tabular-nums`}>{averageSeconds(row)}</td>
                        <td className={`${TH} pr-5 text-right font-semibold tabular-nums text-slate-900`}>
                          {formatUsd(row.costUsd)}
                          {row.costUsd === null && !row.tokensMissing && (
                            <div className="font-normal text-slate-500">chưa có bảng giá</div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-200 px-5 py-3 text-xs text-slate-600">
            Cloudflare miễn phí {formatTokens(data.cloudflareFreeNeuronsPerDay)} Neurons mỗi ngày
            (theo giờ UTC).{" "}
            {neuronDays.length > 0
              ? neuronDays
                  .map(
                    (d) =>
                      `${d.day}: ${formatTokens(d.cloudflareNeurons)} Neurons${
                        d.cloudflareOverFreeUsd > 0
                          ? `, vượt ${formatUsd(d.cloudflareOverFreeUsd)}`
                          : ""
                      }`,
                  )
                  .join("; ")
              : "Chưa ghi nhận Neurons nào từ số token Cloudflare trả về."}
          </p>
        </>
      )}
    </section>
  );
}
