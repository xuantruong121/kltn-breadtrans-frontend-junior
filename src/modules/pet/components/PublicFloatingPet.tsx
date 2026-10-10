"use client";

import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { shouldRenderFloatingPetOnPublicRoute } from "../petLogic";

const emptySubscribe = () => () => {};

const FloatingCompanionPet = dynamic(
  () =>
    import("@/modules/pet/components/FloatingCompanionPet").catch((err) => {
      console.warn("FloatingCompanionPet chunk load failed (stale chunk after server restart):", err);
      return { default: () => null };
    }),
  { ssr: false }
);

export function PublicFloatingPet() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isReady = useSyncExternalStore(emptySubscribe, () => true, () => false);

  if (!isReady) {
    return null;
  }

  if (!shouldRenderFloatingPetOnPublicRoute(pathname, user)) {
    return null;
  }

  return <FloatingCompanionPet />;
}

export default PublicFloatingPet;
