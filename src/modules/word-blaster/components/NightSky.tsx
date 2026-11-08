"use client";

import React, { useEffect, useRef } from "react";

/**
 * Bắn chữ rơi's stage (owner 2026-11-08: a starry night over the fields): a
 * deep blue sky warming to amber at the horizon, twinkling stars and the odd
 * shooting star, a moon, three hills drifting at different speeds, wheat
 * swaying in front and fireflies rising from it. The horizon reddens as the
 * game nears its end (`progress`, 0 to 1). One canvas, drawn in code; with
 * reduced motion it is drawn once and holds still. Decorative only.
 */
type Star = { x: number; y: number; r: number; phase: number; speed: number };
type Fly = { x: number; y: number; phase: number; speed: number; drift: number };
type Shooting = { x: number; y: number; vx: number; vy: number; born: number };

const HILLS = [
  { base: 0.6, amp: 0.05, f1: 0.004, f2: 0.011, speed: 0.004, color: "#1A2647", rim: "rgba(251,191,36,0.10)" },
  { base: 0.7, amp: 0.045, f1: 0.006, f2: 0.017, speed: 0.009, color: "#131D38", rim: "rgba(251,191,36,0.08)" },
  { base: 0.82, amp: 0.03, f1: 0.009, f2: 0.023, speed: 0.016, color: "#0C142A", rim: "rgba(253,230,138,0.10)" },
];

export const NightSky = React.memo(function NightSky({ progress, reduce }: { progress: number; reduce: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let flies: Fly[] = [];
    let shooting: Shooting | null = null;
    let nextShooting = performance.now() + 2500;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(220, (w * h) / 5200));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.pow(Math.random(), 1.4) * h * 0.62,
        r: Math.random() < 0.08 ? 1.6 + Math.random() : 0.5 + Math.random() * 0.9,
        phase: Math.random() * Math.PI * 2,
        speed: 0.0008 + Math.random() * 0.0025,
      }));
      flies = Array.from({ length: Math.round(Math.min(18, w / 60)) }, () => ({
        x: Math.random() * w,
        y: h * (0.75 + Math.random() * 0.25),
        phase: Math.random() * Math.PI * 2,
        speed: 0.006 + Math.random() * 0.01,
        drift: Math.random() * 2 - 1,
      }));
    };

    const hillY = (layer: (typeof HILLS)[number], x: number, offset: number) =>
      h * layer.base + h * layer.amp * (Math.sin((x + offset) * layer.f1) + 0.5 * Math.sin((x + offset) * layer.f2 + 1.3));

    const draw = (now: number) => {
      ctx.clearRect(0, 0, w, h);

      for (const s of stars) {
        const a = reduce ? 0.75 : 0.45 + 0.55 * Math.abs(Math.sin(now * s.speed + s.phase));
        ctx.globalAlpha = a;
        ctx.fillStyle = "#F8FAFC";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.r > 1.5) {
          ctx.globalAlpha = a * 0.35;
          ctx.fillRect(s.x - s.r * 3, s.y - 0.4, s.r * 6, 0.8);
          ctx.fillRect(s.x - 0.4, s.y - s.r * 3, 0.8, s.r * 6);
        }
      }
      ctx.globalAlpha = 1;

      if (!reduce) {
        if (!shooting && now > nextShooting) {
          shooting = { x: w * (0.4 + Math.random() * 0.6), y: h * Math.random() * 0.25, vx: -0.9, vy: 0.38, born: now };
        }
        if (shooting) {
          const age = (now - shooting.born) / 900;
          if (age >= 1) {
            shooting = null;
            nextShooting = now + 4000 + Math.random() * 6000;
          } else {
            const x = shooting.x + shooting.vx * (now - shooting.born);
            const y = shooting.y + shooting.vy * (now - shooting.born);
            const g = ctx.createLinearGradient(x, y, x - shooting.vx * 120, y - shooting.vy * 120);
            g.addColorStop(0, `rgba(255,251,235,${0.9 * (1 - age)})`);
            g.addColorStop(1, "rgba(255,251,235,0)");
            ctx.strokeStyle = g;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - shooting.vx * 120, y - shooting.vy * 120);
            ctx.stroke();
          }
        }
      }

      HILLS.forEach((layer) => {
        const offset = reduce ? 0 : now * layer.speed;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w + 8; x += 8) ctx.lineTo(x, hillY(layer, x, offset));
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = layer.color;
        ctx.fill();
        ctx.strokeStyle = layer.rim;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 0; x <= w + 8; x += 8) {
          const y = hillY(layer, x, offset);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      // Wheat along the front, swaying a little in a slow wind.
      const groundY = h * 0.82;
      for (let x = -6, i = 0; x < w + 12; x += 11, i += 1) {
        const tall = 26 + ((i * 37) % 30);
        const baseY = h - ((i * 13) % 10);
        const sway = reduce ? 0 : Math.sin(now / 1100 + x / 90) * 5 + Math.sin(now / 470 + i) * 1.2;
        const tipX = x + sway;
        const tipY = Math.max(groundY, baseY - tall);
        ctx.strokeStyle = i % 3 === 0 ? "rgba(161,98,7,0.75)" : "rgba(120,72,10,0.7)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x, baseY);
        ctx.quadraticCurveTo(x + sway * 0.3, (baseY + tipY) / 2, tipX, tipY);
        ctx.stroke();
        ctx.fillStyle = i % 2 === 0 ? "rgba(202,138,4,0.85)" : "rgba(180,120,10,0.8)";
        ctx.beginPath();
        ctx.ellipse(tipX, tipY - 4, 2.4, 6, sway * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const f of flies) {
        if (!reduce) {
          f.y -= f.speed * 3;
          f.x += Math.sin(now * 0.001 + f.phase) * 0.25 + f.drift * 0.08;
          if (f.y < h * 0.45 || f.x < -10 || f.x > w + 10) {
            f.y = h * (0.85 + Math.random() * 0.15);
            f.x = Math.random() * w;
          }
        }
        const glow = reduce ? 0.6 : 0.35 + 0.65 * Math.max(0, Math.sin(now * f.speed * 0.4 + f.phase));
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 9);
        g.addColorStop(0, `rgba(254,240,138,${0.9 * glow})`);
        g.addColorStop(1, "rgba(254,240,138,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) draw(performance.now());
    });
    ro.observe(canvas);
    let frame = 0;
    const loop = (now: number) => {
      draw(now);
      frame = requestAnimationFrame(loop);
    };
    if (reduce) draw(performance.now());
    else frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [reduce]);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#060A18_0%,#0B1430_38%,#17244A_62%,#4A3524_84%,#7A4A1C_100%)]" />
      {/* the horizon reddens toward the end of the game */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(220,38,38,0.55),rgba(234,88,12,0.25)_35%,transparent_65%)] transition-opacity duration-1000"
        style={{ opacity: Math.min(1, progress) * 0.85 }}
      />
      {/* moon */}
      <div className="absolute right-[9%] top-[9%] h-16 w-16 rounded-full bg-[radial-gradient(circle_at_35%_35%,#FFFBEB,#FDE68A_60%,#F5D46B)] shadow-[0_0_60px_18px_rgba(253,230,138,0.22)] sm:h-20 sm:w-20">
        <span className="absolute left-[55%] top-[30%] h-3 w-3 rounded-full bg-amber-200/70" />
        <span className="absolute left-[30%] top-[58%] h-2 w-2 rounded-full bg-amber-200/70" />
      </div>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
});
