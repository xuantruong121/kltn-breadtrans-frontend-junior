import assert from "node:assert/strict";
import test from "node:test";

import { formAudioPreviewSrc, groupAudioSrc } from "./adminGroupAudio.ts";

const KEY = "premium/listening/toeic/exams/1/groups/2.mp3";

test("a migrated clip plays its signed URL, a legacy clip its own URL", () => {
  assert.equal(groupAudioSrc({ audioUrl: KEY, audioPlaybackUrl: "https://signed/x" }), "https://signed/x");
  assert.equal(groupAudioSrc({ audioUrl: "https://cdn/a.mp3" }), "https://cdn/a.mp3");
  assert.equal(groupAudioSrc({ audioUrl: null }), null);
});

test("the editor previews the signed URL only while the stored key is unchanged", () => {
  const group = { audioUrl: KEY, audioPlaybackUrl: "https://signed/x" };
  assert.equal(formAudioPreviewSrc(KEY, group), "https://signed/x");
  assert.equal(formAudioPreviewSrc("https://new/upload.mp3", group), undefined);
  assert.equal(formAudioPreviewSrc("", group), undefined);
  assert.equal(formAudioPreviewSrc(KEY, null), undefined);
});
