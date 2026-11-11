"use client";

import React from "react";
import { MessageCircleQuestion } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useChatAssistantStore, type TutorItemContext } from "@/stores/chatAssistantStore";

/**
 * "Hỏi gia sư" on an answered item: opens the tutor panel with that item
 * attached. Only ids travel; the server reads the question and the key itself.
 * Shown to learners only, and only where the panel exists (result pages).
 */
export function AskTutorButton({
  context,
  onAsk,
  className = "",
}: {
  context: TutorItemContext;
  onAsk?: () => void;
  className?: string;
}) {
  const role = useAuthStore((state) => state.user?.role);
  const askTutorAbout = useChatAssistantStore((state) => state.askTutorAbout);
  if (role !== "STUDENT") return null;
  return (
    <button
      type="button"
      onClick={() => {
        onAsk?.();
        askTutorAbout(context);
      }}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 transition-colors hover:border-blue-300 hover:bg-blue-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/50 ${className}`}
    >
      <MessageCircleQuestion size={15} strokeWidth={2} aria-hidden="true" />
      <span>Hỏi gia sư</span>
    </button>
  );
}
