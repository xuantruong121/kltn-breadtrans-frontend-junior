"use client";

import { use } from "react";
import { ToeicLrResult } from "@/components/toeic/result/ToeicLrResult";

export default function ToeicResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId: rawAttemptId } = use(params);
  const attemptId = Number(rawAttemptId);
  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">
      <ToeicLrResult attemptId={attemptId} />
    </main>
  );
}
