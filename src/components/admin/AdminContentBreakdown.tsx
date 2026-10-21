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
    { label: "Từ vựng", count: content.vocab, unit: "chủ đề", color: "bg-amber-500" },
    { label: "Ngữ pháp", count: content.grammar, unit: "chủ đề", color: "bg-emerald-600" },
    { label: "Bài luyện & câu hỏi", count: content.quizzes, unit: "bài", color: "bg-blue-600" },
    { label: "Bài nói", count: content.speaking, unit: "bài luyện", color: "bg-violet-600" },
    { label: "Tài nguyên khác", count: content.media, unit: "mục", color: "bg-slate-500" },
  ];

  return (
    <section aria-labelledby="content-breakdown-heading" className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 id="content-breakdown-heading" className="text-base font-bold text-slate-950">Nội dung học tập</h2>
          <p className="mt-1 text-sm text-slate-500">Số lượng nội dung hiện có theo từng khu vực.</p>
        </div>
        <p className="text-sm text-slate-500">Tổng: <span className="font-semibold text-slate-950">{total.toLocaleString()} mục</span></p>
      </header>

      <div className="flex h-2 overflow-hidden bg-slate-100" aria-label={`Thanh tỷ trọng của ${total} mục nội dung; màu tương ứng được ghi ở từng dòng bên dưới`}>
        {categories.map((category) => category.count > 0 && (
          <span key={category.label} className={category.color} style={{ width: `${(category.count / total) * 100}%` }} title={`${category.label}: ${category.count} ${category.unit}`} />
        ))}
      </div>

      <dl className="divide-y divide-slate-100">
        {categories.map((category) => {
          return (
            <div key={category.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3">
              <dt className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <span className={`size-2.5 shrink-0 ${category.color}`} aria-hidden="true" />
                {category.label}
              </dt>
              <dd className="text-sm text-slate-500">{category.count.toLocaleString()} {category.unit}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
