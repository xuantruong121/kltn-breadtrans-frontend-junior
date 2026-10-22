"use client";

interface ContentBreakdown {
  vocab: number;
  grammar: number;
  quizzes: number;
  speaking: number;
  media: number;
}

interface AdminContentBreakdownProps {
  data?: ContentBreakdown;
}

export default function AdminContentBreakdown({ data }: AdminContentBreakdownProps) {
  const content = data ?? { vocab: 0, grammar: 0, quizzes: 0, speaking: 0, media: 0 };
  const total = content.vocab + content.grammar + content.quizzes + content.speaking + content.media;
  const categories = [
    { label: "Từ vựng", count: content.vocab, unit: "chủ đề", color: "bg-amber-500", ringColor: "ring-amber-500/20" },
    { label: "Ngữ pháp", count: content.grammar, unit: "chủ đề", color: "bg-emerald-600", ringColor: "ring-emerald-600/20" },
    { label: "Bài luyện & câu hỏi", count: content.quizzes, unit: "bài", color: "bg-blue-600", ringColor: "ring-blue-600/20" },
    { label: "Bài nói", count: content.speaking, unit: "bài luyện", color: "bg-indigo-600", ringColor: "ring-indigo-600/20" },
    { label: "Tài nguyên khác", count: content.media, unit: "tệp", color: "bg-slate-500", ringColor: "ring-slate-500/20" },
  ];

  return (
    <section aria-labelledby="content-breakdown-heading" className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 id="content-breakdown-heading" className="text-base font-bold text-slate-950 dark:text-slate-100">
            Nội dung học tập
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Tổng quan số lượng tài nguyên học thuật đang vận hành trên hệ thống.
          </p>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tổng số:{" "}
          <span className="font-mono font-bold tabular-nums text-slate-950 dark:text-slate-100">
            {total.toLocaleString("vi-VN")}
          </span>{" "}
          mục
        </p>
      </header>

      {total > 0 ? (
        <div
          className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 p-0.5"
          aria-label={`Thanh phân bố của ${total} mục tài nguyên`}
        >
          {categories.map((cat) => {
            if (cat.count <= 0) return null;
            const pct = (cat.count / total) * 100;
            return (
              <span
                key={cat.label}
                className={`${cat.color} first:rounded-l-full last:rounded-r-full transition-all`}
                style={{ width: `${pct}%` }}
                title={`${cat.label}: ${cat.count.toLocaleString("vi-VN")} ${cat.unit} (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>
      ) : (
        <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800" />
      )}

      <dl className="divide-y divide-slate-100 dark:divide-slate-800/80">
        {categories.map((cat) => {
          const pct = total > 0 ? ((cat.count / total) * 100).toFixed(1) : "0.0";
          return (
            <div
              key={cat.label}
              className="flex items-center justify-between gap-4 py-2.5 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-1 rounded-md"
            >
              <dt className="flex items-center gap-2.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                <span className={`size-2.5 rounded-full ${cat.color}`} aria-hidden="true" />
                {cat.label}
              </dt>
              <dd className="flex items-center gap-3 text-sm">
                <span className="font-mono text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                  {pct}%
                </span>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {cat.count.toLocaleString("vi-VN")}{" "}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    {cat.unit}
                  </span>
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

