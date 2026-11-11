"use client";

import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, MessageCircle } from "lucide-react";
import { supportService } from "@/lib/api/services/support.service";
import { useAuthStore } from "@/stores/authStore";
import { useChatAssistantStore } from "@/stores/chatAssistantStore";

/**
 * Unread messages from an admin, for the pet: the number is 0 while the tutor
 * panel is open, and opening the panel reads them.
 */
export function useTutorUnreadCount(): number {
  const user = useAuthStore((state) => state.user);
  const isTutorOpen = useChatAssistantStore((state) => state.isOpen);
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["support", "unread-count"],
    queryFn: supportService.getMyUnreadCount,
    enabled: !!user && user.role === "STUDENT",
    refetchInterval: 10000,
  });
  useEffect(() => {
    if (!isTutorOpen) return;
    const timer = window.setTimeout(
      () => void queryClient.invalidateQueries({ queryKey: ["support", "unread-count"] }),
      1500,
    );
    return () => window.clearTimeout(timer);
  }, [isTutorOpen, queryClient]);
  return isTutorOpen ? 0 : data?.count || 0;
}

/** Opens the tutor panel; shows how many admin messages wait there. */
export function TutorEntryButton({ onOpen, className = "" }: { onOpen?: () => void; className?: string }) {
  const setTutorOpen = useChatAssistantStore((state) => state.setIsOpen);
  const unread = useTutorUnreadCount();
  return (
    <button
      type="button"
      onClick={() => {
        onOpen?.();
        setTutorOpen(true);
      }}
      aria-label={unread > 0 ? `Hỏi trợ lý học tập, ${unread} tin nhắn chưa đọc` : "Hỏi trợ lý học tập"}
      className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl border border-blue-200 dark:border-sky-800/60 bg-blue-50/70 dark:bg-sky-950/40 px-3 py-2.5 text-left text-xs font-semibold text-blue-900 dark:text-sky-300 transition-colors hover:border-blue-300 dark:hover:border-sky-700 hover:bg-blue-100 dark:hover:bg-sky-900/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${className}`}
    >
      <span className="flex items-center gap-2">
        <MessageCircle size={15} className="text-blue-700 dark:text-sky-400" aria-hidden="true" />
        <span>Hỏi trợ lý học tập</span>
      </span>
      <span className="flex items-center gap-2">
        {unread > 0 && (
          <span className="rounded-full bg-rose-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
            {unread > 99 ? "99+" : unread} tin mới
          </span>
        )}
        <ChevronRight size={14} className="text-blue-700 dark:text-sky-400" aria-hidden="true" />
      </span>
    </button>
  );
}
