"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CircleAlert,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";

type Task = {
  id: string;
  type: string;
  severity: "REQUIRED" | "RECOMMENDED" | "OPTIONAL";
  label: string;
  target: { lessonTitle?: string };
  selectedByDefault: boolean;
  status: "PLANNED" | "RUNNING" | "CANDIDATE_READY" | "FAILED" | "APPLIED";
  candidate?: any;
  error?: string;
};

type Workspace = {
  id: string;
  audit: {
    lessons: Array<{
      id: number;
      title: string;
      contentReady: boolean;
      guidedPracticeReady: boolean;
      finalCheckReady: boolean;
      hasImage: boolean;
    }>;
    summary: { ready: boolean; needsAttention: number; optional: number };
  };
  tasks: Task[];
};

const labels = {
  REQUIRED: "Cần hoàn thiện",
  RECOMMENDED: "Nên bổ sung",
  OPTIONAL: "Tùy chọn",
} as const;

function candidateSummary(task: Task) {
  const candidate = task.candidate?.candidate;
  if (task.type.includes("IMAGE") || task.type.includes("COVER"))
    return candidate
      ? "Đã có ảnh đề xuất để xem và dùng riêng"
      : "Đã xử lý đề xuất ảnh";
  if (candidate?.sections)
    return `${candidate.sections.length} mục nội dung đề xuất`;
  if (candidate?.guidedPractice)
    return `${candidate.guidedPractice.questions?.length || 0} câu luyện tập đề xuất`;
  if (candidate?.finalCheck)
    return `${candidate.finalCheck.questions?.length || 0} câu kiểm tra đề xuất`;
  if (candidate?.lessons) return `${candidate.lessons.length} bài học đề xuất`;
  return "Kết quả đã sẵn sàng để xem xét";
}

export function CourseAiWorkspaceDialog({
  courseId,
  courseStatus,
  open,
  onClose,
  onApplied,
}: {
  courseId: number;
  courseStatus: string;
  open: boolean;
  onClose: () => void;
  onApplied: () => void;
}) {
  const isReadOnly = courseStatus === "PUBLISHED";
  const storageKey = `course-ai-workspace:${courseId}`;
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [applyingTaskId, setApplyingTaskId] = useState<string | null>(null);

  const refresh = async (workspaceId: string) => {
    const data = (await axiosClient.get(
      `/admin/courses/${courseId}/studio/ai-workspace/${workspaceId}`,
    )) as unknown as Workspace;
    setWorkspace(data);
    setSelected((current) =>
      current.filter((id) =>
        data.tasks.some((task) => task.id === id && task.status === "PLANNED"),
      ),
    );
    return data;
  };

  useEffect(() => {
    if (!open) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const remembered = window.sessionStorage.getItem(storageKey);
        let data: Workspace | null = null;
        if (remembered) {
          try {
            data = await refresh(remembered);
          } catch {
            window.sessionStorage.removeItem(storageKey);
          }
        }
        if (!data) {
          data = (await axiosClient.post(
            `/admin/courses/${courseId}/studio/ai-workspace`,
          )) as unknown as Workspace;
          window.sessionStorage.setItem(storageKey, data.id);
          if (active) {
            setWorkspace(data);
            setSelected(
              data.tasks
                .filter(
                  (task) => task.selectedByDefault && task.status === "PLANNED",
                )
                .map((task) => task.id),
            );
          }
        }
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Không thể phân tích khóa học."));
        onClose();
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
    // A workspace belongs to its course; reopening should restore the same short-lived session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, courseId]);

  const grouped = useMemo(() => {
    const result: Record<Task["severity"], Task[]> = {
      REQUIRED: [],
      RECOMMENDED: [],
      OPTIONAL: [],
    };
    workspace?.tasks.forEach((task) => result[task.severity].push(task));
    return result;
  }, [workspace]);

  const toggle = (task: Task) =>
    setSelected((current) =>
      current.includes(task.id)
        ? current.filter((id) => id !== task.id)
        : [...current, task.id],
    );
  const selectSeverity = (severity: Task["severity"]) =>
    setSelected((current) =>
      Array.from(
        new Set([
          ...current,
          ...grouped[severity]
            .filter((task) => task.status === "PLANNED")
            .map((task) => task.id),
        ]),
      ),
    );

  const run = async () => {
    if (!workspace || !selected.length || isReadOnly) return;
    setRunning(true);
    try {
      const data = (await axiosClient.post(
        `/admin/courses/${courseId}/studio/ai-workspace/${workspace.id}/run`,
        { taskIds: selected },
      )) as unknown as Workspace;
      setWorkspace(data);
      setSelected([]);
      toast.success(
        "Đã xử lý các tác vụ đã chọn. Hãy xem kết quả trước khi áp dụng.",
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể chạy các tác vụ AI."));
    } finally {
      setRunning(false);
    }
  };

  const retry = async (task: Task) => {
    if (!workspace || isReadOnly) return;
    setRunning(true);
    try {
      const data = (await axiosClient.post(
        `/admin/courses/${courseId}/studio/ai-workspace/${workspace.id}/tasks/${task.id}/retry`,
      )) as unknown as Workspace;
      setWorkspace(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể thử lại tác vụ."));
    } finally {
      setRunning(false);
    }
  };

  const apply = async (task: Task) => {
    if (!workspace || isReadOnly) return;
    setApplyingTaskId(task.id);
    try {
      const result = (await axiosClient.post(
        `/admin/courses/${courseId}/studio/ai-workspace/${workspace.id}/tasks/${task.id}/apply`,
      )) as unknown as { workspace: Workspace };
      setWorkspace(result.workspace);
      onApplied();
      toast.success("Đã áp dụng riêng kết quả đã chọn vào bản nháp.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể áp dụng kết quả này."));
    } finally {
      setApplyingTaskId(null);
    }
  };

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-ai-workspace-title"
        className="flex max-h-[min(48rem,calc(100dvh-2rem))] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Trợ lý biên soạn
            </p>
            <h2
              id="course-ai-workspace-title"
              className="mt-1 text-lg font-bold text-slate-950"
            >
              AI hỗ trợ hoàn thiện khóa học
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              AI chỉ tạo gợi ý. Nội dung chỉ đổi khi bạn áp dụng từng kết quả
              vào bản nháp.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hỗ trợ hoàn thiện khóa học"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {loading || !workspace ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 animate-spin" size={18} />
              Đang phân tích khóa học…
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Bài học</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {workspace.audit.lessons.length}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Cần xử lý</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {workspace.audit.summary.needsAttention}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Đề xuất tùy chọn</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {workspace.audit.summary.optional}
                  </p>
                </div>
              </div>
              {isReadOnly && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Đây là kết quả kiểm tra chỉ đọc. Chuyển khóa học về bản nháp
                  để chạy hoặc áp dụng gợi ý AI.
                </div>
              )}
              {(["REQUIRED", "RECOMMENDED", "OPTIONAL"] as const).map(
                (severity) =>
                  grouped[severity].length > 0 && (
                    <section key={severity} className="mt-6">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-bold text-slate-900">
                          {labels[severity]}
                        </h3>
                        {severity !== "OPTIONAL" && !isReadOnly && (
                          <button
                            type="button"
                            onClick={() => selectSeverity(severity)}
                            className="text-xs font-semibold text-slate-700 underline underline-offset-2"
                          >
                            Chọn nhóm này
                          </button>
                        )}
                      </div>
                      <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                        {grouped[severity].map((task) => (
                          <div key={task.id} className="p-3">
                            <div className="flex items-start gap-3">
                              {task.status === "PLANNED" ? (
                                <input
                                  aria-label={`Chọn ${task.label}`}
                                  type="checkbox"
                                  checked={selected.includes(task.id)}
                                  disabled={isReadOnly}
                                  onChange={() => toggle(task)}
                                  className="mt-1 h-4 w-4 accent-slate-900"
                                />
                              ) : (
                                <span className="mt-0.5 text-emerald-600">
                                  {task.status === "FAILED" ? (
                                    <CircleAlert
                                      size={17}
                                      className="text-rose-600"
                                    />
                                  ) : (
                                    <Check size={17} />
                                  )}
                                </span>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-slate-900">
                                  {task.label}
                                  {task.target.lessonTitle ? (
                                    <span className="font-normal text-slate-500">
                                      {" "}
                                      · {task.target.lessonTitle}
                                    </span>
                                  ) : null}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  {task.status === "PLANNED"
                                    ? "Chưa chạy"
                                    : task.status === "CANDIDATE_READY"
                                      ? candidateSummary(task)
                                      : task.status === "APPLIED"
                                        ? "Đã áp dụng vào bản nháp"
                                        : task.status === "FAILED"
                                          ? task.error
                                          : "Đang xử lý"}
                                </p>
                                {task.status === "CANDIDATE_READY" && (
                                  <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                                    {task.candidate?.candidate?.pedagogyPlan ? (
                                      <p>
                                        {task.candidate.candidate.pedagogyPlan}
                                      </p>
                                    ) : (
                                      <p>{candidateSummary(task)}</p>
                                    )}
                                    {task.candidate?.candidate?.previewUrl && (
                                      <img
                                        src={
                                          task.candidate.candidate.previewUrl
                                        }
                                        alt="Ảnh do AI đề xuất, chưa áp dụng"
                                        className="mt-2 h-28 w-44 rounded-md border border-slate-200 object-cover"
                                      />
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => void apply(task)}
                                      disabled={
                                        isReadOnly || applyingTaskId === task.id
                                      }
                                      className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50"
                                    >
                                      {applyingTaskId === task.id ? (
                                        <Loader2
                                          size={13}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <Check size={13} />
                                      )}
                                      Dùng kết quả này
                                    </button>
                                  </div>
                                )}
                              </div>
                              {task.status === "FAILED" && (
                                <button
                                  type="button"
                                  onClick={() => void retry(task)}
                                  disabled={isReadOnly || running}
                                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  <RefreshCw size={13} />
                                  Thử lại
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ),
              )}
              {workspace.tasks.length === 0 && (
                <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <ClipboardCheck className="mb-2" size={20} />
                  Khóa học hiện không có hạng mục bắt buộc cần AI hỗ trợ.
                </div>
              )}
            </>
          )}
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 sm:px-6">
          <p className="text-xs text-slate-500">
            {selected.length} tác vụ đã chọn · kết quả luôn cần bạn xem và xác
            nhận.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => void run()}
              disabled={isReadOnly || !selected.length || running || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {running && <Loader2 size={15} className="animate-spin" />}Chạy
              các mục đã chọn
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
