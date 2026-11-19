"use client";

import { useCallback, useEffect, useState } from "react";

import axiosClient from "@/lib/api/axiosClient";
import { pushState, urlBase64ToUint8Array, type PushState } from "./pushLogic";

/**
 * Browser notifications (Web Push) for this browser. The worker
 * (public/push-sw.js) is registered with scope /push/, so it controls no page;
 * it only shows pushes and opens their link.
 */
export const PUSH_SCOPE = "/push/";
const PUSH_WORKER = "/push-sw.js";
const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function browserSupport() {
  if (typeof window === "undefined") return { supported: false, secure: false };
  return {
    supported: "serviceWorker" in navigator && "PushManager" in window && "Notification" in window,
    secure: window.isSecureContext,
  };
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration(PUSH_SCOPE);
  return (await registration?.pushManager.getSubscription()) ?? null;
}

/**
 * Registers the worker and waits until it is active. navigator.serviceWorker.ready
 * would never settle here: it waits for a worker that controls this page.
 */
async function activeRegistration(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register(PUSH_WORKER, { scope: PUSH_SCOPE });
  const worker = registration.installing ?? registration.waiting ?? registration.active;
  if (!worker) throw new Error("push worker missing");
  await new Promise<void>((resolve, reject) => {
    // The worker can reach "activated" before this listener exists: check first.
    const settle = () => {
      if (worker.state === "activated") {
        window.clearTimeout(timer);
        resolve();
      } else if (worker.state === "redundant") {
        window.clearTimeout(timer);
        reject(new Error("push worker became redundant"));
      }
    };
    const timer = window.setTimeout(() => reject(new Error("push worker did not activate")), 15_000);
    worker.addEventListener("statechange", settle);
    settle();
  });
  return registration;
}

function subscribeBody(subscription: PushSubscription) {
  const json = subscription.toJSON();
  return {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
    userAgent: navigator.userAgent.slice(0, 255),
  };
}

/**
 * On logout: forget this browser, so a shared computer does not get the next
 * learner's reminders for the previous one. Best effort, never longer than 2 s.
 */
export async function dropBrowserPush(): Promise<void> {
  if (!browserSupport().supported) return;
  const work = (async () => {
    const subscription = await currentSubscription();
    if (!subscription) return;
    await axiosClient.post("/notifications/unsubscribe", { endpoint: subscription.endpoint }).catch(() => undefined);
    await subscription.unsubscribe().catch(() => undefined);
  })().catch(() => undefined);
  await Promise.race([work, new Promise((resolve) => window.setTimeout(resolve, 2000))]);
}

export type EnableOutcome = "on" | "denied" | "dismissed" | "failed";

export function useBrowserPush() {
  const [state, setState] = useState<PushState | "loading">("loading");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const support = browserSupport();
    if (!support.supported || !support.secure || !VAPID_KEY) {
      setState(pushState({ ...support, vapidKey: VAPID_KEY, permission: "default", subscribed: false }));
      return;
    }
    const subscription = await currentSubscription().catch(() => null);
    const permission = Notification.permission;
    // The server may have dropped it (expired, logged out elsewhere): send it again.
    if (subscription && permission === "granted") {
      await axiosClient.post("/notifications/subscribe", subscribeBody(subscription)).catch(() => undefined);
    }
    setState(pushState({ ...support, vapidKey: VAPID_KEY, permission, subscribed: Boolean(subscription) }));
  }, []);

  useEffect(() => {
    // Reads browser-only state once the page is in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const enable = useCallback(async (): Promise<EnableOutcome> => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        await refresh();
        return permission === "denied" ? "denied" : "dismissed";
      }
      const registration = await activeRegistration();
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
        }));
      await axiosClient.post("/notifications/subscribe", subscribeBody(subscription));
      setState("on");
      return "on";
    } catch {
      await refresh().catch(() => undefined);
      return "failed";
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const subscription = await currentSubscription();
      if (subscription) {
        await axiosClient.post("/notifications/unsubscribe", { endpoint: subscription.endpoint }).catch(() => undefined);
        await subscription.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }, []);

  /** Asks the server to push a test to every browser of this account; returns how many got it. */
  const sendTest = useCallback(async (): Promise<number> => {
    setBusy(true);
    try {
      const res = (await axiosClient.post("/notifications/test")) as { result?: { sent?: number } };
      return res?.result?.sent ?? 0;
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, enable, disable, sendTest };
}
