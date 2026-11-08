/**
 * Pháo Bánh Mì's effects, as numbers: bullets flying to a letter, crumbs and
 * sparks, a shock ring, screen shake and a short hit-stop. The canvas layer
 * draws this state; nothing here touches the DOM, so it is tested alone.
 * Times are in milliseconds, positions in field pixels.
 */
export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** ms left and at birth */
  life: number;
  maxLife: number;
  size: number;
  color: string;
  kind: "crumb" | "spark" | "dust" | "ring" | "flash";
  /** px/ms² pulling down; rings and flashes ignore it */
  gravity: number;
};

export type Bullet = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  born: number;
  duration: number;
  targetId: number;
};

export type FxState = {
  particles: Particle[];
  bullets: Bullet[];
  shakeUntil: number;
  shakeAmp: number;
  /** Until when the falling blocks hold still (hit-stop). */
  freezeUntil: number;
};

/** Crumb colours: the app's bread browns and ambers, no neon. */
export const CRUMB = ["#FDE68A", "#FBBF24", "#F59E0B", "#D97706", "#92400E"];
const SPARK = ["#FFFBEB", "#FDE68A", "#FCD34D"];

export function createFx(): FxState {
  return { particles: [], bullets: [], shakeUntil: 0, shakeAmp: 0, freezeUntil: 0 };
}

const pick = <T>(list: readonly T[], rng: () => number) => list[Math.floor(rng() * list.length) % list.length];

/** A bullet from the muzzle to a letter; it takes longer the farther it goes. */
export function fireBullet(fx: FxState, from: { x: number; y: number }, to: { x: number; y: number }, now: number, targetId: number) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  fx.bullets.push({ x0: from.x, y0: from.y, x1: to.x, y1: to.y, born: now, duration: Math.min(260, 80 + distance * 0.25), targetId });
}

/** Where a bullet is, eased out, and whether it has arrived. */
export function bulletAt(b: Bullet, now: number): { x: number; y: number; done: boolean } {
  const t = Math.min(1, Math.max(0, (now - b.born) / b.duration));
  const e = 1 - (1 - t) * (1 - t);
  return { x: b.x0 + (b.x1 - b.x0) * e, y: b.y0 + (b.y1 - b.y0) * e, done: t >= 1 };
}

function burst(fx: FxState, x: number, y: number, count: number, rng: () => number, make: (angle: number, speed: number) => Partial<Particle>) {
  for (let i = 0; i < count; i += 1) {
    const angle = rng() * Math.PI * 2;
    const speed = 0.05 + rng() * 0.35;
    fx.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 600, maxLife: 600, size: 3, color: CRUMB[0], kind: "crumb", gravity: 0.0006, ...make(angle, speed) });
  }
}

/** A letter hit: a few bright sparks. */
export function spawnSparks(fx: FxState, x: number, y: number, rng: () => number, scale = 1) {
  burst(fx, x, y, Math.round(6 * scale), rng, () => ({ kind: "spark", color: pick(SPARK, rng), size: 1.5 + rng() * 1.5, life: 260, maxLife: 260, gravity: 0 }));
}

/** A block broken: crumbs, sparks, a shock ring and a flash; a short hit-stop and a nudge. */
export function spawnExplosion(fx: FxState, x: number, y: number, now: number, rng: () => number, scale = 1) {
  burst(fx, x, y, Math.round(26 * scale), rng, (angle, speed) => {
    const life = 650 + rng() * 450;
    return { vx: Math.cos(angle) * speed * 1.6, vy: Math.sin(angle) * speed * 1.6 - 0.15, kind: "crumb", color: pick(CRUMB, rng), size: 2.5 + rng() * 4, life, maxLife: life };
  });
  spawnSparks(fx, x, y, rng, 2 * scale);
  fx.particles.push({ x, y, vx: 0, vy: 0, life: 420, maxLife: 420, size: 90 * scale, color: "#FDE68A", kind: "ring", gravity: 0 });
  fx.particles.push({ x, y, vx: 0, vy: 0, life: 160, maxLife: 160, size: 70 * scale, color: "#FFFBEB", kind: "flash", gravity: 0 });
  fx.freezeUntil = Math.max(fx.freezeUntil, now + 60);
  shake(fx, now, 3 * scale, 140);
}

/** A block landed: dust along the ground and a hard shake. */
export function spawnDust(fx: FxState, x: number, y: number, now: number, rng: () => number) {
  burst(fx, x, y, 22, rng, (angle, speed) => {
    const life = 700 + rng() * 400;
    return { vx: Math.cos(angle) * speed * 1.4, vy: -Math.abs(Math.sin(angle) * speed), kind: "dust", color: pick(["#78716C", "#A8A29E", "#57534E"], rng), size: 4 + rng() * 6, life, maxLife: life, gravity: 0.0002 };
  });
  shake(fx, now, 10, 260);
}

export function shake(fx: FxState, now: number, amp: number, ms: number) {
  if (now + ms > fx.shakeUntil || amp > fx.shakeAmp) {
    fx.shakeUntil = Math.max(fx.shakeUntil, now + ms);
    fx.shakeAmp = Math.max(amp, now < fx.shakeUntil ? fx.shakeAmp : 0);
  }
}

/** The camera offset now: fading to zero by the end of the shake. */
export function shakeOffset(fx: FxState, now: number, rng: () => number): { x: number; y: number } {
  if (now >= fx.shakeUntil || fx.shakeAmp <= 0) return { x: 0, y: 0 };
  const left = (fx.shakeUntil - now) / 260;
  const amp = fx.shakeAmp * Math.min(1, left);
  return { x: (rng() * 2 - 1) * amp, y: (rng() * 2 - 1) * amp };
}

/** Moves every particle by `dt` ms and drops the spent ones and arrived bullets. */
export function stepFx(fx: FxState, now: number, dt: number): Bullet[] {
  for (const p of fx.particles) {
    p.life -= dt;
    if (p.kind === "ring" || p.kind === "flash") continue;
    p.vy += p.gravity * dt;
    p.vx *= Math.pow(0.996, dt);
    p.vy *= Math.pow(0.998, dt);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  fx.particles = fx.particles.filter((p) => p.life > 0);
  const arrived = fx.bullets.filter((b) => bulletAt(b, now).done);
  fx.bullets = fx.bullets.filter((b) => !bulletAt(b, now).done);
  if (now >= fx.shakeUntil) fx.shakeAmp = 0;
  return arrived;
}

/** How far through its life a particle is, 0 at birth to 1 at the end. */
export const age = (p: Particle) => 1 - Math.max(0, p.life) / p.maxLife;
