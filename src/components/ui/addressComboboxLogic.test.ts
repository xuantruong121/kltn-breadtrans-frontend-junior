import assert from "node:assert/strict";
import test from "node:test";
import {
  removeVietnameseTones,
  stripAdministrativePrefix,
  calculateGhostSuggestion,
  filterAndRankAddressItems,
  type AddressItem,
} from "./addressComboboxLogic.ts";

const MOCK_PROVINCES: AddressItem[] = [
  { code: "1", name: "Thành phố Hà Nội" },
  { code: "79", name: "Thành phố Hồ Chí Minh" },
  { code: "48", name: "Thành phố Đà Nẵng" },
  { code: "74", name: "Tỉnh Bình Dương" },
  { code: "75", name: "Tỉnh Đồng Nai" },
];

const MOCK_WARDS: AddressItem[] = [
  { code: "26734", name: "Phường Bến Nghé" },
  { code: "26740", name: "Phường Bến Thành" },
  { code: "26800", name: "Phường Thông Tây Hội" },
  { code: "26850", name: "Xã Phú An" },
];

test("removeVietnameseTones strips diacritics and converts to lowercase", () => {
  assert.equal(removeVietnameseTones("Hồ Chí Minh"), "ho chi minh");
  assert.equal(removeVietnameseTones("Đà Nẵng"), "da nang");
  assert.equal(removeVietnameseTones("Thông Tây Hội"), "thong tay hoi");
});

test("stripAdministrativePrefix removes common administrative designations", () => {
  assert.equal(stripAdministrativePrefix("Thành phố Hồ Chí Minh"), "Hồ Chí Minh");
  assert.equal(stripAdministrativePrefix("Tỉnh Bình Dương"), "Bình Dương");
  assert.equal(stripAdministrativePrefix("Phường Thông Tây Hội"), "Thông Tây Hội");
  assert.equal(stripAdministrativePrefix("Xã Phú An"), "Phú An");
  assert.equal(stripAdministrativePrefix("Đặc khu Phú Quốc"), "Phú Quốc");
});

test("calculateGhostSuggestion: User types 'hồ chí' -> suggests ' Minh'", () => {
  const ranked = filterAndRankAddressItems(MOCK_PROVINCES, "hồ chí");
  assert.equal(ranked.length > 0, true);
  assert.equal(ranked[0].code, "79"); // TP. Hồ Chí Minh is ranked first

  const ghost = calculateGhostSuggestion("hồ chí", ranked);
  assert.ok(ghost);
  assert.equal(ghost.ghostSuffix, " Minh");
  assert.equal(ghost.matchedItem.name, "Thành phố Hồ Chí Minh");
});

test("calculateGhostSuggestion: User types 'ho chi' (no diacritics) -> suggests ' Minh'", () => {
  const ranked = filterAndRankAddressItems(MOCK_PROVINCES, "ho chi");
  assert.equal(ranked[0].code, "79");

  const ghost = calculateGhostSuggestion("ho chi", ranked);
  assert.ok(ghost);
  assert.equal(ghost.ghostSuffix, " Minh");
});

test("calculateGhostSuggestion: User types 'thông tây' -> suggests ' Hội'", () => {
  const ranked = filterAndRankAddressItems(MOCK_WARDS, "thông tây");
  assert.equal(ranked[0].code, "26800");

  const ghost = calculateGhostSuggestion("thông tây", ranked);
  assert.ok(ghost);
  assert.equal(ghost.ghostSuffix, " Hội");
  assert.equal(ghost.matchedItem.name, "Phường Thông Tây Hội");
});

test("filterAndRankAddressItems ranks exact short prefixes ahead of contains matches", () => {
  const items: AddressItem[] = [
    { code: "1", name: "Tỉnh Quảng Nam" }, // contains "nam"
    { code: "2", name: "Tỉnh Nam Định" },   // starts with "nam"
  ];

  const results = filterAndRankAddressItems(items, "nam");
  assert.equal(results[0].name, "Tỉnh Nam Định"); // Prefix match comes first
  assert.equal(results[1].name, "Tỉnh Quảng Nam"); // Contains match comes second
});

test("calculateGhostSuggestion returns null when query is empty or no match", () => {
  assert.equal(calculateGhostSuggestion("", MOCK_PROVINCES), null);
  assert.equal(calculateGhostSuggestion("xyz123", MOCK_PROVINCES), null);
});
