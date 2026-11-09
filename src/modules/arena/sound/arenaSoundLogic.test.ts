import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_SOUND_PREFS, LOBBY_PLAYLIST, nextTrack, parseSoundPrefs } from "./arenaSoundLogic.ts";

describe("parseSoundPrefs", () => {
  test("nothing saved: music, effects and the scene on, volume 0.3", () => {
    assert.deepEqual(parseSoundPrefs(null), DEFAULT_SOUND_PREFS);
    assert.deepEqual(DEFAULT_SOUND_PREFS, { music: true, sfx: true, musicVolume: 0.3, scene: true });
  });
  test("an older save (music and sfx only) keeps its choices and gains the defaults", () => {
    assert.deepEqual(parseSoundPrefs(JSON.stringify({ music: false, sfx: true })), { ...DEFAULT_SOUND_PREFS, music: false });
  });
  test("broken values fall back; the volume is clamped", () => {
    assert.deepEqual(parseSoundPrefs("{oops"), DEFAULT_SOUND_PREFS);
    assert.equal(parseSoundPrefs(JSON.stringify({ musicVolume: 3 })).musicVolume, 1);
    assert.equal(parseSoundPrefs(JSON.stringify({ musicVolume: "x" })).musicVolume, 0.3);
    assert.equal(parseSoundPrefs(JSON.stringify({ scene: false })).scene, false);
  });
});

describe("playlist", () => {
  test("three lofi tracks, going round", () => {
    assert.equal(LOBBY_PLAYLIST.length, 3);
    assert.equal(nextTrack(2, 3), 0);
    assert.equal(nextTrack(0, 3), 1);
  });
});
