import test from "node:test";
import assert from "node:assert/strict";

import {
  GENERAL_TRACK,
  UNTAGGED_FILTER,
  tagChoices,
  trackChoices,
  trackFilterOptions,
  trackLabel,
  trackNames,
} from "./tracks.ts";

/** The admin list as GET /admin/learning-tracks orders it; LOGISTICS is turned off. */
const ADMIN = [
  { code: "NURSING", name: "Y tế – Điều dưỡng", isActive: true },
  { code: "LOGISTICS", name: "Kho vận", isActive: false },
  { code: "GENERAL", name: "Chung", isActive: true },
];
/** The public list: active tracks only, no on/off flag. */
const ACTIVE = [
  { code: "NURSING", name: "Y tế – Điều dưỡng", description: "Bệnh viện, phòng khám", sortOrder: 10 },
  { code: "GENERAL", name: "Chung", description: "Bài luyện đa dạng chủ đề", sortOrder: 1000 },
];

test("GENERAL is the one reserved code, and UNTAGGED is what the filters send", () => {
  assert.equal(GENERAL_TRACK, "GENERAL");
  assert.equal(UNTAGGED_FILTER, "UNTAGGED");
});

test("trackLabel marks a track admins turned off, and only that", () => {
  assert.equal(trackLabel({ code: "LOGISTICS", name: "Kho vận", isActive: false }), "Kho vận (đã tắt)");
  assert.equal(trackLabel({ code: "NURSING", name: "Y tế", isActive: true }), "Y tế");
  // The public list has no flag: everything in it is on.
  assert.equal(trackLabel({ code: "NURSING", name: "Y tế" }), "Y tế");
});

test("trackNames reads each code by the admins' name, in the order given", () => {
  assert.equal(trackNames(["GENERAL", "NURSING"], ADMIN), "Chung, Y tế – Điều dưỡng");
  assert.equal(trackNames(["NURSING"], ACTIVE), "Y tế – Điều dưỡng");
});

test("trackNames says when an item has no track", () => {
  assert.equal(trackNames([], ADMIN), "Chưa gắn lĩnh vực");
  assert.equal(trackNames(undefined, ADMIN), "Chưa gắn lĩnh vực");
});

test("trackNames marks a turned-off track in admin views", () => {
  assert.equal(trackNames(["LOGISTICS", "GENERAL"], ADMIN), "Kho vận (đã tắt), Chung");
});

test("trackNames shows the code of a track the list does not hold yet", () => {
  // While the list loads, a tagged item must not read as untagged.
  assert.equal(trackNames(["NURSING"], []), "NURSING");
  assert.equal(trackNames(["NURSING", "PHARMACY"], ADMIN), "Y tế – Điều dưỡng, PHARMACY");
});

test("trackChoices offers the active tracks when the learner's track is one of them", () => {
  assert.deepEqual(trackChoices(ACTIVE, "NURSING"), ACTIVE);
  assert.deepEqual(trackChoices(ACTIVE, null), ACTIVE);
  assert.deepEqual(trackChoices(ACTIVE, undefined), ACTIVE);
});

test("trackChoices keeps the learner's current track after admins turn it off", () => {
  const own = { code: "LOGISTICS", name: "Kho vận" };
  assert.deepEqual(trackChoices(ACTIVE, "LOGISTICS", [own]), [...ACTIVE, own]);
  // Named from a wider list, such as the admin one.
  assert.deepEqual(trackChoices(ACTIVE, "LOGISTICS", ADMIN).at(-1), ADMIN[1]);
  // With nothing to name it, the code stands in.
  assert.deepEqual(trackChoices(ACTIVE, "LOGISTICS").at(-1), { code: "LOGISTICS", name: "LOGISTICS" });
});

test("trackChoices keeps the current track while the active list is still empty", () => {
  assert.deepEqual(trackChoices([], "NURSING", [{ code: "NURSING", name: "Y tế" }]), [{ code: "NURSING", name: "Y tế" }]);
  assert.deepEqual(trackChoices([], null), []);
});

test("trackChoices does not change the list it is given", () => {
  const active = [...ACTIVE];
  const choices = trackChoices(active, "LOGISTICS");
  assert.equal(active.length, 2);
  assert.notEqual(choices, active);
});

test("trackFilterOptions: Tất cả, Chưa gắn lĩnh vực, then every track in order", () => {
  assert.deepEqual(trackFilterOptions(ADMIN), [
    { value: "ALL", label: "Tất cả" },
    { value: "UNTAGGED", label: "Chưa gắn lĩnh vực" },
    { value: "NURSING", label: "Y tế – Điều dưỡng" },
    { value: "LOGISTICS", label: "Kho vận (đã tắt)" },
    { value: "GENERAL", label: "Chung" },
  ]);
  // Before the list arrives the two fixed options still work.
  assert.deepEqual(
    trackFilterOptions([]).map((option) => option.value),
    ["ALL", "UNTAGGED"],
  );
});

test("tagChoices offers every active track and marks what the item has", () => {
  assert.deepEqual(tagChoices(ADMIN, ["GENERAL"]), [
    { code: "NURSING", label: "Y tế – Điều dưỡng", selected: false },
    { code: "GENERAL", label: "Chung", selected: true },
  ]);
});

test("tagChoices shows a turned-off track only while the item has it, so it can be removed", () => {
  assert.deepEqual(tagChoices(ADMIN, ["LOGISTICS"]), [
    { code: "NURSING", label: "Y tế – Điều dưỡng", selected: false },
    { code: "LOGISTICS", label: "Kho vận (đã tắt)", selected: true },
    { code: "GENERAL", label: "Chung", selected: false },
  ]);
  // Once removed it cannot be added back.
  assert.equal(
    tagChoices(ADMIN, []).some((choice) => choice.code === "LOGISTICS"),
    false,
  );
});
