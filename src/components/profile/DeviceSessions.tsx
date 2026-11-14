"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Laptop, Loader2, LogOut, Smartphone } from "lucide-react";
import toast from "react-hot-toast";

import axiosClient from "@/lib/api/axiosClient";
import { deviceLabel, lastUsedText, type AuthSessionView } from "@/lib/auth/deviceLabel";
import { getApiErrorMessage } from "@/lib/utils/apiError";

/**
 * The devices signed in to this account (owner 2026-11-14): the browser and
 * system, when each was last used, and a way to sign one or all others out.
 */
export function DeviceSessions() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["auth-sessions"],
    queryFn: () => axiosClient.get("/auth/sessions") as unknown as Promise<AuthSessionView[]>,
  });
  const sessions = data ?? [];
  const others = sessions.filter((s) => !s.current);

  const run = async (key: string, action: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try {
      await action();
      toast.success(done);
      await queryClient.invalidateQueries({ queryKey: ["auth-sessions"] });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Chưa đăng xuất được thiết bị này."));
    } finally {
      setBusy(null);
    }
  };

  if (isLoading)
    return (
      <div className="flex min-h-24 items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={24} aria-label="Đang tải thiết bị" />
      </div>
    );
  if (isError)
    return <p className="text-sm text-rose-700 dark:text-rose-300">Chưa tải được danh sách thiết bị. Hãy thử lại.</p>;

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {sessions.map((s) => {
          const { browser, os, mobile } = deviceLabel(s.userAgent);
          const Icon = mobile ? Smartphone : Laptop;
          return (
            <li
              key={s.deviceId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-850/60"
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-slate-100">
                    {browser} trên {os}
                    {s.current && (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                        Thiết bị này
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                    Dùng lần cuối: {s.current ? "Đang dùng" : lastUsedText(s.lastUsedAt)}
                  </p>
                </div>
              </div>
              {!s.current && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() =>
                    void run(s.deviceId, () => axiosClient.delete(`/auth/sessions/${encodeURIComponent(s.deviceId)}`), "Đã đăng xuất thiết bị.")
                  }
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/60 dark:bg-slate-900 dark:text-rose-300 cursor-pointer"
                >
                  {busy === s.deviceId ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <LogOut size={15} aria-hidden="true" />}
                  Đăng xuất
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {others.length > 0 && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void run("others", () => axiosClient.post("/auth/sessions/revoke-others"), "Đã đăng xuất các thiết bị khác.")}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-800 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 cursor-pointer"
        >
          {busy === "others" ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <LogOut size={16} aria-hidden="true" />}
          Đăng xuất các thiết bị khác ({others.length})
        </button>
      )}
    </div>
  );
}
