"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Gift } from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import { normalizeReferralCode, referralLink, type ReferralSummary } from "@/lib/referral/referral";

const KEY = ["referral", "me"] as const;

/** "Mời bạn bè": the learner's invite link and, for new accounts, a friend's code. */
export function ReferralCard() {
  const queryClient = useQueryClient();
  const [friendCode, setFriendCode] = useState("");
  const { data } = useQuery({
    queryKey: KEY,
    queryFn: () => axiosClient.get("/referrals/me") as Promise<ReferralSummary>,
    staleTime: 60 * 1000,
  });
  const claim = useMutation({
    mutationFn: (code: string) => axiosClient.post("/referrals/claim", { code }) as Promise<ReferralSummary>,
    onSuccess: (summary) => {
      queryClient.setQueryData(KEY, summary);
      setFriendCode("");
      toast.success("Đã nhận mã. Khi bạn mua gói đầu tiên, cả hai được thêm 7 ngày.");
    },
    onError: (error: { response?: { data?: { message?: string } } }) =>
      toast.error(error?.response?.data?.message ?? "Không nhận được mã giới thiệu."),
  });
  if (!data) return null;
  const link = typeof window === "undefined" ? "" : referralLink(window.location.origin, data.code);

  return (
    <section
      aria-labelledby="referral-title"
      className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start gap-3">
        <Gift size={22} strokeWidth={2} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="referral-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
            Mời bạn cùng học, cả hai được thêm {data.rewardDays} ngày
          </h2>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            Gửi đường dẫn bên dưới cho bạn bè. Khi bạn ấy mua gói đầu tiên, gói của bạn ấy và của bạn được cộng thêm{" "}
            {data.rewardDays} ngày; nếu bạn đang dùng gói Free, bạn được dùng Plus {data.rewardDays} ngày.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {link}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(link)
                  .then(() => toast.success("Đã chép đường dẫn mời"))
                  .catch(() => toast.error(`Chép không được. Mã của bạn: ${data.code}`));
              }}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900"
            >
              <Copy size={16} strokeWidth={2} aria-hidden="true" />
              Chép đường dẫn
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Mã của bạn: <strong className="text-slate-900 dark:text-slate-100">{data.code}</strong> · Đã mời {data.invited} ·
            Đã nhận thưởng {data.rewarded}
          </p>
          {data.invitedBy && (
            <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
              {data.invitedBy.status === "REWARDED"
                ? "Bạn đã nhận thưởng giới thiệu."
                : "Bạn đã nhập mã giới thiệu; thưởng có khi bạn mua gói đầu tiên."}
            </p>
          )}
          {data.canClaim && (
            <form
              className="mt-3 flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                const code = normalizeReferralCode(friendCode);
                if (code) claim.mutate(code);
              }}
            >
              <label className="sr-only" htmlFor="friend-code">
                Mã giới thiệu của bạn bè
              </label>
              <input
                id="friend-code"
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value)}
                maxLength={20}
                placeholder="Có mã của bạn bè? Nhập ở đây"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm uppercase sm:flex-1 text-slate-900 placeholder:normal-case placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={!normalizeReferralCode(friendCode) || claim.isPending}
                className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Nhận mã
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
