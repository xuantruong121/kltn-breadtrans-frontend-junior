import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import test from "node:test";

/**
 * A page that draws its own top bar (AuthShell: login, register, forgot and
 * reset password, change password) must not sit in a route group whose layout
 * already draws the app header (AppHeader), or the page shows two headers.
 * That happened on 2026-11-26 with reset-password and forgot-password under
 * (public), and the Vercel build of main still shows it.
 */

type Source = { path: string; text: string };

/** The route groups, "(public)" and "(student)", whose layout.tsx draws AppHeader. */
export function groupsWithAppHeader(layouts: Source[]): string[] {
  return layouts
    .filter((layout) => layout.text.includes("AppHeader"))
    .map((layout) => layout.path.split("/").slice(0, -1).join("/"));
}

/** A page file that draws AuthShell, itself or through a component it imports. */
export function drawsAuthShell(page: Source, resolve: (specifier: string) => string | null): boolean {
  if (/<AuthShell\b/.test(page.text)) return true;
  for (const match of page.text.matchAll(/from\s+["'](@\/[^"']+)["']/g)) {
    const imported = resolve(match[1]);
    if (imported && /<AuthShell\b/.test(imported)) return true;
  }
  return false;
}

export function doubleHeaderPages(pages: Source[], layouts: Source[], resolve: (s: string) => string | null): string[] {
  const groups = groupsWithAppHeader(layouts);
  return pages
    .filter((page) => groups.some((group) => page.path.startsWith(`${group}/`)))
    .filter((page) => drawsAuthShell(page, resolve))
    .map((page) => page.path);
}

test("the check finds an AuthShell page placed under a layout that draws AppHeader", () => {
  const layouts = [
    { path: "app/(public)/layout.tsx", text: "<AppHeader />" },
    { path: "app/(admin)/layout.tsx", text: "<AdminSidebar />" },
  ];
  const pages = [
    { path: "app/(public)/reset-password/page.tsx", text: "<AuthShell>x</AuthShell>" },
    { path: "app/(public)/help/page.tsx", text: "<main>help</main>" },
    { path: "app/login/page.tsx", text: "<AuthShell>x</AuthShell>" },
  ];
  assert.deepEqual(doubleHeaderPages(pages, layouts, () => null), ["app/(public)/reset-password/page.tsx"]);
});

test("the check sees AuthShell reached through an imported component", () => {
  const layouts = [{ path: "app/(public)/layout.tsx", text: "<AppHeader />" }];
  const pages = [{ path: "app/(public)/register/page.tsx", text: 'import { RegisterFlow } from "@/components/auth/RegisterFlow";' }];
  const resolve = (s: string) => (s === "@/components/auth/RegisterFlow" ? "<AuthShell>flow</AuthShell>" : null);
  assert.deepEqual(doubleHeaderPages(pages, layouts, resolve), ["app/(public)/register/page.tsx"]);
});

test("no page that draws its own top bar sits under a layout that draws the app header", () => {
  const root = join(process.cwd(), "src");
  const appDir = join(root, "app");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "page.tsx" || entry.name === "layout.tsx") files.push(full);
    }
  };
  walk(appDir);
  const toSource = (full: string): Source => ({
    path: relative(root, full).split(sep).join("/"),
    text: readFileSync(full, "utf8"),
  });
  const layouts = files.filter((f) => f.endsWith("layout.tsx")).map(toSource);
  const pages = files.filter((f) => f.endsWith("page.tsx")).map(toSource);
  assert.ok(pages.length > 20, "the scan should see the app's pages");
  assert.ok(groupsWithAppHeader(layouts).length >= 1, "the scan should see a layout that draws AppHeader");
  const resolve = (specifier: string): string | null => {
    const base = join(root, specifier.slice(2));
    for (const candidate of [`${base}.tsx`, `${base}.ts`, join(base, "index.tsx")]) {
      if (existsSync(candidate)) return readFileSync(candidate, "utf8");
    }
    return null;
  };
  assert.deepEqual(doubleHeaderPages(pages, layouts, resolve), []);
});
