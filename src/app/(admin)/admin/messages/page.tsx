"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bot,
  Loader2,
  MessageSquare,
  Search,
  Send,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  supportService,
  type SupportMessageItem,
} from "@/lib/api/services/support.service";
import { ChatMessageContent } from "@/components/chat/ChatMessageContent";
import {
  formatMessageTimestamp,
  formatMessageFullTooltip,
  isSameCalendarDay,
  formatDateDivider,
  formatListPreviewTime,
} from "@/lib/chat/chatDateUtils";

function Avatar({
  name,
  src,
  size = "md",
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md";
}) {
  const dimensions = size === "sm" ? "size-8 text-xs" : "size-9 text-sm";
  return (
    <span
      className={`${dimensions} grid shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300`}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

function AdminMessagesContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(
    Number(searchParams.get("conversation")) || null,
  );
  const [draft, setDraft] = useState("");

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevSelectedIdRef = useRef<number | null>(null);
  const isNearBottomRef = useRef<boolean>(true);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [search]);

  const conversationsQuery = useQuery({
    queryKey: ["admin-support", "conversations", filter, debouncedSearch],
    queryFn: () =>
      supportService.getAdminConversations(1, 60, {
        search: debouncedSearch || undefined,
        unreadOnly: filter === "unread",
      }),
    refetchInterval: 15000,
  });

  const selectedConversation = useMemo(
    () =>
      conversationsQuery.data?.data.find((item) => item.id === selectedId) ??
      null,
    [conversationsQuery.data?.data, selectedId],
  );

  const learnerResultsQuery = useQuery({
    queryKey: ["admin-support", "learners", debouncedSearch],
    queryFn: () => supportService.searchLearners(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
  });

  const messagesQuery = useQuery({
    queryKey: ["admin-support", "messages", selectedId],
    queryFn: () => supportService.getAdminMessages(selectedId!, 1, 100),
    enabled: !!selectedId,
    refetchInterval: 15000,
  });

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  };

  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const threshold = 120;
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
  };

  useEffect(() => {
    if (messagesQuery.data) {
      queryClient.invalidateQueries({
        queryKey: ["admin-support", "conversations"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin-support", "unread-count"],
      });

      const isInitialOrChanged = prevSelectedIdRef.current !== selectedId;
      if (isInitialOrChanged) {
        prevSelectedIdRef.current = selectedId;
        isNearBottomRef.current = true;
        setTimeout(() => scrollToBottom("auto"), 50);
      } else if (isNearBottomRef.current) {
        scrollToBottom("smooth");
      }
    }
  }, [messagesQuery.data, selectedId, queryClient]);

  const startConversationMutation = useMutation({
    mutationFn: (studentId: number) =>
      supportService.startAdminConversation(studentId),
    onSuccess: (conversation) => {
      setSelectedId(conversation.id);
      queryClient.invalidateQueries({
        queryKey: ["admin-support", "conversations"],
      });
    },
    onError: () => toast.error("Không thể mở cuộc trò chuyện với học viên."),
  });

  const sendMutation = useMutation({
    mutationFn: ({
      conversationId,
      content,
    }: {
      conversationId: number;
      content: string;
    }) =>
      supportService.sendAdminMessage(
        conversationId,
        content,
        `admin-${Date.now()}`,
      ),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["admin-support"] });
      isNearBottomRef.current = true;
      setTimeout(() => scrollToBottom("smooth"), 60);
    },
    onError: () =>
      toast.error("Gửi tin nhắn thất bại. Nội dung vẫn được giữ lại."),
  });

  const submit = () => {
    if (!selectedId || !draft.trim() || sendMutation.isPending) return;
    sendMutation.mutate({ conversationId: selectedId, content: draft.trim() });
  };

  const rows = conversationsQuery.data?.data ?? [];
  const messages = messagesQuery.data?.data ?? [];

  return (
    <div className="mx-auto flex h-[calc(100dvh-5.5rem)] md:h-[calc(100dvh-5rem)] max-w-[1500px] flex-col gap-3 min-h-[500px] pb-1">
      {/* Header */}
      <header className="shrink-0 border-b border-slate-200 pb-3 dark:border-slate-800">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
          Tin nhắn
        </h1>
        <p className="mt-0.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Trao đổi trực tiếp với học viên và xử lý các yêu cầu hỗ trợ.
        </p>
      </header>

      {/* Bounded Messaging Workspace */}
      <section className="flex-1 min-h-0 grid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* Left Column: Search & Conversations List */}
        <aside
          className={`flex min-h-0 h-full flex-col border-r border-slate-200 dark:border-slate-800 ${
            selectedId ? "max-lg:hidden" : ""
          }`}
        >
          {/* Search & Filter Header */}
          <div className="shrink-0 border-b border-slate-200 p-3 dark:border-slate-800 space-y-2.5">
            <label className="relative block">
              <span className="sr-only">Tìm học viên</span>
              <Search
                size={15}
                aria-hidden="true"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm học viên..."
                className="min-h-9 w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs sm:text-sm outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-blue-950"
              />
            </label>
            <div className="flex gap-1" role="tablist" aria-label="Lọc hội thoại">
              {([
                ["all", "Tất cả"],
                ["unread", "Chưa đọc"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={filter === value}
                  onClick={() => setFilter(value)}
                  className={`min-h-7 rounded-md px-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                    filter === value
                      ? "bg-slate-900 text-white dark:bg-blue-600"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Student Search Direct Matches */}
          {debouncedSearch.length >= 2 && learnerResultsQuery.data?.data?.length ? (
            <div className="shrink-0 max-h-48 overflow-y-auto border-b border-slate-200 p-2 dark:border-slate-800">
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Học viên
              </p>
              {learnerResultsQuery.data.data.map((learner) => (
                <button
                  key={learner.id}
                  type="button"
                  onClick={() =>
                    learner.conversationId
                      ? setSelectedId(learner.conversationId)
                      : startConversationMutation.mutate(learner.id)
                  }
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Avatar name={learner.name} src={learner.avatar} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-slate-900 dark:text-white">
                      {learner.name}
                    </span>
                    <span className="block truncate text-[11px] text-slate-500">
                      {learner.email}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {/* Scrollable Conversation List */}
          <div className="min-h-0 flex-1 overflow-y-auto p-2 space-y-1">
            {conversationsQuery.isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-slate-400" size={22} />
              </div>
            ) : rows.length === 0 ? (
              <p className="px-3 py-8 text-center text-xs sm:text-sm text-slate-500">
                Chưa có cuộc trò chuyện phù hợp.
              </p>
            ) : (
              rows.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    selectedId === conversation.id
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <Avatar
                    name={conversation.studentName}
                    src={conversation.studentAvatar}
                    size="md"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span
                        className={`truncate text-sm ${
                          conversation.unreadCount
                            ? "font-bold text-slate-950 dark:text-white"
                            : "font-semibold text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {conversation.studentName}
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-400">
                        {formatListPreviewTime(conversation.lastMessageTime)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {conversation.lastMessage?.content || "Chưa có tin nhắn"}
                      </span>
                      {conversation.unreadCount > 0 && (
                        <span
                          className="grid size-5 shrink-0 place-items-center rounded-full bg-blue-600 text-[10px] font-bold text-white"
                          aria-label={`${conversation.unreadCount} tin nhắn chưa đọc`}
                        >
                          {conversation.unreadCount > 99
                            ? "99+"
                            : conversation.unreadCount}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Right Column: Chat Workspace */}
        <div
          className={`min-h-0 h-full flex-col ${
            selectedId ? "flex" : "hidden lg:flex"
          }`}
        >
          {!selectedId ? (
            <div className="grid flex-1 place-items-center p-8 text-center">
              <div className="max-w-xs space-y-2">
                <MessageSquare
                  aria-hidden="true"
                  className="mx-auto text-slate-300 dark:text-slate-600"
                  size={32}
                />
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  Chọn một cuộc trò chuyện
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Tìm học viên ở cột bên trái để bắt đầu hỗ trợ.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Conversation Header (Sticky/Shrink-0) */}
              <header className="shrink-0 flex min-h-14 items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5 bg-white dark:bg-slate-900 z-10 dark:border-slate-800">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden cursor-pointer shrink-0"
                    aria-label="Quay lại danh sách tin nhắn"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <Avatar
                    name={selectedConversation?.studentName || "H"}
                    src={selectedConversation?.studentAvatar}
                    size="md"
                  />
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                      {selectedConversation?.studentName || "Học viên"}
                    </h2>
                    <p className="truncate text-xs text-slate-500">
                      {selectedConversation?.studentEmail}
                    </p>
                  </div>
                </div>
                {selectedConversation && (
                  <Link
                    href="/admin/users"
                    className="text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400 shrink-0"
                  >
                    Xem hồ sơ
                  </Link>
                )}
              </header>

              {/* Scrollable Message History Area */}
              <div
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
                className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50/70 p-4 dark:bg-slate-950/40"
              >
                {messagesQuery.isLoading ? (
                  <div className="flex justify-center pt-8">
                    <Loader2 className="animate-spin text-slate-400" size={22} />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="pt-8 text-center text-xs sm:text-sm text-slate-500">
                    Chưa có tin nhắn. Hãy gửi tin nhắn hỗ trợ học viên.
                  </p>
                ) : (
                  messages.map((message: SupportMessageItem, idx: number) => {
                    const isAdmin = message.senderRole === "ADMIN";
                    const isSystem = message.senderRole === "SYSTEM";
                    const isAi = message.senderRole === "AI";
                    const showDateDivider =
                      idx === 0 ||
                      !isSameCalendarDay(
                        messages[idx - 1].createdAt,
                        message.createdAt,
                      );

                    return (
                      <React.Fragment key={String(message.id)}>
                        {/* Inter-day Date Divider */}
                        {showDateDivider && (
                          <div className="flex items-center justify-center my-3.5 select-none">
                            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                            <span className="mx-3 px-3 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700/80 shadow-2xs">
                              {formatDateDivider(message.createdAt)}
                            </span>
                            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                          </div>
                        )}

                        {/* System Message */}
                        {isSystem ? (
                          <div className="flex justify-center my-2">
                            <div className="max-w-md rounded-full bg-slate-100 dark:bg-slate-800/80 px-3.5 py-1 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                              <span>{message.content}</span>
                              <span className="ml-2 text-[10px] text-slate-400">
                                ({formatMessageTimestamp(message.createdAt)})
                              </span>
                            </div>
                          </div>
                        ) : isAdmin ? (
                          /* Admin Message (Right-aligned) */
                          <div className="flex justify-end items-end gap-2 my-2.5 group">
                            <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%] lg:max-w-[70%] xl:max-w-[640px]">
                              {/* Header Meta: Name, Role Badge, Full Timestamp */}
                              <div className="flex items-center gap-1.5 mb-1 px-1 text-xs">
                                <span
                                  className="text-[11px] font-medium text-slate-400"
                                  title={formatMessageFullTooltip(message.createdAt)}
                                >
                                  {formatMessageTimestamp(message.createdAt)}
                                </span>
                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                  {message.senderName || "Quản trị viên"}
                                </span>
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
                                  Admin
                                </span>
                              </div>

                              {/* Message Bubble with Markdown Content */}
                              <div className="w-full rounded-2xl rounded-br-xs px-4 py-3 text-sm leading-relaxed bg-slate-900 text-white shadow-2xs dark:bg-blue-600 dark:text-white">
                                <ChatMessageContent
                                  content={message.content}
                                  isInverse={true}
                                />
                              </div>
                            </div>

                            {/* Admin Avatar */}
                            <span
                              className="size-8 grid shrink-0 place-items-center rounded-full bg-slate-900 text-white dark:bg-blue-600 font-bold text-xs select-none shadow-2xs mb-0.5"
                              title="Quản trị viên"
                            >
                              <Shield size={14} />
                            </span>
                          </div>
                        ) : isAi ? (
                          /* AI Assistant Message (Left-aligned) */
                          <div className="flex justify-start items-end gap-2 my-2.5 group">
                            <span
                              className="size-8 grid shrink-0 place-items-center rounded-full bg-purple-600 text-white font-bold text-xs select-none shadow-2xs mb-0.5"
                              title="Trợ lý học tập AI"
                            >
                              <Bot size={15} />
                            </span>

                            <div className="flex flex-col items-start max-w-[85%] sm:max-w-[75%] lg:max-w-[70%] xl:max-w-[640px]">
                              {/* Header Meta: Name, Role Badge, Full Timestamp */}
                              <div className="flex items-center gap-1.5 mb-1 px-1 text-xs">
                                <span className="font-semibold text-purple-900 dark:text-purple-200">
                                  Trợ lý AI
                                </span>
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800">
                                  AI Hỗ trợ
                                </span>
                                <span
                                  className="text-[11px] font-medium text-slate-400"
                                  title={formatMessageFullTooltip(message.createdAt)}
                                >
                                  {formatMessageTimestamp(message.createdAt)}
                                </span>
                              </div>

                              {/* Message Bubble with Markdown Content */}
                              <div className="w-full rounded-2xl rounded-bl-xs px-4 py-3 text-sm leading-relaxed border border-purple-200/90 bg-purple-50/50 text-slate-800 shadow-2xs dark:border-purple-800/80 dark:bg-purple-950/30 dark:text-slate-100">
                                <ChatMessageContent
                                  content={message.content}
                                  isInverse={false}
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Student Message (Left-aligned) */
                          <div className="flex justify-start items-end gap-2 my-2.5 group">
                            <Avatar
                              name={
                                selectedConversation?.studentName ||
                                message.senderName ||
                                "H"
                              }
                              src={selectedConversation?.studentAvatar}
                              size="sm"
                            />

                            <div className="flex flex-col items-start max-w-[85%] sm:max-w-[75%] lg:max-w-[70%] xl:max-w-[640px]">
                              {/* Header Meta: Name, Role Badge, Full Timestamp */}
                              <div className="flex items-center gap-1.5 mb-1 px-1 text-xs">
                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                  {selectedConversation?.studentName ||
                                    message.senderName ||
                                    "Học viên"}
                                </span>
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                                  Học viên
                                </span>
                                <span
                                  className="text-[11px] font-medium text-slate-400"
                                  title={formatMessageFullTooltip(message.createdAt)}
                                >
                                  {formatMessageTimestamp(message.createdAt)}
                                </span>
                              </div>

                              {/* Message Bubble with Markdown Content */}
                              <div className="w-full rounded-2xl rounded-bl-xs px-4 py-3 text-sm leading-relaxed border border-slate-200/90 bg-white text-slate-800 shadow-2xs dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-100">
                                <ChatMessageContent
                                  content={message.content}
                                  isInverse={false}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </div>

              {/* Message Composer (Fixed/Shrink-0 at bottom) */}
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submit();
                }}
                className="shrink-0 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <label className="sr-only" htmlFor="admin-message-draft">
                  Nhập tin nhắn
                </label>
                <div className="flex items-end gap-2">
                  <textarea
                    id="admin-message-draft"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        submit();
                      }
                    }}
                    maxLength={2000}
                    rows={2}
                    placeholder="Nhập tin nhắn phản hồi học viên... (Enter để gửi, Shift+Enter xuống dòng)"
                    className="min-h-11 flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-blue-950"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sendMutation.isPending}
                    className="grid min-h-11 min-w-11 place-items-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    aria-label="Gửi tin nhắn"
                  >
                    {sendMutation.isPending ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <Send size={17} />
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default function AdminMessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="animate-spin text-slate-400" size={28} />
        </div>
      }
    >
      <AdminMessagesContent />
    </Suspense>
  );
}
