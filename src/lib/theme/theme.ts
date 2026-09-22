export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "breadtrans-theme";

function getWindow(): (Window & typeof globalThis) | undefined {
  if (typeof window !== "undefined") {
    return window;
  }
  if (typeof globalThis !== "undefined" && "window" in globalThis) {
    return (globalThis as unknown as { window: Window & typeof globalThis }).window;
  }
  return undefined;
}

function getDocument(): Document | undefined {
  if (typeof document !== "undefined") {
    return document;
  }
  if (typeof globalThis !== "undefined" && "document" in globalThis) {
    return (globalThis as unknown as { document: Document }).document;
  }
  return undefined;
}

/**
 * Resolves the initial theme.
 * Checks localStorage first, then falls back to system preference (prefers-color-scheme).
 * Safe to call during SSR (returns 'light' if window is not available).
 */
export function getInitialTheme(defaultFallback: Theme = "light"): Theme {
  const win = getWindow();
  if (!win) {
    return defaultFallback;
  }

  try {
    const saved = win.localStorage?.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }

    if (win.matchMedia && win.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
  } catch {
    // Ignore storage quota or access errors
  }

  return defaultFallback;
}

/**
 * Applies or removes the 'dark' class on document.documentElement.
 * When isAdmin is true, 'dark' is strictly removed to enforce Admin CMS isolation.
 */
export function applyTheme(theme: Theme, isAdmin: boolean = false): void {
  const doc = getDocument();
  if (!doc) {
    return;
  }

  const root = doc.documentElement;
  if (isAdmin || theme === "light") {
    root.classList.remove("dark");
  } else {
    root.classList.add("dark");
  }
}

/**
 * Saves the selected theme to localStorage.
 */
export function saveTheme(theme: Theme): void {
  const win = getWindow();
  if (!win) {
    return;
  }

  try {
    win.localStorage?.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage errors
  }
}
