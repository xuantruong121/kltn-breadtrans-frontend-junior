"use client";

import { contentBreakdownRows, type ContentBreakdown } from "./adminDashboardChartUtils";

interface AdminContentBreakdownProps {
  data?: Partial<ContentBreakdown> | null;
}

/**
 * The learning content on the system, one area per row in its own unit
 * (owner 2026-11-26: a total over decks, topics, lessons and exercises, and
 * the percentage bar built on it, meant nothing). Exams have their own row.
 */
export default function AdminContentBreakdown({ data }: AdminContentBreakdownProps) {
  const rows = contentBreakdownRows(data);

  return (
    <section aria-labelledby="content-breakdown-heading">
      <h2 id="content-breakdown-heading" className="text-base font-semibold text-slate-950 dark:text-slate-100">
        Nội dung học tập
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Số bài theo từng khu, gồm cả bản nháp.
      </p>
      <dl className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="text-sm text-slate-700 dark:text-slate-300">{row.label}</dt>
            <dd className="text-sm tabular-nums text-slate-950 dark:text-slate-100">
              <span className="font-semibold">{row.count.toLocaleString("vi-VN")}</span>{" "}
              <span className="text-slate-600 dark:text-slate-400">{row.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
