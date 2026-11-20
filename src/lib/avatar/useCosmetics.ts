"use client";

import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import axiosClient from "@/lib/api/axiosClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { useAuthStore } from "@/stores/authStore";

import { cosmeticsOf, type Cosmetics } from "./cosmetics";

/**
 * The signed-in learner's worn frame and badge, and setters that save them on
 * the server. A setter resolves true once saved; on failure it shows why.
 */
export function useCosmetics() {
  const profile = useAuthStore((s) => s.user?.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const queryClient = useQueryClient();
  const { avatarFrame, badgeKey } = cosmeticsOf(profile);

  const save = async (change: Partial<Cosmetics>): Promise<boolean> => {
    try {
      const saved = (await axiosClient.patch("/users/cosmetics", change)) as Record<string, unknown>;
      setProfile({ ...(profile ?? {}), ...(saved ?? {}), ...change });
      void queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      return true;
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Chưa lưu được. Vui lòng thử lại."));
      return false;
    }
  };

  return {
    equippedAvatarFrame: avatarFrame,
    equippedBadge: badgeKey,
    equipAvatarFrame: (slug: string | null) => save({ avatarFrame: slug }),
    equipBadge: (slug: string | null) => save({ badgeKey: slug }),
  };
}
