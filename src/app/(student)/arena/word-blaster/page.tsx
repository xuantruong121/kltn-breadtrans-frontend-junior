"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { wordBlasterService, type BlasterResult } from "@/lib/api/services/wordBlaster.service";
import { arenaSound } from "@/modules/arena/sound/arenaSound";
import { useArenaMusic } from "@/modules/arena/sound/useArenaSound";
import { MATCH_END_QUERY_KEYS } from "@/modules/arena/arenaWallet";
import { WordBlasterGame } from "@/modules/word-blaster/components/WordBlasterGame";
import { BlasterResultDialog } from "@/modules/word-blaster/components/BlasterResultDialog";

const LOBBY = "/arena?game=blaster";

/**
 * Bắn chữ rơi's playing screen, full width. The stake is chosen in the
 * lobby on /arena; this page plays the open game (a reload comes back to it)
 * and shows the result. With no open game it returns to the lobby.
 */
export default function WordBlasterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isGuest = !user || user.role !== "STUDENT";
  const [result, setResult] = useState<BlasterResult | null>(null);

  const { data: open, isFetched } = useQuery({
    queryKey: ["word-blaster-current", user?.id],
    queryFn: wordBlasterService.current,
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
    (r: BlasterResult) => {
      setResult(r);
      arenaSound.play(r.outcome === "win" ? "win" : "lose");
      for (const key of MATCH_END_QUERY_KEYS) void queryClient.invalidateQueries({ queryKey: [...key] });
    },
    [queryClient]
  );

  const back = () => {
    queryClient.removeQueries({ queryKey: ["word-blaster-current"] });
    router.push(LOBBY);
  };

  return (
    <>
      {open && !result && <WordBlasterGame key={open.sessionId} initial={open} onDone={done} />}
      {result && <BlasterResultDialog result={result} onAgain={back} onExit={back} />}
      {!open && !result && (
        <p className="py-24 text-center text-sm text-slate-600 dark:text-slate-400" role="status">
          Đang mở ván…
        </p>
      )}
    </>
  );
}
