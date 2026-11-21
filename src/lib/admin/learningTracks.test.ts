import test from "node:test";
import assert from "node:assert/strict";

import {
  EMPTY_TRACK_DRAFT,
  TRACK_ACTION_LABEL,
  editTrackBody,
  isTrackInUse,
  movedTrackOrder,
  newTrackBody,
  trackRowActions,
  trackStats,
} from "./learningTracks.ts";

const UNUSED = { listening: 0, reading: 0, writing: 0, speaking: 0, learners: 0 };
const track = (code: string, extra: Partial<{ isActive: boolean; isSystem: boolean; usage: typeof UNUSED }> = {}) => ({
  code,
  isActive: true,
  isSystem: code === "GENERAL",
  usage: UNUSED,
  ...extra,
});
/** A middle row: both moves are possible, so only the rule under test hides an action. */
const middle = (row: ReturnType<typeof track>) => trackRowActions(row, 1, 3);

test("an unused track in the middle of the list has every action", () => {
  assert.deepEqual(middle(track("NURSING")), ["edit", "up", "down", "deactivate", "delete"]);
});

test("GENERAL has no Tắt and no Xoá", () => {
  const actions = middle(track("GENERAL"));
  assert.deepEqual(actions, ["edit", "up", "down"]);
  // The code decides even if the flag were missing.
  assert.deepEqual(middle(track("GENERAL", { isSystem: false })), ["edit", "up", "down"]);
});

test("a track in use has no Xoá, whatever counts it", () => {
  for (const key of Object.keys(UNUSED) as Array<keyof typeof UNUSED>) {
    const actions = middle(track("NURSING", { usage: { ...UNUSED, [key]: 1 } }));
    assert.equal(actions.includes("delete"), false, key);
    assert.equal(actions.includes("deactivate"), true, key);
  }
});

test("a turned-off track offers Bật instead of Tắt, and Xoá while unused", () => {
  assert.deepEqual(middle(track("NURSING", { isActive: false })), ["edit", "up", "down", "activate", "delete"]);
  assert.deepEqual(middle(track("NURSING", { isActive: false, usage: { ...UNUSED, learners: 2 } })), [
    "edit",
    "up",
    "down",
    "activate",
  ]);
});

test("the first row has no Lên, the last no Xuống, a single row neither", () => {
  assert.equal(trackRowActions(track("NURSING"), 0, 3).includes("up"), false);
  assert.equal(trackRowActions(track("NURSING"), 0, 3).includes("down"), true);
  assert.equal(trackRowActions(track("NURSING"), 2, 3).includes("down"), false);
  assert.equal(trackRowActions(track("NURSING"), 2, 3).includes("up"), true);
  assert.deepEqual(trackRowActions(track("GENERAL"), 0, 1), ["edit"]);
});

test("each action has its button text", () => {
  assert.deepEqual(TRACK_ACTION_LABEL, {
    edit: "Sửa",
    up: "Lên",
    down: "Xuống",
    deactivate: "Tắt",
    activate: "Bật",
    delete: "Xoá",
  });
});

test("isTrackInUse counts items of every skill and learners", () => {
  assert.equal(isTrackInUse(UNUSED), false);
  assert.equal(isTrackInUse({ ...UNUSED, speaking: 3 }), true);
});

test("movedTrackOrder sends every code with one row moved", () => {
  const codes = ["A", "B", "GENERAL"];
  assert.deepEqual(movedTrackOrder(codes, "B", -1), ["B", "A", "GENERAL"]);
  assert.deepEqual(movedTrackOrder(codes, "B", 1), ["A", "GENERAL", "B"]);
  // The ends do not move further, and an unknown code changes nothing.
  assert.deepEqual(movedTrackOrder(codes, "A", -1), codes);
  assert.deepEqual(movedTrackOrder(codes, "GENERAL", 1), codes);
  assert.deepEqual(movedTrackOrder(codes, "X", 1), codes);
  // The list it is given stays as it was.
  assert.deepEqual(codes, ["A", "B", "GENERAL"]);
});

test("trackStats counts the tracks and the ones turned on", () => {
  assert.equal(trackStats([{ isActive: true }, { isActive: false }, { isActive: true }]), "3 lĩnh vực · 2 đang bật");
  assert.equal(trackStats([]), "0 lĩnh vực · 0 đang bật");
});

test("newTrackBody sends the name, and the code and description only when typed", () => {
  assert.equal(newTrackBody(EMPTY_TRACK_DRAFT), null);
  assert.equal(newTrackBody({ ...EMPTY_TRACK_DRAFT, name: "   " }), null);
  assert.deepEqual(newTrackBody({ ...EMPTY_TRACK_DRAFT, name: " Y tế " }), { name: "Y tế" });
  assert.deepEqual(newTrackBody({ name: "Y tế", code: " Y_TE ", description: " Bệnh viện " }), {
    name: "Y tế",
    code: "Y_TE",
    description: "Bệnh viện",
  });
});

test("editTrackBody keeps an emptied description so the server clears it", () => {
  assert.deepEqual(editTrackBody({ name: " Y tế ", description: "  " }), { name: "Y tế", description: "" });
  assert.deepEqual(editTrackBody({ name: "Y tế", description: "Bệnh viện" }), { name: "Y tế", description: "Bệnh viện" });
  assert.equal(editTrackBody({ name: " ", description: "x" }), null);
});
