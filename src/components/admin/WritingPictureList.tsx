"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import axiosClient from "@/lib/api/axiosClient";
import { AdminImageThumb } from "@/components/admin/AdminImageThumb";
import { quizDisplayTitle } from "@/lib/catalog/displayTitles";

export type WritingPictureCard = {
  quizId: number;
  title: string;
  questionId: number;
  position: number;
  total: number;
  imageUrl: string | null;
  keywords: string[];
  isPremiumContent: boolean;
  level: string | null;
  /** Why learners do not see this picture; null when they do. */
  hiddenReason: string | null;
};

/** The picture tab of learners' Writing page, one card per picture. */
export function WritingPictureList() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-writing-pictures"],
    queryFn: async () =>
      (await axiosClient.get("/admin/skill-content/writing/pictures")) as unknown as WritingPictureCard[],
  });
  const cards = data ?? [];
  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return cards;
    return cards.filter((card) =>
      `${quizDisplayTitle(card.quizId, card.title)} ${card.keywords.join(" ")}`.toLowerCase().includes(needle),
    );
  }, [cards, search]);
  const visible = cards.filter((card) => !card.hiddenReason).length;

  if (isLoading)
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Loader2 className="animate-spin text-slate-500" aria-label="Đang tải" />
      </div>
    );

  return (
    <section aria-label="Viết câu theo tranh" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm tabular-nums text-slate-600">
          {cards.length} tranh · học viên thấy {visible} tranh
        </p>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm theo tên bài hoặc từ khoá"
          aria-label="Tìm tranh"
          className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm sm:w-72"
        />
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((card) => (
          <li key={card.questionId} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            {card.imageUrl ? (
              <AdminImageThumb src={card.imageUrl} alt={`Tranh ${card.keywords.join(", ")}`} className="h-24 w-32 shrink-0" />
            ) : (
              <span className="flex h-24 w-32 shrink-0 items-center justify-center rounded-lg border border-dashed border-amber-300 bg-amber-50 text-sm font-semibold text-amber-800">
                Chưa có ảnh
              </span>
            )}
            <div className="min-w-0 flex-1">
              <Link href={`/admin/writing/${card.quizId}`} className="font-semibold text-slate-950 hover:text-blue-700">
                {card.keywords.join(" / ") || "Chưa có từ khoá"}
              </Link>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                {quizDisplayTitle(card.quizId, card.title)} · tranh {card.position}/{card.total}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {card.level ?? "Chưa có mức"} · {card.isPremiumContent ? "Trả phí" : "Miễn phí"}
              </p>
              {card.hiddenReason && (
                <p className="mt-1 text-sm font-semibold text-amber-800">
                  Học viên chưa thấy: {card.hiddenReason}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
      {!shown.length && <p className="text-sm text-slate-600">Không có tranh nào khớp.</p>}
    </section>
  );
}
