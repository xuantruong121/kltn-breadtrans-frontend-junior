"use client";

import { useEffect } from "react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import { useAuthStore } from "@/stores/authStore";
import { REFERRAL_STORAGE_KEY, referralCodeFromSearch } from "@/lib/referral/referral";

const read = () => {
  try {
    return window.localStorage.getItem(REFERRAL_STORAGE_KEY);
  } catch {
    return null;
  }
};
const write = (value: string | null) => {
  try {
    if (value) window.localStorage.setItem(REFERRAL_STORAGE_KEY, value);
    else window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    /* storage blocked: the code is simply not remembered */
  }
};

/**
 * Keeps the code of an invite link (`?ref=BT-…`) until the learner is signed
 * in, then enters it once. Renders nothing.
 */
export function ReferralCapture() {
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const fromLink = referralCodeFromSearch(window.location.search);
    if (fromLink) write(fromLink);
  }, []);

  useEffect(() => {
    if (!user || user.role === "ADMIN") return;
    const code = read();
    if (!code) return;
    write(null);
    axiosClient
      .post("/referrals/claim", { code })
      .then(() => toast.success("Đã nhận mã giới thiệu. Khi bạn mua gói đầu tiên, cả bạn và người mời được thêm 7 ngày."))
      .catch(() => {
        /* Refused (own code, already referred, too late): nothing to do. */
      });
  }, [user]);

  return null;
}
