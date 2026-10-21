"use client";

import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquare, Send, Shield, User } from "lucide-react";
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
} from "@/lib/chat/chatDateUtils";

export default function LearnerMessagesPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversationQuery = useQuery({
    queryKey: ["support", "my-conversation"],
    queryFn: supportService.getMyConversation,
  });

  const conversationId = conversationQuery.data?.id;

  const messagesQuery = useQuery({
    queryKey: ["support", "messages", conversationId],
    queryFn: () => supportService.getMessages(conversationId!, 1, 100),
    enabled: !!conversationId,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (messagesQuery.data) {
      queryClient.invalidateQueries({
        queryKey: ["notifications", "unread-count"],
      });
      queryClient.invalidateQueries({
        queryKey: ["notifications", "recent", "unread"],
      });
      messagesEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    }
  }, [messagesQuery.data, queryClient]);

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      supportService.sendMessage(
        conversationId!,
        content,
        `learner-${Date.now()}`,
      ),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["support"] });
    },
    onError: () =>
      toast.error("Gửi tin nhắn thất bại. Nội dung vẫn được giữ lại."),
  });

  const submit = () => {
    if (!draft.trim() || sendMutation.isPending || !conversationId) return;
    sendMutation.mutate(draft.trim());
  };

  const messages = messagesQuery.data?.data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
          Tin nhắn hỗ trợ
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Trao đổi trực tiếp với đội ngũ cố vấn và giáo viên của BreadTrans.
        </p>
      </header>

      <section className="mt-5 flex min-h-[580px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {/* Support Channel Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <span className="grid size-9 place-items-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 shadow-2xs">
            <MessageSquare size={17} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white flex items-center gap-1.5">
              <span>Đội ngũ hỗ trợ BreadTrans</span>
              <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                Trực tuyến
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mọi thắc mắc về bài học, đề thi và kỹ thuật sẽ được giải đáp tại đây.
            </p>
          </div>
        </div>

        {/* Message Stream */}
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50/70 p-4 dark:bg-slate-950/40">
          {messagesQuery.isLoading || conversationQuery.isLoading ? (
            <div className="flex justify-center pt-10">
              <Loader2 className="animate-spin text-slate-400" size={24} />
            </div>
          ) : messages.length === 0 ? (
            <div className="pt-12 text-center text-sm text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Chưa có tin nhắn nào.
              </p>
              <p className="text-xs text-slate-400">
                Hãy đặt câu hỏi bên dưới để bắt đầu trao đổi với ban quản trị.
              </p>
            </div>
          ) : (
            messages.map((message: SupportMessageItem, idx: number) => {
              const mine = message.senderRole === "STUDENT";
              const isSystem = message.senderRole === "SYSTEM";
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

                  {isSystem ? (
                    <div className="flex justify-center my-2">
                      <div className="max-w-md rounded-full bg-slate-100 dark:bg-slate-800/80 px-3.5 py-1 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                        <span>{message.content}</span>
                        <span className="ml-2 text-[10px] text-slate-400">
                          ({formatMessageTimestamp(message.createdAt)})
                        </span>
                      </div>
                    </div>
                  ) : mine ? (
                    /* Student message (Mine -> Right) */
                    <div className="flex justify-end items-end gap-2 my-2.5 group">
                      <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%] lg:max-w-[70%] xl:max-w-[640px]">
                        {/* Header: Name, Role Badge, Full Timestamp */}
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-xs">
                          <span
                            className="text-[11px] font-medium text-slate-400"
                            title={formatMessageFullTooltip(message.createdAt)}
                          >
                            {formatMessageTimestamp(message.createdAt)}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            Bạn
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                            Học viên
                          </span>
                        </div>

                        {/* Bubble */}
                        <div className="w-full rounded-2xl rounded-br-xs px-4 py-3 text-sm leading-relaxed bg-slate-900 text-white shadow-2xs dark:bg-amber-600 dark:text-white">
                          <ChatMessageContent
                            content={message.content}
                            isInverse={true}
                          />
                        </div>
                      </div>

                      {/* Avatar */}
                      <span className="size-8 grid shrink-0 place-items-center rounded-full bg-slate-900 text-white dark:bg-amber-600 text-xs font-bold shadow-2xs mb-0.5">
                        <User size={14} />
                      </span>
                    </div>
                  ) : (
                    /* Support / Admin message (Left) */
                    <div className="flex justify-start items-end gap-2 my-2.5 group">
                      {/* Support Avatar */}
                      <span className="size-8 grid shrink-0 place-items-center rounded-full bg-blue-600 text-white text-xs font-bold shadow-2xs mb-0.5">
                        <Shield size={14} />
                      </span>

                      <div className="flex flex-col items-start max-w-[85%] sm:max-w-[75%] lg:max-w-[70%] xl:max-w-[640px]">
                        {/* Header: Name, Role Badge, Full Timestamp */}
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-xs">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {message.senderName || "Đội ngũ BreadTrans"}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
                            Quản trị viên
                          </span>
                          <span
                            className="text-[11px] font-medium text-slate-400"
                            title={formatMessageFullTooltip(message.createdAt)}
                          >
                            {formatMessageTimestamp(message.createdAt)}
                          </span>
                        </div>

                        {/* Bubble */}
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
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Form */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="border-t border-slate-200 p-3 dark:border-slate-800 bg-white dark:bg-slate-900"
        >
          <label className="sr-only" htmlFor="learner-message-draft">
            Nhập tin nhắn
          </label>
          <div className="flex items-end gap-2">
            <textarea
              id="learner-message-draft"
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
              placeholder="Nhập câu hỏi hoặc yêu cầu hỗ trợ... (Enter để gửi, Shift+Enter xuống dòng)"
              className="min-h-11 flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-amber-950"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sendMutation.isPending}
              className="grid min-h-11 min-w-11 place-items-center rounded-lg bg-amber-500 text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
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
      </section>
    </div>
  );
}
