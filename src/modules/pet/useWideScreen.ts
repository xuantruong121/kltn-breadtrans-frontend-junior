"use client";

import { useSyncExternalStore } from "react";

/** The width from which the pet's speech bubble is shown (Tailwind `sm`). */
export const WIDE_SCREEN_QUERY = "(min-width: 640px)";

function subscribe(listener: () => void) {
  const query = window.matchMedia?.(WIDE_SCREEN_QUERY);
  query?.addEventListener?.("change", listener);
  return () => query?.removeEventListener?.("change", listener);
}

const snapshot = () => window.matchMedia?.(WIDE_SCREEN_QUERY).matches ?? true;
// Before there is a window, assume a wide screen: nothing is marked as said
// on a phone that the learner has not seen.
const serverSnapshot = () => true;

export function useWideScreen(): boolean {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
