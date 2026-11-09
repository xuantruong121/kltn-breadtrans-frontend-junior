"use client";

import React, { useEffect, useRef } from "react";
import { nightBuildings, nightClouds, windowGrid, type WindowCell } from "../cityScene";

/**
 * The Arena lobby's backdrop (owner 2026-11-09: a chill lofi scene): a city
 * at night from ansimuz's CC0 "Urban landscape" (public/images/arena/city),
 * as night silhouettes in two drifting layers with a grid of small windows
 * that light up and go dark one at a time. Over it: stars, a moon, slow
 * clouds cut from the original sky, a string of lanterns swaying over the
 * street, and a little steam from a bakery vent. Half resolution, 15 frames
 * a second, and the busy parts (lit windows, glows) are drawn once into
 * small canvases and only stamped each frame. Still with reduced motion.
 */
const RES = 0.5;
const STARS = 70;

type Layer = { base: HTMLCanvasElement; canvas: HTMLCanvasElement; windows: WindowCell[]; lit: boolean[] };
type Puff = { x: number; r: number; born: number; drift: number };

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const blank = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

/** Repaints a layer: the night silhouettes, then its lit windows (at the art's own pixels). */
function paint(layer: Layer, warm: string) {
  const g = layer.canvas.getContext("2d")!;
  g.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
  g.drawImage(layer.base, 0, 0);
  g.fillStyle = warm;
  layer.windows.forEach((cell, i) => {
    if (layer.lit[i]) g.fillRect(cell.x, cell.y, cell.w, cell.h);
  });
}

function makeLayer(img: HTMLImageElement, haze: number, litShare: number, warm: string): Layer | null {
  const base = blank(img.naturalWidth, img.naturalHeight);
  const g = base.getContext("2d");
  if (!g) return null;
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, base.width, base.height);
  const windows = windowGrid(data.data, base.width, base.height);
  nightBuildings(data.data, haze);
  g.putImageData(data, 0, 0);
  const layer: Layer = { base, canvas: blank(base.width, base.height), windows, lit: windows.map(() => Math.random() < litShare) };
  paint(layer, warm);
  return layer;
}

function makeClouds(img: HTMLImageElement): HTMLCanvasElement | null {
  const c = blank(img.naturalWidth, img.naturalHeight);
  const g = c.getContext("2d");
  if (!g) return null;
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, c.width, c.height);
  nightClouds(data.data);
  g.putImageData(data, 0, 0);
  return c;
}

/** A soft round glow, drawn once and then stamped. */
function glow(size: number, rgb: string, alpha: number) {
  const c = blank(size, size);
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${rgb},${alpha})`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

const NEAR_WARM = "#f6c27a";
const FAR_WARM = "#c99a62";

export function CityNight({ reduce }: { reduce: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let w = 0;
    let h = 0;
    let gone = false;
    let near: Layer | null = null;
    let far: Layer | null = null;
    let clouds: HTMLCanvasElement | null = null;
    let sky: HTMLCanvasElement | null = null;
    let stars: { x: number; y: number; r: number; phase: number }[] = [];
    let puffs: Puff[] = [];
    let nextPuff = 0;
    let nextToggle = performance.now() + 1200;
    let frame = 0;
    const moonGlow = glow(64, "253,230,138", 0.35);
    const lanternWarm = glow(20, "251,146,60", 0.6);
    const lanternRed = glow(20, "239,68,68", 0.55);

    const resize = () => {
      w = Math.max(1, Math.ceil(canvas.clientWidth * RES));
      h = Math.max(1, Math.ceil(canvas.clientHeight * RES));
      canvas.width = w;
      canvas.height = h;
      ctx.imageSmoothingEnabled = false;
      sky = blank(1, h);
      const sg = sky.getContext("2d")!;
      const grad = sg.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#070d22");
      grad.addColorStop(0.45, "#13214a");
      grad.addColorStop(0.72, "#33304f");
      grad.addColorStop(0.88, "#8f5238");
      grad.addColorStop(1, "#c47a44");
      sg.fillStyle = grad;
      sg.fillRect(0, 0, 1, h);
      stars = Array.from({ length: STARS }, () => ({ x: Math.random() * w, y: Math.random() * h * 0.5, r: Math.random() < 0.15 ? 1.2 : 0.7, phase: Math.random() * 6.28 }));
    };

    const drawLayer = (layer: Layer, heightShare: number, speed: number, now: number) => {
      const scale = (h * heightShare) / layer.canvas.height;
      const tw = layer.canvas.width * scale;
      const th = layer.canvas.height * scale;
      const top = h - th;
      const offset = reduce ? 0 : ((now / 1000) * speed) % tw;
      for (let x = -offset; x < w; x += tw) ctx.drawImage(layer.canvas, Math.floor(x), Math.floor(top), Math.ceil(tw) + 1, Math.ceil(th));
    };

    const draw = (now: number) => {
      if (sky) ctx.drawImage(sky, 0, 0, w, h);
      ctx.fillStyle = "#f8fafc";
      for (const s of stars) {
        ctx.globalAlpha = reduce ? 0.7 : 0.35 + 0.65 * Math.abs(Math.sin(now / 1300 + s.phase));
        ctx.fillRect(s.x, s.y, s.r, s.r);
      }
      ctx.globalAlpha = 1;
      const mx = w * 0.82;
      const my = h * 0.16;
      const mg = h * 0.28;
      ctx.drawImage(moonGlow, mx - mg / 2, my - mg / 2, mg, mg);
      ctx.fillStyle = "#fef3c7";
      ctx.beginPath();
      ctx.arc(mx, my, Math.max(4, h * 0.035), 0, Math.PI * 2);
      ctx.fill();

      if (clouds) {
        const scale = (h * 0.9) / clouds.height;
        const tw = clouds.width * scale;
        const offset = reduce ? 0 : ((now / 1000) * 3) % tw;
        ctx.globalAlpha = 0.7;
        for (let x = -offset; x < w; x += tw) ctx.drawImage(clouds, Math.floor(x), Math.floor(-h * 0.12), Math.ceil(tw) + 1, Math.ceil(clouds.height * scale));
        ctx.globalAlpha = 1;
      }

      // One window changes at a time; only that layer is repainted.
      if (!reduce && now > nextToggle && near && far) {
        const layer = Math.random() < 0.7 ? near : far;
        const i = Math.floor(Math.random() * layer.lit.length);
        layer.lit[i] = !layer.lit[i];
        paint(layer, layer === near ? NEAR_WARM : FAR_WARM);
        nextToggle = now + 700 + Math.random() * 1600;
      }
      if (far) drawLayer(far, 0.48, 4, now);
      if (near) drawLayer(near, 0.6, 9, now);

      // Lanterns over the street, swaying.
      const sway = reduce ? 0 : Math.sin(now / 1400) * h * 0.012;
      const y0 = h * 0.08;
      const sag = h * 0.1 + sway;
      ctx.strokeStyle = "rgba(20,14,10,0.9)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 6) {
        const t = x / w;
        const y = y0 + sag * 4 * t * (1 - t);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      const count = Math.max(6, Math.round(w / 34));
      for (let k = 1; k < count; k += 1) {
        const t = k / count;
        const x = t * w;
        const y = y0 + sag * 4 * t * (1 - t) + 3;
        ctx.globalAlpha = reduce ? 1 : 0.75 + 0.25 * Math.sin(now / 600 + k);
        ctx.drawImage(k % 3 === 0 ? lanternRed : lanternWarm, x - 10, y - 10);
        ctx.globalAlpha = 1;
        ctx.fillStyle = k % 3 === 0 ? "#f87171" : "#fdba74";
        ctx.fillRect(x - 1.5, y - 2, 3, 4);
      }

      // A little steam from a bakery vent at the bottom edge.
      if (!reduce) {
        if (now > nextPuff) {
          puffs.push({ x: w * 0.1 + (Math.random() - 0.5) * 3, r: 1.5 + Math.random(), born: now, drift: Math.random() * 0.4 - 0.1 });
          nextPuff = now + 380 + Math.random() * 260;
        }
        puffs = puffs.filter((p) => now - p.born < 3200);
        ctx.fillStyle = "#e7e5e4";
        for (const p of puffs) {
          const age = (now - p.born) / 3200;
          ctx.globalAlpha = 0.18 * (1 - age);
          ctx.beginPath();
          ctx.arc(p.x + p.drift * age * 40 + Math.sin(age * 6) * 2, h - age * h * 0.16, p.r + age * 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    };

    resize();
    void Promise.all([loadImage("/images/arena/city/buildings.png"), loadImage("/images/arena/city/sky.png")]).then(([buildings, skyImg]) => {
      if (gone) return;
      if (buildings) {
        near = makeLayer(buildings, 0, 0.28, NEAR_WARM);
        far = makeLayer(buildings, 0.45, 0.18, FAR_WARM);
      }
      if (skyImg) clouds = makeClouds(skyImg);
      if (reduce) draw(performance.now());
    });
    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) draw(performance.now());
    });
    ro.observe(canvas);
    let last = 0;
    const loop = (now: number) => {
      // 15 frames a second, like the lofi loops this scene imitates: the motion is slow, and the
      // see-through cards over it only blend again when it changes.
      if (now - last >= 66) {
        draw(now);
        last = now;
      }
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
    <div className="pointer-events-none fixed inset-0 -z-10 bg-[#070d22] will-change-transform [contain:strict]" aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full [image-rendering:pixelated]" />
      {/* keeps the cards easy to read over the city */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,23,0.25),rgba(2,6,23,0.05)_40%,rgba(2,6,23,0.35))]" />
    </div>
  );
}
