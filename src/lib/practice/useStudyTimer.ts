"use client";

import { useEffect } from "react";
import { userService } from "@/lib/api/services/user.service";
import { API_BASE_URL } from "@/lib/auth/refreshSession";
import { useAuthStore } from "@/stores/authStore";
import { FLUSH_SEC, TICK_SEC, reportChunks, tickCredit, type StudySkill } from "./studyTime";

const INPUT_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart", "wheel"] as const;

/** A last report while the page goes away: fetch with keepalive outlives the page. */
function sendOnLeave(skill: StudySkill, seconds: number) {
  const token = useAuthStore.getState().accessToken;
  if (!token) return;
  void fetch(`${API_BASE_URL}/users/me/study-time`, {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ skill, seconds }),
  }).catch(() => {});
}

/**
 * Counts the time a practice room is open, in view and in use (some input in
 * the last two minutes, or audio/video playing) and reports it every minute,
 * on leaving the room and when the tab is hidden (owner 2026-11-26).
 * `skill` null: not a practice room, nothing counted.
 */
export function useStudyTimer(skill: StudySkill | null) {
  useEffect(() => {
    if (!skill) return;
    let pending = 0;
    let lastInput = Date.now();
    const onInput = () => {
      lastInput = Date.now();
    };
    const mediaPlaying = () =>
      Array.from(document.querySelectorAll<HTMLMediaElement>("audio, video")).some((m) => !m.paused && !m.ended);

    const flush = (leaving: boolean) => {
      const chunks = reportChunks(pending);
      pending = 0;
      for (const seconds of chunks) {
        if (leaving) sendOnLeave(skill, seconds);
        else void userService.addStudyTime(skill, seconds).catch(() => {});
      }
    };

    const timer = window.setInterval(() => {
      pending += tickCredit({
        visible: document.visibilityState === "visible",
        idleMs: Date.now() - lastInput,
        mediaPlaying: mediaPlaying(),
      });
      if (pending >= FLUSH_SEC) flush(false);
    }, TICK_SEC * 1000);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush(true);
    };
    const onPageHide = () => flush(true);

    for (const name of INPUT_EVENTS) window.addEventListener(name, onInput, { passive: true, capture: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.clearInterval(timer);
      for (const name of INPUT_EVENTS) window.removeEventListener(name, onInput, { capture: true });
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      // Leaving the room (another page in the app): what is left goes now.
      flush(false);
    };
  }, [skill]);
}
