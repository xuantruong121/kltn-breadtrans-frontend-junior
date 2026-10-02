export interface ListeningShortcutDefinition {
  id: "PLAY_PAUSE" | "SELECT_ANSWER" | "CHECK_OR_NEXT" | "REPLAY";
  label: string;
  keys: string[];
  keyDisplay: string;
}

export const LISTENING_SHORTCUTS: readonly ListeningShortcutDefinition[] = [
  {
    id: "PLAY_PAUSE",
    label: "Phát / Dừng audio",
    keys: ["Space"],
    keyDisplay: "Space",
  },
  {
    id: "SELECT_ANSWER",
    label: "Chọn đáp án A – D",
    keys: ["1", "2", "3", "4"],
    keyDisplay: "1 · 2 · 3 · 4",
  },
  {
    id: "CHECK_OR_NEXT",
    label: "Kiểm tra / Câu tiếp",
    keys: ["Enter"],
    keyDisplay: "Enter",
  },
  {
    id: "REPLAY",
    label: "Nghe lại",
    keys: ["Control"],
    keyDisplay: "Ctrl",
  },
] as const;

export interface ListeningWorkspaceShortcutActions {
  isChecked: boolean;
  isLastQuestion: boolean;
  currentAnswer?: string | null;
  options: string[];
  canRetryDictation?: boolean;
  isDictation?: boolean;
  toggleAudio: () => void;
  replayAudio: () => void;
  selectAnswer: (answer: string) => void;
  checkAnswer: (answer?: string) => void;
  nextQuestion: () => void;
  finalSubmit: () => void;
  onUnansweredCheckAttempt?: () => void;
}

/**
 * Checks if target element is an editable field or an interactive element
 * where global shortcuts should not interfere.
 */
export function isListeningShortcutIgnored(target: EventTarget | null): boolean {
  if (!target || typeof (target as any).tagName !== "string") return false;
  const el = target as HTMLElement;
  const tagName = el.tagName.toLowerCase();

  // 1. Text input / form fields
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }

  // 2. Contenteditable
  if (el.isContentEditable || (typeof el.closest === "function" && el.closest("[contenteditable='true']"))) {
    return true;
  }

  // 3. Modal dialogs or shortcut popover focus
  if (
    typeof el.closest === "function" &&
    el.closest("[data-shortcuts-popover], [role='dialog'], [aria-modal='true']")
  ) {
    return true;
  }

  return false;
}

export type ListeningShortcutResult =
  | "PLAY_PAUSE"
  | "REPLAY"
  | "SELECT_ANSWER"
  | "CHECK"
  | "NEXT"
  | "SUBMIT"
  | "UNANSWERED"
  | null;

export interface CtrlShortcutState {
  isCandidate: boolean;
}

export function createCtrlShortcutState(): CtrlShortcutState {
  return { isCandidate: false };
}

export interface KeyboardEventLike {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  repeat?: boolean;
  target?: EventTarget | null;
  preventDefault?: () => void;
}

/**
 * Handles listening keydown events.
 * Control keydown alone marks Ctrl as a standalone candidate,
 * but does NOT replay audio immediately to prevent collision with modifier shortcuts (Ctrl+C, Ctrl+V, etc.).
 */
export function handleListeningKeyDown(
  e: KeyboardEventLike,
  actions: ListeningWorkspaceShortcutActions,
  state: CtrlShortcutState = { isCandidate: false },
): ListeningShortcutResult {
  // Never hijack editable elements or popover controls
  if (isListeningShortcutIgnored(e.target ?? null)) {
    state.isCandidate = false;
    return null;
  }

  // 1. Ctrl key down
  if (e.key === "Control") {
    // If repeat is true (held keydown), retain current candidate status without duplicate action
    if (e.repeat) {
      return null;
    }
    // If another modifier is already active, this is a multi-modifier combination
    if (e.shiftKey || e.altKey || e.metaKey) {
      state.isCandidate = false;
      return null;
    }
    // Mark as standalone Ctrl candidate; DO NOT replay yet
    state.isCandidate = true;
    return null;
  }

  // Any non-Control key pressed cancels standalone Ctrl candidate
  state.isCandidate = false;

  // Never repeat actions when non-Control key is held down
  if (e.repeat) return null;

  // 2. Space -> Play / Pause audio
  if (e.code === "Space" || e.key === " ") {
    // Ignore if combined with modifier keys
    if (e.ctrlKey || e.altKey || e.metaKey) return null;
    // Don't hijack if focused on a clickable non-option button (e.g. exit button, note button)
    const el = e.target as HTMLElement | null;
    if (el && typeof el.closest === "function" && el.closest("button:not([data-option-card]), a")) {
      return null;
    }
    e.preventDefault?.();
    actions.toggleAudio();
    return "PLAY_PAUSE";
  }

  // 3. Enter -> Check Answer OR Next Question / Submit
  if (e.key === "Enter") {
    // Ignore if combined with Alt or Meta
    if (e.altKey || e.metaKey) return null;
    // Don't hijack if focused on a clickable non-option button (e.g. exit button)
    const el = e.target as HTMLElement | null;
    if (el && typeof el.closest === "function" && el.closest("button:not([data-option-card]), a")) {
      return null;
    }
    e.preventDefault?.();

    // If already checked and not in retryable dictation mode -> Advance
    if (actions.isChecked && !actions.canRetryDictation) {
      if (actions.isLastQuestion) {
        actions.finalSubmit();
        return "SUBMIT";
      }
      actions.nextQuestion();
      return "NEXT";
    }

    // Not checked yet: check answer if answered, else trigger validation notice
    const hasAnswer = Boolean(actions.currentAnswer && actions.currentAnswer.trim().length > 0);
    if (hasAnswer) {
      actions.checkAnswer(actions.currentAnswer ?? undefined);
      return "CHECK";
    }

    actions.onUnansweredCheckAttempt?.();
    return "UNANSWERED";
  }

  // 4. 1 / 2 / 3 / 4 -> Select option A / B / C / D
  if (["1", "2", "3", "4"].includes(e.key)) {
    if (e.ctrlKey || e.altKey || e.metaKey) return null;
    if (!actions.isChecked && !actions.isDictation) {
      const optIdx = parseInt(e.key, 10) - 1;
      const chosen = actions.options[optIdx];
      if (chosen) {
        e.preventDefault?.();
        actions.selectAnswer(chosen);
        return "SELECT_ANSWER";
      }
    }
  }

  return null;
}

/**
 * Handles listening keyup events.
 * If Control was pressed and released standalone without intervening keys,
 * triggers Replay audio exactly once.
 */
export function handleListeningKeyUp(
  e: KeyboardEventLike,
  actions: ListeningWorkspaceShortcutActions,
  state: CtrlShortcutState,
): ListeningShortcutResult {
  if (isListeningShortcutIgnored(e.target ?? null)) {
    state.isCandidate = false;
    return null;
  }

  if (e.key === "Control") {
    if (state.isCandidate) {
      state.isCandidate = false;
      actions.replayAudio();
      return "REPLAY";
    }
    state.isCandidate = false;
    return null;
  }

  // Non-Control key released ensures candidate is cancelled
  state.isCandidate = false;
  return null;
}

/**
 * Creates an encapsulated listening shortcut controller managing deterministic key state.
 */
export function createListeningShortcutController(
  getActions: () => ListeningWorkspaceShortcutActions,
) {
  const state = createCtrlShortcutState();

  return {
    handleKeyDown: (e: KeyboardEventLike): ListeningShortcutResult => {
      return handleListeningKeyDown(e, getActions(), state);
    },
    handleKeyUp: (e: KeyboardEventLike): ListeningShortcutResult => {
      return handleListeningKeyUp(e, getActions(), state);
    },
    handleBlur: () => {
      state.isCandidate = false;
    },
    reset: () => {
      state.isCandidate = false;
    },
    getState: () => ({ ...state }),
  };
}

/**
 * Backward-compatible wrapper for keydown events.
 */
export function handleListeningKeyboardShortcut(
  e: KeyboardEventLike,
  actions: ListeningWorkspaceShortcutActions,
  state?: CtrlShortcutState,
): ListeningShortcutResult {
  return handleListeningKeyDown(e, actions, state);
}
