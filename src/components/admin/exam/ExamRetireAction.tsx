"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { adminExamService } from "@/lib/api/services/adminExam.service";
import { getApiErrorMessage } from "@/lib/utils/apiError";

export const examStatusLabel = (status?: string) =>
  ({ PUBLISHED: "Đã xuất bản", ARCHIVED: "Ngừng phát hành" })[status || ""] ||
  "Bản nháp";

/** An exam with attempts cannot go back to draft; it can only stop being offered. */
export function ExamRetireAction({
  examId,
  status,
  sharedLrExams = 0,
  onChanged,
}: {
  examId: number;
  status: string;
  sharedLrExams?: number;
  onChanged: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const change = useMutation({
    mutationFn: (action: "retire" | "restore") =>
      action === "retire"
        ? adminExamService.retire(examId)
        : adminExamService.restore(examId),
    onSuccess: (_data, action) => {
      toast.success(
        action === "retire"
          ? "Đã ngừng phát hành đề thi."
          : "Đã phát hành lại đề thi.",
      );
      setConfirming(false);
      onChanged();
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, "Không thể đổi trạng thái đề thi")),
  });

  if (status === "ARCHIVED")
    return (
      <button
        type="button"
        onClick={() => change.mutate("restore")}
        disabled={change.isPending}
        className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        Phát hành lại
      </button>
    );

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-rose-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
      >
        Ngừng phát hành
      </button>
      <ConfirmDialog
        open={confirming}
        title="Ngừng phát hành đề này?"
        description={`Học viên mới không thấy đề này nữa. Lượt đang làm vẫn nộp được và lượt đã làm vẫn xem lại được.${sharedLrExams > 0 ? " Đề 4 kỹ năng dùng chung phần Listening & Reading với đề này cũng ẩn theo." : ""} Có thể phát hành lại bất cứ lúc nào.`}
        confirmLabel="Ngừng phát hành"
        isPending={change.isPending}
        onConfirm={() => change.mutate("retire")}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
