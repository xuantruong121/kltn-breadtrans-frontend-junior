"use client";

import { use, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  examAiService,
  type ExamAiCandidateGroup,
  type ExamAiCandidateTask,
} from "@/lib/api/services/examAi.service";
import {
  candidateGroupState,
  matchesCandidateFilter,
  selectAllValidKeys,
  selectUnappliedKeys,
  toggleKey,
  type CandidateFilter as Filter,
} from "@/lib/examAi/candidateWorkspaceLogic";

function partLabel(part: number) {
  const listening = [1, 2, 3, 4].includes(part);
  return `${listening ? "Listening" : "Reading"} · Part ${part}`;
}

function groupState(g: { issues: string[]; applied: boolean }) {
  const tone = candidateGroupState(g);
  const label =
    tone === "applied"
      ? "Đã áp dụng"
      : tone === "warning"
        ? "Có cảnh báo"
        : "Hợp lệ · chưa áp dụng";
  return { label, tone };
}

const toneClass: Record<string, string> = {
  applied:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  ready:
    "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export default function ExamAiCandidateWorkspacePage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("FLAGGED");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});

  const statusQuery = useQuery({
    queryKey: ["exam-ai-status", jobId],
    queryFn: () => examAiService.status(jobId),
    refetchInterval: (q) =>
      q.state.data &&
      ["QUEUED", "PROCESSING", "PUBLISHING"].includes(q.state.data.status)
        ? 2000
        : false,
  });

  const candidateQuery = useQuery({
    queryKey: ["exam-ai-candidate", jobId],
    queryFn: () => examAiService.getCandidate(jobId),
    enabled: !!statusQuery.data,
  });

  const candidate = candidateQuery.data;

  const lrByPart = useMemo(() => {
    const map = new Map<number, ExamAiCandidateGroup[]>();
    (candidate?.lrGroups ?? []).forEach((g) => {
      const list = map.get(g.part) ?? [];
      list.push(g);
      map.set(g.part, list);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [candidate]);

  const matchesFilter = (item: { issues: string[]; applied: boolean }) =>
    matchesCandidateFilter(item, filter);

  const totalItems =
    (candidate?.lrGroups.length ?? 0) +
    (candidate?.speaking.length ?? 0) +
    (candidate?.writing.length ?? 0);
  const allKeys = useMemo(
    () => [
      ...(candidate?.lrGroups.map((g) => g.candidateKey) ?? []),
      ...(candidate?.speaking.length ? ["SPEAKING"] : []),
      ...(candidate?.writing.length ? ["WRITING"] : []),
    ],
    [candidate],
  );
  const validUnappliedKeys = useMemo(
    () => selectAllValidKeys(candidate?.lrGroups ?? []),
    [candidate],
  );

  const toggle = (key: string) =>
    setSelected((prev) => toggleKey(prev, key));

  const selectPart = (part: number) => {
    const keys = selectUnappliedKeys(
      lrByPart.find(([p]) => p === part)?.[1] ?? [],
    );
    setSelected((prev) => new Set([...prev, ...keys]));
  };

  const selectAllValid = () =>
    setSelected((prev) => new Set([...prev, ...validUnappliedKeys]));

  const [applying, setApplying] = useState(false);
  const runApply = async () => {
    if (!selected.size) return;
    setApplying(true);
    try {
      await examAiService.apply(jobId, Array.from(selected));
      toast.success(`Đã áp dụng ${selected.size} nội dung vào bản nháp`);
      setSelected(new Set());
      await queryClient.invalidateQueries({
        queryKey: ["exam-ai-candidate", jobId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["exam-ai-status", jobId],
      });
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ?? "Không thể áp dụng candidate đã chọn",
      );
    } finally {
      setApplying(false);
    }
  };

  const startEdit = (group: ExamAiCandidateGroup) => {
    setEditingKey(group.candidateKey);
    setEditDraft({
      transcript: group.transcript ?? "",
      passageText: group.passageText ?? "",
      imageBrief: group.imageBrief ?? "",
    });
  };

  const saveEdit = async (candidateKey: string) => {
    try {
      await examAiService.updateCandidate(jobId, candidateKey, editDraft);
      toast.success("Đã lưu chỉnh sửa candidate");
      setEditingKey(null);
      await queryClient.invalidateQueries({
        queryKey: ["exam-ai-candidate", jobId],
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Không thể lưu chỉnh sửa");
    }
  };

  const retryJob = async () => {
    try {
      await examAiService.retry(jobId);
      toast.success("Đã yêu cầu tạo lại");
      await queryClient.invalidateQueries({
        queryKey: ["exam-ai-status", jobId],
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Không thể thử lại");
    }
  };

  if (statusQuery.isLoading || candidateQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  const status = statusQuery.data;
  const isProcessing =
    status && ["QUEUED", "PROCESSING"].includes(status.status);
  const isFailed = status?.status === "FAILED";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <button
        type="button"
        onClick={() => router.push("/admin/exams")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <ArrowLeft size={15} /> Quay lại danh sách đề thi
      </button>

      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        Candidate AI — Luyện đề
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Nội dung AI sinh ra chỉ là gợi ý. Chọn nội dung cần dùng rồi Áp dụng
        vào bản nháp — chưa xuất bản.
      </p>

      {isProcessing && (
        <div className="mt-6 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <Loader2 size={15} className="animate-spin" />
          Đang tạo candidate — trang sẽ tự cập nhật...
        </div>
      )}
      {isFailed && (
        <div className="mt-6 flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <span>Tạo candidate thất bại: {status?.error ?? "Lỗi không xác định"}</span>
          <button
            type="button"
            onClick={retryJob}
            className="rounded-md border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-slate-900"
          >
            Thử lại
          </button>
        </div>
      )}

      {candidate && !isProcessing && (
        <>
          {/* Summary banner */}
          <div className="mt-6 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tổng nội dung
              </p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {totalItems}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cần kiểm tra
              </p>
              <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                {candidate.flaggedCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Đã áp dụng
              </p>
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {candidate.appliedCandidateKeys.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Đã chọn
              </p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {selected.size}
              </p>
            </div>
          </div>

          {/* Filters + bulk select */}
          <div className="mt-5 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
            {(["FLAGGED", "ALL"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`border-b-2 px-1 pb-2 text-sm font-medium ${filter === f ? "border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100" : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"}`}
              >
                {f === "FLAGGED" ? "Cần kiểm tra" : "Tất cả"}
              </button>
            ))}
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={selectAllValid}
                disabled={!validUnappliedKeys.length}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Chọn tất cả hợp lệ
              </button>
              <button
                type="button"
                onClick={() => setSelected(new Set(allKeys))}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Chọn tất cả
              </button>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          {/* Listening/Reading groups by Part */}
          {lrByPart.map(([part, groups]) => {
            const visible = groups.filter(matchesFilter);
            if (!visible.length) return null;
            return (
              <section key={part} className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {partLabel(part)}
                  </h2>
                  <button
                    type="button"
                    onClick={() => selectPart(part)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                  >
                    Chọn cả Part
                  </button>
                </div>
                <div className="space-y-3">
                  {visible.map((group) => {
                    const state = groupState(group);
                    const isEditing = editingKey === group.candidateKey;
                    return (
                      <div
                        key={group.candidateKey}
                        className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <label className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                            <input
                              type="checkbox"
                              checked={selected.has(group.candidateKey)}
                              disabled={group.applied}
                              onChange={() => toggle(group.candidateKey)}
                            />
                            Nhóm {group.groupOrder} · {group.questions.length}{" "}
                            câu
                          </label>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneClass[state.tone]}`}
                            >
                              {state.label}
                            </span>
                            {!group.applied && (
                              <button
                                type="button"
                                onClick={() =>
                                  isEditing
                                    ? setEditingKey(null)
                                    : startEdit(group)
                                }
                                className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                              >
                                {isEditing ? "Đóng" : "Chỉnh sửa"}
                              </button>
                            )}
                          </div>
                        </div>
                        {group.issues.length > 0 && (
                          <ul className="mt-2 flex flex-wrap gap-1.5">
                            {group.issues.map((issue) => (
                              <li
                                key={issue}
                                className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                              >
                                {issue}
                              </li>
                            ))}
                          </ul>
                        )}

                        {isEditing ? (
                          <div className="mt-3 space-y-2">
                            {group.transcript !== null && (
                              <div>
                                <label className="text-xs text-slate-500 dark:text-slate-400">
                                  Transcript
                                </label>
                                <textarea
                                  className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                                  rows={2}
                                  value={editDraft.transcript ?? ""}
                                  onChange={(e) =>
                                    setEditDraft((d) => ({
                                      ...d,
                                      transcript: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                            )}
                            {group.passageText !== null && (
                              <div>
                                <label className="text-xs text-slate-500 dark:text-slate-400">
                                  Đoạn văn
                                </label>
                                <textarea
                                  className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                                  rows={3}
                                  value={editDraft.passageText ?? ""}
                                  onChange={(e) =>
                                    setEditDraft((d) => ({
                                      ...d,
                                      passageText: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                            )}
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => saveEdit(group.candidateKey)}
                                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
                              >
                                Lưu
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {group.passageText && (
                              <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                                {group.passageText}
                              </p>
                            )}
                            <ul className="mt-2 space-y-1">
                              {group.questions.map((q) => (
                                <li
                                  key={q.questionNumber}
                                  className="text-sm text-slate-700 dark:text-slate-300"
                                >
                                  Câu {q.questionNumber}: {q.text ?? "(Part 1/2 — chỉ nghe)"}
                                  {q.issues.length > 0 && (
                                    <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                                      {q.issues.join(", ")}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {/* Speaking / Writing blocks */}
          {(["speaking", "writing"] as const).map((skill) => {
            const tasks: ExamAiCandidateTask[] = candidate[skill];
            const visible = tasks.filter(matchesFilter);
            if (!visible.length) return null;
            const blockKey = skill === "speaking" ? "SPEAKING" : "WRITING";
            return (
              <section key={skill} className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {skill === "speaking" ? "Speaking" : "Writing"}
                  </h2>
                  {!tasks.every((t) => t.applied) && (
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={selected.has(blockKey)}
                        onChange={() => toggle(blockKey)}
                      />
                      Chọn cả {skill === "speaking" ? "Speaking" : "Writing"}
                    </label>
                  )}
                </div>
                <div className="space-y-3">
                  {visible.map((task) => {
                    const state = groupState(task);
                    return (
                      <div
                        key={task.candidateKey}
                        className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                            Task {task.taskNumber}: {task.title ?? "(chưa có tiêu đề)"}
                          </p>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneClass[state.tone]}`}
                          >
                            {state.label}
                          </span>
                        </div>
                        {"prompt" in task && task.prompt && (
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {task.prompt}
                          </p>
                        )}
                        {task.issues.length > 0 && (
                          <ul className="mt-2 flex flex-wrap gap-1.5">
                            {task.issues.map((issue) => (
                              <li
                                key={issue}
                                className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                              >
                                {issue}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {/* Apply CTA */}
          <div className="sticky bottom-4 mt-8 flex items-center justify-between rounded-lg border border-slate-200 bg-white/95 p-4 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nội dung chỉ được áp dụng vào bản nháp, chưa được xuất bản.
            </p>
            <button
              type="button"
              onClick={runApply}
              disabled={!selected.size || applying}
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
            >
              {applying && <Loader2 size={14} className="animate-spin" />}
              Áp dụng {selected.size} nội dung đã chọn
            </button>
          </div>
        </>
      )}
    </div>
  );
}
