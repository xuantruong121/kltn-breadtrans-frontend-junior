"use client";

import React, { useEffect, useRef } from "react";
import { DUSK, tintPixels } from "../sound/studyAmbienceLogic";

/**
 * The study room's backdrop (owner 2026-11-08: a lofi forest, like the chill
 * channels): a CC0 pixel forest by ansimuz (public/images/study/forest, see
 * public/sounds/CREDITS.md), darkened and cooled to a rainy dusk, its three
 * tree layers drifting at different speeds. Over it, on the same canvas: rain
 * in two depths with splashes, slow fog, a few fireflies and, now and then, a
 * faint flash of distant lightning. One canvas, no blur over it; with reduced
 * motion it is drawn once and holds still. Decorative only.
 */
const LAYERS = [
  { file: "back-trees", speed: 6, alpha: 1 },
  { file: "lights", speed: 9, alpha: 0.16 },
  { file: "middle-trees", speed: 14, alpha: 1 },
  { file: "front-trees", speed: 26, alpha: 1 },
] as const;
const ART_W = 272;
const ART_H = 160;
/**
 * The scene is drawn at half the screen's resolution and stretched with
 * pixelated scaling: it suits the pixel art, and it is a quarter of the work
 * (a full-size canvas held a 1366 px screen to 40 frames a second).
 */
const RES = 0.5;

/** A soft round glow, drawn once and then stamped (cheaper than a gradient per frame). */
function glowSprite(size: number, rgb: string, alpha: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${rgb},${alpha})`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

type Drop = { x: number; y: number; len: number; speed: number; near: boolean };
type Splash = { x: number; y: number; born: number };
type Fly = { x: number; y: number; phase: number; drift: number };

function loadLayer(file: string): Promise<HTMLCanvasElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const g = c.getContext("2d");
      if (!g) return resolve(null);
      g.drawImage(img, 0, 0);
      const data = g.getImageData(0, 0, c.width, c.height);
      tintPixels(data.data, DUSK);
      g.putImageData(data, 0, 0);
      resolve(c);
    };
    img.onerror = () => resolve(null);
    img.src = `/images/study/forest/${file}.png`;
  });
}

export function LofiForest({ reduce }: { reduce: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let w = 0;
    let h = 0;
    let drops: Drop[] = [];
    let flies: Fly[] = [];
    let splashes: Splash[] = [];
    let layers: (HTMLCanvasElement | null)[] = [];
    let flashAt = performance.now() + 15000 + Math.random() * 15000;
    const fog = glowSprite(128, "160,180,210", 0.1);
    const firefly = glowSprite(16, "253,230,138", 0.9);
    let frame = 0;
    let gone = false;

    const resize = () => {
      // Pixel art needs no extra density; one canvas pixel per CSS pixel keeps it light.
      w = Math.max(1, Math.ceil(canvas.clientWidth * RES));
      h = Math.max(1, Math.ceil(canvas.clientHeight * RES));
      canvas.width = w;
      canvas.height = h;
      ctx.imageSmoothingEnabled = false;
      const count = Math.round(Math.min(320, (w * h) / (6000 * RES * RES)));
      drops = Array.from({ length: count }, () => {
        const near = Math.random() < 0.35;
        return {
          x: Math.random() * w * 1.2,
          y: Math.random() * h,
          len: (near ? 14 + Math.random() * 10 : 7 + Math.random() * 6) * RES,
          speed: (near ? 0.9 + Math.random() * 0.3 : 0.55 + Math.random() * 0.2) * RES,
          near,
        };
      });
      flies = Array.from({ length: Math.round(Math.min(12, w / (120 * RES))) }, () => ({ x: Math.random() * w, y: h * (0.55 + Math.random() * 0.4), phase: Math.random() * 6.28, drift: Math.random() * 2 - 1 }));
    };

    const draw = (now: number, dt: number) => {
      const scale = h / ART_H;
      const tile = ART_W * scale;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      LAYERS.forEach((layer, i) => {
        const img = layers[i];
        if (!img) return;
        const offset = reduce ? 0 : ((now / 1000) * layer.speed * RES) % tile;
        ctx.globalAlpha = layer.alpha;
        for (let x = -offset; x < w; x += tile) ctx.drawImage(img, Math.floor(x), 0, Math.ceil(tile) + 1, h);
      });
      ctx.globalAlpha = 1;

      // Fog: wide soft bands drifting low over the ground.
      for (let i = 0; i < 3; i += 1) {
        const fx = (((reduce ? 0 : now / 1000) * (8 + i * 5) * RES + i * w * 0.4) % (w * 1.6)) - w * 0.3;
        const fy = h * (0.62 + i * 0.12);
        ctx.drawImage(fog, fx - w * 0.45, fy - h * 0.25, w * 0.9, h * 0.5);
      }

      if (!reduce) {
        // Two paths, far and near, each stroked once: hundreds of drops, two draw calls.
        const far = new Path2D();
        const close = new Path2D();
        for (const d of drops) {
          d.y += d.speed * dt;
          d.x -= d.speed * dt * 0.22;
          if (d.y > h) {
            if (d.near && Math.random() < 0.5) splashes.push({ x: d.x, y: h - 1 - Math.random() * h * 0.05, born: now });
            d.y = -d.len - Math.random() * 20;
            d.x = Math.random() * w * 1.2;
          }
          const path = d.near ? close : far;
          path.moveTo(d.x, d.y);
          path.lineTo(d.x + d.len * 0.22, d.y - d.len);
        }
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(170,190,220,0.26)";
        ctx.stroke(far);
        ctx.strokeStyle = "rgba(200,216,240,0.5)";
        ctx.stroke(close);
        splashes = splashes.filter((s) => now - s.born < 220);
        ctx.fillStyle = "rgba(200,216,240,0.5)";
        for (const s of splashes) {
          const k = (now - s.born) / 220;
          ctx.fillRect(s.x - 1.5 * k - 1, s.y - 1.5 * k, 1, 1);
          ctx.fillRect(s.x + 1.5 * k, s.y - 1.2 * k, 1, 1);
        }
      }

      for (const f of flies) {
        if (!reduce) {
          f.y -= 0.006 * dt * RES;
          f.x += (Math.sin(now / 900 + f.phase) * 0.2 + f.drift * 0.03) * RES;
          if (f.y < h * 0.45) {
            f.y = h * (0.85 + Math.random() * 0.12);
            f.x = Math.random() * w;
          }
        }
        ctx.globalAlpha = reduce ? 0.6 : 0.3 + 0.7 * Math.max(0, Math.sin(now / 700 + f.phase));
        ctx.drawImage(firefly, f.x - 4, f.y - 4, 8, 8);
      }
      ctx.globalAlpha = 1;

      // Distant lightning: two faint flickers, every 15 to 40 seconds.
      if (!reduce) {
        const since = now - flashAt;
        if (since > 0) {
          const a = since < 90 ? 0.14 : since < 160 ? 0.03 : since < 260 ? 0.1 * (1 - (since - 160) / 100) : 0;
          if (a > 0) {
            ctx.fillStyle = `rgba(220,230,255,${a})`;
            ctx.fillRect(0, 0, w, h);
          }
          if (since > 300) flashAt = now + 15000 + Math.random() * 25000;
        }
      }
    };

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) draw(performance.now(), 0);
    });
    ro.observe(canvas);
    void Promise.all(LAYERS.map((l) => loadLayer(l.file))).then((loaded) => {
      if (gone) return;
      layers = loaded;
      if (reduce) draw(performance.now(), 0);
    });
    let last = performance.now();
    const loop = (now: number) => {
      draw(now, Math.min(50, now - last));
      last = now;
      frame = requestAnimationFrame(loop);
    };
    if (!reduce) frame = requestAnimationFrame(loop);
    return () => {
      gone = true;
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [reduce]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 bg-[#141a2b]" aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full [image-rendering:pixelated]" />
      {/* keeps the cards and the words easy to read over the scene */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,23,0.55),rgba(2,6,23,0.2)_35%,rgba(2,6,23,0.35)_75%,rgba(2,6,23,0.7))]" />
    </div>
  );
}
