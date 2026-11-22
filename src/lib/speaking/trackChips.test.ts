import test from "node:test";
import assert from "node:assert/strict";

import { ALL_TRACKS, inTrackChip, trackChips, trackLine, tracksMatchSearch } from "./trackChips.ts";

const NURSING = { code: "NURSING", name: "Y tế", sortOrder: 20 };
const IT = { code: "IT_SOFTWARE", name: "Công nghệ thông tin", sortOrder: 10 };
const GENERAL = { code: "GENERAL", name: "Chung", sortOrder: 1000 };

test("trackChips: Tất cả first, then the tracks in the admins' order with their set counts", () => {
  const chips = trackChips([{ tracks: [NURSING] }, { tracks: [GENERAL, IT] }, { tracks: [NURSING] }, { tracks: [] }]);
  assert.deepEqual(chips, [
    { code: ALL_TRACKS, label: "Tất cả", count: 4 },
    { code: "IT_SOFTWARE", label: "Công nghệ thông tin", count: 1 },
    { code: "NURSING", label: "Y tế", count: 2 },
    { code: "GENERAL", label: "Chung", count: 1 },
  ]);
});

test("trackChips leaves out a track with no published set", () => {
  const chips = trackChips([
    { tracks: [NURSING], publicationStatus: "DRAFT" },
    { tracks: [IT], publicationStatus: "PUBLISHED" },
    // A locked card carries no status: learners only ever get published sets.
    { tracks: [GENERAL] },
  ]);
  assert.deepEqual(
    chips.map((chip) => chip.code),
    [ALL_TRACKS, "IT_SOFTWARE", "GENERAL"],
  );
  // A draft still counts once its track has a published set.
  const counted = trackChips([
    { tracks: [NURSING], publicationStatus: "DRAFT" },
    { tracks: [NURSING], publicationStatus: "PUBLISHED" },
  ]);
  assert.equal(counted.find((chip) => chip.code === "NURSING")?.count, 2);
});

test("trackChips breaks a sortOrder tie by name and counts a repeated code once", () => {
  const a = { code: "B_TRACK", name: "Bán lẻ", sortOrder: 10 };
  const b = { code: "A_TRACK", name: "An ninh", sortOrder: 10 };
  assert.deepEqual(
    trackChips([{ tracks: [a, b, a] }]).map((chip) => [chip.code, chip.count]),
    [
      [ALL_TRACKS, 1],
      ["A_TRACK", 1],
      ["B_TRACK", 1],
    ],
  );
});

test("trackChips with no sets or no tracks is only Tất cả", () => {
  assert.deepEqual(trackChips([]), [{ code: ALL_TRACKS, label: "Tất cả", count: 0 }]);
  assert.deepEqual(trackChips([{ tracks: null }, {}]), [{ code: ALL_TRACKS, label: "Tất cả", count: 2 }]);
});

test("inTrackChip keeps every set under Tất cả and the tagged ones under a track", () => {
  assert.equal(inTrackChip({ tracks: [] }, ALL_TRACKS), true);
  assert.equal(inTrackChip({ tracks: [NURSING, GENERAL] }, "GENERAL"), true);
  assert.equal(inTrackChip({ tracks: [NURSING] }, "GENERAL"), false);
  assert.equal(inTrackChip({}, "GENERAL"), false);
});

test("tracksMatchSearch finds a set by a track name, ignoring case", () => {
  assert.equal(tracksMatchSearch([NURSING], "y tế"), true);
  assert.equal(tracksMatchSearch([IT], "  THÔNG TIN "), true);
  assert.equal(tracksMatchSearch([NURSING], "kho"), false);
  assert.equal(tracksMatchSearch(undefined, "y tế"), false);
  // An empty query is not a match; the page treats it as no search.
  assert.equal(tracksMatchSearch([NURSING], "  "), false);
});

test("trackLine joins the track names, or gives nothing without a track", () => {
  assert.equal(trackLine([NURSING, GENERAL]), "Y tế · Chung");
  assert.equal(trackLine([]), undefined);
  assert.equal(trackLine(undefined), undefined);
});
