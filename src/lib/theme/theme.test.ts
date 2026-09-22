import test from "node:test";
import assert from "node:assert/strict";
import {
  THEME_STORAGE_KEY,
  applyTheme,
  getInitialTheme,
  saveTheme,
} from "./theme.ts";

test("Theme Logic & Admin Isolation Test Suite", async (t) => {
  await t.test("getInitialTheme returns defaultFallback when window is undefined", () => {
    // In node environment without global window
    const originalWindow = globalThis.window;
    // @ts-expect-error - simulating SSR
    delete globalThis.window;

    const theme = getInitialTheme("light");
    assert.equal(theme, "light");

    globalThis.window = originalWindow;
  });

  await t.test("getInitialTheme reads saved preference from localStorage", () => {
    const store: Record<string, string> = { [THEME_STORAGE_KEY]: "dark" };
    const mockStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    };

    globalThis.window = {
      localStorage: mockStorage as unknown as Storage,
      matchMedia: () => ({ matches: false } as unknown as MediaQueryList),
    } as unknown as Window & typeof globalThis;

    const theme = getInitialTheme("light");
    assert.equal(theme, "dark");
  });

  await t.test("getInitialTheme falls back to matchMedia when no localStorage", () => {
    globalThis.window = {
      localStorage: {
        getItem: () => null,
      } as unknown as Storage,
      matchMedia: (query: string) =>
        ({
          matches: query === "(prefers-color-scheme: dark)",
        }) as unknown as MediaQueryList,
    } as unknown as Window & typeof globalThis;

    const theme = getInitialTheme("light");
    assert.equal(theme, "dark");
  });

  await t.test("applyTheme adds 'dark' class when dark and not admin", () => {
    const classList = new Set<string>();
    globalThis.document = {
      documentElement: {
        classList: {
          add: (c: string) => classList.add(c),
          remove: (c: string) => classList.delete(c),
          contains: (c: string) => classList.has(c),
        } as unknown as DOMTokenList,
      },
    } as unknown as Document;

    applyTheme("dark", false);
    assert.equal(classList.has("dark"), true);

    applyTheme("light", false);
    assert.equal(classList.has("dark"), false);
  });

  await t.test("applyTheme STRICTLY enforces light mode when isAdmin is true", () => {
    const classList = new Set<string>(["dark"]);
    globalThis.document = {
      documentElement: {
        classList: {
          add: (c: string) => classList.add(c),
          remove: (c: string) => classList.delete(c),
          contains: (c: string) => classList.has(c),
        } as unknown as DOMTokenList,
      },
    } as unknown as Document;

    // Even if theme is dark, isAdmin = true must strip 'dark' class
    applyTheme("dark", true);
    assert.equal(classList.has("dark"), false);
  });

  await t.test("saveTheme writes to localStorage safely", () => {
    let savedKey = "";
    let savedVal = "";
    globalThis.window = {
      localStorage: {
        setItem: (k: string, v: string) => {
          savedKey = k;
          savedVal = v;
        },
      } as unknown as Storage,
    } as unknown as Window & typeof globalThis;

    saveTheme("dark");
    assert.equal(savedKey, THEME_STORAGE_KEY);
    assert.equal(savedVal, "dark");
  });
});
