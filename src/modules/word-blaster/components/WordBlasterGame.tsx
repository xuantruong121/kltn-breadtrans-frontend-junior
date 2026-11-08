"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { wordBlasterService, type BlasterResult, type BlasterView } from "@/lib/api/services/wordBlaster.service";
import { LeaveMatchDialog } from "@/modules/arena/components/LeaveMatchDialog";
import { buzz } from "@/modules/arena/sound/arenaSound";
import { KIND_LABEL, LANDING_GRACE_MS, blockMarks, clockOffset, easeAngle, fallProgress, gameProgress, gameTime, landsAt, localState, type ClientBlock } from "../blasterLogic";
import { playBlaster } from "../blasterSound";
import { createFx, fireBullet, spawnDust, spawnExplosion, type FxState } from "../fx";
import { shotCell, stepInput } from "../typing";
import { BlasterHud, Callout } from "./BlasterHud";
import { BreadTurret, TURRET_BARREL, TURRET_BOX, TURRET_PIVOT } from "./BreadTurret";
import { FxLayer, type Aim } from "./FxLayer";
import { NightSky } from "./NightSky";
import { TypingBar } from "./TypingBar";
import { WordCard } from "./WordCard";

/** What the page alone knows at the end: the result dialog shows it beside the server's result. */
export type BlasterStats = { total: number; maxCombo: number; accuracy: number | null };

type Point = { x: number; y: number };
type Floater = { key: number; x: number; y: number; text: string; big: boolean };

/** A card's height for the fall: it lands when its bottom meets the cannon line. */
const BLOCK_H = 72;
const MemoCard = React.memo(WordCard);
/** The effects clock. Only called from handlers and effects, never while rendering. */
const clock = () => performance.now();
const wallClock = () => Date.now();

/**
 * The playing field (owner 2026-11-08: per key, after ZType, on a starry
 * night). The first key locks the cannon on a block, every accepted letter
 * fires a bullet at that letter, and the answer goes to the server by itself
 * once it has all its letters. The server decides every hit; the page only
 * draws it and keeps the combo and the key count for the result.
 */
export function WordBlasterGame({ initial, onDone }: { initial: BlasterView; onDone: (result: BlasterResult, stats: BlasterStats) => void }) {
  const reduce = Boolean(useReducedMotion());
  const [view, setView] = useState(initial);
  // Measured once on arrival, then again with every reply.
  const [firstOffset] = useState(() => clockOffset(initial.serverNow, Date.now()));
  const offset = useRef(firstOffset);
  const [t, setT] = useState(() => gameTime(Date.now(), firstOffset, initial.startedAt));
  const [typed, setTyped] = useState("");
  const [lockedId, setLockedId] = useState<number | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [combo, setCombo] = useState(0);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [inputShake, setInputShake] = useState(0);
  const [cardShake, setCardShake] = useState({ id: -1, n: 0 });
  const [flash, setFlash] = useState(0);
  const [hurt, setHurt] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [size, setSize] = useState({ w: 1024, h: 640 });
  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fxRef = useRef<FxState>(createFx());
  const aimRef = useRef<Aim>(null);
  const composing = useRef(false);
  const beforeCompose = useRef("");
  const comboRef = useRef(0);
  const maxCombo = useRef(0);
  const keys = useRef({ good: 0, bad: 0 });
  const finishing = useRef(false);
  // The cannon turns smoothly in the frame loop; the barrel and the aim line
  // both use this one angle, so the line always starts at the barrel's mouth.
  const [angle, setAngle] = useState(0);
  const targetAngle = useRef(0);
  const floatId = useRef(0);

  // Frame clock, by the server's time; it holds still for a hit-stop.
  useEffect(() => {
    let frame = 0;
    let last = clock();
    const tick = () => {
      const now = clock();
      const dt = Math.min(50, now - last);
      last = now;
      if (now >= fxRef.current.freezeUntil) setT(gameTime(Date.now(), offset.current, view.startedAt));
      setAngle((a) => (reduce ? targetAngle.current : easeAngle(a, targetAngle.current, dt)));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [view.startedAt, reduce]);

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

  // Layout: the HUD on top, the cannon and the typing bar at the bottom.
  const compact = size.w < 640 || size.h < 560;
  const top = compact ? 64 : 88;
  const barH = compact ? 76 : 92;
  const turret = compact ? 80 : 108;
  const turretTop = size.h - (barH - 4) - turret;
  const lineY = turretTop + turret * 0.42;
  const scale = turret / TURRET_BOX;
  const pivot: Point = { x: size.w / 2, y: turretTop + TURRET_PIVOT.y * scale };
  const edge = compact ? 72 : 120;
  const positionOf = useCallback(
    (b: ClientBlock, at: number): Point => ({
      x: Math.min(Math.max(b.lane * size.w, edge), size.w - edge),
      y: top + BLOCK_H / 2 + (fallProgress(b, at) ?? 0) * Math.max(40, lineY - top - BLOCK_H),
    }),
    [size.w, edge, top, lineY]
  );

  const blocks = view.blocks;
  // On screen: appeared, not broken, not past the landing grace (the server still takes a shot then).
  const onScreen = blocks.filter((b) => view.hits[b.id] === undefined && t >= b.spawnAtMs && t <= landsAt(b) + LANDING_GRACE_MS);
  const live = onScreen.filter((b) => b.id !== pendingId);
  const state = localState(blocks, view.hits, t);
  const progress = gameProgress(blocks, t);
  // The lock goes when its block does (broken or landed), and the text with it.
  const lockedBlock = lockedId === null ? null : (live.find((b) => b.id === lockedId) ?? null);
  const lockGone = lockedId !== null && !lockedBlock;
  const activeLock = lockGone ? null : lockedId;
  const text = lockGone ? "" : typed;
  const locked = lockedBlock;
  const aimed = locked ?? [...live].sort((a, b) => landsAt(a) - landsAt(b))[0] ?? null;
  const aimAt = aimed ? positionOf(aimed, t) : null;
  const aimAngle = aimAt ? Math.max(-70, Math.min(70, (Math.atan2(aimAt.x - pivot.x, pivot.y - aimAt.y) * 180) / Math.PI)) : 0;
  useEffect(() => {
    targetAngle.current = aimAngle;
  }, [aimAngle]);
  const rad = (angle * Math.PI) / 180;
  const muzzle: Point = { x: pivot.x + Math.sin(rad) * TURRET_BARREL * scale, y: pivot.y - Math.cos(rad) * TURRET_BARREL * scale };

  useEffect(() => {
    aimRef.current = locked && aimAt ? { from: muzzle, to: aimAt } : null;
  });


  /** Where a letter cell (or the whole card) is, in field pixels. */
  const pointOf = useCallback((blockId: number, cell?: number): Point | null => {
    const field = fieldRef.current;
    const el = field?.querySelector(cell === undefined ? `[data-block="${blockId}"]` : `[data-block="${blockId}"] [data-letter="${cell}"]`);
    if (!field || !el) return null;
    const f = field.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - f.left + r.width / 2, y: r.top - f.top + r.height / 2 };
  }, []);

  const float = (p: Point, text: string, big: boolean) => {
    floatId.current += 1;
    const key = floatId.current;
    setFloaters((list) => [...list, { key, x: p.x, y: p.y, text, big }]);
    window.setTimeout(() => setFloaters((list) => list.filter((f) => f.key !== key)), 950);
  };

  // A landing costs a life: dust, a hard shake, a red edge, a thud; the combo ends.
  const lastLanded = useRef(state.landed);
  useEffect(() => {
    if (state.landed > lastLanded.current) {
      const fallen = blocks
        .filter((b) => view.hits[b.id] === undefined && landsAt(b) + LANDING_GRACE_MS < t)
        .sort((a, b) => landsAt(b) - landsAt(a))[0];
      if (fallen) spawnDust(fxRef.current, Math.min(Math.max(fallen.lane * size.w, edge), size.w - edge), lineY, clock(), Math.random);
      playBlaster("lifeLost");
      buzz(140);
      setHurt((n) => n + 1);
      comboRef.current = 0;
      setCombo(0);
    }
    lastLanded.current = state.landed;
  }, [state.landed, blocks, view.hits, t, size.w, edge, lineY]);

  // The countdown before the first block, then "Tăng tốc!" past a third and two thirds.
  const first = blocks.length ? Math.min(...blocks.map((b) => b.spawnAtMs)) : 0;
  const left = first - t;
  const count = left > 2500 && left <= 3500 ? "3" : left > 1500 && left <= 2500 ? "2" : left > 500 && left <= 1500 ? "1" : left > -500 && left <= 500 ? "Bắt đầu!" : null;
  useEffect(() => {
    if (count) playBlaster(count === "Bắt đầu!" ? "go" : "count");
  }, [count]);

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
      const total = keys.current.good + keys.current.bad;
      onDone(view.result, { total: view.target, maxCombo: maxCombo.current, accuracy: total ? keys.current.good / total : null });
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
  }, [state.over, view.result, view.sessionId, view.target, onDone]);

  /** Sends an answer. The box clears at once, so the next word can start while the server answers. */
  const fire = async (text: string, targetId: number | null) => {
    const answer = text.trim();
    if (!answer || leaveOpen || view.result) return;
    setTyped("");
    setLockedId(null);
    setPendingId(targetId);
    try {
      const res = await wordBlasterService.shot(view.sessionId, answer);
      offset.current = clockOffset(res.serverNow, wallClock());
      if (res.hitBlockId !== null) {
        const hit = blocks.find((b) => b.id === res.hitBlockId);
        const p = pointOf(res.hitBlockId) ?? (hit ? positionOf(hit, t) : muzzle);
        spawnExplosion(fxRef.current, p.x, p.y, clock(), Math.random, reduce ? 0.45 : 1);
        const next = comboRef.current + 1;
        comboRef.current = next;
        maxCombo.current = Math.max(maxCombo.current, next);
        setCombo(next);
        float(p, "+1", false);
        if (next >= 2) float({ x: p.x, y: p.y - 30 }, `Combo ×${next}`, true);
        playBlaster("explode");
        if (next >= 2) playBlaster("combo", next);
      } else {
        // Wrong (a meaning mode, or a gap filled wrong): the box is clear, the lock stays.
        playBlaster("miss");
        comboRef.current = 0;
        setCombo(0);
        setInputShake((n) => n + 1);
        if (targetId !== null) {
          setCardShake((s) => ({ id: targetId, n: s.n + 1 }));
          setLockedId((current) => current ?? targetId);
        }
      }
      // The server may bring the next blocks in early after a hit (an empty field), so take its schedule too.
      setView((v) => ({ ...v, blocks: res.blocks ?? v.blocks, hits: res.hits, result: res.result ?? v.result, serverNow: res.serverNow }));
    } catch {
      playBlaster("miss");
    } finally {
      setPendingId(null);
    }
  };

  /** One change of the box: refused, or accepted with a bullet per new letter. */
  const apply = (previous: string, next: string) => {
    if (leaveOpen || view.result) return;
    const step = stepInput(live, previous, next, activeLock);
    if (!step.accepted) {
      keys.current.bad += 1;
      playBlaster("miss");
      setInputShake((n) => n + 1);
      if (activeLock !== null) setCardShake((s) => ({ id: activeLock, n: s.n + 1 }));
      return;
    }
    setTyped(step.typed);
    setLockedId(step.targetId);
    const target = step.targetId === null ? null : live.find((b) => b.id === step.targetId);
    if (step.shots > 0 && target) {
      keys.current.good += step.shots;
      const cell = shotCell(target, step.typed);
      const to = pointOf(target.id, cell) ?? positionOf(target, t);
      fireBullet(fxRef.current, muzzle, to, clock(), target.id);
      playBlaster("key", cell);
      setFlash((n) => n + 1);
    }
    if (step.complete && target) void fire(step.typed, target.id);
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

  const callout = count ?? banner;

  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-[#060A18]">
      <div
        ref={fieldRef}
        className="absolute inset-0 isolate overflow-hidden will-change-transform"
        onPointerUp={() => {
          if (!leaveOpen) inputRef.current?.focus();
        }}
      >
        <NightSky progress={progress} reduce={reduce} />

        {/* the cannon line */}
        <div className="pointer-events-none absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-300/50 to-transparent" style={{ top: lineY }} aria-hidden="true" />

        {onScreen.map((b) => {
          const p = positionOf(b, t);
          const sway = reduce ? 0 : Math.sin(t / 650 + b.id * 1.7) * 1.8;
          return (
            <div
              key={b.id}
              className="absolute z-10"
              style={{ left: p.x, top: p.y, transform: `translate(-50%, -50%) rotate(${sway.toFixed(2)}deg)` }}
            >
              <MemoCard
                block={b}
                typed={b.id === activeLock ? text : ""}
                locked={b.id === activeLock}
                danger={(fallProgress(b, t) ?? 0) > 0.75}
                reduce={reduce}
                shakeKey={cardShake.id === b.id ? cardShake.n : 0}
              />
            </div>
          );
        })}

        <div className="absolute z-10 -translate-x-1/2" style={{ left: size.w / 2, top: turretTop }}>
          <BreadTurret angle={angle} size={turret} flash={flash} reduce={reduce} />
        </div>

        <FxLayer fx={fxRef} aim={aimRef} shakeRef={fieldRef} reduce={reduce} />

        <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
          <AnimatePresence>
            {floaters.map((f) => (
              <motion.p
                key={f.key}
                initial={{ opacity: 0, y: 0, scale: 0.6 }}
                animate={{ opacity: [0, 1, 1, 0], y: reduce ? 0 : -54, scale: 1 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-black ${
                  f.big ? "text-xl text-orange-300 [text-shadow:0_0_18px_rgba(251,146,60,0.7)]" : "text-2xl text-amber-200 [text-shadow:0_0_16px_rgba(251,191,36,0.8)]"
                }`}
                style={{ left: f.x, top: f.y }}
              >
                {f.text}
              </motion.p>
            ))}
          </AnimatePresence>
          <AnimatePresence>
            {hurt > 0 && (
              <motion.div
                key={`hurt-${hurt}`}
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.75 }}
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(225,29,72,0.7)_100%)]"
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <BlasterHud
        lives={view.lives}
        livesLeft={state.livesLeft}
        total={view.target}
        destroyed={state.destroyed}
        landed={state.landed}
        marks={blockMarks(blocks, view.hits, t)}
        combo={combo}
        modeLabel={view.mode ? KIND_LABEL[view.mode] : null}
        stake={view.stake}
        reduce={reduce}
        onLeave={() => setLeaveOpen(true)}
      />

      <Callout text={callout} tone={count ? (count === "Bắt đầu!" ? "go" : "count") : "speed"} reduce={reduce} />

      <TypingBar
        inputRef={inputRef}
        value={text}
        lockedPrompt={locked ? locked.prompt : null}
        disabled={Boolean(view.result)}
        shakeKey={inputShake}
        reduce={reduce}
        compact={compact}
        onChange={(next) => {
          if (composing.current) setTyped(next);
          else apply(text, next);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            setTyped("");
            setLockedId(null);
          }
        }}
        onCompositionStart={() => {
          composing.current = true;
          beforeCompose.current = text;
        }}
        onCompositionEnd={(value) => {
          composing.current = false;
          apply(beforeCompose.current, value);
        }}
        onFire={() => void fire(text, activeLock)}
      />

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
