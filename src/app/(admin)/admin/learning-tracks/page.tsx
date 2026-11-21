"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BTN_DARK, BTN_SECONDARY } from "@/components/admin/cmsButtons";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  EMPTY_TRACK_DRAFT,
  TRACK_ACTION_LABEL,
  editTrackBody,
  movedTrackOrder,
  newTrackBody,
  trackRowActions,
  trackStats,
  type TrackDraft,
  type TrackRowAction,
} from "@/lib/admin/learningTracks";
import { learningTrackService } from "@/lib/api/services/learningTrack.service";
import type { AdminLearningTrack, TrackUsage } from "@/lib/learning-path/tracks";
import {
  ADMIN_LEARNING_TRACKS_KEY,
  LEARNING_TRACKS_KEY,
  useAdminLearningTracks,
} from "@/lib/learning-path/useLearningTracks";
import { TERMS } from "@/lib/ui/terms";
import { getApiErrorMessage } from "@/lib/utils/apiError";

const HEAD = "px-4 py-3 text-xs font-semibold";
const CELL = "px-4 py-3 align-top";
const INPUT =
  "mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";
const ROW_BUTTON =
  "min-h-9 cursor-pointer rounded-lg border px-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait";
const ROW_TONE = {
  plain: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  danger: "border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
  save: "border-slate-950 bg-slate-950 text-white hover:bg-slate-800",
};

/** The count columns: tagged items per skill, then the learners who chose the track. */
const USAGE_COLUMNS: Array<{ key: keyof TrackUsage; label: string }> = [
  { key: "listening", label: TERMS.listening },
  { key: "reading", label: TERMS.reading },
  { key: "writing", label: TERMS.writing },
  { key: "speaking", label: TERMS.speaking },
  { key: "learners", label: "Học viên" },
];

type RowEdit = { code: string; name: string; description: string };

/**
 * Lĩnh vực (owner 2026-11-21): the career or study tracks learners choose at
 * onboarding and admins tag content with. Admins add, rename, order, turn
 * off and delete them here. GENERAL ("Chung") is the default and stays on.
 */
export default function LearningTracksPage() {
  const queryClient = useQueryClient();
  const tracksQuery = useAdminLearningTracks();
  const tracks = tracksQuery.data ?? [];
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<TrackDraft>(EMPTY_TRACK_DRAFT);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editing, setEditing] = useState<RowEdit | null>(null);
  const [rowError, setRowError] = useState<{ code: string; message: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminLearningTrack | null>(null);

  // Onboarding and the goal editor read the public list, so it changes too.
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ADMIN_LEARNING_TRACKS_KEY }),
      queryClient.invalidateQueries({ queryKey: LEARNING_TRACKS_KEY }),
    ]);

  const closeCreate = () => {
    setCreating(false);
    setDraft(EMPTY_TRACK_DRAFT);
    setCreateError(null);
  };

  const create = useMutation({
    mutationFn: learningTrackService.create,
    onSuccess: async (track) => {
      toast.success(`Đã thêm lĩnh vực ${track.name}.`);
      closeCreate();
      await refresh();
    },
    onError: (error) => setCreateError(getApiErrorMessage(error, "Chưa thêm được lĩnh vực.")),
  });

  // One row change at a time. The buttons wait for the new list, so a move is
  // never computed from an old order; a refusal shows on its row.
  const change = useMutation({
    mutationFn: ({ run }: { code: string; run: () => Promise<unknown>; failure: string }) => run(),
    onMutate: () => setRowError(null),
    onSuccess: () => refresh(),
    onError: (error, { code, failure }) => setRowError({ code, message: getApiErrorMessage(error, failure) }),
  });

  const codes = tracks.map((track) => track.code);

  const runAction = (track: AdminLearningTrack, action: TrackRowAction) => {
    setRowError(null);
    const { code } = track;
    if (action === "edit") setEditing({ code, name: track.name, description: track.description ?? "" });
    else if (action === "delete") setPendingDelete(track);
    else if (action === "up" || action === "down")
      change.mutate({
        code,
        run: () => learningTrackService.reorder(movedTrackOrder(codes, code, action === "up" ? -1 : 1)),
        failure: "Chưa đổi được thứ tự.",
      });
    else if (action === "activate")
      change.mutate({ code, run: () => learningTrackService.activate(code), failure: "Chưa bật được lĩnh vực." });
    else change.mutate({ code, run: () => learningTrackService.deactivate(code), failure: "Chưa tắt được lĩnh vực." });
  };

  const saveEdit = () => {
    const body = editing ? editTrackBody(editing) : null;
    if (!editing || !body) return;
    const { code } = editing;
    change.mutate(
      { code, run: () => learningTrackService.update(code, body), failure: "Chưa lưu được lĩnh vực." },
      { onSuccess: () => setEditing(null) },
    );
  };

  const editKeys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveEdit();
    } else if (event.key === "Escape") setEditing(null);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const { code, name } = pendingDelete;
    change.mutate(
      { code, run: () => learningTrackService.remove(code), failure: "Chưa xoá được lĩnh vực." },
      {
        onSuccess: () => toast.success(`Đã xoá lĩnh vực ${name}.`),
        onSettled: () => setPendingDelete(null),
      },
    );
  };

  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    const body = newTrackBody(draft);
    if (!body) return;
    setCreateError(null);
    create.mutate(body);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={TERMS.track}
        stats={tracksQuery.data ? trackStats(tracks) : undefined}
        description="Học viên chọn một lĩnh vực khi bắt đầu học; bài gắn lĩnh vực đó được đề xuất trước. Lĩnh vực đã tắt không chọn hay gắn mới được, còn lựa chọn và nhãn đã có vẫn giữ."
        create={
          creating
            ? undefined
            : {
                label: "Thêm lĩnh vực",
                onClick: () => {
                  setRowError(null);
                  setCreating(true);
                },
              }
        }
      />

      {creating && (
        <form
          onSubmit={submitCreate}
          aria-label="Thêm lĩnh vực"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Tên
              <input
                autoFocus
                required
                maxLength={80}
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                className={INPUT}
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Mã (không bắt buộc)
              <input
                maxLength={40}
                value={draft.code}
                onChange={(event) => setDraft({ ...draft, code: event.target.value })}
                className={`${INPUT} font-mono uppercase`}
              />
              <span className="mt-1 block text-xs font-normal text-slate-600">
                Bỏ trống để tạo từ tên. Mã không đổi được sau khi tạo.
              </span>
            </label>
            <label className="text-sm font-medium text-slate-700 md:col-span-2">
              Mô tả (không bắt buộc)
              <input
                maxLength={500}
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                className={INPUT}
              />
            </label>
          </div>
          {createError && (
            <p role="alert" className="mt-3 text-sm text-rose-700">
              {createError}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={closeCreate} disabled={create.isPending} className={BTN_SECONDARY}>
              Huỷ
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className={`${BTN_DARK} ${draft.name.trim() ? "" : "invisible"}`}
            >
              {create.isPending ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      )}

      <section
        aria-label="Danh sách lĩnh vực"
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        {tracksQuery.isLoading ? (
          <p className="px-5 py-4 text-sm text-slate-600">Đang tải...</p>
        ) : tracksQuery.isError ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 px-5 py-4 text-sm text-rose-700">
            <span>{getApiErrorMessage(tracksQuery.error, "Chưa tải được danh sách lĩnh vực.")}</span>
            <button type="button" onClick={() => void tracksQuery.refetch()} className={BTN_SECONDARY}>
              Thử lại
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th scope="col" className={`${HEAD} pl-5`}>
                    Tên và mô tả
                  </th>
                  {USAGE_COLUMNS.map((column) => (
                    <th key={column.key} scope="col" className={`${HEAD} text-right`}>
                      {column.label}
                    </th>
                  ))}
                  <th scope="col" className={HEAD}>
                    Trạng thái
                  </th>
                  <th scope="col" className={`${HEAD} pr-5 text-right`}>
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {tracks.length === 0 && (
                  <tr>
                    <td colSpan={USAGE_COLUMNS.length + 3} className="px-5 py-4 text-slate-600">
                      Chưa có lĩnh vực nào. Bấm “Thêm lĩnh vực” để tạo lĩnh vực đầu tiên.
                    </td>
                  </tr>
                )}
                {tracks.map((track, index) => {
                  const edit = editing?.code === track.code ? editing : null;
                  const error = rowError?.code === track.code ? rowError.message : null;
                  return (
                    <tr key={track.code}>
                      <td className={`${CELL} pl-5`}>
                        {edit ? (
                          <div className="grid max-w-md gap-2">
                            <label className="text-xs font-medium text-slate-700">
                              Tên
                              <input
                                autoFocus
                                required
                                maxLength={80}
                                value={edit.name}
                                onChange={(event) => setEditing({ ...edit, name: event.target.value })}
                                onKeyDown={editKeys}
                                className={INPUT}
                              />
                            </label>
                            <label className="text-xs font-medium text-slate-700">
                              Mô tả
                              <input
                                maxLength={500}
                                value={edit.description}
                                onChange={(event) => setEditing({ ...edit, description: event.target.value })}
                                onKeyDown={editKeys}
                                className={INPUT}
                              />
                            </label>
                          </div>
                        ) : (
                          <>
                            <p className="font-semibold text-slate-900">{track.name}</p>
                            {track.description && <p className="mt-0.5 text-slate-600">{track.description}</p>}
                          </>
                        )}
                        <p className="mt-1 font-mono text-xs text-slate-500">{track.code}</p>
                        {error && (
                          <p role="alert" className="mt-1 text-sm text-rose-700">
                            {error}
                          </p>
                        )}
                      </td>
                      {USAGE_COLUMNS.map((column) => (
                        <td key={column.key} className={`${CELL} text-right tabular-nums`}>
                          {track.usage[column.key]}
                        </td>
                      ))}
                      <td className={CELL}>
                        <span
                          className={`inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ${
                            track.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {track.isActive ? "Đang bật" : "Đã tắt"}
                        </span>
                      </td>
                      <td className={`${CELL} pr-5`}>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {edit ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditing(null)}
                                disabled={change.isPending}
                                className={`${ROW_BUTTON} ${ROW_TONE.plain}`}
                              >
                                Huỷ
                              </button>
                              <button
                                type="button"
                                onClick={saveEdit}
                                disabled={change.isPending}
                                className={`${ROW_BUTTON} ${ROW_TONE.save} ${edit.name.trim() ? "" : "invisible"}`}
                              >
                                Lưu
                              </button>
                            </>
                          ) : (
                            trackRowActions(track, index, tracks.length).map((action) => (
                              <button
                                key={action}
                                type="button"
                                onClick={() => runAction(track, action)}
                                disabled={change.isPending}
                                className={`${ROW_BUTTON} ${action === "delete" ? ROW_TONE.danger : ROW_TONE.plain}`}
                              >
                                {TRACK_ACTION_LABEL[action]}
                                <span className="sr-only"> {track.name}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Xoá lĩnh vực “${pendingDelete?.name ?? ""}”?`}
        description="Lĩnh vực này chưa gắn cho bài nào và chưa có học viên chọn. Đã xoá thì không khôi phục được."
        confirmLabel="Xoá"
        cancelLabel="Huỷ"
        isPending={change.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
