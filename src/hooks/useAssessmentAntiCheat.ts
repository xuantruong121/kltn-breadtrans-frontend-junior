"use client";

import { useEffect, useRef } from "react";

export type AssessmentViolationType =
  | "FULLSCREEN_EXIT"
  | "TAB_HIDDEN"
  | "WINDOW_BLUR"
  | "COPY_ATTEMPT"
  | "PASTE_ATTEMPT"
  | "CONTEXT_MENU_ATTEMPT";

export interface UseAssessmentAntiCheatOptions {
  /**
   * Whether anti-cheat monitoring and integrity enforcement is enabled.
   * Strictly false for individual practice and TOEIC PRACTICE mode.
   * True only for TOEIC FULL_TEST and active Diagnostic assessment.
   */
  enabled: boolean;
  /**
   * Stable callback to record an integrity violation event.
   */
  onViolation?: (type: AssessmentViolationType) => void;
  /**
   * Whether to prevent copying and pasting. Defaults to true when enabled.
   */
  preventClipboard?: boolean;
  /**
   * Whether to prevent opening context menu (right click). Defaults to true when enabled.
   */
  preventContextMenu?: boolean;
}

export function useAssessmentAntiCheat({
  enabled,
  onViolation,
  preventClipboard = true,
  preventContextMenu = true,
}: UseAssessmentAntiCheatOptions) {
  const onViolationRef = useRef(onViolation);
  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  const hasEnteredFullscreenRef = useRef(false);
  const isTerminatedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      hasEnteredFullscreenRef.current = false;
      return;
    }

    isTerminatedRef.current = false;

    // Check if fullscreen is already active upon enable
    if (typeof document !== "undefined" && document.fullscreenElement) {
      hasEnteredFullscreenRef.current = true;
    }

    const report = (type: AssessmentViolationType) => {
      if (isTerminatedRef.current) return;
      onViolationRef.current?.(type);
    };

    const handleFullscreenChange = () => {
      if (isTerminatedRef.current) return;
      if (document.fullscreenElement) {
        hasEnteredFullscreenRef.current = true;
      } else if (hasEnteredFullscreenRef.current) {
        report("FULLSCREEN_EXIT");
      }
    };

    const handleVisibilityChange = () => {
      if (isTerminatedRef.current) return;
      if (document.visibilityState === "hidden") {
        report("TAB_HIDDEN");
      }
    };

    const handleBlur = () => {
      if (isTerminatedRef.current) return;
      report("WINDOW_BLUR");
    };

    const handleCopy = (e: ClipboardEvent) => {
      if (isTerminatedRef.current) return;
      if (preventClipboard) {
        e.preventDefault();
      }
      report("COPY_ATTEMPT");
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (isTerminatedRef.current) return;
      if (preventClipboard) {
        e.preventDefault();
      }
      report("PASTE_ATTEMPT");
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (isTerminatedRef.current) return;
      if (preventContextMenu) {
        e.preventDefault();
      }
      report("CONTEXT_MENU_ATTEMPT");
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      isTerminatedRef.current = true;
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [enabled, preventClipboard, preventContextMenu]);

  const markTerminated = () => {
    isTerminatedRef.current = true;
  };

  return { markTerminated };
}
