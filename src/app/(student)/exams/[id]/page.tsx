"use client";

import { use, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { examService } from "@/lib/api/services/exam.service";

export default function LearnerExamEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = use(params);
  const id = Number(rawId);
  const router = useRouter();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["exam-product", id],
    queryFn: () => examService.getById(id),
    enabled: Number.isInteger(id) && id > 0,
  });

  useEffect(() => {
    if (!data) return;
    if (data.variantCode === "TOEIC_LR" && data.runtimeId) {
      router.replace(`/toeic/${data.runtimeId}`);
      return;
    }
    if (data.assessment?.id) {
      router.replace(`/toeic/assessments/${data.assessment.id}`);
    }
  }, [data, router]);

  if (isError || (!isLoading && !data)) {
    return (
      <main className="mx-auto max-w-xl px-5 py-24 text-center text-sm text-slate-600">
        Không thể mở đề luyện tập này.
      </main>
    );
  }

  return (
    <main className="flex min-h-[55vh] items-center justify-center">
      <Loader2 className="animate-spin text-amber-600" aria-label="Đang mở đề luyện tập" />
    </main>
  );
}
