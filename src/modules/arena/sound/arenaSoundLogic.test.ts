import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

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
  test("21 lofi tracks, going round", () => {
    assert.equal(LOBBY_PLAYLIST.length, 21);
    assert.equal(nextTrack(20, 21), 0);
    assert.equal(nextTrack(0, 21), 1);
  });
  test("every track is shipped, once, and credited", () => {
    const credits = readFileSync("public/sounds/CREDITS.md", "utf8");
    assert.equal(new Set(LOBBY_PLAYLIST.map((t) => t.file)).size, LOBBY_PLAYLIST.length);
    for (const t of LOBBY_PLAYLIST) {
      assert.ok(existsSync(`public${t.file}`), t.file);
      assert.ok(credits.includes(t.file.replace("/sounds/", "")), t.file);
    }
  });
});
