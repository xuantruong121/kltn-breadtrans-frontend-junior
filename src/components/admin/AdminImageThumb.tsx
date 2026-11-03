"use client";

import { useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { ImageOff, X } from "lucide-react";

/**
 * An exercise's image, shown where it is managed. Click enlarges it. It may
 * sit inside a card that is a link, so its clicks never reach that link.
 */
export function AdminImageThumb({
  src,
  alt,
  className = "h-20 w-28",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const hold = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  if (failed)
    return (
      <div
        className={`flex flex-none flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2 text-center text-xs text-slate-500 ${className}`}
      >
        <ImageOff size={16} aria-hidden="true" />
        Không tải được ảnh
      </div>
    );

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          hold(event);
          setOpen(true);
        }}
        aria-label={`Phóng to ảnh: ${alt}`}
        className={`block flex-none cursor-zoom-in overflow-hidden rounded-lg border border-slate-200 bg-slate-100 ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      </button>
      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={alt}
            onClick={(event) => {
              hold(event);
              setOpen(false);
            }}
            className="fixed inset-0 z-[80] flex cursor-zoom-out items-center justify-center bg-slate-950/80 p-6"
          >
            <button
              type="button"
              aria-label="Đóng ảnh"
              className="absolute right-4 top-4 rounded-full bg-white p-2 text-slate-800"
            >
              <X size={18} aria-hidden="true" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="max-h-full max-w-full rounded-lg object-contain"
            />
          </div>,
          document.body,
        )}
    </>
  );
}
