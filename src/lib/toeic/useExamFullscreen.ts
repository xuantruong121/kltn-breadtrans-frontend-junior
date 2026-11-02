"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { isExamRoomPath } from "./assessmentRoom";

export function enterFullscreen() {
  void document.documentElement.requestFullscreen?.().catch(() => undefined);
}

export function exitFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
}

/** Whether the page is fullscreen now; pressing Esc turns this false. */
export function useIsFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  return isFullscreen;
}

/**
 * Leaves fullscreen when the page is really gone, unless the exam goes on in
 * another room. React Strict Mode mounts effects twice in development, so the
 * exit waits a tick and is skipped when the page mounted again.
 */
export function useLeaveFullscreen(onLeave?: () => void) {
  const leaveRef = useRef(onLeave);
  useEffect(() => {
    leaveRef.current = onLeave;
  }, [onLeave]);
  const mountTokenRef = useRef(0);
  const leave = useCallback(() => {
    leaveRef.current?.();
    if (!isExamRoomPath(window.location.pathname)) exitFullscreen();
  }, []);
  useEffect(() => {
    const token = ++mountTokenRef.current;
    return () => {
      window.setTimeout(() => {
        if (mountTokenRef.current === token) leave();
      }, 0);
    };
  }, [leave]);
}
