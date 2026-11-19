"use client";

import { useState } from "react";
import { NotificationIcon } from "@/components/notifications/NotificationIcon";
import { NotificationKinds } from "@/components/notifications/NotificationKinds";
import { BrowserPushPanel } from "@/components/profile/BrowserPushPanel";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCheck, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pagination } from "@/components/ui";
import {
  NOTIFICATION_DEFAULT_PAGE_SIZE,
  NOTIFICATION_PAGE_SIZES,
  servedPage,
} from "@/lib/notifications/notificationPaging";
import { notificationService, type NotificationFilter, type NotificationItem } from "@/lib/api/services/notification.service";
import {
  getNotificationActionLabel,
  groupNotificationsByDay,
  notificationRowTime,
  resolveNotificationAction,
} from "@/lib/notifications/notificationLogic";

const FILTERS = [
  ["all", "Tất cả"],
  ["unread", "Chưa đọc"],
  ["read", "Đã đọc"],
] as const;

const UPDATE_FAILED = "Không thể cập nhật thông báo lúc này.";

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(NOTIFICATION_DEFAULT_PAGE_SIZE);
  const [deleteTarget, setDeleteTarget] = useState<NotificationItem | null>(null);

  const inboxQuery = useQuery({
    queryKey: ["notifications", "history", filter, page, pageSize],
    queryFn: () => notificationService.getInboxPage(page, pageSize, filter),
    refetchOnWindowFocus: true,
    // Keep the current page on screen while the next one loads.
    placeholderData: (previous) => previous,
  });

  // Same cache as the bell in the header.
  const { data: unreadData } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationService.getUnreadCount(),
  });
  const unreadCount = unreadData?.count ?? 0;

  // A page past the end (its last notification deleted) is served as the last page.
  // Adjusted during render (as useCatalogPage does), not in an effect.
  const shownPage = servedPage(page, inboxQuery.isPlaceholderData ? undefined : inboxQuery.data);
  if (shownPage !== page) setPage(shownPage);

  const goToPage = (next: number) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  const refreshNotifications = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    queryClient.invalidateQueries({ queryKey: ["notifications", "recent", "unread"] });
    queryClient.invalidateQueries({ queryKey: ["notifications", "history"] });
  };

  const markRead = useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess: refreshNotifications,
    onError: () => toast.error(UPDATE_FAILED),
  });

  const markAll = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      refreshNotifications();
      toast.success("Đã đánh dấu tất cả thông báo là đã đọc.");
    },
    onError: () => toast.error(UPDATE_FAILED),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => notificationService.delete(id),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.message || "Thông báo không tồn tại.");
        return;
      }
      setDeleteTarget(null);
      refreshNotifications();
      toast.success("Đã xóa thông báo.");
    },
    onError: () => toast.error("Không thể xóa thông báo lúc này."),
  });

  const changeFilter = (next: NotificationFilter) => {
    setFilter(next);
    setPage(1);
  };

  const openItem = (item: NotificationItem) => {
    if (!item.isRead) markRead.mutate(item.id);
    const target = resolveNotificationAction(item);
    if (target) router.push(target);
  };

  const groups = groupNotificationsByDay(inboxQuery.data?.items || []);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-50">Thông báo</h1>
              <p className="mt-2 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-400">
                Nhắc ôn từ vựng, giữ chuỗi ngày học, báo cáo tuần và tin về gói học của bạn.
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-950 disabled:opacity-60 sm:self-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white"
              >
                {markAll.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCheck size={16} />}
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </header>

          <div className="mt-6 flex gap-6 border-b border-slate-200 dark:border-slate-800" role="tablist" aria-label="Bộ lọc thông báo">
            {FILTERS.map(([value, label]) => {
              const active = filter === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => changeFilter(value)}
                  className={`-mb-px inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap border-b-2 text-sm font-semibold transition-colors ${
                    active
                      ? "border-slate-900 text-slate-950 dark:border-slate-100 dark:text-slate-50"
                      : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {label}
                  {value === "unread" && unreadCount > 0 && (
                    <span className="tabular-nums text-amber-700 dark:text-amber-400">{unreadCount > 99 ? "99+" : unreadCount}</span>
                  )}
                </button>
              );
            })}
          </div>

          <section aria-live="polite" className="mt-6 border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {inboxQuery.isLoading ? (
              <div className="flex min-h-40 items-center justify-center">
                <Loader2 size={24} className="animate-spin text-slate-400" />
              </div>
            ) : inboxQuery.isError ? (
              <p className="px-4 py-10 text-base leading-7 text-rose-700 sm:px-5 dark:text-rose-400">
                Không tải được thông báo.{" "}
                <button type="button" onClick={() => inboxQuery.refetch()} className="font-semibold underline underline-offset-2">
                  Tải lại
                </button>
              </p>
            ) : groups.length === 0 ? (
              <p className="px-4 py-10 text-base leading-7 text-slate-600 sm:px-5 dark:text-slate-400">
                {filter === "unread" ? (
                  <>
                    Bạn đã đọc hết thông báo.{" "}
                    <button
                      type="button"
                      onClick={() => changeFilter("all")}
                      className="font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900 dark:text-sky-300 dark:hover:text-sky-200"
                    >
                      Xem tất cả thông báo
                    </button>
                  </>
                ) : filter === "read" ? (
                  "Chưa có thông báo đã đọc."
                ) : (
                  <>
                    Chưa có thông báo nào. Nhắc ôn từ vựng, chuỗi ngày học và báo cáo tuần sẽ hiện ở đây khi bạn bắt đầu học từ{" "}
                    <Link
                      href="/dashboard"
                      className="font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900 dark:text-sky-300 dark:hover:text-sky-200"
                    >
                      trang tổng quan
                    </Link>
                    .
                  </>
                )}
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.key} className="border-b border-slate-200 last:border-0 dark:border-slate-800">
                  <h2 className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 sm:px-5 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
                    {group.label}
                  </h2>
                  <ul>
                    {group.items.map((item) => {
                      const label = getNotificationActionLabel(item);
                      const marking = markRead.isPending && markRead.variables === item.id;
                      return (
                        <li key={item.id} className="flex items-start gap-3 border-b border-slate-200 px-4 py-4 last:border-0 sm:px-5 dark:border-slate-800">
                          <NotificationIcon
                            type={item.type}
                            size={18}
                            className={`mt-0.5 shrink-0 ${item.isRead ? "text-slate-400 dark:text-slate-400" : "text-amber-600 dark:text-amber-400"}`}
                          />
                          <button
                            type="button"
                            onClick={() => openItem(item)}
                            className="min-w-0 flex-1 cursor-pointer rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2 dark:focus-visible:ring-slate-300 dark:focus-visible:ring-offset-slate-900"
                          >
                            <span
                              className={`block text-base leading-6 ${
                                item.isRead ? "font-normal text-slate-700 dark:text-slate-300" : "font-semibold text-slate-950 dark:text-slate-50"
                              }`}
                            >
                              {item.title}
                            </span>
                            <span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-400">{item.body}</span>
                            <span className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-500 dark:text-slate-400">
                              {!item.isRead && (
                                <>
                                  <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" />
                                  <span className="sr-only">Chưa đọc,</span>
                                </>
                              )}
                              <time dateTime={item.createdAt}>{notificationRowTime(item.createdAt)}</time>
                              {label && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-semibold text-amber-700 dark:text-amber-400">{label}</span>
                                </>
                              )}
                            </span>
                          </button>
                          {/* Stacked on phones so the text keeps its width; side by side from sm. */}
                          <div className="-mr-2 -mt-2 flex shrink-0 flex-col sm:flex-row sm:items-center">
                            {!item.isRead && (
                              <button
                                type="button"
                                aria-label={`Đánh dấu đã đọc: ${item.title}`}
                                title="Đánh dấu đã đọc"
                                disabled={marking}
                                onClick={() => markRead.mutate(item.id)}
                                className="grid size-10 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-60 dark:text-slate-400 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
                              >
                                {marking ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                              </button>
                            )}
                            <button
                              type="button"
                              aria-label={`Xóa thông báo ${item.title}`}
                              title="Xóa thông báo"
                              onClick={() => setDeleteTarget(item)}
                              className="grid size-10 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </section>

          {inboxQuery.data && inboxQuery.data.total > 0 && (
            <Pagination
              className="mt-4"
              currentPage={inboxQuery.data.page}
              totalPages={inboxQuery.data.totalPages}
              totalItems={inboxQuery.data.total}
              pageSize={pageSize}
              onPageChange={goToPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              pageSizeOptions={NOTIFICATION_PAGE_SIZES}
              alwaysShow
            />
          )}
        </div>

        {/* Beside the list: browser push for this device, and what BreadTrans sends when. */}
        <aside className="space-y-8 lg:pt-1">
          <BrowserPushPanel />
          <NotificationKinds />
        </aside>
      </div>

      <ConfirmDialog open={Boolean(deleteTarget)} title="Xóa thông báo?" description="Thông báo này sẽ bị xóa khỏi lịch sử của bạn và không thể khôi phục." isPending={deleteMutation.isPending} onCancel={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} />
    </main>
  );
}
