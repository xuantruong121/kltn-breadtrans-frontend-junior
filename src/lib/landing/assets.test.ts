import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { LANDING_IMAGES, LANDING_VIDEO } from './assets.ts';

const publicDir = path.join(process.cwd(), 'public');
const fileOf = (src: string) => path.join(publicDir, src.replace(/^\//, ''));

test('every landing image exists in public/landing with matching size', async () => {
  const keys = Object.keys(LANDING_IMAGES);
  assert.equal(keys.length, 16);
  for (const key of keys) {
    const img = LANDING_IMAGES[key as keyof typeof LANDING_IMAGES];
    assert.equal(img.src, `/landing/${key}.webp`);
    assert.ok(fs.existsSync(fileOf(img.src)), `${key} missing`);
    const meta = await sharp(fileOf(img.src)).metadata();
    assert.equal(meta.width, img.width, `${key} width`);
    assert.equal(meta.height, img.height, `${key} height`);
    assert.ok(img.alt.trim().length > 0, `${key} alt`);
  }
});

test('landing video and poster exist with matching poster size', async () => {
  assert.ok(fs.existsSync(fileOf(LANDING_VIDEO.src)), 'video missing');
  assert.ok(fs.statSync(fileOf(LANDING_VIDEO.src)).size > 0);
  assert.ok(fs.existsSync(fileOf(LANDING_VIDEO.poster)), 'poster missing');
  const meta = await sharp(fileOf(LANDING_VIDEO.poster)).metadata();
  assert.equal(meta.width, LANDING_VIDEO.width);
  assert.equal(meta.height, LANDING_VIDEO.height);
  assert.ok(LANDING_VIDEO.label.trim().length > 0);
});
