"use client";

import React, { useEffect, useRef } from "react";

/**
 * The cellar under the bakery: a brick vault (CSS, still), and on a canvas two
 * torches that flicker, the glow of the oven at the back and embers rising. A
 * boss floor turns the oven's glow red. Half resolution, 30 frames a second;
 * still with reduced motion. Decorative only.
 */
const RES = 0.5;

export function DungeonScene({ boss, reduce }: { boss: boolean; reduce: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bossRef = useRef(boss);
  useEffect(() => {
    bossRef.current = boss;
  }, [boss]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let w = 0;
    let h = 0;
    type Ember = { x: number; y: number; vy: number; drift: number; life: number; size: number };
    let embers: Ember[] = [];
    const spawn = (): Ember => ({ x: w * (0.3 + Math.random() * 0.4), y: h * (0.75 + Math.random() * 0.2), vy: 0.02 + Math.random() * 0.03, drift: Math.random() * 2 - 1, life: 1, size: 1 + Math.random() * 1.5 });
    const resize = () => {
      w = Math.max(1, Math.ceil(canvas.clientWidth * RES));
      h = Math.max(1, Math.ceil(canvas.clientHeight * RES));
      canvas.width = w;
      canvas.height = h;
      embers = Array.from({ length: 36 }, () => ({ ...spawn(), y: Math.random() * h, life: Math.random() }));
    };
    const glow = (x: number, y: number, r: number, color: string, a: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${color},${a})`);
      g.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    const draw = (now: number, dt: number) => {
      ctx.clearRect(0, 0, w, h);
      const oven = bossRef.current ? "239,68,68" : "251,146,60";
      const pulse = reduce ? 1 : 0.85 + 0.15 * Math.sin(now / 900);
      glow(w / 2, h * 1.02, Math.max(w, h) * 0.55, oven, 0.38 * pulse);
      for (const [x, phase] of [
        [w * 0.1, 0],
        [w * 0.9, 1.7],
      ] as const) {
        const flicker = reduce ? 1 : 0.8 + 0.2 * Math.sin(now / 90 + phase) * Math.sin(now / 230 + phase * 2);
        glow(x, h * 0.32, Math.min(w, h) * 0.38 * flicker, "253,186,116", 0.32 * flicker);
        ctx.fillStyle = "#3b2a20";
        ctx.fillRect(x - 2, h * 0.34, 4, h * 0.08);
        glow(x, h * 0.32, 6, "255,236,190", 0.95);
      }
      if (!reduce) {
        for (const e of embers) {
          e.y -= e.vy * dt;
          e.x += Math.sin(now / 700 + e.drift * 3) * 0.08 + e.drift * 0.01;
          e.life -= dt / 6000;
          if (e.life <= 0 || e.y < h * 0.15) Object.assign(e, spawn());
          ctx.globalAlpha = Math.max(0, Math.min(1, e.life)) * 0.9;
          ctx.fillStyle = e.life > 0.5 ? "#FDBA74" : "#F97316";
          ctx.fillRect(e.x, e.y, e.size, e.size);
        }
        ctx.globalAlpha = 1;
      }
    };
    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) draw(performance.now(), 0);
    });
    ro.observe(canvas);
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      if (now - last >= 32) {
        draw(now, Math.min(66, now - last));
        last = now;
      }
      frame = requestAnimationFrame(loop);
    };
    if (reduce) draw(performance.now(), 0);
    else frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [reduce]);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[#1a100c]" aria-hidden="true">
      {/* brick vault */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          // One tile of staggered bricks: two courses, the joints offset by half a brick.
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='32'%3E%3Cpath d='M0 1H64M0 17H64M1 0V16M33 16V32' stroke='%23231310' stroke-width='2'/%3E%3C/svg%3E\")",
          backgroundSize: "64px 32px",
          backgroundColor: "#3a2219",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,transparent_20%,rgba(10,5,3,0.85)_80%)]" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full [image-rendering:pixelated]" />
      {/* the floor */}
      <div className="absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-b from-transparent to-[#120a07]" />
    </div>
  );
}
