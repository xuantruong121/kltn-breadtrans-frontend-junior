import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_AMBIENCE, DUCK_SHARE, layerVolume, nextTrack, parseAmbience, tintPixels } from "./studyAmbienceLogic.ts";

describe("parseAmbience", () => {
  test("nothing saved: music and scene on, rain off, card sounds on", () => {
    assert.deepEqual(parseAmbience(null), DEFAULT_AMBIENCE);
    assert.equal(DEFAULT_AMBIENCE.music && DEFAULT_AMBIENCE.scene && DEFAULT_AMBIENCE.sfx && !DEFAULT_AMBIENCE.rain, true);
  });
  test("saved choices come back; broken ones fall back", () => {
    assert.deepEqual(parseAmbience(JSON.stringify({ music: false, rain: true, musicVolume: 0.6 })), {
      ...DEFAULT_AMBIENCE,
      music: false,
      rain: true,
      musicVolume: 0.6,
    });
    assert.deepEqual(parseAmbience("{not json"), DEFAULT_AMBIENCE);
    assert.deepEqual(parseAmbience(JSON.stringify({ music: "yes", rainVolume: 7, musicVolume: "x" })), {
      ...DEFAULT_AMBIENCE,
      rainVolume: 1,
    });
    assert.deepEqual(parseAmbience("null"), DEFAULT_AMBIENCE);
  });
});

describe("nextTrack", () => {
  test("goes round the playlist", () => {
    assert.equal(nextTrack(0, 3), 1);
    assert.equal(nextTrack(2, 3), 0);
    assert.equal(nextTrack(0, 0), 0);
  });
});

describe("layerVolume", () => {
  test("silent while recording, lowered while a word is pronounced", () => {
    assert.equal(layerVolume(0.5, { recording: false, ducked: false }), 0.5);
    assert.equal(layerVolume(0.5, { recording: false, ducked: true }), 0.5 * DUCK_SHARE);
    assert.equal(layerVolume(0.5, { recording: true, ducked: false }), 0);
    assert.equal(layerVolume(0.5, { recording: true, ducked: true }), 0);
  });
});

describe("tintPixels", () => {
  test("darkens and cools every pixel, keeps alpha", () => {
    const px = new Uint8ClampedArray([200, 120, 40, 255, 0, 0, 0, 0]);
    tintPixels(px, [0.5, 0.5, 1]);
    assert.deepEqual([...px], [100, 60, 40, 255, 0, 0, 0, 0]);
  });
});
