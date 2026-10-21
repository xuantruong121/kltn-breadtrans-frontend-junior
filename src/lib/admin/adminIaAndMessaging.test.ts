import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ADMIN_AI_AUTHORING_DESTINATIONS,
  ADMIN_NAV_GROUPS,
  isAdminGroupActive,
} from "./adminNavConfig.ts";

describe("Admin IA and Messaging UX Invariants", () => {
  describe("Problem A: Dashboard Exam Authoring Card Semantics", () => {
    it("renders 'Luyện đề' with route '/admin/exams' and without 'TOEIC Part 5' mismatch", () => {
      // 1. Invariant: Card label is 'Luyện đề'
      const examDestination = ADMIN_AI_AUTHORING_DESTINATIONS.find(
        (dest) => dest.href === "/admin/exams",
      );
      assert.ok(
        examDestination,
        "Destination '/admin/exams' must exist in ADMIN_AI_AUTHORING_DESTINATIONS",
      );
      assert.equal(
        examDestination.label,
        "Luyện đề",
        "Card label must be 'Luyện đề'",
      );
      assert.equal(
        examDestination.description,
        "Soạn và quản lý nội dung luyện đề.",
        "Card description must describe generic exam authoring, not Part 5 only",
      );

      // 2. Invariant: Old misleading label 'TOEIC Part 5' is completely removed
      const oldPart5Destination = ADMIN_AI_AUTHORING_DESTINATIONS.find(
        (dest) =>
          dest.label.includes("Part 5") || dest.description.includes("Part 5"),
      );
      assert.equal(
        oldPart5Destination,
        undefined,
        "Old 'TOEIC Part 5' shortcut or Part 5 specific disclaimer must NOT exist on Dashboard",
      );
    });

    it("satisfies ADMIN_DASHBOARD_EXAM_CARD_LABEL and ADMIN_DASHBOARD_EXAM_CARD_ROUTE_PASS", () => {
      const examCard = ADMIN_AI_AUTHORING_DESTINATIONS.find(
        (dest) => dest.href === "/admin/exams",
      );
      assert.equal(examCard?.label, "Luyện đề");
      assert.equal(examCard?.href, "/admin/exams");
    });
  });

  describe("Problem B: Sidebar Grouping for 'Tin nhắn'", () => {
    it("removes 'Tin nhắn' from 'NỘI DUNG HỌC' (ADMIN_MESSAGES_UNDER_CONTENT=false)", () => {
      const contentGroup = ADMIN_NAV_GROUPS.find((g) => g.id === "content-group");
      assert.ok(contentGroup, "Content group must exist");
      const messagesInContent = contentGroup.items.find(
        (item) => item.id === "messages" || item.href === "/admin/messages",
      );
      assert.equal(
        messagesInContent,
        undefined,
        "'Tin nhắn' MUST NOT remain under NỘI DUNG HỌC",
      );
    });

    it("moves 'Tin nhắn' to 'VẬN HÀNH & HỆ THỐNG' (ADMIN_MESSAGES_UNDER_OPERATIONS=true)", () => {
      const systemGroup = ADMIN_NAV_GROUPS.find((g) => g.id === "system-group");
      assert.ok(systemGroup, "System/Operations group must exist");
      assert.equal(
        systemGroup.title,
        "VẬN HÀNH & HỆ THỐNG",
        "Group title should be 'VẬN HÀNH & HỆ THỐNG'",
      );

      const messagesInSystem = systemGroup.items.find(
        (item) => item.id === "messages" && item.href === "/admin/messages",
      );
      assert.ok(
        messagesInSystem,
        "'Tin nhắn' must be present in 'VẬN HÀNH & HỆ THỐNG'",
      );
      assert.equal(messagesInSystem.label, "Tin nhắn");
    });

    it("ensures no duplicate 'Tin nhắn' navigation item (ADMIN_MESSAGES_NAV_DUPLICATE=false)", () => {
      let totalMessageItems = 0;
      for (const group of ADMIN_NAV_GROUPS) {
        for (const item of group.items) {
          if (item.id === "messages" || item.href === "/admin/messages") {
            totalMessageItems++;
          }
        }
      }
      assert.equal(
        totalMessageItems,
        1,
        "'Tin nhắn' must appear exactly once across all sidebar groups",
      );
    });

    it("activates 'VẬN HÀNH & HỆ THỐNG' when pathname is '/admin/messages' and leaves 'NỘI DUNG HỌC' inactive", () => {
      const pathname = "/admin/messages";

      const contentGroup = ADMIN_NAV_GROUPS.find((g) => g.id === "content-group")!;
      const systemGroup = ADMIN_NAV_GROUPS.find((g) => g.id === "system-group")!;

      const isContentActive = isAdminGroupActive(contentGroup, pathname);
      const isSystemActive = isAdminGroupActive(systemGroup, pathname);

      assert.equal(
        isContentActive,
        false,
        "NỘI DUNG HỌC must NOT be active when on /admin/messages",
      );
      assert.equal(
        isSystemActive,
        true,
        "VẬN HÀNH & HỆ THỐNG MUST be active when on /admin/messages",
      );
    });
  });

  describe("Problem C: Messaging Workspace Layout and Invariants", () => {
    const messagesPagePath = path.resolve(
      process.cwd(),
      "src/app/(admin)/admin/messages/page.tsx",
    );
    const sourceCode = fs.readFileSync(messagesPagePath, "utf-8");

    it("verifies viewport bounded workspace (ADMIN_MESSAGES_WORKSPACE_BOUNDED=true)", () => {
      // Container has viewport-bounded height calculation
      assert.ok(
        sourceCode.includes("h-[calc(100dvh-") || sourceCode.includes("h-[calc(100vh-"),
        "Messaging container must have a viewport-bounded height calc",
      );
      assert.ok(
        sourceCode.includes("min-h-["),
        "Messaging container must have a min-height constraint",
      );
      assert.ok(
        sourceCode.includes("flex-1 min-h-0"),
        "Workspace section must have flex-1 min-h-0 to prevent indefinite page height growth",
      );
    });

    it("verifies message history scroll is internal (ADMIN_MESSAGE_HISTORY_SCROLL_INTERNAL=true)", () => {
      assert.ok(
        sourceCode.includes("overflow-y-auto"),
        "Messages history area must have overflow-y-auto",
      );
      assert.ok(
        sourceCode.includes("messagesContainerRef"),
        "Messages history area must have a ref to control scroll position",
      );
    });

    it("verifies message composer is persistent/fixed at bottom (ADMIN_MESSAGE_COMPOSER_PERSISTENT=true)", () => {
      assert.ok(
        sourceCode.includes("<form"),
        "Composer must be a form element",
      );
      // Composer has shrink-0 to stay outside the message scroller
      assert.ok(
        sourceCode.includes("shrink-0 border-t"),
        "Composer must have shrink-0 and top border at the bottom of the conversation panel",
      );
    });

    it("verifies message bubbles have constrained width (ADMIN_MESSAGE_BUBBLE_WIDTH_CONSTRAINED=true)", () => {
      // Must not use full available width, max-width constrained to 65-75% range
      assert.ok(
        sourceCode.includes("max-w-[75%]") ||
          sourceCode.includes("max-w-[70%]") ||
          sourceCode.includes("max-w-[640px]"),
        "Message bubble width must be constrained to a readable width",
      );
    });

    it("verifies mobile responsive column toggle and back button (ADMIN_MESSAGING_MOBILE_PASS=true)", () => {
      // On mobile when selectedId is set, aside is hidden
      assert.ok(
        sourceCode.includes("selectedId ? \"max-lg:hidden\" : \"\""),
        "Left column must hide on mobile when a conversation is active",
      );
      // Back button exists with accessible label
      assert.ok(
        sourceCode.includes("Quay lại danh sách tin nhắn"),
        "Back button with accessible label must exist for mobile navigation",
      );
      assert.ok(
        sourceCode.includes("setSelectedId(null)"),
        "Back button must reset selectedId to return to conversation list",
      );
    });

    it("verifies left panel desktop width matches 280-340px requirement", () => {
      assert.ok(
        sourceCode.includes("lg:grid-cols-[300px_minmax(0,1fr)]") ||
          sourceCode.includes("lg:grid-cols-[320px_minmax(0,1fr)]"),
        "Desktop conversation list width must be in the 280-340px target range",
      );
    });
  });
});
