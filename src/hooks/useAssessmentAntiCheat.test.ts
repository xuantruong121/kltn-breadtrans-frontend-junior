import assert from "node:assert/strict";
import test from "node:test";

// Mock minimal DOM environment for hook logic testing in Node.js test runner
class MockEventTarget {
  listeners: Record<string, Function[]> = {};

  addEventListener(type: string, fn: Function) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(fn);
  }

  removeEventListener(type: string, fn: Function) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter((cb) => cb !== fn);
  }

  dispatch(type: string, eventObj: any = {}) {
    const list = this.listeners[type] || [];
    for (const fn of list) {
      fn(eventObj);
    }
  }
}

// Simulate hook lifecycle manually to test listener attach/detach invariants
test("AntiCheat Hook: attaches listeners only when enabled, detaches on cleanup", () => {
  const mockDoc = new MockEventTarget();
  const mockWin = new MockEventTarget();

  let violations: string[] = [];
  const onViolation = (type: string) => violations.push(type);

  // Setup minimal global mocks
  const originalDoc = (global as any).document;
  const originalWin = (global as any).window;

  (global as any).document = {
    addEventListener: (t: string, fn: any) => mockDoc.addEventListener(t, fn),
    removeEventListener: (t: string, fn: any) => mockDoc.removeEventListener(t, fn),
    fullscreenElement: null,
    visibilityState: "visible",
  };
  (global as any).window = {
    addEventListener: (t: string, fn: any) => mockWin.addEventListener(t, fn),
    removeEventListener: (t: string, fn: any) => mockWin.removeEventListener(t, fn),
  };

  try {
    // 1. When disabled: no listeners attached
    assert.equal(mockDoc.listeners["fullscreenchange"]?.length ?? 0, 0);
    assert.equal(mockDoc.listeners["copy"]?.length ?? 0, 0);
    assert.equal(mockWin.listeners["blur"]?.length ?? 0, 0);

    // 2. Attach listeners when enabled
    const cleanup = simulateAntiCheat({
      enabled: true,
      onViolation,
      preventClipboard: true,
      preventContextMenu: true,
    });

    assert.equal(mockDoc.listeners["fullscreenchange"]?.length, 1);
    assert.equal(mockDoc.listeners["visibilitychange"]?.length, 1);
    assert.equal(mockWin.listeners["blur"]?.length, 1);
    assert.equal(mockDoc.listeners["copy"]?.length, 1);
    assert.equal(mockDoc.listeners["paste"]?.length, 1);
    assert.equal(mockDoc.listeners["contextmenu"]?.length, 1);

    // 3. Verify violations on events
    let prevented = false;
    mockDoc.dispatch("copy", { preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true, "Copy should be prevented");
    assert.ok(violations.includes("COPY_ATTEMPT"), "Should report COPY_ATTEMPT");

    mockWin.dispatch("blur", {});
    assert.ok(violations.includes("WINDOW_BLUR"), "Should report WINDOW_BLUR");

    (global as any).document.visibilityState = "hidden";
    mockDoc.dispatch("visibilitychange", {});
    assert.ok(violations.includes("TAB_HIDDEN"), "Should report TAB_HIDDEN");

    // 4. Cleanup detaches every listener
    cleanup();
    assert.equal(mockDoc.listeners["fullscreenchange"]?.length, 0);
    assert.equal(mockDoc.listeners["visibilitychange"]?.length, 0);
    assert.equal(mockWin.listeners["blur"]?.length, 0);
    assert.equal(mockDoc.listeners["copy"]?.length, 0);
    assert.equal(mockDoc.listeners["paste"]?.length, 0);
    assert.equal(mockDoc.listeners["contextmenu"]?.length, 0);

    // 5. Post-cleanup events do not report violations
    violations = [];
    mockDoc.dispatch("copy", { preventDefault: () => {} });
    assert.equal(violations.length, 0);
  } finally {
    (global as any).document = originalDoc;
    (global as any).window = originalWin;
  }
});

test("AntiCheat Hook: when preventClipboard is false, events are not cancelled", () => {
  const mockDoc = new MockEventTarget();
  const mockWin = new MockEventTarget();

  const violations: string[] = [];
  const onViolation = (type: string) => violations.push(type);

  const originalDoc = (global as any).document;
  const originalWin = (global as any).window;

  (global as any).document = {
    addEventListener: (t: string, fn: any) => mockDoc.addEventListener(t, fn),
    removeEventListener: (t: string, fn: any) => mockDoc.removeEventListener(t, fn),
    fullscreenElement: null,
    visibilityState: "visible",
  };
  (global as any).window = {
    addEventListener: (t: string, fn: any) => mockWin.addEventListener(t, fn),
    removeEventListener: (t: string, fn: any) => mockWin.removeEventListener(t, fn),
  };

  try {
    const cleanup = simulateAntiCheat({
      enabled: true,
      onViolation,
      preventClipboard: false,
      preventContextMenu: false,
    });

    let copyPrevented = false;
    mockDoc.dispatch("copy", { preventDefault: () => { copyPrevented = true; } });
    assert.equal(copyPrevented, false, "Copy should not be cancelled when preventClipboard is false");

    let contextPrevented = false;
    mockDoc.dispatch("contextmenu", { preventDefault: () => { contextPrevented = true; } });
    assert.equal(contextPrevented, false, "Context menu should not be cancelled when preventContextMenu is false");

    cleanup();
  } finally {
    (global as any).document = originalDoc;
    (global as any).window = originalWin;
  }
});

// Helper simulating hook lifecycle without React DOM renderer
function simulateAntiCheat(options: {
  enabled: boolean;
  onViolation: (type: any) => void;
  preventClipboard?: boolean;
  preventContextMenu?: boolean;
}) {
  let isTerminated = false;
  let hasEnteredFullscreen = Boolean((global as any).document?.fullscreenElement);

  const report = (type: any) => {
    if (isTerminated) return;
    options.onViolation(type);
  };

  const handleFullscreenChange = () => {
    if (isTerminated) return;
    if ((global as any).document?.fullscreenElement) {
      hasEnteredFullscreen = true;
    } else if (hasEnteredFullscreen) {
      report("FULLSCREEN_EXIT");
    }
  };

  const handleVisibilityChange = () => {
    if (isTerminated) return;
    if ((global as any).document?.visibilityState === "hidden") {
      report("TAB_HIDDEN");
    }
  };

  const handleBlur = () => {
    if (isTerminated) return;
    report("WINDOW_BLUR");
  };

  const handleCopy = (e: any) => {
    if (isTerminated) return;
    if (options.preventClipboard) e.preventDefault?.();
    report("COPY_ATTEMPT");
  };

  const handlePaste = (e: any) => {
    if (isTerminated) return;
    if (options.preventClipboard) e.preventDefault?.();
    report("PASTE_ATTEMPT");
  };

  const handleContextMenu = (e: any) => {
    if (isTerminated) return;
    if (options.preventContextMenu) e.preventDefault?.();
    report("CONTEXT_MENU_ATTEMPT");
  };

  if (options.enabled) {
    (global as any).document.addEventListener("fullscreenchange", handleFullscreenChange);
    (global as any).document.addEventListener("visibilitychange", handleVisibilityChange);
    (global as any).window.addEventListener("blur", handleBlur);
    (global as any).document.addEventListener("copy", handleCopy);
    (global as any).document.addEventListener("paste", handlePaste);
    (global as any).document.addEventListener("contextmenu", handleContextMenu);
  }

  return () => {
    isTerminated = true;
    (global as any).document.removeEventListener("fullscreenchange", handleFullscreenChange);
    (global as any).document.removeEventListener("visibilitychange", handleVisibilityChange);
    (global as any).window.removeEventListener("blur", handleBlur);
    (global as any).document.removeEventListener("copy", handleCopy);
    (global as any).document.removeEventListener("paste", handlePaste);
    (global as any).document.removeEventListener("contextmenu", handleContextMenu);
  };
}
