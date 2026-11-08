"use client";

import React, { useEffect, useRef } from "react";
import { age, bulletAt, shakeOffset, spawnSparks, stepFx, type FxState } from "../fx";

export type Aim = { from: { x: number; y: number }; to: { x: number; y: number } } | null;

/**
 * The effects canvas over the falling blocks: the dotted aim line, glowing
 * crumb bullets, sparks where a letter is hit, crumbs and a shock ring where
 * a block breaks, dust where one lands. It also shakes `shakeRef` by the
 * effect state. Everything comes from refs, so React never redraws it.
 */
export function FxLayer({
  fx,
  aim,
  shakeRef,
  reduce,
}: {
  fx: React.RefObject<FxState>;
  aim: React.RefObject<Aim>;
  shakeRef: React.RefObject<HTMLDivElement | null>;
  reduce: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const shaken = shakeRef.current;
    if (!canvas || !ctx) return;
    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let last = performance.now();
    let frame = 0;
    const loop = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      const state = fx.current;
      for (const b of stepFx(state, now, dt)) spawnSparks(state, b.x1, b.y1, Math.random, reduce ? 0.5 : 1);

      if (shaken) {
        const o = reduce ? { x: 0, y: 0 } : shakeOffset(state, now, Math.random);
        shaken.style.transform = o.x || o.y ? `translate3d(${o.x.toFixed(1)}px, ${o.y.toFixed(1)}px, 0)` : "";
      }

      ctx.clearRect(0, 0, w, h);

      const line = aim.current;
      if (line) {
        ctx.save();
        ctx.setLineDash([3, 9]);
        ctx.lineDashOffset = reduce ? 0 : -now / 25;
        ctx.strokeStyle = "rgba(253,230,138,0.45)";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(line.from.x, line.from.y);
        ctx.lineTo(line.to.x, line.to.y);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const b of state.bullets) {
        const p = bulletAt(b, now);
        const dx = b.x1 - b.x0;
        const dy = b.y1 - b.y0;
        const len = Math.hypot(dx, dy) || 1;
        const tx = p.x - (dx / len) * 22;
        const ty = p.y - (dy / len) * 22;
        const g = ctx.createLinearGradient(p.x, p.y, tx, ty);
        g.addColorStop(0, "rgba(253,230,138,0.95)");
        g.addColorStop(1, "rgba(245,158,11,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.fillStyle = "#FFFBEB";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      for (const p of state.particles) {
        const a = age(p);
        if (p.kind === "crumb") {
          ctx.globalAlpha = 1 - a * a;
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.x + p.y) * 0.05);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.8);
          ctx.restore();
        } else if (p.kind === "dust") {
          ctx.globalAlpha = 0.3 * (1 - a);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 + a * 1.5), 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          if (p.kind === "spark") {
            ctx.globalAlpha = 1 - a;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.size;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - p.vx * 28, p.y - p.vy * 28);
            ctx.stroke();
          } else if (p.kind === "ring") {
            const r = p.size * (1 - Math.pow(1 - a, 3));
            ctx.globalAlpha = 0.8 * (1 - a);
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 3 * (1 - a) + 0.5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            g.addColorStop(0, `rgba(255,251,235,${0.85 * (1 - a)})`);
            g.addColorStop(1, "rgba(251,191,36,0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      if (shaken) shaken.style.transform = "";
    };
  }, [fx, aim, shakeRef, reduce]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-20 h-full w-full" aria-hidden="true" />;
}
