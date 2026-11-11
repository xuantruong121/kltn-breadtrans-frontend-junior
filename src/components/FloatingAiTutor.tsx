"use client";

import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, 
  X, 
  Send, 
  Headphones,
  User, 
  RotateCcw, 
  GraduationCap,
  ChevronLeft,
  Search,
  UserCheck,
  Inbox,
  ArrowDown,
  Loader2,
  Croissant,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { supportService } from "@/lib/api/services/support.service";
import { useAuthStore } from "@/stores/authStore";
import { useChatAssistantStore, StudentThread, AssistantMessage } from "@/stores/chatAssistantStore";
import { useSocket } from "@/lib/providers/SocketProvider";
import { useLearningFocusMode } from "@/contexts/LearningFocusContext";
import { composerHeight, isNearBottom as nearBottomOf, jumpButtonLabel, scrollActionFor, sendsOnKey } from "@/lib/chat/chatScroll";

// 🌟 Component parse và format Markdown sạch đẹp (tránh lộ kí tự ***, **, gạch đầu dòng, chuẩn màu tương phản)
function FormattedMessage({ content, isWhiteText = false }: { content: string; isWhiteText?: boolean }) {
  const formattedElements = useMemo(() => {
    if (!content) return null;

    let text = content;
    // Dọn dẹp các ký tự asterisks bị lỗi hoặc lặp nhiều lần (*** -> **)
    text = text.replace(/\*\*\*+/g, "**");

    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        elements.push(<div key={`empty-${lineIdx}`} className="h-1.5" />);
        return;
      }

      // Nhận diện Header ### hoặc ##
      const isHeader = trimmed.startsWith("### ") || trimmed.startsWith("## ");
      const rawTextWithoutHeader = isHeader ? trimmed.replace(/^#+\s*/, "") : trimmed;

      // Nhận diện Bullet points (*, -, •)
      const isBullet = rawTextWithoutHeader.startsWith("* ") || rawTextWithoutHeader.startsWith("- ") || rawTextWithoutHeader.startsWith("• ");
      const rawLine = isBullet ? rawTextWithoutHeader.substring(2).trim() : rawTextWithoutHeader;

      // Parse inline **in đậm** và *in nghiêng*
      const parts: React.ReactNode[] = [];
      const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(rawLine)) !== null) {
        if (match.index > lastIndex) {
          parts.push(rawLine.substring(lastIndex, match.index));
        }
        const token = match[0];
        if (token.startsWith("**") && token.endsWith("**")) {
          parts.push(
            <strong key={`b-${match.index}`} className={`font-black ${isWhiteText ? "text-white underline decoration-white/30" : "text-slate-900 dark:text-slate-100"}`}>
              {token.slice(2, -2)}
            </strong>
          );
        } else if (token.startsWith("*") && token.endsWith("*")) {
          parts.push(
            <em key={`i-${match.index}`} className={`italic font-medium ${isWhiteText ? "text-amber-100" : "text-slate-700 dark:text-slate-300"}`}>
              {token.slice(1, -1)}
            </em>
          );
        }
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < rawLine.length) {
        parts.push(rawLine.substring(lastIndex));
      }

      if (isHeader) {
        elements.push(
          <h4 key={`header-${lineIdx}`} className={`font-black text-sm mt-2 mb-1 flex items-center gap-1 ${isWhiteText ? "text-amber-200" : "text-junior-orange"}`}>
            {parts}
          </h4>
        );
      } else if (isBullet) {
        elements.push(
          <div key={`line-${lineIdx}`} className="flex items-start gap-2 ml-1 my-1">
            <span className={`font-black mt-0.5 text-xs ${isWhiteText ? "text-amber-200" : "text-junior-orange"}`}>●</span>
            <div className={`flex-1 leading-relaxed ${isWhiteText ? "text-white font-medium" : "text-slate-800 dark:text-slate-200"}`}>{parts}</div>
          </div>
        );
      } else {
        elements.push(
          <p key={`line-${lineIdx}`} className={`leading-relaxed my-0.5 ${isWhiteText ? "text-white font-medium" : "text-slate-800 dark:text-slate-200"}`}>
            {parts}
          </p>
        );
      }
    });

    return elements;
  }, [content, isWhiteText]);

  return <div className="space-y-0.5 text-[13.5px]">{formattedElements}</div>;
}

function mapSupportMessageToAssistantMessage(msg: any): AssistantMessage {
  let role: "user" | "assistant" | "admin" | "system" = "user";
  if (msg.senderRole === "ADMIN") role = "admin";
  else if (msg.senderRole === "AI") role = "assistant";
  else if (msg.senderRole === "SYSTEM") role = "system";

  return {
    id: msg.id,
    clientMessageId: msg.clientMessageId || undefined,
    role,
    content: msg.content,
    senderName: msg.senderName || undefined,
    timestamp: typeof msg.createdAt === "number" ? msg.createdAt : new Date(msg.createdAt).getTime(),
    pending: false,
  };
}

function deriveHasMore(res?: {
  hasMore?: boolean;
  totalPages?: number;
  page?: number;
  total?: number;
  data?: unknown[];
}): boolean {
  if (!res) return false;
  if (typeof res.hasMore === "boolean") return res.hasMore;
  if (typeof res.totalPages === "number" && typeof res.page === "number") {
    return res.page < res.totalPages;
  }
  if (typeof res.totalPages === "number") {
    return res.totalPages > 1;
  }
  if (typeof res.total === "number" && Array.isArray(res.data)) {
    return res.total > res.data.length;
  }
  return false;
}

function FloatingAiTutorInner() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { isFocusMode } = useLearningFocusMode();
  const { 
    threads,
    activeStudentId,
    isOpen,
    adminView,
    setIsOpen,
    setAdminView,
    setActiveStudentId,
    setThreadMode,
    loadThreadFromBackend,
    prependMessagesToThread,
    setThreadHasMore,
    addMessageToThread,
    syncThreadFromServer,
  } = useChatAssistantStore();

  const [input, setInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  // Questions left today on the learner's plan, as the last reply reported it.
  const [quota, setQuota] = useState<{ limit: number; remaining: number } | null>(null);

  const messageListRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevScrollHeightRef = useRef<number | null>(null);
  const prevMessagesLengthRef = useRef<number>(0);
  // False until the list has been put on its latest message after the panel opened.
  const placedRef = useRef(false);
  // While the panel itself is scrolling to the end, the positions it passes
  // through are not the reader leaving the end.
  const followingUntilRef = useRef(0);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  // What had the focus before the panel opened; it gets the focus back on close.
  const focusBeforeOpenRef = useRef<HTMLElement | null>(null);

  const { socket } = useSocket();

  const isAdmin = user?.role === "ADMIN";
  const isStudent = user?.role === "STUDENT";
  const currentDisplayName = user?.profile?.name || user?.email?.split("@")[0] || "Người dùng";

  // ID của học sinh đang trò chuyện
  const studentThreadId = isAdmin
    ? activeStudentId || ""
    : user?.id
    ? `student_${user.id}`
    : "student_guest";

  const studentMetadata = useMemo(() => ({
    name: user?.profile?.name || user?.email?.split("@")[0] || "Học viên",
    email: user?.email,
    avatar: user?.profile?.avatar,
  }), [user?.profile?.name, user?.email, user?.profile?.avatar]);

  const currentThread: StudentThread = useMemo(() => {
    if (studentThreadId && threads[studentThreadId]) {
      return threads[studentThreadId];
    }
    return {
      conversationId: conversationId || undefined,
      studentId: studentThreadId || "student_guest",
      studentName: studentMetadata.name,
      studentEmail: studentMetadata.email,
      studentAvatar: studentMetadata.avatar,
      mode: "AI",
      messages: [],
      unreadForAdmin: 0,
      lastMessageTime: 0,
      hasMoreHistory: false,
    };
  }, [threads, studentThreadId, studentMetadata, conversationId]);

  // Load student conversation from backend (defaults to latest messages)
  const loadStudentConversation = async () => {
    if (!user?.id || isAdmin) return;
    setIsFetchingHistory(true);
    try {
      const conv = await supportService.getMyConversation();
      setConversationId(conv.id);
      const msgRes = await supportService.getMessages(conv.id, 1, 50);
      const mapped = (msgRes.data || []).map(mapSupportMessageToAssistantMessage);
      loadThreadFromBackend(
        `student_${user.id}`,
        conv.id,
        studentMetadata,
        conv.mode,
        mapped,
        conv.unreadCount,
        deriveHasMore(msgRes)
      );
    } catch (err) {
      console.error("Failed to load student support conversation:", err);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  // Load admin conversations list from backend
  const loadAdminConversations = async () => {
    if (!isAdmin) return;
    setIsFetchingHistory(true);
    try {
      const res = await supportService.getAdminConversations(1, 50);
      (res.data || []).forEach((conv: any) => {
        const sId = `student_${conv.studentId}`;
        const existingMessages = threads[sId]?.messages || [];
        loadThreadFromBackend(
          sId,
          conv.id,
          {
            name: conv.studentName,
            email: conv.studentEmail,
            avatar: conv.studentAvatar,
          },
          conv.mode,
          existingMessages,
          conv.unreadCount,
          threads[sId]?.hasMoreHistory ?? false
        );
      });
    } catch (err) {
      console.error("Failed to load admin support conversations:", err);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  // Load messages for a student conversation (Admin view)
  const loadAdminMessagesForStudent = async (sId: string) => {
    if (!isAdmin || !sId) return;
    const thread = threads[sId];
    let targetConvId = thread?.conversationId;

    if (!targetConvId) {
      const numericId = Number(sId.replace("student_", ""));
      if (numericId) {
        try {
          const all = await supportService.getAdminConversations(1, 100);
          const found = all.data?.find((c) => c.studentId === numericId);
          if (found) targetConvId = found.id;
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (!targetConvId) return;

    setIsFetchingHistory(true);
    try {
      const msgRes = await supportService.getAdminMessages(targetConvId, 1, 50);
      const mapped = (msgRes.data || []).map(mapSupportMessageToAssistantMessage);
      loadThreadFromBackend(
        sId,
        targetConvId,
        {
          name: thread?.studentName || "Học viên",
          email: thread?.studentEmail,
          avatar: thread?.studentAvatar,
        },
        thread?.mode || "AI",
        mapped,
        0,
        deriveHasMore(msgRes)
      );
    } catch (err) {
      console.error("Failed to load admin messages for student:", err);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  // Load older messages (Reverse chronological pagination using beforeId cursor)
  const handleLoadOlderMessages = async () => {
    if (isLoadingOlder || !currentThread.conversationId) return;

    const numericIds = currentThread.messages
      .map((m) => (typeof m.id === "number" ? m.id : Number(m.id)))
      .filter((id) => !isNaN(id) && id > 0);

    if (numericIds.length === 0) return;
    const beforeId = Math.min(...numericIds);

    setIsLoadingOlder(true);
    if (messageListRef.current) {
      prevScrollHeightRef.current = messageListRef.current.scrollHeight;
    }

    try {
      const res = isAdmin
        ? await supportService.getAdminMessages(currentThread.conversationId, 1, 50, beforeId)
        : await supportService.getMessages(currentThread.conversationId, 1, 50, beforeId);

      const olderMapped = (res.data || []).map(mapSupportMessageToAssistantMessage);
      prependMessagesToThread(studentThreadId, olderMapped);
      setThreadHasMore(studentThreadId, deriveHasMore(res));
    } catch (err) {
      console.error("Failed to load older messages:", err);
    } finally {
      setIsLoadingOlder(false);
    }
  };


  // Trigger loads on auth or modal open
  useEffect(() => {
    if (!isOpen) return;
    const loadTimer = window.setTimeout(() => {
      if (isAdmin) {
        void loadAdminConversations();
      } else if (user?.id) {
        void loadStudentConversation();
      }
    }, 0);
    return () => window.clearTimeout(loadTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user?.id, isAdmin]);

  // The socket brings messages at once; this sync covers a dropped socket,
  // so neither side ever has to reload to see the other's message.
  const openConversationId = currentThread.conversationId || conversationId;
  const syncActive =
    isOpen && !!openConversationId && !!user?.id && (!isAdmin || (adminView === "chat" && !!activeStudentId));
  useEffect(() => {
    if (!syncActive || !openConversationId) return;
    let cancelled = false;
    const sync = async () => {
      if (document.hidden) return;
      try {
        const res = isAdmin
          ? await supportService.getAdminMessages(openConversationId, 1, 50)
          : await supportService.getMessages(openConversationId, 1, 50);
        if (cancelled) return;
        syncThreadFromServer(
          studentThreadId,
          res.mode,
          (res.data || []).map(mapSupportMessageToAssistantMessage)
        );
      } catch {
        // The next tick tries again.
      }
    };
    const timer = window.setInterval(sync, 4000);
    socket?.on("connect", sync);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      socket?.off("connect", sync);
    };
  }, [syncActive, openConversationId, isAdmin, studentThreadId, socket, syncThreadFromServer]);

  // When admin selects a student to chat
  useEffect(() => {
    if (!isAdmin || !activeStudentId || adminView !== "chat") return;
    const loadTimer = window.setTimeout(() => {
      void loadAdminMessagesForStudent(activeStudentId);
    }, 0);
    return () => window.clearTimeout(loadTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, activeStudentId, adminView]);

  // Tổng số tin nhắn chưa đọc cho Admin
  const totalUnreadCount = useMemo(() => {
    return Object.values(threads).reduce((acc, t) => acc + (t.unreadForAdmin || 0), 0);
  }, [threads]);

  // Lọc danh sách học sinh theo ô tìm kiếm
  const filteredThreads = useMemo(() => {
    const list = Object.values(threads).sort((a, b) => b.lastMessageTime - a.lastMessageTime);
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(
      (t) =>
        t.studentName.toLowerCase().includes(term) ||
        (t.studentEmail && t.studentEmail.toLowerCase().includes(term))
    );
  }, [threads, searchTerm]);

  // Ẩn Trợ lý khi học viên đang trong phòng thi hoặc bài tập chuyên sâu
  const isHiddenPath = isFocusMode;

  // Smart scroll controls
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (messageListRef.current) {
      isNearBottomRef.current = true;
      followingUntilRef.current = Date.now() + (behavior === "smooth" ? 900 : 100);
      messageListRef.current.scrollTo({
        top: messageListRef.current.scrollHeight,
        behavior,
      });
    }
  };

  const handleScroll = () => {
    const el = messageListRef.current;
    if (!el) return;
    // A smooth scroll to the end is under way: a reply that arrives now must
    // still be followed, so its half-way positions do not count as "left".
    const near = nearBottomOf(el) || Date.now() < followingUntilRef.current;
    setIsNearBottom(near);
    isNearBottomRef.current = near;
    if (near) {
      setNewMessagesCount(0);
    }
  };

  const chatVisible = isOpen && (!isAdmin || adminView === "chat");

  // Opening the panel, or switching conversation, starts over: the next list
  // with messages is put on its latest message.
  useEffect(() => {
    placedRef.current = false;
    if (!chatVisible) return;
    // The panel animates in; settle on the end once more after it has its size.
    const timer = setTimeout(() => {
      if (messageListRef.current && messageListRef.current.scrollHeight > 0) {
        scrollToBottom("auto");
        setIsNearBottom(true);
        isNearBottomRef.current = true;
        setNewMessagesCount(0);
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [chatVisible, studentThreadId]);

  // One place decides what the list does when its messages change: stay put
  // after older messages are added, jump to the end on opening, follow a new
  // message only for a reader already at the end (see lib/chat/chatScroll).
  useLayoutEffect(() => {
    const el = messageListRef.current;
    const count = currentThread.messages.length;
    const previousCount = prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = count;
    if (!chatVisible || !el) return;

    const lastMsg = currentThread.messages[count - 1];
    const action = scrollActionFor({
      placed: placedRef.current,
      previousCount,
      count,
      prepended: prevScrollHeightRef.current !== null,
      lastIsMine: (isAdmin && lastMsg?.role === "admin") || (!isAdmin && lastMsg?.role === "user"),
      nearBottom: isNearBottomRef.current,
    });
    if (action === "KEEP_POSITION") {
      el.scrollTop += el.scrollHeight - (prevScrollHeightRef.current ?? el.scrollHeight);
      prevScrollHeightRef.current = null;
    } else if (action === "JUMP_TO_BOTTOM") {
      placedRef.current = true;
      el.scrollTop = el.scrollHeight;
      setIsNearBottom(true);
      isNearBottomRef.current = true;
      setNewMessagesCount(0);
    } else if (action === "FOLLOW") {
      scrollToBottom("smooth");
      setNewMessagesCount(0);
    } else if (action === "COUNT_UNSEEN") {
      setNewMessagesCount((prev) => prev + 1);
    }
  }, [currentThread.messages, chatVisible, isAdmin]);

  // The "is writing" line appears below the last message: a reader at the end stays at the end.
  useEffect(() => {
    if (chatVisible && isLoading && isNearBottomRef.current) scrollToBottom("smooth");
  }, [isLoading, chatVisible]);

  // On a device with a mouse the caret is ready in the message box when the
  // panel opens; on a phone that would raise the keyboard over the panel.
  // Closing gives the focus back to what had it.
  useEffect(() => {
    if (!chatVisible) return;
    focusBeforeOpenRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = setTimeout(() => {
      if (window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) composerRef.current?.focus();
    }, 120);
    return () => {
      clearTimeout(timer);
      const before = focusBeforeOpenRef.current;
      if (before && document.contains(before)) before.focus({ preventScroll: true });
    };
  }, [chatVisible]);

  // The message box grows with its text, up to four lines.
  useLayoutEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    const style = window.getComputedStyle(el);
    const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + 2;
    el.style.height = `${composerHeight(el.scrollHeight + 2, parseFloat(style.lineHeight) || 20, padding)}px`;
  }, [input, chatVisible]);

  // Close on Escape key (A11y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  if (isHiddenPath) return null;

  const handleReload = () => {
    if (isAdmin && activeStudentId) {
      loadAdminMessagesForStudent(activeStudentId);
    } else {
      loadStudentConversation();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const messageText = input.trim();
    setInput("");

    // 1. Nếu là ADMIN đang trả lời trong thread của học sinh:
    if (isAdmin) {
      if (!studentThreadId) return;
      const adminClientMessageId = `adm_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const adminMsg = {
        id: adminClientMessageId,
        clientMessageId: adminClientMessageId,
        role: "admin" as const,
        senderName: `${currentDisplayName} (Quản Trị Viên)`,
        content: messageText,
        timestamp: Date.now(),
        pending: true,
      };

      addMessageToThread(
        studentThreadId,
        { name: currentThread.studentName, email: currentThread.studentEmail },
        adminMsg
      );

      const targetConvId = currentThread.conversationId;
      if (targetConvId) {
        try {
          const persisted = await supportService.sendAdminMessage(
            targetConvId,
            messageText,
            adminClientMessageId
          );
          addMessageToThread(
            studentThreadId,
            { name: currentThread.studentName, email: currentThread.studentEmail },
            {
              id: persisted.id,
              clientMessageId: adminClientMessageId,
              role: "admin",
              senderName: persisted.senderName || adminMsg.senderName,
              content: persisted.content,
              timestamp: new Date(persisted.createdAt).getTime(),
              pending: false,
            }
          );
        } catch (err) {
          console.error("Failed to persist admin message:", err);
        }
      }

      // Bắn sự kiện Socket Real-time cho học sinh
      socket?.emit("chat:sendMessage", {
        studentId: studentThreadId,
        studentName: currentThread.studentName,
        studentEmail: currentThread.studentEmail,
        message: adminMsg,
        fromRole: user?.role || "ADMIN",
        targetUserId: Number(studentThreadId.replace("student_", "")) || undefined,
      });

      return;
    }

    // 2. Nếu là HỌC VIÊN gửi câu hỏi:
    setIsLoading(true);
    const studentClientMessageId = `cmsg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const studentMsg = {
      id: studentClientMessageId,
      clientMessageId: studentClientMessageId,
      role: "user" as const,
      senderName: currentDisplayName,
      content: messageText,
      timestamp: Date.now(),
      pending: true,
    };

    addMessageToThread(studentThreadId, studentMetadata, studentMsg);

    // One request stores the message; the server tells the admins and, on AI
    // mode, writes the tutor's reply itself and returns it.
    let currentConvId = conversationId || currentThread.conversationId;
    if (!currentConvId && user?.id) {
      try {
        const conv = await supportService.getMyConversation();
        currentConvId = conv.id;
        setConversationId(conv.id);
      } catch (e) {
        console.error("Failed to get conversation id:", e);
      }
    }

    try {
      if (!currentConvId) throw new Error("no conversation");
      const persisted = await supportService.sendMessage(
        currentConvId,
        messageText,
        studentClientMessageId
      );
      addMessageToThread(studentThreadId, studentMetadata, {
        id: persisted.id,
        clientMessageId: studentClientMessageId,
        role: "user",
        senderName: persisted.senderName || currentDisplayName,
        content: persisted.content,
        timestamp: new Date(persisted.createdAt).getTime(),
        pending: false,
      });
      const aiReply = persisted.aiReply;
      if (aiReply) {
        setQuota(aiReply.quota);
        addMessageToThread(studentThreadId, studentMetadata, {
          id: aiReply.id,
          clientMessageId: aiReply.clientMessageId || undefined,
          role: "assistant",
          senderName: aiReply.senderName || "Trợ Lý Bánh Mì",
          content: aiReply.content,
          timestamp: new Date(aiReply.createdAt).getTime(),
          pending: false,
        });
      }
    } catch (err) {
      console.error("Failed to send student message:", err);
      addMessageToThread(studentThreadId, studentMetadata, {
        role: "system",
        content: "Tin nhắn chưa gửi được. Bạn kiểm tra kết nối rồi gửi lại.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMode = async () => {
    const nextMode = currentThread.mode === "AI" ? "HUMAN" : "AI";
    const convId = currentThread.conversationId || conversationId;

    if (convId) {
      try {
        if (isAdmin) {
          await supportService.toggleAdminMode(convId, nextMode);
        } else {
          await supportService.toggleMode(convId, nextMode);
        }
      } catch (err) {
        console.error("Failed to persist mode toggle:", err);
      }
    }

    // The server stores the line both sides read and sends the event; this
    // keeps the panel right when the socket is down.
    setThreadMode(
      studentThreadId,
      nextMode,
      !isAdmin && nextMode === "HUMAN"
        ? "Bạn đã yêu cầu trao đổi với quản trị viên. Trợ lý AI tạm dừng trả lời; quản trị viên sẽ phản hồi tại đây."
        : undefined
    );
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
  };

  if (isFocusMode) {
    return null;
  }

  return (
    <>
      {/* 🔘 NÚT NỔI FLOATING BUTTON */}
      {!isStudent && <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setIsOpen(true)}
        className={`bg-amber-500 fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-3.5 sm:bottom-[calc(4.5rem+env(safe-area-inset-bottom))] sm:right-4 md:bottom-8 md:right-8 text-white min-h-[48px] min-w-[48px] p-3.5 sm:p-4 rounded-full shadow-xl hover:shadow-2xl z-[45] transition-all border-2 border-white flex items-center justify-center cursor-pointer ${
          isOpen ? "scale-0 pointer-events-none" : "scale-100"
        }`}
        title={isAdmin ? "Mở Trung Tâm Tin Nhắn Học Viên" : "Mở Trợ Lý Bánh Mì"}
      >
        <div className="relative">
          <MessageCircle size={24} className="sm:w-7 sm:h-7" />
          {isAdmin ? (
            totalUnreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                {totalUnreadCount}
              </span>
            )
          ) : (
            currentThread.unreadForAdmin > 0 && (
              <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse" />
            )
          )}
        </div>
      </motion.button>}

      {/* 💬 CỬA SỔ CHAT WINDOW */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-label={isAdmin ? "Trung tâm tin nhắn hỗ trợ học viên" : "Cửa sổ hỗ trợ trực tuyến BreadTrans"}
            className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-2 sm:right-4 md:bottom-8 md:right-8 w-[calc(100vw-1rem)] max-w-sm md:w-[420px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-[50] border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[min(78dvh,580px)] max-h-[calc(100dvh-5.5rem)]"
          >
            {/* ======================================================== */}
            {/* 1. MÀN HÌNH DANH SÁCH HỌC SINH (DÀNH CHO ADMIN) */}
            {/* ======================================================== */}
            {isAdmin && adminView === "list" ? (
              <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
                {/* Header Inbox */}
                <div className="bg-orange-500 p-4 text-white shrink-0 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 font-black text-base">
                      <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shadow-inner">
                        <MessageCircle size={18} strokeWidth={2} aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="leading-tight">Hộp Thư Học Viên</h3>
                        <p className="text-xs font-bold text-amber-100">
                          {filteredThreads.length} cuộc trò chuyện • {totalUnreadCount} tin chưa đọc
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsOpen(false)}
                      className="hover:bg-white/20 p-1.5 rounded-xl transition-colors text-white cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="mt-3 relative">
                    <Search size={14} className="absolute left-3 top-2.5 text-amber-200" />
                    <input
                      type="text"
                      placeholder="Tìm theo tên học sinh, lớp..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-black/15 text-white placeholder:text-amber-100/70 text-xs font-bold rounded-xl pl-8 pr-3 py-2 outline-none focus:bg-black/25 transition-all border border-white/20"
                    />
                  </div>
                </div>

                {/* Danh Sách Các Cuộc Trò Chuyện Học Sinh */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {filteredThreads.length > 0 ? (
                    filteredThreads.map((thread) => {
                      const lastMsg = thread.messages[thread.messages.length - 1];
                      const isHumanMode = thread.mode === "HUMAN";

                      return (
                        <div
                          key={thread.studentId}
                          onClick={() => setActiveStudentId(thread.studentId)}
                          className="bg-white dark:bg-slate-800 hover:bg-orange-50/60 dark:hover:bg-slate-750 p-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-400 transition-all cursor-pointer shadow-2xs flex items-start gap-3 relative group"
                        >
                          {/* Avatar */}
                          <div className="bg-blue-500 w-10 h-10 rounded-2xl text-white font-black flex items-center justify-center shrink-0 shadow-xs">
                            {thread.studentName.charAt(0).toUpperCase()}
                          </div>

                          {/* Info & Snippet */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs truncate">
                                {thread.studentName}
                              </h4>
                              <span className="text-xs font-bold text-slate-600 shrink-0 dark:text-slate-400">
                                {new Date(thread.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 truncate mt-0.5">
                              {lastMsg ? lastMsg.content : "Chưa có tin nhắn"}
                            </p>

                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span
                                className={`text-xs font-black px-2 py-0.5 rounded-full border ${
                                  isHumanMode
                                    ? "bg-blue-100 text-blue-800 border-blue-200"
                                    : "bg-emerald-100 text-emerald-800 border-emerald-200"
                                }`}
                              >
                                {isHumanMode ? "Hỗ trợ trực tiếp" : "Tự động"}
                              </span>

                              {thread.studentEmail && (
                                <span className="text-xs font-bold text-slate-600 truncate dark:text-slate-400">
                                  {thread.studentEmail}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Unread Badge */}
                          {thread.unreadForAdmin > 0 && (
                            <span className="bg-rose-500 text-white text-xs font-black px-1.5 py-0.5 rounded-full shrink-0 shadow-2xs">
                              {thread.unreadForAdmin}
                            </span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-16 text-slate-600 space-y-2 dark:text-slate-400">
                      <Inbox size={32} className="mx-auto text-slate-300" />
                      <p className="text-xs font-bold">Không tìm thấy học sinh nào.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ======================================================== */
              /* 2. MÀN HÌNH CHAT 1-1 (VỚI HỌC SINH HOẶC DÀNH CHO HỌC SINH) */
              /* ======================================================== */
              <div className="relative flex flex-col h-full min-h-0">
                {/* Header Chat */}
                <div className="bg-orange-500 p-4 text-white flex flex-col gap-2 shrink-0 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {/* Nút quay lại danh sách nếu là Admin */}
                      {isAdmin && (
                        <button
                          onClick={() => setAdminView("list")}
                          className="hover:bg-white/20 p-1.5 rounded-xl transition-colors text-white mr-0.5 cursor-pointer"
                          title="Quay lại danh sách học sinh"
                        >
                          <ChevronLeft size={22} />
                        </button>
                      )}

                      <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shadow-inner">
                        {isAdmin ? <GraduationCap size={18} strokeWidth={2} aria-hidden="true" /> : <Croissant size={18} strokeWidth={2} aria-hidden="true" />}
                      </div>
                      <div>
                        <h3 className="font-black text-sm leading-tight truncate max-w-[200px]">
                          {isAdmin ? currentThread.studentName : "Trợ Lý Bánh Mì"}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-100">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              currentThread.mode === "AI" ? "bg-emerald-400 animate-ping" : "bg-blue-300"
                            }`}
                          />
                          <span>
                            {currentThread.mode === "AI"
                              ? "Phản hồi tự động"
                              : isAdmin
                                ? "Quản trị viên trả lời"
                                : "Đang trao đổi với quản trị viên"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleReload}
                        disabled={isFetchingHistory}
                        className="hover:bg-white/20 p-1.5 rounded-xl transition-colors text-amber-100 hover:text-white cursor-pointer disabled:opacity-50"
                        title="Tải lại lịch sử cuộc trò chuyện từ máy chủ"
                      >
                        <RotateCcw size={16} className={isFetchingHistory ? "animate-spin" : ""} />
                      </button>
                      <button
                        onClick={() => setIsOpen(false)}
                        className="hover:bg-white/20 p-1.5 rounded-xl transition-colors text-white cursor-pointer"
                        title="Đóng cửa sổ"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Thanh điều khiển Chế độ dành cho Admin trên từng học sinh */}
                  {isAdmin ? (
                    <div className="bg-white/15 backdrop-blur-xs rounded-xl p-2 flex items-center justify-between text-xs font-bold mt-1 border border-white/20">
                      <span className="text-xs">
                        {currentThread.mode === "AI" ? "Học viên đang nhận phản hồi tự động" : "Bạn đang trao đổi trực tiếp"}
                      </span>
                      <button
                        onClick={handleToggleMode}
                        className={`px-3 py-1 rounded-lg font-black text-xs flex items-center gap-1 transition-all cursor-pointer shadow-sm ${
                          currentThread.mode === "AI"
                            ? "bg-amber-100 text-amber-900 hover:bg-white"
                            : "bg-emerald-400 text-emerald-950 hover:bg-emerald-300"
                        }`}
                      >
                        {currentThread.mode === "AI" ? "Chuyển sang trực tiếp" : "Bật phản hồi tự động"}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center justify-between gap-2 rounded-xl border border-white/20 bg-white/15 px-2.5 py-1.5 text-xs font-bold">
                      <span className="flex min-w-0 items-center gap-1.5">
                        {currentThread.mode === "HUMAN" && <UserCheck size={14} className="shrink-0" aria-hidden="true" />}
                        <span className="truncate">
                          {currentThread.mode === "HUMAN"
                            ? "Quản trị viên sẽ trả lời tại đây"
                            : quota
                              ? `Còn ${quota.remaining}/${quota.limit} lượt hỏi hôm nay`
                              : "Trợ lý AI đang trả lời"}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleMode}
                        className="shrink-0 rounded-lg bg-white/90 px-2.5 py-1 text-xs font-black text-orange-700 transition-colors hover:bg-white cursor-pointer"
                      >
                        {currentThread.mode === "AI" ? "Gặp quản trị viên" : "Quay lại trợ lý AI"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Khung Tin Nhắn */}
                <div
                  ref={messageListRef}
                  onScroll={handleScroll}
                  role="log"
                  aria-live="polite"
                  aria-label="Tin nhắn"
                  className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 flex flex-col gap-3.5 bg-slate-50 dark:bg-slate-950"
                >
                  {/* Tải tin nhắn trước đó (Reverse cursor pagination) */}
                  {currentThread.hasMoreHistory && (
                    <div className="flex justify-center pt-1 pb-1">
                      <button
                        onClick={handleLoadOlderMessages}
                        disabled={isLoadingOlder}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-full shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isLoadingOlder ? (
                          <>
                            <Loader2 size={13} className="animate-spin text-blue-600" />
                            <span>Đang tải tin cũ...</span>
                          </>
                        ) : (
                          <span>Tải tin nhắn trước đó</span>
                        )}
                      </button>
                    </div>
                  )}

                  {currentThread.messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center my-auto py-12 text-center text-slate-600 space-y-3 dark:text-slate-400">
                      <div className="w-14 h-14 rounded-3xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-3xl shadow-inner">
                        <Croissant size={18} strokeWidth={2} aria-hidden="true" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-black text-slate-700 dark:text-slate-200 text-sm">
                          {isAdmin ? "Chưa có tin nhắn nào" : "Chào mừng bạn đến với BreadTrans!"}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs leading-relaxed">
                          {isAdmin
                            ? `Chưa có lịch sử tin nhắn với học viên ${currentThread.studentName || "này"}.`
                            : "Bạn cần giải đáp thắc mắc về bài học, từ vựng, ngữ pháp hay lộ trình học? Hãy nhập câu hỏi bên dưới để bắt đầu nhé!"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    currentThread.messages.map((msg) => {
                      if (msg.role === "system") {
                        return (
                          <div key={msg.id} className="self-center my-1 max-w-[90%]">
                            <div className="bg-amber-100/80 border border-amber-300/80 text-amber-900 text-xs font-bold px-3 py-2 rounded-2xl text-center shadow-2xs">
                              {msg.content}
                            </div>
                          </div>
                        );
                      }

                      // Nếu người đang xem là Admin:
                      //   Tin nhắn của học sinh (user) nằm bên trái (self-start).
                      //   Tin nhắn của Admin (admin) nằm bên phải (self-end).
                      // Nếu người đang xem là Học sinh:
                      //   Tin nhắn của học sinh (user) nằm bên phải (self-end).
                      //   Tin nhắn của AI / Admin nằm bên trái (self-start).
                      const isRightBubble = isAdmin
                        ? msg.role === "admin"
                        : msg.role === "user";

                      const isStudentMsg = msg.role === "user";
                      const isAdminMsg = msg.role === "admin";

                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-2 max-w-[88%] ${isRightBubble ? "self-end flex-row-reverse" : "self-start"}`}
                        >
                          {/* Avatar */}
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-2xs font-bold text-xs ${
                              isStudentMsg
                                ? "bg-blue-500 text-white"
                                : isAdminMsg
                                ? "bg-emerald-700 text-white"
                                : "bg-orange-500 text-white"
                            }`}
                          >
                            {isStudentMsg ? (
                              <User size={14} />
                            ) : isAdminMsg ? (
                              <GraduationCap size={14} />
                            ) : (
                              <Headphones size={14} />
                            )}
                          </div>

                          {/* Message Bubble */}
                          <div className="flex flex-col gap-1 max-w-full">
                            {msg.senderName && !isRightBubble && (
                              <span className="text-xs font-black text-slate-600 ml-1 dark:text-slate-400">
                                {msg.senderName}
                              </span>
                            )}
                            <div
                              className={`p-3.5 rounded-2xl break-words shadow-2xs ${
                                isRightBubble
                                  ? isStudentMsg
                                    ? "bg-blue-500 text-white rounded-tr-xs shadow-md border border-blue-400"
                                    : "bg-emerald-700 text-white rounded-tr-xs shadow-md border border-emerald-500"
                                  : isAdminMsg
                                  ? "bg-emerald-50/95 dark:bg-emerald-950/60 border-2 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 rounded-tl-xs shadow-xs"
                                  : "bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-xs shadow-xs"
                              }`}
                            >
                              <FormattedMessage content={msg.content} isWhiteText={isRightBubble} />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Typing Indicator */}
                  {isLoading && (
                    <div className="self-start flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 mt-1">
                        <Headphones size={14} />
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-xs text-slate-500 flex items-center gap-1.5 shadow-2xs">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-300 mr-1">Bánh Mì đang soạn câu trả lời</span>
                        <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                        <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} className="h-1" />
                </div>

                {/* Quick Chips (Dành cho học sinh) */}
                {!isAdmin && currentThread.messages.length <= 2 && (
                  <div className="px-4 py-2 bg-slate-100/70 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0 no-scrollbar">
                    <span className="text-slate-600 dark:text-slate-400 font-bold shrink-0">Gợi ý:</span>
                    <button
                      onClick={() => handleQuickQuestion("Giải thích thì hiện tại đơn")}
                      className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-slate-700 hover:text-orange-600 dark:hover:text-orange-300 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg font-bold shrink-0 transition-colors cursor-pointer"
                    >
                      Thì Hiện Tại Đơn
                    </button>
                    <button
                      onClick={() => handleQuickQuestion("Mẹo học từ vựng nhớ lâu")}
                      className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-slate-700 hover:text-orange-600 dark:hover:text-orange-300 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg font-bold shrink-0 transition-colors cursor-pointer"
                    >
                      Mẹo Nhớ Từ Vựng
                    </button>
                    <button
                      onClick={() => handleQuickQuestion("Phân biệt 'since' và 'for'")}
                      className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-slate-700 hover:text-orange-600 dark:hover:text-orange-300 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg font-bold shrink-0 transition-colors cursor-pointer"
                    >
                      Since vs For
                    </button>
                  </div>
                )}

                {/* Floating "Tin mới nhất" Pill */}
                {!isNearBottom && (
                  <button
                    type="button"
                    onClick={() => {
                      scrollToBottom("smooth");
                      setNewMessagesCount(0);
                      setIsNearBottom(true);
                      isNearBottomRef.current = true;
                    }}
                    className="absolute bottom-18 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-bold rounded-full shadow-lg backdrop-blur-xs transition-all cursor-pointer animate-fade-in"
                  >
                    <ArrowDown size={13} strokeWidth={2.5} aria-hidden="true" />
                    <span>{jumpButtonLabel(newMessagesCount)}</span>
                  </button>
                )}

                {/* Input Area */}
                <div className="p-3.5 bg-white dark:bg-slate-900 border-t-2 border-slate-100 dark:border-slate-800 flex items-end gap-2 shrink-0">
                  <textarea
                    ref={composerRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      // Enter sends, Shift+Enter is a new line; the Enter that
                      // confirms a Telex/VNI word is neither.
                      if (!sendsOnKey({ key: e.key, shiftKey: e.shiftKey, isComposing: e.nativeEvent.isComposing, keyCode: e.keyCode })) return;
                      e.preventDefault();
                      void handleSend();
                    }}
                    aria-label="Nội dung tin nhắn"
                    enterKeyHint="send"
                    placeholder={
                      isAdmin
                        ? currentThread.mode === "HUMAN"
                          ? `Trả lời ${currentThread.studentName}...`
                          : "Chuyển sang hỗ trợ trực tiếp để trò chuyện..."
                        : currentThread.mode === "HUMAN"
                        ? "Nhập tin nhắn gửi đến Quản Trị Viên..."
                        : "Hỏi Trợ Lý Bánh Mì bất kỳ điều gì..."
                    }
                    className="flex-1 resize-none overflow-y-auto bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 rounded-2xl px-4 py-3 text-sm leading-5 font-medium outline-none focus:ring-2 focus:ring-orange-400/50 border border-slate-200 dark:border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="bg-orange-500 text-white p-3 rounded-2xl hover:brightness-110 disabled:opacity-40 transition-all shadow-sm cursor-pointer shrink-0"
                    title="Gửi tin nhắn"
                    aria-label="Gửi tin nhắn"
                  >
                    <Send size={18} aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function FloatingAiTutor() {
  const pathname = usePathname();
  const isDiagnosticView =
    pathname === "/diagnostic" ||
    pathname.startsWith("/diagnostic/") ||
    pathname.startsWith("/gate/");
  if (isDiagnosticView) return null;

  return <FloatingAiTutorInner />;
}
