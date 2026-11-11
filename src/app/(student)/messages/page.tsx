"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChatAssistantStore } from "@/stores/chatAssistantStore";

/**
 * Messages with an admin live in the tutor panel (owner 2026-11-11). This
 * address stays for old links and notifications: it opens the panel on the
 * dashboard.
 */
export default function LearnerMessagesPage() {
  const router = useRouter();
  const setIsOpen = useChatAssistantStore((state) => state.setIsOpen);

  useEffect(() => {
    setIsOpen(true);
    router.replace("/dashboard");
  }, [router, setIsOpen]);

  return null;
}
