"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { fadeMask, scrollEdges, type ScrollEdges } from "@/lib/ui/scrollFade";

const NOTHING_HIDDEN: ScrollEdges = { above: false, below: false };

/**
 * Fades the edge of a scroll area where more content waits (owner 2026-11-27).
 * Returns a callback ref and a style for the scroller. Keep the scroller's
 * content in one child element: that child is watched, so a line that appears
 * or goes (an error) is seen. Nothing changes while the area does not scroll
 * (below lg, or when it fits).
 */
export function useScrollFade<T extends HTMLElement>(): [(el: T | null) => void, CSSProperties | undefined] {
  const [el, setEl] = useState<T | null>(null);
  const [edges, setEdges] = useState<ScrollEdges>(NOTHING_HIDDEN);

  useEffect(() => {
    if (!el) return;
    const measure = () => {
      const next = scrollEdges(el.scrollTop, el.scrollHeight, el.clientHeight);
      setEdges((prev) => (prev.above === next.above && prev.below === next.below ? prev : next));
    };
    const first = window.requestAnimationFrame(measure);
    el.addEventListener("scroll", measure, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(el);
    if (el.firstElementChild) observer?.observe(el.firstElementChild);
    return () => {
      window.cancelAnimationFrame(first);
      el.removeEventListener("scroll", measure);
      observer?.disconnect();
    };
  }, [el]);

  const mask = fadeMask(edges);
  return [setEl, mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined];
}
