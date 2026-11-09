"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { BookOpen, CalendarDays, Crown, DoorOpen, Footprints, Heart, Shuffle, Trophy, Wheat } from "lucide-react";
import { dungeonService, type DungeonMode } from "@/lib/api/services/dungeon.service";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { arenaSound } from "@/modules/arena/sound/arenaSound";
import { useAuthStore } from "@/stores/authStore";
import { Monster } from "./Monster";
import { DungeonStory } from "./DungeonStory";
import { STORY_SEEN_KEY } from "../dungeonStory";

const TICKET = 20;

/** Hầm Bánh Mì's lobby on /arena: the rules, the two dungeons, today's board, a glimpse of the cellar. */
export function DungeonLobby({ balance, isGuest, onGuest }: { balance: number | null; isGuest: boolean; onGuest: () => void }) {
  const router = useRouter();
  const reduce = Boolean(useReducedMotion());
  const { user } = useAuthStore();
  const [starting, setStarting] = useState<DungeonMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: board } = useQuery({
    queryKey: ["dungeon-board", user?.id],
    queryFn: dungeonService.board,
    enabled: !isGuest,
    staleTime: 30_000,
  });
  const short = !isGuest && balance !== null && balance < TICKET;

  // The opening story: before the very first run, and whenever asked for again.
  const [story, setStory] = useState<{ then: DungeonMode | null } | null>(null);
  const storySeen = () => {
    try {
      return window.localStorage.getItem(STORY_SEEN_KEY) === "1";
    } catch {
      return true;
    }
  };
  const closeStory = () => {
    const then = story?.then ?? null;
    setStory(null);
    try {
      window.localStorage.setItem(STORY_SEEN_KEY, "1");
    } catch {
      /* storage blocked */
    }
    if (then) void enter(then);
  };

  const begin = (mode: DungeonMode) => {
    if (isGuest) return onGuest();
    arenaSound.unlock();
    if (!storySeen()) setStory({ then: mode });
    else void enter(mode);
  };

  const enter = async (mode: DungeonMode) => {
    setError(null);
    setStarting(mode);
    arenaSound.unlock();
    try {
      await dungeonService.start(mode);
      router.push("/arena/dungeon");
    } catch (e) {
      setError(getApiErrorMessage(e, "Không vào được hầm. Vui lòng thử lại."));
      setStarting(null);
    }
  };

  const played = board?.me.playedToday ?? false;
  return (
    <section aria-labelledby="dungeon-title" className="glass-face grid h-full gap-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6 md:grid-cols-[1.05fr_1fr]">
      <div className="flex flex-col">
        <h1 id="dungeon-title" className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Hầm Bánh Mì
        </h1>
        <p className="mt-2 max-w-md text-base text-slate-700 dark:text-slate-300">
          Xuống từng tầng hầm lò bánh và đánh quái bằng từ vựng. Trả lời đúng và nhanh thì đòn mạnh, sai thì bị đánh lại. Qua mỗi tầng chọn một topping tăng sức mạnh; hết máu là kết thúc lượt.
        </p>
        <ul className="mt-4 space-y-1.5 text-sm text-slate-800 dark:text-slate-200">
          <li className="flex items-center gap-2"><Crown size={15} strokeWidth={2.25} aria-hidden="true" /> Mỗi 5 tầng có boss: gõ từ tiếng Anh theo nghĩa để hạ.</li>
          <li className="flex items-center gap-2"><Heart size={15} strokeWidth={2.25} className="text-rose-600" aria-hidden="true" /> 100 máu; từ trả lời sai sẽ quay lại vài câu sau.</li>
          <li className="flex items-center gap-2"><Wheat size={15} strokeWidth={2.25} aria-hidden="true" /> Vé {TICKET} Bánh Mì. Hạ boss tầng 5 thì hoàn vé, mỗi boss thêm 10.</li>
        </ul>
        <button
          type="button"
          onClick={() => setStory({ then: null })}
          className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/40"
        >
          <BookOpen size={15} strokeWidth={2.25} aria-hidden="true" />
          Xem lại cốt truyện
        </button>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col rounded-xl border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
            <p className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
              <CalendarDays size={16} strokeWidth={2.25} aria-hidden="true" />
              Hầm hôm nay
            </p>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">Cùng một hầm cho mọi người, một lượt mỗi ngày, có xếp hạng.</p>
            {played && board?.me.dailyFloor != null && (
              <p className="mt-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
                Hôm nay bạn tới tầng {board.me.dailyFloor}
                {board.me.dailyRank ? ` · hạng ${board.me.dailyRank}` : ""}
              </p>
            )}
            <button
              type="button"
              onClick={() => void begin("daily")}
              disabled={starting !== null || short || played}
              aria-label="Vào Hầm hôm nay"
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-extrabold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <DoorOpen size={17} strokeWidth={2.25} aria-hidden="true" />
              {isGuest ? "Đăng nhập để chơi" : played ? "Mai quay lại" : starting === "daily" ? "Đang mở hầm…" : "Vào hầm"}
            </button>
          </div>
          <div className="flex flex-col rounded-xl border-2 border-slate-200 p-4 dark:border-slate-700">
            <p className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
              <Shuffle size={16} strokeWidth={2.25} aria-hidden="true" />
              Hầm tự do
            </p>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">Hầm ngẫu nhiên, chơi bao nhiêu lượt cũng được.</p>
            {board?.me.bestFree != null && (
              <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Kỷ lục của bạn: tầng {board.me.bestFree}</p>
            )}
            <button
              type="button"
              onClick={() => void begin("free")}
              disabled={starting !== null || short}
              aria-label="Vào Hầm tự do"
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border-2 border-amber-500 px-4 py-2 font-extrabold text-amber-700 transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-300 dark:hover:bg-amber-950/40"
            >
              <Footprints size={17} strokeWidth={2.25} aria-hidden="true" />
              {isGuest ? "Đăng nhập để chơi" : starting === "free" ? "Đang mở hầm…" : "Vào hầm"}
            </button>
          </div>
        </div>
        {short && <p className="mt-3 text-sm text-rose-700 dark:text-rose-400">Cần {TICKET} Bánh Mì cho một vé vào hầm.</p>}
        {error && (
          <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-400">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative flex min-h-[220px] items-end justify-center overflow-hidden rounded-xl bg-[#2a1712]" aria-hidden="true">
          <div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='32'%3E%3Cpath d='M0 1H64M0 17H64M1 0V16M33 16V32' stroke='%23231310' stroke-width='2'/%3E%3C/svg%3E\")",
              backgroundColor: "#3a2219",
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_110%,rgba(251,146,60,0.45),transparent_60%)]" />
          <motion.div className="relative mb-2 flex items-end gap-2" animate={reduce ? undefined : { y: [0, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity }}>
            <Monster kind="moldy" floor={1} hitKey={0} dead={false} reduce size={110} />
            <Monster kind="sourdough_king" floor={5} hitKey={0} dead={false} reduce size={150} />
            <Monster kind="mouse" floor={2} hitKey={0} dead={false} reduce size={100} />
          </motion.div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">
            <Trophy size={15} strokeWidth={2.25} className="text-amber-600" aria-hidden="true" />
            Xếp hạng Hầm hôm nay
            {board && <span className="font-normal text-slate-600 dark:text-slate-400">· {board.players} người chơi</span>}
          </p>
          {board && board.entries.length > 0 ? (
            <ol className="mt-2 space-y-1">
              {board.entries.slice(0, 5).map((e) => (
                <li key={e.userId} className={`flex items-center justify-between rounded-lg px-2 py-1 text-sm ${e.userId === user?.id ? "bg-amber-50 font-bold dark:bg-amber-950/40" : ""}`}>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-5 text-right font-bold tabular-nums text-slate-600 dark:text-slate-400">{e.rank}</span>
                    <span className="truncate text-slate-800 dark:text-slate-200">{e.displayName}</span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-900 dark:text-slate-100">Tầng {e.floor}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{isGuest ? "Đăng nhập để xem bảng xếp hạng." : "Chưa ai vào hầm hôm nay. Bạn có thể là người đầu tiên."}</p>
          )}
        </div>
      </div>
      {story && <DungeonStory onDone={closeStory} finalLabel={story.then ? "Xuống hầm" : "Đóng"} />}
    </section>
  );
}
