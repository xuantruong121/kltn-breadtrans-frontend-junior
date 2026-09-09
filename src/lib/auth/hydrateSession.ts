import { QueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { userService } from "@/lib/api/services/user.service";

export async function hydrateSession(queryClient: QueryClient): Promise<void> {
  try {
    const [profile, stats] = await Promise.all([
      userService.getProfile(),
      userService.getStats(),
    ]);
    useAuthStore.getState().setProfile(profile.profile);
    queryClient.setQueryData(["user-profile"], profile);
    queryClient.setQueryData(["user-stats"], stats);
  } catch {
    // Token issuance remains successful even when optional profile hydration
    // is temporarily unavailable; normal queries will retry after navigation.
  }
}
