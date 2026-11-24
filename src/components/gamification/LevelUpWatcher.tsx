"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { PawPrint } from "lucide-react";

import { LevelMedalIcon } from "@/components/ui/LevelMedalIcon";
import { gamificationService } from "@/lib/api/services/gamification.service";
import { notificationService } from "@/lib/api/services/notification.service";
import {
  isLevelUpNotice,
  levelUpsToCelebrate,
  petLevelKey,
  readLevelSeen,
  writeLevelSeen,
} from "@/lib/gamification/levelUpWatch";
import { formatXp, xpLevelProgress } from "@/lib/gamification/xpLevel";
import { PetLevelUpToastText } from "@/modules/pet/components/PetLevelUpToastText";
import { petLevelProgress } from "@/modules/pet/petLogic";
import { useLevelUpStore } from "@/stores/levelUpStore";

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The toast already said it, so the matching lines in Thông báo are read. */
async function markLevelUpNoticesRead(queryClient: QueryClient) {
  try {
    const inbox = await notificationService.getInbox(20, undefined, "unread");
    const ids = (inbox?.items ?? []).filter((item) => isLevelUpNotice(item.type)).map((item) => item.id);
    if (ids.length === 0) return;
    await Promise.all(ids.map((id) => notificationService.markRead(id)));
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  } catch {
    // The lines stay unread; the learner can still open them.
  }
}

/**
 * Lên cấp (owner 2026-11-24): a toast when the learner's XP level or their
 * thú ảo goes up a level, wherever the level was earned (an exercise graded in
 * the background, a speaking reward, feeding). Mounted once in the student
 * layout. The pet is read from the cache only: it is seen as soon as a pet on
 * screen refetches, without a request of its own.
 */
export function LevelUpWatcher({ userId, totalXp }: { userId: number; totalXp: number | null | undefined }) {
  const queryClient = useQueryClient();
  const celebratePet = useLevelUpStore((state) => state.celebratePet);
  const { data: pet } = useQuery({
    queryKey: ["my-pet", userId],
    queryFn: gamificationService.getMyPet,
    enabled: false,
  });

  const xpNow = typeof totalXp === "number" ? xpLevelProgress(totalXp) : null;
  const xpLevelNow = xpNow?.level ?? null;
  const xpRemaining = xpNow?.remaining ?? 0;
  const petKey = pet ? petLevelKey(pet.name) : null;
  const petProgress = pet ? petLevelProgress(pet.exp, pet.level) : null;
  const petLevelNow = petProgress?.level ?? null;
  const petExpToNext = petProgress?.expToNext ?? 0;

  useEffect(() => {
    if (xpLevelNow === null && petLevelNow === null) return;
    // Read right before deciding, so a second tab finds it already announced.
    const storage = browserStorage();
    const result = levelUpsToCelebrate(readLevelSeen(storage, userId), {
      xp: xpLevelNow,
      pet: petKey && petLevelNow ? { key: petKey, level: petLevelNow } : null,
    });
    if (result.changed) writeLevelSeen(storage, userId, result.seen);

    if (result.xp !== null) {
      toast.success(
        <span className="text-sm">
          <strong className="font-extrabold">Bạn đã lên Cấp {result.xp}</strong>
          {xpRemaining > 0 && (
            <span className="block text-slate-600 dark:text-slate-300">
              Còn {formatXp(xpRemaining)} XP để lên Cấp {result.xp + 1}.
            </span>
          )}
        </span>,
        {
          id: `level-up-xp-${result.xp}`,
          duration: 6000,
          icon: <LevelMedalIcon className="h-6 w-6 shrink-0" />,
        },
      );
    }
    if (result.pet !== null) {
      celebratePet();
      toast.success(<PetLevelUpToastText level={result.pet} expToNext={petExpToNext} />, {
        id: `level-up-pet-${result.pet}`,
        duration: 6000,
        icon: <PawPrint aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-600" strokeWidth={2} />,
      });
    }
    if (result.xp !== null || result.pet !== null) void markLevelUpNoticesRead(queryClient);
  }, [userId, xpLevelNow, xpRemaining, petKey, petLevelNow, petExpToNext, celebratePet, queryClient]);

  return null;
}

export default LevelUpWatcher;
