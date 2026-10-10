"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BookOpen, CheckCheck, Clock, ExternalLink, Flame, Inbox, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { notificationService, type NotificationFilter, type NotificationItem } from "@/lib/api/services/notification.service";
import { getNotificationActionLabel, resolveNotificationAction } from "@/lib/notifications/notificationLogic";

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function notificationIcon(item: NotificationItem) {
  if (item.type === "vocab_review") return <BookOpen size={20} aria-hidden="true" />;
  if (item.type === "streak") return <Flame size={20} aria-hidden="true" />;
  return <Bell size={20} aria-hidden="true" />;
}

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [cursor, setCursor] = useState<number | undefined>();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<NotificationItem | null>(null);

  const inboxQuery = useQuery({
    queryKey: ["notifications", "history", filter, cursor],
    queryFn: () => notificationService.getInbox(20, cursor, filter),
    refetchOnWindowFocus: true,
  });

  const mergedItems = useMemo(() => {
    const next = inboxQuery.data?.items || [];
    if (!cursor) return next;
    const byId = new Map(items.map((item) => [item.id, item]));
    next.forEach((item) => byId.set(item.id, item));
    return [...byId.values()];
  }, [cursor, inboxQuery.data?.items, items]);

  const markRead = useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "recent", "unread"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "history"] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "recent", "unread"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "history"] });
      toast.success("Đã đánh dấu tất cả thông báo là đã đọc.");
    },
    onError: () => toast.error("Không thể cập nhật thông báo lúc này."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => notificationService.delete(id),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.message || "Thông báo không tồn tại.");
        return;
      }
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "recent", "unread"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "history"] });
      toast.success("Đã xóa thông báo.");
    },
    onError: () => toast.error("Không thể xóa thông báo lúc này."),
  });

  const changeFilter = (next: NotificationFilter) => {
    setFilter(next);
    setCursor(undefined);
    setItems([]);
  };

  const openItem = (item: NotificationItem) => {
    if (!item.isRead) markRead.mutate(item.id);
    const target = resolveNotificationAction(item);
    if (target) router.push(target);
  };

  const currentItems = cursor ? mergedItems : inboxQuery.data?.items || [];
  const emptyLabel = filter === "unread" ? "Bạn không có thông báo mới." : filter === "read" ? "Chưa có thông báo đã đọc." : "Chưa có thông báo nào.";

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">Trung tâm cá nhân</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-slate-50 sm:text-3xl">Thông báo</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Theo dõi nhắc nhở học tập và mở nhanh nội dung liên quan.</p>
        </div>
        <button type="button" onClick={() => markAll.mutate()} disabled={markAll.isPending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:border-amber-300 hover:text-amber-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-amber-700 dark:hover:text-amber-300">
          {markAll.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCheck size={16} />} Đánh dấu tất cả đã đọc
        </button>
      </div>

      <div className="mb-4 flex w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/70" role="tablist" aria-label="Bộ lọc thông báo">
        {([["all", "Tất cả"], ["unread", "Chưa đọc"], ["read", "Đã đọc"]] as const).map(([value, label]) => (
          <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => changeFilter(value)} className={`min-h-10 flex-1 whitespace-nowrap rounded-xl px-4 text-sm font-bold transition-colors ${filter === value ? "bg-white text-amber-700 shadow-sm dark:bg-slate-800 dark:text-amber-300" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}>
            {label}
          </button>
        ))}
      </div>

      <section aria-live="polite" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {inboxQuery.isLoading ? (
          <div className="flex min-h-56 items-center justify-center"><Loader2 size={28} className="animate-spin text-amber-500" /></div>
        ) : inboxQuery.isError ? (
          <div className="px-6 py-14 text-center text-sm font-semibold text-rose-600 dark:text-rose-400">Không thể tải thông báo. Vui lòng thử lại.</div>
        ) : currentItems.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm font-semibold text-slate-500 dark:text-slate-400"><Inbox size={32} className="mx-auto mb-3 text-slate-300" />{emptyLabel}</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {currentItems.map((item) => {
              const target = resolveNotificationAction(item);
              const label = getNotificationActionLabel(item);
              return (
                <article key={item.id} className={`flex gap-3 p-4 transition-colors sm:gap-4 sm:p-5 ${item.isRead ? "bg-white dark:bg-slate-900" : "bg-amber-50/50 dark:bg-amber-950/20"}`}>
                  <span className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl ${item.isRead ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"}`}>{notificationIcon(item)}</span>
                  <button type="button" onClick={() => openItem(item)} className="min-w-0 flex-1 text-left cursor-pointer">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className={`text-sm leading-5 ${item.isRead ? "font-semibold text-slate-700 dark:text-slate-300" : "font-black text-slate-950 dark:text-slate-50"}`}>{item.title}</h2>
                      {!item.isRead && <span className="mt-1 size-2 shrink-0 rounded-full bg-amber-500" aria-label="Chưa đọc" />}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{item.body}</p>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400"><Clock size={13} /> {formatNotificationTime(item.createdAt)}</span>
                  </button>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {target && label && <button type="button" onClick={() => openItem(item)} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-extrabold text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/50">{label}<ExternalLink size={13} /></button>}
                    <button type="button" aria-label={`Xóa thông báo ${item.title}`} onClick={() => setDeleteTarget(item)} className="grid min-h-10 min-w-10 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"><Trash2 size={16} /></button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {inboxQuery.data?.nextCursor && <div className="border-t border-slate-100 p-3 text-center dark:border-slate-800"><button type="button" onClick={() => { setItems(currentItems); setCursor(inboxQuery.data?.nextCursor ?? undefined); }} disabled={inboxQuery.isFetching} className="min-h-10 rounded-xl px-4 text-sm font-bold text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/50">{inboxQuery.isFetching ? "Đang tải..." : "Tải thêm"}</button></div>}
      </section>

      <ConfirmDialog open={Boolean(deleteTarget)} title="Xóa thông báo?" description="Thông báo này sẽ bị xóa khỏi lịch sử của bạn và không thể khôi phục." isPending={deleteMutation.isPending} onCancel={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} />
    </main>
  );
}
