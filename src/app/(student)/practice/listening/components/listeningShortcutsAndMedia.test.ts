import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  LISTENING_SHORTCUTS,
  handleListeningKeyboardShortcut,
  createListeningShortcutController,
  createDictationReplayController,
  type DictationReplayKey,
  isListeningShortcutIgnored,
  type ListeningWorkspaceShortcutActions,
} from "./listeningShortcutConfig.ts";

function createMockActions(overrides: Partial<ListeningWorkspaceShortcutActions> = {}): {
  actions: ListeningWorkspaceShortcutActions;
  calls: Record<string, any[]>;
} {
  const calls: Record<string, any[]> = {
    toggleAudio: [],
    replayAudio: [],
    selectAnswer: [],
    checkAnswer: [],
    nextQuestion: [],
    finalSubmit: [],
    onUnansweredCheckAttempt: [],
  };

  const actions: ListeningWorkspaceShortcutActions = {
    isChecked: false,
    isLastQuestion: false,
    currentAnswer: null,
    options: ["Option A", "Option B", "Option C", "Option D"],
    canRetryDictation: false,
    isDictation: false,
    toggleAudio: () => calls.toggleAudio.push(true),
    replayAudio: () => calls.replayAudio.push(true),
    selectAnswer: (ans) => calls.selectAnswer.push(ans),
    checkAnswer: (ans) => calls.checkAnswer.push(ans),
    nextQuestion: () => calls.nextQuestion.push(true),
    finalSubmit: () => calls.finalSubmit.push(true),
    onUnansweredCheckAttempt: () => calls.onUnansweredCheckAttempt.push(true),
    ...overrides,
  };

  return { actions, calls };
}

function createMockEvent(overrides: Partial<{
  key: string;
  code?: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  repeat?: boolean;
  target?: any;
}> = {}): {
  event: any;
  isPrevented: () => boolean;
} {
  let prevented = false;
  const event = {
    key: "",
    code: "",
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    repeat: false,
    preventDefault: () => {
      prevented = true;
    },
    target: null,
    ...overrides,
  };
  return { event, isPrevented: () => prevented };
}

// 1. Space Play/Pause tests
test("Shortcut: Space alone toggles audio Play/Pause and prevents page scroll", () => {
  const { actions, calls } = createMockActions();
  const { event, isPrevented } = createMockEvent({ key: " ", code: "Space" });

  const result = handleListeningKeyboardShortcut(event, actions);
  assert.equal(result, "PLAY_PAUSE");
  assert.equal(calls.toggleAudio.length, 1);
  assert.equal(isPrevented(), true);
});

test("Shortcut: Ctrl+Space is ignored (bare Space required)", () => {
  const { actions, calls } = createMockActions();
  const { event } = createMockEvent({ key: " ", code: "Space", ctrlKey: true });

  const result = handleListeningKeyboardShortcut(event, actions);
  assert.equal(result, null);
  assert.equal(calls.toggleAudio.length, 0);
});

// 2. Enter Check / Next / Submit tests
test("Shortcut: Enter invokes Check when question is answered but unchecked", () => {
  const { actions, calls } = createMockActions({
    isChecked: false,
    currentAnswer: "Option B",
  });
  const { event, isPrevented } = createMockEvent({ key: "Enter" });

  const result = handleListeningKeyboardShortcut(event, actions);
  assert.equal(result, "CHECK");
  assert.equal(calls.checkAnswer.length, 1);
  assert.equal(calls.checkAnswer[0], "Option B");
  assert.equal(isPrevented(), true);
});

test("Shortcut: Enter does NOT silently submit when question is unanswered; notifies user", () => {
  const { actions, calls } = createMockActions({
    isChecked: false,
    currentAnswer: null,
  });
  const { event } = createMockEvent({ key: "Enter" });

  const result = handleListeningKeyboardShortcut(event, actions);
  assert.equal(result, "UNANSWERED");
  assert.equal(calls.checkAnswer.length, 0);
  assert.equal(calls.onUnansweredCheckAttempt.length, 1);
});

test("Shortcut: Enter advances to Next question when current question is checked", () => {
  const { actions, calls } = createMockActions({
    isChecked: true,
    isLastQuestion: false,
  });
  const { event, isPrevented } = createMockEvent({ key: "Enter" });

  const result = handleListeningKeyboardShortcut(event, actions);
  assert.equal(result, "NEXT");
  assert.equal(calls.nextQuestion.length, 1);
  assert.equal(isPrevented(), true);
});

test("Shortcut: Enter invokes final submit on the last question when checked", () => {
  const { actions, calls } = createMockActions({
    isChecked: true,
    isLastQuestion: true,
  });
  const { event, isPrevented } = createMockEvent({ key: "Enter" });

  const result = handleListeningKeyboardShortcut(event, actions);
  assert.equal(result, "SUBMIT");
  assert.equal(calls.finalSubmit.length, 1);
  assert.equal(isPrevented(), true);
});

// 3. Ctrl Replay tests with Modifier Collision Protection
test("Shortcut: Ctrl keydown alone does NOT replay immediately", () => {
  const { actions, calls } = createMockActions();
  const controller = createListeningShortcutController(() => actions);
  const { event, isPrevented } = createMockEvent({ key: "Control", ctrlKey: true });

  const result = controller.handleKeyDown(event);
  assert.equal(result, null);
  assert.equal(calls.replayAudio.length, 0);
  assert.equal(isPrevented(), false); // Must never preventDefault on Control
});

test("Shortcut: Ctrl keydown + Ctrl keyup triggers Replay exactly once without preventDefault", () => {
  const { actions, calls } = createMockActions();
  const controller = createListeningShortcutController(() => actions);
  const downEvent = createMockEvent({ key: "Control", ctrlKey: true });
  const upEvent = createMockEvent({ key: "Control", ctrlKey: false });

  const downResult = controller.handleKeyDown(downEvent.event);
  assert.equal(downResult, null);
  assert.equal(calls.replayAudio.length, 0);

  const upResult = controller.handleKeyUp(upEvent.event);
  assert.equal(upResult, "REPLAY");
  assert.equal(calls.replayAudio.length, 1);
  assert.equal(upEvent.isPrevented(), false);
  assert.equal(downEvent.isPrevented(), false);
});

test("Shortcut: Ctrl+C combination produces Replay count = 0", () => {
  const { actions, calls } = createMockActions();
  const controller = createListeningShortcutController(() => actions);
  const ctrlDown = createMockEvent({ key: "Control", ctrlKey: true });
  const cDown = createMockEvent({ key: "c", ctrlKey: true });
  const cUp = createMockEvent({ key: "c", ctrlKey: true });
  const ctrlUp = createMockEvent({ key: "Control", ctrlKey: false });

  controller.handleKeyDown(ctrlDown.event);
  controller.handleKeyDown(cDown.event);
  controller.handleKeyUp(cUp.event);
  controller.handleKeyUp(ctrlUp.event);

  assert.equal(calls.replayAudio.length, 0);
});

test("Shortcut: Ctrl+V combination produces Replay count = 0", () => {
  const { actions, calls } = createMockActions();
  const controller = createListeningShortcutController(() => actions);
  controller.handleKeyDown(createMockEvent({ key: "Control", ctrlKey: true }).event);
  controller.handleKeyDown(createMockEvent({ key: "v", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "v", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Control", ctrlKey: false }).event);

  assert.equal(calls.replayAudio.length, 0);
});

test("Shortcut: Ctrl+F combination produces Replay count = 0", () => {
  const { actions, calls } = createMockActions();
  const controller = createListeningShortcutController(() => actions);
  controller.handleKeyDown(createMockEvent({ key: "Control", ctrlKey: true }).event);
  controller.handleKeyDown(createMockEvent({ key: "f", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "f", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Control", ctrlKey: false }).event);

  assert.equal(calls.replayAudio.length, 0);
});

test("Shortcut: Ctrl+R combination produces Replay count = 0", () => {
  const { actions, calls } = createMockActions();
  const controller = createListeningShortcutController(() => actions);
  controller.handleKeyDown(createMockEvent({ key: "Control", ctrlKey: true }).event);
  controller.handleKeyDown(createMockEvent({ key: "r", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "r", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Control", ctrlKey: false }).event);

  assert.equal(calls.replayAudio.length, 0);
});

test("Shortcut: Ctrl+L combination produces Replay count = 0", () => {
  const { actions, calls } = createMockActions();
  const controller = createListeningShortcutController(() => actions);
  controller.handleKeyDown(createMockEvent({ key: "Control", ctrlKey: true }).event);
  controller.handleKeyDown(createMockEvent({ key: "l", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "l", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Control", ctrlKey: false }).event);

  assert.equal(calls.replayAudio.length, 0);
});

test("Shortcut: Ctrl+A combination produces Replay count = 0", () => {
  const { actions, calls } = createMockActions();
  const controller = createListeningShortcutController(() => actions);
  controller.handleKeyDown(createMockEvent({ key: "Control", ctrlKey: true }).event);
  controller.handleKeyDown(createMockEvent({ key: "a", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "a", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Control", ctrlKey: false }).event);

  assert.equal(calls.replayAudio.length, 0);
});

test("Shortcut: Ctrl+Shift+P modifier combination produces Replay count = 0", () => {
  const { actions, calls } = createMockActions();
  const controller = createListeningShortcutController(() => actions);
  controller.handleKeyDown(createMockEvent({ key: "Control", ctrlKey: true }).event);
  controller.handleKeyDown(createMockEvent({ key: "Shift", ctrlKey: true, shiftKey: true }).event);
  controller.handleKeyDown(createMockEvent({ key: "p", ctrlKey: true, shiftKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "p", ctrlKey: true, shiftKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Shift", ctrlKey: true, shiftKey: false }).event);
  controller.handleKeyUp(createMockEvent({ key: "Control", ctrlKey: false }).event);

  assert.equal(calls.replayAudio.length, 0);
});

test("Shortcut: Holding Ctrl with repeated Control keydown does not cause duplicate Replay", () => {
  const { actions, calls } = createMockActions();
  const controller = createListeningShortcutController(() => actions);

  controller.handleKeyDown(createMockEvent({ key: "Control", ctrlKey: true, repeat: false }).event);
  controller.handleKeyDown(createMockEvent({ key: "Control", ctrlKey: true, repeat: true }).event);
  controller.handleKeyDown(createMockEvent({ key: "Control", ctrlKey: true, repeat: true }).event);

  assert.equal(calls.replayAudio.length, 0);

  controller.handleKeyUp(createMockEvent({ key: "Control", ctrlKey: false }).event);
  assert.equal(calls.replayAudio.length, 1); // exactly once on release
});

test("Shortcut: Standalone Ctrl after a previous Ctrl+C sequence triggers Replay normally", () => {
  const { actions, calls } = createMockActions();
  const controller = createListeningShortcutController(() => actions);

  // 1. Previous Ctrl+C sequence
  controller.handleKeyDown(createMockEvent({ key: "Control", ctrlKey: true }).event);
  controller.handleKeyDown(createMockEvent({ key: "c", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "c", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Control", ctrlKey: false }).event);
  assert.equal(calls.replayAudio.length, 0);

  // 2. Subsequent standalone Ctrl
  controller.handleKeyDown(createMockEvent({ key: "Control", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Control", ctrlKey: false }).event);
  assert.equal(calls.replayAudio.length, 1);
});

test("Shortcut: Window blur cancels standalone Ctrl candidate", () => {
  const { actions, calls } = createMockActions();
  const controller = createListeningShortcutController(() => actions);

  controller.handleKeyDown(createMockEvent({ key: "Control", ctrlKey: true }).event);
  controller.handleBlur();
  controller.handleKeyUp(createMockEvent({ key: "Control", ctrlKey: false }).event);

  assert.equal(calls.replayAudio.length, 0);
});

// 4. Obsolete / Removed shortcuts tests
test("Shortcut: Shift+ArrowLeft (obsolete rewind) is completely ignored", () => {
  const { actions, calls } = createMockActions();
  const { event } = createMockEvent({ key: "ArrowLeft", code: "ArrowLeft", shiftKey: true });

  const result = handleListeningKeyboardShortcut(event, actions);
  assert.equal(result, null);
  assert.equal(calls.replayAudio.length, 0);
  assert.equal(calls.toggleAudio.length, 0);
});

test("Shortcut: Alt+S (obsolete skip) is completely ignored", () => {
  const { actions } = createMockActions();
  const { event } = createMockEvent({ key: "s", altKey: true });

  const result = handleListeningKeyboardShortcut(event, actions);
  assert.equal(result, null);
});

test("Shortcut: Alt+A (obsolete show answer) is completely ignored", () => {
  const { actions } = createMockActions();
  const { event } = createMockEvent({ key: "a", altKey: true });

  const result = handleListeningKeyboardShortcut(event, actions);
  assert.equal(result, null);
});

test("Shortcut: Alt+R (obsolete replay) is completely ignored", () => {
  const { actions, calls } = createMockActions();
  const { event } = createMockEvent({ key: "r", altKey: true });

  const result = handleListeningKeyboardShortcut(event, actions);
  assert.equal(result, null);
  assert.equal(calls.replayAudio.length, 0);
});

// 5. 1/2/3/4 Answer selection tests
test("Shortcut: 1, 2, 3, 4 selects options A, B, C, D when unchecked", () => {
  const { actions, calls } = createMockActions({ isChecked: false });

  assert.equal(handleListeningKeyboardShortcut(createMockEvent({ key: "1" }).event, actions), "SELECT_ANSWER");
  assert.equal(calls.selectAnswer[0], "Option A");

  assert.equal(handleListeningKeyboardShortcut(createMockEvent({ key: "2" }).event, actions), "SELECT_ANSWER");
  assert.equal(calls.selectAnswer[1], "Option B");

  assert.equal(handleListeningKeyboardShortcut(createMockEvent({ key: "3" }).event, actions), "SELECT_ANSWER");
  assert.equal(calls.selectAnswer[2], "Option C");

  assert.equal(handleListeningKeyboardShortcut(createMockEvent({ key: "4" }).event, actions), "SELECT_ANSWER");
  assert.equal(calls.selectAnswer[3], "Option D");
});

test("Shortcut: 1, 2, 3, 4 does not mutate answer when question is already checked", () => {
  const { actions, calls } = createMockActions({ isChecked: true });

  const result = handleListeningKeyboardShortcut(createMockEvent({ key: "2" }).event, actions);
  assert.equal(result, null);
  assert.equal(calls.selectAnswer.length, 0);
});

// 6. Input safety tests
test("Input safety: ignores shortcuts inside input, textarea, and contenteditable", () => {
  const inputEl = { tagName: "INPUT", isContentEditable: false };
  const textareaEl = { tagName: "TEXTAREA", isContentEditable: false };
  const contentEditableEl = { tagName: "DIV", isContentEditable: true };

  assert.equal(isListeningShortcutIgnored(inputEl as any), true);
  assert.equal(isListeningShortcutIgnored(textareaEl as any), true);
  assert.equal(isListeningShortcutIgnored(contentEditableEl as any), true);

  const { actions, calls } = createMockActions();
  const result = handleListeningKeyboardShortcut(
    createMockEvent({ key: " ", code: "Space", target: inputEl }).event,
    actions,
  );
  assert.equal(result, null);
  assert.equal(calls.toggleAudio.length, 0);
});

test("Input safety: ignores Space/Enter inside shortcuts popover", () => {
  const popoverEl = {
    tagName: "BUTTON",
    isContentEditable: false,
    closest: (selector: string) => selector.includes("data-shortcuts-popover"),
  };

  assert.equal(isListeningShortcutIgnored(popoverEl as any), true);

  const { actions, calls } = createMockActions();
  const result = handleListeningKeyboardShortcut(
    createMockEvent({ key: "Enter", target: popoverEl }).event,
    actions,
  );
  assert.equal(result, null);
  assert.equal(calls.nextQuestion.length, 0);
  assert.equal(calls.checkAnswer.length, 0);
});

test("Input safety: Ctrl alone inside input or textarea does not trigger Replay", () => {
  const inputEl = {
    tagName: "INPUT",
    isContentEditable: false,
  };
  const { actions, calls } = createMockActions();
  const controller = createListeningShortcutController(() => actions);

  controller.handleKeyDown(createMockEvent({ key: "Control", ctrlKey: true, target: inputEl }).event);
  controller.handleKeyUp(createMockEvent({ key: "Control", ctrlKey: false, target: inputEl }).event);

  assert.equal(calls.replayAudio.length, 0);
});

// 7. Popover single source of truth tests
test("Popover: LISTENING_SHORTCUTS defines exactly the 4 required shortcuts without obsolete rows", () => {
  assert.equal(LISTENING_SHORTCUTS.length, 4);

  const ids = LISTENING_SHORTCUTS.map((s) => s.id);
  assert.deepEqual(ids, ["PLAY_PAUSE", "SELECT_ANSWER", "CHECK_OR_NEXT", "REPLAY"]);

  const labels = LISTENING_SHORTCUTS.map((s) => s.label);
  assert.ok(labels.includes("Phát / Dừng audio"));
  assert.ok(labels.includes("Chọn đáp án A – D"));
  assert.ok(labels.includes("Kiểm tra / Câu tiếp"));
  assert.ok(labels.includes("Nghe lại"));

  // Check key displays
  assert.equal(LISTENING_SHORTCUTS.find((s) => s.id === "PLAY_PAUSE")?.keyDisplay, "Space");
  assert.equal(LISTENING_SHORTCUTS.find((s) => s.id === "SELECT_ANSWER")?.keyDisplay, "1 · 2 · 3 · 4");
  assert.equal(LISTENING_SHORTCUTS.find((s) => s.id === "CHECK_OR_NEXT")?.keyDisplay, "Enter");
  assert.equal(LISTENING_SHORTCUTS.find((s) => s.id === "REPLAY")?.keyDisplay, "Ctrl");

  // Ensure obsolete keys are not in the single source of truth
  const allKeyDisplays = LISTENING_SHORTCUTS.map((s) => s.keyDisplay).join(" ");
  assert.equal(allKeyDisplays.includes("Ctrl + Space"), false);
  assert.equal(allKeyDisplays.includes("Ctrl + Enter"), false);
  assert.equal(allKeyDisplays.includes("Shift + ←"), false);
  assert.equal(allKeyDisplays.includes("Alt + R"), false);
});

// 8. Image layout invariant tests
test("Image layout: ListeningComprehensionWorkspace uses balanced image sizing (larger than max-w-xl, without viewport stretching)", () => {
  const workspacePath = path.resolve(
    process.cwd(),
    "src/app/(student)/practice/listening/components/ListeningComprehensionWorkspace.tsx",
  );
  const content = fs.readFileSync(workspacePath, "utf-8");

  // 1. Must NOT contain the old oversized full-viewport stretching classes
  assert.equal(content.includes("max-h-[calc(100dvh-260px)]"), false);
  assert.equal(content.includes("w-full flex-1 flex items-center justify-center my-4 overflow-hidden rounded-2xl"), false);

  // 2. Must be larger than the overly restrictive max-w-xl (using max-w-4xl / max-w-5xl)
  assert.equal(content.includes("max-w-xl"), false);
  assert.ok(content.includes("max-w-4xl") || content.includes("max-w-5xl"));

  // 3. Must use responsive width expansion and bounded height (+15% scale)
  assert.ok(content.includes("w-fit") || content.includes("max-w-full"));
  assert.ok(content.includes("object-contain"));
  assert.ok(content.includes("lg:max-h-[440px]") || content.includes("xl:max-h-[485px]"));
});

test("Audio player: ListeningAudioPlayer no longer has conflicting Shift+ArrowLeft or Ctrl+Space listeners", () => {
  const playerPath = path.resolve(
    process.cwd(),
    "src/app/(student)/practice/listening/components/ListeningAudioPlayer.tsx",
  );
  const content = fs.readFileSync(playerPath, "utf-8");

  assert.equal(content.includes('e.shiftKey && e.code === "ArrowLeft"'), false);
  assert.equal(content.includes('e.ctrlKey && e.code === "Space"'), false);
});

test("Header integration: DailyDictationWorkspace uses standardized PracticeHeader with bilingual, notes, shortcuts and sound controls", () => {
  const dictationWorkspacePath = path.resolve(
    process.cwd(),
    "src/app/(student)/practice/listening/components/DailyDictationWorkspace.tsx",
  );
  const content = fs.readFileSync(dictationWorkspacePath, "utf-8");

  // 1. Must import and render PracticeHeader
  assert.ok(content.includes('import { PracticeHeader } from "@/components/practice/PracticeHeader"'));
  assert.ok(content.includes("<PracticeHeader"));

  // 2. Must wire required props
  assert.ok(content.includes("title={quiz.title}"));
  assert.ok(content.includes("positionText={`Câu ${currentIndex + 1} / ${questions.length}`}"));
  assert.ok(content.includes('onExit={() => onExit("/practice/listening")}'));
  assert.ok(content.includes("bilingualEnabled"));
  assert.ok(content.includes("notesEnabled"));
  assert.ok(content.includes("shortcutsEnabled"));
  assert.ok(content.includes("soundEnabled"));

  // 3. Must NOT contain the old redundant breadcrumbs or custom meta bar
  assert.equal(content.includes("Thanh điều hướng phân cấp"), false);
  assert.equal(content.includes("optionsRef"), false);
  assert.equal(content.includes("isStarred"), false);
});

test("Translation card: DailyDictationWorkspace does not contain 'Translated by ChatGPT'", () => {
  const dictationWorkspacePath = path.resolve(
    process.cwd(),
    "src/app/(student)/practice/listening/components/DailyDictationWorkspace.tsx",
  );
  const content = fs.readFileSync(dictationWorkspacePath, "utf-8");
  assert.equal(content.includes("Translated by ChatGPT"), false);
  assert.equal(content.includes("ChatGPT4.1"), false);
});

// ============================================================================
// Dictation Replay Hotkey Configuration Tests
// ============================================================================

test("Dictation Replay: Default Ctrl keydown + keyup triggers replay exactly once; Alt and Shift do not replay", () => {
  let replayCount = 0;
  const activeKey: DictationReplayKey = "Ctrl";
  const controller = createDictationReplayController(() => activeKey, () => {
    replayCount += 1;
  });

  // 1. Standalone Ctrl triggers replay exactly once
  controller.handleKeyDown(createMockEvent({ key: "Control", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Control", ctrlKey: false }).event);
  assert.equal(replayCount, 1);

  // 2. Alt does not replay when configured to Ctrl
  controller.handleKeyDown(createMockEvent({ key: "Alt", altKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Alt", altKey: false }).event);
  assert.equal(replayCount, 1); // still 1

  // 3. Shift does not replay when configured to Ctrl
  controller.handleKeyDown(createMockEvent({ key: "Shift", shiftKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Shift", shiftKey: false }).event);
  assert.equal(replayCount, 1); // still 1
});

test("Dictation Replay: Configured Alt keydown + keyup triggers replay exactly once; Ctrl and Shift do not replay", () => {
  let replayCount = 0;
  const activeKey: DictationReplayKey = "Alt";
  const controller = createDictationReplayController(() => activeKey, () => {
    replayCount += 1;
  });

  // 1. Standalone Alt triggers replay exactly once
  controller.handleKeyDown(createMockEvent({ key: "Alt", altKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Alt", altKey: false }).event);
  assert.equal(replayCount, 1);

  // 2. Ctrl does not replay when configured to Alt
  controller.handleKeyDown(createMockEvent({ key: "Control", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Control", ctrlKey: false }).event);
  assert.equal(replayCount, 1);

  // 3. Shift does not replay when configured to Alt
  controller.handleKeyDown(createMockEvent({ key: "Shift", shiftKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Shift", shiftKey: false }).event);
  assert.equal(replayCount, 1);
});

test("Dictation Replay: Configured Shift standalone triggers replay exactly once; Ctrl and Alt do not replay", () => {
  let replayCount = 0;
  const activeKey: DictationReplayKey = "Shift";
  const controller = createDictationReplayController(() => activeKey, () => {
    replayCount += 1;
  });

  // 1. Standalone Shift triggers replay exactly once
  controller.handleKeyDown(createMockEvent({ key: "Shift", shiftKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Shift", shiftKey: false }).event);
  assert.equal(replayCount, 1);

  // 2. Ctrl does not replay when configured to Shift
  controller.handleKeyDown(createMockEvent({ key: "Control", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Control", ctrlKey: false }).event);
  assert.equal(replayCount, 1);

  // 3. Alt does not replay when configured to Shift
  controller.handleKeyDown(createMockEvent({ key: "Alt", altKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Alt", altKey: false }).event);
  assert.equal(replayCount, 1);
});

test("Dictation Replay: Modifier combinations (Ctrl+C, Ctrl+V, Ctrl+F, Ctrl+Arrow) do not replay", () => {
  let replayCount = 0;
  const controller = createDictationReplayController(() => "Ctrl", () => {
    replayCount += 1;
  });

  // Ctrl+C
  controller.handleKeyDown(createMockEvent({ key: "Control", ctrlKey: true }).event);
  controller.handleKeyDown(createMockEvent({ key: "c", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "c", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Control", ctrlKey: false }).event);
  assert.equal(replayCount, 0);

  // Ctrl+V
  controller.handleKeyDown(createMockEvent({ key: "Control", ctrlKey: true }).event);
  controller.handleKeyDown(createMockEvent({ key: "v", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "v", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Control", ctrlKey: false }).event);
  assert.equal(replayCount, 0);

  // Ctrl+F
  controller.handleKeyDown(createMockEvent({ key: "Control", ctrlKey: true }).event);
  controller.handleKeyDown(createMockEvent({ key: "f", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "f", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Control", ctrlKey: false }).event);
  assert.equal(replayCount, 0);

  // Ctrl+ArrowRight
  controller.handleKeyDown(createMockEvent({ key: "Control", ctrlKey: true }).event);
  controller.handleKeyDown(createMockEvent({ key: "ArrowRight", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "ArrowRight", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Control", ctrlKey: false }).event);
  assert.equal(replayCount, 0);

  // Ctrl+ArrowLeft
  controller.handleKeyDown(createMockEvent({ key: "Control", ctrlKey: true }).event);
  controller.handleKeyDown(createMockEvent({ key: "ArrowLeft", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "ArrowLeft", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Control", ctrlKey: false }).event);
  assert.equal(replayCount, 0);
});

test("Dictation Replay: Alt+Tab, Alt+R, and held keydown repeated events do not cause duplicate replay", () => {
  let replayCount = 0;
  const controller = createDictationReplayController(() => "Alt", () => {
    replayCount += 1;
  });

  // Alt+Tab
  controller.handleKeyDown(createMockEvent({ key: "Alt", altKey: true }).event);
  controller.handleKeyDown(createMockEvent({ key: "Tab", altKey: true }).event);
  controller.handleBlur(); // window blur on tab switch
  controller.handleKeyUp(createMockEvent({ key: "Alt", altKey: false }).event);
  assert.equal(replayCount, 0);

  // Alt+R does not replay unless standalone Alt
  controller.handleKeyDown(createMockEvent({ key: "Alt", altKey: true }).event);
  controller.handleKeyDown(createMockEvent({ key: "r", altKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "r", altKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Alt", altKey: false }).event);
  assert.equal(replayCount, 0);

  // Repeated keydown while held
  controller.handleKeyDown(createMockEvent({ key: "Alt", altKey: true, repeat: false }).event);
  controller.handleKeyDown(createMockEvent({ key: "Alt", altKey: true, repeat: true }).event);
  controller.handleKeyDown(createMockEvent({ key: "Alt", altKey: true, repeat: true }).event);
  assert.equal(replayCount, 0); // none while held
  controller.handleKeyUp(createMockEvent({ key: "Alt", altKey: false }).event);
  assert.equal(replayCount, 1); // exactly once on release
});

test("Dictation integration: Parent shortcut controller does not replay Ctrl when isDictation is true", () => {
  const { actions, calls } = createMockActions({ isDictation: true });
  const parentController = createListeningShortcutController(() => actions);

  // 1. Parent controller receives Ctrl down + up while in dictation
  parentController.handleKeyDown(createMockEvent({ key: "Control", ctrlKey: true }).event);
  parentController.handleKeyUp(createMockEvent({ key: "Control", ctrlKey: false }).event);

  // 2. Parent MUST NOT trigger replayAudio (skipped completely for Dictation)
  assert.equal(calls.replayAudio.length, 0);

  // 3. DailyDictationWorkspace Replay controller handles the configured key independently
  let dictationReplayCount = 0;
  const configuredKey: DictationReplayKey = "Alt";
  const dictationController = createDictationReplayController(() => configuredKey, () => {
    dictationReplayCount += 1;
  });

  // Pressing Ctrl does not trigger dictation replay because configuredKey is Alt
  dictationController.handleKeyDown(createMockEvent({ key: "Control", ctrlKey: true }).event);
  dictationController.handleKeyUp(createMockEvent({ key: "Control", ctrlKey: false }).event);
  assert.equal(dictationReplayCount, 0);

  // Pressing Alt triggers dictation replay exactly once
  dictationController.handleKeyDown(createMockEvent({ key: "Alt", altKey: true }).event);
  dictationController.handleKeyUp(createMockEvent({ key: "Alt", altKey: false }).event);
  assert.equal(dictationReplayCount, 1);
});

test("Lifecycle: Switching configured replay key from Ctrl -> Alt -> Shift dynamically removes previous key", () => {
  let replayCount = 0;
  let configuredKey: DictationReplayKey = "Ctrl";
  const controller = createDictationReplayController(() => configuredKey, () => {
    replayCount += 1;
  });

  // 1. Initially Ctrl
  controller.handleKeyDown(createMockEvent({ key: "Control", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Control", ctrlKey: false }).event);
  assert.equal(replayCount, 1);

  // 2. Switch to Alt (simulating Settings modal Done click)
  controller.reset();
  configuredKey = "Alt";

  // Old key Ctrl no longer replays
  controller.handleKeyDown(createMockEvent({ key: "Control", ctrlKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Control", ctrlKey: false }).event);
  assert.equal(replayCount, 1); // still 1

  // New key Alt replays
  controller.handleKeyDown(createMockEvent({ key: "Alt", altKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Alt", altKey: false }).event);
  assert.equal(replayCount, 2);

  // 3. Switch to Shift
  controller.reset();
  configuredKey = "Shift";

  // Old key Alt no longer replays
  controller.handleKeyDown(createMockEvent({ key: "Alt", altKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Alt", altKey: false }).event);
  assert.equal(replayCount, 2); // still 2

  // New key Shift replays
  controller.handleKeyDown(createMockEvent({ key: "Shift", shiftKey: true }).event);
  controller.handleKeyUp(createMockEvent({ key: "Shift", shiftKey: false }).event);
  assert.equal(replayCount, 3);
});

test("Obsolete logic removal: DailyDictationWorkspace.tsx does not contain legacy Alt shortcuts or external replay listener", () => {
  const dictationWorkspacePath = path.resolve(
    process.cwd(),
    "src/app/(student)/practice/listening/components/DailyDictationWorkspace.tsx",
  );
  const content = fs.readFileSync(dictationWorkspacePath, "utf-8");

  // 1. Must NOT contain hard-coded Alt+R replay
  assert.equal(content.includes('e.altKey && e.key.toLowerCase() === "r"'), false);

  // 2. Must NOT contain obsolete legacy shortcuts (Alt+S, Alt+A, Alt+T, Alt+Space, Ctrl+Space)
  assert.equal(content.includes('e.altKey && e.key.toLowerCase() === "s"'), false);
  assert.equal(content.includes('e.altKey && e.key.toLowerCase() === "a"'), false);
  assert.equal(content.includes('e.altKey && e.key.toLowerCase() === "t"'), false);
  assert.equal(content.includes('e.altKey && e.code === "Space"'), false);
  assert.equal(content.includes('e.ctrlKey && e.code === "Space"'), false);

  // 3. Must NOT listen to external breadtrans:replay-listening-audio event (no multiple replay sources)
  assert.equal(content.includes('addEventListener("breadtrans:replay-listening-audio"'), false);
});
