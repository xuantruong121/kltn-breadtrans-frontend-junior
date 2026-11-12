"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  activeNudges,
  hourInVietnam,
  NUDGES_SEEN_KEY,
  parseSeen,
  pickNudge,
  recordSeen,
  type PetNudge,
  type PetNudgeQuest,
} from "./dialogueLogic";

// What the pet has said today lives in localStorage, so a reload does not repeat it.
// When storage is blocked it is kept in memory for the tab instead.
const listeners = new Set<() => void>();
let memory: string | null = null;

function readSeenRaw(): string | null {
  try {
    return window.localStorage.getItem(NUDGES_SEEN_KEY);
  } catch {
    return memory;
  }
}

function writeSeenRaw(value: string) {
  memory = value;
  try {
    window.localStorage.setItem(NUDGES_SEEN_KEY, value);
  } catch {
    /* storage blocked: memory keeps it for this tab */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab that already showed a bubble counts here too.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

const serverSnapshot = () => null;
const now = () => new Date();

export interface UsePetDialogueOptions {
  /** The pet and today's data have loaded; nothing is decided before that. */
  ready: boolean;
  /** The learner can see the line now (petLineShown); only then is it counted as said. */
  shown: boolean;
  userId?: string | number | null;
  /** Today's date key from the server (Vietnam time). */
  dateKey?: string;
  petName: string;
  satietyState?: string;
  balance: number;
  feedCost: number;
  lastFedAt?: string | null;
  streak: number;
  activitiesCount: number;
  quests: PetNudgeQuest[];
}

export function usePetDialogue(options: UsePetDialogueOptions) {
  const { ready, shown, dateKey = "", petName, satietyState, balance, feedCost, lastFedAt, streak, activitiesCount, quests } =
    options;
  const userId = options.userId == null ? "" : String(options.userId);
  const live = ready && userId !== "" && dateKey !== "";
  const hourVN = hourInVietnam(now());

  const raw = useSyncExternalStore(subscribe, readSeenRaw, serverSnapshot);
  const nudges = useMemo(
    () =>
      live
        ? activeNudges({ petName, satietyState, balance, feedCost, lastFedAt, streak, hourVN, activitiesCount, quests })
        : [],
    [live, petName, satietyState, balance, feedCost, lastFedAt, streak, hourVN, activitiesCount, quests],
  );
  const seen = useMemo(() => (live ? parseSeen(raw, userId, dateKey) : []), [live, raw, userId, dateKey]);
  const candidate = live ? pickNudge(nudges, seen) : null;

  // The bubble holds the newest thing worth saying; a new one replaces it.
  const [heldKey, setHeldKey] = useState<string | null>(null);
  const [closedKey, setClosedKey] = useState<string | null>(null);
  if (candidate && candidate.key !== heldKey) setHeldKey(candidate.key);

  // Once something is said, everything true right now counts as said today,
  // so the bubble comes back only when something new happens.
  const activeKeys = nudges.map((n) => n.key).join("|");
  useEffect(() => {
    if (!live || !shown || !heldKey || !activeKeys) return;
    writeSeenRaw(recordSeen(readSeenRaw(), userId, dateKey, activeKeys.split("|")));
  }, [live, shown, heldKey, activeKeys, userId, dateKey]);

  // A held line disappears by itself once it stops being true (the pet was fed, say).
  const dialogue: PetNudge | null = heldKey ? (nudges.find((n) => n.key === heldKey) ?? null) : null;

  return {
    dialogue,
    isVisible: dialogue !== null && closedKey !== heldKey,
    /** Not seen yet today: on a phone, the pet shows a dot until the panel is opened. */
    isNew: dialogue !== null && !seen.includes(dialogue.key),
    dismiss: () => setClosedKey(heldKey),
  };
}

export default usePetDialogue;
