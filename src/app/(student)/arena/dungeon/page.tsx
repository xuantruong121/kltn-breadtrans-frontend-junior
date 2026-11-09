"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { dungeonService, type DungeonResult } from "@/lib/api/services/dungeon.service";
import { arenaSound } from "@/modules/arena/sound/arenaSound";
import { useArenaMusic } from "@/modules/arena/sound/useArenaSound";
import { MATCH_END_QUERY_KEYS } from "@/modules/arena/arenaWallet";
import { DungeonGame } from "@/modules/dungeon/components/DungeonGame";
import { RunResult } from "@/modules/dungeon/components/RunResult";

const LOBBY = "/arena?game=dungeon";

/**
 * Hầm Bánh Mì's playing screen, full width. The mode is chosen in the lobby
 * on /arena; this page plays the open run (a reload comes back to it) and
 * shows the result. With no open run it returns to the lobby.
 */
export default function DungeonPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isGuest = !user || user.role !== "STUDENT";
  const [result, setResult] = useState<DungeonResult | null>(null);

  const { data: open, isFetched } = useQuery({
    queryKey: ["dungeon-current", user?.id],
    queryFn: dungeonService.current,
    enabled: !isGuest,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  useArenaMusic(open && !result ? "battle" : null);
  useEffect(() => {
    const start = () => arenaSound.unlock();
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, []);

  useEffect(() => {
    if (isGuest || (isFetched && !open && !result)) router.replace(LOBBY);
  }, [isGuest, isFetched, open, result, router]);

  const done = useCallback(
    (r: DungeonResult) => {
      setResult(r);
      arenaSound.play(r.record || r.bossesDown > 0 ? "win" : "lose");
      for (const key of [...MATCH_END_QUERY_KEYS, ["dungeon-board"]]) void queryClient.invalidateQueries({ queryKey: [...key] });
    },
    [queryClient]
  );

  const back = () => {
    queryClient.removeQueries({ queryKey: ["dungeon-current"] });
    router.push(LOBBY);
  };

  return (
    <>
      {open && !result && <DungeonGame key={open.sessionId} initial={open} onDone={done} />}
      {result && <RunResult result={result} onAgain={back} onExit={back} />}
      {!open && !result && (
        <p className="py-24 text-center text-sm text-slate-600 dark:text-slate-400" role="status">
          Đang mở hầm…
        </p>
      )}
    </>
  );
}
