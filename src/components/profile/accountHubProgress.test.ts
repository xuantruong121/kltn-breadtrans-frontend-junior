import { strict as assert } from "node:assert";
import fs from "node:fs";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const read = (relativePath: string) =>
  fs.readFileSync(new URL(relativePath, root), "utf8");

test("Account Hub exposes the canonical learning-progress tab and dropdown target", () => {
  const accountHub = read("components/profile/AccountHub.tsx");
  const header = read("components/navigation/AppHeader.tsx");

  assert.match(accountHub, /learning-progress/);
  assert.match(accountHub, /Tiến độ học tập/);
  assert.match(header, /\/hub\?tab=learning-progress/);
});

test("skill navigation uses canonical home routes and practice is not a hub CTA", () => {
  const nav = read("components/navigation/navUtils.ts");
  const header = read("components/navigation/AppHeader.tsx");

  for (const route of ["/listening", "/speaking", "/reading", "/writing"]) {
    assert.match(nav, new RegExp(`href: [\"']${route.replace("/", "\\/")}`));
    assert.match(header, new RegExp(`href: [\"']${route.replace("/", "\\/")}`));
  }
  assert.doesNotMatch(nav, /href: ["']\/practice["']/);
});

test("Reading detailed tracking is rendered from Account Hub, not the Reading home", () => {
  const progressTab = read("components/profile/LearningProgressTab.tsx");
  const readingHome = read("app/(student)/reading/page.tsx");
  const mistakesPage = read("app/(student)/reading/mistakes/page.tsx");
  const nextConfig = read("../next.config.ts");

  assert.match(progressTab, /Theo dõi kỹ năng con/);
  assert.match(progressTab, /readingService\.getTracking/);
  assert.match(progressTab, /href="\/reading\/mistakes"/);
  assert.match(mistakesPage, /href="\/hub\?tab=learning-progress"/);
  assert.doesNotMatch(nextConfig, /practice\/reading\/mistakes/);
  assert.doesNotMatch(nextConfig, /rewrites\(\)/);
  assert.doesNotMatch(readingHome, /Theo dõi tiến bộ theo kỹ năng con/);
});

test("canonical skill homes own their implementations and obsolete aliases are absent", () => {
  for (const route of ["listening", "speaking", "reading", "writing"]) {
    assert.equal(fs.existsSync(new URL(`app/(student)/${route}/page.tsx`, root)), true);
    assert.equal(fs.existsSync(new URL(`app/(student)/practice/${route}/page.tsx`, root)), false);
  }
  assert.equal(fs.existsSync(new URL("app/(student)/practice/page.tsx", root)), false);
  assert.equal(fs.existsSync(new URL("app/(student)/practice/reading/mistakes/page.tsx", root)), false);
});

test("Account Hub exposes only canonical tab keys after alias cleanup", () => {
  const accountHub = read("components/profile/AccountHub.tsx");
  for (const legacyTab of ["profile:", "plan:", "plans:", "quotas:", "password:", "device:", "notification:", "notifications:", "inventory:", "progress:"]) {
    assert.doesNotMatch(accountHub, new RegExp(`\\b${legacyTab}`));
  }
  for (const canonicalTab of ["account-profile", "account-plan", "account-password", "account-device", "account-notification", "account-inventory", "learning-progress"]) {
    assert.match(accountHub, new RegExp(canonicalTab));
  }
});

test("Dashboard keeps missions visible without rendering the adaptive planner card", () => {
  const dashboard = read("app/(student)/dashboard/page.tsx");

  assert.match(dashboard, /Nhiệm vụ hôm nay/);
  assert.doesNotMatch(dashboard, /<DailyPracticeCard/);
  assert.doesNotMatch(dashboard, /Hôm nay nên luyện gì/);
});
