/**
 * Avatar cropping (owner 2026-11-17: a picked photo is saved at once; a photo
 * that is not a small square opens a crop frame first). Pure geometry, no DOM,
 * so it can be tested with the Node test runner.
 *
 * The photo is drawn at `scale` (CSS px per photo px) and moved by an offset
 * (x, y) from the centre of a square viewport `view` px wide. The viewport is
 * what becomes the avatar.
 */
import { AVATAR_SIZE_PX } from "./avatarSize.ts";

export type CropState = { scale: number; x: number; y: number };
export type Photo = { width: number; height: number };

/** A square photo no larger than the stored avatar needs no cropping. */
export function needsCrop(photo: Photo, size = AVATAR_SIZE_PX): boolean {
  return photo.width !== photo.height || Math.max(photo.width, photo.height) > size;
}

/** Smallest scale at which the photo still covers the whole viewport. */
export function coverScale(photo: Photo, view: number): number {
  return view / Math.min(photo.width, photo.height);
}

/** Zoom limits: from "covers the frame" up to four times that. */
export const MAX_ZOOM = 4;

/** Keeps the photo covering the viewport: no empty band at any edge. */
export function clampCrop(photo: Photo, view: number, state: CropState): CropState {
  const min = coverScale(photo, view);
  const scale = Math.min(Math.max(state.scale, min), min * MAX_ZOOM);
  const maxX = Math.max(0, (photo.width * scale - view) / 2);
  const maxY = Math.max(0, (photo.height * scale - view) / 2);
  const clamp = (v: number, m: number) => Math.min(m, Math.max(-m, v));
  // `+ 0` turns a -0 from clamping into 0.
  return { scale, x: clamp(state.x, maxX) + 0, y: clamp(state.y, maxY) + 0 };
}

/** Initial frame: centred, covering. */
export function initialCrop(photo: Photo, view: number): CropState {
  return { scale: coverScale(photo, view), x: 0, y: 0 };
}

/** Zooms around the viewport centre, keeping what is in the middle in the middle. */
export function zoomTo(photo: Photo, view: number, state: CropState, nextScale: number): CropState {
  const ratio = nextScale / state.scale;
  return clampCrop(photo, view, { scale: nextScale, x: state.x * ratio, y: state.y * ratio });
}

/** The square of the photo (in photo px) that the viewport shows. */
export function sourceRect(photo: Photo, view: number, state: CropState) {
  const s = clampCrop(photo, view, state);
  const side = view / s.scale;
  const cx = photo.width / 2 - s.x / s.scale;
  const cy = photo.height / 2 - s.y / s.scale;
  return { sx: cx - side / 2, sy: cy - side / 2, side };
}
