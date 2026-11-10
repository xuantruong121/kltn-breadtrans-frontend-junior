"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { dungeonService, type DungeonOutcome, type DungeonQuestion, type DungeonResult, type DungeonView, type ToppingId } from "@/lib/api/services/dungeon.service";
import { LeaveMatchDialog } from "@/modules/arena/components/LeaveMatchDialog";
import { buzz } from "@/modules/arena/sound/arenaSound";
import { playBlaster } from "@/modules/word-blaster/blasterSound";
import { createFx, shake, spawnExplosion, spawnSparks, type FxState } from "@/modules/word-blaster/fx";
import { FxLayer, type Aim } from "@/modules/word-blaster/components/FxLayer";
import { clockAt, clockOffset } from "../dungeonLogic";
import { monsterLine, saysOnHit } from "../dungeonStory";
import { overlayArea, stageMode, type Rect } from "../stageLayout";
import { FloorMap } from "./FloorMap";
import { BossTyping } from "./BossTyping";
import { DungeonHud, MonsterPlate } from "./DungeonHud";
import { DungeonScene } from "./DungeonScene";
import { Monster } from "./Monster";
import { QuestionPanel } from "./QuestionPanel";
import { ToppingChoice } from "./ToppingChoice";

type Floater = { key: number; text: string; tone: "hit" | "crit" | "hurt" | "info"; side: "monster" | "me" };
/** What the monster says, shown from `from` until `until` (server time). */
type Speech = { key: number; text: string; from: number; until: number };
/** The floor map hides this long before the first question, so the monster can greet first. */
const GREET_MS = 1300;
/** The question just answered, kept on screen with its outcome until the next one starts. */
type Shown = { question: DungeonQuestion; picked: number | null; typed: string; outcome: DungeonOutcome };

const now = () => Date.now();
const KILL_REVEAL_MS = 900;
const DEATH_REVEAL_MS = 1400;

/**
 * Hầm Bánh Mì's playing screen (owner 2026-11-09). The server keeps the
 * answers and the clock; each reply carries the outcome of the last answer
 * and the next question, whose clock starts only after the page has shown
 * that outcome.
 */
export function DungeonGame({ initial, onDone }: { initial: DungeonView; onDone: (result: DungeonResult) => void }) {
  const reduce = Boolean(useReducedMotion());
  const [view, setView] = useState(initial);
  const [offset, setOffset] = useState(() => clockOffset(initial.serverNow, now()));
  const [tick, setTick] = useState(() => now());
  const [pending, setPending] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [kept, setShown] = useState<Shown | null>(null);
  const [hitKey, setHitKey] = useState(0);
  const [hurt, setHurt] = useState(0);
  const [typeShake, setTypeShake] = useState(0);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [dying, setDying] = useState(false);
  // The floor reached through a topping: its map was on the topping screen, so it is not shown again.
  const [pickedInto, setPickedInto] = useState<number | null>(null);
  // The first monster greets as the map gives way to it.
  const [speech, setSpeech] = useState<Speech | null>(() =>
    initial.questionStartsAt !== null && initial.phase === "fight"
      ? {
          key: 1,
          text: monsterLine(initial.monster.kind, initial.floor, "appear"),
          from: initial.questionStartsAt - GREET_MS,
          until: initial.questionStartsAt + 1800,
        }
      : null
  );
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const monsterRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<FxState>(createFx());
  const aimRef = useRef<Aim>(null);
  const floatId = useRef(0);
  const timedOutFor = useRef<number | null>(null);

  // The HUD's height and where the answers sit, for the layout and the
  // topping list (owner 2026-11-10: phones cut the answers off).
  const [stage, setStage] = useState<{ w: number; h: number; hudBottom: number; answers: Rect | null }>({
    w: 1366,
    h: 900,
    hudBottom: 96,
    answers: null,
  });
  useEffect(() => {
    const measure = () => {
      const hud = document.querySelector("[data-dungeon-hud]")?.getBoundingClientRect();
      const ans = document.querySelector("[data-dungeon-answers]")?.getBoundingClientRect();
      const next = {
        w: window.innerWidth,
        h: window.innerHeight,
        hudBottom: hud ? Math.round(hud.bottom) : 96,
        answers: ans ? { top: Math.round(ans.top), left: Math.round(ans.left), right: Math.round(ans.right), bottom: Math.round(ans.bottom) } : null,
      };
      setStage((s) => (JSON.stringify(s) === JSON.stringify(next) ? s : next));
    };
    const first = window.requestAnimationFrame(measure);
    const id = window.setInterval(measure, 250);
    window.addEventListener("resize", measure);
    return () => {
      window.cancelAnimationFrame(first);
      window.clearInterval(id);
      window.removeEventListener("resize", measure);
    };
  }, []);
  const mode = stageMode(stage.w, stage.h);
  const area = overlayArea(stage.w, stage.h, stage.hudBottom, stage.answers);

  // A tenth of a second is enough for the clock bar.
  useEffect(() => {
    const id = window.setInterval(() => setTick(now()), 100);
    return () => window.clearInterval(id);
  }, []);

  const serverNow = tick + offset;
  const clock = clockAt(view.questionStartsAt, view.questionDeadline, serverNow);
  // The outcome stays on screen until the next question's clock starts.
  const shown =
    kept && (view.phase !== "fight" || view.questionStartsAt === null || serverNow < view.questionStartsAt) ? kept : null;
  const revealing = shown !== null && view.phase === "fight";

  // Floor intros: the floor's name, and a horn for a boss.
  const floorKey = `${view.floor}`;
  const lastFloor = useRef<string | null>(null);
  useEffect(() => {
    if (lastFloor.current === floorKey) return;
    lastFloor.current = floorKey;
    playBlaster(view.monster.boss ? "go" : "count");
  }, [floorKey, view.monster.boss]);
  const intro = view.phase === "fight" && !shown && view.questionStartsAt !== null && serverNow < view.questionStartsAt;
  // A floor opens on its map; the last stretch before the clock belongs to the monster's greeting.
  const mapShowing =
    intro && view.floor !== pickedInto && view.questionStartsAt !== null && view.questionStartsAt - serverNow > GREET_MS;
  const saying = speech && !mapShowing && serverNow >= speech.from && serverNow < speech.until ? speech : null;

  const float = useCallback((text: string, tone: Floater["tone"], side: Floater["side"]) => {
    floatId.current += 1;
    const key = floatId.current;
    setFloaters((list) => [...list, { key, text, tone, side }]);
    window.setTimeout(() => setFloaters((list) => list.filter((f) => f.key !== key)), 1100);
  }, []);

  const monsterPoint = () => {
    const field = fieldRef.current?.getBoundingClientRect();
    const box = monsterRef.current?.getBoundingClientRect();
    if (!field || !box) return { x: 0, y: 0 };
    return { x: box.left - field.left + box.width / 2, y: box.top - field.top + box.height / 2 };
  };

  /** Shows what a reply says happened, then takes its state. */
  const take = useCallback(
    (res: DungeonView, asked: DungeonQuestion | null, choice: number | null, text: string) => {
      setOffset(clockOffset(res.serverNow, now()));
      const o = res.last;
      if (o && asked) {
        const at = monsterPoint();
        const t = performance.now();
        if (o.right) {
          setHitKey((k) => k + 1);
          spawnSparks(fxRef.current, at.x, at.y, Math.random, reduce ? 0.5 : 1.5);
          float(o.crit ? `Chí mạng −${o.damage}` : `−${o.damage}`, o.crit ? "crit" : "hit", "monster");
          playBlaster("shoot");
          if (res.combo >= 2) playBlaster("combo", res.combo);
          if (o.killed)
            setSpeech((p) => ({ key: (p?.key ?? 0) + 1, text: monsterLine(res.monster.kind, res.floor, "defeat"), from: res.serverNow, until: res.serverNow + 1400 }));
          else if (saysOnHit(res.stats.answered))
            setSpeech((p) => ({ key: (p?.key ?? 0) + 1, text: monsterLine(res.monster.kind, res.floor, "hit", res.stats.answered), from: res.serverNow, until: res.serverNow + 1600 }));
          if (o.killed) {
            spawnExplosion(fxRef.current, at.x, at.y, t, Math.random, reduce ? 0.5 : res.monster.boss ? 1.8 : 1.2);
            playBlaster("explode");
            setDying(true);
            window.setTimeout(() => setDying(false), KILL_REVEAL_MS);
          }
        } else {
          if (o.shielded) {
            float("Phô mai chặn đòn", "info", "me");
            playBlaster("miss");
          } else {
            setHurt((n) => n + 1);
            shake(fxRef.current, t, 9, 260);
            float(o.timedOut ? `Hết giờ −${o.taken}` : `−${o.taken}`, "hurt", "me");
            playBlaster("lifeLost");
            buzz(120);
          }
          if (o.revived) float("Trứng ốp la: hồi sinh", "info", "me");
          if (asked.type === "typed") setTypeShake((n) => n + 1);
        }
        setShown({ question: asked, picked: choice, typed: text, outcome: o });
        // The shown outcome keeps what was picked or typed; the inputs start clean.
        setPicked(null);
        setTyped("");
        if (o.killed) window.setTimeout(() => setShown(null), KILL_REVEAL_MS);
      }
      if (res.result) {
        const result = res.result;
        window.setTimeout(() => onDone(result), o?.died ? DEATH_REVEAL_MS : 300);
      }
      setView(res);
    },
    [float, onDone, reduce]
  );

  const answer = async (body: { choice?: number; text?: string }) => {
    if (pending || view.phase !== "fight" || !view.question || leaveOpen) return;
    const asked = view.question;
    setPending(true);
    if (typeof body.choice === "number") setPicked(body.choice);
    try {
      const res = await dungeonService.answer(view.sessionId, body);
      take(res, asked, body.choice ?? null, body.text ?? "");
    } catch {
      playBlaster("miss");
    } finally {
      setPending(false);
    }
  };

  // The clock ran out: tell the server once (it judges the time itself anyway).
  useEffect(() => {
    if (!clock.out || pending || shown || view.phase !== "fight" || view.questionStartsAt === null) return;
    if (timedOutFor.current === view.questionStartsAt) return;
    timedOutFor.current = view.questionStartsAt;
    void answer({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clock.out, pending, shown, view.phase, view.questionStartsAt]);

  const pick = async (id: ToppingId) => {
    if (pending) return;
    setPending(true);
    try {
      const res = await dungeonService.pick(view.sessionId, id);
      playBlaster("speedUp");
      setPickedInto(res.floor);
      if (res.questionStartsAt !== null)
        setSpeech((p) => ({
          key: (p?.key ?? 0) + 1,
          text: monsterLine(res.monster.kind, res.floor, "appear"),
          from: res.questionStartsAt! - GREET_MS,
          until: res.questionStartsAt! + 1800,
        }));
      setShown(null);
      setPicked(null);
      setTyped("");
      take(res, null, null, "");
    } finally {
      setPending(false);
    }
  };

  const leave = async () => {
    setLeaving(true);
    try {
      const res = await dungeonService.finish(view.sessionId, true);
      if (res.result) onDone(res.result);
    } finally {
      setLeaving(false);
      setLeaveOpen(false);
    }
  };

  const question = shown?.question ?? view.question;
  const choosing = view.phase === "pick" && !shown;
  const monsterSize = mode.monsterSize;
  const sideBySide = mode.landscape && !choosing;

  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-[#1a100c] text-white">
      <div ref={fieldRef} className="absolute inset-0 isolate flex flex-col overflow-hidden">
        <DungeonScene boss={view.monster.boss} reduce={reduce} />

        {/* Scrolls only when a screen is too short for its content; short screens are laid out to fit first. */}
        <div className="relative flex-1 overflow-y-auto overscroll-contain" data-dungeon-scroll>
        <div
          className={`mx-auto flex min-h-full w-full max-w-5xl items-center justify-center px-3 pb-4 ${sideBySide ? "flex-row gap-5" : "flex-col"} ${mode.compact ? "gap-2" : "gap-3"}`}
          style={{ paddingTop: stage.hudBottom + 8 }}
        >
          {!choosing && (
            <div className={`flex shrink-0 flex-col items-center ${mode.compact ? "gap-2" : "gap-3"}`}>
              <MonsterPlate view={view} />
              <div ref={monsterRef} className="relative">
                <AnimatePresence>
                  {saying && (
                    // Beside the monster on a tall screen, kept inside the screen's width;
                    // above it when the question sits beside the monster (a phone on its side),
                    // so the words never cover an answer.
                    <div
                      key={saying.key}
                      className={`pointer-events-none absolute z-10 ${sideBySide ? "bottom-full left-1/2 mb-1 flex w-60 -translate-x-1/2 justify-center" : "-top-4 left-[78%]"}`}
                    >
                      <motion.p
                        role="status"
                        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 380, damping: 22 }}
                        style={sideBySide ? undefined : { maxWidth: `min(15rem, max(7rem, calc(50vw - ${Math.round(0.28 * monsterSize + 12)}px)))` }}
                        className={`w-max rounded-2xl bg-amber-50 px-3 py-2 text-sm font-bold leading-snug text-amber-950 shadow-lg ${sideBySide ? "max-w-60 origin-bottom text-center" : "origin-bottom-left rounded-bl-sm"}`}
                      >
                        {saying.text}
                      </motion.p>
                    </div>
                  )}
                </AnimatePresence>
                <Monster kind={view.monster.kind} floor={view.floor} hitKey={hitKey} dead={dying || (view.phase === "pick" && !shown)} reduce={reduce} size={monsterSize} />
                <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                  <AnimatePresence>
                    {floaters
                      .filter((f) => f.side === "monster")
                      .map((f) => (
                        <motion.p
                          key={f.key}
                          initial={{ opacity: 0, y: 0, scale: 0.7 }}
                          animate={{ opacity: [0, 1, 1, 0], y: reduce ? 0 : -70, scale: f.tone === "crit" ? 1.25 : 1 }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`absolute left-1/2 top-1/3 -translate-x-1/2 whitespace-nowrap text-3xl font-black ${
                            f.tone === "crit" ? "text-amber-300 [text-shadow:0_0_20px_rgba(251,191,36,0.8)]" : "text-white [text-shadow:0_2px_0_rgba(0,0,0,0.6)]"
                          }`}
                        >
                          {f.text}
                        </motion.p>
                      ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}

          {/* The map stays while the learner picks a topping. */}
          {choosing && <FloorMap key={`next-${view.floor}`} floor={view.floor + 1} reduce={reduce} compact />}

          <div className={`relative flex justify-center ${sideBySide ? "min-w-0 flex-1" : "w-full"}`}>
            {choosing ? (
              <ToppingChoice view={view} pending={pending} reduce={reduce} onPick={(id) => void pick(id)} />
            ) : question?.type === "choice" ? (
              <QuestionPanel
                question={question}
                share={revealing ? 1 : clock.share}
                started={!revealing && clock.started}
                secondsLeft={clock.secondsLeft}
                picked={shown ? shown.picked : picked}
                outcome={shown?.outcome ?? null}
                disabled={pending || Boolean(shown) || intro || view.phase !== "fight"}
                onPick={(i) => void answer({ choice: i })}
                compact={mode.compact}
              />
            ) : question?.type === "typed" ? (
              <BossTyping
                question={question}
                share={revealing ? 1 : clock.share}
                started={!revealing && clock.started}
                secondsLeft={clock.secondsLeft}
                value={shown ? shown.typed : typed}
                outcome={shown?.outcome ?? null}
                disabled={pending || Boolean(shown) || intro || view.phase !== "fight"}
                shakeKey={typeShake}
                onChange={setTyped}
                onSubmit={() => void answer({ text: typed })}
                compact={mode.compact}
              />
            ) : null}
          </div>
        </div>
        </div>

        <FxLayer fx={fxRef} aim={aimRef} shakeRef={fieldRef} reduce={reduce} />

        <AnimatePresence>
          {hurt > 0 && (
            <motion.div
              key={`hurt-${hurt}`}
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(225,29,72,0.65)_100%)]"
              aria-hidden="true"
            />
          )}
        </AnimatePresence>
      </div>

      <DungeonHud view={view} reduce={reduce} area={area} onLeave={() => setLeaveOpen(true)} />

      {/* The learner's own losses and saves show under their health bar (top left), not by the monster. */}
      <div className="pointer-events-none absolute inset-x-0 z-30" style={{ top: stage.hudBottom - 12 }} aria-hidden="true">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <AnimatePresence>
            {floaters
              .filter((f) => f.side === "me")
              .map((f) => (
                <motion.p
                  key={f.key}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: [0, 1, 1, 0], y: reduce ? 0 : 14 }}
                  transition={{ duration: 1.1 }}
                  className={`absolute whitespace-nowrap text-2xl font-black ${f.tone === "hurt" ? "text-rose-400" : "text-sky-200"} [text-shadow:0_2px_0_rgba(0,0,0,0.6)]`}
                >
                  {f.text}
                </motion.p>
              ))}
          </AnimatePresence>
        </div>
      </div>


      <div className="pointer-events-none absolute inset-x-0 top-[24%] z-30 flex justify-center" aria-live="assertive" data-dungeon-callout>
        <AnimatePresence>{mapShowing && <FloorMap key={`map-${view.floor}`} floor={view.floor} reduce={reduce} />}</AnimatePresence>
      </div>
      {/* The map stands alone: the cellar dims behind it until the monster steps up. */}
      <div className="pointer-events-none absolute inset-0 z-[25]" aria-hidden="true">
        <AnimatePresence>
          {mapShowing && (
            <motion.div key={`dim-${view.floor}`} className="absolute inset-0 bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} />
          )}
        </AnimatePresence>
      </div>

      {leaveOpen && (
        <LeaveMatchDialog
          stake={20}
          title="Rời hầm?"
          message={`Lượt chơi sẽ chốt ở tầng ${view.floor}. Boss đã hạ vẫn được thưởng.`}
          pending={leaving}
          onStay={() => setLeaveOpen(false)}
          onLeave={() => void leave()}
        />
      )}
    </div>
  );
}
