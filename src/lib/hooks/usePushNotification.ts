"use client";

import { useState, useEffect, useCallback } from "react";
import axiosClient from "@/lib/api/axiosClient";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotification() {
  const { user } = useAuthStore();
  const [isSupported] = useState(() => {
    if (typeof window === "undefined") return false;
    return "serviceWorker" in navigator && "PushManager" in window;
  });
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "default";
    return Notification.permission;
  });
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          return registration.pushManager.getSubscription();
        })
        .then((subscription) => {
          setIsSubscribed(!!subscription);
        })
        .catch((err) => {
          console.warn("Service Worker registration error:", err);
        });
    }
  }, []);

  const subscribeToPush = useCallback(async () => {
    if (!isSupported) {
      toast.error("Trình duyệt của bạn không hỗ trợ Push Notification.");
      return false;
    }

    if (!user) {
      toast.error("Vui lòng đăng nhập để bật thông báo!");
      return false;
    }

    setIsLoading(true);
    try {
      // 1. Request Permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        toast.error("Bạn đã từ chối quyền nhận thông báo.");
        setIsLoading(false);
        return false;
      }

      // 2. Register & Subscribe
      const registration = await navigator.serviceWorker.ready;
      const vapidKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        "BBHW4US29BdbTAUO0IWZIvZPRd9eFQZ7pibsO7mEvTziEI-R_bfnWqEelWkCQrn_CrldpBlpsmCbtOFSMSmxPhY";

      const convertedKey = urlBase64ToUint8Array(vapidKey);

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });
      }

      // 3. Send subscription to Backend
      const rawSub = subscription.toJSON();
      await axiosClient.post("/notifications/subscribe", {
        endpoint: rawSub.endpoint,
        keys: {
          p256dh: rawSub.keys?.p256dh,
          auth: rawSub.keys?.auth,
        },
        userAgent: navigator.userAgent,
      });

      setIsSubscribed(true);
      toast.success("Đã bật thông báo nhắc nhở học tập thành công!", { icon: "🔔" });
      return true;
    } catch (err: any) {
      console.error("Failed to subscribe push notification:", err);
      toast.error("Không thể đăng ký nhận thông báo: " + (err.message || "Lỗi không xác định"));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user]);

  const unsubscribeFromPush = useCallback(async () => {
    if (!isSupported) return;

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await axiosClient.post("/notifications/unsubscribe", { endpoint });
      }

      setIsSubscribed(false);
      toast.success("Đã tắt thông báo nhắc nhở.");
    } catch {
      toast.error("Lỗi khi tắt thông báo");
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const sendTestPush = useCallback(async () => {
    if (!user) return;
    try {
      await axiosClient.post("/notifications/test");
      toast.success("Đã gửi thông báo thử nghiệm! Kiểm tra màn hình nhé.", { icon: "🚀" });
    } catch {
      toast.error("Lỗi gửi thông báo thử nghiệm");
    }
  }, [user]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestPush,
  };
}
