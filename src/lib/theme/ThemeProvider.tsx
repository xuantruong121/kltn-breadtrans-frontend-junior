"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  type Theme,
  THEME_STORAGE_KEY,
  applyTheme,
  getInitialTheme,
  saveTheme,
} from "./theme";

export interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined,
);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname ? pathname.startsWith("/admin") : false;

  const [theme, setThemeState] = useState<Theme>(() => getInitialTheme("light"));

  // Apply theme to DOM and keep Admin CMS strictly light
  useEffect(() => {
    applyTheme(theme, isAdmin);
  }, [theme, isAdmin]);

  // Synchronize cross-tab theme changes
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        const nextTheme = event.newValue;
        if (nextTheme === "light" || nextTheme === "dark") {
          setThemeState(nextTheme);
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Listen for OS system preference changes if no manual override is stored
  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (!stored) {
        const next = e.matches ? "dark" : "light";
        setThemeState(next);
      }
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      saveTheme(newTheme);
      applyTheme(newTheme, isAdmin);
    },
    [isAdmin],
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const value: ThemeContextValue = {
    theme,
    resolvedTheme: isAdmin ? "light" : theme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
