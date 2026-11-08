import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { age, bulletAt, createFx, fireBullet, shakeOffset, spawnDust, spawnExplosion, spawnSparks, stepFx } from "./fx.ts";

const rng = () => 0.5;

describe("bullets", () => {
  test("fly from the muzzle to the letter and arrive", () => {
    const fx = createFx();
    fireBullet(fx, { x: 0, y: 400 }, { x: 0, y: 0 }, 1000, 7);
    const b = fx.bullets[0];
    assert.ok(b.duration > 80 && b.duration <= 260);
    assert.equal(bulletAt(b, 1000).y, 400);
    assert.ok(bulletAt(b, 1000 + b.duration / 2).y < 200, "eased out: past halfway at half time");
    const arrived = stepFx(fx, 1000 + b.duration, 16);
    assert.deepEqual(arrived.map((a) => a.targetId), [7]);
    assert.equal(fx.bullets.length, 0);
  });
});

describe("particles", () => {
  test("an explosion makes crumbs, sparks, a ring and a flash, with a hit-stop and a nudge", () => {
    const fx = createFx();
    spawnExplosion(fx, 100, 100, 5000, Math.random);
    const kinds = new Set(fx.particles.map((p) => p.kind));
    for (const k of ["crumb", "spark", "ring", "flash"]) assert.ok(kinds.has(k as never), k);
    assert.equal(fx.freezeUntil, 5060);
    assert.ok(fx.shakeUntil > 5000);
  });
  test("particles move, age and are dropped when spent", () => {
    const fx = createFx();
    spawnSparks(fx, 0, 0, Math.random);
    const first = fx.particles[0];
    stepFx(fx, 100, 100);
    assert.ok(age(first) > 0.3);
    stepFx(fx, 400, 300);
    assert.equal(fx.particles.length, 0);
  });
  test("a landing shakes harder than a hit, and the shake fades out", () => {
    const fx = createFx();
    spawnDust(fx, 50, 500, 0, Math.random);
    const early = Math.abs(shakeOffset(fx, 10, () => 1).x);
    const late = Math.abs(shakeOffset(fx, 240, () => 1).x);
    assert.ok(early > late && late > 0);
    assert.deepEqual(shakeOffset(fx, 300, rng), { x: 0, y: 0 });
  });
});
