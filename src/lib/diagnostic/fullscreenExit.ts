/**
 * What to do about fullscreen once the diagnostic result is on screen.
 *
 * The page can leave only the fullscreen it entered itself
 * (document.fullscreenElement). A learner who left it during the test, for
 * example when the browser asked for the microphone, and came back with F11
 * is in the browser's own fullscreen, which no page can close: the learner is
 * told to press F11 instead of being left stuck.
 */
export type FullscreenAfterResult = "EXIT" | "HINT_F11" | "NONE";

export function fullscreenAfterResult(state: {
  /** document.fullscreenElement is set: the page's own fullscreen. */
  elementFullscreen: boolean;
  /** (display-mode: fullscreen) matches: the browser window is fullscreen. */
  browserFullscreen: boolean;
}): FullscreenAfterResult {
  if (state.elementFullscreen) return "EXIT";
  if (state.browserFullscreen) return "HINT_F11";
  return "NONE";
}

export const F11_HINT = "Trình duyệt vẫn đang ở chế độ toàn màn hình. Nhấn F11 để thoát.";
