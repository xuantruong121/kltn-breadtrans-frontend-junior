"use client";

import { Loader2, Pause, Play, Volume2 } from "lucide-react";

import { formatMinutes } from "@/lib/toeic/examPaper";

type Props = {
  playing: boolean;
  loading: boolean;
  position: number;
  duration: number;
  volume: number;
  seekable: boolean;
  blocked: boolean;
  error: string | null;
  note: string | null;
  onToggle: () => void;
  onSeek: (seconds: number) => void;
  onVolume: (value: number) => void;
  onRetry: () => void;
};

/** Controls for the page's single persistent <audio> element. */
export function ToeicListeningBar({
  playing,
  loading,
  position,
  duration,
  volume,
  seekable,
  blocked,
  error,
  note,
  onToggle,
  onSeek,
  onVolume,
  onRetry,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-800 dark:text-slate-100">
      <button
        type="button"
        onClick={blocked ? onRetry : onToggle}
        disabled={loading}
        aria-label={playing && !blocked ? "Tạm dừng" : "Phát"}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? <Loader2 size={17} className="animate-spin" /> : playing && !blocked ? <Pause size={17} /> : <Play size={17} />}
      </button>
      <input
        type="range"
        aria-label="Vị trí audio"
        min={0}
        max={duration || 0}
        step={0.5}
        value={Math.min(position, duration || 0)}
        disabled={!seekable || !duration}
        onChange={(event) => onSeek(Number(event.target.value))}
        className="order-last min-w-0 basis-full accent-blue-600 sm:order-none sm:basis-auto sm:flex-1"
      />
      <span className="text-sm font-semibold tabular-nums" aria-label="Thời gian audio">
        {formatMinutes(position)} / {formatMinutes(duration)}
      </span>
      <span className="ml-auto inline-flex items-center gap-1.5 sm:ml-0">
        <Volume2 size={16} aria-hidden="true" />
        <input
          type="range"
          aria-label="Âm lượng"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(event) => onVolume(Number(event.target.value))}
          className="w-20 accent-blue-600"
        />
      </span>
      {(error || blocked || note) && (
        <p className="order-last w-full text-xs font-semibold">
          {error ? (
            <span className="text-rose-600 dark:text-rose-400">
              {error}{" "}
              <button type="button" onClick={onRetry} className="underline">
                Thử lại
              </button>
            </span>
          ) : blocked ? (
            <span className="text-slate-600 dark:text-slate-300">Trình duyệt chặn tự phát. Bấm nút phát để nghe.</span>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">{note}</span>
          )}
        </p>
      )}
    </div>
  );
}
