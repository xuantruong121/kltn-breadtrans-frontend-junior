/**
 * The Arena lobby's city at night (owner 2026-11-09), from ansimuz's CC0
 * "Urban landscape" (a pale daytime city; see public/sounds/CREDITS.md): the
 * buildings become night silhouettes, a grid of small windows is laid inside
 * them (the original's lightest shade is lit facade, not windows: using it
 * drew long glowing bands), and the clouds are cut out of the sky. Pure:
 * works on RGBA pixel arrays.
 */

const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

/**
 * Night silhouettes: every opaque pixel becomes a dark blue shade, a little
 * lighter where the original was lighter so the facades keep their shape;
 * `haze` lifts the far layer toward the sky. Alpha is kept.
 */
export function nightBuildings(data: Uint8ClampedArray, haze = 0) {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const t = Math.min(1, Math.max(0, (lum(data[i], data[i + 1], data[i + 2]) - 90) / 110));
    data[i] = Math.round(12 + 22 * t + 30 * haze);
    data[i + 1] = Math.round(18 + 26 * t + 34 * haze);
    data[i + 2] = Math.round(38 + 38 * t + 44 * haze);
  }
}

export type WindowCell = { x: number; y: number; w: number; h: number };

/**
 * Small windows on a grid (every `stepX` by `stepY` pixels, `size` square),
 * only where the building is solid around the window, so none sits on an
 * edge or in the sky, and none on the top rows of a roof.
 */
export function windowGrid(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  { stepX = 4, stepY = 5, size = 2, margin = 1 }: { stepX?: number; stepY?: number; size?: number; margin?: number } = {},
): WindowCell[] {
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && data[(y * width + x) * 4 + 3] >= 128;
  const cells: WindowCell[] = [];
  for (let y = 2; y + size < height; y += stepY)
    for (let x = 1; x + size < width; x += stepX) {
      let ok = true;
      for (let yy = y - margin - 1; ok && yy < y + size + margin; yy += 1)
        for (let xx = x - margin; ok && xx < x + size + margin; xx += 1) if (!solid(xx, yy)) ok = false;
      if (ok) cells.push({ x, y, w: size, h: size });
    }
  return cells;
}

/**
 * The clouds cut out of the plain sky: transparent where the sky is its base
 * colour, more opaque where lighter; tinted a night blue-grey.
 */
export function nightClouds(data: Uint8ClampedArray) {
  const base = lum(data[0], data[1], data[2]);
  for (let i = 0; i < data.length; i += 4) {
    const lift = lum(data[i], data[i + 1], data[i + 2]) - base;
    data[i + 3] = lift <= 2 ? 0 : Math.min(200, Math.round(lift * 12));
    data[i] = 58;
    data[i + 1] = 70;
    data[i + 2] = 104;
  }
}
