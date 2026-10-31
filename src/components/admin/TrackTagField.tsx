"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import axiosClient from "@/lib/api/axiosClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { CONTENT_TRACKS } from "./skillCmsStatus";

/** The career tracks of one item. Recommendations read them, so each click saves. */
export function TrackTagField({
  domain,
  id,
  tracks,
  listKey,
}: {
  domain: string;
  id: string | number;
  tracks: string[];
  /** The admin list query to refresh after a save. */
  listKey: string;
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(tracks);
  const [saving, setSaving] = useState(false);

  const toggle = async (track: string) => {
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
    } catch (error) {
      setSelected(previous);
      toast.error(getApiErrorMessage(error, "Chưa lưu được ngành"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      aria-labelledby="content-tracks-heading"
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 id="content-tracks-heading" className="font-semibold text-slate-950">
        Ngành
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Bài được ưu tiên đề xuất cho học viên chọn ngành này. Tự lưu khi bấm.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {CONTENT_TRACKS.map(({ value, label }) => {
          const active = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              disabled={saving}
              onClick={() => void toggle(value)}
              className={`min-h-10 cursor-pointer rounded-lg border px-3 text-sm font-medium transition disabled:cursor-wait disabled:opacity-60 ${
                active
                  ? "border-blue-600 bg-blue-50 text-blue-800"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
