"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export interface UsePracticeExitGuardOptions {
  /**
   * True if the practice session is active and has not been successfully submitted/completed.
   * Mandatory from the moment the session opens, even before any answer or draft is entered.
   */
  shouldConfirmExit: boolean;
  /**
   * Practice catalog fallback URL to navigate to when exiting (e.g. "/practice/listening").
   */
  defaultFallbackUrl: string;
  /**
   * Optional callback fired when the user explicitly confirms exit.
   */
  onConfirmExit?: () => void;
  /**
   * Whether this guard is enabled (default: true).
   * Ensures exactly ONE component owns the guard per practice session.
   */
  enabled?: boolean;
}

import {
  type LinkClickContext,
  type LinkInterceptionResult,
  shouldInterceptLinkClick,
  shouldShowPracticeExitConfirmation,
} from "./practiceExitGuardUtils";

export type { LinkClickContext, LinkInterceptionResult };
export { shouldInterceptLinkClick, shouldShowPracticeExitConfirmation };

export function usePracticeExitGuard({
  shouldConfirmExit,
  defaultFallbackUrl,
  onConfirmExit,
  enabled = true,
}: UsePracticeExitGuardOptions) {
  const router = useRouter();
  const isGuardActive = shouldShowPracticeExitConfirmation({
    isSuccessfullySubmitted: !shouldConfirmExit,
    enabled,
  });
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingDestination, setPendingDestination] = useState<string | null>(null);
  const [isExternalDestination, setIsExternalDestination] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Active state references to avoid stale closures in event listeners
  const isActiveRef = useRef(isGuardActive);
  useEffect(() => {
    isActiveRef.current = isGuardActive;
  }, [isGuardActive]);

  const isNavigatingRef = useRef(isNavigating);
  useEffect(() => {
    isNavigatingRef.current = isNavigating;
  }, [isNavigating]);

  const defaultFallbackUrlRef = useRef(defaultFallbackUrl);
  useEffect(() => {
    defaultFallbackUrlRef.current = defaultFallbackUrl;
  }, [defaultFallbackUrl]);

  const triggerElementRef = useRef<HTMLElement | null>(null);
  const isBypassingGuardRef = useRef(false);

  // 1. Native beforeunload listener for browser tab close/refresh
  useEffect(() => {
    if (!isGuardActive) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isActiveRef.current || isBypassingGuardRef.current) return;
      e.preventDefault();
      // Required for modern browsers to trigger the native reload/close confirmation dialog
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isGuardActive]);

  // 2. Programmatic exit trigger (e.g. in-page Back, Exit, or Return button)
  const confirmExit = useCallback(
    (targetUrl?: string) => {
      const destination = targetUrl || defaultFallbackUrlRef.current;

      if (!isActiveRef.current) {
        router.replace(destination);
        return;
      }

      triggerElementRef.current = document.activeElement as HTMLElement | null;
      setPendingDestination(destination);
      setIsExternalDestination(false);
      setShowExitDialog(true);
    },
    [router]
  );

  // 3. Safe document link interceptor (handles site header / navigation links)
  useEffect(() => {
    if (!isGuardActive) return;

    const handleDocumentClick = (e: MouseEvent) => {
      if (!isActiveRef.current || isBypassingGuardRef.current) return;

      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const result = shouldInterceptLinkClick({
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        button: e.button,
        target: anchor.getAttribute("target"),
        download: anchor.getAttribute("download") !== null,
        href: anchor.getAttribute("href"),
        currentLocation: {
          origin: window.location.origin,
          pathname: window.location.pathname,
          search: window.location.search,
          href: window.location.href,
        },
      });

      if (!result.shouldIntercept || !result.destination) return;

      // Intercept navigation to prompt custom exit modal
      e.preventDefault();
      e.stopPropagation();

      triggerElementRef.current = document.activeElement as HTMLElement | null;
      setPendingDestination(result.destination);
      setIsExternalDestination(result.isExternal);
      setShowExitDialog(true);
    };

    document.addEventListener("click", handleDocumentClick, true); // capture phase
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [isGuardActive]);

  // 4. Browser Back button popstate guard
  useEffect(() => {
    if (!isGuardActive) return;

    // Push dummy history entry so browser Back triggers popstate on this page
    const stateObj = { practiceExitGuard: true };
    window.history.pushState(stateObj, "", window.location.href);

    const handlePopState = () => {
      if (!isActiveRef.current || isBypassingGuardRef.current) return;

      // Re-push state so learner remains on current exercise while modal is open
      window.history.pushState(stateObj, "", window.location.href);
      triggerElementRef.current = document.activeElement as HTMLElement | null;

      // Set destination explicitly to catalog fallback URL (avoiding router back history trap)
      setPendingDestination(defaultFallbackUrlRef.current);
      setIsExternalDestination(false);
      setShowExitDialog(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isGuardActive]);

  // 5. User choice: "Ở lại học tiếp" (stay in practice)
  const handleStay = useCallback(() => {
    setShowExitDialog(false);
    setPendingDestination(null);
    setIsExternalDestination(false);
    // Restore focus to triggering element
    if (triggerElementRef.current && typeof triggerElementRef.current.focus === "function") {
      setTimeout(() => {
        triggerElementRef.current?.focus();
      }, 50);
    }
  }, []);

  // 6. User choice: "Thoát bài luyện" (confirm exit)
  const handleConfirmExit = useCallback(() => {
    if (isNavigatingRef.current) return;
    setIsNavigating(true);
    isBypassingGuardRef.current = true;
    setShowExitDialog(false);

    try {
      onConfirmExit?.();
    } catch {
      // Ignore errors in exit callback to guarantee navigation proceeds
    }

    const destination = pendingDestination || defaultFallbackUrlRef.current;
    if (isExternalDestination) {
      window.location.assign(destination);
    } else {
      router.replace(destination);
    }
  }, [isExternalDestination, onConfirmExit, pendingDestination, router]);

  return {
    showExitDialog,
    isNavigating,
    confirmExit,
    handleStay,
    handleConfirmExit,
    exitDialogProps: {
      isOpen: showExitDialog,
      onStay: handleStay,
      onConfirmExit: handleConfirmExit,
      isNavigating,
    },
  };
}
