import assert from "node:assert/strict";
import test from "node:test";
import type { PracticeHeaderProps } from "./PracticeHeader";

function computePracticeHeaderVisibility(props: PracticeHeaderProps) {
  const displayCategory = props.category || props.subtitle;
  const displayPosition =
    props.positionText ??
    (typeof props.currentItem === "number" && typeof props.totalItems === "number"
      ? `Câu ${props.currentItem}/${props.totalItems}`
      : undefined);

  return {
    exitLabel: props.exitLabel ?? "Thoát",
    hasCategory: Boolean(displayCategory),
    displayCategory,
    displayPosition,
    showBilingual: Boolean(props.bilingualEnabled && props.onToggleBilingual),
    showNotes: Boolean(props.notesEnabled && props.onOpenNotes),
    showShortcuts: Boolean(
      props.shortcutsEnabled && (props.shortcutsContent || props.onOpenShortcuts),
    ),
    showSound: Boolean(props.soundEnabled && props.onToggleSound),
    showActivity: Boolean(props.activityLabel),
  };
}

test("PracticeHeader: formats position and defaults exitLabel to 'Thoát'", () => {
  const state = computePracticeHeaderVisibility({
    title: "Speaking Part 1",
    currentItem: 2,
    totalItems: 5,
    onExit: () => {},
  });

  assert.equal(state.exitLabel, "Thoát");
  assert.equal(state.displayPosition, "Câu 2/5");
});

test("PracticeHeader: custom positionText overrides currentItem/totalItems", () => {
  const state = computePracticeHeaderVisibility({
    title: "TOEIC Full Test",
    currentItem: 10,
    totalItems: 200,
    positionText: "Part 5 · Câu 101/200",
    onExit: () => {},
  });

  assert.equal(state.displayPosition, "Part 5 · Câu 101/200");
});

test("PracticeHeader: utility controls only show when handler and enabled flag exist (no dead buttons)", () => {
  // Case 1: Flag is true but handler is missing -> do NOT show
  const missingHandlers = computePracticeHeaderVisibility({
    title: "Practice",
    bilingualEnabled: true,
    notesEnabled: true,
    soundEnabled: true,
    onExit: () => {},
  });
  assert.equal(missingHandlers.showBilingual, false, "Must not show bilingual without handler");
  assert.equal(missingHandlers.showNotes, false, "Must not show notes without handler");
  assert.equal(missingHandlers.showSound, false, "Must not show sound without handler");

  // Case 2: Handlers provided and enabled -> show
  const withHandlers = computePracticeHeaderVisibility({
    title: "Practice",
    bilingualEnabled: true,
    onToggleBilingual: () => {},
    notesEnabled: true,
    onOpenNotes: () => {},
    soundEnabled: true,
    onToggleSound: () => {},
    shortcutsEnabled: true,
    shortcutsContent: "content",
    activityLabel: "Đánh giá phát âm",
    onExit: () => {},
  });
  assert.equal(withHandlers.showBilingual, true);
  assert.equal(withHandlers.showNotes, true);
  assert.equal(withHandlers.showSound, true);
  assert.equal(withHandlers.showShortcuts, true);
  assert.equal(withHandlers.showActivity, true);
});
