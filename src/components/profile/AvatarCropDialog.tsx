"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Loader2, Minus, Plus } from "lucide-react";

import {
  MAX_ZOOM,
  clampCrop,
  coverScale,
  initialCrop,
  sourceRect,
  zoomTo,
  type CropState,
  type Photo,
} from "@/lib/avatar/avatarCrop";
import { renderAvatarSquare } from "@/lib/avatar/resizeAvatarImage";

interface AvatarCropDialogProps {
  file: File;
  photo: Photo;
  isSaving: boolean;
  onCancel: () => void;
  /** The cropped 256px JPEG data URL. */
  onConfirm: (dataUrl: string) => void;
}

const subscribe = () => () => {};

/**
 * Crop frame for a new avatar (owner 2026-11-17): drag to place the photo,
 * zoom with the slider, the wheel or +/-, arrow keys to nudge. The circle
 * shows what the round avatar will show; the whole square is stored.
 */
export function AvatarCropDialog({ file, photo, isSaving, onCancel, onConfirm }: AvatarCropDialogProps) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const view = useSyncExternalStore(
    subscribe,
    () => Math.min(300, Math.max(200, window.innerWidth - 80)),
    () => 300,
  );
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const [crop, setCrop] = useState<CropState>(() => initialCrop(photo, view));
  const imgRef = useRef<HTMLImageElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; start: CropState } | null>(null);
  const shown = clampCrop(photo, view, crop);
  const minScale = coverScale(photo, view);
  const zoom = shown.scale / minScale;

  useEffect(() => {
    frameRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isSaving, onCancel]);

  const setZoom = (value: number) =>
    setCrop((state) => zoomTo(photo, view, clampCrop(photo, view, state), minScale * value));
  const nudge = (dx: number, dy: number) =>
    setCrop((state) => clampCrop(photo, view, { ...state, x: state.x + dx, y: state.y + dy }));

  const confirm = () => {
    if (!imgRef.current) return;
    onConfirm(renderAvatarSquare(imgRef.current, sourceRect(photo, view, shown)));
  };

  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-crop-title"
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <h2 id="avatar-crop-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Canh ảnh đại diện
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Kéo ảnh để canh, phóng to bằng thanh trượt bên dưới.
        </p>

        <div
          ref={frameRef}
          tabIndex={0}
          aria-label="Khung cắt ảnh. Dùng phím mũi tên để dời ảnh, phím cộng và trừ để phóng to, thu nhỏ."
          className="relative mx-auto mt-4 cursor-grab touch-none select-none overflow-hidden rounded-lg bg-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-amber-500 active:cursor-grabbing dark:bg-slate-800"
          style={{ width: view, height: view }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { x: event.clientX, y: event.clientY, start: shown };
          }}
          onPointerMove={(event) => {
            const d = drag.current;
            if (!d) return;
            setCrop(clampCrop(photo, view, { ...d.start, x: d.start.x + event.clientX - d.x, y: d.start.y + event.clientY - d.y }));
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onWheel={(event) => setZoom(Math.min(MAX_ZOOM, Math.max(1, zoom * (event.deltaY < 0 ? 1.08 : 1 / 1.08))))}
          onKeyDown={(event) => {
            const step = event.shiftKey ? 30 : 8;
            const moves: Record<string, [number, number]> = {
              ArrowLeft: [step, 0],
              ArrowRight: [-step, 0],
              ArrowUp: [0, step],
              ArrowDown: [0, -step],
            };
            if (moves[event.key]) {
              event.preventDefault();
              nudge(...moves[event.key]);
            } else if (event.key === "+" || event.key === "=") setZoom(Math.min(MAX_ZOOM, zoom + 0.1));
            else if (event.key === "-") setZoom(Math.max(1, zoom - 0.1));
          }}
        >
          <img
            ref={imgRef}
            src={url}
            alt=""
            draggable={false}
            className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
            style={{
              width: photo.width * shown.scale,
              height: photo.height * shown.scale,
              transform: `translate(-50%, -50%) translate(${shown.x}px, ${shown.y}px)`,
            }}
          />
          {/* What the round avatar shows; the corners are kept but dimmed. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.5)" }}
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setZoom(Math.max(1, zoom - 0.25))}
            aria-label="Thu nhỏ"
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Minus size={16} strokeWidth={2} aria-hidden="true" />
          </button>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            aria-label="Mức phóng to"
            className="h-2 w-full cursor-pointer accent-amber-600"
          />
          <button
            type="button"
            onClick={() => setZoom(Math.min(MAX_ZOOM, zoom + 0.25))}
            aria-label="Phóng to"
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="min-h-11 cursor-pointer rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={isSaving}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-bold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
            Lưu ảnh
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
