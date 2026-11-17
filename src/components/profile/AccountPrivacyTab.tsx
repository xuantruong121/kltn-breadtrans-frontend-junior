"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FileText, Loader2, ShieldCheck, Trash2 } from "lucide-react";

import axiosClient from "@/lib/api/axiosClient";
import {
  DELETION_GRACE_DAYS,
  LEGAL_VERSION,
  canRequestDeletion,
  consentDocumentLabel,
  consentMethodLabel,
  deletionRequestBody,
  formatVnDate,
} from "@/lib/auth/accountPrivacy";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { useAuthStore } from "@/stores/authStore";

type ConsentHistory = {
  currentVersion: string;
  consentRequired: boolean;
  consents: Array<{
    document: string;
    version: string;
    method: string;
    acceptedAt: string;
  }>;
};

const CARD =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6";

/**
 * "Quyền riêng tư" (owner 2026-11-16): what the learner agreed to and when,
 * and the button that deletes the account for real after a 7-day grace period.
 */
export function AccountPrivacyTab({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const history = useQuery({
    queryKey: ["consentHistory", user?.id],
    queryFn: () => axiosClient.get("/auth/consent") as Promise<ConsentHistory>,
    enabled: !!user?.id,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  const confirm = {
    hasPassword,
    password,
    confirmEmail,
    accountEmail: user?.email ?? "",
    understood,
  };

  const requestDeletion = async () => {
    if (!canRequestDeletion(confirm)) return;
    setIsPending(true);
    setError("");
    try {
      const res = (await axiosClient.post(
        "/account/deletion",
        deletionRequestBody(confirm),
      )) as { scheduledAt?: string };
      // Every session of the account has just been ended by the server.
      queryClient.clear();
      logout();
      toast.success(
        `Tài khoản sẽ bị xoá vĩnh viễn vào ngày ${formatVnDate(res?.scheduledAt)}. Đăng nhập lại trước ngày đó nếu bạn đổi ý.`,
        { duration: 8000 },
      );
      router.replace("/");
    } catch (err) {
      setError(getApiErrorMessage(err, "Chưa gửi được yêu cầu xoá. Hãy thử lại."));
    } finally {
      setIsPending(false);
    }
  };

  const consents = history.data?.consents ?? [];
  const isAdmin = user?.role === "ADMIN";

  return (
    <section className="space-y-6" aria-labelledby="heading-privacy">
      <div>
        <h1
          id="heading-privacy"
          className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl"
        >
          Quyền riêng tư
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Những gì bạn đã đồng ý, và cách xoá tài khoản cùng dữ liệu của bạn
        </p>
      </div>

      <div className={CARD}>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          <ShieldCheck size={18} strokeWidth={2} className="shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span>Đồng ý đã ghi nhận</span>
        </div>

        {history.isLoading ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Đang tải...
          </p>
        ) : history.isError ? (
          <p className="mt-4 text-sm text-rose-700 dark:text-rose-400">
            Chưa tải được lịch sử đồng ý.
          </p>
        ) : consents.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            Tài khoản này chưa có lần đồng ý nào được ghi lại.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {consents.map((row) => (
              <li
                key={`${row.document}-${row.version}-${row.acceptedAt}`}
                className="flex flex-col gap-0.5 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {consentDocumentLabel(row.document)}{" "}
                  <span className="font-normal text-slate-600 dark:text-slate-400">
                    (bản {row.version})
                  </span>
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  {formatVnDate(row.acceptedAt)} · {consentMethodLabel(row.method)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {history.data?.consentRequired ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            Bạn chưa đồng ý với bản {LEGAL_VERSION}. Ứng dụng sẽ hỏi lại khi bạn rời trang này.
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold">
          <Link href="/terms" target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-amber-700 hover:underline dark:text-amber-400">
            <FileText size={15} strokeWidth={2} aria-hidden="true" /> Điều khoản sử dụng
          </Link>
          <Link href="/privacy" target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-amber-700 hover:underline dark:text-amber-400">
            <FileText size={15} strokeWidth={2} aria-hidden="true" /> Chính sách bảo mật
          </Link>
        </div>
      </div>

      <div className={`${CARD} border-rose-200 dark:border-rose-900/60`}>
        <div className="flex items-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-400">
          <Trash2 size={18} strokeWidth={2} className="shrink-0" aria-hidden="true" />
          <span>Xoá tài khoản</span>
        </div>

        {isAdmin ? (
          <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
            Tài khoản quản trị không tự xoá được. Hãy nhờ một quản trị viên khác xoá trong trang Quản lý người dùng.
          </p>
        ) : (
          <>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6 text-slate-700 dark:text-slate-300">
              <li>
                Tài khoản bị khoá và đăng xuất trên mọi thiết bị ngay khi bạn xác nhận. Sau{" "}
                {DELETION_GRACE_DAYS} ngày, dữ liệu bị xoá vĩnh viễn.
              </li>
              <li>
                Bị xoá: hồ sơ, ảnh đại diện, bài làm, ghi âm, sổ lỗi, từ đã lưu, tiến độ học, thú ảo, đăng nhập Google.
              </li>
              <li>
                Được giữ ở dạng ẩn danh, không còn gắn với email hay tên của bạn: đơn hàng, thanh toán, gói đã mua, lịch sử Bánh Mì.
              </li>
              <li>
                Đổi ý trong {DELETION_GRACE_DAYS} ngày: đăng nhập lại và chọn &quot;Huỷ yêu cầu xoá&quot;.
              </li>
            </ul>

            {!formOpen ? (
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="mt-5 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-rose-300 px-4 text-sm font-bold text-rose-700 transition-colors hover:border-rose-400 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-800 dark:text-rose-400 dark:hover:border-rose-700 dark:hover:bg-rose-950/60 dark:hover:text-rose-300"
              >
                Tôi muốn xoá tài khoản
              </button>
            ) : (
              <form
                className="mt-5 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void requestDeletion();
                }}
              >
                {hasPassword ? (
                  <div>
                    <label htmlFor="delete-password" className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Mật khẩu hiện tại
                    </label>
                    <input
                      id="delete-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100"
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="delete-email" className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Gõ lại email của tài khoản: <span className="font-semibold">{user?.email}</span>
                    </label>
                    <input
                      id="delete-email"
                      type="email"
                      autoComplete="off"
                      value={confirmEmail}
                      onChange={(event) => setConfirmEmail(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100"
                    />
                  </div>
                )}

                <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-6 text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={understood}
                    onChange={(event) => setUnderstood(event.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-rose-600 focus:ring-rose-500 dark:border-slate-700"
                  />
                  <span>
                    Tôi hiểu tài khoản sẽ bị xoá vĩnh viễn sau {DELETION_GRACE_DAYS} ngày và không khôi phục được.
                  </span>
                </label>

                {error ? (
                  <p role="alert" className="text-sm font-medium text-rose-700 dark:text-rose-400">
                    {error}
                  </p>
                ) : null}

                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setFormOpen(false);
                      setError("");
                    }}
                    disabled={isPending}
                    className="cursor-pointer transition-colors min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Thôi, giữ tài khoản
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !canRequestDeletion(confirm)}
                    className="cursor-pointer transition-colors inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
                    Xoá tài khoản sau {DELETION_GRACE_DAYS} ngày
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </section>
  );
}
