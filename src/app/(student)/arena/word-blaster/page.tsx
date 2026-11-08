"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Crosshair, Heart, Wheat } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { userService } from "@/lib/api/services/user.service";
import { wordBlasterService, type BlasterResult, type BlasterView } from "@/lib/api/services/wordBlaster.service";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { ArenaBackdrop } from "@/modules/arena/components/ArenaBackdrop";
import { arenaSound } from "@/modules/arena/sound/arenaSound";
import { useArenaMusic } from "@/modules/arena/sound/useArenaSound";
import { MATCH_END_QUERY_KEYS } from "@/modules/arena/arenaWallet";
import { BreadCannon } from "@/modules/word-blaster/components/BreadCannon";
import { WordBlasterGame } from "@/modules/word-blaster/components/WordBlasterGame";
import { BlasterResultDialog } from "@/modules/word-blaster/components/BlasterResultDialog";

const STAKES = [20, 50, 100] as const;

export default function WordBlasterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isGuest = !user || user.role !== "STUDENT";
  const [stake, setStake] = useState<number>(20);
  const [started, setStarted] = useState<BlasterView | null>(null);
  /** The game whose result was shown, so a stale "current" reply cannot bring it back. */
  const [doneId, setDoneId] = useState<string | null>(null);
  const [result, setResult] = useState<BlasterResult | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: stats } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: userService.getStats,
    enabled: !isGuest,
    staleTime: 30_000,
  });
  const balance = stats?.totalBanhRan ?? null;

  // A reload in the middle of a game comes back to it.
  const { data: open } = useQuery({
    queryKey: ["word-blaster-current", user?.id],
    queryFn: wordBlasterService.current,
    enabled: !isGuest,
    staleTime: 0,
  });
  const game = started ?? (open && open.sessionId !== doneId ? open : null);

  useArenaMusic(game && !result ? "battle" : "lobby");
  useEffect(() => {
    const start = () => arenaSound.unlock();
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, []);

  const begin = async () => {
    setError(null);
    setStarting(true);
    arenaSound.unlock();
    try {
      setResult(null);
      setStarted(await wordBlasterService.start(stake));
      for (const key of MATCH_END_QUERY_KEYS) void queryClient.invalidateQueries({ queryKey: [...key] });
    } catch (e) {
      setError(getApiErrorMessage(e, "Không mở được ván. Vui lòng thử lại."));
    } finally {
      setStarting(false);
    }
  };

  const done = useCallback(
    (r: BlasterResult, sessionId: string) => {
      setResult(r);
      setDoneId(sessionId);
      arenaSound.play(r.outcome === "win" ? "win" : "lose");
      for (const key of MATCH_END_QUERY_KEYS) void queryClient.invalidateQueries({ queryKey: [...key] });
      void queryClient.invalidateQueries({ queryKey: ["word-blaster-current"] });
    },
    [queryClient]
  );

  if (isGuest) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Bắn chữ rơi</h1>
        <p className="mt-2 text-slate-700 dark:text-slate-300">Đăng nhập để chơi và cược Bánh Mì.</p>
        <button
          type="button"
          onClick={() => router.push("/login?redirect=/arena/word-blaster")}
          className="mt-6 rounded-lg bg-amber-500 px-6 py-3 font-extrabold text-white hover:bg-amber-600"
        >
          Đăng nhập
        </button>
      </div>
    );
  }

  return (
    <>
      {game && !result && <WordBlasterGame key={game.sessionId} initial={game} onDone={(r) => done(r, game.sessionId)} />}
      {result && (
        <BlasterResultDialog
          result={result}
          onAgain={() => {
            setResult(null);
            setStarted(null);
          }}
          onExit={() => router.push("/arena")}
        />
      )}
      {!game || result ? (
        <div className="relative isolate mx-auto min-h-[calc(100dvh-2rem)] max-w-5xl overflow-hidden rounded-2xl px-4 pb-48 pt-6 sm:px-8">
          <ArenaBackdrop />
          <Link href="/arena" className="inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-3 py-1.5 text-sm font-semibold text-slate-700 backdrop-blur-sm hover:bg-white dark:bg-slate-900/70 dark:text-slate-300">
            <ArrowLeft size={16} strokeWidth={2.25} aria-hidden="true" />
            Đấu trường
          </Link>
          <section aria-labelledby="blaster-h1" className="mx-auto mt-6 max-w-lg rounded-2xl bg-white/90 p-6 shadow-sm backdrop-blur-sm dark:bg-slate-900/85 sm:p-8">
            <div className="flex items-center gap-4">
              <BreadCannon size={72} angle={-10} />
              <div>
                <h1 id="blaster-h1" className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                  Bắn chữ rơi
                </h1>
                <p className="text-sm text-slate-700 dark:text-slate-300">Gõ đáp án, Enter để bắn vỡ khối chữ trước khi nó chạm đất.</p>
              </div>
            </div>
            <ul className="mt-5 space-y-1.5 text-sm text-slate-800 dark:text-slate-200">
              <li className="flex items-center gap-2"><Crosshair size={15} strokeWidth={2.25} aria-hidden="true" /> 20 khối, rơi nhanh dần. Qua hết mà còn mạng là thắng.</li>
              <li className="flex items-center gap-2"><Heart size={15} strokeWidth={2.25} className="text-rose-600" aria-hidden="true" /> 3 mạng: mỗi khối chạm đất mất một mạng.</li>
              <li className="flex items-center gap-2"><Wheat size={15} strokeWidth={2.25} aria-hidden="true" /> Gõ lại từ, điền chữ thiếu, nghĩa → từ, từ → nghĩa (gõ không dấu cũng được).</li>
            </ul>

            <fieldset className="mt-6" disabled={starting}>
              <legend className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Mức cược
                {balance !== null && (
                  <span className="ml-2 font-normal text-slate-600 dark:text-slate-400">
                    Bạn có <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">{balance.toLocaleString("vi-VN")}</span> Bánh Mì
                  </span>
                )}
              </legend>
              <div className="mt-2 flex gap-3">
                {STAKES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={stake === s}
                    onClick={() => setStake(s)}
                    className={`flex h-16 w-16 flex-col items-center justify-center rounded-full border-2 ${
                      stake === s ? "border-amber-600 bg-amber-500 text-white" : "border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-400 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                    } ${balance !== null && balance < s ? "opacity-45" : ""}`}
                  >
                    <span className="text-lg font-extrabold tabular-nums leading-none">{s}</span>
                    <Wheat size={14} strokeWidth={2.25} className="mt-0.5" aria-hidden="true" />
                    <span className="sr-only">Bánh Mì</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <dl className="mt-4 grid grid-cols-2 divide-x divide-slate-200 rounded-lg border border-slate-200 text-center dark:divide-slate-800 dark:border-slate-800">
              <div className="px-3 py-2.5">
                <dt className="text-xs font-medium text-slate-600 dark:text-slate-400">Thắng</dt>
                <dd className="text-lg font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">+{Math.floor(stake / 2)}</dd>
                <dd className="text-xs text-slate-600 dark:text-slate-400">hoàn cược + 50%</dd>
              </div>
              <div className="px-3 py-2.5">
                <dt className="text-xs font-medium text-slate-600 dark:text-slate-400">Thua</dt>
                <dd className="text-lg font-extrabold tabular-nums text-rose-700 dark:text-rose-400">−{stake}</dd>
                <dd className="text-xs text-slate-600 dark:text-slate-400">mất cược</dd>
              </div>
            </dl>
            {error && <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-400">{error}</p>}
            <button
              type="button"
              onClick={() => void begin()}
              disabled={starting || (balance !== null && balance < stake)}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-3.5 text-base font-extrabold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Crosshair size={18} strokeWidth={2.25} aria-hidden="true" />
              {starting ? "Đang mở ván…" : "Bắt đầu"}
            </button>
            {balance !== null && balance < stake && (
              <p className="mt-2 text-center text-sm text-rose-700 dark:text-rose-400">Cần thêm {(stake - balance).toLocaleString("vi-VN")} Bánh Mì cho mức này.</p>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
