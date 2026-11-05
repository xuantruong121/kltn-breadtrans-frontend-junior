"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import axiosClient from "@/lib/api/axiosClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { CONTENT_TRACKS, TRACK_FIELD_COPY } from "./skillCmsStatus";

/**
 * The learner-facing fields (lĩnh vực) of one item. Recommendations read them,
 * so each click saves. Before the item is saved there is nothing to tag yet,
 * so the buttons stay locked with a note.
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
    } catch (error) {
      setSelected(previous);
      toast.error(getApiErrorMessage(error, TRACK_FIELD_COPY.saveError));
    } finally {
      setSaving(false);
    }
  };

  const buttons = (
    <div className="mt-2 flex flex-wrap gap-2">
      {CONTENT_TRACKS.map(({ value, label }) => {
        const active = selected.includes(value);
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            disabled={saving || locked}
            onClick={() => void toggle(value)}
            className={`min-h-10 cursor-pointer rounded-lg border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
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
