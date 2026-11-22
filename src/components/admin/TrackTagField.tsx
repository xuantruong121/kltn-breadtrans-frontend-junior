"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import axiosClient from "@/lib/api/axiosClient";
import { tagChoices } from "@/lib/learning-path/tracks";
import { ADMIN_LEARNING_TRACKS_KEY, useAdminLearningTracks } from "@/lib/learning-path/useLearningTracks";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { TRACK_FIELD_COPY } from "./skillCmsStatus";

/**
 * The learner-facing fields (lĩnh vực) of one item. Recommendations read them,
 * so each click saves. Before the item is saved there is nothing to tag yet,
 * so the buttons stay locked with a note.
 *
 * The tracks come from the API in the admins' order. A track admins turned
 * off shows, marked "(đã tắt)", only while the item still has it: it can be
 * removed, not added (the API refuses that too).
 *
 * `card` is a panel of its own (Speaking editor side column); `inline` sits
 * among the other fields of a form, next to Tiêu đề and Trình độ.
 */
export function TrackTagField({
  domain,
  id,
  tracks,
  listKey,
  variant = "card",
}: {
  domain: string;
  id?: string | number | null;
  tracks: string[];
  /** The admin list query to refresh after a save. */
  listKey: string;
  variant?: "card" | "inline";
}) {
  const queryClient = useQueryClient();
  const trackList = useAdminLearningTracks();
  const [selected, setSelected] = useState(tracks);
  const [saving, setSaving] = useState(false);
  const locked = id === undefined || id === null || id === "";

  const toggle = async (track: string) => {
    if (locked) return;
    const previous = selected;
    const next = selected.includes(track)
      ? selected.filter((value) => value !== track)
      : [...selected, track];
    setSelected(next);
    setSaving(true);
    try {
      await axiosClient.put(`/admin/skill-content/${domain}/${id}/tracks`, {
        tracks: next,
      });
      void queryClient.invalidateQueries({ queryKey: [listKey] });
      // The Lĩnh vực page counts tagged items; a used track cannot be deleted.
      void queryClient.invalidateQueries({ queryKey: ADMIN_LEARNING_TRACKS_KEY });
    } catch (error) {
      setSelected(previous);
      toast.error(getApiErrorMessage(error, TRACK_FIELD_COPY.saveError));
    } finally {
      setSaving(false);
    }
  };

  const buttons = trackList.isLoading ? (
    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Đang tải...</p>
  ) : trackList.isError ? (
    <p className="mt-2 text-sm text-rose-700 dark:text-rose-400">
      {getApiErrorMessage(trackList.error, "Chưa tải được danh sách lĩnh vực.")}
    </p>
  ) : (
    <div className="mt-2 flex flex-wrap gap-2">
      {tagChoices(trackList.data ?? [], selected).map(({ code, label, selected: active }) => (
        <button
          key={code}
          type="button"
          aria-pressed={active}
          disabled={saving}
          onClick={() => void toggle(code)}
          className={`min-h-10 cursor-pointer rounded-lg border px-3 text-sm font-medium transition disabled:cursor-not-allowed ${
            active
              ? "border-blue-600 bg-blue-50 text-blue-800"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          } ${locked ? "invisible" : ""}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
  const hint = (
    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
      {locked ? TRACK_FIELD_COPY.lockedHint : TRACK_FIELD_COPY.hint}
    </p>
  );

  if (variant === "inline") {
    return (
      <div
        role="group"
        aria-labelledby="content-tracks-label"
        className="text-sm md:col-span-2"
      >
        <span id="content-tracks-label" className="font-medium">
          {TRACK_FIELD_COPY.label}
        </span>
        {hint}
        {buttons}
      </div>
    );
  }

  return (
    <section
      aria-labelledby="content-tracks-heading"
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 id="content-tracks-heading" className="font-semibold text-slate-950">
        {TRACK_FIELD_COPY.label}
      </h2>
      {hint}
      {buttons}
    </section>
  );
}
