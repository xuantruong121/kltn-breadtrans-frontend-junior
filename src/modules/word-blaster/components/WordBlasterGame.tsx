"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Crosshair, Heart, LogOut } from "lucide-react";
import { wordBlasterService, type BlasterResult, type BlasterView } from "@/lib/api/services/wordBlaster.service";
import { ArenaBackdrop } from "@/modules/arena/components/ArenaBackdrop";
import { LeaveMatchDialog } from "@/modules/arena/components/LeaveMatchDialog";
import { SoundToggle } from "@/modules/arena/components/SoundToggle";
import { buzz } from "@/modules/arena/sound/arenaSound";
import { BreadCannon } from "./BreadCannon";
import { KIND_LABEL, aimTarget, clockOffset, fallProgress, gameProgress, gameTime, liveBlocks, localState, type ClientBlock } from "../blasterLogic";
import { playBlaster } from "../blasterSound";

const KIND_TONE: Record<ClientBlock["kind"], string> = {
  copy: "border-sky-400 bg-sky-50 text-sky-950 dark:bg-sky-950/80 dark:text-sky-100",
  missing: "border-amber-400 bg-amber-50 text-amber-950 dark:bg-amber-950/80 dark:text-amber-100",
  vi_to_en: "border-emerald-400 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/80 dark:text-emerald-100",
  en_to_vi: "border-orange-400 bg-orange-50 text-orange-950 dark:bg-orange-950/80 dark:text-orange-100",
};
const CANNON_ZONE = 112; // px under the cannon line: the cannon and the ground
const BLOCK_H = 64;

type Burst = { key: number; x: number; y: number };

/** The playing field: falling blocks, the bread cannon, the answer box, lives. */
export function WordBlasterGame({ initial, onDone }: { initial: BlasterView; onDone: (result: BlasterResult) => void }) {
  const reduce = Boolean(useReducedMotion());
  const [view, setView] = useState(initial);
  // Measured once on arrival, then again with every reply.
  const [firstOffset] = useState(() => clockOffset(initial.serverNow, Date.now()));
  const offset = useRef(firstOffset);
  const [t, setT] = useState(() => gameTime(Date.now(), firstOffset, initial.startedAt));
  const [typed, setTyped] = useState("");
  const [shake, setShake] = useState(0);
  const [recoil, setRecoil] = useState(0);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [beam, setBeam] = useState<Burst | null>(null);
  const [hurt, setHurt] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [size, setSize] = useState({ w: 800, h: 560 });
  const finishing = useRef(false);

  // Frame clock, by the server's time.
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      setT(gameTime(Date.now(), offset.current, view.startedAt));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [view.startedAt]);

  useEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => inputRef.current?.focus(), []);

  const blocks = view.blocks;
  const live = liveBlocks(blocks, view.hits, t);
  const state = localState(blocks, view.hits, t);
  const lineY = size.h - CANNON_ZONE;
  const cannonX = size.w / 2;
  const positionOf = useCallback(
    (b: ClientBlock, at: number) => ({ x: b.lane * size.w, y: (fallProgress(b, at) ?? 0) * (lineY - BLOCK_H) + BLOCK_H / 2 }),
    [size.w, lineY]
  );
  const target = aimTarget(live, typed);
  const aim = target ? positionOf(target, t) : null;
  const angle = aim ? Math.max(-65, Math.min(65, (Math.atan2(aim.x - cannonX, size.h - 70 - aim.y) * 180) / Math.PI)) : 0;

  // A landing costs a life: sound, a red flash and a shake.
  const lastLanded = useRef(state.landed);
  useEffect(() => {
    if (state.landed > lastLanded.current) {
      playBlaster("lifeLost");
      buzz(120);
      setHurt((n) => n + 1);
      setShake((n) => n + 1);
    }
    lastLanded.current = state.landed;
  }, [state.landed]);

  // The game speeds up past a third and two thirds.
  const progress = gameProgress(blocks, t);
  const stage = progress >= 0.7 ? 2 : progress >= 0.35 ? 1 : 0;
  const lastStage = useRef(stage);
  useEffect(() => {
    if (stage > lastStage.current) {
      playBlaster("speedUp");
      setBanner(stage === 1 ? "Tăng tốc!" : "Tăng tốc lần nữa!");
      const id = window.setTimeout(() => setBanner(null), 1400);
      lastStage.current = stage;
      return () => window.clearTimeout(id);
    }
    lastStage.current = stage;
  }, [stage]);

  // The game is over here: the server checks and settles it.
  useEffect(() => {
    if (view.result) {
      onDone(view.result);
      return;
    }
    if (!state.over || finishing.current) return;
    finishing.current = true;
    let retry = 0;
    const ask = async () => {
      try {
        const next = await wordBlasterService.finish(view.sessionId);
        if (next.result) setView(next);
        else if (retry++ < 5) window.setTimeout(ask, 500);
      } catch {
        if (retry++ < 5) window.setTimeout(ask, 800);
      }
    };
    void ask();
  }, [state.over, view.result, view.sessionId, onDone]);

  const fire = async () => {
    const text = typed.trim();
    if (!text || leaveOpen || view.result) return;
    playBlaster("shoot");
    setRecoil(6);
    window.setTimeout(() => setRecoil(0), 90);
    try {
      const res = await wordBlasterService.shot(view.sessionId, text);
      offset.current = clockOffset(res.serverNow, Date.now());
      const hit = res.hitBlockId !== null ? blocks.find((b) => b.id === res.hitBlockId) : null;
      if (hit) {
        const at = gameTime(Date.now(), offset.current, view.startedAt);
        const p = positionOf(hit, at);
        const key = Date.now();
        setBeam({ key, ...p });
        setBursts((list) => [...list, { key, ...p }]);
        window.setTimeout(() => setBursts((list) => list.filter((b) => b.key !== key)), 700);
        window.setTimeout(() => setBeam(null), 160);
        playBlaster("explode");
        setTyped("");
      } else {
        playBlaster("miss");
        setShake((n) => n + 1);
        inputRef.current?.select();
      }
      setView((v) => ({ ...v, hits: res.hits, result: res.result ?? v.result, serverNow: res.serverNow }));
    } catch {
      playBlaster("miss");
    }
  };

  const leave = async () => {
    setLeaving(true);
    try {
      const res = await wordBlasterService.finish(view.sessionId, true);
      if (res.result) setView(res);
    } finally {
      setLeaving(false);
      setLeaveOpen(false);
    }
  };

  const dusk = Math.min(0.35, progress * 0.35);
  const hearts = useMemo(() => Array.from({ length: view.lives }, (_, i) => i < state.livesLeft), [view.lives, state.livesLeft]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-amber-50 dark:bg-slate-950">
      {/* HUD */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-3 py-2 sm:px-6 sm:py-3">
        <div className="flex items-center gap-1" aria-label={`Còn ${state.livesLeft} mạng`}>
          {hearts.map((on, i) => (
            <motion.span key={i} animate={!on && !reduce ? { scale: [1, 1.4, 1] } : undefined}>
              <Heart size={24} strokeWidth={2.25} className={on ? "fill-rose-500 text-rose-600" : "text-slate-400"} aria-hidden="true" />
            </motion.span>
          ))}
        </div>
        <p className="whitespace-nowrap rounded-lg bg-white/85 px-3 py-1.5 text-sm font-bold tabular-nums text-slate-800 backdrop-blur-sm dark:bg-slate-900/80 dark:text-slate-200">
          <Crosshair size={14} strokeWidth={2.5} className="mr-1 inline-block align-[-2px]" aria-hidden="true" />
          {state.destroyed + state.landed}/{view.target} khối
          <span className="hidden sm:inline"> · cược {view.stake}</span>
        </p>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-white/85 backdrop-blur-sm dark:bg-slate-900/80">
            <SoundToggle />
          </div>
          <button
            type="button"
            onClick={() => setLeaveOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/85 px-3 py-2 text-sm font-semibold text-slate-700 backdrop-blur-sm hover:bg-rose-50 hover:text-rose-700 dark:bg-slate-900/80 dark:text-slate-300"
          >
            <LogOut size={16} strokeWidth={2.25} aria-hidden="true" />
            Thoát
          </button>
        </div>
      </div>

      {/* Field */}
      <motion.div
        ref={fieldRef}
        key={`field-${shake}`}
        animate={reduce || shake === 0 ? undefined : { x: [0, -10, 8, -5, 3, 0] }}
        transition={{ duration: 0.35 }}
        className="relative isolate mx-2 flex-1 overflow-hidden rounded-2xl sm:mx-6"
      >
        <ArenaBackdrop />
        {/* sunset as the game speeds up */}
        <div
          className="pointer-events-none absolute inset-0 -z-[5] bg-gradient-to-b from-orange-400 via-amber-300 to-transparent transition-opacity duration-1000"
          style={{ opacity: dusk }}
          aria-hidden="true"
        />
        <AnimatePresence>
          {hurt > 0 && (
            <motion.div
              key={`hurt-${hurt}`}
              initial={{ opacity: 0.45 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="pointer-events-none absolute inset-0 z-20 bg-rose-500"
              aria-hidden="true"
            />
          )}
        </AnimatePresence>

        {/* cannon line */}
        <div className="absolute inset-x-0 border-t-2 border-dashed border-rose-400/70" style={{ top: lineY }} aria-hidden="true" />

        {live.map((b) => {
          const p = positionOf(b, t);
          const danger = (fallProgress(b, t) ?? 0) > 0.75;
          const aimed = target?.id === b.id;
          return (
            <div
              key={b.id}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: Math.min(Math.max(p.x, 80), size.w - 80), top: p.y }}
            >
              <div
                className={`max-w-[44vw] rounded-xl border-2 px-3 py-2 text-center shadow-md sm:max-w-xs ${KIND_TONE[b.kind]} ${aimed ? "ring-4 ring-sky-400/70" : ""} ${danger && !reduce ? "animate-pulse border-rose-500" : ""}`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{KIND_LABEL[b.kind]}</p>
                <p className="break-words text-base font-extrabold leading-tight sm:text-lg">{b.prompt}</p>
              </div>
            </div>
          );
        })}

        {/* beam and bursts */}
        <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" aria-hidden="true">
          {beam && <line x1={cannonX} y1={size.h - 78} x2={beam.x} y2={beam.y} stroke="#F59E0B" strokeWidth="5" strokeLinecap="round" />}
        </svg>
        {bursts.map((b) => (
          <div key={b.key} className="pointer-events-none absolute z-20" style={{ left: b.x, top: b.y }} aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => {
              const a = (i / 10) * Math.PI * 2;
              return (
                <motion.span
                  key={i}
                  className={`absolute h-2.5 w-2.5 rounded-full ${i % 3 === 0 ? "bg-amber-300" : i % 3 === 1 ? "bg-orange-500" : "bg-amber-700"}`}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: Math.cos(a) * 60, y: Math.sin(a) * 60 + 20, opacity: 0, scale: 0.4 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              );
            })}
          </div>
        ))}

        <AnimatePresence>
          {banner && (
            <motion.p
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute left-1/2 top-1/3 z-20 -translate-x-1/2 rounded-xl bg-amber-500 px-5 py-2 text-xl font-extrabold text-white shadow-lg"
            >
              {banner}
            </motion.p>
          )}
        </AnimatePresence>

        {/* the cannon */}
        <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
          <BreadCannon angle={angle} recoil={recoil} size={92} />
        </div>
      </motion.div>

      {/* Answer box */}
      <form
        className="relative z-10 mx-auto flex w-full max-w-xl gap-2 px-3 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          void fire();
        }}
      >
        <motion.input
          ref={inputRef}
          key={`input-${shake}`}
          animate={reduce || shake === 0 ? undefined : { x: [0, -8, 8, -4, 0] }}
          transition={{ duration: 0.3 }}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={Boolean(view.result)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Gõ đáp án rồi nhấn Enter để bắn"
          placeholder="Gõ đáp án, Enter để bắn"
          className="min-w-0 flex-1 rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 font-extrabold text-white hover:bg-amber-600">
          <Crosshair size={18} strokeWidth={2.5} aria-hidden="true" />
          Bắn
        </button>
      </form>

      {leaveOpen && (
        <LeaveMatchDialog
          stake={view.stake}
          title="Thoát ván chơi?"
          message={`Ván sẽ kết thúc ngay và bạn mất ${view.stake} Bánh Mì đã cược.`}
          pending={leaving}
          onStay={() => {
            setLeaveOpen(false);
            inputRef.current?.focus();
          }}
          onLeave={() => void leave()}
        />
      )}
    </div>
  );
}
